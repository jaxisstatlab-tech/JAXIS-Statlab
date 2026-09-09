# JAXIS — Development Roadmap (Revised v2)

**App:** `apps/app` (SaaS Dashboard Workspace)\
**Stack:** Next.js 16 App Router · React 19 · Tailwind CSS v4 · Prisma · Supabase PostgreSQL · NextAuth.js v5 · Cloudflare R2 · Resend · Trigger.dev\
**Strategy:** Strict dependency order. Each module must be fully functional and passing `npm run check-types` + `npm run lint` before the next begins.\
**Revision Notes:** v2 fixes sequencing errors in v1 — Expert Management moved to `02`, Messaging moved to `09`, Revisions merged into `12`, Archive merged into `17`.

---

## 📖 Non-Technical Documentation & Operations Playbooks
- **Master Operations Manual**: [`docs/BUSINESS_OPERATIONS_MANUAL.md`](./BUSINESS_OPERATIONS_MANUAL.md)
- **Playbook 01 (Business Engine)**: [`docs/playbook/01-how-the-business-works.md`](./playbook/01-how-the-business-works.md)
- **Playbook 02 (CEO & Executive Guide)**: [`docs/playbook/02-ceo-guide.md`](./playbook/02-ceo-guide.md)
- **Playbook 03 (Finance & HR Operations)**: [`docs/playbook/03-finance-hr-guide.md`](./playbook/03-finance-hr-guide.md)
- **Playbook 04 (Specialist & Statistician Guide)**: [`docs/playbook/04-specialist-statistician-guide.md`](./playbook/04-specialist-statistician-guide.md)
- **Playbook 05 (Client Journey Guide)**: [`docs/playbook/05-client-journey-guide.md`](./playbook/05-client-journey-guide.md)

---

## Dependency Philosophy

Modules are sequenced by **data and auth dependency**. A module cannot consume another's services until that module is live. No skipping, no parallel builds across dependency layers.

```
Layer 0 (Foundation)
  → Layer 1 (Identity: Auth + Staff + Client)
    → Layer 2 (Core Workflow: Intake → Quote → SOW → Payment → Assignment)
      → Layer 3 (Operations: Messaging + Analysis + QA + Delivery + Revisions)
        → Layer 4 (Add-ons: DefenseLab)
          → Layer 5 (Finance: Payouts + Disputes)
            → Layer 6 (Platform: Notifications + Reporting + Archive)
```

---

## Module Sequence

---

### `00` — Project Foundation & Infrastructure

**Depends on:** Nothing\
**Domain:** Infrastructure

**Goal:** Establish the monorepo's shared tooling, database connection, design system baseline, and all UI primitives. No feature code — only scaffolding that every subsequent module depends on.

**Deliverables:**
- Turborepo workspace configured (`apps/app`, `apps/web`, `packages/ui`)
- Tailwind CSS v4 installed; `src/app/globals.css` populated with all design tokens from `design-system.md`
- Inter + Disket Mono fonts loaded via `next/font` in root layout
- Prisma client singleton configured at `src/lib/db.ts`
- PostgreSQL connection via `DATABASE_URL` environment variable
- Environment variable schema validated with Zod at startup (`src/lib/env.ts`)
- `.env.example` documenting all required vars
- Base layout: `<RootLayout>` with topbar shell + sidebar shell (unstyled placeholders)
- `@repo/ui` package: `Button` (4 variants), `Card`, `StatusBadge`, `FormInput`, `Modal`, `Alert`, `Skeleton`, `DataTable` shell, `PageHeader` primitives
- ESLint + TypeScript configured at strict mode

**Gate:** `npm run build` clean across all apps. All `@repo/ui` components render without errors.

---

### `01` — Authentication & RBAC (`01-auth`)

**Depends on:** `00`\
**Domain:** Identity\
**Spec:** [`docs/modules/01-auth.md`](./modules/01-auth.md)

**Goal:** Implement multi-role authentication. All 6 roles (Client, Statistician, Senior QA Lead, Admin/Manager, Finance Officer, CEO/Owner) must be able to register or be provisioned, authenticate, and have session and route access enforced before any application feature is accessed.

**Deliverables:**
- Prisma schema: `User`, `Role`, `UserRole`, `AuthAuditLog` tables
- NextAuth.js v5 with credentials provider (email + password)
- `bcryptjs` password hashing (salt rounds = 12) on all password storage
- Session JWT contains `userId`, `role`, `fullName` — no sensitive fields
- Role-based middleware: `src/middleware.ts` protects all `/dashboard/*` routes
- Auth pages: `/login`, `/register` (Client self-registration only)
- `requireRole(...roles)` utility — called at the top of every protected Server Action and API route
- RBAC matrix enforced: cross-role route access redirects to `/unauthorized`
- Audit log: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `REGISTRATION`, `ACCOUNT_SUSPENDED_BLOCK` events
- Account status gate: `SUSPENDED` and `TERMINATED` accounts cannot log in
- Seed: all 6 roles + one dev user per role seeded via `prisma db seed`

**Gate:** All 6 roles can log in and land on their correct desk. Cross-role access redirects correctly. `requireRole()` enforces 403. TypeScript clean.

---

### `02` — Expert Provisioning & Staff Management (`02-staff`)

**Depends on:** `01-auth`\
**Domain:** Identity / Governance

**Goal:** Admin can provision and manage staff accounts (Statistician, Senior QA Lead, Finance Officer). Each staff member maintains a professional profile including specializations. Admin can suspend staff; CEO can permanently terminate. This module must exist before Assignment (Module 08) because you cannot assign staff that don't exist outside of seed data.

**Deliverables:**
- Prisma schema: `StaffProfile` (user_id, specializations `String[]`, bio, joined_at), `SuspensionLog` (user_id, reason, suspended_by, suspended_at, lifted_at?)
- `POST /api/v1/admin/staff` — Admin provisions new staff account (assigns role, sends temp password or invite link stub)
- `GET /api/v1/admin/staff` — Admin lists all staff with role, status, specialization, active project count
- `GET /api/v1/admin/staff/:id` — Staff profile detail
- `PATCH /api/v1/admin/staff/:id/profile` — Admin updates staff specializations / profile
- `PATCH /api/v1/admin/staff/:id/suspend` — Admin: temporary suspension + reason logged to `SuspensionLog`
- `PATCH /api/v1/admin/staff/:id/terminate` — CEO only: permanent termination
- On suspension/termination: active assigned projects flagged as `REASSIGNMENT_NEEDED` → Admin notified
- Pending payout handling on termination: voided for serious violations (`ETHICAL_BREACH`, `DIRECT_PAYMENT_BYPASS`, `DATA_FALSIFICATION`, `GHOSTWRITING`); case-by-case otherwise
- Violation enum: `ETHICAL_BREACH`, `DIRECT_PAYMENT_BYPASS`, `DATA_FALSIFICATION`, `GHOSTWRITING`, `POLICY_VIOLATION`
- Admin view: `/dashboard/admin/staff` — staff roster table (role filter, status badge, specialization tags, active project count)
- Admin view: `/dashboard/admin/staff/:id` — full profile + suspension history + action panel
- CEO view: `/dashboard/ceo/staff` — full roster with termination authority
- Statistician view: `/dashboard/statistician/profile` — own profile + specialization edit
- Seed data: specializations array populated for each seed Statistician (`Regression`, `ANOVA`, `SEM`, `Factor Analysis`, `Time Series`, `Instrument Validation`)

**Gate:** Admin can provision staff. Suspension/termination enforced. CEO-only termination gate holds. Active projects flagged on suspension. Specialist profile renders for each staff member.

---

### `03` — Client Profile & Account (`03-client-profile`)

**Depends on:** `01-auth`\
**Domain:** Client Management

**Goal:** After self-registration, clients complete their academic profile. Profile completion is gated before project submission is allowed. Clients can update their profile at any time.

**Deliverables:**
- Prisma schema: `ClientProfile` (user_id, institution_school, academic_program, contact_number, region, created_at, updated_at)
- `POST /api/v1/client/profile` — Create profile (Client only; one per user enforced)
- `PATCH /api/v1/client/profile` — Update profile (Client only; scoped to own profile)
- `GET /api/v1/client/profile` — Get own profile (Client only)
- Profile completion gate: `isProfileComplete` boolean computed from required fields; exposed in session on each request
- Client dashboard: `/dashboard/client` — home screen showing profile completion status + action prompt if incomplete
- Profile completion page: `/dashboard/client/profile` — form with all required fields
- Incomplete profile banner in client sidebar (visible until profile is complete)
- Admin view: client profile accessible within project detail (read-only)

**Gate:** Client can create and update profile. Incomplete profile shows banner. Profile data accessible to Admin on project detail. Profile gate enforced server-side.

---

### `04` — Project Intake & Submission (`04-intake`)

**Depends on:** `03-client-profile`\
**Domain:** Project Intake

**Goal:** Clients submit a new research project with required documents and intake information. Admin receives it in a triage queue. Incomplete submissions are blocked from progressing until required information is supplied.

**Deliverables:**
- Prisma schema: `Project` (intake_id unique, client_id, research_title, research_questions, research_objectives, hypotheses?, chapters_1_3?, questionnaire?, deadline_requested, master_status default `NEW_REQUEST`, created_at, updated_at), `ProjectFile` (project_id, file_name, file_path, file_type, file_category, uploaded_at)
- Project status enum (master lifecycle): `NEW_REQUEST`, `AWAITING_INFORMATION`, `UNDER_EVALUATION`, `QUOTE_SENT`, `CLIENT_APPROVED`, `SOW_PENDING`, `SOW_SIGNED`, `AWAITING_PAYMENT`, `ACTIVE`, `EXPERT_ASSIGNED`, `IN_PROGRESS`, `FOR_QA`, `QA_REVISION`, `DELIVERED`, `REVISION_REQUESTED`, `CLOSED`, `HALTED`, `CANCELLED`, `DISPUTED`, `ETHICAL_BREACH`, `SCOPE_CREEP_HALTED`, `EXPIRED`, `REASSIGNMENT_NEEDED`
- File upload: DOCX, PDF, XLSX, CSV (MIME type validated + size limit enforced; pre-signed R2/S3 URLs)
- Clients may replace uploaded documents before SOW is finalized
- `POST /api/v1/projects` — Client creates project (profile complete gate; required field validation)
- `GET /api/v1/projects` — List projects (scoped by role: Client sees own, Admin/CEO sees all, Statistician sees assigned)
- `GET /api/v1/projects/:id` — Project detail (role-scoped field visibility)
- `PATCH /api/v1/projects/:id/status` — Admin/CEO only; validates state machine transitions
- `POST /api/v1/projects/:id/files` — Client uploads research documents (pre-SOW only)
- `DELETE /api/v1/projects/:id/files/:fileId` — Client removes uploaded file (pre-SOW only)
- Admin action: Request missing information → `AWAITING_INFORMATION` + reason
- Admin action: Mark intake complete → `UNDER_EVALUATION`
- Client view: `/dashboard/client/projects` — project list with status badges
- Client view: `/dashboard/client/projects/new` — multi-step intake form
- Client view: `/dashboard/client/projects/:id` — project detail with timeline
- Admin view: `/dashboard/admin/intake` — triage queue (all `NEW_REQUEST` + `AWAITING_INFORMATION` projects)
- Pending project expiry: scheduled job → 3 days with `AWAITING_PAYMENT` and no payment proof → `EXPIRED`

**Gate:** Client can submit with file uploads. Admin sees triage queue. Missing info request works. Status transition validation enforced. File replacement before SOW works.

---

### `05` — Quotation & Pricing (`05-quotation`)

**Depends on:** `04-intake`\
**Domain:** Quotation

**Goal:** Admin evaluates a project and builds a commercial proposal with package + add-ons. Client reviews and accepts or declines. No accepted quote = no SOW. RULE_QUO_01 enforced: only Admin/CEO can create or modify quotes.

**Deliverables:**
- Prisma schema: `Quotation` (project_id, package_name, base_price, total_amount, downpayment_required, expiration_date, status, created_by, created_at), `QuotationLineItem` (quotation_id, item_type `PACKAGE|ADDON`, item_name, amount)
- Package enum: `JX_01_DATACHECK`, `JX_02_START`, `JX_03_CORE`, `JX_04_ADVANCED`
- Add-on enum: `DEFENSELAB`, `RUSH`, `EXPRESS`, `EMERGENCY`
- Price range guardrails enforced in quote builder (Admin cannot set price below package minimum)
- RULE_QUO_01: `POST`, `PATCH` quote routes restricted to `ADMIN`, `CEO` — Statisticians return 403
- RULE_QUO_02: JX-01 and JX-02 → `downpayment_required = total_amount` (100% upfront), enforced server-side
- `POST /api/v1/quotations` — Admin/CEO creates quote draft
- `PATCH /api/v1/quotations/:id` — Admin/CEO modifies draft quote
- `POST /api/v1/quotations/:id/send` — Issues quote to client → `QUOTE_SENT`, project → `QUOTE_SENT`
- `POST /api/v1/quotations/:id/respond` — Client accepts (`CLIENT_APPROVED`) or declines (`QUOTE_DECLINED`)
- Quote expiration: checked on read; expired quotes auto-transition to `QUOTE_EXPIRED`
- Package change communication: if Admin recommends different package, client must approve change before new quote is issued
- Admin view: `/dashboard/admin/quotations` — quote builder UI with package selector, add-on checkboxes, price input
- Client view: `/dashboard/client/projects/:id/quote` — quote review with accept/decline

**Gate:** Admin can create and issue quotes. Client can accept/decline. Statistician gets 403. Upfront payment rule enforced for small packages. Quote expiration works.

---

### `06` — SOW Generation & Signing (`06-sow`)

**Depends on:** `05-quotation`\
**Domain:** Contract

**Goal:** After client approval, Admin generates a legally-binding Statement of Work. The client signs via typed name. Once signed, the SOW and scope are permanently locked — no edits allowed under any circumstance.

**Deliverables:**
- Prisma schema: `SOW` (project_id, content_snapshot `Json`, package_name, total_amount, turnaround_days, add_ons `String[]`, signed_by_name?, signed_at?, is_locked default false, generated_by, generated_at)
- SOW content snapshotted at generation (immutable JSON — no live DB FK references to mutable fields)
- `POST /api/v1/sow/generate` — Admin generates SOW from accepted quotation; auto-populates all scope fields
- `POST /api/v1/sow/:id/sign` — Client types full name → `is_locked = true`, `signed_at` set, project → `SOW_SIGNED`
- Gate: `PATCH` on any SOW with `is_locked = true` → 403 `SOW_LOCKED` error (no exceptions)
- Supplemental SOW: `POST /api/v1/sow/generate-supplemental` — for scope changes or out-of-scope revisions; requires new quotation
- SOW PDF: server-side generation via `@react-pdf/renderer`; downloadable by Client and Admin after signing
- Client view: `/dashboard/client/projects/:id/sow` — SOW content viewer + typed name sign form
- Admin view: `/dashboard/admin/projects/:id/sow` — generate button (pre-sign) + locked SOW viewer (post-sign)

**Gate:** Admin generates SOW. Client signs. Signed SOW is immutable (API enforces 403 on any edit attempt). PDF downloads correctly. Supplemental SOW flow works for scope changes.

---

### `07` — Payment & Installments (`07-payments`)

**Depends on:** `06-sow`\
**Domain:** Payments

**Goal:** Client uploads proof of GCash or bank transfer payment. Finance Officer or Admin verifies. Partial payments (installments) are supported. Project activates after required downpayment clears. Full payment is required before deliverable release.

**Deliverables:**
- Prisma schema: `Payment` (project_id, quotation_id, payment_type `DOWNPAYMENT|INSTALLMENT|FULL`, amount_paid, balance_paid_total, payment_status, verified_by?, verified_at?, rejection_reason?, created_at), `PaymentProof` (payment_id, file_path, uploaded_at)
- Payment status enum: `AWAITING_PAYMENT`, `PROOF_SUBMITTED`, `VERIFIED`, `REJECTED`, `FULLY_PAID`
- `POST /api/v1/payments/proof` — Client uploads payment proof receipt (image/PDF; MIME + size validated)
- `PATCH /api/v1/payments/:id/verify` — Finance Officer / Admin / CEO only (RULE_ROL_02)
  - Verify → `VERIFIED`, recalculate `balance_paid_total`; if `balance_paid_total >= total_amount` → `FULLY_PAID`
  - If `balance_paid_total >= downpayment_required` → project status → `ACTIVE`
  - Reject → `REJECTED` with reason; project stays `AWAITING_PAYMENT`
- `GET /api/v1/payments/:projectId` — Payment ledger for project (Finance/Admin/CEO)
- Pending project expiry: 3 days with no verified payment → project → `EXPIRED` (background job)
- RULE_REL_01: `payment_status !== FULLY_PAID` → deliverable release blocked (enforced in Module 12)
- Client view: `/dashboard/client/projects/:id/payment` — payment ledger + proof upload form + verification status
- Finance view: `/dashboard/finance/payments` — verification queue (all `PROOF_SUBMITTED` payments)
- Admin view: `/dashboard/admin/projects/:id/payment` — full payment ledger

**Gate:** Proof upload works. Finance verifies/rejects. Downpayment triggers project activation. Full payment sets `FULLY_PAID`. 3-day expiry runs.

---

### `08` — Expert Assignment & Workload (`08-assignment`)

**Depends on:** `07-payments`, `02-staff`\
**Domain:** Assignment

**Goal:** Admin assigns a Statistician and Senior QA Lead to an active, paid project. The SLA timer starts at the moment of assignment. Admin can reassign in extreme cases (original Expert payout voided on reassignment).

**Deliverables:**
- Prisma schema: `Assignment` (project_id, statistician_id, qa_lead_id, assigned_by, assigned_at, sla_start_at, sla_due_at, sla_paused_at?, sla_resume_at?, sla_pause_reason?)
- SLA calculation: `sla_due_at = sla_start_at + turnaround_days` (weekends included, holidays excluded)
- System suggestion: rank available statisticians by `specialization` match to project keywords + current open assignment count (read-only; Admin decides)
- `POST /api/v1/assignments` — Admin only; creates assignment, project → `EXPERT_ASSIGNED`, SLA timer starts
- `PATCH /api/v1/assignments/:id/reassign` — Admin only; voids original Expert payout record; creates new assignment; SLA timer continues from current point
- `POST /api/v1/projects/:id/pause-sla` — Statistician requests pause (client delay); Admin approves; timer pauses
- `POST /api/v1/projects/:id/resume-sla` — Admin resumes SLA timer
- `GET /api/v1/assignments/my-workload` — Statistician: own assigned projects with SLA countdowns
- 24-hour pre-deadline alert: surfaced on Admin desk as an in-app badge (no email at this stage — Module 16 handles email)
- Admin view: `/dashboard/admin/assignments` — assignment panel with capacity indicators per Statistician
- Statistician view: `/dashboard/statistician` — workload list with SLA timers

**Gate:** Admin can assign and reassign. SLA timer starts correctly. Statistician workload view works. Specialization suggestion filter renders. SLA pause/resume enforced.

---

### `09` — Messaging & Communication Firewall (`09-messaging`)

**Depends on:** `04-intake`, `08-assignment`\
**Domain:** Messaging

**Goal:** All client-Expert communication occurs exclusively inside JAXIS. Prohibited external contact information (email, phone, GCash, social handles, external links) is detected server-side and the entire message is blocked — not sanitized. Admin can view all blocked messages and intervene.

**Deliverables:**
- Prisma schema: `Message` (project_id, sender_id, sender_role, content, is_blocked, blocked_reason?, sent_at), `BlockedMessageLog` (message_id, detected_pattern, reviewed_by?, reviewed_at?)
- Communication firewall: server-side regex scan on `content` before persistence
  - Blocked: email addresses, phone numbers, GCash/Maya/PayMaya/PayPal mentions, WhatsApp/Viber/Telegram/Messenger/Facebook/Instagram references, external URLs not matching `jaxis.*`, personal social handles
  - On match: `is_blocked = true`, full content stored for Admin audit, sender receives: `"Your message was blocked. Sharing external contact information is not permitted."` — content is NOT sanitized or partially delivered
- `POST /api/v1/messages` — Send message (Client or Statistician; scoped to project; firewall runs first)
- `GET /api/v1/messages/:projectId` — Thread for project (participants see non-blocked messages only; Admin sees all including blocked)
- `GET /api/v1/admin/blocked-messages` — Admin: all blocked messages across all projects with pattern detected + review status
- `PATCH /api/v1/admin/blocked-messages/:id/review` — Admin marks blocked message as reviewed
- Real-time strategy: long-polling or Pusher channel per project (CTO decision); polling fallback acceptable for MVP
- Client view: `/dashboard/client/projects/:id/messages` — message thread + send input
- Statistician view: `/dashboard/statistician/projects/:id/messages` — message thread + send input
- Admin view: `/dashboard/admin/messages` — blocked message queue with pattern detection details

**Gate:** Messages send/receive correctly. Blocked messages are not delivered (full block, not edit). Admin sees all blocked messages. Participants do not. Firewall regex catches all listed prohibited patterns.

---

### `10` — Analysis Workbench (`10-analysis`)

**Depends on:** `08-assignment`, `09-messaging`\
**Domain:** Analysis Workbench

**Goal:** The assigned Statistician performs the agreed analytical work and uploads output files within their project workspace. Output versions are retained. Scope creep halts work and triggers a requote flow.

**Deliverables:**
- Prisma schema: `AnalysisFile` (project_id, statistician_id, file_name, file_path, version `Int`, is_current default true, uploaded_at)
- File versioning: each new upload increments version; previous versions marked `is_current = false` but retained
- `POST /api/v1/analysis/upload` — Statistician only; scoped to assigned project; validates MIME type + size
- `GET /api/v1/analysis/:projectId` — All versions of analysis files (Statistician + Admin + QA Lead)
- `POST /api/v1/projects/:id/flag-scope-creep` — Statistician flags scope expansion → project → `SCOPE_CREEP_HALTED`; Admin notified; no further uploads allowed until supplemental quote accepted and paid
- `POST /api/v1/analysis/:projectId/submit-for-qa` — Statistician submits work for QA → project → `FOR_QA`
- Statistician view: `/dashboard/statistician/projects/:id/workbench` — project scope + file upload + version history + submit for QA button
- Admin view: project detail shows analysis files and current version (read-only)
- QA Lead view: analysis files accessible from QA queue (read-only)

**Gate:** Statistician can upload and version files. Submit for QA transitions status correctly. Scope creep flag halts project. Files visible to Admin and QA Lead.

---

### `11` — Quality Assurance (`11-qa`)

**Depends on:** `10-analysis`\
**Domain:** Quality Assurance

**Goal:** Senior QA Lead reviews submitted analysis work. Decision options: Approve (triggers delivery prep), Reject with correction requirements (24-hour internal revision clock), or Escalate ethical breach to CEO. QA states are strictly internal — clients never see them.

**Deliverables:**
- Prisma schema: `QAReview` (project_id, reviewer_id, decision, comments, error_classification, qa_revision_due_at?, reviewed_at), `QARejectionCount` (project_id, statistician_id, count — for repeated failure tracking)
- QA decision enum: `QA_APPROVED`, `QA_REJECTED`, `ESCALATED_TO_CEO`
- Error classification enum: `MINOR`, `MAJOR`, `CRITICAL`, `ETHICAL_BREACH`
- `GET /api/v1/qa/queue` — Senior QA Lead: all projects in `FOR_QA` assigned to them
- `POST /api/v1/qa/reviews` — Submit QA decision (Senior QA Lead only)
  - `QA_APPROVED` → project internal status `QA_APPROVED`; client-visible status remains `IN_ANALYSIS` until Admin releases deliverables
  - `QA_REJECTED` → project → `QA_REVISION`; 24-hour internal revision clock (`qa_revision_due_at`); Statistician notified in-app with correction requirements
  - `ESCALATED_TO_CEO` → project → `ETHICAL_BREACH`; project locked; CEO notified immediately (in-app; email in Module 16)
- Repeated rejection tracker: auto-increments `QARejectionCount`; surfaces warning on Admin desk when count ≥ 2
- RULE_REL_02: Tier 2 packages (`JX_03_CORE`, `JX_04_ADVANCED`, `DEFENSELAB`) cannot have deliverables released without `QA_APPROVED` (enforced in Module 12)
- Client-facing project status during all QA states: `IN_ANALYSIS` (mask per business rule)
- QA view: `/dashboard/qa/queue` — project list + scorecard form with error classification
- CEO view: `/dashboard/ceo/escalations` — `ETHICAL_BREACH` queue with full project context

**Gate:** QA approve/reject/escalate all work. 24-hour revision clock set on rejection. Client status masked. Tier 2 gate flag set. Repeated failure counter increments. Ethical breach locks project.

---

### `12` — Deliverables, Release & Revisions (`12-deliverables`)

**Depends on:** `11-qa`\
**Domain:** Deliverables + Revisions

**Goal:** Admin uploads final deliverable files and releases them to the client — gated on both full payment and QA approval. After delivery, client may request 1 included revision within 3 business days. Admin classifies revision scope (included, methodology change, or new paid work).

**Deliverables:**

#### Deliverables Sub-Domain
- Prisma schema: `Deliverable` (project_id, file_name, file_path, file_category, is_final_released default false, uploaded_at)
- `POST /api/v1/deliverables/upload` — Admin uploads finalized output files to project
- `PATCH /api/v1/deliverables/:id/release` — Admin triggers release
  - RULE_REL_01: `payment_status !== FULLY_PAID` → 402 `PAYMENT_REQUIRED` (hard block)
  - RULE_REL_02: Tier 2 package AND `qa_status !== QA_APPROVED` → 403 `QA_APPROVAL_REQUIRED` (hard block)
  - Both gates pass → `is_final_released = true`, project → `DELIVERED`, `delivered_at` timestamp set
- `GET /api/v1/deliverables/:projectId/download` — Client only; pre-signed download URL; requires `is_final_released = true`
- 90-day retention: `files_purge_at = delivered_at + 90 days` set on project at delivery; background job checks daily
- Client view: `/dashboard/client/projects/:id/deliverables` — download panel (gated; shows "Pending Release" if not yet released)
- Admin view: `/dashboard/admin/projects/:id/deliverables` — upload panel + release trigger with gate status indicators

#### Revisions Sub-Domain
- Prisma schema: `RevisionRequest` (project_id, client_id, description, classification?, classified_by?, classified_at?, created_at)
- Revision window: `revision_window_expires_at = delivered_at + 3 business days`
- Revision classification enum: `INCLUDED`, `METHODOLOGY_CHANGE`, `NEW_PAID_WORK`
- `POST /api/v1/revisions` — Client submits revision request (enforced within revision window only; 422 if window expired)
- `PATCH /api/v1/revisions/:id/classify` — Admin classifies:
  - `INCLUDED` → project → `REVISION_REQUESTED`; assigned back to Statistician → `IN_PROGRESS`
  - `METHODOLOGY_CHANGE` → supplemental SOW required (Admin generates via `06-sow` module)
  - `NEW_PAID_WORK` → new project or supplemental quote issued
- Client view: `/dashboard/client/projects/:id/revision` — revision request form (visible only within window; shows expiry countdown)
- Admin view: `/dashboard/admin/revisions` — classification queue with project context

**Gate:** Release blocked if payment incomplete or QA missing. Client can download only after release. Revision request enforced within 3-day window. Admin classification routes correctly to included revision vs. new paid work.

---

### `13` — DefenseLab Scheduling (`13-defenselab`)

**Depends on:** `07-payments`, `08-assignment`\
**Domain:** DefenseLab Add-on

**Goal:** Client purchases DefenseLab (₱250/hour mock panel defense) and schedules a session with a Senior Statistician. Payment must be verified before scheduling. Sessions are recorded; client receives the recording.

**Deliverables:**
- Prisma schema: `DefenseLabSession` (project_id, client_id, expert_id, scheduled_at, duration_hours, amount_paid, status, recording_url?, rescheduled_at?, reschedule_reason?, penalty_applied?, created_at)
- Session status enum: `SCHEDULED`, `COMPLETED`, `NO_SHOW_CLIENT`, `RESCHEDULED`, `CANCELLED`, `PENALTY_APPLIED`
- Multiple hours may be purchased; each creates a separate session record
- `POST /api/v1/defenselab/book` — Client books session; requires verified DefenseLab payment on the project
- `PATCH /api/v1/defenselab/:id/reschedule` — Client or Expert requests reschedule
  - 12-hour notice window enforced: `new_scheduled_at - now() >= 12 hours`
  - Client reschedule with < 12 hours notice → `NO_SHOW_CLIENT`; session proceeds as originally scheduled
  - Expert reschedule with < 12 hours notice → `RESCHEDULED`; may trigger reassignment; Admin determines penalty (logged as `penalty_applied`)
- `POST /api/v1/defenselab/:id/complete` — Admin marks session complete
- `POST /api/v1/defenselab/:id/recording` — Admin uploads recording URL after session
- Client can access recording URL after status = `COMPLETED`
- Client view: `/dashboard/client/defenselab` — session list with status, schedule, recording download
- Admin view: `/dashboard/admin/defenselab` — full session management: scheduling, rescheduling, penalty assignment, recording upload

**Gate:** Booking requires verified DefenseLab payment. 12-hour rule enforced server-side. Client late reschedule does not cancel session. Recording accessible only after completion. Expert penalty logged.

---

### `14` — Finance, Payouts & Ledger (`14-finance`)

**Depends on:** `12-deliverables`, `13-defenselab`\
**Domain:** Finance & Payout

**Goal:** Finance Officer manages the revenue ledger and processes Expert payout disbursements. Payout eligibility is strictly gated (RULE_PAY_01). Expert payout rates are applied by package type.

**Deliverables:**
- Prisma schema: `FinancialLedger` (project_id, gross_revenue, platform_fee, statistician_share, qa_share, net_margin, created_at), `Payout` (project_id, recipient_id, role_type, amount, payout_rate_applied, payout_status, disbursed_at?, disbursed_by?)
- Payout rate config (from `scope.md` Section 18):
  - `JX_01_DATACHECK` / `JX_02_START`: 40–50% · `JX_03_CORE`: 60–65% · `JX_04_ADVANCED`: 70–75% · `DEFENSELAB`: 80%
  - Exact rate within range = annually approved rate stored in `PayoutRateConfig` table
- Payout status enum: `NOT_ELIGIBLE`, `PENDING`, `APPROVED`, `DISBURSED`, `VOIDED`
- `GET /api/v1/finance/ledger` — Finance/CEO: full revenue ledger with filters (date range, package, status)
- `POST /api/v1/finance/payouts/calculate` — Compute expert share for a project using approved rate
- `POST /api/v1/finance/payouts/disburse` — Finance Officer marks payout as disbursed (RULE_PAY_01 enforced):
  - Project must be `DELIVERED` or `ARCHIVED`
  - `payment_status === FULLY_PAID`
  - No active disputes (`has_active_dispute = false`)
  - No pending refunds
  - Returns 403 `PAYOUT_NOT_ELIGIBLE` if any condition fails
- Expert reassignment: original payout record → `VOIDED` before new payout calculated
- JAXIS/system error: Expert payout protected (not voided on JAXIS-caused issues)
- Chargeback: payout remains `PENDING` until dispute resolved (Module 15)
- Statistician view: `/dashboard/statistician/payouts` — own payout history (amount, project, rate applied, status)
- Finance view: `/dashboard/finance/payouts` — disbursement queue + disburse action
- Finance view: `/dashboard/finance/ledger` — full ledger table with margin breakdown
- CEO view: `/dashboard/ceo/finance` — executive summary + full ledger + payout override

**Gate:** All RULE_PAY_01 eligibility conditions enforced. Finance can disburse eligible payouts. Statistician sees only own payouts. Voiding on reassignment works. Rate config table applies correct rate.

---

### `15` — Disputes, Refunds & Chargebacks (`15-disputes`)

**Depends on:** `14-finance`\
**Domain:** Disputes

**Goal:** Clients may formally dispute a delivered project within 7 days. Admin manages the queue. CEO has final authority on refunds and chargebacks. Chargebacks halt the project and hold payout in pending.

**Deliverables:**
- Prisma schema: `Dispute` (project_id, client_id, reason, grounds `METHODOLOGY_DEVIATION|MATHEMATICAL_ERROR`, evidence_file_paths `String[]`, status, resolution_type?, resolved_by?, resolved_at?, resolution_notes?)
- Dispute status enum: `OPEN`, `UNDER_REVIEW`, `RESOLVED_REFUND`, `RESOLVED_NO_REFUND`, `CHARGEBACK`
- Refund grounds enum: `METHODOLOGY_DEVIATION`, `MATHEMATICAL_ERROR` (subjective academic disagreement is not a valid ground — enforced via grounds validation)
- `POST /api/v1/disputes` — Client submits dispute; window = 7 days after `delivered_at`; 422 if window expired
- Evidence file upload: client attaches supporting documents during dispute submission
- `PATCH /api/v1/disputes/:id/review` — Admin moves dispute to `UNDER_REVIEW`
- `PATCH /api/v1/disputes/:id/chargeback` — Admin/CEO: project → `HALTED`; payout → `PENDING` (frozen)
- `PATCH /api/v1/disputes/:id/resolve` — CEO only (RULE_ROL_01):
  - `RESOLVED_REFUND` → full refund issued; no partial refunds (policy); Expert payout fate determined by cause (JAXIS error = payout protected; client-caused = payout remains)
  - `RESOLVED_NO_REFUND` → project resumes to `CLOSED`; payout disbursement unblocked
- SLA failure refund type: `SLA_TURNAROUND_UPGRADE_ONLY` — only the add-on fee (Rush/Express/Emergency) refunded, not the package price (Core Rule 11)
- Admin view: `/dashboard/admin/disputes` — dispute queue with grounds, evidence review, chargeback action
- CEO view: `/dashboard/ceo/disputes` — final resolution authority panel

**Gate:** 7-day window enforced. Refund grounds validated (no subjective disagreements). CEO-only resolution. Chargeback halts project and freezes payout. SLA failure refund limited to upgrade fee only.

---

### `16` — Email Notifications (`16-notifications`)

**Depends on:** `07-payments` through `15-disputes`\
**Domain:** Notifications

**Goal:** Trigger transactional email notifications for all client-facing operational events. Internal events (QA status, blocked messages, deadline alerts) are surfaced as in-app alerts only — never emailed to clients.

**Deliverables:**
- Email provider: Resend (preferred) or SendGrid — abstracted behind `src/lib/email.ts` with a `sendEmail(template, recipient, data)` interface
- Email templates (React Email components in `src/lib/email/templates/`):

| Event | Recipient | Template |
|---|---|---|
| SOW ready for client review | Client | `SOWReady.tsx` |
| SOW signed confirmation | Client | `SOWSigned.tsx` |
| Payment proof received | Client | `ProofReceived.tsx` |
| Payment verified — project activated | Client | `PaymentVerified.tsx` |
| Payment rejected | Client | `PaymentRejected.tsx` |
| Expert assigned | Client | `ExpertAssigned.tsx` |
| New unread message in project thread | Client / Statistician | `NewMessage.tsx` |
| Additional information requested | Client | `InfoRequested.tsx` |
| Project delivered | Client | `ProjectDelivered.tsx` |
| Refund processed | Client | `RefundProcessed.tsx` |
| Dispute opened confirmation | Client | `DisputeOpened.tsx` |

- Internal in-app alerts only (no email to client):
  - New intake received (Admin)
  - QA submission ready (QA Lead)
  - 24-hour pre-deadline warning (Admin)
  - Ethical breach escalation (CEO)
  - Blocked message detected (Admin)
  - Expert suspension triggers reassignment needed (Admin)
- `POST /api/v1/notifications/send` — internal server-only endpoint; not publicly accessible
- Retry logic: failed email delivery retried up to 3 times with exponential backoff
- `NotificationLog` table: tracks all sent/failed emails (recipient, template, project_id, sent_at, status)

**Gate:** All 11 client-facing email templates render and send. QA events are NOT emailed to clients. Internal alerts appear in-app only. Failed sends are logged and retried.

---

### `17` — Reporting, Analytics & Archive (`17-reporting`)

**Depends on:** All preceding modules\
**Domain:** Reports & Analytics + Archive

**Goal:** Operational and financial reports with PDF export. Closed projects are archived and become read-only. Files are purged after 90 days. Clients may request data deletion subject to legal retention rules.

**Deliverables:**

#### Reporting Sub-Domain
- `GET /api/v1/reports/:type` — Parameterized report queries with date range filters
- Report types:

| Report | Audience | Key Metrics |
|---|---|---|
| Revenue Summary | Admin, CEO, Finance | Total revenue, platform margin, Expert payouts, period totals |
| Expert Performance | Admin, CEO | QA pass/fail rate, rejection count, average turnaround per Expert |
| Project Volume | Admin, CEO | Active / Completed / Cancelled counts by package type |
| Turnaround Analytics | Admin, CEO | Average turnaround, SLA misses, Rush/Express/Emergency breakdown |
| Dispute & Refund Report | Admin, CEO | Dispute count, refund totals, chargeback count |
| Client Acquisition | Admin, CEO | New clients by period, repeat clients, project frequency |
| Finance Ledger Export | Finance, CEO | Full ledger with package breakdown and margin per project |
| Expert Payout Report | Finance, CEO | Payout history by Expert, pending disbursements, voided payouts |

- PDF export: server-side generation via `@react-pdf/renderer`; downloadable from report views
- Admin view: `/dashboard/admin/reports`
- CEO view: `/dashboard/ceo/reports`
- Finance view: `/dashboard/finance/reports`

#### Archive Sub-Domain
- Prisma schema: `ArchivedProject` (snapshot of closed project — read-only; project_id, snapshot `Json`, archived_at, archived_by)
- `POST /api/v1/projects/:id/archive` — Admin manually archives a `CLOSED` project
- Archived projects: read-only; no status transitions; no file uploads; searchable
- 90-day file purge: daily scheduled job checks `files_purge_at`; deletes files from R2/S3; marks `files_purged = true` on project
- `POST /api/v1/account/data-deletion-request` — Client requests personal data deletion
  - System evaluates what can be deleted vs. what must be retained (financial records, signed SOWs, dispute evidence, audit logs are retained)
  - Non-essential data purged; client notified via email
- Audit trail: all project status transitions and Admin actions are logged with actor ID, timestamp, old status, new status, reason
- Admin view: `/dashboard/admin/archive` — searchable read-only historical record list

**Gate:** All report types return accurate data. PDF exports render and download correctly. Archive is strictly read-only. 90-day purge job works. Data deletion request honors legal retention. Audit trail complete.

---

### Module 18: Staff Attendance, Duty Tracking & Payroll Adjustments

- **Domain:** People Operations / Duty Governance
- **Dependencies:** `01-auth`, `02-staff`, `14-finance`
- **Key Features:**
  - Topbar live clock widget with 1-click Clock-In / Clock-Out and elapsed active timer
  - Tamper-proof server timestamps, IP capture, device telemetry, and mobile punch detection
  - Automated 14-hour runaway shift auto-capping (`AUTO_CLOSED`) and automatic meal break deductions
  - Missed punch and overtime correction filing with structured justification
  - Strict Segregation of Duties (SoD) anti-fraud approval matrix preventing self-approvals
  - Interactive Monthly Duty Calendar with day inspector and leave balance integration at `/dashboard/staff/hr`
  - CEO Executive Labor Governance Console (`/dashboard/ceo/attendance`) with dynamic weekend/holiday work controls, core shift hours, and wage rate configuration

**Gate:** Shift tracking is tamper-proof. SoD anti-fraud strictly blocks self-approvals. Automated capping and meal deductions calculate accurately. CEO executive policy toggles apply system-wide.

---

### Module 19: Corporate Payroll Policies, Specialist Compensation & Multi-Channel Settlement Engine

- **Domain:** People Operations / Treasury Settlement
- **Dependencies:** `01-auth`, `02-staff`, `08-assignment`, `14-finance`, `18-attendance`
- **Key Features:**
  - Dual-mandate segregation: CEO defines compensation models and rates; Finance executes batch payroll and disburses funds
  - CEO Role Compensation Matrix (`/dashboard/ceo/payroll`) with support for `FIXED_SALARY`, `PERCENTAGE_PER_STUDY`, `HOURLY_DUTY`, and `HYBRID` models
  - Corporate Settlement Cadence: Semi-Monthly (Days 1–15 and Days 16–End) vs Monthly vs Bi-Weekly with 50% base salary and allowance division
  - Bespoke Specialist Overrides allowing the CEO to tailor individual senior specialist contracts
  - Finance Batch Payroll Engine (`/dashboard/finance/payroll`) dynamically integrating Module 18 attendance hours and completed study milestones
  - Specialist Self-Service Settlement Accounts (`/dashboard/staff/hr` - Tab 6): GCash, Maya, Philippine Commercial Banks, and Cash Window with KYC verification
  - Live Treasury Verification preview card with 1-click clipboard copy
  - Treasury Disbursement Modal with auto-selected preferred payout channel and reference logging
  - High-precision official itemized Payslip Statement voucher (`PayslipStatementModal`) with audit stamp
  - Historical Payslips Ledger allowing staff to inspect, audit, and print statements across past cycles
  - Monorepo-wide KPI card typography and geometry standardization (`@repo/ui/src/KpiCard.tsx`)

**Gate:** CEO rate policies apply deterministically. Batch generator computes accurate gross/net wages across all models. Employee e-wallet/bank details sync in real time across Finance and CEO desks. Statement voucher renders complete itemized breakdown.

---

### `20` — High-Speed Database Retrieval Engine & Modern Minimalist UI

**Depends on:** All modules\
**Domain:** Core Platform Architecture & UI Standards

**Goal:** Provide enterprise-grade data retrieval speed, eliminate initial loading spinner delays via Server Component pre-loading (RSC), implement in-memory server caching (`unstable_cache` + `updateTag`), and overhaul the platform loading state into a modern minimalist single-track arc spinner.

**Deliverables:**
- Modern Minimalist single-track arc spinner (`LoadingState.tsx`, Linear / Vercel style)
- Anti-double-loading policy eliminating accessory card loaders
- Server-side in-memory caching engine (`apps/app/src/lib/cache-tags.ts`)
- Tag-based invalidation across all mutation Server Actions
- Server Component prefetching for primary operational desks (`admin/assignments`, `finance/attendance`, `finance/payroll`)

**Gate:** `npm run check-types` 0 errors. All operational desks render with initial preloaded data on initial HTML delivery.

---

## Revised Summary Table

| # | Module | Domain | Key Dependency | Change from v1 |
|---|---|---|---|---|
| 00 | Foundation & Infrastructure | Infrastructure | — | ✅ Unchanged |
| 01 | Authentication & RBAC | Identity | 00 | ✅ Unchanged |
| 02 | Expert Provisioning & Staff Mgmt | Identity / Governance | 01 | 🔀 **Moved from 17** |
| 03 | Client Profile & Account | Client Management | 01 | 🔢 Renumbered from 02 |
| 04 | Project Intake & Submission | Intake | 03 | 🔢 Renumbered from 03 |
| 05 | Quotation & Pricing | Quotation | 04 | 🔢 Renumbered from 04 |
| 06 | SOW Generation & Signing | Contract | 05 | 🔢 Renumbered from 05 |
| 07 | Payment & Installments | Payments | 06 | 🔢 Renumbered from 06 |
| 08 | Expert Assignment & Workload | Assignment | 07, 02 | 🔢 Renumbered from 07 |
| 09 | Messaging & Communication Firewall | Messaging | 04, 08 | 🔀 **Moved from 11** |
| 10 | Analysis Workbench | Analysis | 08, 09 | 🔢 Renumbered from 08 |
| 11 | Quality Assurance | QA | 10 | 🔢 Renumbered from 09 |
| 12 | Deliverables, Release & Revisions | Deliverables + Revisions | 11 | 🔀 **Merged 10 + 12** |
| 13 | DefenseLab Scheduling | DefenseLab | 07, 08 | 🔢 Renumbered from 13 |
| 14 | Finance, Payouts & Ledger | Finance & Payout | 12, 13 | 🔢 Renumbered from 14 |
| 15 | Disputes, Refunds & Chargebacks | Disputes | 14 | 🔢 Renumbered from 15 |
| 16 | Email Notifications | Notifications | 07–15 | 🔢 Renumbered from 16 |
| 17 | Reporting, Analytics & Archive | Reports + Archive | All | 🔀 **Merged 18 + 19** |
| 18 | Staff Attendance, Duty Tracking & Adjustments | People Operations / Duty Governance | 01, 02, 14 | ➕ **New (Duty & Payroll Adjustments)** |
| 19 | Corporate Payroll Policies & Payslip Engine | People Operations / Treasury Settlement | 01, 02, 14, 18 | ➕ **New (CEO Policies & Payslips)** |
| 20 | High-Speed Caching & Minimalist UI | Performance & Architecture | All | ➕ **New (Speed Engine & UI Overhaul)** |
