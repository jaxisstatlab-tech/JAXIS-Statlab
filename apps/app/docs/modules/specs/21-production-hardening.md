# JAXIS — Module 21: Production-Grade Security Hardening, Error Boundaries & Deployment Readiness

**Module Code:** `21-production-hardening`\
**Domain:** Production Security, Reliability & Infrastructure\
**Depends On:** `00-foundation`, `01-auth`, `04-intake`, `16-notifications`, `17-reporting`, `20-performance`\
**Status:** ✅ Production-Ready

---

## 1. Module Identity & Purpose

Module 21 hardens JAXIS StatLab for production readiness on Vercel and real-world deployment. It eliminates deployment build barriers, resolves Turborepo environment isolation warnings, enforces strict production authentication guards, adds HTTP security headers, and establishes graceful error boundary and 404 recovery experiences.

### Key Pillars:
1. **Server Action Export Compliance**: Strict adherence to React Server Actions specifications — `"use server"` files exclusively export `async` functions.
2. **Turborepo Environment Variable Declarations**: Explicit platform environment variable tracking in `turbo.json` (`globalEnv`).
3. **Production Authentication Hardening**: Absolute isolation of development password bypasses and offline mock stores from production runtime environments.
4. **HTTP Security Headers**: Enterprise-standard headers protecting against clickjacking, MIME sniffing, and insecure protocols.
5. **Resilient User Error Handling**: Comprehensive error boundaries (`error.tsx`) and custom 404 routes (`not-found.tsx`) adhering to the Dark Precision Terminal design system.

---

## 2. Module Scope & Feature Registry

| Feature ID | Feature Description |
|---|---|
| `PROD-F01` | **Server Action Export Compliance** — Internal query selectors (e.g. `PROJECT_DETAIL_SELECT`) and function aliases in `"use server"` files are declared as private constants or explicit `async function` declarations. |
| `PROD-F02` | **Turborepo Platform Env Registration** — Root `turbo.json` declares all 19 platform variables in `globalEnv` for clean caching and environment isolation during Vercel builds. |
| `PROD-F03` | **Demo Logins Are Local Only** — *(Revised 2026-10-01, see `PROD-F18`.)* The demo presets (`*@jaxis.dev`) and the offline user store work only outside production. `devLoginsAllowed()` in `src/lib/auth.ts` is always `false` in production, whatever `DISABLE_DEV_LOGINS` is set to (that variable now only turns them off locally too). |
| `PROD-F04` | **HTTP Security Headers** — `next.config.js` injects `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, and DNS prefetch headers. |
| `PROD-F05` | **API Route Authentication Guards** — `POST /api/v1/projects` verifies user session before intake creation; storage purge cron endpoint requires valid secrets in production. |
| `PROD-F06` | **Dashboard Error Boundary (`app/dashboard/error.tsx`)** — Catches unhandled dashboard crashes with error digest tracking, retry button, and navigation recovery. |
| `PROD-F07` | **Global Error Boundary (`app/error.tsx`)** — Root application fallback screen with retry actions and return to workspace links. |
| `PROD-F08` | **Custom 404 Not Found Page (`app/not-found.tsx`)** — High-precision 404 page styled with Dark Precision Terminal cards and Tabler icons. |
| `PROD-F09` | **Session Lifespan Hardening** — JWT `maxAge` set to 24 hours in `src/lib/auth.config.ts`. |
| `PROD-F10` | **Production Runtime Environment Validation** — Validates and logs missing production environment variables at server runtime. |
| `PROD-F11` | **Serverless-Resilient Notification Delivery** — Hybrid SSE stream + 15s background delta sync with unread detection in `NotificationDrawer.tsx` guaranteeing real-time delivery across Vercel serverless instances. *(2026-10-01: the stream now delivers each alert only to its recipient, see `PROD-F20`.)* |
| `PROD-F12` | **Serverless-Resilient Chat Delivery** — Supabase Realtime broadcast channels + 4s adaptive delta polling in `MessageThread.tsx` guaranteeing 100% chat delivery even on network drops or WebSocket partition. |
| `PROD-F13` | **Platform-Wide RSC Pre-loading** — React Server Component migration across HR, Staff Attendance, Client Projects, Client Profile, Specialist Payouts, Finance Ledger, Leaves, and CEO Attendance, prefetching data on the server to eliminate client fetch waterfalls and spinner delays. |
| `PROD-F14` | **Instant Real-Time WebSocket Messaging (< 100ms)** — Direct peer broadcast over Phoenix channels, static environment inlining, and 0ms receiver state injection. |
| `PROD-F15` | **Universal Workspace RSC Pre-Loading** — Server-component preloading for Proposals, DefenseLab, Disputes, Intake Desk, Staff Roster, and Messages threads eliminating spinner delays across all roles. |
| `PROD-F16` | **Message Bubble Spring Entrance & Floating Jump Pill** — CSS-accelerated pop-in, sticky bottom scroll anchoring (`ResizeObserver` + multi-frame scroll), and floating "New message" pill. |
| `PROD-F17` | **Cross-Role Real-Time Notification Engine Expansion** — Real-time event streaming and in-app alerts connecting Deliverables, Revisions, Datasets, and Disputes across all 6 roles. |

---

## 3. Phase 2 — Security Audit Fixes (2026-10-01)

A client-side security audit found that one client could reach another client's data in several ways, and that study files were publicly downloadable. All of the issues below are fixed and deployed. None of the fixes changed the database schema; the only data change was suspending the demo accounts (`PROD-F18`), approved by the owner.

| Feature ID | What changed | Commit |
|---|---|---|
| `PROD-F18` | **Demo accounts closed on production.** The seven `@jaxis.dev` accounts existed in the live database with the passwords published in `src/lib/mock-data/users.data.ts`, and the GitHub repository is public. They are suspended in production, and `devLoginsAllowed()` keeps demo logins off in production in code, including the register, password-reset, and password-change shortcuts. Never reactivate them without new private passwords. | `7e8e5d7` |
| `PROD-F19` | **A client's data only ever goes to their own account.** `createProject` no longer retries a failed save under `client@jaxis.dev` or another client. `resolveOrProvisionUser` (`src/lib/user-healing.ts`) never borrows another account, never reactivates or renames an existing one, and gives auto-created accounts a random password instead of a shared default. | `487b737` |
| `PROD-F20` | **Live alerts reach only their recipient.** The SSE stream (`app/api/v1/notifications/stream`) used to match on role, so one client's alert (study ID, title, message) reached every other online client. | `487b737` |
| `PROD-F21` | **Alert creation locked down.** `createInAppAlertAction` was callable by anyone, signed in or not. It now requires ADMIN or CEO and never redirects an alert to another user with the same role. | `487b737` |
| `PROD-F22` | **Study ownership check on "information sent".** `resolveMissingInfo` let any signed-in user move another client's study and returned its details. It now requires the study's own client, or ADMIN/CEO (`assertStudyAccess`). | `487b737` |
| `PROD-F23` | **DefenseLab meeting links are admin-only.** Any signed-in user could change any session's video link, which the app then sent to the client and expert. | `487b737` |
| `PROD-F24` | **Private file storage.** The R2 bucket's public `r2.dev` URL served client files with no login; it is now disabled in Cloudflare. Every file view, download, desk link, and payment QR loads through `/api/files/preview` using `resolveStoredFileUrl()` (`src/lib/file-utils.ts`). Payment QR codes (`treasury/payments/SYSTEM_CONFIG/`) are readable by any signed-in user. | `487b737` |
| `PROD-F25` | **No uploader-chosen content types.** `/api/files/preview` sets `Content-Type` from the file extension (PDF, images, plain text) and sends everything else as `application/octet-stream` with `nosniff`, so an upload disguised as a PDF can't run as a page on the app's domain. | `9fce329` |
| `PROD-F26` | **Real document viewer.** The viewer showed a built-in sample manuscript for every Word file and made-up rows for CSVs. `FileContentPreview.tsx` now renders the real file: `.docx` (docx-preview, no embedded HTML, only web/email links kept), `.xlsx` (read-excel-file, a tab per sheet, first 500 rows), CSV/TSV/TXT, PDF, and images. Other types show a plain explanation and Download. | `9fce329` |
| `PROD-F27` | **Clients can't claim others' files.** Study files, added files, and payment receipts must be the client's own fresh upload in the right folder and not already on file for another person (`checkUploadedFilePaths`, `src/lib/upload-claims.ts`). | `01fdc1a` |
| `PROD-F28` | **Upload size enforced by storage.** Presigned upload URLs sign the exact `Content-Length`, so R2 rejects anything larger than the size that passed the 15 MB check. | `01fdc1a` |
| `PROD-F29` | **Sign-up limits.** Registration allows 5 attempts per email and 10 per network per hour, counted in `auth_audit_logs` so every server shares the same numbers (`src/lib/auth-throttle.ts`); attempts on an existing email are logged too. The API returns 429 when exceeded. | `01fdc1a`, `8d5ef41` |
| `PROD-F30` | **Internal agreement helper no longer callable.** `createOrUpdateSOWInternal` is no longer exported from the server-actions file. | `01fdc1a` |
| `PROD-F31` | **No password hashes in page queries.** The finance summary, workloads, staff capacity (which stored them in the data cache), inbox, ledger, and payouts no longer load whole user rows. | `13c3d35` |
| `PROD-F32` | **Payments use the approved price.** `submitPaymentProof` attaches a payment only to the study's `CLIENT_APPROVED` quote and refuses it otherwise (it used to create an approved quote priced from the client-entered amount). Its errors are returned as errors; the sample-data fallback that answered "submitted" and alerted finance runs only in local development without a database. | `8d5ef41` |
| `PROD-F33` | **Failed-login limits and honest login messages.** After 5 failed logins for an email in 15 minutes (or 30 from one network) sign-in pauses for that email; unknown emails count too, so the pause doesn't reveal which emails have accounts. Suspended and closed accounts now get their message through Auth.js `CredentialsSignin` codes, shown only after the correct password. | `8d5ef41` |
| `PROD-F34` | **Delivered files stay locked until the balance is paid, on the server.** A QA approval marks files released, and the payment check used to happen only on the page. Now every way a client can reach a file checks the balance (only payments finance confirmed count): the download action, the file preview link and the certificate PDF refuse with "Pay the rest of your balance", and refused attempts are logged. Until the files are released the client's page data carries no file list, file IDs or certificate details, and storage paths are never sent to clients. Change requests also need the balance paid. Staff reading a study's files must work on it. The balance is measured against the quote the client accepted. | pending |
| `PROD-F35` | **No sample-data answers on the live site.** Adding or removing a study file, "I've added everything", and loading payments fell back to the local offline files on any database error, so a short database hiccup could tell a client "saved" when nothing was saved, or show a made-up ₱2,750 price. These fallbacks now run only in offline development; live errors are reported plainly. Payments are no longer mixed with sample data, and the page uses the accepted price. | pending |
| `PROD-F36` | **Study files and payment amounts checked on the server.** Clients can change study files only until the agreement is signed, and removing a file checks it belongs to the study in the request (before, a client could remove any study file by its ID). A payment must be what's due: what's left of the deposit, or everything that's left, from confirmed payments only, and not while a receipt is being checked. Admin and CEO can record up to what's left. | pending |
| `PROD-F37` | **Notifications: only your own.** Marking a notification read now only works on the signed-in person's own notifications (delete and clear already did). | pending |

### 3.1 Open Items

The repository is public. Keep secrets out of it, and describe a weakness in committed files only after it is fixed.

| Item | Notes |
|---|---|
| **Look-back checks** | Search Vercel logs for `Using fallback client ID` (studies saved to the wrong client before `PROD-F19`); review `auth_audit_logs` IPs for demo logins on 22–26 Sep 2026; find accounts still using the old shared default password. |
| **Planned reviews** | Payment flow end to end, dependency updates (`npm audit`), and a Content-Security-Policy (the other security headers in `PROD-F04` are live). |
