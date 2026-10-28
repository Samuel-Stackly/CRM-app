# Mini CRM — Technical Architecture

**Status:** Authoritative
**Last updated:** 2026-10-12 · **Deadline:** 14 Oct 2026, EOD

**Sources:** `docs/RAW_DOC.md` (functional source of truth) · `docs/PRD.md` ·
`docs/DESIGN_SPEC.md` · `CLAUDE.md`

> **Note on filename.** The brief referenced `docs/RAW_DOCS.md`; the file on disk is
> `docs/RAW_DOC.md` (singular). That is the file used here.
>
> **Scope.** This document describes structure and contracts only. No application code is
> implemented and no dependencies are installed. Code blocks are *intended shapes* for
> implementation, not files that exist. Decisions the sources do not settle are recorded in
> §10 rather than invented.
>
> **Deadline discipline.** Two days remain. Every choice below favours the shortest path
> that still satisfies RAW_DOC's Must-haves. Patterns that would be correct in a larger
> system but cost time here are explicitly rejected in §11.

---

## 1. System Architecture

### 1.1 Topology

```
   Browser
      │  HTTPS, credentialed fetch (cookie: token)
      ▼
┌──────────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│  Vercel              │        │  Render              │        │  MongoDB Atlas  │
│  React + Vite SPA    │──API──▶│  Express + TS        │──TLS──▶│  Mongoose       │
│  static, SPA rewrite │        │  Node 20             │        │  single DB      │
└──────────────────────┘        └──────────────────────┘        └─────────────────┘
   VITE_API_URL                   CLIENT_URL, JWT_SECRET,
                                  MONGO_URI, NODE_ENV
```

Two independently deployed units and one database. No BFF, no gateway, no queue — nothing
in RAW_DOC needs them.

### 1.2 Cross-origin reality

The frontend and backend sit on **different origins** (`*.vercel.app` ↔ `*.onrender.com`).
Since the JWT lives in an httpOnly cookie, every state-changing and authenticated request
is a **credentialed cross-origin request**. This single fact drives §6.4 and is the most
common source of "works locally, breaks live" failures. It is designed for from the start.

### 1.3 Repository layout

```
mini-crm/
├── client/          React + Vite + TypeScript
├── server/          Express + TypeScript
├── docs/            RAW_DOC, PRD, DESIGN_SPEC, ARCHITECTURE, Figma exports
└── .gitignore
```

Two independent npm projects, no workspace tooling. The orphan root `package-lock.json`
(empty `packages{}`, no manifest) should be deleted.

### 1.4 Runtime versions
Node 20 LTS on both sides. The server targets ES2022 with `module: NodeNext`, which means
**relative imports require explicit `.js` extensions** in TypeScript source. This is a
frequent early stumble; it is a consequence of the existing `server/tsconfig.json` and is
kept rather than changed.

---

## 2. Frontend Architecture

### 2.1 Folder structure — feature-based

```
client/src/
├── main.tsx
├── App.tsx                     router tree only
├── app/
│   ├── router.tsx              route table, protected/public split
│   └── providers.tsx           QueryClient, AuthProvider, ToastProvider
├── features/
│   ├── auth/
│   │   ├── api.ts              register, login, logout, me
│   │   ├── AuthContext.tsx     session state + restoration
│   │   ├── ProtectedRoute.tsx
│   │   ├── components/
│   │   └── pages/              LoginPage, RegisterPage
│   ├── customers/
│   │   ├── api.ts
│   │   ├── hooks.ts            useCustomers(params), useCustomer(id), mutations
│   │   ├── components/         CustomerTable, CustomerForm, CustomerFilters,
│   │   │                       NestedDeals, NestedTasks
│   │   └── pages/              CustomersPage, CustomerDetailPage
│   ├── deals/
│   │   ├── api.ts  hooks.ts
│   │   ├── components/         PipelineBoard, StageColumn, DealCard, DealForm,
│   │   │                       SelectCustomerModal
│   │   └── pages/              DealsPage (board), DealDetailPage
│   ├── tasks/
│   │   ├── api.ts  hooks.ts
│   │   ├── components/         TaskTable, TaskForm, TaskStateCheckbox
│   │   └── pages/              TasksPage
│   └── dashboard/
│       ├── api.ts  hooks.ts
│       ├── components/         StatCard, PipelineChart
│       └── pages/              DashboardPage
├── components/                 shared, feature-agnostic
│   ├── ui/                     Button, Input, Select, DatePicker, Checkbox,
│   │                           Avatar, Chip, Card, IconButton, Modal, Toast
│   └── states/                 LoadingState, EmptyState, ErrorState, ConfirmDialog
├── layouts/
│   ├── AppLayout.tsx           shell: Sidebar + Topbar + Outlet + RightRail
│   ├── AuthLayout.tsx          centred card for login/register
│   ├── Sidebar.tsx  Topbar.tsx  RightRail.tsx
├── services/
│   ├── http.ts                 fetch wrapper: credentials, 401 handling, error shape
│   └── queryKeys.ts
├── hooks/
│   └── useUrlFilters.ts        read/write the query string (single source of truth)
├── types/
│   ├── api.ts                  shared request/response types
│   └── models.ts               Customer, Deal, Task, User
└── styles/
    └── tokens.css              DESIGN_SPEC §2.1 palette as CSS custom properties
```

**Rule:** a feature folder may import from `components/`, `services/`, `hooks/`, `types/`
and `layouts/`, but **never from another feature folder**. Cross-feature needs (deals shown
on a customer page) are satisfied by the *parent page* composing both, or by a shared type —
not by `customers/` importing `deals/`.

`CLAUDE.md` caps components at ~400 lines; the split above keeps every component well under.

### 2.2 Routing

```
/login                      public    LoginPage
/register                   public    RegisterPage
/                           protected → redirect /dashboard
/dashboard                  protected DashboardPage
/customers                  protected CustomersPage        ?search=&status=&page=
/customers/:id              protected CustomerDetailPage
/deals                      protected DealsPage (board)    ?stage=
/deals/:id                  protected DealDetailPage
/tasks                      protected TasksPage            ?priority=&done=&page=
*                           NotFoundPage
```

Protected routes nest inside `AppLayout` via a layout route, so the shell renders once.

### 2.3 Protected routes and session restoration

Session restoration is the subtle part. There are **three** auth states, not two, and
collapsing them to two causes a flash of the login page on every refresh:

```
type AuthState =
  | { status: 'restoring' }                 // GET /api/auth/me in flight
  | { status: 'authenticated'; user: User }
  | { status: 'unauthenticated' }
```

Flow on app load:
1. `AuthProvider` mounts in state `restoring` and calls `GET /api/auth/me`.
2. `200` → `authenticated`. `401` → `unauthenticated`.
3. `ProtectedRoute` renders a full-page loader while `restoring`, the outlet when
   `authenticated`, and `<Navigate to="/login" replace>` when `unauthenticated`.

**Never redirect while `restoring`.** That is the bug RAW_DOC's "call it when the app loads
to restore the session" requirement is guarding against.

### 2.4 Global 401 handling
RAW_DOC: *"Any 401 must send the user back to the login page."* Enforced in one place —
`services/http.ts`. On any `401` it clears auth state and redirects to `/login`. Individual
components never handle 401.

### 2.5 URL as the source of truth for filters

`useUrlFilters` wraps React Router's `useSearchParams`. Components read filter values from
the URL and write changes back to it; **no filter value is mirrored in local state**. Query
hooks key off the parsed params, so a URL change refetches naturally.

Consequences, all required by RAW_DOC §6: refresh restores the view, a copied link
reproduces it, and browser back/forward traverses filter history.

Changing `search` or `status` resets `page` to 1 in the same URL update, to avoid landing
on an out-of-range page.

### 2.6 Server state
A query library (TanStack Query) is the practical choice for loading/error states,
caching and invalidation — RAW_DOC requires loading and error states on *every* list and
form, and hand-rolling that is where the time goes. **This is the one dependency added
beyond the existing set**, and it is justified by X-1/X-3 in PRD §10. If it is rejected, the
fallback is a hand-written `useAsync` hook and the states must still be delivered.

### 2.7 Styling
Design tokens from DESIGN_SPEC §2.1 are declared once in `styles/tokens.css` as custom
properties, then consumed by whichever styling approach is chosen (PRD Q10 — unresolved).
Tokens are defined independently of that choice so the decision does not block the shell.

---

## 3. Backend Architecture

### 3.1 Folder structure — layered

```
server/src/
├── app.ts                      express app, middleware chain, routers — NO listen()
├── server.ts                   loads env, connects Mongo, app.listen()
├── config/
│   ├── env.ts                  Zod-validated env, fails fast
│   └── db.ts                   mongoose connection
├── middleware/
│   ├── requireAuth.ts          verifies JWT cookie → req.user
│   ├── validate.ts             Zod body/query/params validator factory
│   ├── errorHandler.ts         single terminal error handler
│   ├── notFound.ts             unmatched route → 404
│   └── rateLimit.ts            auth limiter
├── modules/
│   ├── auth/      routes.ts  controller.ts  service.ts  schemas.ts
│   ├── customers/ routes.ts  controller.ts  service.ts  schemas.ts
│   ├── deals/     routes.ts  controller.ts  service.ts  schemas.ts
│   ├── tasks/     routes.ts  controller.ts  service.ts  schemas.ts
│   └── dashboard/ routes.ts  controller.ts  service.ts
├── models/
│   ├── User.ts  Customer.ts  Deal.ts  Task.ts
├── types/
│   └── express.d.ts            augments Request with `user`
├── utils/
│   ├── ApiError.ts             typed operational error
│   └── asyncHandler.ts         wraps async handlers so rejections reach errorHandler
└── __tests__/
    ├── setup.ts                in-memory Mongo, per-test reset
    ├── auth.test.ts
    └── isolation.test.ts
```

**`app.ts` must not call `listen()`.** The Express app is exported so Supertest can mount
it without binding a port — the difference between tests that run in CI and tests that hang.

### 3.2 Layer responsibilities

| Layer | Does | Must not |
|---|---|---|
| **Route** | Declare path + method, attach `requireAuth`, `validate(schema)`, controller | Contain logic |
| **Controller** | Read validated input and `req.user.id`, call service, shape the HTTP response | Touch Mongoose directly |
| **Service** | Business logic and all database access; **applies the owner scope** | Know about `req`/`res` |
| **Model** | Schema, indexes, hooks | Contain request logic |
| **Schema (Zod)** | Parse and narrow input; the inferred type is the service's input type | — |

The owner scope lives in the **service**, not the controller. One layer owns it, so there is
one place to audit for PRD §9's S-1.

### 3.3 Middleware order

Order is load-bearing:

```
helmet()
cors(allowlistOptions)                 → 403 for blocked origins, never 500
express.json({ limit: '10kb' })
cookieParser()
/api/auth  → authLimiter → authRouter
/api/customers | /api/deals | /api/tasks | /api/dashboard → requireAuth → router
notFound
errorHandler                           ← terminal, 4-arg
```

`cookieParser` must precede `requireAuth`; the CORS layer must precede routing so
preflights never reach a protected router.

### 3.4 Centralised error handling

One operational error type and one terminal handler:

```ts
class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message) }
  static badRequest(m: string, d?: unknown) { return new ApiError(400, m, d) }
  static unauthorized(m = 'Unauthorized')   { return new ApiError(401, m) }
  static forbidden(m = 'Forbidden')         { return new ApiError(403, m) }
  static notFound(m = 'Not found')          { return new ApiError(404, m) }
}
```

The handler maps:

| Input | Status | Notes |
|---|---|---|
| `ApiError` | its `status` | message + optional details |
| `ZodError` | **400** | field-level issues (PRD S-5) |
| Mongoose `CastError` (bad ObjectId) | **404** | **not 400** — see §5.4 |
| Mongoose duplicate key `11000` | 409 | e.g. duplicate email |
| anything else | 500 | generic message; details logged, never returned |

**Every async handler is wrapped in `asyncHandler`** so a rejected promise reaches this
handler instead of hanging the request. In production the response body never includes a
stack trace, and the log line never includes passwords, tokens or emails (PRD S-10).

### 3.5 Authentication and authorization middleware

- **`requireAuth`** — *authentication*. Reads the `token` cookie, verifies it, loads the
  user id onto `req.user`, else `401`.
- **Authorization is not a middleware.** There are no roles; authorization here means
  *ownership*, and ownership is enforced inside every service query by including
  `owner: userId` in the filter (§5). A separate `canAccess` middleware would require a
  second database read per request and could be forgotten; the query-level scope cannot.

---

## 4. Data Models

All models carry Mongoose `timestamps: true` (`createdAt`, `updatedAt`) and an `owner`
reference. Field sets are from **RAW_DOC §Features**, per PRD §2 conflict resolutions C1–C5.

### 4.1 User

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | required |
| `email` | String | required, **unique**, lowercased, trimmed |
| `password` | String | bcrypt hash, `select: false` |
| `createdAt` / `updatedAt` | Date | automatic |

- **Index:** `{ email: 1 }` unique.
- `select: false` on `password` means it is never returned unless explicitly requested —
  defence in depth against leaking the hash through a careless `res.json(user)`.
- Hash in a `pre('save')` hook so every write path hashes consistently.

### 4.2 Customer

| Field | Type | Notes |
|---|---|---|
| `owner` | ObjectId → User | **required, indexed** |
| `name` | String | required |
| `company` | String | |
| `email` | String | |
| `phone` | String | |
| `status` | String enum | values unresolved — **D1**, §10 |
| `notes` | String | |
| timestamps | Date | |

- **Indexes:** `{ owner: 1, createdAt: -1 }` for the default list;
  `{ owner: 1, status: 1 }` for the status filter.
- **Search:** a compound text index on `name`, `company`, `email` is the clean answer, but a
  case-insensitive regex scoped to `owner` is adequate at assignment data volumes and avoids
  text-index ranking surprises. **D6, §10.**

### 4.3 Deal

| Field | Type | Notes |
|---|---|---|
| `owner` | ObjectId → User | **required, indexed** |
| `customer` | ObjectId → Customer | required (**D8**, §10) |
| `title` | String | required |
| `value` | Number | required, min 0 |
| `stage` | String enum | **`Lead` · `Qualified` · `Proposal` · `Won` · `Lost`** (RAW_DOC) |
| `expectedCloseDate` | Date | |
| timestamps | Date | |

- **Indexes:** `{ owner: 1, stage: 1 }` for the board and the pipeline aggregation;
  `{ owner: 1, customer: 1 }` for nested customer deals.
- The five stage values are fixed by RAW_DOC and are the single source for the enum, the Zod
  schema and the board's column order.
- **Stage changes persist** (RAW_DOC D-3) through `PATCH /api/deals/:id` — the board does not
  keep stage in local state alone.

### 4.4 Task

| Field | Type | Notes |
|---|---|---|
| `owner` | ObjectId → User | **required, indexed** |
| `customer` | ObjectId → Customer | optional (**D9**) |
| `deal` | ObjectId → Deal | optional (**D9**) |
| `title` | String | required |
| `dueDate` | Date | required |
| `priority` | String enum | values unresolved — **D3**, §10 |
| `done` | Boolean | default `false` |
| timestamps | Date | |

- **Indexes:** `{ owner: 1, dueDate: 1 }` for due-today and overdue queries;
  `{ owner: 1, customer: 1 }` for nested customer tasks.
- **There is no `overdue` field.** RAW_DOC requires overdue to be *calculated from the due
  date, not chosen by hand*. It is derived as `!done && dueDate < now` — in aggregation for
  dashboard counts, and as a virtual or response-shaping step for list responses. The API
  **rejects** any attempt to write an `overdue` field, because Zod schemas use `.strict()`.

### 4.5 Relationships

```
User 1──* Customer 1──* Deal
     1──* Deal            *──1 Customer
     1──* Task            *──0..1 Customer
                          *──0..1 Deal
```

Every document points at its `owner` **directly**, even Deals and Tasks that also reference a
Customer. This denormalisation is deliberate: it makes the ownership filter a single indexed
field match on every collection, with no `$lookup` and no second query. It is the backbone of
§5.

**Cascade on customer delete is unresolved — D7, §10.**

---

## 5. Data Isolation

This is 20% of the grade and the area RAW_DOC flags as a prior-review failure. The design
goal is that isolation is **structurally difficult to forget**, not merely remembered.

### 5.1 The rule
Every query against Customer, Deal and Task includes `owner: req.user.id` in its filter —
reads, updates, deletes and aggregations alike.

### 5.2 Single-document access

```ts
// services/customers.service.ts — intended shape
async function getCustomer(ownerId: string, id: string) {
  const customer = await Customer.findOne({ _id: id, owner: ownerId })
  if (!customer) throw ApiError.notFound('Customer not found')
  return customer
}
```

The ownership check is **part of the query**, not a comparison after the fetch. A document
belonging to another user simply does not match, and the identical `404` is returned whether
the record is absent or merely someone else's — so the response never reveals that another
user's record exists. RAW_DOC requires `404`, explicitly not `403`.

The same shape applies to update and delete via `findOneAndUpdate` / `findOneAndDelete` with
`{ _id, owner }`.

### 5.3 Nested customer deals and tasks — securely

PRD C-5 requires the customer detail page to show that customer's deals and tasks. The
secure formulation is a **two-step** one:

```ts
async function getCustomerWithNested(ownerId: string, customerId: string) {
  // 1. Prove the customer belongs to this user — 404 otherwise.
  const customer = await Customer.findOne({ _id: customerId, owner: ownerId })
  if (!customer) throw ApiError.notFound('Customer not found')

  // 2. Scope nested queries by BOTH owner and customer.
  const [deals, tasks] = await Promise.all([
    Deal.find({ owner: ownerId, customer: customerId }).sort({ createdAt: -1 }),
    Task.find({ owner: ownerId, customer: customerId }).sort({ dueDate: 1 }),
  ])
  return { customer, deals, tasks }
}
```

Two properties matter:

1. **Step 1 gates step 2.** Another user's customer id returns `404` before any nested query
   runs, so the endpoint cannot be used to probe for existence.
2. **`owner` is repeated in the nested filters even though step 1 already passed.** It is
   redundant *today* — but it means a future bug in step 1 degrades to "returns nothing"
   rather than "leaks another user's deals". Defence in depth at the cost of one indexed
   field match.

**`populate()` is avoided for nested data.** `populate` resolves references without
re-applying an owner filter; if a `customer` reference were ever cross-user, populate would
happily return it. Explicit scoped queries cannot do that.

### 5.4 Invalid ids return 404, not 400
A malformed ObjectId raises a Mongoose `CastError`. Mapping it to `400` tells an attacker
"that id is well-formed but not yours" versus "that id is malformed". Mapping it to `404`
keeps every not-yours and not-real case indistinguishable. Handled centrally in §3.4.

### 5.5 Verification
PRD Q-9 requires a test proving cross-user denial. `__tests__/isolation.test.ts` seeds two
users, creates a record as user A, and asserts `404` for user B on `GET`, `PATCH` and
`DELETE` for each of the three resources.

---

## 6. Authentication Flow

### 6.1 Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create account, set cookie |
| POST | `/api/auth/login` | public | Verify credentials, set cookie |
| POST | `/api/auth/logout` | public | Clear cookie |
| GET | `/api/auth/me` | cookie | Restore session; `401` when absent/invalid |

All four are behind the auth rate limiter (RAW_DOC S-6).

### 6.2 Register / login
1. Zod-validate the body → `400` with field messages on failure.
2. Register: reject duplicate email (`409`). Login: look up by email, **selecting the
   password explicitly** since it is `select: false`.
3. `bcrypt.compare` — or `bcrypt.hash` with cost 10 on register.
4. Sign a JWT with `{ sub: user._id }` and an expiry (**D10**, §10).
5. `res.cookie('token', jwt, cookieOptions)` — §6.4.
6. Return the **safe user object** (`id`, `name`, `email`). The token is never in the body;
   putting it there would defeat the httpOnly requirement.

**Login failures return one generic message** for both unknown-email and wrong-password, so
the endpoint is not an account-enumeration oracle.

### 6.3 Logout
`res.clearCookie('token', <same options>)`. The options must match those used to set it —
`sameSite`, `secure`, `path` and `domain` included — or the browser silently keeps the
cookie. This is a common and hard-to-spot bug.

### 6.4 Cookie, CORS and credentialed requests in production

The cross-origin deployment (§1.2) makes these settings interdependent:

```ts
const isProd = env.NODE_ENV === 'production'
const cookieOptions = {
  httpOnly: true,                        // RAW_DOC: never readable by JS
  secure:   isProd,                      // HTTPS only in production
  sameSite: isProd ? 'none' : 'lax',     // 'none' REQUIRED cross-site
  maxAge:   SEVEN_DAYS,
  path:     '/',
}
```

Four rules that must hold together — breaking any one breaks login in production while
leaving it working locally:

1. **`sameSite: 'none'` is mandatory** for Vercel → Render. With `lax`, the browser refuses
   to send the cookie on cross-site requests and every authenticated call returns `401`.
2. **`sameSite: 'none'` requires `secure: true`**, which requires HTTPS. Both hosts provide
   it; local development must therefore use `lax` + `secure: false`.
3. **CORS must echo an exact origin and set `credentials: true`.** `Access-Control-Allow-Origin: *`
   is invalid for credentialed requests — the browser rejects the response.
4. **The client must send `credentials: 'include'` on every request.** The default is
   `same-origin`, which silently omits the cookie cross-origin. Set once in
   `services/http.ts`.

CORS allowlist, returning `403` rather than `500` (PRD S-8):

```ts
const allowlist = [env.CLIENT_URL]
cors({
  origin(origin, cb) {
    if (!origin || allowlist.includes(origin)) return cb(null, true)
    return cb(null, false)        // NOT cb(new Error(...)) — that surfaces as 500
  },
  credentials: true,
})
```

Returning `cb(null, false)` omits the CORS headers and lets a deliberate `403` be sent,
instead of throwing into the error handler as a `500`. RAW_DOC calls this out specifically.

**Render cold starts:** free-tier instances sleep. The first request after idling can take
30s+. Worth knowing before concluding the deployment is broken.

---

## 7. API Design

### 7.1 Conventions
- Base path `/api`; plural resource nouns; JSON only.
- `GET` list · `GET /:id` read · `POST` create (201) · `PATCH /:id` partial update ·
  `DELETE /:id` (204).
- `PATCH` over `PUT`: the board changes only `stage`, and forms submit partial edits.

### 7.2 Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | liveness |
| POST | `/api/auth/register` · `/login` · `/logout` | §6 |
| GET | `/api/auth/me` | session restore |
| GET | `/api/customers` | list; `?search=&status=&page=&limit=&sort=` |
| POST | `/api/customers` | create |
| GET | `/api/customers/:id` | detail **with nested deals + tasks** (§5.3) |
| PATCH | `/api/customers/:id` | update |
| DELETE | `/api/customers/:id` | delete (cascade — **D7**) |
| GET | `/api/deals` | list; `?stage=&customer=&page=&limit=` |
| POST · GET · PATCH · DELETE | `/api/deals[/:id]` | CRUD; `PATCH` carries stage changes |
| GET | `/api/tasks` | list; `?done=&priority=&customer=&deal=&page=&limit=` |
| POST · GET · PATCH · DELETE | `/api/tasks[/:id]` | CRUD |
| GET | `/api/dashboard` | all metrics in one response (§8) |

One dashboard endpoint rather than six: a single round trip, and all pipelines share the
same `$match` on owner.

### 7.3 Validation

A `validate` middleware factory parses `body`, `query` or `params` with a Zod schema,
**replaces** the raw value with the parsed one, and throws `ZodError` on failure (→ `400`
in §3.4). Controllers therefore receive typed, narrowed input and never re-check it.

- Schemas live beside their module in `schemas.ts`; service input types are
  `z.infer<typeof schema>`, so the validator and the type cannot drift.
- **Every schema is `.strict()`** so unknown keys are rejected. This is what prevents a
  client from writing `owner`, `_id` or `overdue`.
- Query schemas coerce: `page`/`limit` to bounded integers (`limit` max 100 to prevent a
  client requesting the whole collection), `done` to boolean, dates to `Date`.

### 7.4 Error response shape

One shape everywhere:

```jsonc
{ "error": { "message": "Validation failed",
             "details": [{ "path": "email", "message": "Invalid email" }] } }
```

`details` is present only for validation errors. The client renders `message` for toasts and
`details` for field-level errors (PRD X-4).

### 7.5 Pagination and filtering (customers)

RAW_DOC requires **server-side** pagination. The list response:

```jsonc
{ "data": [ /* customers */ ],
  "pagination": { "page": 2, "limit": 20, "total": 78, "totalPages": 4 } }
```

- Implemented as `.find(filter).sort(...).skip((page-1)*limit).limit(limit)` plus a
  `countDocuments(filter)` — the **same filter object** for both, or the count disagrees
  with the data.
- `filter` always starts `{ owner: userId }`, then conditionally adds `status` and the
  search clause.
- The response carries enough metadata for the designed pagination controls, and `page`
  round-trips through the URL (§2.5), satisfying RAW_DOC's "a refresh keeps them".
- Skip/limit is correct and adequate here. Cursor pagination would be better at scale and is
  not worth the time at this one (§11).

---

## 8. Dashboard Aggregation

RAW_DOC: *"All numbers must come from MongoDB aggregation on the server. No hardcoded
numbers."* Every metric below is an aggregation pipeline; none is computed by fetching
documents and reducing in JavaScript.

**Every pipeline begins with `$match: { owner: userId }`** — the first stage, so the index is
used and no other user's documents ever enter the pipeline.

### 8.1 The five metrics and one chart

| Metric | Collection | Pipeline sketch |
|---|---|---|
| **Total customers** | Customer | `$match {owner}` → `$count` |
| **Open pipeline value** | Deal | `$match {owner, stage: {$in: OPEN}}` → `$group {_id: null, total: {$sum: '$value'}}` |
| **Deals won this month** | Deal | `$match {owner, stage: 'Won', updatedAt: {$gte: monthStart, $lt: nextMonthStart}}` → `$count` |
| **Tasks due today** | Task | `$match {owner, done: false, dueDate: {$gte: todayStart, $lt: tomorrowStart}}` → `$count` |
| **Overdue tasks** | Task | `$match {owner, done: false, dueDate: {$lt: now}}` → `$count` |
| **Chart: pipeline value by stage** | Deal | `$match {owner}` → `$group {_id: '$stage', value: {$sum: '$value'}, count: {$sum: 1}}` |

Run as one `$facet`, or as parallel `Promise.all` aggregations — either satisfies RAW_DOC.
`$facet` keeps it to a single round trip per collection.

### 8.2 Intended meanings — stated explicitly

These two definitions are **not given in RAW_DOC** and materially change the numbers, so they
are defined here and flagged as unresolved (D4):

**Open pipeline value** = the summed `value` of deals in stages **`Lead`, `Qualified`,
`Proposal`** — excluding both `Won` and `Lost`. Rationale: "open" means still in play;
`Won` is realised revenue, not pipeline, and `Lost` is neither. The alternative reading
(exclude only `Lost`) would inflate the figure with closed business.

**Deals won this month** = the count of deals whose `stage` is `Won` and which **entered that
state during the current calendar month**, where "current month" is `[startOfMonth,
startOfNextMonth)` in the server's timezone.

> **Modelling caveat, stated plainly.** With the RAW_DOC field set there is no
> `wonAt`/`closedAt` field, so the only available proxy is `updatedAt` — which changes on
> *any* edit, so editing a deal's title re-dates its win. The honest options are:
> **(a)** accept `updatedAt` as a proxy for the assignment; **(b)** use
> `expectedCloseDate` within the month, which measures something different (expected, not
> actual); or **(c)** add a `wonAt: Date` field set when `stage` transitions to `Won`.
> **(c) is correct and costs one line in the update service.** It is a small addition to
> RAW_DOC's field list, so it is recorded as **D5** rather than assumed.

**Chart scope:** all five stages are returned so the chart can show the full pipeline; the
client may filter. Stages with no deals are absent from `$group` output and must be
**zero-filled client-side** against the known five, or the chart silently drops columns.

**Timezone:** all day/month boundaries use the server's clock. With `NODE_ENV=production` on
Render this is UTC, which may differ from the user's local day. Noted as **D11**.

---

## 9. Testing and Deployment Architecture

### 9.1 Testing

RAW_DOC: **at least 5 backend API tests, including auth and one proving cross-user denial.**

- **Runner:** Vitest (`CLAUDE.md`), with **Supertest** driving the exported `app`.
- **Database:** `mongodb-memory-server` — real query semantics, no shared fixture state, no
  Atlas dependency in CI. Collections are dropped between tests.
- **Neither is currently installed**; both are dev dependencies to add in the testing phase.

Minimum suite (meets and slightly exceeds the floor):

| # | Test | Covers |
|---|---|---|
| 1 | Register → `201`, cookie set, password not in response | Auth |
| 2 | Login with wrong password → `401`, generic message | Auth |
| 3 | `GET /api/auth/me` without cookie → `401`; with cookie → the user | Session restore |
| 4 | **User B `GET`/`PATCH`/`DELETE` on user A's customer → `404`** | **Cross-user denial** |
| 5 | Same for a deal and a task | Cross-user denial |
| 6 | `POST /api/customers` with an invalid body → `400` with details, not `500` | Validation |
| 7 | Customers list honours `search` + `status` + `page` and returns correct `pagination` | Pagination |

Test 4 is the one RAW_DOC names explicitly; it asserts `404` specifically, since `403` fails
the requirement.

**Per `CLAUDE.md`, results are never reported as passing unless the suite was actually run.**

### 9.2 Environment variables

| Variable | Side | Example | Notes |
|---|---|---|---|
| `MONGO_URI` | server | `mongodb+srv://…` | Atlas SRV string |
| `JWT_SECRET` | server | long random | **no fallback value** |
| `CLIENT_URL` | server | `https://…vercel.app` | the CORS allowlist entry |
| `NODE_ENV` | server | `production` | drives `secure`/`sameSite` |
| `PORT` | server | provided by Render | must be read, not hardcoded |
| `VITE_API_URL` | client | `https://…onrender.com/api` | **public — inlined into the bundle** |

`config/env.ts` parses these with Zod **at boot and exits on failure**. This is what
mechanically enforces RAW_DOC's "no fallback secrets": there is no `|| 'dev-secret'` anywhere
because the app refuses to start without the real value.

Nothing secret may use the `VITE_` prefix — it ships to the browser.

### 9.3 Production build
- **Client:** `tsc -b && vite build` → `dist/`. Type errors fail the build, by design.
- **Server:** `tsc` → `dist/`, started with `node dist/app.js`. The `"main": "index.js"`
  field in `server/package.json` is wrong and should point at the built entry.
- Both builds are verified locally before deploying (`CLAUDE.md`).

### 9.4 SPA fallback — a named RAW_DOC requirement

*"Refreshing any page (e.g. `/customers/123`) must work on the live site."* Without a
rewrite the host looks for a file at that path and serves its own 404 — the app never loads.

`client/vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

(Netlify equivalent: `/* /index.html 200` in `_redirects`.)

RAW_DOC says to **test it** — so the acceptance check is a hard refresh of a deep link on the
live URL, not a local `vite preview`.

### 9.5 Deployment checklist
- [ ] Atlas allows Render's egress (or `0.0.0.0/0` with a strong credential).
- [ ] All server env vars set in Render; `NODE_ENV=production`.
- [ ] `VITE_API_URL` set in Vercel and pointing at the live backend.
- [ ] `CLIENT_URL` on Render exactly matches the Vercel origin (scheme, no trailing slash).
- [ ] SPA rewrite deployed and a deep-link refresh verified live.
- [ ] Demo account seeded with customers, deals and tasks.
- [ ] Login verified **on the live site**, confirming the cross-origin cookie.

---

## 10. Unresolved Decisions

Recorded rather than invented. Each needs one line from the assignment owner; the stated
default is what will be implemented if no answer arrives before that phase starts.

| # | Decision | Blocks | Default if unanswered |
|---|---|---|---|
| **D1** | Allowed **customer status** values. RAW_DOC names only `active`. | Customer schema, status filter | `active` / `inactive` / `lead` |
| **D2** | Is **password reset** in scope? RAW_DOC rate-limits its route but never lists the feature. | Auth scope | Not built; limiter still covers the path |
| **D3** | Allowed **task priority** values. | Task schema, Task UI | `low` / `medium` / `high` |
| **D4** | Does **open pipeline value** exclude `Won` and `Lost`, or only `Lost`? | Dashboard metric | Exclude both (§8.2) |
| **D5** | Add a **`wonAt`** field to date "deals won this month" accurately, or accept `updatedAt` as a proxy? | Dashboard metric, Deal schema | Add `wonAt` — one line, materially more correct |
| **D6** | Customer **search**: regex or text index, and which fields? | Customer list | Regex on `name`, `company`, `email`, scoped by owner |
| **D7** | Does deleting a customer **cascade** to its deals and tasks, or block? | Delete endpoint, data integrity | Cascade, warned in the confirm dialog |
| **D8** | Is a deal's **customer link required**? | Deal schema | Required |
| **D9** | Are task links to customer/deal both optional ("and/or")? | Task schema | Both optional |
| **D10** | **JWT lifetime** and whether refresh is expected. | Auth | 7 days, no refresh token |
| **D11** | **Timezone** for "due today" and "this month". | Dashboard metrics | Server time (UTC in production) |
| **D12** | **Tailwind or CSS Modules.** | First component | Tailwind |
| **D13** | Is the deals **table** (design) required alongside the **board** (RAW_DOC)? | Deals scope | Board only; table if time allows |
| **D14** | Add **TanStack Query**, or hand-roll async state? | Frontend data layer | Add it (§2.6) |

**D1, D3, D4 and D12 block the first implementation phases** and should be answered first.
D5 is the one place where the architecture recommends a small, deliberate addition to
RAW_DOC's field list rather than a worse metric.

---

## 11. Deliberately Rejected — and Why

Two days remain. These are correct in larger systems and are **not** being built:

| Rejected | Why not here |
|---|---|
| Repository layer / DI container | The service layer already isolates data access; another layer costs time and adds no marks |
| Cursor pagination | Skip/limit is correct at this data volume; RAW_DOC asks only for server-side paging |
| Refresh tokens / rotation | RAW_DOC specifies a single httpOnly cookie; rotation is unrequested complexity |
| Redis rate-limit store | In-memory is fine for a single instance; Render runs one |
| Docker / CI pipeline | Not required by RAW_DOC; both hosts build from the repo |
| Soft deletes, audit log | Not in any source |
| GraphQL / tRPC | RAW_DOC specifies REST |
| E2E (Playwright) tests | RAW_DOC asks for **backend API** tests; E2E would consume the remaining time |
| Separate per-metric dashboard endpoints | One endpoint, one round trip (§7.2) |
| `populate()` for nested data | Does not re-apply the owner filter (§5.3) |

---

## 12. Current State vs. Target

What exists today, for an honest starting point:

| Area | Now | Gap |
|---|---|---|
| `server/src/app.ts` | **0 bytes** | Everything in §3 |
| `client/src/` | Vite starter template | Everything in §2 |
| Server deps | express, mongoose, zod, jwt, bcryptjs, helmet, cors, cookie-parser, express-rate-limit, dotenv — **all present** | none |
| Client deps | react, react-dom only | react-router-dom, styling choice (D12), TanStack Query (D14) |
| Test deps | **none** | vitest, supertest, mongodb-memory-server |
| Lint | client: oxlint; server: **none** | RAW_DOC requires ESLint at 0 errors — settle on one linter for both |
| Git | **0 commits** | RAW_DOC requires ≥ 20 |
| `.gitignore` | contains a literal `cat > .gitignore <<'EOF'` heredoc line | repair before first commit |
| Root `package-lock.json` | orphan, empty, no manifest | delete |

The backend dependency set is complete — no installs are needed to begin §3.
