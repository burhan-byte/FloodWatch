import { ipKeyGenerator } from 'express-rate-limit';
import { Router, type Request, type Response } from 'express';
import type { z } from 'zod';
import {
  STATUSES,
  claimSchema,
  createRequestSchema,
  updateRequestSchema,
  type Status,
} from '../../shared/schema';
import type { DB } from '../db';
import { hourlyLimit } from '../rateLimit';
import {
  addFlag,
  claimRequest,
  createRequest,
  getRow,
  getVisible,
  isClaimer,
  isOwner,
  listPublic,
  releaseClaim,
  resolveRequest,
  toPublic,
  updateRequest,
} from '../requestsRepo';
import type { Stream } from '../stream';
import { sha256 } from '../tokens';

export interface RouterDeps {
  db: DB;
  stream: Stream;
  ipSalt: string;
  rateLimits: boolean;
}

function parseBody<S extends z.ZodType>(schema: S, req: Request, res: Response): z.output<S> | undefined {
  const result = schema.safeParse(req.body ?? {});
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง', fields });
  return undefined;
}

const notFound = (res: Response) => res.status(404).json({ error: 'ไม่พบเคสนี้' });
const forbidden = (res: Response) => res.status(403).json({ error: 'ลิงก์ไม่ถูกต้องหรือไม่มีสิทธิ์' });
const CLOSED = 'เคสนี้ปิดแล้ว';
const conflict = (res: Response, error: string) => res.status(409).json({ error });

export function requestsRouter({ db, stream, ipSalt, rateLimits }: RouterDeps): Router {
  const router = Router();
  const tokenOf = (req: Request) => req.get('X-Token') ?? undefined;
  const publish = (event: string, id: string) => {
    const row = getVisible(db, id);
    if (row) stream.broadcast(event, toPublic(row));
  };
  const current = (id: string) => toPublic(getRow(db, id)!);

  router.get('/', (req, res) => {
    const raw = typeof req.query.status === 'string' ? req.query.status : 'open,claimed';
    const statuses = raw
      .split(',')
      .filter((s): s is Status => (STATUSES as readonly string[]).includes(s));
    res.json(listPublic(db, statuses));
  });

  router.get('/:id', (req, res) => {
    const row = getVisible(db, req.params.id);
    if (!row) return notFound(res);
    res.json(toPublic(row));
  });

  router.post('/', hourlyLimit(5, rateLimits), (req, res) => {
    const input = parseBody(createRequestSchema, req, res);
    if (!input) return;
    const { id, ownerToken } = createRequest(db, input);
    publish('request.created', id);
    res.status(201).json({ id, ownerToken });
  });

  router.patch('/:id', (req, res) => {
    const row = getVisible(db, req.params.id);
    if (!row) return notFound(res);
    if (!isOwner(row, tokenOf(req))) return forbidden(res);
    if (row.status === 'resolved') return conflict(res, CLOSED);
    const patch = parseBody(updateRequestSchema, req, res);
    if (!patch) return;
    updateRequest(db, row.id, patch);
    publish('request.updated', row.id);
    res.json(current(row.id));
  });

  router.post('/:id/phone', hourlyLimit(30, rateLimits), (req, res) => {
    const row = getVisible(db, req.params.id);
    if (!row) return notFound(res);
    const token = tokenOf(req);
    if (row.status === 'resolved' && !isOwner(row, token) && !isClaimer(row, token)) {
      return conflict(res, CLOSED);
    }
    res.json({ phone: row.phone });
  });

  router.post('/:id/claim', hourlyLimit(10, rateLimits), (req, res) => {
    const row = getVisible(db, req.params.id);
    if (!row) return notFound(res);
    const body = parseBody(claimSchema, req, res);
    if (!body) return;
    const claimToken = claimRequest(db, row.id, body.name);
    if (!claimToken) return conflict(res, 'เคสนี้มีคนรับไปแล้วหรือปิดไปแล้ว');
    publish('request.updated', row.id);
    res.json({ claimToken });
  });

  router.post('/:id/release', (req, res) => {
    const row = getVisible(db, req.params.id);
    if (!row) return notFound(res);
    if (!isClaimer(row, tokenOf(req))) return forbidden(res);
    if (!releaseClaim(db, row.id)) return conflict(res, 'เคสนี้ไม่ได้อยู่ในสถานะมีคนรับ');
    publish('request.updated', row.id);
    res.json(current(row.id));
  });

  router.post('/:id/resolve', (req, res) => {
    const row = getVisible(db, req.params.id);
    if (!row) return notFound(res);
    const token = tokenOf(req);
    if (!isOwner(row, token) && !isClaimer(row, token)) return forbidden(res);
    if (!resolveRequest(db, row.id)) return conflict(res, 'เคสนี้ปิดไปแล้ว');
    publish('request.updated', row.id);
    res.json(current(row.id));
  });

  router.post('/:id/flag', hourlyLimit(20, rateLimits), (req, res) => {
    const row = getVisible(db, req.params.id);
    if (!row) return notFound(res);
    const { newlyHidden } = addFlag(db, row.id, sha256(`${ipKeyGenerator(req.ip ?? '', 56)}|${ipSalt}`));
    if (newlyHidden) stream.broadcast('request.removed', { id: row.id });
    res.status(204).end();
  });

  return router;
}
