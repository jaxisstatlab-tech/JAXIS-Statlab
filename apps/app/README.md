# JAXIS StatLab — SaaS Dashboard Application (`apps/app`)

> **Port**: `3001` (Development)  
> **Production Domain**: `https://app.jaxis-statlab.com`  
> **Master Documentation**: [`apps/app/docs/`](./docs/README.md)  
> **Public Marketing Site**: [`apps/web`](../web/README.md) (`https://jaxis-statlab.com`)

Welcome to **`apps/app`**, the core multi-role enterprise web application of **JAXIS StatLab**. It manages the end-to-end statistical consultation lifecycle—from client intake, SOW contracting, and escrow funding to data analysis, double-blind QA verification, certificate generation, and batch payroll.

---

## 🏛️ System Architecture & Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16** (App Router, Turbopack) | Server Components (RSC), Server Actions, API routes |
| **Runtime** | **React 19** | Concurrent features, Server Actions, Transitions |
| **Language** | **TypeScript 5.9** (Strict Mode) | Zero `any` policy, type-safe API contracts |
| **Database** | **Supabase PostgreSQL** via **Prisma ORM** | Relational data, connection pooler on port `6543` |
| **Object Storage** | **Cloudflare R2** | Zero-egress storage for datasets, outputs, deliverables, and PDFs |
| **Auth & RBAC** | **NextAuth.js v5** (Auth.js) | Session credentials provider, role enforcement, audit logs |
| **Access Control** | [`src/lib/access-control.ts`](./src/lib/access-control.ts) | Strict RBAC domain guards across all server mutations |
| **Styling** | **Tailwind CSS v4** + [`@repo/ui`](../../packages/ui) | Dark Precision Terminal / Dashdark precision tokens |
| **Iconography** | **Phosphor Icons** (`@phosphor-icons/react`) | Mandatory `weight="fill"` iconography throughout |
| **Email** | **Resend** | Transactional templates, password resets, and operational alerts |

---

## 👥 Role Desks & Portals

The application implements strict Role-Based Access Control (RBAC) across 6 distinct operational desks:

1. **Lead Researcher (`CLIENT`)**: `/dashboard/client`
   - Research intake submission, custom SOW review & signature, milestone escrow payments, deliverable downloads, Certificate of Statistical Audit, and consultation messaging.
2. **Specialist Statistician (`STATISTICIAN`)**: `/dashboard/specialist`
   - Workbench desk, active study assignments, timeclock & duty shift management, survey analysis uploads, and internal revision requests.
3. **Senior QA Lead (`SENIOR_QA_LEAD`)**: `/dashboard/qa`
   - Quality control desk, double-blind recalculation audits, calculation parity verification, QA audit certification, and approval releases.
4. **Operations Administrator (`ADMIN`)**: `/dashboard/admin`
   - Study intake triage, package quotation, expert assignment, staff roster management (`StaffRosterClient`), and dispute moderation.
5. **Finance & HR Officer (`FINANCE_OFFICER`)**: `/dashboard/finance`
   - Payment milestone verification, treasury escrow vaults, batch payroll generation, payslip disbursements, and specialist leave authorization.
6. **Executive Governance (`CEO`)**: `/dashboard/ceo`
   - Executive intelligence desk, company-wide compensation policies, financial ledgers, audit trails, and final dispute arbitration.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Node.js 20+ and pnpm/npm installed in the Turborepo monorepo root.

### 2. Environment Configuration
Copy `.env.example` to `.env.local` inside `apps/app/`:
```bash
cp .env.example .env.local
```
Verify `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `R2_*`, and `RESEND_API_KEY`.

### 3. Development Server
From the repository root or inside `apps/app`:
```bash
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

### 4. Verification & Testing
Before committing, always ensure zero TypeScript errors and clean lints:
```bash
npm run check-types
npm run lint
```

---

## 📑 Documentation Index

Comprehensive technical specifications and operations playbooks are located in [`apps/app/docs/`](./docs/README.md):

- **[Master Documentation Portal](./docs/README.md)**: Central sitemap and quick links.
- **[Architectural & Information Specs (`docs/info/`)](./docs/info/README.md)**:
  - `01-scope.md`: Business scope and commercial tiers.
  - `02-architecture.md`: Monorepo structure, RSC patterns, and database pooler.
  - `03-data-storage.md`: Master storage reference (PostgreSQL vs Cloudflare R2).
  - `04-design-system.md`: Enterprise design tokens and component anatomy.
  - `05-ui-design-upgrade.md`: Dashdark X precision UI and bento layouts.
  - `08-engineering-standards.md`: Engineering, security, and scalability guardrails.
  - `09-notification-triggers.md`: Real-time notification engine and event catalog.
- **[Module Specifications & Verifications (`docs/modules/`)](./docs/modules/README.md)**: 22 functional module specs (`specs/`) and audit verification reports (`verifications/`).
- **[Tasks & Roadmaps (`docs/tasks/`)](./docs/tasks/README.md)**: Master task list and development checklist.
- **[Business Operations Playbooks (`docs/playbooks/`)](./docs/playbooks/README.md)**: Executive operating handbook and role guides.
- **[Operational Flows (`docs/flows/`)](./docs/flows/README.md)**: 9-stage lifecycle and visual state diagrams.
