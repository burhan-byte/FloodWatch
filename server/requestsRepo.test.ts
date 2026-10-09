import { beforeEach, describe, expect, it } from 'vitest';
import { createRequestSchema } from '../shared/schema';
import { openDb, type DB } from './db';
import {
  addFlag,
  claimRequest,
  createRequest,
  getRow,
  getVisible,
  isClaimer,
  isOwner,
  listPublic,
  purgeOldPhones,
  releaseClaim,
  releaseStaleClaims,
  resolveRequest,
  updateRequest,
} from './requestsRepo';

const input = (over: Record<string, unknown> = {}) =>
  createRequestSchema.parse({
    lat: 14.35,
    lng: 100.57,
    needs: ['evacuate'],
    phone: '0812345678',
    hasElderly: true,
    ...over,
  });

let db: DB;
beforeEach(() => {
  db = openDb(':memory:');
});

describe('create and read', () => {
  it('stores a request and returns an owner token', () => {
    const { id, ownerToken } = createRequest(db, input());
    const row = getRow(db, id)!;
    expect(row.status).toBe('open');
    expect(row.phone).toBe('0812345678');
    expect(isOwner(row, ownerToken)).toBe(true);
    expect(isOwner(row, 'wrong')).toBe(false);
  });

  it('lists public cases without phone numbers', () => {
    createRequest(db, input());
    const [c] = listPublic(db, ['open']);
    expect(c.needs).toEqual(['evacuate']);
    expect(c.hasElderly).toBe(true);
    expect(c).not.toHaveProperty('phone');
  });

  it('filters by status and hides hidden rows', () => {
    const { id } = createRequest(db, input());
    expect(listPublic(db, ['claimed'])).toHaveLength(0);
    db.prepare('UPDATE help_requests SET hidden = 1 WHERE id = ?').run(id);
    expect(listPublic(db, ['open'])).toHaveLength(0);
    expect(getVisible(db, id)).toBeUndefined();
    expect(getRow(db, id)).toBeDefined();
  });

  it('only lists resolved cases from the last 24 hours', () => {
    const { id } = createRequest(db, input());
    const now = new Date('2026-10-09T12:00:00Z');
    db.prepare(`UPDATE help_requests SET status = 'resolved', resolved_at = ? WHERE id = ?`).run(
      '2026-10-08T11:00:00.000Z',
      id
    );
    expect(listPublic(db, ['resolved'], now)).toHaveLength(0);
    db.prepare('UPDATE help_requests SET resolved_at = ? WHERE id = ?').run('2026-10-09T01:00:00.000Z', id);
    expect(listPublic(db, ['resolved'], now)).toHaveLength(1);
  });
});

describe('transitions', () => {
  it('updates only the given fields', () => {
    const { id } = createRequest(db, input({ details: 'เดิม' }));
    updateRequest(db, id, { details: 'ใหม่', needs: ['food'] });
    const c = listPublic(db, ['open'])[0];
    expect(c.details).toBe('ใหม่');
    expect(c.needs).toEqual(['food']);
    expect(c.hasElderly).toBe(true);
  });

  it('claims an open case once', () => {
    const { id } = createRequest(db, input());
    const token = claimRequest(db, id, 'ทีมเรือ')!;
    const row = getRow(db, id)!;
    expect(row.status).toBe('claimed');
    expect(row.claimed_by).toBe('ทีมเรือ');
    expect(isClaimer(row, token)).toBe(true);
    expect(claimRequest(db, id, 'อีกทีม')).toBeNull();
  });

  it('releases a claim back to open', () => {
    const { id } = createRequest(db, input());
    claimRequest(db, id, 'ทีมเรือ');
    expect(releaseClaim(db, id)).toBe(true);
    const row = getRow(db, id)!;
    expect(row.status).toBe('open');
    expect(row.claimed_by).toBeNull();
    expect(row.claim_token_hash).toBeNull();
    expect(releaseClaim(db, id)).toBe(false);
  });

  it('resolves once', () => {
    const { id } = createRequest(db, input());
    expect(resolveRequest(db, id)).toBe(true);
    expect(getRow(db, id)!.resolved_at).not.toBeNull();
    expect(resolveRequest(db, id)).toBe(false);
  });
});

describe('flags', () => {
  it('counts one flag per ip and hides at three', () => {
    const { id } = createRequest(db, input());
    expect(addFlag(db, id, 'ip-a')).toEqual({ newlyHidden: false });
    expect(addFlag(db, id, 'ip-a')).toEqual({ newlyHidden: false });
    expect(addFlag(db, id, 'ip-b')).toEqual({ newlyHidden: false });
    expect(getVisible(db, id)).toBeDefined();
    expect(addFlag(db, id, 'ip-c')).toEqual({ newlyHidden: true });
    expect(getVisible(db, id)).toBeUndefined();
    expect(addFlag(db, id, 'ip-d')).toEqual({ newlyHidden: false });
  });
});

describe('maintenance', () => {
  it('reopens claims older than 3 hours', () => {
    const t0 = new Date('2026-10-09T00:00:00Z');
    const { id: stale } = createRequest(db, input(), t0);
    const { id: fresh } = createRequest(db, input(), t0);
    claimRequest(db, stale, 'ทีม A', t0);
    claimRequest(db, fresh, 'ทีม B', new Date('2026-10-09T02:00:00Z'));

    const reopened = releaseStaleClaims(db, new Date('2026-10-09T03:30:00Z'));

    expect(reopened).toEqual([stale]);
    expect(getRow(db, stale)!.status).toBe('open');
    expect(getRow(db, fresh)!.status).toBe('claimed');
  });

  it('removes phones of cases resolved more than 30 days ago', () => {
    const { id: old } = createRequest(db, input());
    const { id: recent } = createRequest(db, input());
    resolveRequest(db, old, new Date('2026-09-01T00:00:00Z'));
    resolveRequest(db, recent, new Date('2026-10-01T00:00:00Z'));

    expect(purgeOldPhones(db, new Date('2026-10-09T00:00:00Z'))).toBe(1);
    expect(getRow(db, old)!.phone).toBeNull();
    expect(getRow(db, recent)!.phone).toBe('0812345678');
  });
});
