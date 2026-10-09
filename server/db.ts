import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS help_requests (
  id               TEXT PRIMARY KEY,
  lat              REAL NOT NULL,
  lng              REAL NOT NULL,
  location_text    TEXT NOT NULL DEFAULT '',
  needs            TEXT NOT NULL,
  people_count     INTEGER NOT NULL DEFAULT 1,
  has_elderly      INTEGER NOT NULL DEFAULT 0,
  has_children     INTEGER NOT NULL DEFAULT 0,
  has_bedridden    INTEGER NOT NULL DEFAULT 0,
  contact_name     TEXT NOT NULL DEFAULT '',
  phone            TEXT,
  details          TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','claimed','resolved')),
  claimed_by       TEXT,
  claimed_at       TEXT,
  owner_token_hash TEXT NOT NULL,
  claim_token_hash TEXT,
  hidden           INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  resolved_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests (status, hidden);

CREATE TABLE IF NOT EXISTS flags (
  request_id TEXT NOT NULL REFERENCES help_requests (id) ON DELETE CASCADE,
  ip_hash    TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (request_id, ip_hash)
);
`;

export function openDb(file: string): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
