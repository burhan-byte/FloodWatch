import type { CreateRequest, PublicCase, Status } from '../shared/schema';
import type { DB } from './db';
import { newId, newToken, sha256, tokenMatches } from './tokens';

export const RESOLVED_VISIBLE_MS = 24 * 60 * 60 * 1000;

export interface Row {
  id: string;
  lat: number;
  lng: number;
  location_text: string;
  needs: string;
  people_count: number;
  has_elderly: number;
  has_children: number;
  has_bedridden: number;
  contact_name: string;
  phone: string | null;
  details: string;
  status: Status;
  claimed_by: string | null;
  claimed_at: string | null;
  owner_token_hash: string;
  claim_token_hash: string | null;
  hidden: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export function toPublic(r: Row): PublicCase {
  return {
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    locationText: r.location_text,
    needs: JSON.parse(r.needs),
    peopleCount: r.people_count,
    hasElderly: r.has_elderly === 1,
    hasChildren: r.has_children === 1,
    hasBedridden: r.has_bedridden === 1,
    contactName: r.contact_name,
    details: r.details,
    status: r.status,
    claimedBy: r.claimed_by,
    claimedAt: r.claimed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at,
  };
}

export const isOwner = (row: Row, token?: string) => tokenMatches(token, row.owner_token_hash);
export const isClaimer = (row: Row, token?: string) => tokenMatches(token, row.claim_token_hash);

export function createRequest(db: DB, input: CreateRequest, now = new Date()) {
  const id = newId();
  const ownerToken = newToken();
  const ts = now.toISOString();
  db.prepare(
    `INSERT INTO help_requests (
       id, lat, lng, location_text, needs, people_count, has_elderly, has_children, has_bedridden,
       contact_name, phone, details, owner_token_hash, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.lat,
    input.lng,
    input.locationText,
    JSON.stringify(input.needs),
    input.peopleCount,
    input.hasElderly ? 1 : 0,
    input.hasChildren ? 1 : 0,
    input.hasBedridden ? 1 : 0,
    input.contactName,
    input.phone,
    input.details,
    sha256(ownerToken),
    ts,
    ts
  );
  return { id, ownerToken };
}

export function getRow(db: DB, id: string): Row | undefined {
  return db.prepare('SELECT * FROM help_requests WHERE id = ?').get(id) as Row | undefined;
}

export function getVisible(db: DB, id: string): Row | undefined {
  const row = getRow(db, id);
  return row && row.hidden === 0 ? row : undefined;
}

export function listPublic(db: DB, statuses: Status[], now = new Date()): PublicCase[] {
  if (statuses.length === 0) return [];
  const resolvedSince = new Date(now.getTime() - RESOLVED_VISIBLE_MS).toISOString();
  const rows = db
    .prepare(
      `SELECT * FROM help_requests
       WHERE hidden = 0
         AND status IN (${statuses.map(() => '?').join(',')})
         AND (status != 'resolved' OR resolved_at >= ?)
       ORDER BY created_at ASC`
    )
    .all(...statuses, resolvedSince) as Row[];
  return rows.map(toPublic);
}
