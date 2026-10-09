# FloodWatch Help Hub — Design

Date: 2026-10-09
Status: Approved in brainstorming, pending spec review

## 1. Goal

Turn FloodWatch from a mock-data dashboard into a **central place that connects people
who need help during floods with volunteers who can help**. Today, help requests are
scattered across Facebook posts and LINE groups; they get lost, duplicated, and nobody
knows whether someone is already on the way.

Official water-level data already exists at ThaiWater (สสน.), so we do not rebuild a
monitoring dashboard.

### Decisions made

| Topic | Decision |
|---|---|
| Core purpose | Help requests ↔ volunteers (case matching) |
| Accounts | **None.** Fully open — no login for requesters or volunteers |
| Storage | SQLite |
| Hosting | Own VPS (persistent disk) |
| Request types | Evacuate/boat, food/water, medical, animals (multi-select) |
| Existing dashboard | **Remove entirely** (stations, dams, alerts, shelters, mock data) |
| Architecture | Single Express server: serves built frontend + REST API + SSE |

### Kept from current code

- Leaflet map with satellite / terrain / street basemaps (`GisFloodMap` basemap logic)
- RainViewer rain-radar overlay
- Real hotlines: 1784 (ปภ.), 1669 (การแพทย์ฉุกเฉิน), 1460 (กรมชลประทาน)

### Out of scope (v1)

Photo upload, LINE/SMS notifications, admin UI (use SQL on the server), i18n,
ThaiWater integration.

## 2. Users and flows

### Requester (no login)

1. Taps the large red **"🆘 ขอความช่วยเหลือ"** button.
2. Fills a single-page form:
   - Location: "use my current location" (GPS) or drop a pin on the map. Required.
   - Needs: one or more of `evacuate`, `food`, `medical`, `animals`. At least one required.
   - People count; vulnerable flags: elderly, children, bedridden.
   - Phone (required), contact name, location text (e.g. "ซอย 5 หลังวัด"), details.
3. On submit, receives a **secret owner link** (`/r/:id?t=<ownerToken>`), shown with
   Copy and Share buttons and also saved in `localStorage`.
4. With the owner link they can edit details or mark the case resolved.

### Volunteer (no login)

1. Sees map + case list, filterable by need type, status, and "near me".
2. Opens a case, taps **"แสดงเบอร์"** to reveal the phone, taps navigate (Google Maps link).
3. Taps **"ฉันกำลังไป"**, enters a name or team name → case becomes `claimed`.
   Receives a **secret claim link** (also saved in `localStorage`).
4. With the claim link: **"ช่วยเสร็จแล้ว"** (resolve) or **"ยกเลิก"** (release).

### Case lifecycle

```
open ──claim──▶ claimed ──resolve──▶ resolved
  ▲                │
  └──release / stale (>3h without update)──┘
open ──resolve (owner)──▶ resolved
```

- Only one active claim at a time. Claiming a `claimed` case returns 409.
- `resolve` accepts the owner token or the current claim token.
- `release` requires the claim token.
- Stale claims: `claimed` with `claimed_at` older than 3 hours → back to `open`,
  claim fields cleared.

### Abuse controls (no login)

- Phone is never in list responses; revealed only via a rate-limited endpoint.
- Secret tokens: 32 random bytes (base64url). Only SHA-256 hashes are stored.
- Fake-case flag: one flag per IP per case; at **3 flags** the case is hidden.
- Per-IP rate limits: create 5/hour, phone reveal 30/hour, flag 20/hour.

## 3. Data model (SQLite via `better-sqlite3`)

### `help_requests`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | 8-char random base32 id, used in URLs |
| `lat`, `lng` | REAL | Must be inside Thailand bbox (lat 5.5–20.6, lng 97.3–105.7) |
| `location_text` | TEXT | ≤ 200 chars |
| `needs` | TEXT | JSON array, subset of `evacuate,food,medical,animals`, non-empty |
| `people_count` | INTEGER | 1–500 |
| `has_elderly`, `has_children`, `has_bedridden` | INTEGER | 0/1 |
| `contact_name` | TEXT | ≤ 100 chars, optional |
| `phone` | TEXT | Thai phone, 9–10 digits after stripping `-`/spaces; nulled by retention job |
| `details` | TEXT | ≤ 1000 chars, optional |
| `status` | TEXT | `open` / `claimed` / `resolved` |
| `claimed_by` | TEXT | ≤ 100 chars, null unless claimed |
| `claimed_at` | TEXT | ISO timestamp |
| `owner_token_hash` | TEXT | SHA-256 hex |
| `claim_token_hash` | TEXT | SHA-256 hex, null unless claimed |
| `hidden` | INTEGER | 0/1, set when flags reach 3 |
| `created_at`, `updated_at`, `resolved_at` | TEXT | ISO timestamps |

### `flags`

`request_id` TEXT, `ip_hash` TEXT, `created_at` TEXT; `PRIMARY KEY (request_id, ip_hash)`.
`ip_hash` = SHA-256 of IP + server secret salt.

## 4. API

All JSON. Tokens are sent in the `X-Token` header.

| Method | Path | Auth | Result |
|---|---|---|---|
| GET | `/api/requests?status=open,claimed` | — | Public list, **no phone**, excludes `hidden`; resolved only if resolved < 24h ago |
| GET | `/api/requests/:id` | — | Public case (no phone); 404 if hidden |
| POST | `/api/requests` | — | Create → `{ id, ownerToken }` |
| PATCH | `/api/requests/:id` | owner | Edit location_text, needs, people/vulnerable flags, details, phone |
| POST | `/api/requests/:id/phone` | — | `{ phone }`, rate-limited |
| POST | `/api/requests/:id/claim` | — | Body `{ name }` → `{ claimToken }`; 409 if not `open` |
| POST | `/api/requests/:id/release` | claim | → `open` |
| POST | `/api/requests/:id/resolve` | owner or claim | → `resolved` |
| POST | `/api/requests/:id/flag` | — | Idempotent per IP |
| GET | `/api/stream` | — | SSE; events `request.created`, `request.updated` (public case) and `request.removed` (`{ id }`, when hidden by flags) |

Errors: `400` validation (field messages in Thai), `403` bad/missing token,
`404` unknown/hidden, `409` invalid state transition, `429` rate limited.
Validation with `zod`, shared types between server and client.

## 5. Background jobs (every 5 minutes)

1. Release stale claims (> 3h since `claimed_at`), emit `request.updated`.
2. Retention (PDPA): set `phone = NULL` for cases resolved more than 30 days ago.

## 6. Frontend (mobile-first)

### `/` Home
- Top: red **🆘 ขอความช่วยเหลือ** button, always visible without scrolling.
- Map: pin colour by status (red open, yellow claimed, green resolved), icon by primary need.
- Case list under the map on mobile, beside it on desktop. Sorted by urgency, then
  distance when GPS is allowed.
- Urgency order: `evacuate` with any vulnerable flag > `medical` > `evacuate` >
  others; ties broken by distance (when GPS is allowed), then oldest first. Within the
  list, `open` cases come before `claimed`, then `resolved`.
- Filters: need type, status, near me.
- Footer: hotlines 1784 / 1669 / 1460.

### `/new` Request form
Single page, large toggle buttons, minimal typing. On failure, form data is kept in
`localStorage` with a "ลองส่งอีกครั้ง" button.

### `/r/:id` Case page
Details, "แสดงเบอร์", navigate button (Google Maps), actions depending on held token,
"แจ้งเคสปลอม" at the bottom.

### Live updates and failure states
- `EventSource` on `/api/stream`; auto-reconnect; offline banner
  "ออฟไลน์ ข้อมูลอาจไม่อัปเดต".
- GPS denied → manual pin.
- Hotlines shown on every page.

## 7. Structure

```
server/
  index.ts        Express app: static dist/, /api, SSE, starts jobs
  db.ts           better-sqlite3 setup + migrations
  routes/requests.ts
  stream.ts       SSE client registry + broadcast
  jobs.ts         stale-claim release, retention
  rateLimit.ts
shared/
  schema.ts       zod schemas + TS types used by server and client
src/
  pages/Home.tsx, NewRequest.tsx, CaseDetail.tsx
  components/HelpMap.tsx (reuses basemap switcher + radar), CaseList.tsx, ...
  lib/api.ts, lib/urgency.ts, lib/tokens.ts (localStorage)
```

Removed: `src/data/mockFloodData.ts`, `src/types/flood.ts`, `src/utils/stationStatus.ts`,
and the dashboard components (stations table, station modal, dams, alerts panel,
shelters panel, ticker, notification settings, report modal, emergency guide modal).

Dev: Vite dev server proxies `/api` to Express. Prod: `npm run build` then
`node server` serves `dist/` and the API on one port. DB file path from `DB_PATH`
env (default `./data/floodwatch.db`).

## 8. Testing (Vitest)

Server, against an in-memory SQLite DB:
- create → claim → resolve happy path
- wrong / missing token → 403; claim on claimed → 409
- list and detail responses never contain `phone`
- flag is idempotent per IP; 3 distinct IPs hide the case
- stale-claim job reopens claims older than 3h
- validation: out-of-Thailand coordinates and empty `needs` rejected

Client: unit tests for `urgency.ts` ordering.

Manual: two browser tabs — creating/claiming in one appears live in the other.
