# JAXIS StatLab — Master Documentation Portal

Welcome to the central technical and operational documentation repository for **JAXIS StatLab**.

---

## 🗂️ Documentation Architecture

```
apps/app/docs/
├── README.md                      ← You are here (Master Documentation Portal)
│
├── info/                          ← 📘 1. Information & Architectural Specifications
│   ├── 01-scope.md                # Business model, roles, permissions, MVP boundary
│   ├── 02-architecture.md         # Monorepo topology, Next.js 16 stack, caching engine
│   ├── 03-data-storage.md         # Supabase (PostgreSQL) vs Cloudflare R2 vs dev_data
│   ├── 04-design-system.md        # Tokens, typography, palettes, @repo/ui primitives
│   ├── 05-ui-design-upgrade.md    # Dashdark Precision UI standard, 2:1 bento, Phosphor icons
│   ├── 06-email-system.md         # Resend transactional email architecture & templates
│   ├── 07-roadmap.md              # System roadmap v2 & release gates
│   └── 08-engineering-standards.md# Database, security, performance, monitoring & reliability
│
├── modules/                       ← 📦 2. Functional Module Specifications & Verifications
│   ├── README.md                  # Module matrix (Modules 00–21)
│   ├── specs/                     # 22 Detailed functional specifications
│   └── verifications/             # 22 Test audit reports & verification records
│
├── tasks/                         ← 📋 3. Development Tasks & Roadmaps
│   ├── README.md                  # Task directory index
│   ├── 01-master-tasks.md         # Active module checklist & sprint tracking
│   └── 02-shadcn-migration.md     # UI library alignment & migration checklist
│
├── playbooks/                     ← 📖 4. Business Operations & Role Playbooks
│   ├── README.md                  # Playbooks directory index
│   ├── BUSINESS_OPERATIONS_MANUAL.md  # Master operating handbook
│   ├── 01-how-the-business-works.md   # 9-stage lifecycle overview
│   ├── 02-ceo-guide.md                # Executive governance & dispute arbitration
│   ├── 03-finance-hr-guide.md         # Payments, escrow & batch payroll disbursement
│   ├── 04-specialist-statistician-guide.md # Analysis workbench & QA audit rules
│   └── 05-client-journey-guide.md     # Client onboarding, SOW signing & DefenseLab
│
└── flows/                         ← 🔄 5. Operational Workflows & User Journeys
    ├── README.md                  # Visual flow directory
    ├── 00-master-lifecycle-flow.md# Master 9-stage state diagram
    ├── 01-client-flow.md          # Client portal interaction flow
    ├── 02-admin-flow.md           # Admin triage & quotation flow
    ├── 03-statistician-flow.md    # Analysis execution & scope creep flow
    ├── 04-qa-review-flow.md       # Senior QA audit & rejection loop
    ├── 05-finance-hr-flow.md      # Payment verification & payroll flow
    └── 06-ceo-flow.md             # Executive oversight & pricing matrix flow
```

---

## 🧭 Quick Links by Role

- **Software Engineers & AI Agents**:
  1. [info/08-engineering-standards.md](./info/08-engineering-standards.md) — Pre-Implementation Standards & Checklist
  2. [info/02-architecture.md](./info/02-architecture.md) — System Architecture
  3. [info/03-data-storage.md](./info/03-data-storage.md) — Database & Cloud Storage
  4. [info/04-design-system.md](./info/04-design-system.md) — Design System Tokens
  5. [info/05-ui-design-upgrade.md](./info/05-ui-design-upgrade.md) — Dashdark Precision UI
  6. [tasks/01-master-tasks.md](./tasks/01-master-tasks.md) — Active Tasks Checklist

- **Product & Business Operations**:
  1. [info/01-scope.md](./info/01-scope.md) — Platform Scope & Commercial Tiers
  2. [playbooks/BUSINESS_OPERATIONS_MANUAL.md](./playbooks/BUSINESS_OPERATIONS_MANUAL.md) — Operations Manual
  3. [flows/00-master-lifecycle-flow.md](./flows/00-master-lifecycle-flow.md) — 9-Stage Operational Lifecycle

- **Quality Assurance & Testing**:
  1. [modules/README.md](./modules/README.md) — Module Matrix
  2. [modules/verifications/](./modules/verifications/) — Verification Audit Logs
