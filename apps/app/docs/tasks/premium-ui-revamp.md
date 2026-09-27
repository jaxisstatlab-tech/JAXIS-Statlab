# Premium UI Revamp — Page-by-Page Tracker

Goal: give every dashboard page a calm, premium look that matches the redesigned sidebar, notification drawer and the public website (`apps/web`), **without breaking any function or feature**.

Order: **Client → Statistician → QA Lead → Admin → Finance → CEO → Staff (shared)**.

**Two styles:** client pages are *simple and familiar* (plain sentences, one clear action per item, tracker cards, few numbers). Staff pages (statistician, QA, admin, finance, CEO) use the *analytics* style from the references (KPI tiles with sparklines/meters, 8/4 panels, tables, charts).

## Ground rules (every page)

- **Frontend only.** Same server actions, props, routes, form fields and validation. No database, auth or API changes unless a page is actually broken (note it here if so).
- **Keep every feature.** Before changing a page, list what it does (buttons, filters, modals, uploads, live updates, toasts). After the change, click through the same list.
- **Verify in offline mode** (`npm run seed:local-dev`, then `npm run dev:offline` → http://localhost:3011; it runs beside the normal dev server on 3001) as the matching dev account, on desktop (1440px) and mobile (390px). Lint + type-check the touched files with no new warnings.
- **Look:** the site's language — `#010114` ground, hairline `white/[0.08]` borders, `rounded-[2px]`, one orange (`#CC6600`) action per view, neutral white-tint active states, mono only for IDs / numbers / small labels, plain English (see `.agents/AGENTS.md` §6 banned words), no rainbow colours, no glows or pinging dots, `PageHeader` with WORKSPACE breadcrumb, `KpiCard`, `<Peso />`.
- **Pointer cursor on everything clickable.** Covered globally in `apps/app/app/globals.css` (and `apps/web`) for links, buttons, tabs, radios, checkboxes, menu items and labels. Anything else made clickable with `onClick` (a `div`, `tr`, card) must be a `button`/`Link` or get `role="button"` + `cursor-pointer`. Disabled items show `not-allowed`.
- **Shared first:** when several pages repeat a pattern (study header, empty state, table, filter bar), build or fix it once in `@repo/ui` / a shared component, then reuse.

## Status legend

`[ ]` to do · `[~]` in progress · `[x]` done and verified · `[!]` blocked (write why)

---

## 0. Shared shell (all roles)

- [x] Sidebar — website wordmark, neutral active state, orange "Send a new study" (client), slimmer width
- [x] Mobile top bar — logo + bell + menu, account menu moved into the drawer
- [x] Notification drawer — inbox-style rows, day groups, plain titles, clear-all confirm
- [x] Global CSS reset moved into `@layer base` (Tailwind utilities win)
- [x] Friendly database-unavailable message (no raw Prisma errors on screen)
- [x] Shared study header, client side (2026-09-27): `app/dashboard/client/projects/[id]/layout.tsx` + `ClientStudyHeader` (breadcrumb, study title, copy ID, sent date, stage tag, 5-step tracker, tabs Overview / Price / Agreement / Payment / Messages / Files; tabs appear only once they apply; tracker hidden on Messages; stage refreshes on tab switch). Pages swapped their own headers for a small `StudySection` title row that keeps their buttons; overview lost its duplicate tracker/status/ID; `getStudyOnce` (React `cache`) keeps it to one study read per request; `PageHeader.description` now accepts elements.
- [x] Shared study header, staff side (2026-09-27): `StaffStudyHeader` + `StaffStudyLayout` in `statistician/projects/[id]`, `qa/projects/[id]`, `admin/projects/[id]` layouts. Shows study title, copy ID, client, due date, status in staff words, 5-step tracker, role tabs (statistician: Workbench / Messages; QA: Review / Working Files / Messages → inbox; admin: Overview / Agreement / Payment / Analysis / Files). Pages swapped their headers for `StudySection` rows keeping real actions (Send for Review, Flag Extra Work, Open Review, Add File / Release to Client, Check Deposit); navigation buttons and raw status codes removed. Fixed: QA review's "Consultation Thread" button linked to a page that doesn't exist (404).
- [x] Dashboard panel kit `src/components/dashboard/Panel.tsx` (Panel, PanelHeader, PanelBody, PanelFooterLink/Button, Meter); `KpiCard` gained `trend`, `meter`, `surface="neutral"`; alert title/time helpers shared in `features/notifications/alert-display.ts`; `jaxis:open-notifications` event opens the drawer
- [x] **Surface sweep (approved 2026-09-27):** every navy shade in apps/app, apps/web and packages/ui mapped to a charcoal of matching relative depth (card `#01142B`→`#0A0A18`, hover `#011B38`→`#0F0F1D`, inset `#010D1F`→`#050513`, 40 shades / 154 files); `Card` and `KpiCard` flattened to the panel style (7% border, no shadow or top highlight); design rules (AGENTS.md, .agents, design-system docs, DESIGN.md) updated. Page ground `#010114` and orange `#CC6600` unchanged.
- [x] **Security:** removed the hard-coded Supabase service-role key from `src/lib/supabase.ts` (it was in the browser bundle and the public repo). Key rotated in Supabase 2026-09-27 and set in local `.env` / `.env.local`; hosting env still needs the new key + redeploy.
- [x] Toasts sit above modals and drawers (z 10000), so errors from a modal are readable
- [~] Shared empty state + table + filter bar patterns — done so far: neutral `CopyButton` badge (was orange), `FilterToolbar` mobile layout (search row + filters/reset row), `ClientStageMeter`
- [ ] Error / loading states per page follow the single `LoadingState` standard

### Messaging (shared by client, statistician, QA) — done 2026-09-27

- [x] One inbox for every role: `features/messaging/components/MessagesInbox.tsx` (server-loaded via `inbox-data.ts`). Two panes in one frame; each chat is a **group chat named after the study** with stacked team avatars and members listed as "Name (role)"; search with `/`; client chats that aren't open yet grouped last; staff get All / Unread / Finished tabs; list refreshes every 30 s and on focus; phone goes list → chat with Back. Wrappers: `ClientMessagesClient`, `StatisticianMessagesClient`, `QaMessagesClient`.
- [x] Chat window `MessageThread.tsx` rebuilt: Slack-style rows (avatar + name + role + time, text below, grouped by sender), day separators (Manila time, no hydration flash), header = study title + members with online dots, copy study ID badge, View Study link per role.
- [x] Speed: message shows instantly (Sending → Sent → Delivered → Seen), sends saved one at a time in typed order, failed sends stay with Try Again / Remove, blocked text returns to the box with a plain reason.
- [x] Real time: live channel is a "doorbell" with ids only (no text); the chat then fetches from the server (`GET /api/v1/messages`). Catch-up check every 3 s when live is down, 15 s when live. Loads 30 messages at a time; older ones load on scroll up. Removed an unused full message count.
- [x] Online status + typing: app-wide Supabase presence (`src/lib/presence.ts`, ids only) with green dots in the header and chat list; "Juan is typing…" in the header and chat, cleared on send. Offline fallback `/api/v1/presence` (404 outside offline mode).
- [x] Fixes: firewall could be bypassed by the live channel, duplicate messages, Delivered/Seen never updated, send route skipped bell alerts (message + blocked alert restored), firewall warnings rewritten in plain English.
- [ ] Not tested live (offline can't reach Supabase Realtime): instant push, typing and presence in production. Test with two accounts on staging.
- [ ] Later if needed: only draw visible messages in very long chats (1,000+); Supabase private channels so only study members can join a chat channel.

## 1. Client

- [x] `client` — My studies home, v3 **client-friendly** (order-tracking pattern, like online shopping): To do list (incl. finish profile), tabs In progress / Needs you / Completed / All, one tracker card per study (stage, due, 5-step tracker, what's happening, payment, one button), Need help tiles. Detailed table lives on All Studies. (v2 analytics layout was replaced: too dashboard-y for students; keep that style for staff roles.)
- [x] `client/projects` — All studies: stage tabs, needs-you-first sort, stage meter, mobile cards, quick view (fixed: status filter re-fetched from server and shrank the KPI counts)
- [ ] `client/projects/new` — Send a new study (intake form)
- [ ] `client/projects/[id]` — Study detail
- [x] `client/projects/[id]/quote` — "Your Price" as a checkout: status line, What you get, Delivery speed (radio incl. Standard), Extras (DefenseLab), note from our team; sticky Price summary with How you pay + Accept / Ask for changes; phone checkout bar; plain names for add-ons (catalog untouched for staff). Verified live totals, one-speed rule, accept + decline flows.
- [ ] `client/projects/[id]/sow` — Agreement + typed-name signing
- [ ] `client/projects/[id]/payment` — Deposit / receipts
- [x] `client/projects/[id]/messages` — Study messages: server-loaded chat, WORKSPACE / My Studies / study ID breadcrumb, View Study link
- [ ] `client/projects/[id]/deliverables` — Files (needs offline sample data to design)
- [ ] `client/projects/[id]/revision` — Request changes (needs offline sample data)
- [x] `client/quotations` — "Quotes": tabs Waiting for you / Accepted / Being priced / Closed / All, search, one card per quote (state, good-until / accepted date, total + how it's paid, one button); new requests now listed as "Being priced"
- [x] `client/messages` — Messenger-style inbox (see **Messaging** below)
- [x] `client/defenselab` — DefenseLab practice: next session up top (date tile, countdown, Join Video Call / link-pending note, Reschedule, what you want to practice), Also booked, Your hours per study (meter, Book, disabled reason), Good to know rules, Past sessions with Watch Recording, How it works empty state. Book and Move modals keep all rules (hours left, max length, 12-hour late warning → "Move Anyway"). Study picker lists only studies with hours. Offline seed gives the analysis study 2 hours so booking can be tested.
- [ ] `client/disputes` — Revisions & help / claims
- [ ] `client/profile` — School & profile

## 2. Statistician

- [ ] `statistician` — Workbench dashboard
- [ ] `statistician/projects/[id]/workbench` — Study workbench
- [x] `statistician/projects/[id]/messages` — server-loaded chat, study breadcrumb, View Study → workbench
- [x] `statistician/messages` — shared `MessagesInbox` (All / Unread / Finished tabs, client shown as a member, list refreshes every 30 s and on focus)
- [ ] `statistician/payouts`
- [ ] `statistician/profile`

## 3. QA Lead

- [ ] `qa` — Review desk
- [ ] `qa/projects/[id]/review`
- [ ] `qa/projects/[id]/files`
- [x] `qa/messages` — shared `MessagesInbox`, View Study → review page
- [ ] `qa/payouts`
- [ ] `qa/profile`

## 4. Admin

- [ ] `admin` — Overview
- [ ] `admin/intake` — New study requests
- [ ] `admin/quotations` — Pricing & quotes
- [ ] `admin/assignments` — Assign experts
- [ ] `admin/revisions`
- [ ] `admin/defenselab`
- [ ] `admin/staff`
- [ ] `admin/disputes`
- [ ] `admin/audit`
- [ ] `admin/messages` — Firewall logs
- [ ] `admin/notifications` — Email delivery logs
- [ ] `admin/reports`
- [ ] `admin/archive`
- [ ] `admin/projects/[id]` (+ `analysis`, `deliverables`, `payment`, `sow`)
- [ ] `admin/profile`

## 5. Finance

- [ ] `finance` — Overview
- [ ] `finance/payments` — Deposit queue
- [ ] `finance/payouts`
- [ ] `finance/disputes`
- [ ] `finance/ledger`
- [ ] `finance/reports`
- [ ] `finance/attendance`
- [ ] `finance/payroll` (+ `payslips/[id]/print`)
- [ ] `finance/leaves`
- [ ] `finance/projects/[id]/payment`
- [ ] `finance/profile`

## 6. CEO

- [ ] `ceo` — Overview
- [ ] `ceo/finance`
- [ ] `ceo/attendance`
- [ ] `ceo/payroll`
- [ ] `ceo/reports`
- [ ] `ceo/disputes`
- [ ] `ceo/escalations`
- [ ] `ceo/retention`
- [ ] `ceo/deleted-studies`
- [ ] `ceo/profile`

## 7. Staff (shared by internal roles)

- [ ] `staff/hr` (+ `payslips/[id]/print`)
- [ ] `staff/attendance`

---

## Notes / open issues

- **Release check (2026-09-27):** production build passes with no warnings (built with fake offline settings into a throwaway folder); type check clean; changed files lint clean; no secrets in browser code; nothing sensitive in `git status`. Fixed during the check: the offline stores built file paths from a variable, which made the build bundle the whole project into the `/api/v1/presence` function (now fixed paths). Before deploying: (1) set the new Supabase service-role key in hosting, (2) set `DISABLE_DEV_LOGINS=true` in hosting (OFFLINE-DEV.md lists the sample passwords and the repo is public), (3) test live chat, typing and online dots with two accounts on staging.
- `npm run lint` for the whole app still fails on ~200 older warnings (e.g. 38 `any` in `defenselab/actions.ts`, unused `mode` in `CertificateModal.tsx`); not from this work.

- Client pages use website package names, features and timelines from `src/features/projects/client-packages.ts` (mirror of `apps/web/app/content/pricing.ts`; keep in sync). Staff screens still use the price catalog names. Admin `assignments` still says "5-7 Days Standard" — align it in the admin pass.

- Offline mode (guide: `apps/app/OFFLINE-DEV.md`) has sample data for studies, quotes, agreements, payments, notifications, DefenseLab sessions, chat messages, analysis files, QA reviews and delivered files. Still missing: change requests (revisions) and claims; add sample data before redesigning those pages.
- Study header follow-ups (2026-09-27):
  - Files tab: checked (offline delivered-files sample data added).
  - The "Page not found" screen logs a React warning about a `<script>` tag in the browser console. Harmless but noisy; look at the not-found page.
  - Overview page still has old buttons that repeat the tabs (green "View Signed Contract", "Payment History"); clean up in the `client/projects/[id]` redesign.
  - The printable agreement (`SowDocument`) has its own `<h1>`, so the Agreement tab has two page titles on screen; fine for print, revisit when redesigning `sow`.
- Study header check, all roles (2026-09-27): every study page now checked offline with the shared header and the right tab active: client Overview / Price / Agreement / Payment / Messages / Files / Request changes; statistician Workbench / Messages; QA Review / Working Files (in analysis and delivered); admin Overview / Agreement / Payment / Analysis / Files. Added offline sample data for this (`src/features/projects/dev-study-store.ts`, `.dev-analysis.json`, `.dev-deliverables.json`, seeded) with offline-only fallbacks in `getAnalysisWorkbenchData`, `getQaInspectionDesk`, `getAdminDeliverablesDesk`, `getClientDeliverables`. Fixed: offline `getProjectById` now matches staff by dev account id.
  - Still open (pre-existing, not from the header): when a staff study page calls `redirect()` while loading (e.g. QA review if its data fails), Next's router logs "Rendered more hooks than during the previous render" in dev. Happens with or without the new layout. Look into it.
  - Offline revision window is simply delivery + 3 days (the real one skips weekends and holidays).
  - Old-style inner content on these pages (mono labels, coloured KPI cards, "Download for Recalculation", "Deliverables Locked · Final Balance Settlement Required", sky/emerald accents) is untouched; redesign in each role's pass.
- Security follow-ups (not UI work):
  - **Urgent:** `@jaxis.dev` sample logins (incl. admin and CEO, passwords in the public repo) work in production unless `DISABLE_DEV_LOGINS=true` is set in hosting. Set it now; code fix (dev/offline only) waiting on a yes from the owner.
  - `markAlertReadAction` doesn't check the alert's owner.
  - Plaintext dev passwords in source and `.dev-users.json`.
