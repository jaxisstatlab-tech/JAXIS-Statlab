# JAXIS StatLab

## Overview
JAXIS StatLab is a comprehensive, multi-role SaaS platform designed to manage end-to-end statistical workflows. It connects clients, statisticians, Quality Assurance (QA) leads, finance officers, administrators, and executive oversight into a single, cohesive, and secure system.

## The Flow (How It Works)
The platform ensures quality and accountability by following a strict 9-stage operational workflow:

1. **Intake (Triage):** Client research requests are evaluated and either approved or rejected.
2. **Quotation:** Accurate pricing is generated based on the scope of work.
3. **Payment:** Secure verification of upfront payments or downpayments.
4. **Assignment:** Projects are intelligently routed to appropriate statisticians and Senior QA leads.
5. **Analysis Workspace:** Statisticians process the data using specialized analytical notebooks.
6. **QA Review:** Senior QA leads perform rigorous statistical audits and error classification. No project is released without approval.
7. **Deliverables:** Final files are released to the client, strictly gated by final payment clearance.
8. **Revisions:** Any requested scope changes or revisions are tracked and handled.
9. **Archive & Payout:** Projects are archived, and revenue shares are automatically calculated and disbursed.

## Recent System Enhancements & Completed Modules
- **Reporting, Operational Analytics & Audit Archive (Module 17)**: 8 standardized parameterized business reports (revenue, performance, turnaround, disputes, volume, acquisition, ledger, payouts), CSV & PDF export, searchable immutable project archive, automated 90-day storage data purge, client data deletion workflows, and system activity audit ledger.
- **Email Notifications & In-App Alert Center (Module 16)**: Transactional email engine with Resend provider abstraction and local simulation fallback, 11 responsive HTML client email templates, slide-out in-app notification center in `Topbar.tsx`, 3-attempt exponential delivery retry logic, delivery audit ledger at `/dashboard/admin/notifications`, and strict internal event masking.
- **Disputes, Academic Arbitrations & Refunds (Module 15)**: 7-day post-delivery dispute window enforcement (`assertDisputeWindowOpen`), objective technical grounds validation (`METHODOLOGY_DEVIATION`, `MATHEMATICAL_ERROR`, `SLA_BREACH`), evidence vault attachments, chargeback project halts with automatic escrow payout freezes, CEO exclusive refund authority (`RULE_ROL_01`), and SLA turnaround upgrade fee refund calculations.
- **Finance, Milestone Payouts & Treasury Ledger (Module 14)**: Escrow release safety gates (`RULE_PAY_01`), package commission splits, per-study gross revenue and net platform margin ledgers, CEO rate matrix governance, and specialist self-service earnings history.
- **DefenseLab Oral Defense Simulation (Module 13)**: End-to-end rehearsal scheduling, 12-hour cancellation rule enforcement, Google Meet integration, cloud recording vault, and penalty governance.
- **Messenger-Style High-Performance Chat (Module 09)**: Instant 0ms cache-first preload, optimistic message dispatch, background delta syncing, communication firewall anti-evasion, and clean loading states.
- **Staff Attendance & Duty Governance (Module 18)**: Topbar live timeclock widget, 14-hour anti-runaway shift safety auto-close, automated meal break deductions, and Segregation of Duties shift correction approval workflows.
- **Corporate Payroll & Itemized Payslips (Module 19)**: CEO executive compensation rate matrix, bespoke PhD consultant overrides, semi-monthly batch calculation engine, self-service e-wallet/bank settlement profiles, 1-click treasury disbursements, and official QR-stamped payslip vouchers.
- **High-Speed Database Retrieval Engine & Modern Minimalist UI (Module 20)**: Server-side in-memory caching (`unstable_cache` + `updateTag`), RSC Server Component pre-loading (0ms initial page load delay), parallelized database queries, and a modern minimalist single-track arc spinner (Linear / Vercel style) with anti-double-loading guards across all role desks.
- **Unified Design & Typography Harmonization**: Standardized `<KpiCard />` metrics, canonical `<PageHeader />` with fast SPA breadcrumb routing, and Philippine Peso (`<Peso />`) optical weight harmonization.
- **Cinematic Landing Page (`apps/web`)**: GSAP scroll-triggered hero animations, pixel transitions, research sector dashboard, solutions, and pricing.

## Documentation & Knowledge Base
The complete project documentation is organized under [`apps/app/docs/`](file:///apps/app/docs/README.md):
- **[Master Documentation Portal](apps/app/docs/README.md)**: Master sitemap and role-based quick links.
- **[Information & Architecture (`docs/info/`)](apps/app/docs/info/README.md)**: Scope, architecture, data storage, design system, UI upgrades, and roadmap.
- **[Modules & Verifications (`docs/modules/`)](apps/app/docs/modules/README.md)**: 22 functional module specifications (`specs/`) and audit reports (`verifications/`).
- **[Task Boards & Checklists (`docs/tasks/`)](apps/app/docs/tasks/README.md)**: Master task board and component migration tracking.
- **[Operational Playbooks (`docs/playbooks/`)](apps/app/docs/playbooks/README.md)**: Business operations manual and role-specific guides.
- **[User Journeys & Flows (`docs/flows/`)](apps/app/docs/flows/README.md)**: 9-stage lifecycle and role interaction diagrams.

## Monorepo Architecture
This project uses Turborepo to manage multiple applications and packages:
- `apps/web`: Public-facing Landing Page & Marketing Site (Next.js SSR/SSG).
- `apps/app`: SaaS Application Workspace for all 7 internal and external Roles (Next.js App Router).
- `packages/ui`: Shared Enterprise Design System Component Library (`@repo/ui`).

## Getting Started

To build and run all applications locally:

```bash
# Install dependencies
npm install

# Run the development servers
npx turbo dev
```

- The Landing Page (`web`) will be available at [http://localhost:3000](http://localhost:3000)
- The SaaS Workspace (`app`) will be available at [http://localhost:3001](http://localhost:3001)
