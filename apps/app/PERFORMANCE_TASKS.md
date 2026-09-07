# JAXIS StatLab — Performance & Optimization Master Tasks

**Focus:** Enterprise Speed, Sub-100ms Perceived Latency, RSC Boundary Optimization, Memory & Bundle Efficiency  
**Stack:** Next.js 16 App Router · React 19 · Prisma ORM · Turbopack · Tailwind CSS v4  
**Design Standard:** Dark Precision Terminal / Enterprise Scientific (`design-system.md` & `.agents/AGENTS.md`)  
**Gate:** `npm run check-types` + `npm run lint` + `npm run build` must all pass cleanly.

---

## 🎯 Target Architecture & Benchmark Goals

| Metric | Current Baseline | Target Benchmark | Optimization Strategy |
| :--- | :--- | :--- | :--- |
| **Login Bundle Size** | ~850 KB+ | **< 220 KB** (-74%) | Lazy-load Three.js via `next/dynamic` |
| **First Contentful Paint (FCP)** | Delayed (Blank + Spinner) | **< 200 ms** (Instant HTML) | Server Components (RSC) data streaming |
| **Soft Page Navigation** | ~400–800 ms (Cache nuked) | **< 80 ms** (Instant) | Preserve router cache & hover pre-fetching |
| **Idle Background Requests** | ~120 POSTs/hour per user | **0 when tab is hidden** | `document.visibilityState` tab sleeping |
| **Database Query Memory** | O(N) (Loads all rows) | **O(1)** (Flat 10-row chunks) | SQL-level `take` / `skip` pagination |
| **Table Scrolling FPS** | Drops with 50+ rows | **Locked 60 FPS** | CSS `content-visibility: auto` |

---

## Phase 1 — Quick Wins & Bundle Optimization (Completed)

### Task 1.1 — Lazy-Load Three.js in Auth Layout
- [x] Convert `import AuthParticleGlobe` in `app/(auth)/layout.tsx` to dynamic import:
  ```tsx
  const AuthParticleGlobe = dynamic(
    () => import("@/components/ui/AuthParticleGlobe"),
    { ssr: false }
  );
  ```
- [x] Ensure login form renders and becomes interactive immediately without waiting for WebGL.
- [x] Verify `/login` and `/register` client bundles drop by ~600KB.

### Task 1.2 — Compiler Tree-Shaking: Add `@tabler/icons-react` to `next.config.js`
- [x] Update `experimental.optimizePackageImports` in `apps/app/next.config.js`:
  - Add `"@tabler/icons-react"`
  - Remove unused `"lucide-react"`
- [x] Verify faster Turbopack dev server compilation and smaller client chunk sizes.

### Task 1.3 — Silent Tab-Aware Background Polling in `NotificationDrawer.tsx`
- [x] Add `document.visibilityState === "visible"` guard to `setInterval` poll in `NotificationDrawer.tsx`.
- [x] Remove `setIsLoading(true)` on interval refreshes to eliminate the 30-second UI flicker when the drawer is open.
- [x] Add window focus listener to refresh immediately when the user returns to the tab.

### Task 1.4 — Stop Indiscriminate Cache Nuking (`revalidatePath("/", "layout")`)
- [x] Audit `src/features/staff/actions.ts` (lines 978-986, 1048-1056, 1188-1196, 1246-1254).
- [x] Remove `revalidatePath("/", "layout")` calls that purge the entire application's client router cache.
- [x] Replace with targeted path revalidation (e.g. only `/dashboard/staff/hr`, `/dashboard/finance/leaves`).

---

## Phase 2 — Perceived Speed & Instant Navigation (Completed)

### Task 2.1 — Micro Topbar Route Progress Indicator (`#CC6600` Laser Line)
- [x] Create `<RouteProgressBar />` component in `apps/app/app/components/layout/`.
- [x] Implement a slim 2px `#CC6600` Enterprise Orange progress line that animates on route transition.
- [x] Mount in `app/layout.tsx` or `DashboardShell.tsx` with zero layout shift and instant feedback.

### Task 2.2 — Hover-Intent Pre-fetching on Table Rows & Navigation Links
- [x] Add `onMouseEnter` / `onFocus` prefetch triggers on:
  - Project table rows in `AdminDashboardPage` (`router.prefetch(...)`).
  - Finance receivables table rows in `FinanceDashboardPage`.
- [x] Soft navigation latency drops below 80ms on click due to background pre-warming.

### Task 2.3 — Dynamic Code-Splitting on Heavy Modals & Lightboxes
- [x] Dynamically import heavy modals with `next/dynamic` (`ssr: false`):
  - `PaymentProofUploadModal` in client payment desk.
  - `DocumentViewerLightbox` in `ProjectFilesCard`.
  - `PaymentVerificationModal` in finance/admin payment inspection desks.
  - `PaymentChannelSettingsModal` in finance overview.
- [x] Confirmed heavy modal chunks are only fetched over the wire upon user click, reducing initial page bundles.

### Task 2.4 — High-Performance Table Virtualization (`content-visibility: auto`)
- [x] Add utility class `.virtual-row` in `globals.css` using:
  ```css
  content-visibility: auto;
  contain-intrinsic-size: 0 48px;
  ```
- [x] Apply to data tables for locked 60 FPS scrolling on large datasets.

---

## Phase 3 — Core Architecture & Data Flow (RSC & Database Scaling)

### Task 3.1 — Server-Component-First Pages (RSC Migration)
- [x] Migrate `app/dashboard/admin/page.tsx` from `"use client"` to `async function AdminDashboardPage()` (RSC).
- [x] Fetch initial data on the server concurrently (`Promise.all([projectService.getProjects(), getFinanceReceivablesSummary()])`).
- [x] Pass pre-fetched data into `AdminDashboardClient` (`initialProjects`, `initialFinanceData`).
- [x] Eliminate initial blank loading spinner on admin overview entry.
- [x] Migrate `app/dashboard/finance/page.tsx` to `async function FinanceDashboardPage()` (RSC) with server pre-fetching into `FinanceDashboardClient`.
- [x] Migrate `app/dashboard/client/page.tsx` to `async function ClientDashboardPage()` (RSC) with server pre-fetching into `ClientDashboardClient`.
- [x] Migrate `app/dashboard/statistician/page.tsx` to `async function StatisticianDashboardPage()` (RSC) with server pre-fetching into `StatisticianDashboardClient`.
- [x] Migrate `app/dashboard/qa/page.tsx` to `async function QALeadDashboardPage()` (RSC) with server pre-fetching into `QADashboardClient`.
- [x] Convert `/dashboard` root route into a zero-latency `React.cache()` role dispatcher.

### Task 3.2 — Transition Read Operations Away from POST Server Actions
- [x] Reserve Server Actions (`"use server"`) strictly for mutations (Create, Update, Delete).
- [x] Use direct Server Component database calls for initial page rendering across dashboards.
- [x] For client-side dynamic search & filtering, introduce clean GET endpoints (`GET /api/v1/projects`) with `Cache-Control: private, max-age=15, stale-while-revalidate=60` and batched telemetry.

### Task 3.3 — Database-Level SQL Pagination (`take` / `skip`) in `getProjects`
- [x] Update `getProjects` in `src/features/projects/actions.ts` to accept `{ page?: number, pageSize?: number }`.
- [x] Add `take: pageSize, skip: (page - 1) * pageSize` to Prisma `findMany`.
- [x] Support pagination options in `ProjectFilterSchema` and `project.service.ts`.
- [x] Slicing support in dev cache fallback to keep memory usage flat.

### Task 3.4 — Session Auth Deduplication with `React.cache()`
- [x] In `src/lib/auth.ts`, wrap session verification with `React.cache()`:
  ```ts
  export const auth = cache(nextAuthInstance.auth);
  ```
- [x] Prevent multiple JWT decrypt and database operations when multiple Server Components call `auth()` in a single request.

### Task 3.5 — Optimistic UI Mutations (React 19 `useOptimistic`)
- [x] Implement `useOptimistic` in `NotificationDrawer.tsx`:
  - Instant (0ms) visual status update when marking an alert as read or clicking "Mark all as read".
  - Instant unread counter badge and filter tab count decrements.
  - Smooth optimistic rollback with Toast notification if server mutation fails.
- [x] Implement `useOptimistic` in `PendingLeaveQueue.tsx`:
  - Instant card removal from the queue when approving or declining specialist leave requests.
  - Automatic rollback on server failure with Toast notification.

---

## Phase 4 — High-Speed Database Retrieval & In-Memory Caching (Completed)

### Task 4.1 — Modern Minimalist Loading State Redesign & Anti-Double-Loading
- [x] Redesigned `LoadingState.tsx` from the legacy HUD reticle into a sleek single-track circular arc spinner (`rgba(255, 255, 255, 0.08)` base with `#CC6600` 100° arc, `strokeLinecap="round"`, `0.85s linear infinite`).
- [x] Removed all HUD clutter, crosshair ticks, concentric rings, and ping blobs.
- [x] Audited all role pages (Admin, Finance, Client, QA, Statistician, CEO) to eliminate secondary accessory card loaders flashing concurrently alongside page loaders.
- [x] Updated `PendingLeaveQueue.tsx` to return `null` while loading so it never triggers a double loading state.

### Task 4.2 — In-Memory Server Caching (`unstable_cache`) & Canonical Tags
- [x] Created `apps/app/src/lib/cache-tags.ts` establishing `CACHE_TAGS` (`PROJECTS`, `STAFF_CAPACITY`, `STAFF_DIRECTORY`, `ATTENDANCE_REVIEW`, `PAYROLL`).
- [x] Implemented `invalidateCacheTags(...)` supporting Next.js 16 `updateTag` and `revalidateTag` for instantaneous read-your-own-writes consistency.
- [x] Wrapped `getStaffCapacity` specialist queries in `fetchCachedStaffUsers` with 30s TTL.
- [x] Wrapped `getAttendanceReviewDeskData` raw records in `fetchCachedAttendanceDeskRaw` with 30s TTL.
- [x] Wrapped signatory resolution and staff directories in `fetchCachedSignatoriesDb` and `fetchCachedStaffMembersDb` with 60s TTL.

### Task 4.3 — Parallel Query Execution in Read Actions
- [x] Parallelized sequential Prisma queries in `attendance/actions.ts` using `Promise.all` across correction requests, monthly logs, and active clock-ins.
- [x] Added immediate tag invalidation to `reviewAttendanceCorrection`, `clockIn`, `clockOut`, and `fileAttendanceCorrection`.

### Task 4.4 — Server Component Pre-loading for Operational Desks (RSC)
- [x] Migrated `admin/assignments` to async Server Component `page.tsx` prefetching `getProjects` and `getStaffCapacity` concurrently, passing preloaded data to `AssignmentsClient.tsx` (0ms spinner wait time).
- [x] Migrated `finance/attendance` to async Server Component `page.tsx` prefetching `getAttendanceReviewDeskData`, passing preloaded data to `AttendanceReviewClient.tsx`.
- [x] Migrated `finance/payroll` to async Server Component `page.tsx` prefetching `getCompanyPayslips` and `getPayrollConfigurations`, passing preloaded data to `FinancePayrollClient.tsx`.
- [x] Verified zero console errors and 0-error TypeScript build across the monorepo.

---

## Phase 5 — Second-Pass Scalability & Latency Optimization (Completed)

### Task 5.1 — CEO Dashboard Server Component (RSC) Migration
- [x] Migrate `app/dashboard/ceo/page.tsx` from `"use client"` to an async Server Component (`async function CEODashboardPage()`).
- [x] Prefetch `projectService.getProjects()` and `getFinanceReceivablesSummary()` concurrently with `Promise.all` on the server.
- [x] Create `app/dashboard/ceo/CEODashboardClient.tsx` receiving `initialProjects` and `initialFinanceData`.
- [x] Eliminate the initial blank loading spinner on CEO dashboard entry (0ms perceived load).

### Task 5.2 — Real-Time Delivery Optimization (Eliminate Dual Polling Redundancy)
- [x] In `NotificationDrawer.tsx`, track SSE connection health (`sseConnectedRef`). Skip the 25s polling interval whenever SSE is connected and healthy; only use polling as a fallback when SSE is disconnected.
- [x] In `ClientDashboardClient.tsx`, remove the redundant 30s `setInterval` polling loop. Rely on the already connected SSE `jaxis:study-updated` event bus and tab visibility listeners.

### Task 5.3 — Parallelize `createProject` Sequential Database Waterfalls
- [x] In `src/features/projects/actions.ts` (`createProject`), parallelize independent pre-validation queries (`getClientProfile()` and `db.user.findUnique`) via `Promise.all`.
- [x] Reduce submission turnaround latency by ~100–120ms.

### Task 5.4 — Consolidate Staff Mutation `revalidatePath` Fan-Out
- [x] In `src/features/staff/actions.ts`, extract a consolidated `revalidateStaffCaches()` helper.
- [x] Replace duplicate blocks of 7 consecutive `revalidatePath` calls across `requestLeave`, `returnFromLeave`, `approveLeave`, and `rejectLeave` with centralized cache invalidation.

### Task 5.5 — Precision Column Selection in `getProjectAuditTrail`
- [x] In `src/features/projects/actions.ts` (`getProjectAuditTrail`), replace unbounded `include: { client: true, files: true, quotations: true, sows: true, payments: true }` with precision `select` targeting only the fields needed for timeline telemetry.
- [x] Prevent over-fetching sensitive client attributes or large file descriptors.

### Task 5.6 — Extract Shared Canonical `PROJECT_DETAIL_SELECT`
- [x] In `src/features/projects/actions.ts`, extract the repeated 40-line `select` projection into a reusable `PROJECT_DETAIL_SELECT` constant.
- [x] Standardize project queries across intake, status updates, and duplicate checks.

### Task 5.7 — Compiler & Runtime Configuration Tuning
- [x] In `apps/app/next.config.js`, enable `reactStrictMode: true` to prevent hidden effect lifecycle leaks in production.
- [x] Increase `onDemandEntries` (`maxInactiveAge: 120s`, `pagesBufferLength: 5`) to prevent aggressive page eviction and recompilation in dev mode.

---

## Phase 6 — Production-Grade Hardening & Vercel Deployment Readiness (Completed)

### Task 6.1 — Server Action Export Compliance (Vercel Build Error Fix)
- [x] In `src/features/projects/actions.ts`, remove `export` from `PROJECT_DETAIL_SELECT`. Keep it file-scoped because Next.js prohibits non-async-function exports from `"use server"` files.
- [x] In `src/features/staff/actions.ts` and `src/features/quotations/actions.ts`, convert function alias exports (`getStaffDirectory`, `getStaffSelfProfile`, `getQuotationsDirectory`) to explicit `async function` declarations.
- [x] Eliminates the Vercel production build error: `Error: A "use server" file can only export async functions, found object`.

### Task 6.2 — Turborepo Environment Variable Declarations (`turbo.json`)
- [x] Add `globalEnv` array in root `turbo.json` declaring all 19 production and deployment variables:
  - `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `NEXTAUTH_URL`, `NODE_ENV`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
  - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TRIGGER_API_KEY`, `TRIGGER_API_URL`, `AUTH_TRUST_HOST`, `NEXT_PHASE`
- [x] Eliminates the Turborepo warning on Vercel regarding missing environment variable declarations.

### Task 6.3 — Production Auth Security Hardening
- [x] In `src/lib/auth.ts`, wrap dev password fallback check with `process.env.NODE_ENV !== "production"`.
- [x] In `src/lib/auth.ts`, wrap offline credentials fallback with `process.env.NODE_ENV !== "production"`.
- [x] Prevents dev credentials (e.g. `admin@jaxis.dev` / `JaxisAdmin2026!`) from ever validating against production data.

### Task 6.4 — HTTP Security Headers
- [x] In `apps/app/next.config.js`, configure standard enterprise security headers:
  - `X-Frame-Options: SAMEORIGIN` (Clickjacking prevention)
  - `X-Content-Type-Options: nosniff` (MIME sniffing prevention)
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS enforcement)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-DNS-Prefetch-Control: on`

### Task 6.5 — Route & Cron Authorization Hardening
- [x] In `app/api/v1/projects/route.ts`, add `auth()` session verification to `POST` handler to prevent unauthenticated study creation.
- [x] In `app/api/v1/crons/storage-purge/route.ts`, add production check requiring configured cron secrets so unauthenticated executions cannot bypass verification in production.

### Task 6.6 — Enterprise Error Boundaries & 404 Recovery UI
- [x] Create `app/dashboard/error.tsx` for graceful dashboard error recovery with retry actions and error digest telemetry.
- [x] Create root `app/error.tsx` for global application fallback.
- [x] Create `app/not-found.tsx` with Dark Precision Terminal styling and instant link to return to workspace.
- [x] All error components strictly follow `.agents/AGENTS.md` (no emojis, Tabler icons, Title Case, `#CC6600` accent, plain English copy).

### Task 6.7 — Session Lifespan Hardening
- [x] In `src/lib/auth.config.ts`, reduce JWT `maxAge` from 30 days to 24 hours to secure financial and operational sessions.

### Task 6.8 — Real-Time Serverless Resilience (Hybrid Delivery & Delta Safety Nets)
- [x] In `NotificationDrawer.tsx`, implement a resilient 15s background delta sync with unread detection. Rings bell, displays live floating toast, and dispatches `jaxis:study-updated` even when serverless function instances are partitioned across Vercel.
- [x] In `MessageThread.tsx`, add an adaptive 4s delta sync (`syncDelta`) safety net with tab visibility listener, guaranteeing 100% chat delivery even if WebSockets drop or are blocked by corporate proxies.
- [x] In `src/features/messaging/actions.ts`, harden Supabase Realtime server-side broadcast to verify channel subscription before transmission and tear down channel cleanly.

### Task 6.9 — Platform-Wide React Server Component (RSC) Pre-Loading Migration
- [x] **Eliminated 2.79s DevTools Bottleneck**: In `/dashboard/staff/hr`, converted the `"use client"` page with a 2.79s client-side waterfall into an async Server Component wrapper with `<HrPortalClient />`, prefetching `getMyHrPortalData`, `getMyOfficialPayslip`, and `getMyPayoutDetails` concurrently on the server.
- [x] **Staff Attendance**: Converted `/dashboard/staff/attendance` to async Server Component prefetching `getMyAttendanceHistory`, rendering `<StaffAttendanceClient />` with zero initial loading delay.
- [x] **Client Research Desk**: Converted `/dashboard/client/projects` to async Server Component prefetching `getProjects` and `getClientProfile`, rendering `<ClientProjectsListClient />` instantly.
- [x] **Client Academic Profile**: Converted `/dashboard/client/profile` to async Server Component prefetching `getClientProfile`, rendering `<ClientProfileClient />` without form pop-in shifts.
- [x] **Specialist Payouts**: Converted `/dashboard/statistician/payouts` and `/dashboard/qa/payouts` to async Server Components prefetching `getSpecialistPayoutHistoryAction`.
- [x] **Finance Accounting & Leaves**: Converted `/dashboard/finance/ledger` and `/dashboard/finance/leaves` to async Server Components prefetching ledger records and leave availability queues.
- [x] **CEO Executive Audit**: Converted `/dashboard/ceo/attendance` to async Server Component prefetching `getCeoAttendanceAuditVault`.
- [x] **Zero Regressions & 100% Type-Safe**: Validated with `npm run check-types` (0 errors) and `npx next build` (58/58 routes compiled).

---

## 🔒 Verification & Quality Gate Checklist
Before marking any task complete:
- [x] `npm run check-types` passes with **0 errors**.
- [x] `npx next build` passes cleanly: 58/58 routes prerendered / dynamic.
- [x] `npx turbo run build --filter=app` passes cleanly with **code 0**.
- [x] All pages follow `.agents/AGENTS.md` and `apps/app/docs/design-system.md` standards.
- [x] No visual styling or functional regressions across role desks.



