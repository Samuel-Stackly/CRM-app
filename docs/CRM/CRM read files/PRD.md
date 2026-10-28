# Mini CRM — Product Requirements Document

**Status:** Authoritative
**Last updated:** 2026-10-12
**Assigned by:** Sai Vishnu · **Assigned on:** 30 Sep 2026 · **Deadline:** Wed 14 Oct 2026, EOD

**Sources**
- `docs/RAW_DOC.md` — **source of truth for functional requirements.** Where anything in
  this PRD conflicts with RAW_DOC, RAW_DOC wins.
- `docs/DESIGN_SPEC.md` — source of truth for visual and screen requirements (derived from
  37 Figma exports in `docs/CRM app designs/`).
- `CLAUDE.md` — engineering conventions and workflow rules.

> **Scope discipline.** Every requirement below traces to RAW_DOC or DESIGN_SPEC. Nothing
> is invented. Where the two sources disagree, the conflict is stated explicitly in §2 and
> resolved in favour of RAW_DOC rather than papered over. Items the sources leave genuinely
> undetermined are listed in §13 as open questions, not specified as features.

---

## 1. Overview

### 1.1 Product
A full-stack Mini CRM. A registered user manages **their own** customers, deals and tasks,
and sees aggregate metrics on a dashboard. Data is strictly isolated per user — there are
no teams, roles or sharing.

### 1.2 Goals
1. Implement the six features in RAW_DOC §Features end to end.
2. Match the Figma design's layout, spacing, colours, typography and components.
3. Satisfy every RAW_DOC "Must-have", since those are explicitly mark-bearing.
4. Ship both halves live — frontend and backend — with a seeded demo account.

### 1.3 Grading weights (RAW_DOC)

| Area | Weight |
|---|---|
| Features working end to end | 30% |
| Match to Figma, responsiveness, UX states | 20% |
| Security and data access | 20% |
| Code quality, structure, lint, tests | 15% |
| Deployment and README | 10% |
| Git history | 5% |

These weights drive the build order in §14: features and security together are 50%.

### 1.4 Stack

| Layer | Requirement | Source |
|---|---|---|
| Frontend | React + Vite + React Router, TypeScript preferred | RAW_DOC |
| Styling | Tailwind **or** CSS Modules | RAW_DOC |
| Backend | Node + Express | RAW_DOC |
| Database | MongoDB Atlas | RAW_DOC |
| Validation | zod **or** Joi | RAW_DOC |
| Auth | JWT in httpOnly cookie, bcrypt | RAW_DOC |
| Testing | ≥ 5 backend API tests | RAW_DOC |
| Deployment | Frontend Vercel/Netlify, backend Render — both live | RAW_DOC |

`CLAUDE.md` narrows several of these (strict TypeScript, Zod specifically, bcryptjs,
Vitest). Those narrower choices are adopted; they are compatible with RAW_DOC.

---

## 2. Source Conflicts and Resolutions

The Figma file is a **property/real-estate CRM**. RAW_DOC specifies a **generic CRM**.
RAW_DOC §Design settles how to handle this:

> *"Build the screens to match the design… If a screen or state isn't in the design
> (loading, error, empty, mobile), design it yourself in the same style."*

**Therefore: RAW_DOC defines *what* is built; the design defines *how it looks*.** Where
the design shows fields the assignment does not list, those fields are out of scope; where
the assignment lists fields the design lacks, we design them in the design's style.

| # | Conflict | Resolution |
|---|---|---|
| C1 | Design's customer form has firstName/lastName/address/city/state/zip. RAW_DOC specifies **name, company, email, phone, status, notes**. | **Use RAW_DOC's fields.** Reuse the design's two-column form layout and field styling. Drop the address block. |
| C2 | Design's deals carry Room Area, # of People, Room Access, Room Images, Special Instructions. RAW_DOC specifies **title, value, stage, expected close date, linked customer**. | **Use RAW_DOC's fields.** Reuse the design's modal shell, field styling and footer pattern. |
| C3 | Design shows deal statuses `IN PROGRESS` / `CLOSED` in a table. RAW_DOC requires a **pipeline board grouped by stage: Lead, Qualified, Proposal, Won, Lost**. | **Build the pipeline board with RAW_DOC's five stages.** Style columns and cards with design tokens. A deals *list* is not required by RAW_DOC but the design provides one — see §6.2. |
| C4 | Design has no task priority. RAW_DOC requires **priority**. | Add a priority field and indicator, designed in-style. |
| C5 | Design has no customer status. RAW_DOC requires **status** plus a status filter and `?status=active`. | Add status. `active` is the only value RAW_DOC names — see Q1 in §13. |
| C6 | Design's dashboard shows counts, Next Appointment, Recent Deals, Deal Progress. RAW_DOC requires **5 specific metrics + a pipeline-value-by-stage chart**. | **Build RAW_DOC's metrics and chart.** Reuse the design's stat-card and card-header components. Next Appointment is out of scope (no appointment entity in RAW_DOC). |
| C7 | Design has a fully-specified **Activities** entity (CRUD, timeline, 2 toasts). RAW_DOC never mentions it. | **Out of scope.** Listed in §12 as a design-only element deliberately not built. |
| C8 | Design uses `Load More` everywhere. RAW_DOC requires **server-side pagination** and URL-reflected filters that survive refresh. | **Server-side pagination with `?page=` in the URL.** The designed `Load More` pill may drive the page increment, but the URL stays authoritative. See §7.4. |
| C9 | Design has no auth screens. RAW_DOC requires register/login/logout. | Design login and register in-style, per RAW_DOC's explicit instruction. |

---

## 3. Feature: Authentication

### 3.1 Functional requirements

| ID | Requirement | Source |
|---|---|---|
| A1 | User can **register** with credentials. | RAW_DOC |
| A2 | User can **log in**. | RAW_DOC |
| A3 | User can **log out**. | RAW_DOC |
| A4 | JWT is stored in an **httpOnly cookie**, never localStorage. | RAW_DOC |
| A5 | `GET /api/auth/me` exists and is called on app load to **restore the session**. | RAW_DOC |
| A6 | Any **`401` sends the user back to the login page.** | RAW_DOC |
| A7 | Frontend routes are **protected**; unauthenticated users cannot reach app pages. | RAW_DOC |
| A8 | Passwords hashed with **bcrypt**. | RAW_DOC |
| A9 | **Rate limiting** on login, register and password-reset routes. | RAW_DOC |
| A10 | Register and login bodies validated; bad input → `400` with a clear message. | RAW_DOC |
| A11 | Login and Register screens designed in the Figma style (not in the design set). | RAW_DOC §Design |

### 3.2 Acceptance criteria
- [ ] Registering creates a user whose password is stored only as a bcrypt hash.
- [ ] Logging in sets an httpOnly cookie; `document.cookie` does not expose the token.
- [ ] Reloading the browser keeps the user signed in, via `GET /api/auth/me`.
- [ ] Logging out clears the cookie; protected API routes then return `401`.
- [ ] A `401` from **any** API call redirects to `/login`.
- [ ] Visiting a protected route while logged out redirects to `/login`.
- [ ] Repeated failed logins are throttled (verify the limiter actually trips).
- [ ] Malformed register/login bodies return `400`, never `500`.

### 3.3 Out of scope
RAW_DOC mentions rate-limiting a "password-reset route" but **does not list password reset
as a feature**. No reset flow is built. If a reset route is added later it must be rate
limited. (Q2, §13.)

---

## 4. Feature: Customers

### 4.1 Data model
`name`, `company`, `email`, `phone`, `status`, `notes` (RAW_DOC), plus owner and timestamps.

### 4.2 Functional requirements

| ID | Requirement | Source |
|---|---|---|
| C-1 | **Create, list, view, edit and delete** customers. | RAW_DOC |
| C-2 | **Search** customers. | RAW_DOC |
| C-3 | **Filter by status.** | RAW_DOC |
| C-4 | **Paginate on the server** — not client-side slicing. | RAW_DOC |
| C-5 | The **customer detail page shows that customer's deals and tasks** (the design's "nested data"). | RAW_DOC |
| C-6 | Search, status filter and pagination compose correctly together. | Derived from C-2/3/4 |
| C-7 | All queries scoped to the logged-in user; another user's record → `404`. | RAW_DOC Must-haves |
| C-8 | List uses the design's table, toolbar (`Total: N customers`, Sort, Filter) and row styling. | DESIGN_SPEC §3.2, §4.2 |
| C-9 | Detail page uses the design's card + two-column form layout. | DESIGN_SPEC §4.3 |
| C-10 | Create/edit use the design's modal pattern: `Cancel` + `Save Customer` / `Delete` + `Done`. | DESIGN_SPEC §3.3 |
| C-11 | Delete raises the designed toast and is guarded by a confirmation (confirmation is self-designed). | DESIGN_SPEC §6.4 |

### 4.3 Acceptance criteria
- [ ] A customer can be created, viewed, edited and deleted; the list reflects each change
      without a manual reload.
- [ ] The list response includes pagination metadata (page, limit, total) sufficient to
      render controls.
- [ ] Searching returns matching customers from the **server**, not a filtered local array.
- [ ] Filtering by status narrows results and is reflected in the URL as `?status=…`.
- [ ] Search + status + page combine: the correct page of the correctly filtered set.
- [ ] Changing search or filter resets to page 1 rather than stranding an out-of-range page.
- [ ] The detail page lists that customer's **deals and tasks**.
- [ ] Requesting another user's customer id returns `404` on read, update **and** delete.
- [ ] Deleting prompts for confirmation, then shows the `Customer Deleted` toast.

---

## 5. Feature: Deals

### 5.1 Data model
`title`, `value`, `stage`, `expectedCloseDate`, `customer` (linked) (RAW_DOC), plus owner
and timestamps.

**Stages — exactly five, from RAW_DOC:** `Lead`, `Qualified`, `Proposal`, `Won`, `Lost`.

### 5.2 Functional requirements

| ID | Requirement | Source |
|---|---|---|
| D-1 | **Create, list, edit and delete** deals. | RAW_DOC |
| D-2 | **Pipeline board view grouped by stage.** | RAW_DOC |
| D-3 | **Changing a deal's stage must persist to the database.** | RAW_DOC |
| D-4 | Each deal is **linked to a customer**. | RAW_DOC |
| D-5 | Stage validated server-side against the five allowed values. | RAW_DOC Validation |
| D-6 | All queries scoped to the user; another user's deal → `404`. | RAW_DOC Must-haves |
| D-7 | Deal cards/columns styled with design tokens; chip styling from the design. | DESIGN_SPEC §2.1, §3 |
| D-8 | Create/edit modals follow the design's modal and footer pattern; customer chosen via the designed `Select Customer` picker. | DESIGN_SPEC §4.7 |
| D-9 | Save/delete raise the designed `Deal Saved` / `Deal Deleted` toasts. | DESIGN_SPEC §1.2 |

### 5.3 Acceptance criteria
- [ ] A deal can be created against a customer, edited and deleted.
- [ ] The pipeline board renders five columns in order: Lead, Qualified, Proposal, Won, Lost.
- [ ] Moving a deal to another stage **persists** — verified by reloading the page.
- [ ] An invalid stage value is rejected with `400`.
- [ ] A deal always references a customer belonging to the same user.
- [ ] Another user's deal id returns `404`.

### 5.4 Note on the deals list
RAW_DOC requires "list" and a pipeline board. The design supplies a full deals **table**.
Building both is consistent with the sources: the table satisfies "list" and the design
match, the board satisfies D-2. If time is short, the **board is mandatory** and the table
is the reducible one — the board is named explicitly in RAW_DOC, the table is not.

---

## 6. Feature: Tasks

### 6.1 Data model
`title`, `dueDate`, `priority`, `done` (RAW_DOC), linked to a **customer and/or a deal**,
plus owner and timestamps.

### 6.2 Functional requirements

| ID | Requirement | Source |
|---|---|---|
| T-1 | **Create, list, edit and delete** tasks. | RAW_DOC |
| T-2 | Tasks are **linked to a customer and/or a deal**. | RAW_DOC |
| T-3 | **"Overdue" is calculated from the due date, never chosen by hand** and never stored as an editable flag. | RAW_DOC |
| T-4 | Task carries a **priority**. | RAW_DOC |
| T-5 | Task carries a **done / not done** state. | RAW_DOC |
| T-6 | All queries scoped to the user; another user's task → `404`. | RAW_DOC Must-haves |
| T-7 | List uses the design's table and the **three-state checkbox**: teal check = complete, salmon check = completed late, salmon `!` octagon = incomplete and overdue; overdue rows render the due date in `--danger`. | DESIGN_SPEC §4.6 |
| T-8 | Create/edit modals follow the designed pattern (`Add New Task`, `Edit Task` with `Complete?`, due date, description). | DESIGN_SPEC §4.7 |
| T-9 | Priority indicator designed in-style (absent from the design). | C4, RAW_DOC §Design |

### 6.3 Acceptance criteria
- [ ] A task can be created, edited, completed and deleted.
- [ ] A task links to a customer and/or a deal, and appears on that customer's detail page.
- [ ] A task past its due date and not done is shown as **overdue**.
- [ ] A task marked done is **not** shown as overdue regardless of its due date.
- [ ] Overdue is correct immediately after a refresh with no write — proving calculation.
- [ ] Overdue cannot be set manually anywhere in the UI or accepted by the API.
- [ ] Priority can be set and is visible in the list.

---

## 7. Feature: Dashboard

### 7.1 Required metrics — exactly five, from RAW_DOC

| ID | Metric |
|---|---|
| DB-1 | Total customers |
| DB-2 | Open pipeline value |
| DB-3 | Deals won this month |
| DB-4 | Tasks due today |
| DB-5 | Overdue tasks |

### 7.2 Required chart — exactly one
**DB-6: pipeline value by stage.**

### 7.3 Functional requirements

| ID | Requirement | Source |
|---|---|---|
| DB-7 | **All numbers come from MongoDB aggregation on the server. No hardcoded numbers.** | RAW_DOC |
| DB-8 | No metric is computed by fetching collections and summing in JavaScript, server or client. | RAW_DOC (intent of DB-7) |
| DB-9 | Every aggregation pipeline **begins by matching the logged-in user**. | RAW_DOC Must-haves |
| DB-10 | Metrics rendered with the design's stat-card component and card-header pattern. | DESIGN_SPEC §4.1 |
| DB-11 | Chart designed in-style (no chart exists in the design). | RAW_DOC §Design |

### 7.4 Acceptance criteria
- [ ] All five metrics render with real values.
- [ ] The pipeline-value-by-stage chart renders.
- [ ] Each metric traces to an aggregation pipeline (reviewable in code).
- [ ] Dashboard figures agree with the corresponding list views for the same user.
- [ ] A second user's data never affects the first user's numbers.
- [ ] "Deals won this month" uses the current calendar month.
- [ ] "Tasks due today" uses the current day.

**Out of scope:** the design's Next Appointment card, Recent Deals widget and Deal Progress
timeline — none correspond to a RAW_DOC metric (C6, C7).

---

## 8. Feature: URL-Based Filtering

### 8.1 Functional requirements

| ID | Requirement | Source |
|---|---|---|
| U-1 | Sidebar and list filters from the design are **reflected in the URL** (e.g. `?status=active`). | RAW_DOC |
| U-2 | **A refresh keeps them.** | RAW_DOC |
| U-3 | Search term, status filter and page all live in the query string. | RAW_DOC §2 + §6 |
| U-4 | The URL is the single source of truth; component state must not diverge from it. | Derived from U-2 |
| U-5 | Managed through React Router. | RAW_DOC §Stack |

### 8.2 Acceptance criteria
- [ ] Applying a status filter puts `?status=…` in the URL.
- [ ] Refreshing the page reproduces the identical filtered, paginated view.
- [ ] Opening a copied URL in a new tab reproduces the same view.
- [ ] Browser back/forward moves through filter states correctly.
- [ ] Deep-linking `/customers?status=active&page=2` works on the **live** site (§11).

---

## 9. Security, Validation and Data Isolation

All items in this section are RAW_DOC **Must-haves** — explicitly mark-bearing, and 20% of
the total grade.

### 9.1 Data access
| ID | Requirement |
|---|---|
| S-1 | **Every** query filtered by the logged-in user. |
| S-2 | User A must never see or edit User B's data. |
| S-3 | Another user's record returns **`404`** (not `403`). |

### 9.2 Validation
| ID | Requirement |
|---|---|
| S-4 | **Every** request body validated with Zod. |
| S-5 | Bad input returns **`400` with a clear message, never `500`**. |

### 9.3 Security
| ID | Requirement |
|---|---|
| S-6 | Rate limiting on login, register and password-reset routes. |
| S-7 | `helmet` enabled. |
| S-8 | **CORS allowlist only**; a blocked origin gets **`403`, not `500`**. |
| S-9 | Passwords hashed with bcrypt. |
| S-10 | No `console.log` of passwords, tokens or emails. |

> **S-8 is easy to get wrong.** The default `cors` middleware throws on a disallowed
> origin, which Express surfaces as `500`. The origin callback must be written to produce a
> deliberate `403`.

### 9.4 Configuration
| ID | Requirement |
|---|---|
| S-11 | All settings in env vars: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `VITE_API_URL`. |
| S-12 | **No `localhost` in deployed code.** |
| S-13 | **No fallback secrets** (no `process.env.JWT_SECRET \|\| 'dev'`). |
| S-14 | `NODE_ENV=production` on the live server. |
| S-15 | No `.env` committed. |

### 9.5 Acceptance criteria
- [ ] An automated test proves a user cannot read another user's record (404).
- [ ] Equivalent manual checks pass for update and delete.
- [ ] Every POST/PUT/PATCH route rejects a malformed body with `400`.
- [ ] A request from a disallowed origin returns `403`.
- [ ] `grep` for `localhost` in deployed source returns nothing.
- [ ] `grep` for fallback secret patterns returns nothing.
- [ ] The server refuses to boot if a required env var is missing (satisfies S-13).
- [ ] No secret appears anywhere in git history.
- [ ] Cross-origin auth cookie works live: `sameSite: 'none'`, `secure: true`, exact CORS
      origin, `credentials: true`.

---

## 10. UI States and Responsiveness

### 10.1 Required states
RAW_DOC: *"Loading, empty and error states on every list and form."*

| ID | Requirement | Design coverage |
|---|---|---|
| X-1 | **Loading** state on every list and form. | ❌ Not designed — self-design |
| X-2 | **Empty** state on every list. | ✅ 15 crops supplied |
| X-3 | **Error** state on every list and form. | ❌ Not designed — self-design |
| X-4 | Field-level validation errors on every form. | ❌ Not designed — self-design |
| X-5 | Destructive-action confirmation. | ❌ Not designed — self-design |
| X-6 | Success toasts on write operations. | ✅ 8 toasts supplied |

**Empty-state pattern (from the design):** a `--muted` line icon followed by a `--muted`
sentence, centred in the container. Copy is sentence case with a trailing period
("No customers found."). Two deliberate deviations to preserve: only the appointment card
carries a CTA, and the dashboard tasks widget aligns top-left.

**Toast pattern:** black pill, 🎉 for saved/recorded, 🔥 for deleted, white semibold label,
circular close-X.

### 10.2 Responsiveness
RAW_DOC: *"Works on mobile (360px) and desktop."*

| ID | Requirement |
|---|---|
| X-7 | Usable end to end from **360px** through desktop. |
| X-8 | No horizontal page scroll and no clipped controls at 360px. |
| X-9 | The 90px left rail and ~418px right rail (508px of fixed chrome) must collapse — rail to a bottom bar or drawer, right rail stacked below the canvas. |
| X-10 | Multi-column tables become stacked cards at mobile width. |

**No responsive frames exist in the design** — all 14 screens are a single 1366px desktop
frame. X-9 and X-10 are self-designed per RAW_DOC §Design.

### 10.3 Acceptance criteria
- [ ] Every list and form demonstrably renders loading, empty and error states.
- [ ] Every form shows field-level validation errors.
- [ ] The app is usable end to end at 360px.
- [ ] No horizontal scroll at 360px on any screen.
- [ ] Deletes are confirmed before execution.

---

## 11. Deployment

| ID | Requirement | Source |
|---|---|---|
| P-1 | Frontend live on Vercel or Netlify. | RAW_DOC |
| P-2 | Backend live on Render or similar. | RAW_DOC |
| P-3 | **Both must be live.** | RAW_DOC |
| P-4 | **Refreshing any page (e.g. `/customers/123`) must work on the live site.** | RAW_DOC |
| P-5 | **Add the SPA rewrite for Vercel/Netlify and test it.** | RAW_DOC |
| P-6 | MongoDB Atlas, reachable from the backend host. | RAW_DOC |
| P-7 | A **seeded demo account** (test email, not personal) with sample customers, deals and tasks. | RAW_DOC |

### 11.1 Acceptance criteria
- [ ] Both URLs load.
- [ ] Hard-refreshing a deep link on the live frontend returns the app, not a 404.
- [ ] The demo account logs in on the live site and shows seeded data.
- [ ] The live frontend authenticates against the live backend (cross-origin cookie works).

---

## 12. Code Quality, Testing, Git and Submission

### 12.1 Code quality
| ID | Requirement |
|---|---|
| Q-1 | **ESLint passes with 0 errors.** |
| Q-2 | No `console.log` of passwords, tokens or emails. |
| Q-3 | **No empty or leftover template files.** |
| Q-4 | **No component over roughly 400 lines.** |
| Q-5 | Strict TypeScript; avoid `any`. *(CLAUDE.md)* |
| Q-6 | Production builds verified before deployment. *(CLAUDE.md)* |

> Q-3 currently fails: `server/src/app.ts` is an empty file and `client/src/` still holds
> the Vite starter template.

### 12.2 Testing
| ID | Requirement |
|---|---|
| Q-7 | **At least 5 backend API tests.** |
| Q-8 | Tests include **auth**. |
| Q-9 | Tests include **one proving a user cannot access someone else's data**. |
| Q-10 | Never claim tests pass unless actually run. *(CLAUDE.md)* |

### 12.3 Git
| ID | Requirement |
|---|---|
| Q-11 | **At least 20 commits**, from the work GitHub account. |
| Q-12 | **Committed in small steps across the whole two weeks.** |
| Q-13 | **No single "initial dump" commit.** |
| Q-14 | Messages describe the change (not "fixed all"). |

> **Schedule risk.** The repository currently has **zero commits** and the deadline is
> 14 Oct. Q-12 ("across the whole two weeks") can no longer be fully satisfied. Q-11, Q-13
> and Q-14 remain achievable and should be protected by committing in small increments from
> the first file onward.

### 12.4 Submission package
1. GitHub repo link (public, or access granted).
2. Live frontend URL and live backend URL.
3. Demo account credentials, seeded.
4. **README** containing: short description · screenshots · stack · setup steps ·
   **env variable table** · **API endpoint list** · live links · demo login.

---

## 13. Open Questions

Genuine ambiguities in the sources. None are features; each needs a one-line decision.

| # | Question | Blocks | Proposed default |
|---|---|---|---|
| Q1 | What are the allowed **customer status** values? RAW_DOC names only `active` (in the `?status=active` example). | Status filter, schema | `active` / `inactive` / `lead` — pending confirmation |
| Q2 | Is **password reset** in scope? RAW_DOC requires rate-limiting its route but never lists it as a feature. | Auth scope | Not built; §3.3 |
| Q3 | What are the allowed **task priority** values? RAW_DOC requires priority but names no values. | Task schema | `low` / `medium` / `high` |
| Q4 | Does "**open pipeline value**" exclude `Won` and `Lost`, or only `Lost`? | DB-2 aggregation | Exclude both — "open" = Lead + Qualified + Proposal |
| Q5 | Does the **pipeline chart** cover all five stages or only open ones? | DB-6 | All five |
| Q6 | Which fields does **customer search** match? | C-2 | name, company, email |
| Q7 | Does deleting a customer **cascade** to its deals and tasks, or block? | C-1, data integrity | Cascade-delete, warned in the confirm dialog |
| Q8 | Is a deal's **customer link required or optional**? RAW_DOC lists it as a field; the design makes it mandatory. | Deal schema | Required |
| Q9 | Are task links to customer/deal **both optional**? RAW_DOC says "and/or". | Task schema | Both optional, at most one of each |
| Q10 | **Tailwind or CSS Modules?** | First component | Tailwind |
| Q11 | **Font family** — not identifiable from raster exports. | Typography | Poppins or Inter, pending the Figma file |
| Q12 | Is the deals **table** (design) required alongside the **board** (RAW_DOC)? | Deals scope | Build board first; table if time allows (§5.4) |

**Q1, Q3, Q4 and Q10 block schema or first-component work and should be answered first.**

---

## 14. Mandatory vs. Optional

### 14.1 Mandatory — everything above
All requirements in §3–§12 are mandatory. RAW_DOC labels its Must-haves as
*"these cost marks if missed"*, and the feature list is the 30%-weighted core.

**Non-negotiable subset** (explicitly called out in RAW_DOC as prior-review failures):
user-scoped queries · `404` for other users' records · Zod on every body · `400` not `500`
· rate limiting · helmet · CORS allowlist with `403` · bcrypt · env-var config · no
localhost · no fallback secrets · SPA rewrite tested live · 0 ESLint errors · ≥ 5 backend
tests incl. cross-user · loading/empty/error everywhere · 360px support · ≥ 20 commits.

### 14.2 Optional — explicitly optional in RAW_DOC
| Item | Source |
|---|---|
| A 2–3 minute screen-recording walkthrough | RAW_DOC §What to submit, marked *(Optional)* |

### 14.3 Optional — reducible scope if time runs short
Items supported by a source but not named in RAW_DOC's feature list. Drop these before
dropping anything in §14.1.

| Item | Rationale |
|---|---|
| Deals **table** view | Board is the RAW_DOC requirement (§5.4, Q12) |
| Sort control on list pages | In the design; not in RAW_DOC |
| Avatar upload for customers | In the design; not in RAW_DOC's field list |
| Designed hover/focus/pressed states beyond defaults | Polish; not required |
| Dashboard widgets beyond the 5 metrics + 1 chart | Not in RAW_DOC (§7.4) |

### 14.4 Out of scope — deliberately not built
| Item | Why |
|---|---|
| **Activities** entity (CRUD, timeline, toasts) | Fully designed, but absent from RAW_DOC (C7) |
| **Next Appointment** card and appointment entity | Absent from RAW_DOC (C6) |
| Room area / # of people / room access / room images | Design-only deal fields (C2) |
| Customer postal address block | Design-only (C1) |
| Password reset flow | Not a listed feature (Q2) |
| Teams, roles, sharing, notifications, import/export | In no source |

---

## 15. Build Order

Ordered by dependency and by the §1.3 grading weights.

| Phase | Work | Weight served |
|---|---|---|
| 0 | Answer Q1, Q3, Q4, Q10. Fix `.gitignore`, remove the orphan root lockfile, **first commit**. | Git 5% |
| 1 | Server skeleton: env validation (fails fast, no fallbacks), helmet, CORS allowlist → `403`, cookie-parser, error handler, Mongo connection, `app` exported separately for tests. | Security 20% |
| 2 | Auth end to end + rate limiting + the first API tests. | Features, Security |
| 3 | Design tokens, primitives, app shell, router with protected routes. | Design 20% |
| 4 | State kit: loading, empty, error, toast, confirm dialog. | Design 20% |
| 5 | Customers: CRUD, search, status filter, server pagination, URL sync, nested deals/tasks. | Features 30% |
| 6 | Deals: CRUD + pipeline board with persisted stage changes. | Features 30% |
| 7 | Tasks: CRUD + calculated overdue + priority. | Features 30% |
| 8 | Dashboard: 5 aggregation metrics + pipeline chart. | Features 30% |
| 9 | Responsive pass to 360px. | Design 20% |
| 10 | Remaining tests to ≥ 5 incl. cross-user, lint to 0, prod builds. | Quality 15% |
| 11 | Deploy both halves, SPA rewrite tested, seed demo account, README. | Deploy 10% |

**Critical path:** 0 → 1 → 2 → 3 → 5. Phases 6 and 7 can follow 5 in either order; phase 8
must come last among features because it aggregates all of them.
