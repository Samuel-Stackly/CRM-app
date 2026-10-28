# Mini CRM — REST API Contract

**Status:** Authoritative
**Last updated:** 2026-10-12 · **Deadline:** 14 Oct 2026, EOD
**Base URL:** `${VITE_API_URL}` → `https://<render-host>/api` (production) ·
`http://localhost:5000/api` (development)

**Sources:** `docs/RAW_DOC.md` (assignment source of truth) · `docs/PRD.md` ·
`docs/ARCHITECTURE.md` · `docs/DESIGN_SPEC.md` · `CLAUDE.md`

> **Filename note.** The brief referenced `docs/RAW_DOCS.md`; the file on disk is
> `docs/RAW_DOC.md` (singular). That is the file used.
>
> **Scope.** This is a contract, not an implementation. No application code is written and
> no dependencies are installed. Where RAW_DOC does not settle a value (status enums,
> priority enums, timezone), it is marked **unresolved** and cross-referenced to §13 rather
> than guessed. Defaults shown in examples are labelled as such.

---

## 1. Conventions

### 1.1 General

| Aspect | Rule |
|---|---|
| Transport | HTTPS in production; HTTP only on localhost |
| Content type | `application/json` for all requests and responses with a body |
| Base path | `/api` |
| Resource naming | Plural nouns (`/customers`, `/deals`, `/tasks`) |
| Identifiers | MongoDB ObjectId, serialised as `id` (string), never `_id` |
| Timestamps | ISO 8601 UTC, e.g. `2026-10-12T09:30:00.000Z` |
| Partial updates | `PATCH`, not `PUT` — forms submit partial edits and the pipeline board sends `stage` alone |
| Unknown fields | **Rejected.** Every schema is Zod `.strict()`, so an unknown key returns `400` |

### 1.2 Authentication model

RAW_DOC: *"Keep the token in an httpOnly cookie, not localStorage."*

- A successful register or login sets a **`token` cookie**: `httpOnly`, `secure` in
  production, `sameSite=none` in production (`lax` locally), `path=/`.
- **The token is never present in any response body.** Returning it would defeat the
  httpOnly requirement.
- **Clients must never read, write, or store the token.** `localStorage` and
  `sessionStorage` are not used anywhere.
- Every request from the browser must send `credentials: 'include'`. The `fetch` default is
  `same-origin`, which silently omits the cookie cross-origin and produces a confusing `401`.

```js
// client/src/services/http.ts — the only place this is configured
fetch(`${import.meta.env.VITE_API_URL}${path}`, {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  ...init,
})
```

There is **no `Authorization` header scheme.** The cookie is the sole credential.

### 1.3 Authentication requirement per endpoint

| Marker | Meaning |
|---|---|
| **Public** | No cookie required |
| **Cookie** | Valid `token` cookie required; otherwise `401` |

Every endpoint under `/api/customers`, `/api/deals`, `/api/tasks` and `/api/dashboard` is
**Cookie**. Only `/api/health` and the three auth entry points are **Public**.

### 1.4 Ownership rules — applies to every protected resource

RAW_DOC Must-haves: *"Every query is filtered by the logged-in user… Return 404 for another
user's records."*

1. Every query on Customer, Deal and Task includes `owner: <authenticated user id>` —
   reads, lists, updates, deletes and aggregations alike.
2. A record belonging to another user returns **`404 Not Found`**, never `403`, and the body
   is **byte-identical** to a genuinely-missing record. The API must not reveal that another
   user's record exists.
3. A **malformed ObjectId also returns `404`**, not `400` — see §2.4. This keeps
   "not yours", "not real" and "not well-formed" indistinguishable.
4. `owner` is **never accepted in a request body**. It is derived from the cookie. Sending it
   returns `400` (strict schemas).
5. `owner` is **never returned in a response body**. It carries no client value.

These rules are not repeated in each endpoint section below; they apply universally.

### 1.5 Status codes used

| Code | Used when |
|---|---|
| `200 OK` | Successful read or update |
| `201 Created` | Resource created |
| `204 No Content` | Successful delete; no body |
| `400 Bad Request` | Validation failure — **never `500`** (RAW_DOC) |
| `401 Unauthorized` | Missing, invalid or expired cookie; bad login credentials |
| `403 Forbidden` | Origin not on the CORS allowlist — **never `500`** (RAW_DOC) |
| `404 Not Found` | No such route; record absent **or owned by another user**; malformed id |
| `409 Conflict` | Duplicate email on register |
| `429 Too Many Requests` | Auth rate limit exceeded |
| `500 Internal Server Error` | Unexpected fault only — never for validation, auth or CORS |

`403` is reserved exclusively for CORS rejection. Resource-level denial is always `404`.

---

## 2. Response Formats

### 2.1 Success — single resource
Returned bare, not wrapped:

```json
{ "id": "6711a2…", "name": "Deanna Annis", "createdAt": "2026-10-01T10:00:00.000Z" }
```

### 2.2 Success — collection
Always wrapped, always with pagination metadata:

```json
{
  "data": [ { "id": "…" } ],
  "pagination": { "page": 1, "limit": 20, "total": 78, "totalPages": 4,
                  "hasNextPage": true, "hasPrevPage": false }
}
```

`hasNextPage` / `hasPrevPage` are derived server-side so the client never recomputes them.

### 2.3 Error — one shape everywhere

```json
{ "error": { "message": "Validation failed",
             "details": [ { "path": "email", "message": "Invalid email address" } ] } }
```

| Field | Presence | Purpose |
|---|---|---|
| `error.message` | Always | Human-readable; rendered in a toast |
| `error.details` | Validation errors only | Field-level messages for inline form errors (PRD X-4) |

`details[].path` uses dot notation for nested paths (`address.city`). Stack traces are never
returned in production, and logs never contain passwords, tokens or emails (RAW_DOC S-10).

### 2.4 Invalid ObjectId → 404

A malformed id raises a Mongoose `CastError`, mapped centrally to `404`:

```http
GET /api/customers/not-an-id   →   404
{ "error": { "message": "Customer not found" } }
```

Mapping it to `400` would leak the distinction between "well-formed but not yours" and
"malformed". See ARCHITECTURE §5.4.

---

## 3. Validation Rules

Every request body, query string and path parameter is validated with **Zod** before
reaching a controller (RAW_DOC: *"Validate every request body… Bad input returns 400 with a
clear message, never a 500"*).

### 3.1 Global rules

| Rule | Effect |
|---|---|
| `.strict()` on every object schema | Unknown keys → `400`. Blocks writing `owner`, `id`, `overdue` |
| Strings trimmed | Leading/trailing whitespace removed before validation |
| Emails lowercased | Normalised on write and lookup |
| Query numbers coerced | `?page=2` (string) → `2` (number) |
| `limit` bounded | Max `100`, so a client cannot request the whole collection |
| Dates | ISO 8601 strings, coerced to `Date`; invalid → `400` |
| Empty `PATCH` body | `400` — at least one field required |

### 3.2 Field rules

| Field | Rule |
|---|---|
| `name` (user, customer) | 1–120 chars, required on create |
| `email` | Valid email, ≤ 254 chars |
| `password` | **Minimum length unresolved — see Q2.** Working default: ≥ 8 chars |
| `phone` | ≤ 40 chars, optional, free-form (no format enforced — Q7) |
| `company` | ≤ 120 chars, optional |
| `notes` | ≤ 5000 chars, optional |
| `status` (customer) | Enum — **values unresolved, see Q1** |
| `title` (deal, task) | 1–200 chars, required on create |
| `value` (deal) | Number ≥ 0, required on create |
| `stage` (deal) | Enum: `Lead` · `Qualified` · `Proposal` · `Won` · `Lost` (fixed by RAW_DOC) |
| `expectedCloseDate` | ISO date, optional |
| `customer` (deal) | Valid ObjectId, **required** (ARCHITECTURE D8) — must belong to the caller |
| `dueDate` (task) | ISO date-time, required on create |
| `priority` (task) | Enum — **values unresolved, see Q3** |
| `done` (task) | Boolean, default `false` |
| `overdue` | **Never accepted.** Derived (§7.5); sending it → `400` |

### 3.3 Referential validation
When a `customer` or `deal` id is supplied, the server verifies that record exists **and is
owned by the caller**. A reference to another user's record returns `400` with
`"Customer not found"` in `details` — not `404`, because the *request* is invalid rather than
the target resource being the subject of the request.

---

## 4. Endpoint Index

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 1 | GET | `/api/health` | Public | Liveness probe |
| 2 | POST | `/api/auth/register` | Public | Create account |
| 3 | POST | `/api/auth/login` | Public | Authenticate |
| 4 | POST | `/api/auth/logout` | Public | Clear cookie |
| 5 | GET | `/api/auth/me` | Cookie | Restore session |
| 6 | GET | `/api/customers` | Cookie | List: search, status, pagination |
| 7 | POST | `/api/customers` | Cookie | Create |
| 8 | GET | `/api/customers/:id` | Cookie | Detail **with nested deals + tasks** |
| 9 | PATCH | `/api/customers/:id` | Cookie | Update |
| 10 | DELETE | `/api/customers/:id` | Cookie | Delete |
| 11 | GET | `/api/deals` | Cookie | List: stage, customer, pagination |
| 12 | POST | `/api/deals` | Cookie | Create |
| 13 | GET | `/api/deals/:id` | Cookie | Detail |
| 14 | PATCH | `/api/deals/:id` | Cookie | Update — **carries stage changes** |
| 15 | DELETE | `/api/deals/:id` | Cookie | Delete |
| 16 | GET | `/api/deals/stages` | Cookie | The five stage values |
| 17 | GET | `/api/tasks` | Cookie | List: done, priority, overdue, pagination |
| 18 | POST | `/api/tasks` | Cookie | Create |
| 19 | GET | `/api/tasks/:id` | Cookie | Detail |
| 20 | PATCH | `/api/tasks/:id` | Cookie | Update |
| 21 | DELETE | `/api/tasks/:id` | Cookie | Delete |
| 22 | GET | `/api/dashboard` | Cookie | All metrics + pipeline summary |

Route ordering note: `/api/deals/stages` must be declared **before** `/api/deals/:id`, or
Express matches `stages` as an id.

---

## 5. Authentication

All four auth endpoints are behind a rate limiter (RAW_DOC: *"Rate limiting on login,
register and password-reset routes"*). Suggested budget: **10 requests per 15 minutes per
IP**; exceeding it returns `429`.

### 5.1 `POST /api/auth/register` — Public

**Request**
```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "correct-horse-battery" }
```

**`201 Created`** — sets the `token` cookie
```json
{ "user": { "id": "6711a2b3c4d5e6f701234567",
            "name": "Ada Lovelace",
            "email": "ada@example.com",
            "createdAt": "2026-10-12T09:30:00.000Z" } }
```

```http
Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800
```

**Errors**

| Code | Cause |
|---|---|
| `400` | Validation failure (missing field, invalid email, short password) |
| `409` | Email already registered |
| `429` | Rate limit exceeded |

The password hash is **never** returned — the field is `select: false` on the model.

### 5.2 `POST /api/auth/login` — Public

**Request**
```json
{ "email": "ada@example.com", "password": "correct-horse-battery" }
```

**`200 OK`** — sets the `token` cookie; body identical in shape to register.

**Errors**

| Code | Cause |
|---|---|
| `400` | Malformed body |
| `401` | Invalid credentials |
| `429` | Rate limit exceeded |

**`401` returns one generic message — `"Invalid email or password"` — for both unknown-email
and wrong-password.** Distinguishing them would turn the endpoint into an account-enumeration
oracle.

### 5.3 `POST /api/auth/logout` — Public

No request body. **`204 No Content`**, and the cookie is cleared:

```http
Set-Cookie: token=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0
```

The clear must use **the same attributes** (`sameSite`, `secure`, `path`, `domain`) used to
set it, or the browser silently keeps the cookie. Logout is idempotent — calling it without a
session still returns `204`.

### 5.4 `GET /api/auth/me` — Cookie

RAW_DOC: *"Add a `GET /api/auth/me` endpoint and call it when the app loads to restore the
session. Any 401 must send the user back to the login page."*

**`200 OK`**
```json
{ "user": { "id": "6711a2b3c4d5e6f701234567",
            "name": "Ada Lovelace",
            "email": "ada@example.com",
            "createdAt": "2026-10-12T09:30:00.000Z" } }
```

**`401 Unauthorized`** — no cookie, invalid signature, expired token, or the user no longer
exists:
```json
{ "error": { "message": "Unauthorized" } }
```

This endpoint is the session-restoration mechanism. The client calls it once on load and
holds three states — `restoring`, `authenticated`, `unauthenticated` — redirecting to
`/login` only in the third (ARCHITECTURE §2.3).

### 5.5 Password reset
RAW_DOC requires rate-limiting a password-reset route but **never lists reset as a feature**.
No reset endpoints are defined here. The limiter covers the path prefix if one is added
later. See Q4.

---

## 6. Customers

**Model fields** (RAW_DOC): `name`, `company`, `email`, `phone`, `status`, `notes`.

> The Figma design shows firstName/lastName and a postal address block. PRD §2 (C1) resolves
> this in favour of RAW_DOC's field list; the design supplies layout, not schema.

### 6.1 `GET /api/customers` — Cookie

Server-side search, status filter and pagination (RAW_DOC: *"Search, filter by status, and
paginate on the server"*).

**Query parameters**

| Param | Type | Default | Rules |
|---|---|---|---|
| `search` | string | — | ≤ 100 chars; matches `name`, `company`, `email` (Q5) |
| `status` | enum | — | Must be a valid status value (Q1) |
| `page` | integer | `1` | ≥ 1 |
| `limit` | integer | `20` | 1–100 |
| `sort` | enum | `-createdAt` | `createdAt`, `-createdAt`, `name`, `-name` |

Unknown query parameters are rejected with `400`.

**Example**
```http
GET /api/customers?search=annis&status=active&page=2&limit=20&sort=name
```

**`200 OK`**
```json
{
  "data": [
    { "id": "6711a2b3c4d5e6f701234567",
      "name": "Deanna Annis",
      "company": "Northwind Ltd",
      "email": "deannannis@gmail.com",
      "phone": "999-999-9999",
      "status": "active",
      "notes": "Prefers email contact.",
      "createdAt": "2026-10-01T10:00:00.000Z",
      "updatedAt": "2026-10-07T14:22:00.000Z" }
  ],
  "pagination": { "page": 2, "limit": 20, "total": 78, "totalPages": 4,
                  "hasNextPage": true, "hasPrevPage": true }
}
```

**Contract guarantees**
- `search`, `status` and `page` **compose** — the correct page of the correctly filtered set.
- `total` counts the **filtered** set, not the collection, so it agrees with `data`.
- A page beyond `totalPages` returns `200` with an empty `data` array — not `404`. Empty is a
  valid result, and the client renders the designed empty state (DESIGN_SPEC §6.1).
- These parameters mirror the URL query string one-to-one, which is what satisfies RAW_DOC's
  *"reflected in the URL… so a refresh keeps them"*.

### 6.2 `POST /api/customers` — Cookie

**Request**
```json
{ "name": "Deanna Annis", "company": "Northwind Ltd",
  "email": "deannannis@gmail.com", "phone": "999-999-9999",
  "status": "active", "notes": "Prefers email contact." }
```
Only `name` is required; `status` defaults (Q1).

**`201 Created`** — the created customer (shape as above).
**Errors:** `400` validation · `401` no session.

### 6.3 `GET /api/customers/:id` — Cookie

Returns the customer **with its nested deals and tasks** (RAW_DOC: *"The customer detail page
shows that customer's deals and tasks (the design's 'nested data')"*).

**`200 OK`**
```json
{
  "customer": { "id": "6711a2b3c4d5e6f701234567", "name": "Deanna Annis",
                "company": "Northwind Ltd", "email": "deannannis@gmail.com",
                "phone": "999-999-9999", "status": "active",
                "notes": "Prefers email contact.",
                "createdAt": "2026-10-01T10:00:00.000Z",
                "updatedAt": "2026-10-07T14:22:00.000Z" },
  "deals": [
    { "id": "6711b0…", "title": "Office fit-out", "value": 6000,
      "stage": "Proposal", "expectedCloseDate": "2026-11-14T00:00:00.000Z",
      "createdAt": "2026-10-02T09:00:00.000Z" }
  ],
  "tasks": [
    { "id": "6711c0…", "title": "Send revised quote",
      "dueDate": "2026-10-10T17:00:00.000Z", "priority": "high",
      "done": false, "overdue": true }
  ]
}
```

**Security contract.** The nested collections are fetched in a two-step sequence
(ARCHITECTURE §5.3): the customer's ownership is proven first and returns `404` on failure,
*then* deals and tasks are queried filtered by **both** `owner` and `customer`. `populate()`
is deliberately not used, because it does not re-apply the owner filter.

Nested arrays are **not paginated** — a single customer's deals and tasks are bounded in
practice. Should that change, pagination would move to `/api/deals?customer=:id`.

**Errors:** `401` · `404` (absent, another user's, or malformed id).

### 6.4 `PATCH /api/customers/:id` — Cookie

**Request** — any subset of the writable fields:
```json
{ "status": "inactive", "notes": "Moved to a competitor." }
```

**`200 OK`** — the updated customer.
**Errors:** `400` (validation, or empty body) · `401` · `404`.

### 6.5 `DELETE /api/customers/:id` — Cookie

**`204 No Content`** — no body.
**Errors:** `401` · `404`.

**Cascade behaviour is unresolved (Q6).** The working default is to delete the customer's
deals and tasks in the same operation, with the client's confirmation dialog stating what
will be removed. The alternative — `409` when dependants exist — is listed in §13.

---

## 7. Deals

**Model fields** (RAW_DOC): `title`, `value`, `stage`, `expectedCloseDate`, linked `customer`.

### 7.1 Pipeline stages

Exactly five, fixed by RAW_DOC, in board order:

```
Lead  →  Qualified  →  Proposal  →  Won
                                 ↘  Lost
```

| Value | Open? | Counts toward "open pipeline value" |
|---|---|---|
| `Lead` | yes | ✅ |
| `Qualified` | yes | ✅ |
| `Proposal` | yes | ✅ |
| `Won` | no | ❌ |
| `Lost` | no | ❌ |

Stage transitions are **unconstrained** — any stage may move to any other. RAW_DOC specifies
no workflow rules, and the design's board implies free drag-and-drop. See Q8.

### 7.2 `GET /api/deals/stages` — Cookie

A static list so the client never hardcodes stage strings:

```json
{ "stages": [
  { "value": "Lead",      "label": "Lead",      "open": true  },
  { "value": "Qualified", "label": "Qualified", "open": true  },
  { "value": "Proposal",  "label": "Proposal",  "open": true  },
  { "value": "Won",       "label": "Won",       "open": false },
  { "value": "Lost",      "label": "Lost",      "open": false }
] }
```

### 7.3 `GET /api/deals` — Cookie

**Query parameters**

| Param | Type | Default | Rules |
|---|---|---|---|
| `stage` | enum | — | One of the five |
| `customer` | ObjectId | — | Must be owned by the caller |
| `search` | string | — | Matches `title` |
| `page` | integer | `1` | ≥ 1 |
| `limit` | integer | `20` | 1–100 |
| `sort` | enum | `-createdAt` | `createdAt`, `-createdAt`, `value`, `-value`, `expectedCloseDate` |
| `groupBy` | `stage` | — | **Board mode** — see below |

**List mode `200 OK`**
```json
{
  "data": [
    { "id": "6711b0c1d2e3f40512345678",
      "title": "Office fit-out",
      "value": 6000,
      "stage": "Proposal",
      "expectedCloseDate": "2026-11-14T00:00:00.000Z",
      "customer": { "id": "6711a2…", "name": "Deanna Annis", "company": "Northwind Ltd" },
      "createdAt": "2026-10-02T09:00:00.000Z",
      "updatedAt": "2026-10-09T11:05:00.000Z" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 136, "totalPages": 7,
                  "hasNextPage": true, "hasPrevPage": false }
}
```

The embedded `customer` object is a **projection of three fields**, not a full populate — the
board and list need a name to render, not the whole record.

**Board mode** — `GET /api/deals?groupBy=stage` returns all five stages, each with its deals
and a column subtotal. This serves RAW_DOC's *"Pipeline board view grouped by stage"* in one
round trip:

```json
{
  "stages": [
    { "stage": "Lead", "count": 12, "totalValue": 48000,
      "deals": [ { "id": "…", "title": "…", "value": 4000,
                   "customer": { "id": "…", "name": "…" } } ] },
    { "stage": "Qualified", "count": 7,  "totalValue": 31500, "deals": [] },
    { "stage": "Proposal",  "count": 4,  "totalValue": 24000, "deals": [] },
    { "stage": "Won",       "count": 21, "totalValue": 98000, "deals": [] },
    { "stage": "Lost",      "count": 9,  "totalValue": 17000, "deals": [] }
  ]
}
```

**All five stages are always present, including empty ones** (`count: 0`, `deals: []`), so the
board never silently drops a column. Board mode returns no `pagination` object; per-column
limits are applied server-side (default 50 per stage) with `count` giving the true total.

### 7.4 `POST /api/deals` — Cookie

**Request**
```json
{ "title": "Office fit-out", "value": 6000, "stage": "Lead",
  "expectedCloseDate": "2026-11-14", "customer": "6711a2b3c4d5e6f701234567" }
```

`title`, `value` and `customer` are required. `stage` defaults to `Lead`.

**`201 Created`** — the created deal.
**Errors:** `400` (validation; or `customer` not owned by the caller — §3.3) · `401`.

### 7.5 `PATCH /api/deals/:id` — Cookie

RAW_DOC: *"Changing a deal's stage must save to the database."* A stage change is a normal
`PATCH` carrying one field — the board must call this, not merely reorder locally:

```json
{ "stage": "Won" }
```

**`200 OK`** — the updated deal.
**Errors:** `400` (invalid stage) · `401` · `404`.

> **Implementation note (ARCHITECTURE D5).** If the `wonAt` field is adopted, this handler
> sets `wonAt = now` when `stage` transitions **to** `Won`, and clears it on transition away.
> `wonAt` is server-controlled and rejected in request bodies. Without it, the
> "deals won this month" metric falls back to `updatedAt`, which any edit re-dates. See Q9.

### 7.6 `GET /api/deals/:id` · `DELETE /api/deals/:id` — Cookie

`GET` returns a single deal in the list-item shape. `DELETE` returns `204`.
Both return `404` for an absent, foreign or malformed id.

Deleting a deal leaves its tasks intact with `deal` set to `null` (tasks link to a customer
**and/or** a deal — ARCHITECTURE D9 — so a task can outlive its deal). See Q6.

---

## 8. Tasks

**Model fields** (RAW_DOC): `title`, `dueDate`, `priority`, `done`, linked to a customer
and/or a deal.

### 8.1 Overdue is calculated, never stored

RAW_DOC: *"'Overdue' must be calculated from the due date, not chosen by hand."*

```
overdue  =  done === false  AND  dueDate < now
```

| Property | Contract |
|---|---|
| Storage | **No `overdue` field exists** on the Task document |
| Write | `overdue` in a request body → **`400`** (strict schemas) |
| Read | `overdue` is computed per request and included in every task response |
| Completion | A `done` task is **never** overdue, regardless of `dueDate` |
| Freshness | Recomputed on every read, so it is correct after a refresh with no write |

The designed three-state checkbox (DESIGN_SPEC §4.6) is driven by `done` + `overdue`
together: teal check = `done && !wasLate`, salmon check = `done` but completed late, salmon
`!` = `!done && overdue`, empty = `!done && !overdue`.

> The "completed late" variant needs a completion timestamp to distinguish from an on-time
> completion. RAW_DOC's field list has no `completedAt`. See Q10.

### 8.2 `GET /api/tasks` — Cookie

**Query parameters**

| Param | Type | Default | Rules |
|---|---|---|---|
| `done` | boolean | — | `true` / `false` |
| `priority` | enum | — | Q3 |
| `overdue` | boolean | — | **Computed filter** — translates to `done=false, dueDate<now` |
| `customer` | ObjectId | — | Owned by the caller |
| `deal` | ObjectId | — | Owned by the caller |
| `dueBefore` / `dueAfter` | ISO date | — | Range filter |
| `page` | integer | `1` | ≥ 1 |
| `limit` | integer | `20` | 1–100 |
| `sort` | enum | `dueDate` | `dueDate`, `-dueDate`, `createdAt`, `-createdAt`, `priority` |

`?overdue=true` is a **derived filter**, not a stored field — it is rewritten server-side
into a date comparison. This keeps the client from reimplementing the overdue rule.

**`200 OK`**
```json
{
  "data": [
    { "id": "6711c0d1e2f3a40512345678",
      "title": "Send revised quote",
      "dueDate": "2026-10-10T17:00:00.000Z",
      "priority": "high",
      "done": false,
      "overdue": true,
      "customer": { "id": "6711a2…", "name": "Deanna Annis" },
      "deal": { "id": "6711b0…", "title": "Office fit-out" },
      "createdAt": "2026-10-03T08:00:00.000Z",
      "updatedAt": "2026-10-03T08:00:00.000Z" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 23, "totalPages": 2,
                  "hasNextPage": true, "hasPrevPage": false }
}
```

`customer` and `deal` are `null` when unlinked.

### 8.3 `POST /api/tasks` — Cookie

```json
{ "title": "Send revised quote", "dueDate": "2026-10-10T17:00:00.000Z",
  "priority": "high", "customer": "6711a2b3c4d5e6f701234567" }
```

`title` and `dueDate` required; `priority` defaults (Q3); `done` defaults `false`. `customer`
and `deal` are both optional and independently settable.

**`201 Created`** — the created task, with `overdue` computed.
**Errors:** `400` (validation; unknown `overdue` key; foreign `customer`/`deal`) · `401`.

### 8.4 `PATCH /api/tasks/:id` · `GET` · `DELETE` — Cookie

`PATCH` accepts any subset, most commonly the completion toggle:

```json
{ "done": true }
```

`200 OK` with the updated task (`overdue` recomputed — toggling `done` to `true` flips
`overdue` to `false` in the same response). `GET` returns one task; `DELETE` returns `204`.
All return `404` for absent, foreign or malformed ids.

---

## 9. Dashboard

### 9.1 `GET /api/dashboard` — Cookie

RAW_DOC: *"All numbers must come from MongoDB aggregation on the server. No hardcoded
numbers."* One endpoint returns all five metrics plus the chart series — a single round trip,
and every pipeline begins with `$match: { owner }`.

**`200 OK`**
```json
{
  "metrics": {
    "totalCustomers": 78,
    "openPipelineValue": 103500,
    "dealsWonThisMonth": 6,
    "tasksDueToday": 3,
    "overdueTasks": 5
  },
  "pipelineByStage": [
    { "stage": "Lead",      "count": 12, "totalValue": 48000 },
    { "stage": "Qualified", "count": 7,  "totalValue": 31500 },
    { "stage": "Proposal",  "count": 4,  "totalValue": 24000 },
    { "stage": "Won",       "count": 21, "totalValue": 98000 },
    { "stage": "Lost",      "count": 9,  "totalValue": 17000 }
  ],
  "generatedAt": "2026-10-12T09:30:00.000Z"
}
```

### 9.2 Metric definitions — stated explicitly

| Metric | Definition |
|---|---|
| `totalCustomers` | Count of the user's customers |
| `openPipelineValue` | **Sum of `value` for deals in `Lead`, `Qualified`, `Proposal`** — excluding both `Won` and `Lost` |
| `dealsWonThisMonth` | Count of deals in stage `Won` that entered that state within `[startOfMonth, startOfNextMonth)` |
| `tasksDueToday` | Count of `done: false` tasks with `dueDate` within `[startOfToday, startOfTomorrow)` |
| `overdueTasks` | Count of `done: false` tasks with `dueDate < now` |

**`openPipelineValue` excludes `Won`.** RAW_DOC does not define "open", so this is a stated
interpretation: *open* means still in play, and `Won` is realised revenue rather than
pipeline. The alternative reading (exclude only `Lost`) inflates the figure with closed
business. Flagged as Q11.

**`dealsWonThisMonth` depends on an unresolved field.** With RAW_DOC's field list there is no
`wonAt`, so the only proxy is `updatedAt` — which any edit re-dates. See §7.5 and Q9.

### 9.3 Contract guarantees
- `pipelineByStage` **always contains all five stages**, zero-filled, so the chart never
  drops a column.
- Dashboard figures agree with the corresponding list endpoints for the same user.
- A second user's data never affects these numbers (every pipeline matches on `owner` first).
- Day and month boundaries use the **server's timezone** — UTC in production. See Q12.
- `generatedAt` lets the client show data freshness and aids debugging of timezone issues.

---

## 10. Health

### `GET /api/health` — Public
```json
{ "status": "ok", "uptime": 1423.5, "timestamp": "2026-10-12T09:30:00.000Z" }
```
No authentication, no database access — suitable for Render's health check. Returns no
version or environment details.

---

## 11. CORS and Credentialed Requests

Because the SPA (Vercel) and API (Render) are on different origins, every authenticated call
is a **credentialed cross-origin request**. Four conditions must hold together; breaking any
one breaks production while leaving localhost working:

1. `Access-Control-Allow-Origin` echoes the **exact** `CLIENT_URL` — never `*`, which is
   invalid for credentialed requests.
2. `Access-Control-Allow-Credentials: true`.
3. The cookie is set `SameSite=None; Secure` in production.
4. The client sends `credentials: 'include'` on every request.

A request from an origin not on the allowlist receives **`403`**, never `500` (RAW_DOC). The
CORS origin callback must return `cb(null, false)` rather than `cb(new Error(...))` — the
latter surfaces as a `500` through the error handler.

Preflight `OPTIONS` requests are answered by the CORS layer before routing, so they never
reach a protected router and never return `401`.

---

## 12. Worked Example — Full Session

```http
POST /api/auth/register            201   Set-Cookie: token=…
GET  /api/auth/me                  200   { user }

POST /api/customers                201   { id: "C1", … }
GET  /api/customers?search=ann&status=active&page=1     200   { data, pagination }

POST /api/deals                    201   { id: "D1", stage: "Lead", customer: "C1" }
PATCH /api/deals/D1  {"stage":"Won"}    200   stage persisted
GET  /api/deals?groupBy=stage      200   five columns, Won includes D1

POST /api/tasks  {"title":"Follow up","dueDate":"2026-10-01","customer":"C1"}
                                   201   { overdue: true }   ← past due, not done
PATCH /api/tasks/T1  {"done":true}      200   { overdue: false }

GET  /api/customers/C1             200   { customer, deals:[D1], tasks:[T1] }
GET  /api/dashboard                200   { metrics, pipelineByStage }

--- as a different user, user B ---
GET    /api/customers/C1           404   { error: { message: "Customer not found" } }
PATCH  /api/customers/C1           404   identical body
DELETE /api/customers/C1           404   identical body

POST /api/auth/logout              204   cookie cleared
GET  /api/auth/me                  401   → client redirects to /login
```

The three `404`s are the behaviour RAW_DOC names explicitly and that PRD Q-9 requires a test
to prove.

---

## 13. Unresolved Questions

Listed rather than guessed. Each needs one line from the assignment owner. "Working default"
is what will be implemented if no answer arrives before that endpoint is built; each is
reversible with a small change.

| # | Question | Affects | Working default |
|---|---|---|---|
| **Q1** | Allowed **customer `status`** values. RAW_DOC names only `active` (in `?status=active`). | §6 schema, status filter | `active` · `inactive` · `lead`, default `lead` |
| **Q2** | **Password policy** — minimum length and complexity. Unspecified in RAW_DOC. | §5.1 validation | ≥ 8 chars, no complexity rule |
| **Q3** | Allowed **task `priority`** values and the default. | §8 schema | `low` · `medium` · `high`, default `medium` |
| **Q4** | Is **password reset** in scope? RAW_DOC rate-limits its route but never lists the feature. | Auth surface | Not implemented (§5.5) |
| **Q5** | Which fields does **customer search** match, and is it regex or a text index? | §6.1 | Case-insensitive regex on `name`, `company`, `email` |
| **Q6** | **Cascade rules.** Does deleting a customer delete its deals and tasks? Does deleting a deal affect its tasks? | §6.5, §7.6 | Customer delete cascades; deal delete nulls `task.deal` |
| **Q7** | Is **phone** format-validated, or free-form? | §3.2 | Free-form, ≤ 40 chars |
| **Q8** | Are **stage transitions** constrained (e.g. no `Won` → `Lead`), or free? | §7.1, §7.5 | Free — any stage to any stage |
| **Q9** | Add a server-controlled **`wonAt`** field, or accept `updatedAt` as the proxy for "won this month"? | §7.5, §9.2 | Add `wonAt` — one line, materially more accurate |
| **Q10** | Add **`completedAt`** so the designed "completed late" checkbox state can be distinguished from on-time completion? | §8.1, DESIGN_SPEC §4.6 | Add it, or collapse the two completed states to one |
| **Q11** | Does **`openPipelineValue`** exclude `Won` **and** `Lost`, or only `Lost`? | §9.2 | Exclude both |
| **Q12** | **Timezone** for "due today" and "this month" — server UTC, or the user's local day? | §9.2 | Server time (UTC in production) |
| **Q13** | Should the **deals list** endpoint exist alongside board mode, or is `groupBy=stage` sufficient? | §7.3 | Both; board is the RAW_DOC requirement |
| **Q14** | Is a **`PATCH /api/tasks/:id/toggle`** shortcut wanted, or is the generic `PATCH` enough? | §8.4 | Generic `PATCH` only |

**Q1, Q3 and Q11 block implementation** of the customers, tasks and dashboard endpoints
respectively. **Q9 and Q10 are the two places where this contract recommends a small,
deliberate addition to RAW_DOC's field list** rather than shipping a metric or a UI state
that is quietly wrong — both are flagged for a decision rather than assumed.
