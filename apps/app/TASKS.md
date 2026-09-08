# JAXIS — Master Task List

**Active Module:** `14-finance` — Finance, Milestone Payouts & Treasury Ledger  
**Stack:** Next.js 16 App Router · Turborepo · Tailwind CSS v4 · Prisma · Supabase PostgreSQL · Cloudflare R2 · Resend · Trigger.dev · NextAuth.js v5  
**Design Standard:** Dark Precision Terminal / Enterprise Scientific (`design-system.md` & `.agents/AGENTS.md`)  
**Gate:** `npm run check-types` + `npm run lint` + `npm run build` must all pass before closing any module.

---

## 📖 System Documentation & Operations Playbooks
- **Master Operations Manual**: [`docs/BUSINESS_OPERATIONS_MANUAL.md`](./docs/BUSINESS_OPERATIONS_MANUAL.md)
- **Playbook 01 (Business Engine)**: [`docs/playbook/01-how-the-business-works.md`](./docs/playbook/01-how-the-business-works.md)
- **Playbook 02 (CEO & Executive Guide)**: [`docs/playbook/02-ceo-guide.md`](./docs/playbook/02-ceo-guide.md)
- **Playbook 03 (Finance & HR Operations)**: [`docs/playbook/03-finance-hr-guide.md`](./docs/playbook/03-finance-hr-guide.md)
- **Playbook 04 (Specialist & Statistician Guide)**: [`docs/playbook/04-specialist-statistician-guide.md`](./docs/playbook/04-specialist-statistician-guide.md)
- **Playbook 05 (Client Journey Guide)**: [`docs/playbook/05-client-journey-guide.md`](./docs/playbook/05-client-journey-guide.md)

---

## Module 00 — Project Foundation & Infrastructure (Completed)

### Task 1 — Turborepo Workspace & Package Structure
- [x] `turbo.json` pipelines defined
- [x] All 5 workspace members recognized
- [x] `npm run dev` starts `apps/app` on port 3001
- [x] `npm run build` clean across all workspaces

### Task 2 — Design Tokens & Font Setup
- [x] All color tokens from design system in `globals.css`
- [x] Inter and Disket Mono loaded via `next/font`
- [x] Font variables applied to `<html>` element
- [x] Tailwind v4 utility classes resolve

### Task 3 — Environment Schema & Infrastructure Clients
- [x] All packages installed
- [x] `src/lib/env.ts` Zod schema — all 13 vars validated
- [x] `src/lib/db.ts` Prisma singleton
- [x] `src/lib/supabase.ts` browser + admin clients
- [x] `src/lib/storage.ts` R2 client + pre-signed URL helpers
- [x] `src/lib/email/index.ts` `sendEmail()` abstraction
- [x] `.env.example` complete
- [x] `.env.local` populated with real credentials

### Task 4 — Prisma Schema Init & Supabase Connection
- [x] `DATABASE_URL` = Supabase pooler URL (port 6543)
- [x] `DIRECT_URL` = Supabase direct URL (port 5432)
- [x] `npx prisma db push` succeeds with zero errors
- [x] `npx prisma generate` succeeds
- [x] Seed script wired (empty stub)

### Task 5 — `@repo/ui` Component Library
- [x] All shared components created in `packages/ui`
- [x] `Button` — all 4 variants × 3 sizes render with precision `rounded-[2px]`
- [x] `StatusBadge` — all 22 project statuses mapped
- [x] `DataTable` — loading skeleton and empty state work
- [x] No `any` types in any component
- [x] `@repo/ui` imports resolve in `apps/app`

### Task 6 — Base Layout Shell & Module Gate
- [x] Root layout renders without error
- [x] `<Topbar>` structural shell correct
- [x] `<Sidebar>` structural shell correct
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 warnings/errors
- [x] `npm run build` → clean

---

## Module 01 — Authentication & RBAC (Completed)

### Task 1 — Prisma Schema: Identity Models & Migration
- [x] `UserStatus`, `RoleName`, `AuthEvent` enums defined
- [x] `User` model with indexes on `email`, `status`
- [x] `Role` model with unique `name`
- [x] `UserRole` junction with composite PK `[userId, roleId]`
- [x] `AuthAuditLog` model with indexes on `userId`, `email`, `event`, `createdAt`
- [x] Prisma client generated with new models

### Task 2 — Database Seed: Roles & All 6 Dev Users
- [x] All 6 roles seeded (Client, Statistician, Senior QA Lead, Admin, Finance Officer, CEO)
- [x] All 6 dev users seeded with hashed passwords
- [x] `UserRole` records correctly linking each user to their role
- [x] Seed is idempotent

### Task 3 — NextAuth.js v5 Configuration & `requireRole()` Utility
- [x] `src/lib/auth.ts` created with full NextAuth config
- [x] `authorize()` correctly handles wrong password, suspended, and terminated states
- [x] JWT and session callbacks embed `userId`, `role`, `fullName`
- [x] Auth audit log writes on login success, login failure, and logout
- [x] `requireRole()` implemented and typed
- [x] Session type augmentation — `session.user.role` has no TypeScript errors

### Task 4 — Auth Pages: Login & Register UI
- [x] `LoginSchema` and `RegisterSchema` defined in `schemas.ts`
- [x] `src/features/auth/actions.ts` implemented with `registerClient()` Server Action
- [x] `/login` page renders with Corporate Midnight design system tokens
- [x] `/register` page renders with form validation and password confirmation
- [x] Login error messages for wrong password, suspended, terminated accounts
- [x] Post-login redirect map implemented (`ROLE_HOME`)

### Task 5 — Route Protection Middleware & Unauthorized Page
- [x] `src/middleware.ts` created with session check and role routing
- [x] Unauthenticated `/dashboard/*` visit → redirect to `/login`
- [x] CLIENT visiting `/dashboard/admin/` → redirect to `/unauthorized`
- [x] All 6 role dashboard shells render at their correct routes

### Task 6 — Client Registration API Route & Audit Log Verification
- [x] `POST /api/v1/auth/register` route created and validated
- [x] Returns 422 on schema failure, 409 on duplicate email, 201 on success
- [x] `AuthAuditLog` verified for all event types

### Task 7 — Module Gate Verification & Handoff
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 warnings/errors
- [x] `npm run build` → clean

### Task 8 — Self-Service Password Reset via Resend & Secure Tokens
- [x] `PasswordResetToken` Prisma model created with token hash, expiration, and indexes
- [x] `sendEmail()` integration with `"PasswordReset"` transactional template
- [x] `requestPasswordResetAction`, `verifyResetTokenAction`, and `resetPasswordAction` implemented
- [x] `/forgot-password` and `/reset-password` pages created with dark precision UI
- [x] Security: 256-bit crypto tokens, SHA-256 at rest, 60-min TTL, timing-safe anti-enumeration responses
- [x] Route middleware updated to include password recovery routes
- [x] Support across all 6 roles (Client, Statistician, QA Lead, Finance Officer, Admin, CEO)
- [x] Resend sandbox restriction auto-detection (`only send testing emails`) returning clear dev notice
- [x] Direct recovery bypass button (`Open Password Reset Desk Directly →`) on confirmation screen for smooth QA/testing before custom domain DNS verification
- [x] Safe `notificationLog` audit persistence ensuring unauthenticated password recovery emails log cleanly without null-constraint errors

---

## Module 02 — Expert Provisioning & Staff Management (Completed)

### Task 1 — Staff Profile Schema & Violation Models
- [x] `ViolationType` and `SuspensionAction` enums defined
- [x] `StaffProfile` model defined and linked to `User`
- [x] `SuspensionLog` model defined with indexes on `userId` and `performedAt`

### Task 2 — Seed Data for Core Staff Accounts
- [x] Seeded profiles for Statistician, Senior QA Lead, and Finance Officer

### Task 3 — Staff Management Server Actions
- [x] Server actions for provisioning, profile updates, suspensions, and CEO termination

### Task 4 — Staff Directory & Self-Service Views
- [x] Admin Staff Directory (`/dashboard/admin/staff`) with role badges, status, and action modals
- [x] Staff Self-Profile Workbench Views (`/dashboard/statistician/profile`, `/dashboard/qa/profile`)
- [x] Quality gates verified (0 errors, 0 warnings)

---

## Module 03 — Client Profile & Account (Completed)

### Task 1 — Client Profile Data Schema
- [x] `ClientProfile` model linked 1:1 with `User`

### Task 2 — Profile Actions & Onboarding Validation
- [x] `upsertClientProfile` Server Action and Zod schema
- [x] Profile Completion Gate & Banner across client routes

### Task 3 — Client Profile UI
- [x] Client Profile Form UI (`/dashboard/client/profile`)
- [x] Quality gates verified (0 errors, 0 warnings)

---

## Module 04 — Project Intake & Submission (Completed)

### Task 1 — Intake Schema & State Machine
- [x] `Project`, `ProjectFile`, `ProjectStatus` (24 states), and `FileCategory` models
- [x] `VALID_TRANSITIONS` state machine map in `src/lib/project-rules.ts`
- [x] Human-readable intake ID generator: `JAXIS-YYYYMM-XXXX`

### Task 2 — Client Intake Wizard UI
- [x] Client Multi-Step Project Intake Form UI (`/dashboard/client/projects/new`)

### Task 3 — Client Projects Workspace
- [x] Client Projects Workbench & Detail Views (`/dashboard/client/projects`, `/dashboard/client/projects/[id]`)

### Task 4 — Admin Triage Desk
- [x] Admin Triage Queue & Inspection Desk (`/dashboard/admin/intake`, `/dashboard/admin/projects/[id]`)

### Task 5 — Module Gate Verification
- [x] Quality gates verified (0 errors, 0 warnings)

---

## Module 05 — Quotation & Pricing (Completed)

### Task 1 — Pricing Schema & Configuration Models
- [x] `Quotation`, `QuotationLineItem`, `PackagePriceConfig` models and enums
- [x] `RULE_QUO_01` (Admin/CEO only), `RULE_QUO_02` (100% upfront on Starter packages), price floor enforcement

### Task 2 — Commercial Quotation Actions
- [x] Server actions with atomic transactions (`prisma.$transaction`)

### Task 3 — Admin Quotation Builder
- [x] Admin Commercial Quotation Builder UI (`/dashboard/admin/quotations`)

### Task 4 — Client Proposal Review UI
- [x] Client Commercial Proposal Review UI (`/dashboard/client/projects/[id]/quote`)
- [x] 3-day countdown timer and auto-expiry logic

### Task 5 — Module Gate Verification
- [x] Quality gates verified (0 errors, 0 warnings)

---

## Module 06 — SOW Generation & Signing (Completed)

### Task 1 — SOW Snapshot Schema & Immutability Rules
- [x] `SOW` model, `SOWType` enum, and unalterable JSON snapshot engine
- [x] `assertSOWUnlocked` immutability rule and signatory name verification

### Task 2 — SOW Document & Print Renderer
- [x] Official `SowDocument.tsx` with clean print stylesheet for PDF export

### Task 3 — Client Digital Signing Portal
- [x] Client SOW Review & Digital Signing Page (`/dashboard/client/projects/[id]/sow`)

### Task 4 — Admin SOW Control Center
- [x] Admin SOW Control Center (`/dashboard/admin/projects/[id]/sow`)

### Task 5 — Module Gate Verification
- [x] Quality gates verified (0 errors, 0 warnings)

---

## Module 07 — Payment & Installments (Completed)

### Task 1 — Payment Schema & Balance Calculator
- [x] `Payment` model and reverse relations on `Project` and `Quotation`
- [x] `calculateProjectBalance` balance engine and official corporate payment channels

### Task 2 — Payment Ledger Components
- [x] `PaymentLedgerCard.tsx`, `PaymentProofUploadModal.tsx`, `PaymentVerificationModal.tsx`

### Task 3 — Client Payment Portal
- [x] Client Payment Portal (`/dashboard/client/projects/[id]/payment`)

### Task 4 — Finance Deposit Verification Desk
- [x] Finance Deposit Verification Queue (`/dashboard/finance/payments`)

### Task 5 — Module Gate Verification
- [x] Quality gates verified (0 errors, 0 warnings)

---

## Module 08 — Expert Assignment & Workload (Completed)

### Task 1 — Assignment Schema & Holiday Calendar
- [x] `Assignment`, `AssignmentHistory`, `PhilippineHoliday` models
- [x] SLA turnaround engine skipping weekends and 17 statutory Philippine holidays

### Task 2 — Specialization Affinity Algorithm
- [x] Specialization affinity scoring algorithm and burnout risk indicators

### Task 3 — Admin Workload & Assignment Desk
- [x] Admin Expert Assignment & Workload Desk (`/dashboard/admin/assignments`)

### Task 4 — Specialist Study Workspace Routing
- [x] Live database connections for `/dashboard/statistician` and `/dashboard/qa`

### Task 5 — Module Gate Verification
- [x] Quality gates verified (0 errors, 0 warnings)

---

## Module 09 — Messaging & Communication Firewall (Completed)

### Task 1 — Data Layer & Firewall Audit Models
- [x] `Message`, `MessageReadReceipt`, and `BlockedMessageLog` models with relations to `User` and `Project`
- [x] Synchronized schema with Supabase PostgreSQL and generated Prisma Client

### Task 2 — Server-Side Communication Firewall Engine
- [x] 5-pass anti-evasion normalization engine (`RAW`, `LEETSPEAK`, `COLLAPSED`, `STRIPPED_DELIMITERS`, `WORD_DIGITS`)
- [x] Interception of off-platform emails, PH mobile numbers, GCash/Maya/PayPal, WhatsApp/Telegram/Viber/FB handles, and external URLs
- [x] Zero-leak message blocking policy with immediate sender warning notices

### Task 3 — Project Consultation Threads & Real-Time Sync
- [x] Supabase Realtime websocket subscriptions (`project-messages:${projectId}`) with delta sync
- [x] `<MessageThread />`, `<MessageBubble />`, and `<MessageInput />` components
- [x] Client Messages Desk (`/dashboard/client/messages`, `/dashboard/client/projects/[id]/messages`)
- [x] Statistician Study Consultation Console (`/dashboard/statistician/projects/[id]/messages`)

### Task 4 — Admin & CEO Firewall Incident Review Queue
- [x] Admin Communication Firewall Audit Desk (`/dashboard/admin/messages`)
- [x] `<BlockedMessageReviewModal />` with matched snippet highlight and review acknowledgment

### Task 5 — Responsive Master-Detail Mobile UX & Verification
- [x] Full-width Studies List on mobile screens (< `lg` breakpoint) with 1-tap full-screen chat view
- [x] Verification report documented in `docs/modules/09-messaging-verification.md`
- [x] Quality gates verified (0 errors, 0 warnings)

---

## Module 10 — Analysis Workbench (Completed)

### Task 1 — Database Schema & Prisma Sync
- [x] `AnalysisFile` model with `AnalysisFileCategory`, auto-incrementing `version`, `isCurrent`, and `notes`
- [x] `ScopeCreepLog` model recording out-of-scope expansion flags, flagging specialist, timestamps, resolution details, and linked supplemental quotation IDs
- [x] Synchronized schema with Supabase PostgreSQL via `npx prisma db push`

### Task 2 — Analysis Rules & Permission Guardrails
- [x] `assertStatisticianAssigned()` role & assignment gate
- [x] `assertCanUploadAnalysis()` blocking uploads during `SCOPE_CREEP_HALTED`, `FOR_QA`, `DELIVERED`, `CLOSED`
- [x] `validateAnalysisFileFormat()` enforcing 200MB maximum size and supported statistical extensions
- [x] `getAnalysisFileDownloadUrl()` signed URL generator with strict 403 authorization blocking Client role access

### Task 3 — Multi-Version Upload & Lineage Engine
- [x] Atomic transactions archiving prior version (`isCurrent = false`) and creating new version (`isCurrent = true`, `version = prev + 1`)
- [x] First upload automatically advances project status to `IN_PROGRESS`
- [x] Interactive `VersionHistoryModal` displaying full timestamped file lineage

### Task 4 — Scope Expansion & Work Halting (`RULE_QUO_03`)
- [x] `flagScopeCreep()` halting work (`SCOPE_CREEP_HALTED`) and notifying Admin for supplemental quotation
- [x] Upload controls locked across workbench during scope halt
- [x] Admin `resolveScopeCreep()` returning project to `IN_PROGRESS`

### Task 5 — One-Way Submit for QA
- [x] `submitForQA()` advancing status to `FOR_QA` with pre-flight file existence assertion
- [x] Workbench upload controls locked during QA review

### Task 6 — Interactive UI Desks & Verification Sign-Off
- [x] Statistician Workbench (`/dashboard/statistician/projects/[id]/workbench`)
- [x] QA Working Files Desk (`/dashboard/qa/projects/[id]/files`)
- [x] Admin Analysis Audit Vault (`/dashboard/admin/projects/[id]/analysis`)
- [x] Verification report documented in `docs/modules/10-analysis-verification.md`
- [x] Quality gates verified (0 errors, 0 warnings)

---

## Module 11 — Quality Assurance & Reproducibility (Completed)

### Task 1 — Database Schema & Prisma Sync
- [x] `QADecision` (`QA_APPROVED`, `QA_REJECTED`, `ESCALATED_TO_CEO`) and `ErrorClassification` (`MINOR`, `MAJOR`, `CRITICAL`, `ETHICAL_BREACH`) enums
- [x] `QAReview` model with `reviewerId`, `decision`, `errorClassification`, `comments`, `qaRevisionDueAt`, `reviewedAt`
- [x] `QARejectionCount` model tracking cumulative rejections per project/statistician
- [x] Push schema to Supabase PostgreSQL and generate Prisma Client

### Task 2 — QA Decision Rules & Permission Guardrails
- [x] `assertQaLeadAssigned()` verification gate
- [x] `assertCanSubmitQaReview()` validating `FOR_QA` status
- [x] `RULE_ETH_01`: Immediate project lockdown (`ETHICAL_BREACH`, `isLocked = true`) and CEO alert
- [x] `RULE_REL_02`: Enforce `qaApproved = true` flag for Tier 2 packages (`JX_03_CORE`, `JX_04_ADVANCED`)
- [x] Client status masking: Return `IN_PROGRESS` for internal QA states

### Task 3 — QA Evaluation Server Actions & Schemas
- [x] `SubmitQAReviewSchema` Zod validation
- [x] `getQaQueue()` action for Senior QA Lead review queue
- [x] `getQaInspectionDesk(projectId)` complete data bundle action
- [x] `submitQaReview()` atomic decision action updating status, deadlines, and rejection counts
- [x] `getQaReviewHistory()` scorecard lineage action
- [x] `getCeoEscalations()` and `getAdminQaRejectionWarnings()` actions

### Task 4 — QA Lead Dashboard & Review Queue UI
- [x] Senior QA Lead Dashboard (`/dashboard/qa`) with live telemetry cards (Pending QA, Approved, Under Revision, Escalated)
- [x] Assigned studies review table with direct link to the Evaluation Desk

### Task 5 — QA Scorecard & Evaluation Desk UI
- [x] Dedicated Evaluation Desk (`/dashboard/qa/projects/[id]/review`)
- [x] SOW deliverables & study objectives inspector
- [x] 1-click analysis output and client dataset downloads
- [x] Structured QA Evaluation Form (Decision, Error Classification, Comments)
- [x] Evaluation history timeline

### Task 6 — Executive Escalation Desk, Revision Alerts & Gate Sign-Off
- [x] CEO Ethical Breach Escalation Queue (`/dashboard/ceo/escalations`)
- [x] 24-hour revision alert banner in Statistician Workbench (`AnalysisWorkbenchDesk.tsx`)
- [x] Verification report documented in `docs/modules/11-qa-verification.md`
- [x] Quality gates verified (`npm run check-types`, `npm run lint`)

---

## Module 12 — Deliverables, Release & Revisions (Completed)

### Task 1 — Deliverables & Revision Request Schema
- [x] `Deliverable`, `DeliverableCategory`, `RevisionRequest`, `RevisionClassification` models

### Task 2 — Dual Release Gates (`RULE_REL_01` & `RULE_REL_02`)
- [x] `RULE_REL_01`: Hard block on unpaid balance (`paymentStatus !== FULLY_PAID`)
- [x] `RULE_REL_02`: Hard block on Tier 2 packages without QA approval (`qaApproved !== true`)

### Task 3 — Deliverables Packaging & Release Actions
- [x] Admin deliverable upload, pre-signed download URLs, and 90-day purge timestamp

### Task 4 — 3-Day Revision Window & Classification Routing
- [x] Client 3-day revision window countdown and request submission
- [x] Admin revision classification (`INCLUDED`, `METHODOLOGY_CHANGE`, `NEW_PAID_WORK`)

### Task 5 — Client & Admin Deliverable Desks
- [x] Client Final Deliverables Portal & Revision Request Desk
- [x] Admin Deliverable Packaging & Release Console

### Task 6 — Module Gate Verification
- [x] Verification report documented in `docs/modules/12-deliverables-verification.md`
- [x] Quality gates verified (0 errors, 0 warnings)

---

## Module 13 — DefenseLab Scheduling & Mock Defense (Completed)

### Task 1 — Database Schema & Prisma Sync
- [x] `DefenseLabStatus` enum (`SCHEDULED`, `COMPLETED`, `NO_SHOW_CLIENT`, `RESCHEDULED`, `CANCELLED`, `PENALTY_APPLIED`)
- [x] `DefenseLabSession` model with relations to `Project` and `User` (`ClientDefenseLab`, `ExpertDefenseLab`)
- [x] Synchronized schema with Supabase PostgreSQL via `npx prisma db push`

### Task 2 — Reschedule Rules & 12-Hour Cancellation Guardrail
- [x] `assertRescheduleEligible()` enforcing strict 12-hour advance notice window
- [x] Late client notice ($< 12\text{h}$) automatically transitions to `NO_SHOW_CLIENT` (non-refundable)
- [x] Late specialist notice ($< 12\text{h}$) triggers administrative penalty review and rescheduling
- [x] `computeDefenseLabAmount()` computing fee at ₱250/hour

### Task 3 — DefenseLab Server Actions & Validation
- [x] `bookDefenseLabSession` verifying payment status and assigned statistician
- [x] `rescheduleDefenseLabSession` handling 12-hour notice checks and state transitions
- [x] `updateDefenseLabMeetingLink` coordinating Google Meet / Zoom links
- [x] `completeDefenseLabSession` and `uploadDefenseLabRecording` with client access gates
- [x] `applyDefenseLabPenalty` recording administrative determinations
- [x] Dynamic database delegation in `db.ts` with direct query execution fallbacks

### Task 4 — Client DefenseLab Portal UI
- [x] Client DefenseLab Hub (`/dashboard/client/defenselab`)
- [x] Live rehearsal appointment countdown, meeting link joiner, and reschedule modal
- [x] Gated session recording vault (unlocked post-completion)
- [x] Seeded mock sessions (1 Upcoming + 1 Completed with Google Drive recording) for Client Ana Cruz

### Task 5 — Admin Operations Control Center UI
- [x] Admin DefenseLab Operations Queue (`/dashboard/admin/defenselab`)
- [x] Meeting link coordinator, session completion modal, recording attacher, and penalty manager

### Task 6 — Module Gate Verification
- [x] Verification report documented in [`docs/modules/13-defenselab-verification.md`](./docs/modules/13-defenselab-verification.md)
- [x] Quality gates verified (`npm run check-types` → 0 errors across 5 workspace packages)

---

## Module 18 — Staff Attendance & Duty Governance (Completed)

### Task 1 — Timeclock Data Layer & Shift Safety Models
- [x] `StaffShift`, `ShiftStatus` (`OPEN`, `CLOSED`, `AUTO_CLOSED`), and `ShiftCorrectionRequest` models
- [x] 14-hour anti-runaway shift safety auto-close trigger
- [x] Automatic meal break deductions (60 min for shifts $\ge 5$ hours)
- [x] Net payable duty hours calculation engine

### Task 2 — Live Topbar Timeclock Widget & Telemetry Tracker
- [x] Global `<ClockInOutButton />` in `Topbar.tsx` accessible to all staff roles
- [x] Live pulsing timer display (`● 03:42:15`) during active shifts
- [x] Browser device & IP telemetry logging for shift audit trails

### Task 3 — Attendance Audit Desk & Shift Correction Workflows
- [x] Finance & HR Attendance Audit Desk (`/dashboard/finance/attendance`)
- [x] Staff Shift Corrections Filing Modal & Approval Workflow
- [x] Anti-Self-Approval Segregation of Duties guardrail

### Task 4 — Specialist Leave Management & Approvals
- [x] `StaffLeaveRequest`, `LeaveType` (`VACATION`, `SICK`, `EMERGENCY`, `MATERNITY_PATERNITY`), and status workflows
- [x] Specialist Leave Application Form & HR Leave Approval Queue (`/dashboard/finance/leaves`)
- [x] Quality gates verified (0 errors, 0 warnings)

---

## Module 19 — Corporate Payroll & Payslip Engine (Completed)

### Task 1 — Compensation Policy Models & Rate Matrices
- [x] `CompensationPolicy` and `SpecialistPayOverride` models
- [x] 4 compensation models: `FIXED_BASE`, `COMMISSION_ONLY`, `HOURLY_DUTY`, `HYBRID`
- [x] Role-based base salaries, hourly duty rates, and study deliverable commission percentages

### Task 2 — Semi-Monthly Payroll Calculation Engine
- [x] Semi-monthly cut-off cycle support: `FIRST_HALF` (Days 1–15) and `SECOND_HALF` (Days 16–End)
- [x] Automated batch formula: $\text{Gross} = \text{Pro-Rated Base} + (\text{Duty Hours} \times \text{Rate}) + \text{Commissions}$
- [x] Mandatory tax/deduction calculations for Net Take-Home earnings

### Task 3 — Specialist Self-Service Settlement Accounts
- [x] `StaffPayoutAccount` model with channel routing (`GCASH`, `MAYA`, `BANK_TRANSFER`, `CASH`)
- [x] Self-service account configuration tab in Staff HR Portal (`/dashboard/staff/hr`)
- [x] Real-time input formatters (`formatEWalletNumber`, `formatBankAccountNumber`) with live digit capping (11 digits for GCash/Maya, 16 digits for Banks)

### Task 4 — Finance Payout Desk & 1-Click Treasury Disbursements
- [x] Finance Payroll Desk (`/dashboard/finance/payroll`) with live batch runner
- [x] Treasury Settlement Modal with 1-Click Clipboard Copy for specialist payment numbers
- [x] Transaction reference logging (`GCash Ref`, `BDO Wire Ref`) and instant status transition to `DISBURSED`

### Task 5 — CEO Executive Compensation Policy Desk & Bespoke Overrides
- [x] CEO Payroll Governance Desk (`/dashboard/ceo/payroll`)
- [x] Company-wide rate matrix editor with live save & validation
- [x] Individual specialist override modal for bespoke PhD/Senior consultant contracts

### Task 6 — Historical Payslips Ledger & Official Itemized Statements
- [x] Interactive Payslip Statement Voucher modal with QR reference, earnings breakdown, and deduction items
- [x] Historical audit ledgers for Staff, Finance, and CEO desks
- [x] Quality gates verified (0 errors, 0 warnings)

---

## System Polish & Design Harmonization (Completed)

### Task 1 — Standardized KPI Card Architecture
- [x] Converted all metric/telemetry cards across all roles and pages to exclusively use `<KpiCard />` from `@repo/ui`
- [x] Standardized typography: Uppercase monospace labels, bold monospace values, unit suffixes, and sans-serif descriptions

### Task 2 — Precision Table Layout Overhaul
- [x] Eliminated multi-line text wrapping across all payroll and ledger tables
- [x] Structured 2-line pay periods (`Month` + analytical sky blue `1st/2nd Half` sub-badge)
- [x] High-contrast emerald net take-home pills and compact action buttons
- [x] Calibrated padding and column widths for seamless 100% desktop fitting without horizontal scrollbars

### Task 3 — Real-Time Input Formatter Utility
- [x] Implemented `apps/app/src/lib/formatters.ts` (`formatEWalletNumber`, `formatBankAccountNumber`, `formatSettlementAccountNumber`)
- [x] Integrated across Staff HR Portal and Corporate Payment Channel Settings

### Task 4 — Master Business Operations Manual & Playbook Suite
- [x] Created `docs/BUSINESS_OPERATIONS_MANUAL.md` (Comprehensive executive manual)
- [x] Created `docs/playbook/01-how-the-business-works.md` (End-to-end engine & escrow)
- [x] Created `docs/playbook/02-ceo-guide.md` (Compensation policy & labor audit)
- [x] Created `docs/playbook/03-finance-hr-guide.md` (Clearances, payroll runs & payouts)
- [x] Created `docs/playbook/04-specialist-statistician-guide.md` (Timeclock, workbench & payslips)
- [x] Created `docs/playbook/05-client-journey-guide.md` (Intake, SOW & deliverable downloads)

### Task 5 — Philippine Peso (`₱`) Currency Symbol Harmonization
- [x] Standardized `<Peso />` component in `@repo/ui` with clean `font-sans font-normal opacity-85 select-none inline-block mr-0.5`
- [x] Added `formatPeso(amount)` and `formatPesoCompact(amount)` helpers in `@/lib/formatters`
- [x] Normalized global CSS rules in `globals.css` (`.peso-symbol`, `.peso-sign`, `[data-peso]`)
- [x] Replaced all raw/mismatched bold monospace `₱` occurrences across Quotations, SOW, Finance, CEO, and Staff HR pages
- [x] Documented strict typography standard in `AGENTS.md`, `.agents/AGENTS.md`, and `docs/design-system.md`

### Task 6 — Standardized PageHeader & Navigation Breadcrumbs Architecture
- [x] Refactored canonical `<PageHeader />` in `@repo/ui` with Next.js client-side `<Link>` SPA routing
- [x] Standardized root breadcrumbs to `{ label: "WORKSPACE", href: "/dashboard" }` across all 32 pages
- [x] Replaced ad-hoc raw `<h1>` divs with canonical `<PageHeader />` across Finance Attendance Review Desk
- [x] Harmonized 3-tier hierarchy: (1) Breadcrumbs, (2) Title & Badge, (3) Description, (4) Responsive Actions
- [x] Documented strict PageHeader standard in `AGENTS.md`, `.agents/AGENTS.md`, and `docs/design-system.md`

### Task 7 — Messenger-Style Chat Optimization & Canonical Orbital Loading Standard
- [x] Implemented instant cache-first preload in `MessageThread.tsx` (0ms perceived load time from browser session cache)
- [x] Implemented optimistic instant message rendering (0ms send latency, instant input clearing, automatic rollback on firewall violation or network exception)
- [x] Replaced inline grey skeleton boxes with canonical full-page orbital loader `<LoadingState variant="page" />` across Client and Statistician messages desks
- [x] Optimized Prisma queries in `messaging/actions.ts` (`take: 1` preview snippet, parallel `Promise.all` query execution, non-blocking background read receipts)
- [x] Added resilient database client delegation and dynamic schema reload in `db.ts` to prevent stale client model exceptions in dev environments
- [x] Seeded mock DefenseLab sessions and messaging threads for Client Ana Cruz and Dr. Juan Reyes

### Task 8 — Module 14: Finance, Milestone Payouts & Treasury Ledger
- [x] Implemented Prisma database models: `PayoutRateConfig`, `Payout`, `FinancialLedger` with enums `PayoutStatus` (`NOT_ELIGIBLE`, `PENDING`, `APPROVED`, `DISBURSED`, `VOIDED`) and `PayoutRole` (`STATISTICIAN`, `QA_LEAD`)
- [x] Synchronized schema with Supabase PostgreSQL and seeded baseline package payout rates (`JX_01`: 45%, `JX_02`: 47%, `JX_03`: 62%, `JX_04`: 72%, `DEFENSELAB`: 80%)
- [x] Implemented core calculation and validation engine in `src/lib/payout-rules.ts`:
  - `assertPayoutEligible()` strictly enforcing `RULE_PAY_01` (DELIVERED/CLOSED status, 100% paid, no disputes, no refunds)
  - `calculateAndSyncProjectPayouts()` computing Statistician commission and Senior QA Lead audit fees (10% of stat share)
- [x] Built Server Actions in `src/features/finance/actions.ts`:
  - `getFinancePayoutQueue` with `RULE_PAY_01` checklist inspection and registered specialist settlement accounts
  - `disbursePayoutAction` recording disbursement method (`GCASH`, `MAYA`, `BANK_TRANSFER`, `CASH`) and transaction reference numbers
  - `voidPayoutAction` with documented administrative reasons
  - `getFinancialLedgerAction` with per-project gross revenue, platform fee, and net margin analytics
  - `getCeoFinancialOverviewAction` and `updatePayoutRateConfigAction` for executive rate matrix governance
  - `getSpecialistPayoutHistoryAction` for statistician and QA lead earnings ledgers
- [x] Built UI Desks complying with Dark Precision design system & Plain English copywriting:
  - Finance Milestone Payouts Desk (`/dashboard/finance/payouts`) with `<DisbursePayoutModal />` and `<VoidPayoutModal />`
  - Project Financial Ledger Desk (`/dashboard/finance/ledger`) with margin pills and package filtering
  - CEO Financial Governance Desk (`/dashboard/ceo/finance`) with package profitability matrix and live rate editor modal
  - Statistician Payouts Desk (`/dashboard/statistician/payouts`)
  - Senior QA Lead Audit Earnings Desk (`/dashboard/qa/payouts`)
- [x] Updated `Sidebar.tsx` activating Finance Payouts/Ledger, CEO Treasury, and Specialist Payouts navigation
### Task 9 — Module 15: Disputes, Academic Arbitrations, Refunds & Chargebacks
- [x] Implemented Prisma database models: `Dispute` with enums `DisputeStatus` (`OPEN`, `UNDER_REVIEW`, `RESOLVED_REFUND`, `RESOLVED_NO_REFUND`, `CHARGEBACK`), `DisputeGrounds` (`METHODOLOGY_DEVIATION`, `MATHEMATICAL_ERROR`, `SLA_BREACH`), and `DisputeResolutionType` (`FULL_REFUND`, `TURNAROUND_UPGRADE_REFUND_ONLY`, `NO_REFUND`, `CHARGEBACK`)
- [x] Synchronized schema with Supabase PostgreSQL and updated client relations on `Project` and `User`
- [x] Implemented core dispute rules engine in `src/lib/dispute-rules.ts`:
  - `assertDisputeWindowOpen()` strictly enforcing 7-day post-delivery claim window (`deliveredAt + 7 days`)
  - `computeSLABreachRefund()` computing refundable turnaround upgrade add-on fees (Core Rule 11)
- [x] Built Server Actions in `src/features/disputes/actions.ts`:
  - `getClientEligibleDisputesAction` listing eligible delivered projects within the 7-day window
  - `submitDisputeAction` validating objective grounds and placing project into `DISPUTED` state
  - `getAdminDisputesAction` with status filters, search, and comprehensive arbitration summary
  - `reviewDisputeAction` transitioning claim to `UNDER_REVIEW`
  - `triggerChargebackAction` moving project to `HALTED` and freezing specialist milestone payouts
  - `resolveDisputeAction` strictly enforcing CEO exclusive authority (`RULE_ROL_01`) for refund and output rulings
- [x] Built UI Desks complying with Dark Precision design system & Plain English copywriting:
  - Client Dispute Filing & 7-Day Window Tracker Desk (`/dashboard/client/disputes`)
  - Admin Dispute Triage & Evidence Investigation Queue (`/dashboard/admin/disputes`)
  - CEO Academic Arbitrations & Refund Resolution Panel (`/dashboard/ceo/disputes`)
- [x] Updated `Sidebar.tsx` activating Disputes links across Client, Admin, and CEO roles
- [x] Connected real-time notification dispatching to `submitDisputeAction` and `resolveDisputeAction` alerting Admin, Finance, CEO, and Client with event-aware action links
### Task 10 — Module 16: Email Notifications & In-App Alert Center
- [x] Implemented Prisma database models: `NotificationLog` and `InAppAlert` with enum `NotificationStatus` (`SENT`, `FAILED`, `RETRYING`)
- [x] Synchronized schema with Supabase PostgreSQL and updated client relations on `Project` and `User`
- [x] Built Email Provider Abstraction & Template Engine in `src/lib/email/`:
  - `sendEmail()` with Resend API integration in production and simulated fallback logging in local development
  - Implemented 3-attempt exponential retry logic on delivery failures
  - Built 11 responsive HTML email templates: `SOWReady`, `SOWSigned`, `ProofReceived`, `PaymentVerified`, `PaymentRejected`, `ExpertAssigned`, `NewMessage`, `InfoRequested`, `ProjectDelivered`, `RefundProcessed`, and `DisputeOpened`
- [x] Built Server Actions in `src/features/notifications/actions.ts`:
  - `getInAppAlertsAction` and `getUnreadAlertCountAction` for dynamic user notifications
  - `markAlertReadAction` and `markAllAlertsReadAction`
  - `createInAppAlertAction` for internal lifecycle triggers
  - `getNotificationLogsAction` and `retryFailedNotificationAction` for administrative delivery audits
- [x] Built UI Desks & Components:
  - Topbar Notification Bell with live unread badge counter and slide-out `<NotificationDrawer />` in `Topbar.tsx`
  - Admin Email Delivery Logs & Telemetry Desk (`/dashboard/admin/notifications`) with KPI telemetry cards and details modal
- [x] Updated `Sidebar.tsx` activating Email Delivery Logs navigation under Admin
- [x] Built Platform-Wide Real-Time In-App Notification Engine:
  - Server-Sent Events stream (`/api/v1/notifications/stream`) with 15s delta background fallback and `jaxis:study-updated` DOM event bus
  - Real-time dispatching across Deliverables, Revisions, Datasets, and Disputes across all 6 roles with event-aware deep links
- [x] Seeded mock initial in-app alerts and delivery logs in `prisma/seed.ts`
- [x] Documented verification report in `docs/modules/16-notifications-verification.md` (0 check-types errors across 5 packages)

### Task 11 — Module 17: Reporting, Operational Analytics & Audit Archive
- [x] Implemented Prisma database models: `ArchivedProject`, `AuditLog`, `DataDeletionRequest`, and enum `DeletionStatus` (`PENDING`, `PROCESSED`, `REJECTED`)
- [x] Synchronized schema with Supabase PostgreSQL and updated relations on `User` and `Project`
- [x] Built 8 Parameterized Operational & Financial Report calculators in `src/features/reporting/actions.ts`:
  - `revenue-summary`, `expert-performance`, `project-volume`, `turnaround-analytics`, `dispute-refund`, `client-acquisition`, `ledger-export`, and `payout-report`
- [x] Built Project Archival & 90-Day Storage Retention Engine:
  - `archiveProjectAction` saving full immutable JSON snapshots
  - `getArchivedProjectsAction` with fast search across intake ID, client name, package
  - `purgeExpiredFilesAction` marking `filesPurged: true` with audit log creation
  - `submitDataDeletionRequestAction` and `processDataDeletionRequestAction` honoring legal retention boundaries
- [x] Built Role-Scoped UI Desks & Export Utilities:
  - Admin Operations & Reports Hub (`/dashboard/admin/reports`) with 8 report switchers, date range intervals, quick presets, and CSV/Print exports
  - CEO Executive Intelligence Desk (`/dashboard/ceo/reports`) with profit margin overlays
  - Finance Treasury Reports Desk (`/dashboard/finance/reports`) with per-study ledger records and specialist payout history
  - Searchable Project Archive Desk (`/dashboard/admin/archive`) with JSON snapshot viewer modal
  - System Activity & Audit Log Desk (`/dashboard/admin/audit`) with filterable timeline of all mutations
- [x] Updated `Sidebar.tsx` activating `System Reports`, `Project Archive`, and `Activity Log` across Admin, Finance, and CEO roles
- [x] Seeded mock initial archived projects and audit logs in `prisma/seed.ts`
- [x] Documented verification report in `docs/modules/17-reporting-verification.md` (0 check-types errors across 5 packages)

### Task 12 — Module 20: High-Speed Database Retrieval Engine & Modern Minimalist UI Overhaul
- [x] Overhauled platform loading indicator (`LoadingState.tsx`) into a clean, modern minimalist single-track arc spinner (Linear / Vercel style) with zero sci-fi HUD slop.
- [x] Audited all role pages and components to eliminate double loading states (e.g. `PendingLeaveQueue.tsx`).
- [x] Implemented in-memory server caching engine via `unstable_cache` with canonical cache tags (`apps/app/src/lib/cache-tags.ts`):
  - `staff-capacity` for specialist workload & directories
  - `attendance-review` for timesheets and missed-punch claims
  - `staff-directory` for corporate signatories and staff members
  - `payroll-data` for batch payroll runs
- [x] Parallelized multi-query data fetching with `Promise.all` across attendance, assignment, and payroll Server Actions.
- [x] Connected instantaneous tag invalidation (`updateTag` & `revalidateTag`) across all mutations for read-your-own-writes consistency.
- [x] Migrated inner operational desks (`admin/assignments`, `finance/attendance`, `finance/payroll`) to async Server Components with server-side prefetching, eliminating initial loading delays entirely.

### Task 13 — Module 21: Production-Grade Hardening & Vercel Deployment Readiness
- [x] Resolved Next.js build compilation failure by removing object export (`PROJECT_DETAIL_SELECT`) from `"use server"` file [actions.ts](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/src/features/projects/actions.ts).
- [x] Declared all 19 platform environment variables in `globalEnv` inside [turbo.json](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/turbo.json), eliminating Turborepo deployment warnings.
- [x] Hardened authentication against production breaches: guarded dev password and offline account fallbacks in [auth.ts](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/src/lib/auth.ts) with `NODE_ENV !== "production"`.
- [x] Added HTTP enterprise security headers (`X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `Referrer-Policy`) to [next.config.js](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/next.config.js).
- [x] Added missing session verification to `POST /api/v1/projects` and hardened cron execution in `/api/v1/crons/storage-purge`.
- [x] Created `app/dashboard/error.tsx`, `app/error.tsx`, and custom `app/not-found.tsx` adhering to design system.
- [x] Built instant real-time WebSocket messaging pipeline (<100ms perceived latency) with client peer broadcast over Phoenix channels, static env inlining, and 0ms receiver state injection.
- [x] Implemented universal workspace RSC preloading across Client/Admin Proposals, DefenseLab, Disputes, Intake, Staff Roster, and Messages threads (0ms spinner delay).
- [x] Added bubble spring entrance pop-in animation (`.animate-message-pop`), analytical cyan pulse (`.animate-message-highlight`), sticky bottom scroll anchoring (`ResizeObserver`), and floating "New message" jump button.
- [x] Documented verification report in `docs/modules/21-production-hardening-verification.md`.

### Task 14 — Global Layout Identity Consolidation & 0ms Instant Duty Clock
- [x] Streamlined global identity architecture across all roles (`CLIENT`, `STATISTICIAN`, `SENIOR_QA_LEAD`, `FINANCE_OFFICER`, `CEO`, `ADMIN`): centralized profile routing, role badges, and session termination in [Topbar.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/app/components/layout/Topbar.tsx).
- [x] Eliminated redundant user identity cards, avatar initials, and duplicate logout buttons from [Sidebar.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/app/components/layout/Sidebar.tsx) footer, reclaiming ~70px of fixed vertical height for navigation links.
- [x] Installed grounded minimal status footer (`● System Operational v2.4.0`) in [Sidebar.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/app/components/layout/Sidebar.tsx).
- [x] Optimized [DutyClockWidget.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/src/features/attendance/components/DutyClockWidget.tsx): implemented Server Component (RSC) pre-loading in [layout.tsx](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/app/dashboard/layout.tsx) to pass `initialActiveShift` directly to the widget, eliminating flash-of-wrong-state and spinner latency on page load.
- [x] Built 0ms optimistic visual transitions for Clock-In and Clock-Out actions with `localStorage` persistence, background server synchronization, and automatic rollback on network failure.
- [x] Upgraded live running duty timer to wall-clock difference math (`Date.now() - clockInMs`), eliminating background tab and OS sleep drift.

---

## Roadmap Status Matrix

| # | Module | Domain | Status |
| :--- | :--- | :--- | :--- |
| `00` | `00-foundation` — Project Foundation & Scaffolding | Infrastructure | ✅ Completed |
| `01` | `01-auth` — Authentication & RBAC | Identity | ✅ Completed |
| `02` | `02-staff` — Expert Provisioning & Management | Identity | ✅ Completed |
| `03` | `03-client-profile` — Client Profile & Account | Identity | ✅ Completed |
| `04` | `04-intake` — Project Intake & Submission | Core Workflow | ✅ Completed |
| `05` | `05-quotation` — Quotation & Pricing | Commercial | ✅ Completed |
| `06` | `06-sow` — SOW Generation & Signing | Legal & Escrow | ✅ Completed |
| `07` | `07-payments` — Payment & Installments | Escrow Vault | ✅ Completed |
| `08` | `08-assignment` — Expert Assignment & Workload | Operations | ✅ Completed |
| `09` | `09-messaging` — Messaging & Communication Firewall | Operations | ✅ Completed |
| `10` | `10-analysis` — Analysis Workbench | Operations | ✅ Completed |
| `11` | `11-qa` — Quality Assurance & Reproducibility | Operations | ✅ Completed |
| `12` | `12-deliverables` — Deliverables, Release & Revisions | Delivery | ✅ Completed |
| `13` | `13-defenselab` — DefenseLab Scheduling & Mock Defense | Add-on | ✅ Completed |
| `14` | `14-finance` — Finance, Payouts & Ledger | Treasury | ✅ Completed |
| `15` | `15-disputes` — Disputes, Refunds & Chargebacks | Treasury | ✅ Completed |
| `16` | `16-notifications` — Email Notifications & Webhooks | Platform | ✅ Completed |
| `17` | `17-reporting` — Reporting, Analytics & Audit Archive | Platform | ✅ Completed |
| `18` | `18-attendance` — Staff Attendance & Duty Governance | HR & Labor | ✅ Completed |
| `19` | `19-payroll` — Corporate Payroll & Payslip Engine | HR & Treasury | ✅ Completed |
| `20` | `20-performance` — High-Speed Caching & Minimalist UI | Architecture | ✅ Completed |
| `21` | `21-production-hardening` — Production Security & Vercel Readiness | Infrastructure | ✅ **Completed** |

