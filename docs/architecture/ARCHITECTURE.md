# JAXIS StatLab — Architecture & System Design Specification

This document serves as the master architectural specification for **JAXIS StatLab**, derived directly from the official **JAXIS StatSpecification Document**.

---

## 1. Executive Summary & Monorepo Topology

JAXIS StatLab is a multi-role workflow platform connecting clients, statisticians, Senior QA leads, finance officers, administrators, and executive oversight.

The system is structured as a Turborepo monorepo:
```
JAXIS StatLab/
├── apps/
│   ├── web/                # Public-facing Landing Page & Marketing Site (Next.js SSR/SSG, Port 3000)
│   └── app/                # SaaS Application Workspace for 7 Roles (Next.js App Router, Port 3001)
└── packages/
    ├── ui/                 # Shared Design System Component Library (@repo/ui)
    ├── typescript-config/  # Centralized tsconfig base settings
    └── eslint-config/      # Centralized ESLint configurations
```

---

## 2. Master Operational Workflow (9 Stages)

```
[START] -> Intake (Triage)
            │
            ├── Rejected ──> [STOP]
            │
            └── Approved ──> Quotation (Responds/Requote/Accept)
                                │
                                ├── Decline/Expire ──> [STOP]
                                │
                                └── Accept ──> Payment (Verify)
                                                  │
                                                  ├── Invalid ──> [Re-upload Proof]
                                                  │
                                                  └── Valid ──> Assignment (Statisticians & QA)
                                                                   │
                                                                   ├── Need Info ──> [Pause Clock/Flag]
                                                                   ├── Scope Creep ──> [Requote Needed]
                                                                   │
                                                                   └── Analysis Finished ──> QA Review
                                                                                                │
                                                                                                ├── Reject/Error ──> [Return to Analysis]
                                                                                                ├── Escalate ──> [CEO Review]
                                                                                                │
                                                                                                └── QA Approved ──> Deliverables
                                                                                                                     │
                                                                                                                     ├── Balance Due ──> [Block Release]
                                                                                                                     │
                                                                                                                     └── Fully Paid ──> Release ──> Revision ──> Archive ──> Payout ──> [END]
```

---

## 3. The 14 Business Domains

```
JAXIS Platform Architecture
│
├── Identity Domain             # RBAC authentication, sessions, users, roles
├── Client Management Domain    # Academic background, institution tags, client profiles
├── Project Intake Domain       # Master status tracking, intake data, research goals
├── Quotation Domain            # Package calculation, custom pricing, line items, expiration
├── Payments Domain             # Proof of payment uploads, financial verification, balances
├── Assignment Domain           # Workload balancing, statistician & QA allocation
├── Analysis Workbench Domain   # Working files, analytical notebooks, scope creep flagging
├── Quality Assurance Domain    # Statistical audit scorecards, error classification, escalation
├── Deliverables Domain         # Payment release gates, final files, certificates of analysis
├── Revisions Domain            # Scope classification (Free vs Paid), additional quote issuance
├── Finance & Payout Domain     # Revenue share split calculations, platform reserve, disbursements
├── Messaging Domain            # Role-segmented project support & technical audit threads
├── Reports & Analytics Domain  # Operational metrics, turnaround KPIs, financial performance
└── Archive Domain              # Read-only locked historical records & search index
```

---

## 4. User Roles & Access Control Matrix (RBAC)

| Role | Intake / Request | Quotation | Payment Verify | Work Assignment | Analysis / Upload | QA Audit | Release Final | Finance / Payout |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Client** | Create/View | Accept/Decline | Upload Proof | — | — | — | Download (If Paid) | View Own Ledger |
| **Admin** | Full Triage | Build/Issue | Verify/Reject | Assign Staff | Read View | Read Status | Upload/Authorize | Read Summary |
| **Statistician** | View Assigned | — | — | View Assigned | Full Upload | View Scorecard | — | View Own Share |
| **Senior QA Lead**| View Assigned | — | — | View Assigned | Audit Workspace| Approve/Reject/Escalate | Approve Gate | View Own Share |
| **Finance Officer**| Read | Read | Verify/Reject | — | — | — | Read | Full Payout Admin |
| **CEO / Owner** | Full Access | Full Access | Full Access | Full Access | Read View | Audit & Risk Escalate | Full Access | Full Access |
| **System Admin** | Infrastructure | Infrastructure | Infrastructure | Infrastructure | Infrastructure | Infrastructure | Infrastructure | Infrastructure |

---

## 5. Database Schema Blueprint (Prisma / SQL)

Below are the core database schema definitions matching Section 07 of the specification:

```sql
-- Identity Domain
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
  id INT PRIMARY KEY,
  role_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id),
  role_id INT REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

-- Client Management Domain
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  institution_school VARCHAR(255),
  academic_program VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects Intake Domain
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id VARCHAR(50) UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id),
  research_title TEXT NOT NULL,
  research_objectives TEXT NOT NULL,
  hypotheses TEXT,
  deadline_requested DATE NOT NULL,
  master_status VARCHAR(50) NOT NULL DEFAULT 'NEW_REQUEST',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotation Domain
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  package_name VARCHAR(100) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  downpayment_required DECIMAL(10,2) NOT NULL,
  expiration_date TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT_QUOTE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments Domain
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  quotation_id UUID REFERENCES quotations(id),
  payment_type VARCHAR(50) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'AWAITING_PAYMENT',
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id),
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource Assignments
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  statistician_id UUID REFERENCES users(id),
  senior_qa_id UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quality Assurance Domain
CREATE TABLE qa_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  reviewer_id UUID REFERENCES users(id),
  decision VARCHAR(50) NOT NULL, -- QA_APPROVED, QA_REJECTED, ESCALATED_TO_CEO
  comments TEXT,
  error_classification VARCHAR(50), -- MINOR, MAJOR, CRITICAL
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deliverables Management
CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_category VARCHAR(100) NOT NULL,
  is_final_released BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Finance & Payouts Domain
CREATE TABLE financial_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  gross_revenue DECIMAL(10,2) NOT NULL,
  statistician_share DECIMAL(10,2) NOT NULL,
  qa_share DECIMAL(10,2) NOT NULL,
  admin_share DECIMAL(10,2) NOT NULL,
  platform_fund DECIMAL(10,2) NOT NULL,
  reserve_fund DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  recipient_id UUID REFERENCES users(id),
  role_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payout_status VARCHAR(50) NOT NULL DEFAULT 'NOT_ELIGIBLE',
  disbursed_at TIMESTAMP
);
```

---

## 6. API Route Specification Summary (`/api/v1/...`)

- **Auth:** `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`
- **Projects:** `GET /api/v1/projects`, `POST /api/v1/projects`, `PATCH /api/v1/projects/:id/status`
- **Quotes:** `POST /api/v1/quotes`, `GET /api/v1/quotes/:id`, `PATCH /api/v1/quotes/:id/respond`
- **Payments:** `GET /api/v1/payments`, `POST /api/v1/payments/proof`, `PATCH /api/v1/payments/:id/verify`
- **Assignments:** `POST /api/v1/assignments`, `GET /api/v1/assignments/my-workload`
- **Analysis:** `GET /api/v1/analysis/:projectId`, `POST /api/v1/analysis/submit-draft`
- **QA:** `GET /api/v1/qa/queue`, `POST /api/v1/qa/reviews`, `POST /api/v1/qa/escalate`
- **Deliverables:** `POST /api/v1/deliverables/upload`, `PATCH /api/v1/deliverables/:id/release`
- **Finance:** `GET /api/v1/finance/ledger`, `POST /api/v1/finance/payouts/disburse`

---

## 7. Performance, Caching & Data Retrieval Architecture

JAXIS StatLab implements a multi-tier caching and prefetching engine engineered for sub-100ms perceived transitions and zero-CLS initial rendering:

```
[Browser Request]
       │
       ▼
[Server Component (RSC) page.tsx]
       │
       ├── Concurrent Parallel Prefetch (Promise.all)
       │         │
       │         ▼
       ├── [In-Memory Cache (unstable_cache)]
       │         │
       │         ├── HIT (0-2ms) ──> Memory Cache Return
       │         │
       │         └── MISS ─────────> PostgreSQL (Prisma with DbTimeout)
       │
       ▼
[Pre-populated Client Component (Client.tsx)]
       │
       └── Render HTML with 100% Data Present (Zero Spinner Flash)
```

1. **In-Memory Server Caching (`unstable_cache`)**:
   - High-throughput read operations (specialist capacity, attendance review datasets, company signatories, staff directories) are wrapped in module-scoped `unstable_cache` with canonical tags (`CACHE_TAGS` in `src/lib/cache-tags.ts`).
2. **Instant Tag-Based Invalidation (`invalidateCacheTags`)**:
   - Mutating Server Actions immediately invalidate affected tags using Next.js 16 `updateTag` and `revalidateTag`, guaranteeing that writes are instantly visible across all users without waiting for TTL expiry.
3. **Server Component Pre-Loading (RSC)**:
   - Primary operational desks (`admin/assignments`, `finance/attendance`, `finance/payroll`) prefetch data directly in async Server Components and feed `initialData` into client components.
   - Client components start with `isLoading = false`, giving users an instant view of their dashboard without intermediate blank states.
4. **Anti-Double-Loading Policy**:
   - Pages enforce a strict single-loader policy via `<LoadingState>` from `@repo/ui`. Sub-components and auxiliary cards never render independent spinners while page-level data is loading.

---

## 8. Data Storage Architecture: Supabase Database vs Cloud Storage (Cloudflare R2)

JAXIS StatLab strictly decouples **Structured Relational Data** from **Unstructured Binary Documents & Datasets**. For the comprehensive inventory, see [apps/app/docs/info/03-data-storage.md](file:///apps/app/docs/info/03-data-storage.md) or the [Master Documentation Portal](file:///apps/app/docs/README.md).

```
┌──────────────────────────────────────────────────┐  ┌─────────────────────────────────────────┐
│        SUPABASE (PostgreSQL via Prisma)          │  │       CLOUDFLARE R2 (S3 Bucket)         │
├──────────────────────────────────────────────────┤  ├─────────────────────────────────────────┤
│ • User accounts, hashed credentials & RBAC roles │  │ • Raw research datasets (.xlsx, .csv)  │
│ • Client academic profiles & staff expertise     │  │ • Statistical outputs (.spv, .sav, .R)  │
│ • 24-state study lifecycle (intakeId, deadlines) │  │ • Client thesis proposals & chapters    │
│ • Commercial quotations & itemized add-on lines  │  │ • Final verified deliverables & reports │
│ • Signed SOW contract terms & JSON snapshots     │  │ • SOW digitally signed PDF contracts   │
│ • Payment transaction records & verification     │  │ • GCash/Maya/Bank payment receipts      │
│ • Expert workload assignments & business-day SLA │  │ • DefenseLab audio/video recordings     │
│ • Staff attendance logs & shift correction claims│  │ • Arbitration dispute evidence files    │
│ • Internal project chat & firewall evasion logs  │  │ • Treasury payout transfer slips        │
│ • QA evaluation scorecards & error classifications│ │                                         │
│ • Treasury ledgers & specialist payout records   │  │ Key Schema:                             │
│ • Pointers to R2 keys (filePath strings)         │  │ studies/{studyId}/{timestamp}-{filename}│
└──────────────────────────────────────────────────┘  └─────────────────────────────────────────┘
```

- **Supabase (PostgreSQL)**: Holds 100% of relational integrity, state machines, financial balance ledgers, and audit logs. Never stores raw file binary streams (`BYTEA`).
- **Cloudflare R2 (Zero-Egress Object Storage)**: Stores all binary assets up to 15MB via `/api/upload` or pre-signed S3 URLs (`@aws-sdk/client-s3`), referenced by relative storage key pointers in Supabase.
- **Local Dev Configs (`apps/app/dev_data/`)**: Stores hot operational policies including role payroll matrices (`payroll_configs.json`), customizable package commission rates (`package_rates.json`), payslip history (`payslips.json`), and specialist payout bank/wallet details (`payout_details.json`).

---

## 9. Engineering, Security, Scalability & Reliability Standards

All system components, database access routines, server actions, and background jobs adhere to the 5 engineering pillars codified in [apps/app/docs/info/08-engineering-standards.md](file:///apps/app/docs/info/08-engineering-standards.md):
1. **Database & Scalability**: Proper indexing on all foreign keys and search terms, zero N+1 queries, explicit field selection, and pagination.
2. **Security**: Zero client secrets, strict server-side Zod input validation, enforced RBAC (`assertRole`), rate limiting, and chat firewall.
3. **Performance**: RSC prefetching, tag-based memory caching (`unstable_cache`), 0ms optimistic UI updates, and single-track arc loaders.
4. **Monitoring & Logs**: Actionable structured error logs, immutable business audit ledgers, delivery logs, and React Error Boundaries.
5. **Reliability & Recovery**: Atomic Prisma `$transaction` blocks, idempotent mutations, automated daily backups, and R2 object versioning.


