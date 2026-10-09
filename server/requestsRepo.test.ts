import { beforeEach, describe, expect, it } from 'vitest';
import { createRequestSchema } from '../shared/schema';
import { openDb, type DB } from './db';
import { createRequest, getRow, getVisible, isOwner, listPublic } from './requestsRepo';

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
