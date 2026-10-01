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

## Progress (2026-10-01)

| Area | Done | Left |
|---|---|---|
| 0. Shared shell | 21 items | shared patterns, loading states, live chat test |
| 1. Client | **16 of 16 pages (done)** | — |
| 2. Statistician | 2 of 6 | dashboard, workbench, payouts, profile |
| 3. QA Lead | 1 of 6 | desk, review, files, payouts, profile |
| 4. Admin | 1 of 15 (New study requests) | overview, quotes, assignments, revisions, DefenseLab, staff, claims, logs, reports, archive, study pages, profile |
| 5. Finance | 0 of 11 | all |
| 6. CEO | 0 of 10 | all |
| 7. Staff | 0 of 2 | all |
| 8. Sign-in and system | 2 of 8 | forgot/reset password, no access, not found, error, loading |

**Next up:** the Statistician pass (dashboard, workbench, payouts, profile), including its checklist under **Performance and optimization**.

**Since 2026-09-28 (outside the page-by-page passes):** a production speed and security pass across all roles. Details and commits: `docs/modules/specs/20-performance.md` §6 and `docs/modules/specs/21-production-hardening.md` §3. Items below are marked where they overlap with this tracker.

---

## Performance and optimization

**Why pages felt slow (measured 2026-09-28 on the offline app, every client page, warm):**

1. **The notification live stream (biggest):** every page opened a stream to `/api/v1/notifications/stream` (two per page, one per bell copy) that stays open ~60 s. Browsers allow 6 connections per site on localhost, so after a few clicks new pages waited **30–58 s** before they even started. In production (Vercel) the stream's in-memory event bus rarely reaches the right server instance, so it didn't deliver much there, but every open tab kept a server function busy.
2. **Tabs that loaded in the browser:** Price, Agreement, Payment and Receipt opened with a spinner, then made 2–4 extra server calls. Next.js runs server actions **one at a time in the same queue as navigation**, so those calls (plus the bell/unread polling, also server actions) made later clicks wait.
3. **Sequential database reads:** the dashboard layout read account status, then the client profile, then unread messages, one after another (about 4 round trips) on every full page load; the profile lookup ran again inside pages.
4. **Header re-fetch:** the study header re-read the whole study on every tab click.
5. **Dev only:** the first visit to a page compiles it (2–30 s). Production builds don't do this.

**Result (client, offline dev, warm):** before 0.5–1.9 s with frequent 30–58 s stalls and up to 4 browser calls per page → after **0.5–1.1 s on all 13 pages, no stalls, 0 browser calls on load**. Feature tests re-run after the change: payment + receipts, signing, overview, change requests (71/72; the one miss is a known test-script pattern, screen checked by eye).

**For production (not code):**
- [x] **Vercel function region (done 2026-10-01, `d8b951c`):** `apps/app/vercel.json` pins functions to Singapore (`sin1`), next to the database. Before, they ran in Washington (iad1) and every read crossed the Pacific (~200 ms each). The owner confirmed pages got noticeably faster.
- Keep using the Supabase pooler URL (`:6543`, `pgbouncer=true`) for `DATABASE_URL` on Vercel.

### Performance standards (every page, all roles)

Use this as the checklist for each page in each role's pass (the client pages now meet it):

- [ ] **Data on the server first:** `page.tsx` is a server component that loads the data and passes it to the client view as initial data. No "spinner, then fetch" on first open.
- [ ] **Reads in parallel:** independent reads go in one `Promise.all`, never one after another. Anything read by both the layout and the page is wrapped in React `cache` (e.g. `getStudyOnce`, `getClientProfileOnce`).
- [ ] **No server actions for background reads:** polling, "refresh on focus" and counters use plain GET endpoints (`fetch`), because Next runs server actions one at a time in the same queue as navigation. Server actions are for changes (save, send, accept).
- [ ] **No duplicate work in the shell:** anything mounted twice (desktop and phone versions) does its work only in the visible copy; polling pauses while the tab is hidden.
- [ ] **No long-lived connections per page:** no SSE/streams per tab; use Supabase Realtime (already used for chat) or short polling.
- [ ] **Loading boundaries:** sections with their own header/tabs get a `loading.tsx` so the frame stays and only the content waits (also lets Next prefetch the frame).
- [ ] **Refresh only on real change:** after a change, fire `jaxis:study-updated` (or a similar event) instead of re-reading on every click.
- [ ] **Heavy code loads on demand:** big libraries (PDF, viewers, charts) are `next/dynamic` or `await import()` inside the action that needs them, never imported at the top of a page component.
- [ ] **Queries:** `select` only the fields shown, paginate long lists, no query inside a loop (N+1); keep the per-request study cache. Nested relations load in one query (`relationJoins`, on since 2026-10-01).
- [ ] **Preloaded pages skip the first browser fetch:** when `page.tsx` passes initial data, the client view uses `useLoadUnlessPreloaded` (`src/hooks/use-load-unless-preloaded.ts`) so it only fetches again when a filter changes.
- [ ] **Measure:** warm load under ~1 s on the offline app for every page, 0 browser server calls on open (script: `pp/perf-client.mjs`, run on a separate check server so your own isn't disturbed).

### More optimizations found (not done yet)

- [ ] **Files tab ships the PDF library to the browser:** `ClientDeliverablesDesk` imports `downloadCertificatePdf` (pdf-lib, several hundred KB) for a fallback that never runs, and that module downloads the seal, logo and a signature image in the background on every Files visit. Remove the client fallback (the server route makes the PDF) or load it with `await import()` only if needed.
- [ ] **Icon library not optimized:** add `@phosphor-icons/react` to `experimental.optimizePackageImports` in `next.config.mjs` (icons are imported on almost every page); smaller bundles and faster dev compiles.
- [ ] **`<img>` tags (10):** switch real image files (seal, logos) to `next/image` where possible; data-URL signatures can stay `<img>`.
- [ ] **Unused code:** `CertificateModal.tsx` (never opened) and the `/api/v1/notifications/stream` route (stream now off) — delete once confirmed, or replace the stream with Supabase Realtime if instant bell alerts are wanted.
- [ ] **Cold starts in production:** after the region move, check Vercel's function logs for slow first requests; keep server-only libraries (sharp, pdf-lib, AWS SDK) out of shared layout code so every page's function stays small.
- [ ] **Monitoring:** turn on Vercel Speed Insights (or Analytics) to see real page-load times for real users after deploys.

### Client — done 2026-09-28

- [x] Dashboard layout reads account status, client profile, duty shift and unread count **at the same time** (`Promise.all`, same fallbacks); the client profile is read once per request and shared with the page (`src/features/client-profile/profile-cache.ts`, used by My Studies, All studies, Profile, Send a new study).
- [x] Price, Agreement, Payment and Receipt load their data **on the server** (`page.tsx` → `ClientQuoteView` / `ClientSowView` / `ClientPaymentView` / `ClientReceiptView` with initial data; the study comes from the layout's per-request cache, so no extra read). They still refresh themselves after accept / sign / upload.
- [x] Study header no longer re-reads the study on every tab click; pages that change the stage (accept/decline price, sign, pay, add files, request changes) fire `jaxis:study-updated` and it refreshes then.
- [x] `loading.tsx` inside the study (`projects/[id]/loading.tsx`): the title, tracker and tabs stay while a tab loads, and Next can prefetch the study layout.
- [x] Bell: only the copy on screen loads, polls and listens (was two copies doing everything); alerts and the sidebar unread count now come from plain GET endpoints (`/api/v1/alerts`, `/api/v1/messages/unread`, same login checks, 401 without login) so background checks never hold up a click; polling pauses while the tab is hidden.
- [x] Notification live stream off by default (`NEXT_PUBLIC_NOTIFICATIONS_STREAM=1` turns it back on). Alerts still arrive within 15 s and on returning to the tab.
- [x] `apps/app/.gitignore` ignores every `.next-*` build folder (a check server's build folder was being scanned by Tailwind and broke CSS).

### Other roles — to do in each role's pass (same recipe)

Shared shell fixes above (layout, bell, unread count, stream) already apply to every role.

- [ ] **Statistician:** load on the server: `statistician/profile`; check `StatisticianPayoutsClient` (reloads in the browser); workbench: check for browser-side loads and sequential reads; add `loading.tsx` in `statistician/projects/[id]`; measure all pages.
- [ ] **QA Lead:** load on the server: `qa/profile`; check `QaPayoutsClient`; review/files desks: check browser-side loads; `loading.tsx` in `qa/projects/[id]`; measure.
- [~] **Admin:** done 2026-10-01 (`637c9f7`): `archive`, `audit`, `disputes`, `notifications`, `reports` load on the server; `admin/loading.tsx` covers every page in the folder (`e538e29`); New study requests refreshes only its list, quietly, at most once a minute on tab return (`6d8f447`). Left: `defenselab`, `profile`, `projects/[id]`, `projects/[id]/payment`, `projects/[id]/sow`; check `AssignmentsClient`; `loading.tsx` in `admin/projects/[id]`; measure.
- [~] **Finance:** `reports` loads on the server (`637c9f7`); `finance/loading.tsx` added (`e538e29`). Left: load on the server: `finance/profile`, `projects/[id]/payment`, `payroll/payslips/[id]/print`; check `AttendanceReviewClient`, `FinanceDisputesClient`, `SpecialistLeaveApprovalsClient`, `FinancePayoutsClient`, `FinancePayrollClient`; measure.
- [~] **CEO:** `disputes`, `finance`, `reports`, `retention` load on the server (`637c9f7`); `ceo/loading.tsx` added (`e538e29`). Left: `payroll`, `profile`; check `CeoAttendanceAuditClient`; measure.
- [ ] **Staff (shared):** load on the server: `staff/hr/payslips/[id]/print`; check `StaffAttendanceClient`, `HrPortalClient`; measure.
- [~] **Staff-only shell parts:** `DutyClockWidget` now checks the shift at most once a minute on tab return, shared by its two copies (`6d8f447`). Still a server action (`getActiveShift`); move it to a GET endpoint like the bell.
- [ ] **Messages (all roles):** the open chat and inbox refresh with server actions (`getProjectMessages`, `getMyProjectThreads`) every few seconds; move those background refreshes to GET (`/api/v1/messages` already exists for the chat) so they never hold up clicks.

---

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
- [x] **Log out when you leave (2026-09-27):** closing the browser, or coming back after 30 minutes without activity, now ends the login; a login also ends 12 hours after signing in. How: a browser-only `jaxis_active` cookie (no expiry, shared by tabs) is updated on activity (`IdleSessionManager`) and page loads (middleware); `middleware.ts` checks it with `src/lib/session-activity.ts` and sends stale logins to `/session-ended`, which runs Auth.js `signOut` (the middleware can't delete the cookie itself; Auth.js re-sets it). New logins get a 2-minute grace. "Remember me" (30-day login) is now "Remember my email" (only the email is kept). Idle logout now counts activity from all tabs (before, one idle tab could log you out while you worked in another). Verified offline: login, active use past the grace period, browser closed → logged out with a message and login cookie removed, 30+ idle minutes → logged out, email kept and password empty. Note: everyone already logged in is asked to log in once after this ships.
- [x] Offline login picker (2026-09-27): "Offline mode: sign in as" dropdown on /login fills a sample account's email and password (normal password check still runs). Double-gated: `NEXT_PUBLIC_JAXIS_OFFLINE` (always defined in `next.config.mjs`, empty outside offline mode, so production builds drop the code; verified 0 matches in a production build) and `/api/dev/accounts` answers only when `JAXIS_OFFLINE=1` and not production. Needs a restart of `npm run dev:offline` to appear.
- [x] **One page width for every role (2026-09-28):** `max-w-7xl` inside the dashboard is 1600px (`[--container-7xl:100rem]` on `<main>` in `DashboardShell.tsx`), so pages fill laptops and full-HD screens and centre at 1600px on bigger ones; client pages that capped themselves at 896–1024px now use it too. Rule written into `AGENTS.md`, `.agents/AGENTS.md` and the dashdark skill. Only printable paper documents keep their own width. Checked on 14 pages across client, statistician, QA, admin, finance and CEO: all fill the width at 1920px (1552px of 1552px), no sideways scroll on phone.
- [x] **Printing fixed (2026-09-28):** printing gave a blank sheet, because the print rules hid the page whenever a dialog existed and the closed notification drawer is always a hidden dialog (`globals.css` now ignores `.invisible` dialogs). Printable documents are white A4 "paper" sheets that look the same on screen, on paper and in Save as PDF (`SowDocument`, `PaymentReceiptDocument`, `StatisticalAuditCertificate`; class `print-sheet`), and name the PDF file.
- [x] Toasts sit above modals and drawers (z 10000), so errors from a modal are readable
- [x] **KPI cards, all pages (2026-10-01):** `KpiCard` (`packages/ui`) redesigned after an analytics-card reference: icon tile + title + subtitle, optional info icon, big number with a change line or tag, and an optional chart in the corner (`trend` with `trendStyle` area / bars / dots; drawn only from real data, orange only). Colour restraint: numbers white, zeros dimmed, tiles and tags neutral, red kept for `variant="red"`. Older ALL-CAPS labels keep a compact mono style until each page is redesigned; old props (`badgeColor`, `monoLabel`) still compile. Checked on New study requests and Admin overview. New props: `info`, `change`, `trendStyle`.
- [x] **Sidebar clicks (2026-10-01, `e538e29`):** a slow page no longer snaps the highlight back to the previous page after 20 s; the pending state follows the clicked link's real status (`useLinkStatus`), and every role folder has a `loading.tsx`, so a click lands on the page loader straight away.
- [x] **Document viewer shows the real file (2026-10-01, `9fce329`):** `FileContentPreview.tsx` renders the actual `.docx` (pages, tables, images), `.xlsx` (a tab per sheet, first 500 rows), CSV/TSV/TXT, PDF and images; other types get a plain note and Download. It used to show a built-in sample manuscript for every Word file and made-up rows for CSVs. All files load through `/api/files/preview`.
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

## 1. Client

- [x] `client` — My studies home, v3 **client-friendly** (order-tracking pattern, like online shopping): To do list (incl. finish profile), tabs In progress / Needs you / Completed / All, one tracker card per study (stage, due, 5-step tracker, what's happening, payment, one button), Need help tiles. Search, sort and quick view live on All studies. (v2 analytics layout was replaced: too dashboard-y for students; keep that style for staff roles.)
- [x] `client/projects` — All studies, v3 **order list** (2026-09-28): dropped the 4 count cards (they repeated the tab counts and pushed the list below the fold on phones) and the table; now tabs (All / Needs you / In progress / Completed / Stopped) + search (`/` to jump in, Esc to clear) + sort on one line, then one order card per study: ID copy + sent date + status tag, title, what is happening, our note, the 5-step tracker with due text, then files, price/paid, Message link, quick view, ask-to-delete (new here, same window as My Studies) and one button (orange only when the study needs you). Header line says how many need you. Browser tab title fixed ("My Research Projects" → "All studies"). `useDueText` moved to `src/features/projects/due-text.ts` (shared with My Studies). Verified 21 checks offline incl. tabs, search, sort, copy, quick view, delete window (not sent), links, phone.
- [x] Client "How it works" guide (`HowToUseModal`, opened from My Studies) — 2026-09-27: rewritten to match the real flow and the website terms: 6 plain steps (Send your study → Get your price → Sign your agreement → Pay your deposit → We analyze your data → Get your files) tagged with the tracker names clients see on study pages; "Before you start: add your school" note when the profile is incomplete; 6 plain questions; one main button (Add Your School First / Send a Study). Removed misleading claims: "100% money-back escrow protection", "50% deposit", Maya, "Senior QA", named universities. Verified 8 checks incl. the school-form button, desktop + phone.
- [x] `client/projects/new` — Send a new study (2026-09-27): 3 plain steps (About your study → Your files → Check and send) with a step bar you can only move back on (fixed: it used to let you jump to Check and send without filling anything in); side panel "What happens next" + your school; one shared `FileSlot` for the 3 files (was 3 copies of ~160 lines) with drop zone, progress, Replace / Remove; review with Edit per section; a real confirmation checkbox. All rules kept (title 3+, questions/objectives 5+, future date, Chapters 1–3 + data file required, file types, 15 MB). School gate reworded ("First, tell us about your school"). Guide fixed to match: Chapters 1–3 required, no Google Sheets (download as Excel/CSV). Offline stand-ins so it can be tested: `/api/dev/upload-sink` (keeps nothing) and `dev-projects-store.ts` (saves the study locally), both `JAXIS_OFFLINE` only. Verified 15 checks end to end incl. school form, wrong file type, missing files, send and listing on My Studies.
- [x] `client/projects/new` — **Analysis goals (2026-10-01):** step 1 asks "What should the analysis do?" (Describe and summarize data, Compare groups, Test relationships, Predict outcomes, Validate a survey or instrument, Not sure yet; pick at least one; "Not sure yet" stands alone) and Check and send shows the choice. Saved as `analysisGoals` on the study; staff see it in New study requests, the quote builder and the admin study page. Verified offline: 6 boxes, required check, "Not sure yet" behaviour. Database column `projects.analysisGoals` (`TEXT[]`, default empty) confirmed in the live database 2026-10-01, so the code is safe to deploy. Still to do: send one test study on the live site and check the goal shows in New study requests.
- [x] `client/projects/[id]` — Study overview (2026-09-28): replaced 6 coloured banners (amber/sky/emerald), repeated buttons ("View Signed Contract", "Payment History", "Proceed to Payment" twice) and the client "Academic Profile" / "Dispute Flag" boxes with: one "What's happening" panel (title, what's going on, Next, and the one button; orange only when it's the client's turn; special cases for needs-info, receipt being checked, balance due before download, open claim), "Your research questions", "Files you sent" (preview, download, download all, add/remove until the agreement is signed, locked note after), and a side column with Details (due + days left, sent, last update, package, school), Payment (paid of total, meter, deposit, left to pay) and Need help (message your team, Revisions & help after delivery, ask to delete). New plain "Add a file" window (4 types, drop zone, 15 MB, type rules match the server; "Something else" no longer offers Excel/CSV, which the server rejected). Fixed: a failed "I've Added Everything" used to swap the whole page for the "couldn't load" screen. Verified 20 checks offline across all 8 sample stages, add/wrong type/remove/finish, preview, ask-to-delete, phone.
- [x] `client/projects/[id]/quote` — "Your Price" as a checkout: status line, What you get, Delivery speed (radio incl. Standard), Extras (DefenseLab), note from our team; sticky Price summary with How you pay + Accept / Ask for changes; phone checkout bar; plain names for add-ons (catalog untouched for staff). Verified live totals, one-speed rule, accept + decline flows.
- [x] `client/projects/[id]/sow` — Agreement (2026-09-28): the agreement is now a white A4 paper sheet (logo letterhead, dark ink) that looks the same on screen, in print and in Save as PDF; plain headings (Service Agreement, Who this agreement is between, Your study, Price and payments, Terms, Signatures); signing moved to a checkout-style side panel (summary of total / deposit / delivery, type your full name with live signature and match check, real checkbox with Terms link, Sign Agreement + confirm, "Message your team" to change something). After signing: "You signed this agreement" + Pay Deposit button (the old one sent you to the Overview) and the study header tag updates straight away (header now listens for `jaxis:study-updated`). **Print fixed:** printing gave a blank page, because the print rules hid the page whenever a dialog existed and the closed notification drawer is always a hidden dialog (`globals.css`: ignore `.invisible` dialogs). PDF file name is "JAXIS Agreement <study ID>". Also fixed: price lines didn't add up (add-ons were priced from the catalog, e.g. ₱2,500 + ₱250 = ₱3,000); now the extras line is total minus package. Now shows the refund policy, hypotheses and payment method, which are saved in every agreement but were never shown. Website package and add-on names; contact is consult@jaxisstatlab.com (was ops@jaxis.dev); provider signature no longer says "Governance". `SowDocument` is shared, so the admin Agreement page gets the same sheet. Verified: 14 signing checks offline (wrong name, any-case match, box, confirm, signed panel, pay link, header update, phone) + printed PDFs (2 A4 pages, signed and unsigned).
- [x] `client/projects/[id]/payment` — Payment + receipts (2026-09-28): replaced the 4 coloured KPI cards, "Milestone Activation" bar, "Payment Transactions & Proof Ledger" table and "Official Statement of Work Executed" banner with: "What to pay now" panel (pay your deposit / we're checking your receipt / nothing to pay right now, pay early / pay the rest to get your files / paid in full; shows why a receipt wasn't accepted), "Your payments" list (amount, deposit/final balance, Checking/Confirmed/Not accepted, method, date, copy reference, "Your Upload" viewer with download and open-in-new-tab, "Receipt" for confirmed ones), side Summary (paid of total, meter, deposit, being checked, left to pay, link to agreement) and How to pay. **New: printable receipts** at `payment/receipt/[paymentId]`: an A4 "Acknowledgement Receipt" sheet (receipt no., amount, from, for, method, reference, sent/confirmed dates, totals after this payment) with Print or Save as PDF (file named "JAXIS Receipt <no>"); prints to 1 A4 page; pages for unconfirmed payments explain it isn't ready yet. Upload window redesigned: only offers what's due (Deposit or Pay in full; after the deposit, only "The rest"), fixed amount, GCash/bank tabs with copy, study ID reminder, reference + file with plain errors. **Fixed:** after the deposit was confirmed the old window still offered Deposit / Full 100% only (full = whole price), so the remaining balance couldn't be sent correctly; removed the fake GCash QR drawing (looked scannable, wasn't; a real QR still shows if uploaded in settings). Offline fix: the offline payments fallback now uses the study's own totals (it used ₱2,750 for every study, so Payment and Overview disagreed). `PaymentLedgerCard` (admin/finance) untouched. Verified 20 checks offline incl. upload deposit, checking state, pay-the-rest choices, receipt page + PDF, fully paid, phone.
- [x] `client/projects/[id]/messages` — Study messages: server-loaded chat, WORKSPACE / My Studies / study ID breadcrumb, View Study link
- [x] `client/projects/[id]/deliverables` — Files (2026-09-28): replaced the coloured count cards ("FINAL DELIVERABLES / REVISION WINDOW / ARCHIVE RETENTION"), sky/amber banners, "Download Final Outputs" grid and the glowing "Accredited Research Credential" card with: a "What's happening" panel (Your files are ready + Request Changes / Pay the rest to get your files + amount + Pay the Rest / We're checking your files / Your files aren't ready yet / No files here yet or Your files were removed after 90 days, each with one button), "Files to download" (plain kinds: Results write-up, Tables and output, Cleaned data, Extra tables and code; size, release date, Download, Download All) with the certificate as a file, "Your change requests" (plain status: We're reviewing it / Free change: we're on it / Needs a new agreement / New work: needs a new price / Done; parts to change; our note), and a side column: Free changes (time left, ask-by date, Request Changes or why not), Keep a copy (90 days, until date), Need help. **Fixed:** (1) the server marks files "locked" whenever money is owed at any stage, so a study mid-analysis was told its files were "completed and verified, settle your balance"; now "pay the rest" shows only once files are delivered; (2) download errors showed raw database text to students; now a plain line; (3) any loading error showed "Page not found"; now "We couldn't open your files" + Back to Overview; (4) on phones the active study tab sat off-screen in the tab row; the header now scrolls it into view (all study tabs). Offline stand-in for file downloads (`devDeliverableDownload`, placeholder file, offline only). Verified 14 checks offline: ready, file list, download, certificate PDF (889 KB), free changes, closed study, in-analysis, locked (payment temporarily unconfirmed, restored), phone.
- [x] `client/projects/[id]/deliverables/certificate` — Certificate (2026-09-28): new page (from Files → View) with the certificate as one A4 paper sheet, Print or Save as PDF (1 page, file named "JAXIS Certificate <no>") and Download PDF (server file). One wording for the page and the PDF (`src/features/deliverables/certificate-text.ts`): "checked by a second statistical analyst at JAXIS StatLab and approved for release", what was checked (data cleaning and coding, test assumptions, test fits the questions, accuracy of numbers and tables), approval date, authorship stays with the researcher. **Fixed:** (1) with no signature on file, the PDF printed another reviewer's handwritten signature (`qa-lead-maria.png`) above whoever approved it; now only the approver's own signature, otherwise "Approved electronically in JAXIS StatLab"; (2) removed overclaims ("four institutional compliance standards", "full compliance with academic research standards", "hereby affirmed"), "Principal Investigator" and the student's email; (3) placeholder text printed as fact ("Higher Education Institution", "Graduate & Doctoral Research", "Senior QA Review Lead" as a name, profile bios as job titles) — empty rows are now left out, titles are plain; (4) the PDF link worked before files were released (unpaid study); clients now get it only with released files (plain 403 message), and server errors no longer show raw text; (5) the old sheet's own print styles hid the whole page and forced a fixed layout; it now uses the shared print rules. Website package name on the certificate. Fixed after review: offline, the certificate ignored the approver's saved signature (always "approved electronically"); it now uses their own signature from their profile (the live version already did), on the page and in the PDF. Verified 10 checks offline incl. print to 1 A4 page, PDF download, locked study refused, phone.
- [x] `client/projects/[id]/revision` — Request changes (2026-09-28): one plain form "What should we change?" (Which parts? optional, the change in your words with a live 3,000 count, a scope checkbox in plain words, Cancel / Send Request) with inline messages when text is missing or too short or the box isn't ticked; side panels "Free changes" (time left, ask-by date) and "What's free and what isn't" (3 + 3 plain examples, "Not sure? Send it anyway"). States in plain words instead of amber/sky boxes: files aren't ready yet / we're working on your change request (shows what you asked) / the free-change window has closed (+ Message Your Team). Removed "Revision Policy & Guidelines", "Supplemental SOW / Quote", "Administrative Review", "Lead Statistician", "Consultation Chat". After sending: the study header switches to "Making your changes" straight away, and the Files tab lists the request as "We're reviewing it". A loading error shows a message instead of "Page not found". **Offline sample data added:** change requests in `.dev-revisions.json` (seed: a finished free change on the closed study) + 2 delivered files on the closed study; offline `submitClientRevision` (`devSubmitRevision`, same rules: owner, open window, one active request; moves the study to REVISION_REQUESTED) and the Files tab reads them. Verified 16 checks offline: empty/too-short/untick errors, count, send, saved, Files list + header, revisit, closed window + history with our note, not ready, phone.
- [x] `client/quotations` — "Quotes": tabs Waiting for you / Accepted / Being priced / Closed / All, search, one card per quote (state, good-until / accepted date, total + how it's paid, one button); new requests now listed as "Being priced"
- [x] `client/messages` — Messenger-style inbox (see **Messaging** below)
- [x] `client/defenselab` — DefenseLab practice: next session up top (date tile, countdown, Join Video Call / link-pending note, Reschedule, what you want to practice), Also booked, Your hours per study (meter, Book, disabled reason), Good to know rules, Past sessions with Watch Recording, How it works empty state. Book and Move modals keep all rules (hours left, max length, 12-hour late warning → "Move Anyway"). Study picker lists only studies with hours. Offline seed gives the analysis study 2 hours so booking can be tested.
- [x] `client/disputes` — Revisions & help (2026-09-27): three ways to get help (Ask a question → Messages, Request changes → study Files, File a claim), delivered studies with plain claim-window status ("6 days left to file a claim" / window closed / claim status) and View Files / File a Claim / View Claim, claims as cards with a Sent → Being reviewed → Decision tracker, claim form on the shared `Modal` with plain reason cards (Wrong test or method / Wrong numbers / Late delivery), character count, https link check; claim details with "Our decision" in plain words. All rules kept (7-day window, one active claim, 20–3,000 characters). No jargon (Dispute / SOW / CEO). Offline claims store `src/features/disputes/dev-store.ts` + seeded past claim; filing works offline. Verified 18 checks incl. filing a claim end to end.
- [x] `client/profile` — School & profile (2026-09-28): "Your profile" with a simple account row (initials, name, email with copy + message, "Add your school to send a study" note when incomplete), tabs School & contact / Password, one form with plain sections "Your school" and "How we reach you" (Mobile number, Region) saying why each is needed, Save Changes / Cancel. Same fields, phone formatting, save → back to My Studies. Removed: "Lead Researcher", "Principal Investigator", "Philippine Registry", blinking "Verified Client", made-up "Client ID", fake `client@jaxis.dev` fallback email, sky/emerald accents. Browser tab title "Your profile". Verified 10 checks (save and reopen keeps values, copy email, password tab, phone).
- [x] **Client wrap-up (2026-10-01):** the last carry-overs are done. My Studies cards say "Price ₱X" until a payment is confirmed, then "Paid ₱X of ₱Y" with the meter (same as All studies). Revisions & help shows each delivered study's free-change window (time left and ask-by date, "Your request is with us", or when it closed) beside its claim window, with a Request Changes button per study; the Request changes card links straight to the form when one study is open, or says to choose below. Messages on phones no longer marks the first chat read unseen (note 9). Register, profile and the "Add your school" window show our own messages for empty fields instead of the browser's pop-up; the "Add your school" window was redone in the profile page's style and now saves the same region values (it saved "Region III" while the profile page used "REGION_3"; older values are read correctly, and the admin study page shows the region name). "Change Password" (all profiles) reworded, SECURITY tag removed, neutral checks. Due dates say "1 day past" (was "1 days past"). Unused `ClientWelcomeBanner.tsx` deleted. Verified offline: register and profile empty submits, Revisions rows, dashboard cards, phone inbox (stays unread until the chat is opened) and desktop inbox (read straight away), phone widths.

## 2. Statistician

- [ ] `statistician` — Workbench dashboard
- [ ] `statistician/projects/[id]/workbench` — Study workbench
- [x] `statistician/projects/[id]/messages` — server-loaded chat, study breadcrumb, View Study → workbench
- [x] `statistician/messages` — shared `MessagesInbox` (All / Unread / Finished tabs, client shown as a member, list refreshes every 30 s and on focus). **Re-verified 2026-09-27 (18 checks):** lists 3 assigned studies, members incl. client, search + no-match + Clear Filters, Finished tab, open another chat, View Study → workbench, instant send (~60 ms), client receives + staff sees reply without refresh (~0.5–2 s offline), other chat shows new preview + unread count after list refresh, Unread tab, phone list → chat → Back, no sideways scroll, no console errors.
- [ ] `statistician/payouts`
- [ ] `statistician/profile`

## 3. QA Lead

- [ ] `qa` — Review desk
- [ ] `qa/projects/[id]/review`
- [ ] `qa/projects/[id]/files`
- [x] `qa/messages` — shared `MessagesInbox`, View Study → review page. **Re-verified 2026-09-27 (19 checks):** same checks as statistician, plus the QA study header's Messages tab opens `/dashboard/qa/messages?projectId=…` with that study's chat.
- [ ] `qa/payouts`
- [ ] `qa/profile`

## 4. Admin

- [ ] `admin` — Overview
- [x] `admin/intake` — New study requests (2026-10-01): plain title and wording (was "Project Intake Triage & Evaluation Queue", "Request Missing Artifacts", "Governance notice", "Prepare Commercial Proposal"); 4 neutral cards New / Waiting on client / Ready to price / Quote sent with icons and an info note each (was 4 differently coloured cards incl. a duplicate "active triage" count); filter Show (All, To check, New, Waiting on client, Ready to price, Quote sent) + sort + search (title, client, school, study ID); rows without coloured tints: title, copy ID, sent date and time, file count, the client's analysis goal tags (hover for usual tests; "Not sure yet" outlined in orange; "not asked" for older studies), "We asked: …" while waiting on the client, client + school + phone, due date with "in N days" / "N days late", status, and **one next-step button per stage** (Review / Quick Look / Build Quote / Draft Agreement / Open) plus the menu (Quick look, Open study page, Draft agreement, Build quote, Ask for missing info, Mark ready to price, Copy study ID). **Quick look** (was built but never opened): client, school, due, status, what we asked for, analysis goals with usual tests, objectives, questions, hypotheses, files with Download; footer Ask for Missing Info and Mark Ready to Price / Build Quote. Ask-for-missing-info window in plain words with the same templates and 5-character rule. No-match state with Clear Filters. Browser tab title added. All actions, refreshes and paging kept. Verified offline: 9 rows, row buttons per stage, search → no match → Clear Filters, Quick look sections and buttons, missing-info window, phone (390 px, no sideways scroll). The `projects.analysisGoals` column is in the live database (checked 2026-10-01).
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
- [ ] `admin/projects/[id]` (+ `analysis`, `deliverables`, `payment`, `sow`) — analysis goals panel added under the objectives (2026-10-01); page not yet redesigned
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

## 8. Sign-in and system screens (all roles)

- [x] `login` — Log in (redesigned earlier; has the offline-only "sign in as" picker and "Remember my email"). **Verified 2026-09-27:** plain wording, JAXIS logo, pointer on every clickable, every field labelled, friendly message on empty submit, phone fits, no console errors, lint clean.
- [x] `register` — Create account (redesigned earlier). **Verified 2026-09-27:** same checks as login. Small polish for later: empty fields show the browser's own "Please fill out this field" bubble, while login shows its own friendly message; match them.
- [ ] `forgot-password` — Forgot password
- [ ] `reset-password` — Set a new password
- [ ] `unauthorized` — No access
- [ ] `not-found.tsx` — Page not found (logs a React `<script>` warning in the console; see notes)
- [ ] `error.tsx` + `dashboard/error.tsx` + `global-error.tsx` — Something went wrong
- [ ] `dashboard/loading.tsx` — Page loading

Not listed on purpose: `/` and `/dashboard` only redirect (to login or the role's home), so there's nothing to design.
Tracker coverage checked 2026-09-27: all 78 pages in `apps/app/app` are listed (study sub-pages and payslip print pages are listed inside their parent lines).

---

## Notes / open issues

### Needs a decision from the owner

0. **Resolved 2026-10-01:** `AGENTS.md` rules 9 and 16, `.agents/AGENTS.md` and the dashdark skill now describe the redesigned `KpiCard` (neutral icon tile, sentence-case title, white number, optional orange chart from real data only).
1. **Fixed 2026-10-01 (`487b737`):** `createProject` saves a study only to the signed-in client's own account; it no longer retries under another client.
2. **Fixed 2026-10-01 (`487b737`):** `resolveOrProvisionUser` never borrows another account, never reactivates or renames one, and new accounts get a random password.
3. **Fixed 2026-10-01:** the offline sample-data fallbacks in `submitPaymentProof` (`8d5ef41`), `addProjectFile`, `deleteProjectFile`, `resolveMissingInfo` and `getPaymentsByProject` now run only in offline development (`devProjectsEnabled()`); on the live site a database error is reported as one instead of "saved". `getPaymentsByProject` no longer mixes in sample payments, shows a made-up price on errors, or lets a newer draft quote change what the client owes.
4. **Fixed 2026-10-01:** clients can add or remove study files only until the agreement is signed (same stages as the study page; admin and CEO keep their earlier rule), and removing a file checks it belongs to that study. `submitPaymentProof` takes only what's due: what's left of the deposit, or everything that's left, worked out from confirmed payments, and nothing while a receipt is being checked (admin and CEO can record any amount up to what's left). Rules in `paymentAmountProblem` (`src/lib/payment-rules.ts`); the upload window sends the same amounts.
5. **Agreement wording (contract text, not changed):** saved terms (`src/lib/sow-rules.ts`) say free changes within **7 business days**; the website, guide and Revisions page say **3**. The terms are jargon-heavy ("SLA timeline commences", "Supplemental Statement of Work"); rewrite the defaults in plain English for new agreements (signed ones keep what they say). The agreement says the final balance is "paid after you review and accept the final results", but the app asks for it before files can be downloaded; align the wording or the flow.
6. **Certificate wording (changed 2026-09-28, please confirm):** it now says the analysis was "checked by a second statistical analyst and approved for release" and lists what was checked, instead of "certified compliant with academic research standards". Already-downloaded certificates keep the old text. `public/signatures/qa-lead-maria.png` is only used when a reviewer's own signature is that file; upload each reviewer's signature in their profile to have it printed.
7. **Receipts:** the new receipt is titled "Acknowledgement Receipt" on purpose. If JAXIS issues BIR official receipts, we can add the OR number / TIN; if not, consider adding "This is not an official receipt".
8. **Fixed 2026-10-01 (`7e8e5d7`):** sample logins never work in production (`devLoginsAllowed()`), whatever the hosting settings, and the seven `@jaxis.dev` accounts are suspended in the live database. Don't reactivate them without new private passwords.
9. **Fixed 2026-10-01:** Messages on phones marked the newest chat read unseen (only the list shows there). `loadInbox` now loads the automatic first chat without marking it read (`getProjectMessages(..., { markRead: false })`, `readPending`); `MessageThread` takes `active` and marks it read, and starts pulling new messages, only once it's on screen (straight away on wide screens, after tapping on phones). A chat opened by link (`?projectId=`) is read as before.
10. Website About page: Kim's middle name is spelled "Ric"; the request said "Rick". Confirm.

### Before deploying

- **Speed:** done (functions in Singapore, `d8b951c`). Leave `NEXT_PUBLIC_NOTIFICATIONS_STREAM` unset (stream off).
- **Analysis goals:** done. The `projects.analysisGoals` column (`TEXT[]`, default empty) is in the live database (checked 2026-10-01). After the deploy, send one test study and check the goal shows in New study requests.
- Hosting (Vercel): paste the new `SUPABASE_SERVICE_ROLE_KEY` (the one there is the old, deleted key; the code no longer uses it, but `env.ts` requires it) (`DISABLE_DEV_LOGINS` is no longer needed in production; demo logins are off there in code).
- Test live chat, typing and online dots with two accounts on staging (offline can't reach Supabase Realtime).
- Everyone already logged in will be asked to log in once (new session rules).
- Last release check (2026-09-27): production build passes with no warnings, type check clean, no secrets in browser code. Re-run before the next deploy (many pages changed since).

### Security

- 2026-10-01: a client-side security audit and its fixes are listed with commits in `docs/modules/specs/21-production-hardening.md` §3.
- Fixed 2026-09-27: hard-coded Supabase service-role key removed from `src/lib/supabase.ts` (key rotated); hard-coded auth secret is now development-only (production stops if `AUTH_SECRET` is missing; Vercel has it set).
- Fixed 2026-10-01: `markAlertReadAction` only marks the signed-in person's own alerts. Open: plaintext dev passwords in source and `.dev-users.json`.

### Carry-overs for later passes

- **Admin / finance:** `PaymentLedgerCard` (KPI cards + ledger table) and `ProjectFilesCard` keep the old style; redo them and link to the new client receipt. Payment channel names come from settings (e.g. "BDO Institutional Direct Deposit"); rename in the settings pass. `QuotationBuilderModal` says "Initial Escrow Deposit (50%)" (the deposit isn't always 50%). `assignments` says "5-7 Days Standard". Staff screens still use price-catalog names; client pages use website names from `src/features/projects/client-packages.ts` (mirror of `apps/web/app/content/pricing.ts`; keep in sync).
- **Staff study pages:** old-style inner content (mono labels, coloured KPI cards, "Download for Recalculation", "Deliverables Locked · Final Balance Settlement Required", sky/emerald accents) is untouched; redesign in each role's pass.
- **Client:** none (all done 2026-10-01, see Client wrap-up).
- **Shared:** done 2026-10-01: `ChangePasswordCard` reworded; register and client profile show styled messages for empty fields.
- **System screens:** "Page not found" logs a React `<script>` warning in the console. When a staff study page calls `redirect()` while loading, Next logs "Rendered more hooks than during the previous render" in dev (pre-existing).
- **Messages:** other chats in the list update every 30 s or on focus (only the open chat is live); fine for now. Later if needed: only draw visible messages in very long chats; Supabase private channels.
- `CertificateModal.tsx` is unused (nothing opens it) and has an unused `mode` warning; delete it in a clean-up pass.
- `npm run lint` for the whole app still fails on ~200 older warnings (e.g. 38 `any` in `defenselab/actions.ts`); touched files are kept clean.

### Offline mode (`apps/app/OFFLINE-DEV.md`)

- Sample data: studies at every stage, quotes, agreements, payments, notifications, DefenseLab sessions, chat, analysis files, QA reviews, delivered files, one past claim. Change requests (`.dev-revisions.json`) and delivered files on the closed study added 2026-09-28.
- Offline-only fixes made along the way: staff and clients matched by sample account id (`getProjectById`, `assertStudyAccess`, removing a file); the offline payments fallback uses each study's own totals (it used ₱2,750 for every study); the offline revision window is simply delivery + 3 days (the real one skips weekends and holidays); the school profile is kept in a browser cookie when the database is unreachable.
- **If pages that exist suddenly say "Page not found":** the long-running `npm run dev:offline` on 3011 lost its route list (happened twice on 2026-09-28: first every `/api/*` route, then every study tab). A fresh server with the same code served everything. Fix: restart it (Ctrl+C, `npm run dev:offline`). Test scripts no longer write backups into `apps/app`.
