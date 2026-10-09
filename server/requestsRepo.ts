import type { CreateRequest, PublicCase, Status, UpdateRequest } from '../shared/schema';
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

const UPDATE_COLUMNS: Record<keyof UpdateRequest, string> = {
  locationText: 'location_text',
  needs: 'needs',
  peopleCount: 'people_count',
  hasElderly: 'has_elderly',
  hasChildren: 'has_children',
  hasBedridden: 'has_bedridden',
  contactName: 'contact_name',
  phone: 'phone',
  details: 'details',
};

function toDbValue(value: unknown): unknown {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

export function updateRequest(db: DB, id: string, patch: UpdateRequest, now = new Date()): void {
  const keys = (Object.keys(patch) as (keyof UpdateRequest)[]).filter((k) => patch[k] !== undefined);
  const sets = keys.map((k) => `${UPDATE_COLUMNS[k]} = ?`);
  db.prepare(`UPDATE help_requests SET ${[...sets, 'updated_at = ?'].join(', ')} WHERE id = ?`).run(
    ...keys.map((k) => toDbValue(patch[k])),
    now.toISOString(),
    id
  );
}

/** Returns the claim token, or null when the case is not open. */
export function claimRequest(db: DB, id: string, name: string, now = new Date()): string | null {
  const claimToken = newToken();
  const ts = now.toISOString();
  const { changes } = db
    .prepare(
      `UPDATE help_requests
       SET status = 'claimed', claimed_by = ?, claimed_at = ?, claim_token_hash = ?, updated_at = ?
       WHERE id = ? AND status = 'open' AND hidden = 0`
    )
    .run(name, ts, sha256(claimToken), ts, id);
  return changes === 1 ? claimToken : null;
}

export function releaseClaim(db: DB, id: string, now = new Date()): boolean {
  const { changes } = db
    .prepare(
      `UPDATE help_requests
       SET status = 'open', claimed_by = NULL, claimed_at = NULL, claim_token_hash = NULL, updated_at = ?
       WHERE id = ? AND status = 'claimed'`
    )
    .run(now.toISOString(), id);
  return changes === 1;
}

export function resolveRequest(db: DB, id: string, now = new Date()): boolean {
  const ts = now.toISOString();
  const { changes } = db
    .prepare(
      `UPDATE help_requests SET status = 'resolved', resolved_at = ?, updated_at = ?
       WHERE id = ? AND status != 'resolved'`
    )
    .run(ts, ts, id);
  return changes === 1;
}

export const FLAG_HIDE_THRESHOLD = 3;
export const STALE_CLAIM_MS = 3 * 60 * 60 * 1000;
export const PHONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function addFlag(db: DB, id: string, ipHash: string, now = new Date()): { newlyHidden: boolean } {
  return db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO flags (request_id, ip_hash, created_at) VALUES (?, ?, ?)').run(
      id,
      ipHash,
      now.toISOString()
    );
    const { count } = db.prepare('SELECT COUNT(*) AS count FROM flags WHERE request_id = ?').get(id) as {
      count: number;
    };
    if (count < FLAG_HIDE_THRESHOLD) return { newlyHidden: false };
    const { changes } = db.prepare('UPDATE help_requests SET hidden = 1 WHERE id = ? AND hidden = 0').run(id);
    return { newlyHidden: changes === 1 };
  })();
}

/** Reopens claims nobody finished within STALE_CLAIM_MS. Returns the reopened ids. */
export function releaseStaleClaims(db: DB, now = new Date()): string[] {
  const cutoff = new Date(now.getTime() - STALE_CLAIM_MS).toISOString();
  const ids = (
    db.prepare(`SELECT id FROM help_requests WHERE status = 'claimed' AND claimed_at < ?`).all(cutoff) as {
      id: string;
    }[]
  ).map((r) => r.id);
  db.transaction(() => ids.forEach((id) => releaseClaim(db, id, now)))();
  return ids;
}

/** PDPA: forget phone numbers of cases resolved more than PHONE_RETENTION_MS ago. */
export function purgeOldPhones(db: DB, now = new Date()): number {
  const cutoff = new Date(now.getTime() - PHONE_RETENTION_MS).toISOString();
  return db
    .prepare(
      `UPDATE help_requests SET phone = NULL
       WHERE status = 'resolved' AND resolved_at < ? AND phone IS NOT NULL`
    )
    .run(cutoff).changes;
}
