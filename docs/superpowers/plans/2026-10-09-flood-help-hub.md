# Flood Help Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock flood dashboard with an open (no-login) help-request hub where flood victims post requests and volunteers claim and resolve them, live on a map.

**Architecture:** One Express server (run with `tsx`) serves the built Vite/React app, a JSON REST API under `/api`, and a Server-Sent Events stream at `/api/stream`. Data lives in a single SQLite file via `better-sqlite3`. Validation schemas and types live in `shared/` and are used by both server and client. The client is a mobile-first React app with three routes (`/`, `/new`, `/r/:id`) using `wouter`, and reuses the existing Leaflet basemap switcher and RainViewer radar.

**Tech Stack:** Node 24, TypeScript, Express 4, better-sqlite3, zod 4, express-rate-limit, React 19, Vite 8, Tailwind 4, Leaflet/react-leaflet, wouter, Vitest + supertest.

**Spec:** `docs/superpowers/specs/2026-10-09-flood-help-hub-design.md`

**Conventions:**
- Commit messages: Conventional Commits, English, imperative, no scope. End every commit with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- UI text is Thai. Code, comments, identifiers are English.
- Work on branch `feat/help-hub` created from `feat/real-gis-map`.

---

## File Map

**Create**
| File | Responsibility |
|---|---|
| `vitest.config.ts` | Test runner config (node env, test globs) |
| `shared/schema.ts` | zod schemas, constants (`NEEDS`, `STATUSES`, `TH_BOUNDS`), `PublicCase` type |
| `shared/schema.test.ts` | Validation tests |
| `server/tokens.ts` | Random ids, secret tokens, SHA-256, timing-safe compare |
| `server/tokens.test.ts` | Token tests |
| `server/db.ts` | Open SQLite + create tables |
| `server/requestsRepo.ts` | All SQL for help requests and flags; row → public mapping |
| `server/requestsRepo.test.ts` | Repo tests incl. stale claims + retention |
| `server/stream.ts` | SSE client registry + broadcast |
| `server/stream.test.ts` | Broadcast test |
| `server/rateLimit.ts` | Per-IP hourly limiter factory |
| `server/routes/requests.ts` | `/api/requests` router |
| `server/app.ts` | Express app factory (API, static, errors) |
| `server/app.test.ts` | API tests with supertest |
| `server/jobs.ts` | Stale-claim release + phone retention, every 5 min |
| `server/index.ts` | Entry point: env, db, app, jobs, listen |
| `src/lib/geo.ts` | `LatLng`, `distanceKm` |
| `src/lib/urgency.ts` | Urgency rank + list sorting |
| `src/lib/urgency.test.ts` | Sorting tests |
| `src/lib/labels.ts` | Thai labels, icons, colours, hotlines |
| `src/lib/format.ts` | `timeAgo` |
| `src/lib/api.ts` | Fetch wrapper + `ApiError` |
| `src/lib/caseTokens.ts` | Owner/claim tokens in `localStorage` |
| `src/lib/useCases.ts` | List + SSE hook |
| `src/lib/useCase.ts` | Single case + SSE hook |
| `src/components/Layout.tsx` | Header (SOS button), hotline bar, footer |
| `src/components/map/BaseMap.tsx` | Leaflet map, basemap switcher, radar toggle (moved from `GisFloodMap`) |
| `src/components/HelpMap.tsx` | Case pins on `BaseMap` |
| `src/components/LocationPicker.tsx` | GPS button + tap-to-pin map |
| `src/components/CaseCard.tsx` | Case summary card |
| `src/components/RequestFields.tsx` | `NeedToggles`, `VulnerableToggles`, `PeopleCounter` |
| `src/pages/Home.tsx` | Map + filters + list |
| `src/pages/NewRequest.tsx` | Request form + success screen |
| `src/pages/CaseDetail.tsx` | Case page with actions |
| `README.md` | Run, test, deploy on VPS |

**Modify:** `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `index.html`, `src/App.tsx`, `src/index.css`

**Delete:** `src/data/`, `src/types/`, `src/utils/`, `src/assets/`, and every file in `src/components/` that exists today (`DamCapacityTracker.tsx`, `EmergencyGuideModal.tsx`, `EmergencyTicker.tsx`, `GisFloodMap.tsx`, `Header.tsx`, `NotificationSettingsModal.tsx`, `ReportFloodModal.tsx`, `RiskAlertsPanel.tsx`, `ShelterAndHelpPanel.tsx`, `StationDetailModal.tsx`, `TelemetryStationsTable.tsx`). `GisFloodMap.tsx` is deleted only after Task 11 moves its basemap code into `BaseMap.tsx`.

---

### Task 1: Branch, tooling and dependencies

**Files:**
- Modify: `package.json`, `tsconfig.json`, `.gitignore`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create the branch and discard the abandoned dashboard edits**

The working tree has uncommitted KPI/banner edits to the old dashboard, which this plan deletes.

```bash
git checkout feat/real-gis-map
git checkout -- src/App.tsx src/components/TelemetryStationsTable.tsx
git checkout -b feat/help-hub
git status --short
```
Expected: only `?? .claude/` remains.

- [ ] **Step 2: Install runtime and dev dependencies, remove unused ones**

```bash
npm uninstall @google/genai dotenv motion
npm install better-sqlite3@13.0.3 zod@4.6.5 express-rate-limit@8.7.1 wouter@3.13.0 tsx@4.21.0
npm install -D vitest@5.0.3 supertest@7.3.1 @types/supertest @types/better-sqlite3
```
`tsx` moves from devDependencies to dependencies because production runs the server with it.

- [ ] **Step 3: Verify the native SQLite module loads**

```bash
node -e "const D=require('better-sqlite3'); const db=new D(':memory:'); console.log(db.prepare('select sqlite_version() v').get())"
```
Expected: `{ v: '3.x.x' }`

- [ ] **Step 4: Update scripts in `package.json`**

Replace the `"name"` and `"scripts"` entries with:

```json
  "name": "floodwatch",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "dev:server": "tsx watch server/index.ts",
    "build": "vite build",
    "start": "tsx server/index.ts",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
```

- [ ] **Step 5: Add Node types to `tsconfig.json`**

Change `"types": ["vite/client"],` to:

```json
    "types": ["vite/client", "node"],
```

- [ ] **Step 6: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts', 'shared/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
```

- [ ] **Step 7: Ignore the database directory**

Append to `.gitignore`:

```
data/
```

- [ ] **Step 8: Verify**

Run: `npx vitest run --passWithNoTests`
Expected: exits 0, "No test files found".

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore vitest.config.ts
git commit -m "chore: add server, test and routing dependencies

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Shared schemas and types

**Files:**
- Create: `shared/schema.ts`, `shared/schema.test.ts`

- [ ] **Step 1: Write the failing test** — `shared/schema.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { claimSchema, createRequestSchema, updateRequestSchema } from './schema';

const valid = { lat: 14.35, lng: 100.57, needs: ['evacuate'], phone: '081-234-5678' };

describe('createRequestSchema', () => {
  it('normalizes phone, dedupes needs and fills defaults', () => {
    const out = createRequestSchema.parse({ ...valid, needs: ['food', 'food', 'medical'] });
    expect(out.phone).toBe('0812345678');
    expect(out.needs).toEqual(['food', 'medical']);
    expect(out.peopleCount).toBe(1);
    expect(out.hasElderly).toBe(false);
    expect(out.details).toBe('');
  });

  it('rejects coordinates outside Thailand', () => {
    const r = createRequestSchema.safeParse({ ...valid, lat: 35.6, lng: 139.7 });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(['lat', 'lng']));
  });

  it('requires at least one need', () => {
    const r = createRequestSchema.safeParse({ ...valid, needs: [] });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].path).toEqual(['needs']);
  });

  it('rejects unknown needs and malformed phones', () => {
    expect(createRequestSchema.safeParse({ ...valid, needs: ['pizza'] }).success).toBe(false);
    expect(createRequestSchema.safeParse({ ...valid, phone: '12345' }).success).toBe(false);
  });
});

describe('updateRequestSchema', () => {
  it('does not inject defaults for omitted fields', () => {
    expect(updateRequestSchema.parse({ details: 'น้ำสูงขึ้น' })).toEqual({ details: 'น้ำสูงขึ้น' });
  });
});

describe('claimSchema', () => {
  it('requires a non-empty name', () => {
    expect(claimSchema.safeParse({ name: '  ' }).success).toBe(false);
    expect(claimSchema.parse({ name: ' ทีมเรือ ' })).toEqual({ name: 'ทีมเรือ' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run shared/schema.test.ts`
Expected: FAIL — cannot resolve `./schema`.

- [ ] **Step 3: Implement** — `shared/schema.ts`

```ts
import { z } from 'zod';

export const NEEDS = ['evacuate', 'food', 'medical', 'animals'] as const;
export type Need = (typeof NEEDS)[number];

export const STATUSES = ['open', 'claimed', 'resolved'] as const;
export type Status = (typeof STATUSES)[number];

export const TH_BOUNDS = { minLat: 5.5, maxLat: 20.6, minLng: 97.3, maxLng: 105.7 } as const;

const OUTSIDE_TH = 'ตำแหน่งต้องอยู่ในประเทศไทย';

const lat = z
  .number({ error: 'กรุณาระบุตำแหน่ง' })
  .min(TH_BOUNDS.minLat, OUTSIDE_TH)
  .max(TH_BOUNDS.maxLat, OUTSIDE_TH);

const lng = z
  .number({ error: 'กรุณาระบุตำแหน่ง' })
  .min(TH_BOUNDS.minLng, OUTSIDE_TH)
  .max(TH_BOUNDS.maxLng, OUTSIDE_TH);

// Fields shared by create and update; no defaults here so PATCH only touches sent keys
const fields = {
  locationText: z.string().trim().max(200, 'ที่อยู่ยาวเกิน 200 ตัวอักษร'),
  needs: z
    .array(z.enum(NEEDS), { error: 'เลือกประเภทความช่วยเหลือ' })
    .min(1, 'เลือกประเภทความช่วยเหลืออย่างน้อย 1 อย่าง')
    .transform((needs) => [...new Set(needs)]),
  peopleCount: z
    .number({ error: 'ระบุจำนวนคน' })
    .int('จำนวนคนต้องเป็นจำนวนเต็ม')
    .min(1, 'อย่างน้อย 1 คน')
    .max(500, 'ไม่เกิน 500 คน'),
  hasElderly: z.boolean(),
  hasChildren: z.boolean(),
  hasBedridden: z.boolean(),
  contactName: z.string().trim().max(100, 'ชื่อยาวเกิน 100 ตัวอักษร'),
  phone: z
    .string({ error: 'กรุณาใส่เบอร์โทร' })
    .trim()
    .transform((s) => s.replace(/[\s-]/g, ''))
    .refine((s) => /^0\d{8,9}$/.test(s), 'เบอร์โทรไม่ถูกต้อง (ตัวอย่าง 081-234-5678)'),
  details: z.string().trim().max(1000, 'รายละเอียดยาวเกิน 1000 ตัวอักษร'),
};

export const createRequestSchema = z.object({
  lat,
  lng,
  needs: fields.needs,
  phone: fields.phone,
  locationText: fields.locationText.default(''),
  peopleCount: fields.peopleCount.default(1),
  hasElderly: fields.hasElderly.default(false),
  hasChildren: fields.hasChildren.default(false),
  hasBedridden: fields.hasBedridden.default(false),
  contactName: fields.contactName.default(''),
  details: fields.details.default(''),
});

export const updateRequestSchema = z.object(fields).partial();

export const claimSchema = z.object({
  name: z
    .string({ error: 'กรุณาใส่ชื่อ' })
    .trim()
    .min(1, 'กรุณาใส่ชื่อหรือชื่อทีม')
    .max(100, 'ชื่อยาวเกิน 100 ตัวอักษร'),
});

export type CreateRequestInput = z.input<typeof createRequestSchema>;
export type CreateRequest = z.output<typeof createRequestSchema>;
export type UpdateRequest = z.output<typeof updateRequestSchema>;

/** A help request as anyone may see it. Never contains the phone number. */
export interface PublicCase {
  id: string;
  lat: number;
  lng: number;
  locationText: string;
  needs: Need[];
  peopleCount: number;
  hasElderly: boolean;
  hasChildren: boolean;
  hasBedridden: boolean;
  contactName: string;
  details: string;
  status: Status;
  claimedBy: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run shared/schema.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/
git commit -m "feat: add shared help request schemas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Ids and secret tokens

**Files:**
- Create: `server/tokens.ts`, `server/tokens.test.ts`

- [ ] **Step 1: Write the failing test** — `server/tokens.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { newId, newToken, sha256, tokenMatches } from './tokens';

describe('tokens', () => {
  it('creates 8-char ids from an unambiguous alphabet', () => {
    const id = newId();
    expect(id).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]{8}$/);
    expect(newId()).not.toBe(id);
  });

  it('creates url-safe 43-char tokens', () => {
    expect(newToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('matches a token only against its own hash', () => {
    const t = newToken();
    expect(tokenMatches(t, sha256(t))).toBe(true);
    expect(tokenMatches(newToken(), sha256(t))).toBe(false);
    expect(tokenMatches(t, null)).toBe(false);
    expect(tokenMatches(undefined, sha256(t))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run server/tokens.test.ts`
Expected: FAIL — cannot resolve `./tokens`.

- [ ] **Step 3: Implement** — `server/tokens.ts`

```ts
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// 32 symbols without l/o/0/1 so ids are easy to read aloud over the phone
const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function newId(length = 8): string {
  let id = '';
  for (const byte of randomBytes(length)) id += ID_ALPHABET[byte & 31];
  return id;
}

export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function tokenMatches(token: string | undefined, hash: string | null): boolean {
  if (!token || !hash) return false;
  const a = Buffer.from(sha256(token), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run server/tokens.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/tokens.ts server/tokens.test.ts
git commit -m "feat: add id and secret token helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Database and create/read repository

**Files:**
- Create: `server/db.ts`, `server/requestsRepo.ts`, `server/requestsRepo.test.ts`

- [ ] **Step 1: Write the failing test** — `server/requestsRepo.test.ts`

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run server/requestsRepo.test.ts`
Expected: FAIL — cannot resolve `./db`.

- [ ] **Step 3: Implement** — `server/db.ts`

```ts
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
```

- [ ] **Step 4: Implement create/read** — `server/requestsRepo.ts`

```ts
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
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run server/requestsRepo.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add server/db.ts server/requestsRepo.ts server/requestsRepo.test.ts
git commit -m "feat: add sqlite storage for help requests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Repository state transitions (update, claim, release, resolve)

**Files:**
- Modify: `server/requestsRepo.ts` (append), `server/requestsRepo.test.ts` (append)

- [ ] **Step 1: Write the failing tests** — append to `server/requestsRepo.test.ts`

Add to the import from `./requestsRepo`: `claimRequest, isClaimer, releaseClaim, resolveRequest, updateRequest`. Then append:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run server/requestsRepo.test.ts`
Expected: FAIL — `updateRequest` is not exported.

- [ ] **Step 3: Implement** — append to `server/requestsRepo.ts` (and add `UpdateRequest` to the `../shared/schema` type import)

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run server/requestsRepo.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add server/requestsRepo.ts server/requestsRepo.test.ts
git commit -m "feat: add claim, release and resolve transitions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Flags, stale claims and phone retention

**Files:**
- Modify: `server/requestsRepo.ts` (append), `server/requestsRepo.test.ts` (append)

- [ ] **Step 1: Write the failing tests** — append to `server/requestsRepo.test.ts`

Add to the import from `./requestsRepo`: `addFlag, purgeOldPhones, releaseStaleClaims`. Then append:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run server/requestsRepo.test.ts`
Expected: FAIL — `addFlag` is not exported.

- [ ] **Step 3: Implement** — append to `server/requestsRepo.ts`

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run server/requestsRepo.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add server/requestsRepo.ts server/requestsRepo.test.ts
git commit -m "feat: add fake-case flags, stale claim release and phone retention

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: SSE stream

**Files:**
- Create: `server/stream.ts`, `server/stream.test.ts`

- [ ] **Step 1: Write the failing test** — `server/stream.test.ts`

```ts
import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { createStream } from './stream';

function fakeClient() {
  const req = new EventEmitter() as unknown as Request;
  const writes: string[] = [];
  const res = {
    writeHead: () => res,
    write: (chunk: string) => writes.push(chunk),
    end: () => undefined,
  } as unknown as Response;
  return { req, res, writes };
}

describe('stream', () => {
  it('broadcasts named events to connected clients until they disconnect', () => {
    const stream = createStream();
    const a = fakeClient();
    stream.handler(a.req, a.res);
    expect(stream.clientCount()).toBe(1);

    stream.broadcast('request.created', { id: 'abc' });
    expect(a.writes.at(-1)).toBe('event: request.created\ndata: {"id":"abc"}\n\n');

    (a.req as unknown as EventEmitter).emit('close');
    expect(stream.clientCount()).toBe(0);
    stream.close();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run server/stream.test.ts`
Expected: FAIL — cannot resolve `./stream`.

- [ ] **Step 3: Implement** — `server/stream.ts`

```ts
import type { Request, Response } from 'express';

export interface Stream {
  handler: (req: Request, res: Response) => void;
  broadcast: (event: string, data: unknown) => void;
  clientCount: () => number;
  close: () => void;
}

export function createStream(heartbeatMs = 25_000): Stream {
  const clients = new Set<Response>();

  // Comment lines keep proxies and mobile networks from closing idle connections
  const heartbeat = setInterval(() => {
    for (const client of clients) client.write(': ping\n\n');
  }, heartbeatMs);
  heartbeat.unref();

  return {
    handler(req, res) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
    },
    broadcast(event, data) {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      for (const client of clients) client.write(message);
    },
    clientCount: () => clients.size,
    close() {
      clearInterval(heartbeat);
      for (const client of clients) client.end();
      clients.clear();
    },
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run server/stream.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add server/stream.ts server/stream.test.ts
git commit -m "feat: add server-sent events stream

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: HTTP API

**Files:**
- Create: `server/rateLimit.ts`, `server/routes/requests.ts`, `server/app.ts`, `server/app.test.ts`

- [ ] **Step 1: Write the failing test** — `server/app.test.ts`

```ts
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import { openDb } from './db';
import { createStream, type Stream } from './stream';

const valid = { lat: 14.35, lng: 100.57, needs: ['evacuate'], phone: '081-234-5678', hasElderly: true };

let stream: Stream;
function setup(rateLimits = false) {
  const db = openDb(':memory:');
  stream = createStream();
  const app = createApp({ db, stream, ipSalt: 'test-salt', trustProxy: 1, rateLimits });
  return { db, app };
}
afterEach(() => stream.close());

async function create(app: ReturnType<typeof setup>['app']) {
  const res = await request(app).post('/api/requests').send(valid).expect(201);
  return res.body as { id: string; ownerToken: string };
}

describe('help request API', () => {
  it('creates a request, broadcasts it, and never leaks the phone in reads', async () => {
    const { app } = setup();
    const spy = vi.spyOn(stream, 'broadcast');
    const { id, ownerToken } = await create(app);
    expect(ownerToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(spy).toHaveBeenCalledWith('request.created', expect.objectContaining({ id }));

    const list = await request(app).get('/api/requests').expect(200);
    expect(list.body).toHaveLength(1);
    expect(JSON.stringify(list.body)).not.toContain('0812345678');

    const one = await request(app).get(`/api/requests/${id}`).expect(200);
    expect(one.body).not.toHaveProperty('phone');

    const phone = await request(app).post(`/api/requests/${id}/phone`).expect(200);
    expect(phone.body).toEqual({ phone: '0812345678' });
  });

  it('returns field errors in Thai for invalid input', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/api/requests')
      .send({ ...valid, lat: 35.6, needs: [] })
      .expect(400);
    expect(res.body.fields.lat).toBe('ตำแหน่งต้องอยู่ในประเทศไทย');
    expect(res.body.fields.needs).toBe('เลือกประเภทความช่วยเหลืออย่างน้อย 1 อย่าง');
  });

  it('lets one volunteer claim, then release with the claim token', async () => {
    const { app } = setup();
    const { id } = await create(app);
    const claim = await request(app).post(`/api/requests/${id}/claim`).send({ name: 'ทีมเรือ' }).expect(200);
    await request(app).post(`/api/requests/${id}/claim`).send({ name: 'อีกทีม' }).expect(409);

    await request(app).post(`/api/requests/${id}/release`).set('X-Token', 'wrong').expect(403);
    const released = await request(app)
      .post(`/api/requests/${id}/release`)
      .set('X-Token', claim.body.claimToken)
      .expect(200);
    expect(released.body.status).toBe('open');
  });

  it('resolves with the owner token or the claim token only', async () => {
    const { app } = setup();
    const a = await create(app);
    await request(app).post(`/api/requests/${a.id}/resolve`).expect(403);
    await request(app).post(`/api/requests/${a.id}/resolve`).set('X-Token', a.ownerToken).expect(200);
    await request(app).post(`/api/requests/${a.id}/resolve`).set('X-Token', a.ownerToken).expect(409);

    const b = await create(app);
    const claim = await request(app).post(`/api/requests/${b.id}/claim`).send({ name: 'ทีม' });
    const res = await request(app)
      .post(`/api/requests/${b.id}/resolve`)
      .set('X-Token', claim.body.claimToken)
      .expect(200);
    expect(res.body.status).toBe('resolved');
  });

  it('lets only the owner edit', async () => {
    const { app } = setup();
    const { id, ownerToken } = await create(app);
    await request(app).patch(`/api/requests/${id}`).send({ details: 'x' }).expect(403);
    const res = await request(app)
      .patch(`/api/requests/${id}`)
      .set('X-Token', ownerToken)
      .send({ details: 'น้ำสูงถึงหน้าต่างแล้ว' })
      .expect(200);
    expect(res.body.details).toBe('น้ำสูงถึงหน้าต่างแล้ว');
  });

  it('hides a case after three different IPs flag it', async () => {
    const { app } = setup();
    const spy = vi.spyOn(stream, 'broadcast');
    const { id } = await create(app);
    for (const ip of ['10.0.0.1', '10.0.0.1', '10.0.0.2']) {
      await request(app).post(`/api/requests/${id}/flag`).set('X-Forwarded-For', ip).expect(204);
    }
    await request(app).get(`/api/requests/${id}`).expect(200);
    await request(app).post(`/api/requests/${id}/flag`).set('X-Forwarded-For', '10.0.0.3').expect(204);
    await request(app).get(`/api/requests/${id}`).expect(404);
    expect((await request(app).get('/api/requests')).body).toHaveLength(0);
    expect(spy).toHaveBeenCalledWith('request.removed', { id });
  });

  it('returns 404 for unknown cases', async () => {
    const { app } = setup();
    await request(app).get('/api/requests/nope1234').expect(404);
  });

  it('rate limits request creation per IP', async () => {
    const { app } = setup(true);
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/requests').set('X-Forwarded-For', '10.1.1.1').send(valid).expect(201);
    }
    const res = await request(app).post('/api/requests').set('X-Forwarded-For', '10.1.1.1').send(valid);
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run server/app.test.ts`
Expected: FAIL — cannot resolve `./app`.

- [ ] **Step 3: Implement** — `server/rateLimit.ts`

```ts
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

const HOUR_MS = 60 * 60 * 1000;

export function hourlyLimit(limit: number, enabled: boolean): RequestHandler {
  if (!enabled) return (_req, _res, next) => next();
  return rateLimit({
    windowMs: HOUR_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่' },
  });
}
```

- [ ] **Step 4: Implement** — `server/routes/requests.ts`

```ts
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
    const patch = parseBody(updateRequestSchema, req, res);
    if (!patch) return;
    updateRequest(db, row.id, patch);
    publish('request.updated', row.id);
    res.json(current(row.id));
  });

  router.post('/:id/phone', hourlyLimit(30, rateLimits), (req, res) => {
    const row = getVisible(db, req.params.id);
    if (!row) return notFound(res);
    res.json({ phone: row.phone });
  });

  router.post('/:id/claim', (req, res) => {
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
    const { newlyHidden } = addFlag(db, row.id, sha256(`${req.ip}|${ipSalt}`));
    if (newlyHidden) stream.broadcast('request.removed', { id: row.id });
    res.status(204).end();
  });

  return router;
}
```

- [ ] **Step 5: Implement** — `server/app.ts`

```ts
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import type { DB } from './db';
import { requestsRouter } from './routes/requests';
import type { Stream } from './stream';

export interface AppDeps {
  db: DB;
  stream: Stream;
  ipSalt: string;
  /** Express "trust proxy" setting; use 1 behind a single reverse proxy such as nginx. */
  trustProxy?: number | boolean;
  rateLimits?: boolean;
  /** Built frontend directory (Vite dist/). Served with SPA fallback when set. */
  staticDir?: string;
}

export function createApp({ db, stream, ipSalt, trustProxy, rateLimits = true, staticDir }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);

  app.use(express.json({ limit: '10kb' }));
  app.get('/api/stream', stream.handler);
  app.use('/api/requests', requestsRouter({ db, stream, ipSalt, rateLimits }));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'ไม่พบ' }));

  if (staticDir) {
    app.use(express.static(staticDir));
    app.get('*', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'ข้อมูลใหญ่เกินไป' });
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่' });
  });

  return app;
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run server/app.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 7: Run the whole suite and typecheck**

Run: `npm test && npm run lint`
Expected: all tests pass; `tsc` prints nothing. (The old dashboard still compiles at this point.)

- [ ] **Step 8: Commit**

```bash
git add server/
git commit -m "feat: add help request REST API

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Background jobs, server entry point, dev proxy

**Files:**
- Create: `server/jobs.ts`, `server/index.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Implement** — `server/jobs.ts`

```ts
import type { DB } from './db';
import { getVisible, purgeOldPhones, releaseStaleClaims, toPublic } from './requestsRepo';
import type { Stream } from './stream';

export function runJobs(db: DB, stream: Stream, now = new Date()) {
  const reopened = releaseStaleClaims(db, now);
  for (const id of reopened) {
    const row = getVisible(db, id);
    if (row) stream.broadcast('request.updated', toPublic(row));
  }
  const phonesPurged = purgeOldPhones(db, now);
  return { reopened, phonesPurged };
}

export function startJobs(db: DB, stream: Stream, intervalMs = 5 * 60 * 1000): () => void {
  runJobs(db, stream);
  const timer = setInterval(() => runJobs(db, stream), intervalMs);
  return () => clearInterval(timer);
}
```

- [ ] **Step 2: Implement** — `server/index.ts`

```ts
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { createApp } from './app';
import { openDb } from './db';
import { startJobs } from './jobs';
import { createStream } from './stream';

const PORT = Number(process.env.PORT ?? 8080);
const DB_PATH = process.env.DB_PATH ?? './data/floodwatch.db';
const TRUST_PROXY = process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : undefined;

let ipSalt = process.env.IP_SALT;
if (!ipSalt) {
  console.warn('IP_SALT is not set; using a random salt, so fake-case flags reset on restart.');
  ipSalt = randomBytes(16).toString('hex');
}

const db = openDb(DB_PATH);
const stream = createStream();
const app = createApp({
  db,
  stream,
  ipSalt,
  trustProxy: TRUST_PROXY,
  staticDir: path.resolve(import.meta.dirname, '../dist'),
});
startJobs(db, stream);

app.listen(PORT, () => console.log(`FloodWatch server listening on http://localhost:${PORT}`));
```

- [ ] **Step 3: Proxy `/api` from the Vite dev server** — in `vite.config.ts`, add a `proxy` key inside the existing `server: { ... }` object:

```ts
      proxy: {
        '/api': 'http://localhost:8080',
      },
```

- [ ] **Step 4: Smoke-test the running server**

Run in one terminal: `npm run dev:server`
Expected log: `FloodWatch server listening on http://localhost:8080`

In another terminal:

```bash
curl -s -X POST localhost:8080/api/requests -H "Content-Type: application/json" -d '{"lat":14.35,"lng":100.57,"needs":["food"],"phone":"0812345678"}'
curl -s localhost:8080/api/requests
```
Expected: first prints `{"id":"…","ownerToken":"…"}` (HTTP 201); second prints a one-element array without `phone`. Then stop the server and delete `data/floodwatch.db*`.

- [ ] **Step 5: Commit**

```bash
git add server/jobs.ts server/index.ts vite.config.ts
git commit -m "feat: add server entry point with background jobs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Remove the mock dashboard and add client foundations

**Files:**
- Delete: see File Map (keep `src/components/GisFloodMap.tsx` until Task 11)
- Create: `src/lib/geo.ts`, `src/lib/urgency.ts`, `src/lib/urgency.test.ts`, `src/lib/labels.ts`, `src/lib/format.ts`, `src/lib/api.ts`, `src/lib/caseTokens.ts`, `src/lib/useCases.ts`, `src/lib/useCase.ts`

- [ ] **Step 1: Delete the dashboard**

```bash
git rm -r -q src/data src/types src/utils src/assets
git rm -q src/components/DamCapacityTracker.tsx src/components/EmergencyGuideModal.tsx src/components/EmergencyTicker.tsx src/components/Header.tsx src/components/NotificationSettingsModal.tsx src/components/ReportFloodModal.tsx src/components/RiskAlertsPanel.tsx src/components/ShelterAndHelpPanel.tsx src/components/StationDetailModal.tsx src/components/TelemetryStationsTable.tsx
```

`src/App.tsx` and `GisFloodMap.tsx` no longer compile after this; they are rewritten in Tasks 11–14.

- [ ] **Step 2: Write the failing test** — `src/lib/urgency.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import type { PublicCase } from '../../shared/schema';
import { sortCases, urgencyRank } from './urgency';

const base: PublicCase = {
  id: 'x',
  lat: 14,
  lng: 100,
  locationText: '',
  needs: ['food'],
  peopleCount: 1,
  hasElderly: false,
  hasChildren: false,
  hasBedridden: false,
  contactName: '',
  details: '',
  status: 'open',
  claimedBy: null,
  claimedAt: null,
  createdAt: '2026-10-09T00:00:00.000Z',
  updatedAt: '2026-10-09T00:00:00.000Z',
  resolvedAt: null,
};
const c = (over: Partial<PublicCase>): PublicCase => ({ ...base, ...over });

describe('urgency', () => {
  it('ranks evacuation with vulnerable people first, then medical, evacuation, others', () => {
    expect(urgencyRank(c({ needs: ['evacuate'], hasBedridden: true }))).toBe(0);
    expect(urgencyRank(c({ needs: ['medical', 'food'] }))).toBe(1);
    expect(urgencyRank(c({ needs: ['evacuate'] }))).toBe(2);
    expect(urgencyRank(c({ needs: ['animals'] }))).toBe(3);
  });

  it('sorts open before claimed, then by urgency, distance, and age', () => {
    const sorted = sortCases(
      [
        c({ id: 'claimed', status: 'claimed', needs: ['evacuate'], hasElderly: true }),
        c({ id: 'food-far', lat: 18 }),
        c({ id: 'food-near-new', lat: 14.01, createdAt: '2026-10-09T05:00:00.000Z' }),
        c({ id: 'food-near-old', lat: 14.01, createdAt: '2026-10-09T01:00:00.000Z' }),
        c({ id: 'medical', needs: ['medical'], lat: 18 }),
      ],
      { lat: 14, lng: 100 }
    );
    expect(sorted.map((x) => x.id)).toEqual(['medical', 'food-near-old', 'food-near-new', 'food-far', 'claimed']);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/lib/urgency.test.ts`
Expected: FAIL — cannot resolve `./urgency`.

- [ ] **Step 4: Implement** — `src/lib/geo.ts`

```ts
export interface LatLng {
  lat: number;
  lng: number;
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
```

- [ ] **Step 5: Implement** — `src/lib/urgency.ts`

```ts
import type { PublicCase, Status } from '../../shared/schema';
import { distanceKm, type LatLng } from './geo';

/** 0 = most urgent. */
export function urgencyRank(c: PublicCase): number {
  const vulnerable = c.hasElderly || c.hasChildren || c.hasBedridden;
  if (c.needs.includes('evacuate') && vulnerable) return 0;
  if (c.needs.includes('medical')) return 1;
  if (c.needs.includes('evacuate')) return 2;
  return 3;
}

const STATUS_ORDER: Record<Status, number> = { open: 0, claimed: 1, resolved: 2 };

export function sortCases(cases: PublicCase[], origin?: LatLng | null): PublicCase[] {
  return [...cases].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      urgencyRank(a) - urgencyRank(b) ||
      (origin ? distanceKm(origin, a) - distanceKm(origin, b) : 0) ||
      a.createdAt.localeCompare(b.createdAt)
  );
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run src/lib/urgency.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Implement** — `src/lib/labels.ts`

```ts
import type { Need, Status } from '../../shared/schema';

export const NEED_LABEL: Record<Need, string> = {
  evacuate: 'อพยพ / ต้องการเรือ',
  food: 'อาหาร / น้ำดื่ม',
  medical: 'ยา / การแพทย์',
  animals: 'สัตว์เลี้ยง / ปศุสัตว์',
};

export const NEED_ICON: Record<Need, string> = {
  evacuate: '🚤',
  food: '🍚',
  medical: '💊',
  animals: '🐾',
};

export const STATUS_LABEL: Record<Status, string> = {
  open: 'รอความช่วยเหลือ',
  claimed: 'มีคนกำลังไป',
  resolved: 'ช่วยเหลือแล้ว',
};

export const STATUS_COLOR: Record<Status, string> = {
  open: '#ef4444',
  claimed: '#eab308',
  resolved: '#10b981',
};

export const HOTLINES = [
  { number: '1784', label: 'ปภ.' },
  { number: '1669', label: 'การแพทย์ฉุกเฉิน' },
  { number: '1460', label: 'กรมชลประทาน' },
] as const;
```

- [ ] **Step 8: Implement** — `src/lib/format.ts`

```ts
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
}
```

- [ ] **Step 9: Implement** — `src/lib/api.ts`

```ts
import type { CreateRequestInput, PublicCase, Status, UpdateRequest } from '../../shared/schema';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {}
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['X-Token'] = token;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่', data.fields);
  return data as T;
}

export const api = {
  list: (statuses: Status[]) => call<PublicCase[]>('GET', `/requests?status=${statuses.join(',')}`),
  get: (id: string) => call<PublicCase>('GET', `/requests/${id}`),
  create: (input: CreateRequestInput) => call<{ id: string; ownerToken: string }>('POST', '/requests', input),
  update: (id: string, patch: Partial<UpdateRequest>, token: string) =>
    call<PublicCase>('PATCH', `/requests/${id}`, patch, token),
  revealPhone: (id: string) => call<{ phone: string | null }>('POST', `/requests/${id}/phone`),
  claim: (id: string, name: string) => call<{ claimToken: string }>('POST', `/requests/${id}/claim`, { name }),
  release: (id: string, token: string) => call<PublicCase>('POST', `/requests/${id}/release`, undefined, token),
  resolve: (id: string, token: string) => call<PublicCase>('POST', `/requests/${id}/resolve`, undefined, token),
  flag: (id: string) => call<void>('POST', `/requests/${id}/flag`),
};
```

- [ ] **Step 10: Implement** — `src/lib/caseTokens.ts`

```ts
type TokenKind = 'owner' | 'claim';
type Stored = Record<string, Partial<Record<TokenKind, string>>>;

const KEY = 'floodwatch.tokens';

// localStorage can throw (private mode, blocked storage); tokens are a convenience, never required
function read(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

function write(stored: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // ignore
  }
}

export function getTokens(id: string): Partial<Record<TokenKind, string>> {
  return read()[id] ?? {};
}

export function saveToken(id: string, kind: TokenKind, token: string): void {
  const stored = read();
  stored[id] = { ...stored[id], [kind]: token };
  write(stored);
}

export function clearToken(id: string, kind: TokenKind): void {
  const stored = read();
  if (!stored[id]) return;
  delete stored[id][kind];
  write(stored);
}
```

- [ ] **Step 11: Implement** — `src/lib/useCases.ts`

```ts
import { useEffect, useState } from 'react';
import type { PublicCase, Status } from '../../shared/schema';
import { api } from './api';

export function useCases(statuses: Status[]) {
  const [cases, setCases] = useState<PublicCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const key = statuses.join(',');

  useEffect(() => {
    let cancelled = false;
    const wanted = key.split(',') as Status[];

    const load = () =>
      api
        .list(wanted)
        .then((list) => {
          if (cancelled) return;
          setCases(list);
          setError(null);
        })
        .catch(() => !cancelled && setError('โหลดข้อมูลไม่สำเร็จ'))
        .finally(() => !cancelled && setLoading(false));

    const upsert = (e: MessageEvent) => {
      const c = JSON.parse(e.data) as PublicCase;
      setCases((prev) => {
        const rest = prev.filter((p) => p.id !== c.id);
        return wanted.includes(c.status) ? [...rest, c] : rest;
      });
    };

    load();
    const es = new EventSource('/api/stream');
    es.addEventListener('request.created', upsert);
    es.addEventListener('request.updated', upsert);
    es.addEventListener('request.removed', (e) => {
      const { id } = JSON.parse(e.data) as { id: string };
      setCases((prev) => prev.filter((p) => p.id !== id));
    });
    es.onerror = () => setOnline(false);
    // Reload on (re)connect so events missed while offline are not lost
    es.onopen = () => {
      setOnline(true);
      load();
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, [key]);

  return { cases, loading, error, online };
}
```

- [ ] **Step 12: Implement** — `src/lib/useCase.ts`

```ts
import { useCallback, useEffect, useState } from 'react';
import type { PublicCase } from '../../shared/schema';
import { ApiError, api } from './api';

type LoadState = 'loading' | 'ready' | 'notfound' | 'error';

export function useCase(id: string) {
  const [data, setData] = useState<PublicCase | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  const reload = useCallback(
    () =>
      api
        .get(id)
        .then((c) => {
          setData(c);
          setState('ready');
        })
        .catch((e) => setState(e instanceof ApiError && e.status === 404 ? 'notfound' : 'error')),
    [id]
  );

  useEffect(() => {
    reload();
    const es = new EventSource('/api/stream');
    es.addEventListener('request.updated', (e) => {
      const c = JSON.parse(e.data) as PublicCase;
      if (c.id === id) setData(c);
    });
    es.addEventListener('request.removed', (e) => {
      if ((JSON.parse(e.data) as { id: string }).id === id) setState('notfound');
    });
    return () => es.close();
  }, [id, reload]);

  return { data, setData, state, reload };
}
```

- [ ] **Step 13: Run tests**

Run: `npm test`
Expected: all server, shared and urgency tests pass. (`npm run lint` still fails until Task 14.)

- [ ] **Step 14: Commit**

```bash
git add src/lib   # deletions were already staged by git rm
git commit -m "refactor: remove mock dashboard and add client data layer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Base map, help map, layout and home page

**Files:**
- Create: `src/components/map/BaseMap.tsx`, `src/components/HelpMap.tsx`, `src/components/CaseCard.tsx`, `src/components/Layout.tsx`, `src/pages/Home.tsx`
- Delete: `src/components/GisFloodMap.tsx`
- Modify: `src/App.tsx`, `src/main.tsx` (unchanged content check only), `index.html`

- [ ] **Step 1: Create** `src/components/map/BaseMap.tsx` (basemap + radar code moved from `GisFloodMap.tsx`)

```tsx
import { useEffect, useState, type ReactNode } from 'react';
import type { LatLngBoundsExpression } from 'leaflet';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CloudRain } from 'lucide-react';
import type { LatLng } from '../../lib/geo';

export const THAILAND_BOUNDS: LatLngBoundsExpression = [
  [5.6, 97.3],
  [20.5, 105.7],
];

type BasemapId = 'satellite' | 'terrain' | 'streets';

const BASEMAPS: Record<
  BasemapId,
  { label: string; icon: string; url: string; attribution: string; maxZoom: number; labelsUrl?: string }
> = {
  satellite: {
    label: 'ภาพดาวเทียม',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labelsUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  terrain: {
    label: 'ภูมิประเทศ',
    icon: '⛰️',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
  streets: {
    label: 'แผนที่ถนน',
    icon: '🗺️',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

// Latest RainViewer radar frame (free public API); null until loaded or if unavailable
function useRainRadarTileUrl(enabled: boolean) {
  const [tileUrl, setTileUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || tileUrl) return;
    let cancelled = false;
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((r) => r.json())
      .then((data) => {
        const frames = data?.radar?.past;
        if (cancelled || !data?.host || !frames?.length) return;
        setTileUrl(`${data.host}${frames[frames.length - 1].path}/256/{z}/{x}/{y}/2/1_1.png`);
      })
      .catch(() => {
        // Radar is optional; leave the layer hidden if the API is unreachable
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, tileUrl]);
  return tileUrl;
}

function ClickHandler({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FocusController({ focus }: { focus: (LatLng & { zoom?: number }) | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.setView([focus.lat, focus.lng], focus.zoom ?? Math.max(map.getZoom(), 14));
  }, [focus?.lat, focus?.lng, focus?.zoom, map]);
  return null;
}

interface BaseMapProps {
  children?: ReactNode;
  /** Height and extra classes for the map box. */
  className?: string;
  onMapClick?: (p: LatLng) => void;
  focus?: (LatLng & { zoom?: number }) | null;
}

export function BaseMap({ children, className = 'h-[420px]', onMapClick, focus }: BaseMapProps) {
  const [basemap, setBasemap] = useState<BasemapId>('streets');
  const [showRadar, setShowRadar] = useState(false);
  const radarTileUrl = useRainRadarTileUrl(showRadar);
  const active = BASEMAPS[basemap];

  return (
    <div className={`relative isolate w-full overflow-hidden rounded-xl border border-slate-800 bg-[#070d18] ${className}`}>
      <MapContainer
        bounds={THAILAND_BOUNDS}
        minZoom={5}
        zoomSnap={0.25}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ background: '#070d18' }}
      >
        {/* key forces a clean swap of tile sources when the basemap changes */}
        <TileLayer key={basemap} url={active.url} attribution={active.attribution} maxZoom={active.maxZoom} zIndex={1} />
        {active.labelsUrl && (
          <TileLayer key={`${basemap}-labels`} url={active.labelsUrl} maxZoom={active.maxZoom} zIndex={2} />
        )}
        {showRadar && radarTileUrl && (
          <TileLayer
            url={radarTileUrl}
            opacity={0.6}
            maxNativeZoom={7}
            zIndex={3}
            attribution='Radar &copy; <a href="https://www.rainviewer.com">RainViewer</a>'
          />
        )}
        {onMapClick && <ClickHandler onClick={onMapClick} />}
        <FocusController focus={focus} />
        {children}
      </MapContainer>

      <div className="absolute right-2 top-2 z-[1000] flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-900/90 p-1 shadow-lg backdrop-blur-md">
          {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setBasemap(id)}
              aria-pressed={basemap === id}
              className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${
                basemap === id ? 'bg-cyan-600 font-semibold text-white shadow' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span aria-hidden>{BASEMAPS[id].icon}</span>
              <span>{BASEMAPS[id].label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowRadar((v) => !v)}
          aria-pressed={showRadar}
          className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] shadow-lg backdrop-blur-md ${
            showRadar ? 'border-emerald-500/60 bg-emerald-950/80 text-emerald-300' : 'border-slate-700 bg-slate-900/90 text-slate-300'
          }`}
        >
          <CloudRain className="h-3 w-3" />
          เรดาร์ฝน
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete the old map**

```bash
git rm -q src/components/GisFloodMap.tsx
```

- [ ] **Step 3: Create** `src/components/HelpMap.tsx`

```tsx
import { CircleMarker, Tooltip } from 'react-leaflet';
import { useLocation } from 'wouter';
import type { PublicCase } from '../../shared/schema';
import { NEED_ICON, STATUS_COLOR, STATUS_LABEL } from '../lib/labels';
import { urgencyRank } from '../lib/urgency';
import { BaseMap } from './map/BaseMap';

export function HelpMap({ cases, className }: { cases: PublicCase[]; className?: string }) {
  const [, navigate] = useLocation();
  return (
    <BaseMap className={className}>
      {cases.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.lat, c.lng]}
          radius={c.status === 'open' && urgencyRank(c) === 0 ? 11 : 8}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: STATUS_COLOR[c.status], fillOpacity: 0.95 }}
          eventHandlers={{ click: () => navigate(`/r/${c.id}`) }}
        >
          <Tooltip direction="top" offset={[0, -8]} className="fw-map-label">
            {c.needs.map((n) => NEED_ICON[n]).join(' ')} {STATUS_LABEL[c.status]}
          </Tooltip>
        </CircleMarker>
      ))}
    </BaseMap>
  );
}
```

- [ ] **Step 4: Create** `src/components/CaseCard.tsx`

```tsx
import { Link } from 'wouter';
import type { PublicCase } from '../../shared/schema';
import { timeAgo } from '../lib/format';
import { distanceKm, type LatLng } from '../lib/geo';
import { NEED_ICON, NEED_LABEL, STATUS_COLOR, STATUS_LABEL } from '../lib/labels';

export function VulnerableBadges({ c }: { c: PublicCase }) {
  const badges = [c.hasElderly && 'ผู้สูงอายุ', c.hasChildren && 'เด็ก', c.hasBedridden && 'ผู้ป่วยติดเตียง'].filter(Boolean);
  if (badges.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span key={b as string} className="rounded bg-red-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-red-300">
          {b}
        </span>
      ))}
    </span>
  );
}

export function CaseCard({ c, origin }: { c: PublicCase; origin?: LatLng | null }) {
  return (
    <Link
      href={`/r/${c.id}`}
      className="block rounded-xl border border-slate-800 bg-slate-900 p-3 transition-colors hover:border-slate-600"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-white">
          {c.needs.map((n) => `${NEED_ICON[n]} ${NEED_LABEL[n]}`).join(' · ')}
        </div>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ color: STATUS_COLOR[c.status], background: `${STATUS_COLOR[c.status]}22` }}
        >
          {STATUS_LABEL[c.status]}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
        <span>👥 {c.peopleCount} คน</span>
        <VulnerableBadges c={c} />
      </div>
      {c.locationText && <p className="mt-1 line-clamp-1 text-xs text-slate-300">📍 {c.locationText}</p>}
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
        <span>{timeAgo(c.createdAt)}</span>
        {origin && <span>ห่าง {distanceKm(origin, c).toFixed(1)} กม.</span>}
      </div>
    </Link>
  );
}
```

- [ ] **Step 5: Create** `src/components/Layout.tsx`

```tsx
import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { HOTLINES } from '../lib/labels';

function Hotlines({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <span>ฉุกเฉินโทร</span>
      {HOTLINES.map((h) => (
        <a key={h.number} href={`tel:${h.number}`} className="font-semibold text-white underline-offset-2 hover:underline">
          {h.number} <span className="font-normal text-slate-400">({h.label})</span>
        </a>
      ))}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/" className="text-base font-bold text-white">
            🌊 FloodWatch <span className="hidden font-normal text-slate-400 sm:inline">· ศูนย์กลางขอความช่วยเหลือน้ำท่วม</span>
          </Link>
          <Link
            href="/new"
            className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white shadow hover:bg-red-500"
          >
            🆘 ขอความช่วยเหลือ
          </Link>
        </div>
        <div className="border-t border-slate-800/80 bg-slate-900/60">
          <Hotlines className="mx-auto max-w-6xl px-4 py-1.5 text-xs text-slate-300" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">{children}</main>

      <footer className="border-t border-slate-800 text-xs text-slate-500">
        <div className="mx-auto max-w-6xl space-y-1 px-4 py-4">
          <Hotlines className="text-slate-400" />
          <p>FloodWatch เป็นพื้นที่ให้ประชาชนช่วยเหลือกันเอง ไม่ใช่หน่วยงานราชการ ข้อมูลในเว็บมาจากผู้ใช้</p>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 6: Create** `src/pages/Home.tsx`

```tsx
import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { NEEDS, type Need, type Status } from '../../shared/schema';
import { CaseCard } from '../components/CaseCard';
import { HelpMap } from '../components/HelpMap';
import { distanceKm, type LatLng } from '../lib/geo';
import { NEED_ICON, NEED_LABEL } from '../lib/labels';
import { sortCases } from '../lib/urgency';
import { useCases } from '../lib/useCases';

const NEAR_ME_KM = 20;

export default function Home() {
  const [needFilter, setNeedFilter] = useState<Need | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [nearMe, setNearMe] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const statuses: Status[] = showResolved ? ['open', 'claimed', 'resolved'] : ['open', 'claimed'];
  const { cases, loading, error, online } = useCases(statuses);

  const visible = useMemo(() => {
    const filtered = cases.filter(
      (c) =>
        (!needFilter || c.needs.includes(needFilter)) &&
        (!nearMe || !origin || distanceKm(origin, c) <= NEAR_ME_KM)
    );
    return sortCases(filtered, origin);
  }, [cases, needFilter, nearMe, origin]);

  const openCount = cases.filter((c) => c.status === 'open').length;

  const toggleNearMe = () => {
    if (nearMe) return setNearMe(false);
    if (!navigator.geolocation) return setGpsError('อุปกรณ์นี้หาตำแหน่งไม่ได้');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearMe(true);
        setGpsError(null);
      },
      () => setGpsError('ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง'),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs whitespace-nowrap ${
      active ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200' : 'border-slate-700 bg-slate-900 text-slate-300'
    }`;

  return (
    <div className="space-y-4">
      {!online && (
        <div role="status" className="rounded-lg border border-amber-700/60 bg-amber-950/60 px-3 py-2 text-xs text-amber-200">
          ออฟไลน์ ข้อมูลอาจไม่อัปเดต กำลังเชื่อมต่อใหม่...
        </div>
      )}

      <Link
        href="/new"
        className="flex items-center justify-between rounded-2xl bg-red-600 px-5 py-4 text-white shadow-lg hover:bg-red-500"
      >
        <span>
          <span className="block text-lg font-bold">🆘 ต้องการความช่วยเหลือ?</span>
          <span className="text-sm text-red-100">แจ้งตำแหน่งและสิ่งที่ต้องการ อาสาในพื้นที่จะเห็นทันที</span>
        </span>
        <span className="text-2xl">→</span>
      </Link>

      <div className="flex items-baseline justify-between">
        <h1 className="text-base font-bold text-white">คำขอความช่วยเหลือ</h1>
        <span className="text-sm text-slate-400">
          รอความช่วยเหลือ <span className="font-bold text-red-400">{openCount}</span> เคส
        </span>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button type="button" className={chip(needFilter === null)} onClick={() => setNeedFilter(null)}>
          ทั้งหมด
        </button>
        {NEEDS.map((n) => (
          <button key={n} type="button" className={chip(needFilter === n)} onClick={() => setNeedFilter(needFilter === n ? null : n)}>
            {NEED_ICON[n]} {NEED_LABEL[n]}
          </button>
        ))}
        <button type="button" className={chip(nearMe)} onClick={toggleNearMe}>
          📍 ใกล้ฉัน ({NEAR_ME_KM} กม.)
        </button>
        <button type="button" className={chip(showResolved)} onClick={() => setShowResolved((v) => !v)}>
          ✅ แสดงเคสที่ช่วยแล้ว
        </button>
      </div>
      {gpsError && <p className="text-xs text-amber-300">{gpsError}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <HelpMap cases={visible} className="h-[55vh] min-h-[320px] lg:h-[640px]" />
        <section aria-label="รายการเคส" className="space-y-2 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">
          {loading && <p className="text-sm text-slate-400">กำลังโหลด...</p>}
          {error && <p className="text-sm text-red-300">{error}</p>}
          {!loading && !error && visible.length === 0 && (
            <p className="rounded-xl border border-slate-800 p-4 text-sm text-slate-400">ยังไม่มีคำขอในเงื่อนไขนี้</p>
          )}
          {visible.map((c) => (
            <CaseCard key={c.id} c={c} origin={origin} />
          ))}
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Replace** `src/App.tsx` (temporary routes for pages built in Tasks 12–13)

```tsx
import { Route, Switch } from 'wouter';
import { Layout } from './components/Layout';
import Home from './pages/Home';

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route>
          <p className="text-slate-400">ไม่พบหน้านี้</p>
        </Route>
      </Switch>
    </Layout>
  );
}
```

- [ ] **Step 8: Update `index.html`**

Replace the `<title>` and the three `content="…"` description/og tags with:

```html
    <title>FloodWatch - ศูนย์กลางขอความช่วยเหลือน้ำท่วม</title>
    <meta name="description" content="แจ้งขอความช่วยเหลือน้ำท่วมและดูคำขอบนแผนที่ อาสาในพื้นที่รับเคสและไปช่วยได้ทันที" />
    <meta property="og:title" content="FloodWatch - ศูนย์กลางขอความช่วยเหลือน้ำท่วม" />
    <meta property="og:description" content="แจ้งขอความช่วยเหลือน้ำท่วมและดูคำขอบนแผนที่ อาสาในพื้นที่รับเคสและไปช่วยได้ทันที" />
```

- [ ] **Step 9: Typecheck**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 10: Check in the browser**

Run `npm run dev:server` and `npm run dev` in two terminals. Create a case with the curl command from Task 9 Step 4, then open `http://localhost:3000`.
Expected: red SOS banner, one red pin on the map, one card in the list; basemap switcher and radar toggle work; console has no errors.

- [ ] **Step 11: Commit**

```bash
git add -A src index.html
git commit -m "feat: add help request map and list home page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Request form

**Files:**
- Create: `src/components/RequestFields.tsx`, `src/components/LocationPicker.tsx`, `src/pages/NewRequest.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create** `src/components/RequestFields.tsx`

```tsx
import { NEEDS, type Need } from '../../shared/schema';
import { NEED_ICON, NEED_LABEL } from '../lib/labels';

const toggle = (active: boolean) =>
  `flex min-h-12 items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition-colors ${
    active ? 'border-cyan-400 bg-cyan-500/20 text-white' : 'border-slate-700 bg-slate-900 text-slate-300'
  }`;

export function NeedToggles({ value, onChange }: { value: Need[]; onChange: (v: Need[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {NEEDS.map((n) => {
        const active = value.includes(n);
        return (
          <button
            key={n}
            type="button"
            aria-pressed={active}
            className={toggle(active)}
            onClick={() => onChange(active ? value.filter((v) => v !== n) : [...value, n])}
          >
            <span className="text-xl">{NEED_ICON[n]}</span>
            {NEED_LABEL[n]}
          </button>
        );
      })}
    </div>
  );
}

export interface Vulnerable {
  hasElderly: boolean;
  hasChildren: boolean;
  hasBedridden: boolean;
}

const VULNERABLE: { key: keyof Vulnerable; label: string }[] = [
  { key: 'hasElderly', label: '👵 ผู้สูงอายุ' },
  { key: 'hasChildren', label: '👶 เด็กเล็ก' },
  { key: 'hasBedridden', label: '🛏️ ผู้ป่วยติดเตียง' },
];

export function VulnerableToggles({ value, onChange }: { value: Vulnerable; onChange: (v: Vulnerable) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {VULNERABLE.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          aria-pressed={value[key]}
          className={toggle(value[key])}
          onClick={() => onChange({ ...value, [key]: !value[key] })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function PeopleCounter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const set = (n: number) => onChange(Math.min(500, Math.max(1, n)));
  const btn = 'h-12 w-12 rounded-xl border border-slate-700 bg-slate-900 text-xl font-bold text-white';
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => set(value - 1)} aria-label="ลดจำนวน">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={500}
        value={value}
        onChange={(e) => set(Number(e.target.value) || 1)}
        className="h-12 w-20 rounded-xl border border-slate-700 bg-slate-950 text-center text-lg font-bold text-white"
        aria-label="จำนวนคน"
      />
      <button type="button" className={btn} onClick={() => set(value + 1)} aria-label="เพิ่มจำนวน">
        +
      </button>
      <span className="text-sm text-slate-400">คน</span>
    </div>
  );
}
```

- [ ] **Step 2: Create** `src/components/LocationPicker.tsx`

```tsx
import { useState } from 'react';
import { CircleMarker } from 'react-leaflet';
import type { LatLng } from '../lib/geo';
import { BaseMap } from './map/BaseMap';

type GpsState = 'idle' | 'locating' | 'denied' | 'unavailable';

export function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (p: LatLng) => void }) {
  const [gps, setGps] = useState<GpsState>('idle');
  const [focus, setFocus] = useState<(LatLng & { zoom?: number }) | null>(null);

  const locate = () => {
    if (!navigator.geolocation) return setGps('unavailable');
    setGps('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(p);
        setFocus({ ...p, zoom: 16 });
        setGps('idle');
      },
      (err) => setGps(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={locate}
        disabled={gps === 'locating'}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
      >
        📍 {gps === 'locating' ? 'กำลังหาตำแหน่ง...' : 'ใช้ตำแหน่งปัจจุบันของฉัน'}
      </button>
      {gps === 'denied' && <p className="text-xs text-amber-300">ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง แตะบนแผนที่เพื่อปักหมุดแทน</p>}
      {gps === 'unavailable' && <p className="text-xs text-amber-300">หาตำแหน่งไม่ได้ แตะบนแผนที่เพื่อปักหมุดแทน</p>}
      <BaseMap className="h-72" onMapClick={onChange} focus={focus}>
        {value && (
          <CircleMarker
            center={[value.lat, value.lng]}
            radius={11}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#ef4444', fillOpacity: 1 }}
          />
        )}
      </BaseMap>
      <p className="text-xs text-slate-400">
        {value
          ? `ตำแหน่งที่เลือก ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)} (แตะแผนที่เพื่อเปลี่ยน)`
          : 'แตะบนแผนที่เพื่อปักหมุดตำแหน่ง'}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create** `src/pages/NewRequest.tsx`

```tsx
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'wouter';
import type { Need } from '../../shared/schema';
import { LocationPicker } from '../components/LocationPicker';
import { NeedToggles, PeopleCounter, VulnerableToggles, type Vulnerable } from '../components/RequestFields';
import { ApiError, api } from '../lib/api';
import { saveToken } from '../lib/caseTokens';
import type { LatLng } from '../lib/geo';

const DRAFT_KEY = 'floodwatch.draft';

interface Draft {
  location: LatLng | null;
  needs: Need[];
  peopleCount: number;
  vulnerable: Vulnerable;
  phone: string;
  contactName: string;
  locationText: string;
  details: string;
}

const EMPTY: Draft = {
  location: null,
  needs: [],
  peopleCount: 1,
  vulnerable: { hasElderly: false, hasChildren: false, hasBedridden: false },
  phone: '',
  contactName: '',
  locationText: '',
  details: '',
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function storeDraft(draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function Field({ label, error, children }: { label: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold text-slate-200">{label}</div>
      {children}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

const input = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white placeholder-slate-500';

export default function NewRequest() {
  const [d, setD] = useState<Draft>(loadDraft);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<{ id: string; ownerToken: string } | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));

  useEffect(() => window.scrollTo(0, 0), [created]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFields({});
    setError(null);
    if (!d.location) return setFields({ lat: 'กรุณาระบุตำแหน่ง' });
    setSending(true);
    try {
      const res = await api.create({
        lat: d.location.lat,
        lng: d.location.lng,
        needs: d.needs,
        peopleCount: d.peopleCount,
        ...d.vulnerable,
        phone: d.phone,
        contactName: d.contactName,
        locationText: d.locationText,
        details: d.details,
      });
      saveToken(res.id, 'owner', res.ownerToken);
      storeDraft(null);
      setCreated(res);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, 'ส่งไม่สำเร็จ');
      setFields(apiErr.fields);
      if (apiErr.status === 400) setError('กรุณาตรวจสอบข้อมูลที่ทำเครื่องหมายไว้');
      else {
        storeDraft(d); // keep what they typed for the retry
        setError(`${apiErr.message} ข้อมูลที่กรอกถูกเก็บไว้แล้ว กด "ส่งคำขอ" เพื่อลองอีกครั้ง`);
      }
    } finally {
      setSending(false);
    }
  };

  if (created) return <Created {...created} />;

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5" noValidate>
      <h1 className="text-xl font-bold text-white">🆘 ขอความช่วยเหลือ</h1>

      <Field label={<>ตำแหน่งของคุณ <span className="text-red-400">*</span></>} error={fields.lat ?? fields.lng}>
        <LocationPicker value={d.location} onChange={(p) => set('location', p)} />
        <input
          className={input}
          placeholder="จุดสังเกต เช่น ซอย 5 หลังวัด บ้านสีฟ้า"
          value={d.locationText}
          onChange={(e) => set('locationText', e.target.value)}
          maxLength={200}
        />
      </Field>

      <Field label={<>ต้องการความช่วยเหลืออะไร <span className="text-red-400">*</span></>} error={fields.needs}>
        <NeedToggles value={d.needs} onChange={(v) => set('needs', v)} />
      </Field>

      <Field label="มีกี่คน" error={fields.peopleCount}>
        <PeopleCounter value={d.peopleCount} onChange={(v) => set('peopleCount', v)} />
      </Field>

      <Field label="มีกลุ่มเปราะบางไหม (ถ้ามี)">
        <VulnerableToggles value={d.vulnerable} onChange={(v) => set('vulnerable', v)} />
      </Field>

      <Field label={<>เบอร์โทรติดต่อ <span className="text-red-400">*</span></>} error={fields.phone}>
        <input
          className={input}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="081-234-5678"
          value={d.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
        <p className="text-xs text-slate-500">เบอร์จะแสดงเมื่ออาสากด "แสดงเบอร์" เท่านั้น</p>
      </Field>

      <Field label="ชื่อ (ไม่บังคับ)" error={fields.contactName}>
        <input className={input} value={d.contactName} onChange={(e) => set('contactName', e.target.value)} maxLength={100} />
      </Field>

      <Field label="รายละเอียดเพิ่มเติม (ไม่บังคับ)" error={fields.details}>
        <textarea
          className={`${input} min-h-24`}
          placeholder="เช่น น้ำสูงระดับเอว มีผู้ป่วยต้องใช้ออกซิเจน"
          value={d.details}
          onChange={(e) => set('details', e.target.value)}
          maxLength={1000}
        />
      </Field>

      {error && (
        <p role="alert" className="rounded-xl border border-red-700/60 bg-red-950/60 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="min-h-14 w-full rounded-xl bg-red-600 text-lg font-bold text-white shadow-lg hover:bg-red-500 disabled:opacity-60"
      >
        {sending ? 'กำลังส่ง...' : 'ส่งคำขอความช่วยเหลือ'}
      </button>
    </form>
  );
}

function Created({ id, ownerToken }: { id: string; ownerToken: string }) {
  const link = `${window.location.origin}/r/${id}?t=${ownerToken}`;
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard
      ?.writeText(link)
      .then(() => setCopied(true))
      .catch(() => undefined);
  const share = () => navigator.share?.({ title: 'ลิงก์จัดการคำขอความช่วยเหลือ', url: link }).catch(() => undefined);

  return (
    <div className="mx-auto max-w-xl space-y-4 text-center">
      <div className="text-5xl">✅</div>
      <h1 className="text-xl font-bold text-white">ส่งคำขอแล้ว อาสาในพื้นที่จะเห็นทันที</h1>
      <p className="text-sm text-slate-300">
        ถ้าเป็นกรณีอันตรายถึงชีวิต โทร <a href="tel:1669" className="font-bold underline">1669</a> หรือ{' '}
        <a href="tel:1784" className="font-bold underline">1784</a> ด้วย
      </p>
      <div className="space-y-2 rounded-2xl border border-amber-600/60 bg-amber-950/40 p-4 text-left">
        <p className="text-sm font-bold text-amber-200">🔑 เก็บลิงก์นี้ไว้ (แคปหน้าจอได้)</p>
        <p className="text-xs text-amber-100/80">ใช้ลิงก์นี้เพื่อแก้ไขข้อมูล หรือแจ้งว่าได้รับความช่วยเหลือแล้ว ห้ามส่งให้คนอื่น</p>
        <p className="break-all rounded-lg bg-slate-950 p-2 font-mono text-xs text-slate-200">{link}</p>
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white">
            {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
          </button>
          {'share' in navigator && (
            <button type="button" onClick={share} className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white">
              แชร์
            </button>
          )}
        </div>
      </div>
      <Link href={`/r/${id}`} className="block rounded-xl bg-cyan-600 py-3 font-bold text-white">
        ดูเคสของฉัน
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Add the route** — in `src/App.tsx` add `import NewRequest from './pages/NewRequest';` and, before the catch-all `<Route>`, add:

```tsx
        <Route path="/new" component={NewRequest} />
```

- [ ] **Step 5: Typecheck**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Check in the browser**

With both dev servers running, open `http://localhost:3000/new`:
1. Submit empty → "กรุณาระบุตำแหน่ง".
2. Tap the map, submit with no need selected → error under the needs group.
3. Pick a need, phone `12345` → phone error from the server.
4. Valid phone → success screen with the secret link; "ดูเคสของฉัน" goes to `/r/<id>` (blank until Task 13).
5. Stop `dev:server`, submit again → connection error; reload the page → the form is restored from the draft.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: add help request form with gps and map pin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Case detail page

**Files:**
- Create: `src/pages/CaseDetail.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create** `src/pages/CaseDetail.tsx`

```tsx
import { useEffect, useState } from 'react';
import { CircleMarker } from 'react-leaflet';
import { Link, useParams, useSearch } from 'wouter';
import type { PublicCase } from '../../shared/schema';
import { VulnerableBadges } from '../components/CaseCard';
import { BaseMap } from '../components/map/BaseMap';
import { NeedToggles, PeopleCounter } from '../components/RequestFields';
import { ApiError, api } from '../lib/api';
import { clearToken, getTokens, saveToken } from '../lib/caseTokens';
import { timeAgo } from '../lib/format';
import { NEED_ICON, NEED_LABEL, STATUS_COLOR, STATUS_LABEL } from '../lib/labels';
import { useCase } from '../lib/useCase';

const btn = 'min-h-12 w-full rounded-xl px-4 text-sm font-bold disabled:opacity-60';

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const { data, setData, state } = useCase(id);
  const [tokens, setTokens] = useState(() => getTokens(id));
  const [phone, setPhone] = useState<string | null | undefined>(undefined);
  const [claimName, setClaimName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [flagged, setFlagged] = useState(false);

  // An owner link (?t=...) stores the token on this device and is then removed from the address bar
  useEffect(() => {
    const t = new URLSearchParams(search).get('t');
    if (!t) return;
    saveToken(id, 'owner', t);
    setTokens(getTokens(id));
    window.history.replaceState(null, '', `/r/${id}`);
  }, [id, search]);

  if (state === 'loading') return <p className="text-slate-400">กำลังโหลด...</p>;
  if (state === 'notfound' || (state === 'ready' && !data))
    return (
      <div className="space-y-3">
        <p className="text-slate-300">ไม่พบเคสนี้ อาจถูกซ่อนเพราะถูกแจ้งว่าเป็นเคสปลอม</p>
        <Link href="/" className="text-cyan-400 underline">กลับหน้าหลัก</Link>
      </div>
    );
  if (state === 'error' || !data) return <p className="text-red-300">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</p>;

  const c = data;
  const run = async (action: () => Promise<PublicCase | void>, done?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const updated = await action();
      if (updated) setData(updated);
      if (done) setMessage(done);
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  };

  const claim = () =>
    run(async () => {
      const { claimToken } = await api.claim(c.id, claimName);
      saveToken(c.id, 'claim', claimToken);
      setTokens(getTokens(c.id));
      return api.get(c.id);
    }, 'รับเคสแล้ว เมื่อช่วยเสร็จอย่าลืมกด "ช่วยเสร็จแล้ว"');

  const release = () =>
    run(async () => {
      const updated = await api.release(c.id, tokens.claim!);
      clearToken(c.id, 'claim');
      setTokens(getTokens(c.id));
      return updated;
    });

  const resolve = (token: string) => run(() => api.resolve(c.id, token), 'ปิดเคสแล้ว ขอบคุณที่ช่วยกัน');

  const flag = () => {
    if (!window.confirm('แจ้งว่าเคสนี้เป็นเคสปลอมหรือก่อกวน?')) return;
    run(async () => {
      await api.flag(c.id);
      setFlagged(true);
    }, 'ขอบคุณที่แจ้ง');
  };

  const isClaimer = !!tokens.claim && c.status === 'claimed';
  const isOwner = !!tokens.owner;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/" className="text-sm text-cyan-400">← กลับหน้าหลัก</Link>

      <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold text-white">
            {c.needs.map((n) => `${NEED_ICON[n]} ${NEED_LABEL[n]}`).join(' · ')}
          </h1>
          <span
            className="shrink-0 rounded px-2 py-1 text-xs font-bold"
            style={{ color: STATUS_COLOR[c.status], background: `${STATUS_COLOR[c.status]}22` }}
          >
            {STATUS_LABEL[c.status]}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span>👥 {c.peopleCount} คน</span>
          <VulnerableBadges c={c} />
        </div>
        {c.contactName && <p className="text-sm text-slate-300">ผู้แจ้ง: {c.contactName}</p>}
        {c.locationText && <p className="text-sm text-slate-300">📍 {c.locationText}</p>}
        {c.details && <p className="whitespace-pre-wrap text-sm text-slate-200">{c.details}</p>}
        <p className="text-xs text-slate-500">
          แจ้งเมื่อ {timeAgo(c.createdAt)} · อัปเดต {timeAgo(c.updatedAt)}
          {c.status === 'claimed' && c.claimedBy && ` · ${c.claimedBy} กำลังไป (${timeAgo(c.claimedAt!)})`}
        </p>
      </div>

      <BaseMap className="h-64" focus={{ lat: c.lat, lng: c.lng, zoom: 15 }}>
        <CircleMarker
          center={[c.lat, c.lng]}
          radius={11}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: STATUS_COLOR[c.status], fillOpacity: 1 }}
        />
      </BaseMap>

      <div className="grid grid-cols-2 gap-2">
        {phone ? (
          <a href={`tel:${phone}`} className={`${btn} flex items-center justify-center bg-emerald-600 text-white`}>
            📞 {phone}
          </a>
        ) : (
          <button
            type="button"
            disabled={busy || phone === null}
            className={`${btn} bg-emerald-600 text-white`}
            onClick={() => run(async () => setPhone((await api.revealPhone(c.id)).phone))}
          >
            {phone === null ? 'ไม่มีเบอร์แล้ว' : '📞 แสดงเบอร์'}
          </button>
        )}
        <a href={mapsUrl} target="_blank" rel="noreferrer" className={`${btn} flex items-center justify-center bg-slate-700 text-white`}>
          🧭 นำทาง
        </a>
      </div>

      {c.status === 'open' && (
        <div className="space-y-2 rounded-2xl border border-cyan-800/60 bg-cyan-950/30 p-4">
          <p className="text-sm font-semibold text-cyan-200">จะไปช่วยเคสนี้?</p>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white"
            placeholder="ชื่อคุณหรือชื่อทีม"
            value={claimName}
            onChange={(e) => setClaimName(e.target.value)}
            maxLength={100}
          />
          <button type="button" disabled={busy || !claimName.trim()} onClick={claim} className={`${btn} bg-cyan-600 text-white`}>
            🚤 ฉันกำลังไป
          </button>
        </div>
      )}

      {isClaimer && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => resolve(tokens.claim!)} className={`${btn} bg-emerald-600 text-white`}>
            ✅ ช่วยเสร็จแล้ว
          </button>
          <button type="button" disabled={busy} onClick={release} className={`${btn} bg-slate-700 text-white`}>
            ยกเลิก ไปไม่ได้
          </button>
        </div>
      )}

      {isOwner && c.status !== 'resolved' && (
        <div className="space-y-2 rounded-2xl border border-amber-700/60 bg-amber-950/30 p-4">
          <p className="text-sm font-semibold text-amber-200">🔑 คุณเป็นผู้แจ้งเคสนี้</p>
          <button type="button" disabled={busy} onClick={() => resolve(tokens.owner!)} className={`${btn} bg-emerald-600 text-white`}>
            ✅ ได้รับความช่วยเหลือแล้ว ปิดเคส
          </button>
          <button type="button" onClick={() => setEditing((v) => !v)} className={`${btn} bg-slate-700 text-white`}>
            ✏️ แก้ไขข้อมูล
          </button>
          {editing && (
            <EditForm
              c={c}
              busy={busy}
              onSave={(patch) =>
                run(async () => {
                  const updated = await api.update(c.id, patch, tokens.owner!);
                  setEditing(false);
                  return updated;
                }, 'บันทึกแล้ว')
              }
            />
          )}
        </div>
      )}

      {message && (
        <p role="status" className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">
          {message}
        </p>
      )}

      {!flagged && (
        <button type="button" onClick={flag} className="w-full py-3 text-xs text-slate-500 underline">
          แจ้งว่าเป็นเคสปลอม / ก่อกวน
        </button>
      )}
    </div>
  );
}

function EditForm({
  c,
  busy,
  onSave,
}: {
  c: PublicCase;
  busy: boolean;
  onSave: (patch: Pick<PublicCase, 'needs' | 'peopleCount' | 'details'>) => void;
}) {
  const [needs, setNeeds] = useState(c.needs);
  const [peopleCount, setPeopleCount] = useState(c.peopleCount);
  const [details, setDetails] = useState(c.details);
  return (
    <div className="space-y-3 pt-2">
      <NeedToggles value={needs} onChange={setNeeds} />
      <PeopleCounter value={peopleCount} onChange={setPeopleCount} />
      <textarea
        className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={1000}
      />
      <button
        type="button"
        disabled={busy || needs.length === 0}
        onClick={() => onSave({ needs, peopleCount, details })}
        className={`${btn} bg-cyan-600 text-white`}
      >
        บันทึก
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add the route** — in `src/App.tsx` add `import CaseDetail from './pages/CaseDetail';` and, before the catch-all `<Route>`, add:

```tsx
        <Route path="/r/:id" component={CaseDetail} />
```

- [ ] **Step 3: Typecheck and test**

Run: `npm run lint && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 4: Check the full flow in two browser tabs**

With both dev servers running:
1. Tab A: create a request at `/new`, open "ดูเคสของฉัน". The owner box appears; the URL has no `?t=`.
2. Tab B (private window, so no stored tokens): open `/` → the new pin and card are already there without reloading.
3. Tab B: open the case, "แสดงเบอร์" → phone shown as a `tel:` link; enter a name, "ฉันกำลังไป" → status "มีคนกำลังไป". Tab A updates live.
4. Tab B: "ยกเลิก ไปไม่ได้" → back to "รอความช่วยเหลือ" in both tabs.
5. Tab A: edit details, save → Tab B shows the new text live. Then "ได้รับความช่วยเหลือแล้ว ปิดเคส" → green status in both tabs.
6. Mobile check: emulate 375×812; no horizontal scroll on `/`, `/new`, `/r/:id`; the SOS button is visible without scrolling.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: add case page with claim, resolve and owner editing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Production build, cleanup and deployment docs

**Files:**
- Modify: `src/index.css` (keep only Tailwind import + Leaflet label styles), `metadata.json`
- Create: `README.md`

- [ ] **Step 1: Confirm `src/index.css` contains only**

```css
@import "tailwindcss";

/* Leaflet map labels */
.leaflet-tooltip.fw-map-label {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(51, 65, 85, 0.8);
  border-radius: 4px;
  color: #f1f5f9;
  font-family: 'Prompt', sans-serif;
  font-size: 11px;
  padding: 1px 5px;
  box-shadow: none;
}
.leaflet-tooltip.fw-map-label::before {
  display: none;
}
```
(Delete the `.fw-map-label-mono` rule; nothing uses it now.)

- [ ] **Step 2: Update `metadata.json`** — remove the Gemini capability:

```json
{
  "name": "FloodWatch - ศูนย์กลางขอความช่วยเหลือน้ำท่วม",
  "description": "แจ้งขอความช่วยเหลือน้ำท่วมและดูคำขอบนแผนที่ อาสาในพื้นที่รับเคสและไปช่วยได้ทันที",
  "requestFramePermissions": ["geolocation"],
  "majorCapabilities": []
}
```

- [ ] **Step 3: Create** `README.md`

````markdown
# FloodWatch

ศูนย์กลางขอความช่วยเหลือน้ำท่วม — คนเดือดร้อนปักหมุดขอความช่วยเหลือ อาสาเห็นบนแผนที่ รับเคส และปิดเคสเมื่อช่วยเสร็จ ไม่ต้องสมัครสมาชิก

## Development

```bash
npm install
npm run dev:server   # API + SSE on http://localhost:8080
npm run dev          # Vite on http://localhost:3000 (proxies /api)
npm test
npm run lint
```

## Production (VPS)

```bash
npm ci
npm run build
PORT=8080 DB_PATH=/var/lib/floodwatch/floodwatch.db IP_SALT=<random-string> TRUST_PROXY=1 npm start
```

| Env | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port |
| `DB_PATH` | `./data/floodwatch.db` | SQLite file (directory is created) |
| `IP_SALT` | random per start | Salt for hashing IPs of fake-case flags; set it so flags survive restarts |
| `TRUST_PROXY` | unset | Set to `1` behind nginx so rate limits see real client IPs |

nginx must not buffer the event stream:

```nginx
location /api/stream {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_read_timeout 1h;
}
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Backup: copy the SQLite file with `sqlite3 "$DB_PATH" ".backup backup.db"` (safe while running).

Moderation (no admin UI yet):

```bash
sqlite3 "$DB_PATH" "UPDATE help_requests SET hidden = 1 WHERE id = '<id>';"
```
````

- [ ] **Step 4: Full verification**

```bash
npm run lint
npm test
npm run build
PORT=8090 DB_PATH=./data/smoke.db npm start
```
In another terminal: `curl -s localhost:8090/ | grep -o "<title>.*</title>"` → the new title; `curl -s localhost:8090/r/abc | grep -c "<div id=\"root\">"` → `1` (SPA fallback). Stop the server and delete `data/smoke.db*`.

- [ ] **Step 5: Commit**

```bash
git add src/index.css metadata.json README.md
git commit -m "docs: add run and VPS deployment guide

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Spec coverage

| Spec item | Task |
|---|---|
| No-login requester/volunteer flows, owner + claim links | 4, 5, 8, 12, 13 |
| Lifecycle open → claimed → resolved, 409 on bad transitions | 5, 8 |
| Stale claims after 3h (`claimed_at`) | 6, 9 |
| Phone hidden in lists, reveal endpoint, rate limits 5/30/20 per hour | 8 |
| Flags one per IP, hide at 3, `request.removed` | 6, 8, 10 |
| SQLite schema, SHA-256 token hashes | 4 |
| Thailand bbox, needs/phone/length validation, Thai field errors | 2, 8 |
| SSE created/updated/removed, client reconnect + offline banner | 7, 8, 10, 11 |
| PDPA phone retention 30 days | 6, 9 |
| Resolved visible 24h | 4 |
| Home: SOS, map, list, urgency sort, filters, hotlines | 10, 11 |
| Form: GPS or pin, toggles, draft on failure | 12 |
| Case page: reveal phone, navigate, claim/release/resolve, owner edit, flag | 13 |
| Remove dashboard + mock data | 10, 11 |
| Single-port prod server, `DB_PATH`, VPS docs | 9, 14 |
| Tests: server API, repo jobs, urgency | 2–8, 10 |
