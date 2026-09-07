# JAXIS — Module 20: High-Speed Database Retrieval Engine, Server-Side Caching & Minimalist UI

**Module Code:** `20-performance`\
**Domain:** Core Platform Architecture / Data Retrieval & Latency Optimization\
**Depends On:** `00-foundation`, `01-auth`, `02-staff`, `08-assignment`, `14-finance`, `18-attendance`, `19-payroll`\
**Status:** ✅ Production-Ready

---

## 1. Module Identity & Purpose

Module 20 establishes sub-100ms perceived latency across JAXIS StatLab through an RSC-first (React Server Components) data prefetching architecture, in-memory server caching via Next.js `unstable_cache`, and a clean modern minimalist design system overhaul.

### Key Pillars:
1. **Server Component Pre-Loading (RSC)**: Inner operational desks prefetch read-heavy datasets directly on the server, streaming pre-populated HTML to eliminate initial client loading spinners.
2. **In-Memory Server Caching**: Queries are cached with canonical tags (`PROJECTS`, `STAFF_CAPACITY`, `STAFF_DIRECTORY`, `ATTENDANCE_REVIEW`, `PAYROLL`), reducing repeated database roundtrips to 0–2ms.
3. **Instant Cache Invalidation**: Server Actions trigger `invalidateCacheTags` across mutations for immediate read-your-own-writes consistency.
4. **Minimalist Loading & Anti-Double-Loading**: Platform loading states use `<LoadingState />` with a calibrated Enterprise Orange arc spinner. Secondary loaders during page fetches are eliminated.

---

## 2. Module Scope & Feature Registry

| Feature ID | Feature Description |
|---|---|
| `PERF-F01` | **Canonical Cache Tags (`cache-tags.ts`)** — Centralized cache keys (`PROJECTS`, `STAFF_CAPACITY`, `STAFF_DIRECTORY`, `ATTENDANCE_REVIEW`, `PAYROLL`) with `invalidateCacheTags` helper using Next.js `revalidateTag` and `updateTag`. |
| `PERF-F02` | **Admin Assignments RSC Migration** — Server-preloaded assignments desk (`/dashboard/admin/assignments`) streaming active studies and specialist capacity with 0ms client wait time. |
| `PERF-F03` | **Finance Attendance RSC Migration** — Server-preloaded attendance review desk (`/dashboard/finance/attendance`) prefetching timesheet and punch-clock reconciliation data. |
| `PERF-F04` | **Finance Payroll RSC Migration** — Server-preloaded payroll desk (`/dashboard/finance/payroll`) prefetching payslip ledgers, active pay rates, and signatories. |
| `PERF-F05` | **CEO Dashboard RSC Migration** — Server-preloaded executive desk (`/dashboard/ceo`) prefetching project portfolios and treasury receivables in parallel. |
| `PERF-F06` | **Modern Minimalist Loading Indicator** — Clean single-track 100° arc spinner in `#CC6600` Enterprise Orange rotating at 0.85s linear infinite. |
| `PERF-F07` | **Real-Time Delivery Optimization** — SSE stream health tracking in `NotificationDrawer.tsx` and `ClientDashboardClient.tsx` that sleeps polling loops while SSE is healthy. |
| `PERF-F08` | **Parallel Query Execution** — Concurrent pre-validation queries in `createProject` and attendance actions via `Promise.all`. |
| `PERF-F09` | **Staff HR Portal RSC Migration** — Server-preloaded HR desk (`/dashboard/staff/hr`) prefetching timesheets, payslips, and payout details concurrently to eliminate the 2.79s client-side waterfall. |
| `PERF-F10` | **Staff Attendance RSC Migration** — Server-preloaded punch timesheet desk (`/dashboard/staff/attendance`) prefetching logs, correction requests, and weekly KPIs. |
| `PERF-F11` | **Client Projects List RSC Migration** — Server-preloaded client study desk (`/dashboard/client/projects`) streaming research portfolios and profile verification state with 0ms client wait time. |
| `PERF-F12` | **Client Academic Profile RSC Migration** — Server-preloaded profile settings (`/dashboard/client/profile`) streaming university and contact credentials without form pop-in shifts. |
| `PERF-F13` | **Statistician Payouts RSC Migration** — Server-preloaded milestone earnings desk (`/dashboard/statistician/payouts`) streaming escrow and disbursement history. |
| `PERF-F14` | **QA Specialist Payouts RSC Migration** — Server-preloaded audit fee desk (`/dashboard/qa/payouts`) streaming verified audit earnings. |
| `PERF-F15` | **Finance Ledger RSC Migration** — Server-preloaded accounting ledger (`/dashboard/finance/ledger`) prefetching gross receipts, specialist splits, and platform margin metrics. |
| `PERF-F16` | **Specialist Leave Approvals RSC Migration** — Server-preloaded HR leave desk (`/dashboard/finance/leaves`) streaming specialist availability and leave queues. |
| `PERF-F17` | **CEO Attendance & Labor Policy RSC Migration** — Server-preloaded executive audit vault (`/dashboard/ceo/attendance`) prefetching raw punch records and corporate duty policies. |
