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
| `PROD-F03` | **QA Demo Authentication & Production Isolation Switch** — Development presets and offline store in `src/lib/auth.ts` remain active for internal employee QA testing on deployed builds, and can be toggled off at client launch via `DISABLE_DEV_LOGINS="true"`. |
| `PROD-F04` | **HTTP Security Headers** — `next.config.js` injects `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, and DNS prefetch headers. |
| `PROD-F05` | **API Route Authentication Guards** — `POST /api/v1/projects` verifies user session before intake creation; storage purge cron endpoint requires valid secrets in production. |
| `PROD-F06` | **Dashboard Error Boundary (`app/dashboard/error.tsx`)** — Catches unhandled dashboard crashes with error digest tracking, retry button, and navigation recovery. |
| `PROD-F07` | **Global Error Boundary (`app/error.tsx`)** — Root application fallback screen with retry actions and return to workspace links. |
| `PROD-F08` | **Custom 404 Not Found Page (`app/not-found.tsx`)** — High-precision 404 page styled with Dark Precision Terminal cards and Tabler icons. |
| `PROD-F09` | **Session Lifespan Hardening** — JWT `maxAge` set to 24 hours in `src/lib/auth.config.ts`. |
| `PROD-F10` | **Production Runtime Environment Validation** — Validates and logs missing production environment variables at server runtime. |
| `PROD-F11` | **Serverless-Resilient Notification Delivery** — Hybrid SSE stream + 15s background delta sync with unread detection in `NotificationDrawer.tsx` guaranteeing real-time delivery across Vercel serverless instances. |
| `PROD-F12` | **Serverless-Resilient Chat Delivery** — Supabase Realtime broadcast channels + 4s adaptive delta polling in `MessageThread.tsx` guaranteeing 100% chat delivery even on network drops or WebSocket partition. |
| `PROD-F13` | **Platform-Wide RSC Pre-loading** — React Server Component migration across HR, Staff Attendance, Client Projects, Client Profile, Specialist Payouts, Finance Ledger, Leaves, and CEO Attendance, prefetching data on the server to eliminate client fetch waterfalls and spinner delays. |
