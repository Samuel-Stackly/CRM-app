# ShopDesk

A store administration dashboard: products, orders, a metrics overview and an
admin profile. React + Vite + TypeScript on the front, Express + MongoDB on the
back, built on the SnowUI design language.

- `client/` — React 19, Vite, TypeScript, Tailwind CSS v4, React Router, Recharts
- `server/` — Express 5, TypeScript, Mongoose, Zod, JWT in an httpOnly cookie

## Prerequisites

- Node.js 20 or newer
- A MongoDB database — MongoDB Atlas, or a local `mongod`
- No global tooling is needed; everything runs through npm scripts

## Install

From the repository root:

```bash
APP=app2 npm run install:all
```

Or per side: `cd apps/app2/client && npm install`, same for `server`.

## Environment variables

### Server — `apps/app2/server/.env`

Copy the template and fill it in. `.env` is gitignored; never commit it.

```bash
cd apps/app2/server
cp .env.example .env
```

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `MONGO_URI` | **yes** | — | Connection string. Holds credentials; never logged. |
| `JWT_SECRET` | **yes** | — | At least 16 characters. No fallback exists. |
| `JWT_EXPIRES_IN` | no | `7d` | `ms`-style duration: `7d`, `12h`, `30m`, `60s`. |
| `CLIENT_URL` | no | `http://localhost:5174` | CORS allowlist. Comma-separate for several origins. |
| `PORT` | no | `5001` | Injected by the root runner from `apps.config.json`. |
| `NODE_ENV` | no | `development` | |

The server validates these at startup and **exits with a field-level message**
if any are missing or malformed, rather than booting with a default secret.

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Client — `apps/app2/client/.env`

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `VITE_API_URL` | no | `http://localhost:5001/api` | Base URL of the API. |

Vite inlines every `VITE_*` value into the browser bundle, so **never put a
secret behind that prefix**. There is no token to configure: the API issues an
httpOnly cookie that JavaScript cannot read.

## Seed demo data

```bash
cd apps/app2/server
npm run seed
```

Creates one demo account, 30 products across four categories, and 50 orders
spread over the last 14 days. The script is **idempotent** — every record is
upserted on a natural key, so repeated runs update in place instead of
duplicating. It never drops a collection or deletes a document.

### Demo credentials

```
email     admin@shopdesk.dev
password  Admin@123
```

These are seeded demo values for a throwaway database. Do not reuse them
anywhere real.

## Run

From the repository root:

```bash
APP=app2 npm run dev          # client on :5174 and server on :5001
APP=app2 npm run dev:client
APP=app2 npm run dev:server
```

To make ShopDesk the default target, set `"activeApp": "app2"` in
`apps.config.json` and drop the `APP=app2` prefix.

Open <http://localhost:5174>. You will be redirected to `/login`.

## Tests, type checks and builds

```bash
cd apps/app2/client
npm test            # Vitest + Testing Library
npm run lint        # oxlint
npm run build       # tsc -b && vite build

cd ../server
npm test            # Vitest + Supertest, against an in-memory MongoDB
npm run typecheck
npm run build
```

Server tests start their own in-memory MongoDB, so they need **no Atlas
credentials and no network**. No test touches a real database.

## API

Every endpoint requires the session cookie except `POST /api/auth/login` and
`GET /api/health`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness probe (public) |
| `POST` | `/api/auth/login` | Sign in; sets the httpOnly cookie |
| `POST` | `/api/auth/logout` | Clears the cookie |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/stats` | Dashboard metrics, 14-day chart, 5 recent orders |
| `GET` | `/api/products?search=&category=&page=` | List, 10 per page |
| `POST` | `/api/products` | Create |
| `PUT` | `/api/products/:id` | Replace |
| `DELETE` | `/api/products/:id` | Delete |
| `GET` | `/api/orders?status=&page=` | List, 10 per page |
| `PATCH` | `/api/orders/:id/status` | Change status |
| `PUT` | `/api/users/me` | Update own name and/or password |

Lists answer `{ data, pagination }`; single resources answer `{ product }`,
`{ order }` or `{ user }`; errors answer `{ error: { message, details? } }`.

**Revenue** is the sum of `total` across orders that are not `Cancelled` —
`Pending`, `Shipped` and `Delivered` all count. The dashboard reports booked
revenue, not settled cash.

## Deployment

### Frontend — Vercel or Netlify

- Root directory: `apps/app2/client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment: `VITE_API_URL=https://<your-api-host>/api`
- `vercel.json` already rewrites every path to `index.html`. On Netlify add
  the equivalent `_redirects` entry (`/*  /index.html  200`), or a refresh on
  `/products` returns 404 before React Router sees it.

### Backend — Render

- Root directory: `apps/app2/server`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (the deployed frontend
  origin), `NODE_ENV=production`

### Manual steps that remain

1. Allowlist the Render egress IPs in MongoDB Atlas, or the connection is
   refused at runtime.
2. Set `CLIENT_URL` to the exact deployed frontend origin. It drives both the
   CORS allowlist and the cookie's `sameSite`/`secure` attributes — a wrong
   value produces a login that appears to succeed and then 401s on every
   subsequent request.
3. Run `npm run seed` once against the production database if demo data is
   wanted, with `MONGO_URI` pointed at it.
4. Frontend and API on different registrable domains means a cross-site
   cookie, which browsers only accept over HTTPS. Both must be served over
   TLS.

## Security notes

- The JWT lives in an httpOnly, `sameSite`-scoped cookie and is never readable
  by JavaScript, never in `localStorage`, and never in a response body.
- Passwords are hashed with bcrypt at cost 12. `passwordHash` is `select:
  false` on the model, so it cannot reach a response through a forgotten
  projection.
- Every request body, query and param is validated with Zod before a
  controller sees it.
- CORS is an exact-origin allowlist; a disallowed origin gets a deliberate 403.
- Login is rate-limited.
- **Known gap:** `PUT /api/users/me` changes a password without requiring the
  current one. Anyone with a live session can lock the owner out. See the
  audit notes; the fix is to require `currentPassword` and `bcrypt.compare` it.
