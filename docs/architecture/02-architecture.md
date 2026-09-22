# JAXIS — Application Architecture

**App:** `apps/app` (SaaS Dashboard Workspace)\
**Document Type:** Technical Architecture & Repository Directory Layout\
**Derived from:** `scope.md` · `roadmap.md` · `ARCHITECTURE.md`\
**Stack Version:** v2 — Cost-optimized (Supabase + Cloudflare R2 + Resend + Trigger.dev)\
**Cost Target:** $0/month development · $45/month MVP launch · ~$67/month growth

---

## 1. Recommended Full-Stack Technology Stack

### Core Framework

| Category | Technology | Rationale |
|---|---|---|
| **Framework** | **Next.js 16** (App Router) | Already installed. Server Components, Server Actions, file-based routing, API routes — optimal for multi-role SaaS with strong SSR/SSG needs. |
| **Runtime** | **React 19** | Already installed. Concurrent features, Server Components, `use()` hook. |
| **Language** | **TypeScript 5.9** (strict mode) | Already installed. Non-negotiable per AGENTS.md. |

### Database & ORM

| Category | Technology | Free Tier | Rationale |
|---|---|---|---|
| **Database** | **Supabase** (managed PostgreSQL) | 500MB, no pausing on Pro ($25/mo) | Managed Postgres with built-in Realtime and Storage. Prisma connects via Supabase connection pooler URL. |
| **ORM** | **Prisma ORM** | Free (open source) | Type-safe query builder. Auto-generated types from schema. Migration system. Connects to Supabase Postgres via `DATABASE_URL`. |
| **DB Singleton** | `src/lib/db.ts` | — | Global Prisma client singleton with dev-mode hot reload safe global caching. |

### Authentication

| Category | Technology | Rationale |
|---|---|---|
| **Auth** | **NextAuth.js v5** (Auth.js) | Session-based auth with credentials provider. JWT or DB sessions. Role stored in session token. Integrates natively with Next.js App Router middleware. |
| **Password Hashing** | **bcryptjs** | Industry standard for password hashing at rest. |

### Styling

| Category | Technology | Rationale |
|---|---|---|
| **CSS Framework** | **Tailwind CSS v4** | Per AGENTS.md. Utility-first, zero CSS bundle bloat. Token system via CSS custom properties mapped to Tailwind theme extensions. |
| **Fonts** | `next/font` (Inter + Disket Mono) | Zero layout shift, self-hosted, per design system spec. |
| **UI Primitives** | **Radix UI** (headless) | Accessible, unstyled primitives — Dialogs, Dropdowns, Tabs, Select, Checkbox. JAXIS styling applied via Tailwind. No opinionated visual library. |

### Validation & Type Safety

| Category | Technology | Rationale |
|---|---|---|
| **Schema Validation** | **Zod** | Runtime validation on all API inputs. Shares schema between client forms and server validation. |
| **Form Management** | **React Hook Form** + Zod resolver | Controlled forms with Zod-integrated validation. Minimal re-renders. |

### File Storage

| Category | Technology | Free Tier | Rationale |
|---|---|---|---|
| **Large File Storage** | **Cloudflare R2** | **10GB free, $0 egress forever** | For: research datasets (up to 100MB), analysis outputs, SOW PDFs, deliverables, DefenseLab recordings. Zero egress fees = significant savings at scale. |
| **Small File Storage** | **Supabase Storage** | 1GB free (Pro: 100GB) | For: payment proof images, profile pictures, small documents. Bundled with Supabase — no extra cost. |
| **Upload Strategy** | Pre-signed URLs | — | Server generates short-lived pre-signed upload/download URLs. Files never proxy through Next.js server. |
| **Client** | `src/lib/storage.ts` | — | Unified abstraction: routes to R2 or Supabase Storage based on file category and size. |

### Email Notifications

| Category | Technology | Free Tier | Rationale |
|---|---|---|---|
| **Email Provider** | **Resend** | **3,000 emails/month** | Best DX with React Email. Native support for React component templates. Abstracted behind `src/lib/email.ts` — swap provider in 1 file. |
| **Email Templates** | **React Email** | Free (open source) | Type-safe, component-driven email templates in `src/lib/email/templates/`. Server-side HTML rendering. |

### Background Jobs

| Category | Technology | Free Tier | Rationale |
|---|---|---|---|
| **Job Queue / Cron** | **Trigger.dev** | **250,000 runs/month** | For: 3-day pending project expiry, 90-day file retention purge, 24-hour SLA deadline alerts. Much more generous free tier than Vercel Cron (1 job on free) or Inngest (50K). SDK-first, TypeScript-native. |

### Data Fetching (Client-Side)

| Category | Technology | Rationale |
|---|---|---|
| **Server State** | **TanStack Query v5** | For client-side data that requires real-time updates (message threads, project status polling). Per ARCHITECTURE.md. |

### Real-Time

| Category | Technology | Free Tier | Rationale |
|---|---|---|---|
| **Realtime Messaging** | **Supabase Realtime** | **200 concurrent connections** | Bundled with Supabase — no extra cost. WebSocket channels per project replace Pusher. TanStack Query polling as a fallback for MVP if Realtime causes complexity. |

### Developer Experience

| Category | Technology | Rationale |
|---|---|---|
| **Monorepo** | **Turborepo** | Already configured. Remote caching, task pipelines. |
| **Linting** | **ESLint 9** (already configured) | `no-unused-vars`, `no-explicit-any` at error level. |
| **Package Manager** | **npm** (already configured) | Per existing `package.json` and `package-lock.json`. |

---

## 2. Repository Directory Layout

```
apps/app/
├── architecture.md           ← This document
├── TASKS.md                  ← Active module task tracking
│
├── .agents/
│   └── rules/
│       └── guardrails.md     ← Stack-specific guardrails (RULE_REL, RULE_QUO, etc.)
│
├── docs/
│   ├── scope.md              ← Business & product scope (source of truth)
│   ├── design-system.md      ← Color tokens, typography, component specs
│   ├── roadmap.md            ← Numbered module sequence (00–17, Roadmap v2)
│   └── modules/                    ← Per-module implementation specs
│       ├── 00-foundation.md
│       ├── 01-auth.md
│       ├── 02-staff.md              ← Expert Provisioning (moved from 17)
│       ├── 03-client-profile.md
│       ├── 04-intake.md
│       ├── 05-quotation.md
│       ├── 06-sow.md
│       ├── 07-payments.md
│       ├── 08-assignment.md
│       ├── 09-messaging.md          ← Messaging (moved from 11)
│       ├── 10-analysis.md
│       ├── 11-qa.md
│       ├── 12-deliverables.md       ← Deliverables + Revisions (merged)
│       ├── 13-defenselab.md
│       ├── 14-finance.md
│       ├── 15-disputes.md
│       ├── 16-notifications.md
│       └── 17-reporting.md          ← Reporting + Archive (merged)
│
├── prisma/
│   ├── schema.prisma               ← Single source of truth for all DB models
│   ├── migrations/                 ← Prisma migration history
│   └── seed.ts                     ← DB seed: roles, Operations Manager user, package configs
│
├── public/                         ← Static assets (favicon, OG images)
│
└── src/
    │
    ├── app/                        ← Next.js App Router: URL routes and page views
    │   ├── layout.tsx              ← Root layout (fonts, providers, global styles)
    │   ├── page.tsx                ← Public root (redirects to /login or /dashboard)
    │   ├── (auth)/                 ← Auth route group (no dashboard layout)
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── dashboard/              ← Protected dashboard routes
    │   │   ├── layout.tsx          ← Dashboard shell: Topbar + Sidebar
    │   │   ├── client/             ← Client Portal
    │   │   │   ├── page.tsx        ← Client home (project list)
    │   │   │   ├── profile/page.tsx
    │   │   │   ├── projects/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── new/page.tsx
    │   │   │   │   └── [id]/
    │   │   │   │       ├── page.tsx         ← Project detail
    │   │   │   │       ├── quote/page.tsx
    │   │   │   │       ├── sow/page.tsx
    │   │   │   │       ├── payment/page.tsx
    │   │   │   │       ├── messages/page.tsx
    │   │   │   │       ├── deliverables/page.tsx
    │   │   │   │       └── revision/page.tsx
    │   │   │   └── defenselab/page.tsx
    │   │   ├── admin/              ← Operations / Admin Desk
    │   │   │   ├── page.tsx        ← Admin overview
    │   │   │   ├── intake/page.tsx
    │   │   │   ├── quotations/page.tsx
    │   │   │   ├── assignments/page.tsx
    │   │   │   ├── revisions/page.tsx
    │   │   │   ├── disputes/page.tsx
    │   │   │   ├── messages/page.tsx       ← Blocked message queue
    │   │   │   ├── defenselab/page.tsx
    │   │   │   ├── experts/page.tsx
    │   │   │   ├── archive/page.tsx
    │   │   │   ├── reports/page.tsx
    │   │   │   └── projects/[id]/          ← Project management views
    │   │   │       ├── page.tsx
    │   │   │       ├── sow/page.tsx
    │   │   │       ├── payment/page.tsx
    │   │   │       └── deliverables/page.tsx
    │   │   ├── statistician/       ← Analysis Workspace
    │   │   │   ├── page.tsx
    │   │   │   ├── payouts/page.tsx
    │   │   │   └── projects/[id]/
    │   │   │       ├── page.tsx
    │   │   │       ├── workbench/page.tsx
    │   │   │       └── messages/page.tsx
    │   │   ├── qa/                 ← QA Studio
    │   │   │   ├── page.tsx
    │   │   │   └── queue/page.tsx
    │   │   ├── finance/            ← Finance Console
    │   │   │   ├── page.tsx
    │   │   │   ├── payments/page.tsx
    │   │   │   ├── payouts/page.tsx
    │   │   │   └── reports/page.tsx
    │   │   └── ceo/                ← Executive Overview
    │   │       ├── page.tsx
    │   │       ├── finance/page.tsx
    │   │       ├── disputes/page.tsx
    │   │       ├── escalations/page.tsx    ← Ethical breach queue
    │   │       ├── experts/page.tsx
    │   │       └── reports/page.tsx
    │   └── api/
    │       └── v1/                 ← All API routes under /api/v1/
    │           ├── auth/
    │           │   ├── register/route.ts
    │           │   └── [...nextauth]/route.ts
    │           ├── projects/
    │           │   ├── route.ts                  ← GET (list), POST (create)
    │           │   └── [id]/
    │           │       ├── route.ts              ← GET (detail)
    │           │       ├── status/route.ts       ← PATCH (status transition)
    │           │       ├── pause-sla/route.ts
    │           │       └── flag-scope-creep/route.ts
    │           ├── quotations/
    │           │   ├── route.ts
    │           │   └── [id]/
    │           │       ├── route.ts
    │           │       ├── send/route.ts
    │           │       └── respond/route.ts
    │           ├── sow/
    │           │   ├── generate/route.ts
    │           │   └── [id]/
    │           │       └── sign/route.ts
    │           ├── payments/
    │           │   ├── proof/route.ts
    │           │   └── [id]/
    │           │       └── verify/route.ts
    │           ├── assignments/
    │           │   ├── route.ts
    │           │   ├── my-workload/route.ts
    │           │   └── [id]/
    │           │       └── reassign/route.ts
    │           ├── analysis/
    │           │   ├── upload/route.ts
    │           │   └── [projectId]/
    │           │       ├── route.ts
    │           │       └── submit-for-qa/route.ts
    │           ├── qa/
    │           │   ├── queue/route.ts
    │           │   ├── reviews/route.ts
    │           │   └── escalate/route.ts
    │           ├── deliverables/
    │           │   ├── upload/route.ts
    │           │   └── [id]/
    │           │       ├── release/route.ts
    │           │       └── download/route.ts
    │           ├── messages/
    │           │   ├── route.ts
    │           │   └── [projectId]/route.ts
    │           ├── revisions/
    │           │   ├── route.ts
    │           │   └── [id]/
    │           │       └── classify/route.ts
    │           ├── defenselab/
    │           │   ├── book/route.ts
    │           │   └── [id]/
    │           │       ├── reschedule/route.ts
    │           │       └── recording/route.ts
    │           ├── finance/
    │           │   ├── ledger/route.ts
    │           │   ├── payouts/
    │           │   │   ├── calculate/route.ts
    │           │   │   └── disburse/route.ts
    │           │   └── reports/[type]/route.ts
    │           ├── disputes/
    │           │   ├── route.ts
    │           │   └── [id]/
    │           │       ├── chargeback/route.ts
    │           │       └── resolve/route.ts
    │           ├── users/
    │           │   └── [id]/
    │           │       ├── suspend/route.ts
    │           │       └── terminate/route.ts
    │           ├── reports/
    │           │   └── [type]/route.ts
    │           ├── client/
    │           │   └── profile/route.ts
    │           └── account/
    │               └── data-deletion-request/route.ts
    │
    ├── components/
    │   └── ui/                     ← Shared UI primitives (consumed from @repo/ui or local)
    │       ├── Button.tsx
    │       ├── Card.tsx
    │       ├── StatusBadge.tsx
    │       ├── DataTable.tsx
    │       ├── FormInput.tsx
    │       ├── FormSelect.tsx
    │       ├── FormTextarea.tsx
    │       ├── Modal.tsx
    │       ├── Alert.tsx
    │       ├── SidebarNav.tsx
    │       ├── Topbar.tsx
    │       ├── Skeleton.tsx
    │       ├── Toast.tsx
    │       ├── FileUpload.tsx
    │       ├── Badge.tsx
    │       └── PageHeader.tsx
    │
    ├── features/                   ← Isolated feature sandboxes (one per roadmap module)
    │   ├── auth/
    │   │   ├── actions.ts          ← Server Actions: login, register, logout
    │   │   ├── components/         ← LoginForm, RegisterForm
    │   │   ├── schemas.ts          ← Zod: LoginSchema, RegisterSchema
    │   │   └── types.ts
    │   ├── intake/
    │   │   ├── actions.ts          ← createProject, requestMissingInfo, markComplete
    │   │   ├── components/         ← ProjectSubmissionForm, IntakeQueue, ProjectCard
    │   │   ├── schemas.ts          ← ProjectIntakeSchema
    │   │   └── types.ts
    │   ├── quotation/
    │   │   ├── actions.ts          ← createQuote, issueQuote, clientRespond
    │   │   ├── components/         ← QuoteBuilder, QuoteReview, PackageSelector
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── sow/
    │   │   ├── actions.ts          ← generateSOW, signSOW
    │   │   ├── components/         ← SOWViewer, SOWSignForm
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── payments/
    │   │   ├── actions.ts          ← uploadProof, verifyPayment, rejectPayment
    │   │   ├── components/         ← PaymentStatus, ProofUploader, VerificationQueue
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── assignment/
    │   │   ├── actions.ts          ← assignExpert, reassignExpert, pauseSLA
    │   │   ├── components/         ← AssignmentPanel, WorkloadTable, CapacityIndicator
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── analysis/
    │   │   ├── actions.ts          ← uploadOutput, submitForQA, flagScopeCreep
    │   │   ├── components/         ← Workbench, FileVersionList, ScopeCreepAlert
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── qa/
    │   │   ├── actions.ts          ← submitReview, escalate
    │   │   ├── components/         ← QAQueue, ScorecardForm, EscalationModal
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── deliverables/
    │   │   ├── actions.ts          ← uploadDeliverable, releaseDeliverable
    │   │   ├── components/         ← DeliverableUploader, ReleaseGate, ClientDownload
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── messaging/
    │   │   ├── actions.ts          ← sendMessage, getThread, getBlockedMessages
    │   │   ├── components/         ← MessageThread, MessageInput, BlockedMessageQueue
    │   │   ├── firewall.ts         ← Communication firewall scan logic
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── revisions/
    │   │   ├── actions.ts          ← submitRevision, classifyRevision
    │   │   ├── components/         ← RevisionRequestForm, ClassificationPanel
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── defenselab/
    │   │   ├── actions.ts          ← bookSession, reschedule, uploadRecording
    │   │   ├── components/         ← SessionBooker, RescheduleForm, RecordingViewer
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── finance/
    │   │   ├── actions.ts          ← calculatePayout, disbursePayout
    │   │   ├── components/         ← LedgerTable, PayoutQueue, FinanceSummary
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── disputes/
    │   │   ├── actions.ts          ← submitDispute, resolveDispute, chargebackProject
    │   │   ├── components/         ← DisputeForm, DisputeQueue, ResolutionPanel
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── reporting/
    │   │   ├── actions.ts          ← generateReport, exportPDF
    │   │   ├── components/         ← ReportViewer, KPIGrid, ExportButton
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   └── expert-mgmt/
    │       ├── actions.ts          ← suspendExpert, terminateExpert
    │       ├── components/         ← ExpertRoster, SuspensionModal
    │       ├── schemas.ts
    │       └── types.ts
    │
    └── lib/                        ← Shared utilities & infrastructure clients
        ├── auth.ts                 ← NextAuth.js v5 config, requireRole() utility
        ├── db.ts                   ← Prisma client singleton (connects to Supabase PostgreSQL)
        ├── supabase.ts             ← Supabase client (Realtime + Storage)
        ├── env.ts                  ← Zod-validated environment schema
        ├── storage.ts              ← Unified file storage: routes to R2 (large) or Supabase Storage (small)
        ├── realtime.ts             ← Supabase Realtime channel helpers (message threads)
        ├── communication-firewall.ts ← Message scan regex patterns + block logic
        ├── project-rules.ts        ← Status transition validator, business rule helpers
        ├── payout-rules.ts         ← Package payout rate table, eligibility checks
        ├── sla-calculator.ts       ← SLA due date computation (holiday-aware)
        ├── email/
        │   ├── index.ts            ← sendEmail() abstraction (Resend)
        │   └── templates/          ← React Email components (11 templates)
        │       ├── SOWReady.tsx
        │       ├── SOWSigned.tsx
        │       ├── ProofReceived.tsx
        │       ├── PaymentVerified.tsx
        │       ├── PaymentRejected.tsx
        │       ├── ExpertAssigned.tsx
        │       ├── NewMessage.tsx
        │       ├── InfoRequested.tsx
        │       ├── ProjectDelivered.tsx
        │       ├── RefundProcessed.tsx
        │       └── DisputeOpened.tsx
        └── jobs/                   ← Background job definitions (Trigger.dev)
            ├── expire-pending-projects.ts   ← 3-day expiry cron
            ├── purge-project-files.ts       ← 90-day R2/Supabase file retention cron
            └── sla-deadline-alerts.ts       ← 24-hour pre-deadline in-app alert cron
```

---

## 3. Infrastructure Cost Model

| Phase | Active Clients | Monthly Cost | Services Paid |
|---|---|---|---|
| **Development** | 0 | **$0** | All free tiers |
| **MVP Launch** | ≤ 20 | **$45** | Supabase Pro $25 + Vercel Pro $20 |
| **Growth** | 50–100 | **~$67** | + Resend Pro $20 |
| **Scale** | 200+ | **~$143** | + Cloudflare R2 overages + Resend Scale |

### Service Free Tier Reference

| Service | Free Limit | Hard Limit Before Paid |
|---|---|---|
| Supabase | 500MB DB, 1GB storage, **pauses after 7d** | Upgrade to Pro ($25/mo) for production |
| Cloudflare R2 | 10GB storage, 1M writes, 10M reads | $0.015/GB beyond; $0 egress always |
| Resend | 3,000 emails/month | Pro at $20/mo = 50K emails |
| Vercel | Hobby (personal use only) | Pro at $20/mo for commercial use |
| Trigger.dev | 250,000 runs/month | $50/mo = 1M runs |

---

## 4. Key Architectural Decisions

### Supabase as Infrastructure Layer (Not Auth Layer)

Supabase is used for **managed PostgreSQL + Realtime + Storage only**. Supabase Auth is intentionally bypassed — JAXIS requires 6-role custom RBAC with session audit logging, status gates, and typed `requireRole()` enforcement. NextAuth.js v5 with credentials provider handles this cleanly. Prisma connects to Supabase PostgreSQL via connection pooler (`DATABASE_URL`).

### Cloudflare R2 for Large Files (Zero Egress)

All files > ~1MB or expected to be downloaded repeatedly (research datasets, analysis outputs, deliverables, SOW PDFs, DefenseLab recordings) go to Cloudflare R2. Supabase Storage handles small files (payment proof images, thumbnails). The `src/lib/storage.ts` abstraction routes automatically — switching providers is a 1-file change.

### Trigger.dev for All Background Jobs

Vercel Hobby supports 1 cron job. JAXIS needs 3 minimum (3-day expiry, 90-day purge, SLA alerts). Trigger.dev handles all 3 with 250K free runs/month and a first-class TypeScript SDK. Jobs are defined in `src/lib/jobs/` and registered in the Trigger.dev dashboard.

### Decoupled Feature Data Layer (RULE_DATA_01)

All domain features follow a decoupled data layer architecture:
1. **Strong Contracts (`src/types/`):** Explicit TypeScript interfaces for domain entities.
2. **Mock Seeds (`src/lib/mock-data/`):** Development seed data isolated from component files.
3. **Async Services (`src/features/*/services/*.service.ts`):** Centralized async operations. Direct Prisma ORM queries (`prisma.project.findMany()`) plug into this service layer without requiring UI refactoring.
4. **Reactive Hooks (`src/features/*/hooks/use*.ts`):** Client state management, caching, dynamic filtering, and telemetry sync.
5. **REST API Endpoints (`app/api/v1/*/route.ts`):** Standard HTTP endpoints with Zod validation.

### Reusable Monorepo UI Component Library (`@repo/ui`)

All mission-critical UI primitives (`Button`, `Modal`, `Card`, `StatusBadge`, `Skeleton`, `AnimateHeight`) live in `packages/ui`. They enforce:
- Zero external component bloat.
- Strict client-side memory safety and unmount listener cleanup (`RULE_MEM_01`).
- Modal exit state preservation caching (`RULE_UI_02`).
- 100% adherence to the zero-emoji policy (`RULE_UI_01`).

### Supabase Realtime for Messaging

Module 09 (Messaging) uses Supabase Realtime channels — one channel per project (`project:{projectId}`). The `supabase-js` client subscribes on the client side. Server broadcasts message events via the Supabase REST API. TanStack Query polling (every 5s) is the fallback if Realtime is not configured in dev.

### App Router + Server Actions (No tRPC)

Server Actions handle all mutations. API routes (`/api/v1/`) are retained for:
- File upload (multipart form data)
- Webhook receivers
- Endpoints called from external services (Trigger.dev, Resend webhooks)

### Feature Sandbox Pattern

Each roadmap module lives in `src/features/[module]/`. This enforces:
- Clear ownership: one module = one directory
- Isolated Zod schemas — no cross-feature schema pollution
- Server Actions live adjacent to the UI that calls them

### Status State Machine

Project status is the central coordination mechanism. All transitions validated in `src/lib/project-rules.ts`. Illegal transitions return 422.

### Role-Based Middleware

`src/middleware.ts` protects all `/dashboard/*` routes. Within API routes, `requireRole()` is called at the top of each handler — never delegated to middleware alone.

---

## 5. High-Performance Database & Mutation Architecture (RULE_PERF)

To ensure sub-50ms query latencies, zero memory bloat, and atomic consistency across all 18 modules as institutional volume scales, every feature layer MUST adhere to the following 6 performance standards:

### 1. Selective Projections (`select` over `include`)
Never query complete database rows or deep nested relations unless explicitly required. Always use `select` to restrict payloads to only the columns displayed on the screen.

```typescript
// ✅ FAST & MEMORY SAFE: Only queries the specific columns needed by the view
const projects = await prisma.project.findMany({
  where: { status: "INTAKE_SUBMITTED" },
  select: {
    id: true,
    intakeId: true,
    researchTitle: true,
    status: true,
    deadlineRequested: true,
    createdAt: true,
    user: { select: { fullName: true, email: true } },
    _count: { select: { files: true } } // Fast count query without pulling file objects
  },
  take: 20
});
```

### 2. Parallel Fetching (Zero Waterfalls)
Always execute independent read queries concurrently using `Promise.all` rather than awaiting sequentially.

```typescript
// ✅ CONCURRENT: Runs all queries in parallel, resolving in ~50ms total
const [project, kpis, auditLogs] = await Promise.all([
  prisma.project.findUnique({ where: { id } }),
  getKpis(),
  getAuditLogs(id),
]);
```

### 3. Atomic Database Transactions (`prisma.$transaction`)
Group all multi-model operations (e.g. project creation + file associations + audit trail log) into a single atomic transaction batch.

```typescript
// ✅ SINGLE ROUND-TRIP: Atomic mutation with automatic rollback on error
const project = await prisma.$transaction(async (tx) => {
  const p = await tx.project.create({ data: projectData });
  if (files.length > 0) {
    await tx.projectFile.createMany({
      data: files.map(f => ({ ...f, projectId: p.id }))
    });
  }
  await tx.auditLog.create({
    data: { action: "PROJECT_CREATED", targetId: p.id, userId: currentUser.id }
  });
  return p;
});
```

### 4. Non-Blocking Background Operations
Do not block client request lifecycles on external network services (emails, webhooks, analytics sync). Return the response immediately and dispatch external tasks asynchronously.

```typescript
// 1. Commit DB transaction
const project = await createProjectInDb(payload);

// 2. Fire and forget notifications in background
sendConfirmationEmail(project.id).catch(console.error);

// 3. Fast response back to client (<100ms)
return { success: true, data: project };
```

### 5. Deterministic Database Indexing
Every table must maintain composite and single-column indexes on high-frequency filtering fields (`status`, `userId`, `role`, `createdAt`) defined in `schema.prisma`.

### 6. Client-Side Optimistic UI & `useTransition`
Always wrap Server Action dispatches in React 19 `useTransition` or optimistic state models (`useOptimistic`) to provide instant 0ms user feedback while the backend action processes.

---

## 8. Data Storage Architecture: Supabase Database vs Cloudflare R2

For the exhaustive database table and object key inventory, see the canonical specification in [03-data-storage.md](./03-data-storage.md).

### Quick Architectural Reference:
- **Supabase (Managed PostgreSQL)**:
  - Connects via Prisma ORM pooler (`DATABASE_URL`).
  - Stores all relational models: `User`, `Role`, `ClientProfile`, `StaffProfile`, `Project` (24-state workflow), `ProjectFile` (metadata only), `Quotation`, `QuotationLineItem`, `SOW`, `Payment`, `PaymentProof` (metadata only), `Assignment`, `StaffAttendanceLog`, `AttendanceCorrectionRequest`, `Message`, `BlockedMessageLog`, `AnalysisFile` (metadata only), `ScopeCreepLog`, `QAReview`, `Deliverable` (metadata only), `DefenseLabSession`, `FinancialLedger`, `Payout`, `Dispute`, `NotificationLog`, `InAppAlert`, `ArchivedProject`, `AuditLog`, `StorageRetentionConfig`.
  - Zero raw binary files (`BYTEA`) are stored in Supabase.
- **Cloudflare R2 (S3-Compatible Object Store)**:
  - Configured in `src/lib/storage.ts` via `@aws-sdk/client-s3` and `/api/upload`.
  - Zero egress fees forever.
  - Stores all binary file categories (`RESEARCH_DOCUMENT`, `DATASET`, `QUESTIONNAIRE`, `PAYMENT_PROOF`, `ANALYSIS_OUTPUT`, `DELIVERABLE`, `DISPUTE_EVIDENCE`, SOW signed PDFs, and DefenseLab recordings) under key format `studies/{studyId}/{timestamp}-{cleanFileName}`.
- **Local Dev Configs (`apps/app/dev_data/`)**:
  - Hot JSON configurations: `payroll_configs.json` (role base retainers, hourly rates, models), `package_rates.json` (customizable Statistician & Senior QA commission rates), `payslips.json` (batch payroll records), and `payout_details.json` (specialist bank/wallet accounts).

