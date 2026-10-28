# Mini CRM — Design Specification

**Status:** Complete for the supplied set
**Last updated:** 2026-10-12
**Source:** `docs/CRM app designs/` — 37 PNG files, all inspected
**Companion documents:** `docs/PRD.md`, `CLAUDE.md`

> **Supersedes** the earlier draft of this file, which was based on an interim set of two
> JPG exports. Those JPGs are gone; this version is derived entirely from the 37 PNGs.
> Colors below were sampled programmatically from the lossless PNGs and are reliable.
> JPEG-era values in the previous draft (e.g. `#514EF2`) were compression-shifted and have
> been corrected. Geometry is measured against the 1366px-wide frames and is accurate to a
> pixel or two. Anything not verifiable from the files is listed in §9, not guessed at.

---

## 1. Screen Inventory

All 37 files opened successfully. **No file failed to inspect.**

### 1.1 Full screens (1366px wide) — 14

| File | Height | Type | Feature |
|---|---|---|---|
| `Dashboard.png` | 910 | Page | Dashboard |
| `Customers.png` | 910 | Page | Customers list |
| `Customer Detail.png` | 910 | Page | Customers detail |
| `Deals.png` | 910 | Page | Deals list |
| `Deal Detail.png` | 1116 | Page (scrolls) | Deals detail |
| `Tasks.png` | 910 | Page | Tasks list |
| `Add New.png` | 910 | Modal | Global create chooser |
| `Add New Customer.png` | 910 | Modal | Customers create |
| `Add New Deal.png` | 1256 | Modal (scrolls) | Deals create |
| `Add New Task.png` | 910 | Modal | Tasks create |
| `Edit Deal.png` | 1170 | Modal (scrolls) | Deals edit |
| `Edit Task.png` | 910 | Modal | Tasks edit |
| `Edit Activity.png` | 910 | Modal | Activity edit |
| `Select Customer.png` | 910 | Modal | Customer picker |
| `Coming Soon.png` | 910 | Modal | Demo placeholder |

### 1.2 Toast alerts (347×120) — 8

`Alert - Customer Saved` · `Alert - Customer Deleted` · `Alert - Deal Saved` ·
`Alert - Deal Deleted` · `Alert - Task Saved` · `Alert - Task Deleted` ·
`Alert - Activity Recorded` · `Alert - Activity Deleted`

A perfectly symmetrical saved/deleted pair for each of the four entities.

### 1.3 Empty-state crops — 15

| File | Size | Belongs to |
|---|---|---|
| `Customers - No Results.png` | 1276×110 | Customers table |
| `Deals - No Results.png` | 1276×110 | Deals table |
| `Tasks - No Results.png` | 1276×110 | Tasks table |
| `Dashboard Customers Count - No Results.png` | 268×168 | Dashboard stat card |
| `Dashboard Deals Count - No Results.png` | 268×168 | Dashboard stat card |
| `Dashboard Next Appointment - No Results.png` | 268×314 | Dashboard appointment card |
| `Dashboard Tasks - No Results.png` | 368×317 | Dashboard tasks widget |
| `Dashboard Deal Progress - No Results.png` | 519×360 | Dashboard progress card |
| `Dashboard Deal Progress Activity Log - No Results.png` | 519×200 | Dashboard activity timeline |
| `Dashboard Recent Deals - No Results.png` | 519×51 | Dashboard recent deals |
| `Dashboard Customers - No Results.png` | 416×51 | Dashboard customers rail |
| `Customer Detail - Recent Deals - No Results.png` | 417×48 | Customer detail rail |
| `Deal Detail -Activity Log - No Results.png` | 417×48 | Deal detail rail |
| `Select Customer - No Results.png` | 400×78 | Customer picker |

### 1.4 Grouping by feature and state

| Feature | List | Detail | Create | Edit | Empty | Toasts |
|---|---|---|---|---|---|---|
| **Dashboard** | — | ✅ | — | — | ✅ ×7 | — |
| **Customers** | ✅ | ✅ | ✅ | ⚠️ inline | ✅ ×3 | ✅ ×2 |
| **Deals** | ✅ | ✅ | ✅ | ✅ | ✅ ×4 | ✅ ×2 |
| **Tasks** | ✅ | ❌ none | ✅ | ✅ | ✅ ×2 | ✅ ×2 |
| **Activities** | — | ✅ in rail | ✅ in rail | ✅ | ✅ ×2 | ✅ ×2 |
| **Auth** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 2. Design System

### 2.1 Color — all sampled from PNG source

**Core**

| Token | Hex | Use |
|---|---|---|
| `--primary` | `#646AF5` | Buttons, active nav, links, chip text, timeline dots, appointment card |
| `--ink` | `#043B5E` | Headings, page titles, stat numbers, body text, logo tile |
| `--muted` | `#90A3B1` | Secondary text, table column headers, placeholders |
| `--canvas` | `#F7FBFD` | App background, table rows, input fills |
| `--rail` | `#F1F7FB` | Right rail, modal customer band |
| `--surface` | `#FFFFFF` | Cards, modals, table header, pills |

**Semantic**

| Token | Hex | Use |
|---|---|---|
| `--success` | `#2FCFB6` | Completed task checkbox, dashboard customers circle |
| `--danger` | `#FF9595` | Overdue dates, overdue icons, Delete links, deals circle |
| `--chip-bg` | `#EFF0FE` | Status chip background |
| `--toast-bg` | `#000000` | Toast surface |
| `--warm` | `#FFF4E1` | Coming Soon emoji circle |

**Three findings worth noting:**

1. **`--success` and `--danger` double as decorative accents.** The teal is both the
   completed-task checkmark and the dashboard Customers icon circle; the salmon is both
   the overdue indicator and the Deals icon circle. Treat them as one palette, but do not
   assume a teal circle means "success" on the stat cards.
2. **Deal status chips do not encode stage in color.** `IN PROGRESS` and `CLOSED` use the
   identical `#EFF0FE` background and `#646AF5` text. Stage is conveyed by **text only**.
   If stage-distinct colors are wanted, that is a design addition, not a design reading.
3. **The modal scrim is semi-transparent black**, not a solid fill — sampling returned
   transparent pixels. The flattened preview reads around 50% black. Exact alpha unknown.

### 2.2 Typography

**The font family cannot be identified from a raster export.** The letterforms are a
geometric sans consistent with Poppins/Inter, but this is an observation, not a fact.
See §9.

| Role | Size | Weight | Color |
|---|---|---|---|
| Page title | ≈ 26px | Bold | `--ink` |
| Stat number | ≈ 54px | Bold | `--ink` |
| Modal title | ≈ 19px | Bold | `--ink` |
| Card heading | ≈ 18px | Semibold | `--ink` |
| Deal detail address | ≈ 30px | Bold | `--ink` |
| Table cell / item title | ≈ 16px | Medium–Semibold | `--ink` |
| Field label | ≈ 14px | Semibold | `--ink` |
| Table column header | ≈ 15px | Regular | `--muted` |
| Secondary / meta | ≈ 14px | Regular | `--muted` |
| Link | ≈ 14px | Semibold | `--primary` |
| Status chip | ≈ 11–12px | Semibold, uppercase, tracked | `--primary` |
| Toast label | ≈ 15px | Semibold | `#FFFFFF` |

### 2.3 Spacing, radius, elevation

Measured, with the caveat in §9 that the underlying grid is unconfirmed:

- **Shell:** left rail 90px · topbar 90px · main canvas ≈ 858px · right rail ≈ 418px.
- **Page gutter:** ≈ 25px from the rail edge; content starts x ≈ 115.
- **Card gap:** ≈ 26px between dashboard cards.
- **Radius:** cards ≈ 16px · inputs ≈ 10px · modals ≈ 14px · chips and pill buttons fully
  rounded · icon buttons circular · toasts ≈ 10px.
- **Control heights:** inputs ≈ 52px · pill buttons ≈ 46px · icon buttons 44–46px ·
  table rows ≈ 80px.
- **Elevation:** very soft, wide, low-opacity shadows on cards, modals and pill buttons.
  Exact blur/offset/opacity are not recoverable from a flattened raster.

### 2.4 Iconography

Line icons, ~1.5px stroke, rounded caps, drawn in `--muted` when inactive and white on
`--primary` when active. Observed glyphs: grid, briefcase, people, checklist, calendar,
bell (with dot badge), gear, magnifier, pencil, trash, plus, arrow-right, chevron-down,
filter, close-X, alert-octagon, checkmark, activity-bars.

**The source icon library is unknown** — glyphs are rasterized. They will need
re-sourcing from an equivalent line set (Feather/Lucide are close in weight and radius).

**Toasts use emoji, not icons:** 🎉 for every saved/recorded toast, 🔥 for every deleted
toast. This is unambiguous across all 8 files.

---

## 3. Shared Component Inventory

Ordered by reuse count — this is the build order for the component layer.

| # | Component | Instances | Variants observed |
|---|---|---|---|
| 1 | **App shell** | 6 pages | Right rail present/absent/variable width |
| 2 | **Icon button (circular)** | 20+ | white / primary-filled / with-badge; 44–46px |
| 3 | **List row** | 10+ | avatar or thumbnail · 1–2 line text · trailing meta, chip, action or arrow |
| 4 | **Data table** | 3 pages | leading icon column · N columns · trailing Edit column |
| 5 | **Form field** | 25+ | text · textarea · date (calendar affordance) · select (chevron) · file ADD |
| 6 | **Modal dialog** | 8 | sizes ≈ 400 / 500 / 620px wide; scrim; close-X top-right |
| 7 | **Pill button** | 15+ | primary filled · white · text-only (`Cancel`) · danger text (`Delete`) |
| 8 | **Card** | 12+ | white, radius 16, soft shadow |
| 9 | **Card header** | 8 | title + trailing link ("View All") or `+` FAB |
| 10 | **Empty state** | 15 | icon + sentence; centered or inline; one has a CTA |
| 11 | **Toast** | 8 | black pill, emoji, label, close-X |
| 12 | **Avatar** | 20+ | 46px list · 96px profile · 36px band; grey circle = no image |
| 13 | **Status chip** | 2 | `IN PROGRESS` · `CLOSED` (same colors) |
| 14 | **"Load More"** | 7 | text link · white pill button (tables) |
| 15 | **Timeline** | 3 | ringed dot + connector; date over text; optional image |
| 16 | **Toolbar** | 3 | Total count (left) · Sort by + Filter (right) |
| 17 | **Stat card** | 2 | label, big number, tinted icon circle |
| 18 | **Checkbox** | 5+ | unchecked · teal checked · red overdue |

### 3.1 Application shell

```
┌────┬──────────────────────────────────────┬──────────────────────┐
│    │ Topbar  (h 90)                       │                      │
│Rail├──────────────────────────────────────┼──────────────────────┤
│ 90 │ Main canvas                          │ Right rail ≈418      │
└────┴──────────────────────────────────────┴──────────────────────┘
```

**Left rail** — logo tile 44×44, radius ≈ 12, `--ink` fill, white mark, in the topbar
band. Below it seven circular nav buttons, 44px, gap ≈ 22px, first at y ≈ 135.
Active = `--primary` fill + white icon. Inactive = white fill + `--muted` icon.

Nav order and confirmed mapping (from which item is active on each page):

| # | Icon | Destination | Confirmed by |
|---|---|---|---|
| 1 | Grid | Dashboard | `Dashboard.png` |
| 2 | Briefcase | Deals | `Deals.png`, `Deal Detail.png` |
| 3 | People | Customers | `Customers.png`, `Customer Detail.png` |
| 4 | Checklist | Tasks | `Tasks.png` |
| 5 | Calendar | — | never active |
| 6 | Bell (dot badge) | — | never active |
| 7 | Gear | — | never active |

**Items 1–4 are now confirmed** (the earlier draft could only confirm two). Items 5–7 have
no corresponding screen; `Coming Soon.png` is almost certainly what they open.

**Topbar** — page title left at x ≈ 115. Right cluster: a context-specific primary pill
button, then a circular search button, then the avatar.

| Page | Primary button |
|---|---|
| Dashboard | `Add New +` |
| Customers | `Add New Customer +` |
| Deals | `Add New Deal +` |
| Tasks | `Add New Task +` |
| Customer Detail | none |
| Deal Detail | none |

**Right rail** — background `--rail`. Width varies: ≈ 418px on Dashboard, Customer Detail
and Deal Detail. Absent on the three list pages, where the table spans full width.

### 3.2 Data table

Used by Customers, Deals and Tasks — identical structure.

- **Toolbar above the table:** `Total: N customers` (bold `--ink`) on the left; on the
  right a white `Sort by: <field>` pill with a chevron and a white `Filter` pill with a
  filter icon.
- **Header row:** a leading icon cell (entity glyph), then `--muted` column labels, then a
  right-aligned `Edit` label. Separated from the body by a hairline.
- **Body rows:** ≈ 80px tall, hairline dividers, trailing pencil icon button.
- **Footer:** a centered white `Load More` **pill button** (note: the dashboard and rails
  use a *text link* instead — two distinct variants).

Columns per entity:

| Entity | Columns |
|---|---|
| Customers | avatar · Name · Email · Phone · Address · Edit |
| Deals | thumbnail · Name (address) · Area · Appointment Date · Price · Status · Edit |
| Tasks | checkbox · Due Date · Task · Edit |

### 3.3 Modal dialogs

Consistent anatomy: scrim, white surface, radius ≈ 14, title top-left bold `--ink`,
circular grey close-X top-right, body, then a right-aligned footer action row.

| Modal | Width | Footer |
|---|---|---|
| `Add New` | ≈ 240 | none (menu) |
| `Add New Task` | ≈ 400 | `Cancel` · `Save Task` |
| `Edit Task` | ≈ 400 | `Delete` (danger text) · `Done` |
| `Edit Activity` | ≈ 400 | `Delete` (danger text) · `Done` |
| `Select Customer` | ≈ 400 | none; `Add New` link in header |
| `Coming Soon` | ≈ 540 | full-width `Close` |
| `Add New Customer` | ≈ 620 | `Cancel` · `Save Customer` |
| `Add New Deal` | ≈ 620 | `Progress` select + `Cancel` · `Save Deal` |
| `Edit Deal` | ≈ 620 | `Progress` select + `Done` |

**Create vs. edit is a consistent rule:** create modals end in `Cancel` + `Save <Entity>`;
edit modals end in `Delete` + `Done`. Build one modal footer component with both modes.

---

## 4. Page-by-Page Specification

### 4.1 Dashboard

Main canvas is a two-column grid — left ≈ 265px, right ≈ 517px, gap ≈ 26px, from y ≈ 110.

**Left column**

1. **Next Appointment** — `--primary` fill, white text, radius 16, ≈ 265×385. Heading with
   a white status dot; avatar + two-line address; "Appointment Date" + value; a two-up
   stat row (`Room Area 100 M²` · `People 10`); footer with `Price $5750` and a white
   `See Detail` pill. A lighter decorative curve sits in the lower right.
2. **Customers stat card** — `Customers` / `78` / teal `#2FCFB6` circle with people glyph.
3. **Deals stat card** — `Deals` / `136` / salmon `#FF9595` circle with briefcase glyph.

**Right column**

1. **Recent Deals** — card header with `View All`; four list rows (thumbnail · two-line
   address · right-aligned price over date).
2. **Deal Progress** — header row (thumbnail · address · `IN PROGRESS` chip · circular
   arrow button), then an **activity timeline** (ringed primary dots on a connector, date
   over description), then a centered `Load More` text link.

**Right rail**

1. **Customers** — header + `View All`; three rows (avatar · name over email · pencil).
   Rendered directly on the rail, **not** in a card.
2. **Tasks To Do** — white card. Header + `View All`. Six rows: date column · optional red
   alert dot · title. **Overdue rows render the date in `--danger` with a red dot.**
   Footer: an `Add new task` inline input with a trailing circular arrow button.

### 4.2 Customers list

Toolbar (`Total: 78 customers`, Sort by: Date Created, Filter) → table → `Load More` pill.
Row click → Customer Detail. Pencil → edit.

### 4.3 Customer Detail

- **Main canvas:** one white card. A ≈ 810×205 banner holding an abstract grey-lavender
  wave image, with a 96px avatar overlapping its lower-left carrying a `--primary` pencil
  badge, and a white circular **trash** button at its lower-right.
- **Form:** First Name · Last Name / Email · Phone / Address (full width) / City ·
  State/Province · Zip Code. Inputs `--canvas` fill, no visible border, ≈ 52px, radius 10.
- **Right rail:** `Recent Deals` header with a `--primary` circular `+` FAB; three rows
  (thumbnail · address · `Nov 14, 09:00 • $ 6000`); `Load More` link.

**There is still no Save button on this screen** — see §9.2.

### 4.4 Deals list

Same structure as Customers. Status column renders the chip. Only two stage values appear
anywhere in the entire design set: **`IN PROGRESS`** and **`CLOSED`**.

### 4.5 Deal Detail (1366×1116)

- **Customer strip** at top: avatar · `Customer` / name · `Email` / value · `Phone` /
  value — labels `--muted` above bold `--ink` values.
- **Address block:** large two-line address with circular **trash** and **pencil** buttons
  on the right.
- **Attribute grid**, label over value, three rows of two: `Progress` / In Progress ·
  `Appointment Date`; `Room Area` / 25 M² · `Number of people` / 10; `Price` / $6000 ·
  `Room Access` / Keys with doorman. Then `Special Instructions` paragraph. A large square
  image placeholder sits at the right of the grid.
- **Right rail — `Record Activity` card:** `Description` textarea ("Write your notes"), a
  date field with a calendar icon, an `Images` `ADD` dropzone, and a right-aligned
  `--primary` `Save` pill.
- **Right rail — `Activity Log`:** timeline entries, each a ringed dot, date, description
  and an optional attached image; `Load More` link at the bottom.

### 4.6 Tasks list

Toolbar reads `Total: 23 tasks`, `Sort by: Due Date`. Columns: checkbox · Due Date · Task
· Edit.

**The checkbox column encodes three distinct states** — this is the clearest statement of
the overdue rule anywhere in the set:

| Visual | Meaning |
|---|---|
| Teal `#2FCFB6` square with white check | Complete |
| Salmon `#FF9595` square with white check | Complete, but was overdue |
| Salmon `#FF9595` octagon with `!` | Incomplete and overdue |
| Empty / no control | Incomplete, not overdue |

Overdue rows also render the **due date** in `--danger`. Non-overdue rows use `--ink`.

### 4.7 Modals

- **`Add New`** — a small menu offering **`Deal`** and **`Customer`** only. **Task is not
  offered**, consistent with tasks being created from their own page or the dashboard
  widget.
- **`Add New Customer`** — Avatar `ADD` dropzone, then the same seven fields as the detail
  form. `Cancel` · `Save Customer`.
- **`Add New Deal`** — a `--rail` band at the top showing the selected customer with a
  white `Change Customer` pill (which opens `Select Customer`), then Room Images `ADD`,
  Address block, `Room Area (m2)` · `# of People`, `Appointment Date` (date field),
  `Special Instructions`, `Room Access` (select, "Keys with doorman") · `Price ($)`, and a
  footer with a `Progress` select ("In Progress") beside `Cancel` · `Save Deal`.
- **`Edit Deal`** — identical body minus the customer band; footer `Progress` select +
  `Done`.
- **`Add New Task`** — description textarea + `Due Date`; `Cancel` · `Save Task`.
  **No priority field.**
- **`Edit Task`** — `Complete?` label with a teal checkbox, `Due Date` ("1:26 pm 25 Nov
  2021" — so due date carries a **time**, not just a date), `Description`;
  `Delete` · `Done`.
- **`Edit Activity`** — description, datetime, `Images` `ADD`; `Delete` · `Done`.
- **`Select Customer`** — header with an `Add New` link; six avatar rows with trailing
  arrows; `Load More`.
- **`Coming Soon`** — 👍 in a `#FFF4E1` circle, `DEMO VERSION ONLY` eyebrow, `Sorry.`
  headline, explanatory copy, full-width `Close` pill.

---

## 5. Interaction and Navigation

### 5.1 Navigation map (verified from the files)

```
Dashboard ──┬─ Add New ──┬─ Deal ──────→ Add New Deal ──→ Select Customer
            │            └─ Customer ──→ Add New Customer
            ├─ Customers "View All" ──→ Customers
            ├─ Customers row pencil ──→ Customer Detail
            ├─ Recent Deals "View All" → Deals
            ├─ Deal Progress arrow ───→ Deal Detail
            └─ Tasks "View All" ──────→ Tasks

Customers ──→ Customer Detail ──→ (rail +) ──→ Add New Deal
Deals ──────→ Deal Detail ──┬─ pencil ──→ Edit Deal
                            ├─ trash ───→ Deal Deleted toast
                            └─ Activity Log entry ──→ Edit Activity
Tasks ──────→ pencil ──→ Edit Task
Nav 5,6,7 ──→ Coming Soon
```

### 5.2 Confirmed interaction rules

1. **Create → `Cancel` + `Save <Entity>`. Edit → `Delete` + `Done`.** Universal across all
   8 modals.
2. **Every successful write raises a toast** — the 8 alert files map exactly onto the
   write operations: customer/deal/task/activity × saved/deleted.
3. **Deletion is reachable from three places**: the Customer Detail banner trash, the Deal
   Detail trash, and the `Delete` link inside edit modals.
4. **"Load More" is the pagination idiom everywhere** — 7 instances, in two visual
   variants (white pill in tables, text link in cards/rails).
5. **Sort and Filter exist on all three list pages**, as closed pills. Their open states
   are not designed (§9.2).
6. **The deal→customer relationship is explicit**: a deal is created against a selected
   customer, changeable via `Change Customer` → `Select Customer`.

---

## 6. Empty, Loading, Error and Responsive States

### 6.1 Empty states — comprehensively designed (15 files)

This is the strongest part of the set. The pattern is a `--muted` line icon followed by a
`--muted` sentence, horizontally centered in the container the data would have filled.

| Context | Copy | Layout |
|---|---|---|
| Customers table | "No customers found." | Centered in a 110px band |
| Deals table | "No deals found." | Centered in a 110px band |
| Tasks table | "No tasks found." | Centered in a 110px band |
| Dashboard Customers count | `0` | Stat card renders zero, greyed icon circle |
| Dashboard Deals count | `0` | Stat card renders zero, greyed icon circle |
| Dashboard Next Appointment | "No upcoming appointments." + **`Add Deal?` white pill** | Centered on the primary card |
| Dashboard Tasks | "No upcoming tasks found." | **Top-left aligned**, not centered |
| Dashboard Deal Progress | "No deals in progress." | Centered in the card |
| Dashboard Activity Log | "No activity logged." | Centered |
| Dashboard Recent Deals | "No deals found." | Inline, left-aligned, 51px |
| Dashboard Customers rail | "No customers found." | Inline, left-aligned, 51px |
| Customer Detail rail | "No deals found." | Inline, left-aligned |
| Deal Detail activity rail | "No activity found." | Inline, left-aligned |
| Select Customer | "No customers found." | Inline in the modal |

**Two deviations to respect rather than normalize away:**
- Only **Next Appointment** carries a CTA (`Add Deal?`). Every other empty state is
  passive.
- **Dashboard Tasks** aligns top-left while comparable widgets center. This appears
  deliberate — the widget is tall and a centered line would float oddly.

Copy is consistently sentence case with a trailing period, and consistently "No X found."
except the three contextual ones ("No upcoming appointments.", "No upcoming tasks found.",
"No deals in progress.", "No activity logged.").

### 6.2 Loading states — **not designed**

Zero of 37 files show a spinner, skeleton or progress indicator. Every list, table, card,
rail and modal needs one and none is specified. See §9.2.

### 6.3 Error states — **not designed**

No field-level validation error, no form-level error summary, no failed-request panel, no
retry affordance, no 404/500 page, no offline state. The field styling has no error
treatment and no message slot — yet `CLAUDE.md` mandates Zod validation with clear errors.

The only "something went wrong" surface in the entire set is `Coming Soon.png`, which is a
demo placeholder, not an error. Its layout (icon circle, eyebrow, headline, body, full-width
action) is nonetheless a usable **template** for an error dialog.

### 6.4 Destructive confirmation — **not designed**

Three trash/Delete affordances exist and **not one confirmation dialog** is supplied. The
toasts confirm deletion *after the fact*. Deleting a customer with deals and activities is
irreversible and currently has no designed guard.

### 6.5 Responsive — **not designed**

All 14 full screens are a single 1366px desktop frame. `CLAUDE.md` requires 360px upward.
There is no tablet or mobile layout and no indication of how the shell collapses.

The hard constraint: **the 90px rail + 418px right rail = 508px of fixed chrome**, more
than a 360px viewport in total. The rail must become a bottom bar or drawer, and the right
rail must stack below the main canvas or move into tabs. Tables with 6–7 columns (Deals)
cannot render at 360px without becoming stacked cards. **None of this is specified.**

### 6.6 Other missing interaction states

No hover, focus, active, disabled, or loading-button state for any control; no open state
for the Sort or Filter pills; no focused or error input state; no date-picker or select-open
state.

---

## 7. Mapping to Assignment Requirements

| `CLAUDE.md` requirement | Coverage | Notes |
|---|---|---|
| **Auth** — register, login, logout, session restore | ❌ **None** | No screens whatsoever. Entirely self-designed. |
| Customers — CRUD | ✅ Full | List, detail, create modal, delete, toasts |
| Customers — search | ⚠️ Icon only | Topbar magnifier; no expanded field, results or no-results-for-query state |
| Customers — status filter | ❌ **Conflict** | A `Filter` pill exists but no panel, and **the customer model has no status field** in any form |
| Customers — server-side pagination | ⚠️ **Conflict** | Design uses `Load More`; requirement says paginate. §8.1 |
| Deals — CRUD | ✅ Full | List, detail, create, edit, delete, toasts |
| Deals — pipeline stages | ⚠️ Partial | Only `IN PROGRESS` / `CLOSED`; a `Progress` select exists but its options are never shown open |
| Tasks — CRUD | ✅ Full | List, create, edit (with delete), toasts |
| Tasks — due dates | ✅ Full | With time-of-day |
| Tasks — priorities | ❌ **None** | No priority field in create or edit, no column, no indicator |
| Tasks — overdue calculated | ✅ **Excellent** | Three-state checkbox + red date, across list and dashboard |
| Dashboard — metrics | ⚠️ Partial | Two counts, appointment, recent deals, progress, tasks |
| Dashboard — **pipeline values** | ❌ **None** | No per-stage value aggregation, chart or breakdown anywhere |
| URL-synced filters | ❌ N/A | No filter UI designed to sync |
| Loading / empty / error | ⚠️ 1 of 3 | Empty is thorough; loading and error absent |
| Mobile from 360px | ❌ **None** | Desktop only |

---

## 8. Conflicts Requiring a Decision

### 8.1 Pagination: `Load More` vs. server-side pagination

`CLAUDE.md` requires server-side pagination and URL-persisted filters. The design uses
`Load More` in 7 places. Load More is still server-side paging, but it **appends**, and N
appended pages cannot be restored from a single `?page=` on refresh without refetching all
of them — which collides with the URL-filter requirement.

**Recommendation:** keep `Load More` exactly as designed on dashboard widgets and rails
(no filter state to preserve there), and implement the three **list pages** with a `page`
parameter in the URL. The designed `Load More` pill can drive `page+1` while the URL stays
authoritative. **Needs sign-off.**

### 8.2 The design is a property/real-estate CRM

Now unambiguous across the full set. Deals carry `Room Area (m2)`, `# of People`,
`Room Access` ("Keys with doorman"), `Room Images`, `Special Instructions`, an
`Appointment Date`, and an address as their *name*. The dashboard leads with
`Next Appointment`.

`CLAUDE.md` describes a generic CRM and never mentions rooms, appointments or viewings. It
also requires three fields the design does not have (customer **status**, task
**priority**, pipeline **value by stage**).

There is also a **fourth entity** the requirements never mention: **Activities**, with full
CRUD, its own two toasts, a timeline UI and an image attachment. It is as well-specified as
Tasks.

**This must be decided explicitly.** Options:
- **(a) Generic CRM, design language only** — build Customer/Deal/Task per `CLAUDE.md`,
  borrow the shell, palette and components, drop room/appointment fields, add status and
  priority. Satisfies the assignment; diverges visibly from the mockups.
- **(b) Follow the design** — implement rooms, appointments and activities. Matches the
  mockups; adds scope beyond the assignment and still leaves status/priority/pipeline-value
  undesigned.
- **(c) Hybrid** — generic core entities, plus Activities (it is fully designed and maps
  cleanly to a CRM "notes/interactions" concept), with room fields as optional deal
  metadata.

I recommend **(a)** for assignment compliance, with the shell and components built exactly
as designed. **This is the single highest-impact open decision and it blocks the data
model.**

### 8.3 Fields required by the assignment but absent from the design

| Field | Needed for | Status in design |
|---|---|---|
| Customer `status` | Status filter requirement | **Absent** — not in any form or column |
| Task `priority` | Priority requirement | **Absent** — not in create or edit modal |
| Deal stage set | Pipeline stages | Only 2 values observed; select never shown open |
| Deal value by stage | Dashboard pipeline values | **No visualization exists** |

Each needs its values defined and its UI designed by us.

---

## 9. Uncertainties and Missing Designs

### 9.1 Not recoverable from raster exports

| Unknown | Impact |
|---|---|
| **Font family and weights** | Blocks typography setup; Poppins/Inter is a guess |
| **Exact spacing scale** | Measured by eye; the 4/8px grid is inferred |
| **Shadow values** | Soft and wide, but blur/offset/opacity not separable |
| **Scrim opacity** | Semi-transparent black; exact alpha unknown |
| **Icon library** | Rasterized; must be re-sourced |
| **Banner artwork** (Customer Detail) | Flattened; cannot be extracted cleanly |
| **Full color ramp** | Only in-use colors are visible; no hover/disabled/dark variants |
| **Breakpoints** | No responsive frames |

### 9.2 Missing screens and states we must design

**Blocking:**
1. **Login, Register** — the whole auth surface.
2. **Save action on Customer Detail** — the form has no submit control. Auto-save on blur?
   An undesigned button? Must be resolved before Customers update works.
3. **Delete confirmation** — three destructive affordances, no guard.
4. **Loading states** — all surfaces.
5. **Form validation errors** — all forms.
6. **Mobile layouts (360px+)** — all screens.

**Important:**
7. Sort and Filter **open panels**; the filter fields themselves.
8. **Search** expanded field, results, and empty-query state.
9. **Dashboard pipeline-value** visualization.
10. Request-failure / retry states; 404 and 500 pages.
11. Task **detail** page (list and modals only).
12. Hover, focus, disabled and pressed states throughout.
13. Toast stacking, placement and auto-dismiss timing — the 8 crops show no page context.

### 9.3 Still the most useful thing to obtain

**The Figma file itself.** It resolves fonts, the spacing scale, shadow tokens, the icon
set and exportable assets in one step. Failing that: a stated font family, the allowed
values for deal `Progress`, and a decision on §8.2.

---

## 10. Recommended Implementation Order

Dependency-ordered; each step is independently demonstrable.

| Phase | Work | Why here |
|---|---|---|
| **0. Decisions** | Resolve §8.2 (content model), §8.1 (pagination), §8.3 (status/priority/stages), font | Everything downstream depends on these |
| **1. Foundation** | Design tokens from §2.1–2.3, global CSS reset, typography scale, icon set sourced | Zero UI until tokens exist |
| **2. Primitives** | Button (4 variants), Input/Textarea/Select/DatePicker, Avatar, Chip, Card, IconButton, Checkbox | Components 2, 5, 7, 8, 12, 13, 18 |
| **3. Shell** | AppShell, Sidebar, Topbar, RightRail + React Router layout routes | Required by all 6 pages |
| **4. Auth** | Register, login, logout, session restore + protected routes — **self-designed** on the §2 tokens | Gates every other page; backend prerequisite |
| **5. State kit** | EmptyState (from the 15 crops), Skeleton, ErrorState, Toast system, ConfirmDialog | Build once, consume everywhere; 3 of 5 are self-designed |
| **6. Customers** | Table + Toolbar + LoadMore → list; Detail page; Add/Edit modal; delete + confirm + toast; search, status filter, URL-synced pagination | Simplest full CRUD; proves the table and modal patterns |
| **7. Deals** | Reuse table/modal; Deal Detail; stage chip and `Progress` select; `Select Customer` picker | Depends on Customers existing (deal → customer) |
| **8. Tasks** | Table with the three-state checkbox; Add/Edit modals; **calculated** overdue derived server-side | Smallest surface; overdue logic is the interesting part |
| **9. Activities** *(if §8.2 says yes)* | Record Activity card, timeline, Edit Activity modal | Only reachable from Deal Detail |
| **10. Dashboard** | Stat cards, Next Appointment, Recent Deals, Deal Progress timeline, Tasks widget, aggregations, **pipeline values (self-designed)** | Reads from every other entity, so build last |
| **11. Responsive** | Collapse rail → bottom bar/drawer; right rail → stacked; tables → stacked cards at 360px | Needs finished layouts to collapse |
| **12. Hardening** | Loading/error coverage, a11y pass, API tests incl. cross-user 404, lint, prod build, deploy | Quality gates from `CLAUDE.md` |

**Critical path:** 0 → 1 → 2 → 3 → 4 → 5 → 6. Phases 7 and 8 can run in parallel once 6
lands. Phase 10 must come last.
