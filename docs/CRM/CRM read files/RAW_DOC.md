# New Task: Mini CRM (Full-Stack, Figma-based)

| | |
|---|---|
| **Assigned by** | Sai Vishnu |
| **Assigned on** | 30 Sep 2026 |
| **Deadline** | **Wed, 14 Oct 2026, EOD** |

---

## Design (source of truth)

**Figma:** [CRM app with customers, deals, nested data, tasks and menu filtering](https://www.figma.com/community/file/1070947053216233487/crm-app-with-customers-deals-nested-data-tasks-and-menu-filtering)

- Open the link and click **"Open in Figma"** to copy it into your own drafts.
- Build the screens to match the design: layout, spacing, colours, typography and components.
- If a screen or state isn't in the design (loading, error, empty, mobile), design it yourself in the same style.

---

## Stack

- **Frontend:** React + Vite + React Router, with TypeScript preferred. Tailwind or CSS modules.
- **Backend:** Node + Express + MongoDB (Atlas).
- **Deployment:** frontend on Vercel or Netlify, backend on Render (or similar). Both must be live.

---

## Features

### 1. Authentication
- Register, login and logout.
- Keep the token in an **httpOnly cookie**, not localStorage.
- Add a `GET /api/auth/me` endpoint and call it when the app loads to restore the session. Any `401` must send the user back to the login page.
- Protect the frontend routes.

### 2. Customers
- Create, list, view, edit and delete customers (name, company, email, phone, status, notes).
- Search, filter by status, and **paginate on the server**.
- The customer detail page shows that customer's deals and tasks (the design's "nested data").

### 3. Deals
- Create, list, edit and delete deals (title, value, stage, expected close date, linked customer).
- **Pipeline board** view grouped by stage: Lead, Qualified, Proposal, Won, Lost. Changing a deal's stage must save to the database.

### 4. Tasks
- Create, list, edit and delete tasks (title, due date, priority, done/not done), linked to a customer and/or a deal.
- "Overdue" must be **calculated from the due date**, not chosen by hand.

### 5. Dashboard
- Total customers, open pipeline value, deals won this month, tasks due today and overdue tasks.
- One chart: pipeline value by stage.
- All numbers must come from **MongoDB aggregation on the server**. No hardcoded numbers.

### 6. Menu filtering
- The sidebar and list filters from the design, reflected in the URL (e.g. `?status=active`) so a refresh keeps them.

---

## Must-haves (these cost marks if missed)

Most of these came up in the last review round.

- **Data access**
  - Every query is filtered by the logged-in user. User A must never see or edit User B's data.
  - Return `404` for another user's records.
- **Validation**
  - Validate every request body with zod or Joi.
  - Bad input returns `400` with a clear message, never a `500`.
- **Security**
  - Rate limiting on login, register and password-reset routes.
  - `helmet`.
  - CORS allowlist only, and a blocked site gets `403`, not `500`.
  - Passwords hashed with bcrypt.
- **Configuration**
  - All settings in env variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `VITE_API_URL`.
  - No `localhost` in deployed code, and no fallback secrets.
  - `NODE_ENV=production` on the live server.
- **Deployment**
  - Refreshing any page (e.g. `/customers/123`) must work on the live site.
  - Add the SPA rewrite for Vercel or Netlify, and test it.
- **Code quality**
  - ESLint passes with 0 errors.
  - No `console.log` of passwords, tokens or emails.
  - No empty or leftover template files.
  - No component over roughly 400 lines.
- **UX**
  - Loading, empty and error states on every list and form.
  - Works on mobile (360px) and desktop.
- **Tests**
  - At least 5 backend API tests, including auth and one showing a user can't access someone else's data.
- **Git**
  - Commit in small steps across the whole two weeks: at least 20 commits, from your work GitHub account.
  - No single "initial dump" commit.
  - Messages should describe the change (not "fixed all").

---

## What to submit

1. GitHub repo link (public, or give me access)
2. Live frontend URL and live backend URL
3. A demo account (a test email, not your personal one), seeded with sample customers, deals and tasks
4. README with:
   - short description
   - screenshots
   - stack
   - setup steps
   - env variable table
   - API endpoint list
   - live links and the demo login
5. *(Optional)* A 2–3 minute screen recording walking through the app

---

## How it will be marked

| Area | Weight |
|---|---|
| Features working end to end | 30% |
| Match to the Figma design, responsiveness and UX states | 20% |
| Security and data access (must-haves above) | 20% |
| Code quality, structure, lint and tests | 15% |
| Deployment and README | 10% |
| Git history | 5% |

---

Post any questions in the group early, and share your repo link after the first 2–3 days so I can check progress.
