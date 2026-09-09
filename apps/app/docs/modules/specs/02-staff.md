# JAXIS — Module 02: Expert Provisioning & Staff Management

**Module Code:** `02-staff`\
**Domain:** Identity / Governance\
**Depends On:** `01-auth`\
**Blocks:** `08-assignment` (cannot assign staff that don't exist)

---

## 1. Module Identity

- **Primary Objective:** Admin can provision and manage Statistician, Senior QA Lead, and Finance Officer accounts. Each staff member maintains a professional profile with specializations. Admin can suspend; CEO can permanently terminate. Active projects are flagged for reassignment on suspension/termination.
- **Core Responsibilities:** Staff account provisioning, `StaffProfile` with specializations, suspension lifecycle, `SuspensionLog` audit, expert roster views.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `STF-F01` | **Admin staff provisioning** — Admin creates Statistician, QA Lead, Finance Officer accounts via form (not self-registration) |
| `STF-F02` | **Staff profile with specializations** — `StaffProfile` record: bio, specialization tags, joined date |
| `STF-F03` | **Specialization taxonomy** — Predefined list: Regression, ANOVA, SEM, Factor Analysis, Time Series, Instrument Validation, Descriptive Statistics, Mixed Methods |
| `STF-F04` | **Staff roster view** — Admin sees all staff with role, status badge, specialization tags, active project count |
| `STF-F05` | **Staff profile detail** — Admin views full profile: suspension history, active assignments, violation log |
| `STF-F06` | **Profile self-edit** — Statistician/QA Lead can edit own bio and specializations |
| `STF-F07` | **Temporary suspension** — Admin suspends staff; reason required; `SuspensionLog` entry created |
| `STF-F08` | **Permanent termination** — CEO only; logs violation type; account status → `TERMINATED` |
| `STF-F09` | **Reassignment flag on suspension/termination** — Active assignments flagged `REASSIGNMENT_NEEDED`; Admin notified |
| `STF-F10` | **Violation classification** — Serious violations result in payout forfeiture flag |
| `STF-F11` | **Payout forfeiture on serious violations** — Pending payouts voided when violation = serious |
| `STF-F12` | **Suspension lift** — Admin can lift a suspension; SuspensionLog `lifted_at` set |
| `STF-F13` | **Specialist leave submission** — Statistician / QA Lead submits structured leave request with reason dropdown, justification paragraph, and date window (`LEAVE_PENDING`) |
| `STF-F14` | **HR leave authorization & roster** — Finance & HR Officer (`FINANCE_OFFICER`) or Admin reviews submissions and authorizes leave (`ON_LEAVE`), excluding specialist from new Module 08 assignments |
| `STF-F16` | **Staff HR & People Operations Portal** — Centralized self-service portal at `/dashboard/staff/hr` across all internal roles (`STATISTICIAN`, `SENIOR_QA_LEAD`, `FINANCE_OFFICER`, `ADMIN`, `CEO`) featuring interactive shift calendar, leave center, overtime adjustments, and monthly duty payslips |
| `STF-F17` | **Self-Service Settlement & Banking Methods (Tab 6)** — Internal staff members can configure and manage their preferred Philippine settlement destination (GCash, Maya, Philippine Banks, or Cash Window) with Live Treasury Verification preview and 1-click clipboard copy |
| `STF-F18` | **Historical Payslips Ledger & Past Cycle Inspection** — Full chronological duty earnings ledger allowing staff to browse, audit, and print official statements across historical cut-off periods |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Staff self-registration | Admin-provisioned only. Staff cannot self-register. |
| Password reset email | Module 16 (Notifications). Deferred. |
| Performance reviews / KPI scorecards | Future/out-of-MVP. |
| Daily clock-in / clock-out & payroll adjustments | Module 18 (`18-attendance`). |
| Assigning staff to projects | Module 08 (`08-assignment`). |



---

## 3. Database Schema

```prisma
enum UserStatus {
  ACTIVE
  SUSPENDED
  TERMINATED
  LEAVE_PENDING
  ON_LEAVE
}

model User {
  id          String     @id @default(cuid())
  email       String     @unique
  fullName    String
  status      UserStatus @default(ACTIVE)
  leaveReason String?
  leaveFrom   DateTime?
  leaveUntil  DateTime?
  // ... auth & profile relations
}

model StaffProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  bio             String?
  specializations String[] // e.g. ["Regression", "ANOVA", "SEM"]
  joinedAt        DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("staff_profiles")
}

enum ViolationType {
  ETHICAL_BREACH
  DIRECT_PAYMENT_BYPASS
  DATA_FALSIFICATION
  GHOSTWRITING
  POLICY_VIOLATION
}

model SuspensionLog {
  id           String         @id @default(cuid())
  userId       String
  action       SuspensionAction
  reason       String
  violationType ViolationType?
  performedBy  String         // Admin or CEO userId
  performedAt  DateTime       @default(now())
  liftedAt     DateTime?
  liftedBy     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([performedAt])
  @@map("suspension_logs")
}

enum SuspensionAction {
  SUSPENDED
  SUSPENSION_LIFTED
  TERMINATED
}
```

### Relationships

| Relationship | Type | Notes |
|---|---|---|
| `User` → `StaffProfile` | One-to-One | Only exists for STATISTICIAN, SENIOR_QA_LEAD, FINANCE_OFFICER roles |
| `User` → `SuspensionLog` | One-to-Many | Full audit history per user |

---

## 4. API Routes & Server Actions

| Method | Route / Server Action | Role | Description |
|---|---|---|---|
| `POST` | `provisionStaffAccount` | ADMIN, CEO | Provision new staff account |
| `GET` | `getStaffList` | ADMIN, CEO | List all staff (filter by role, status) |
| `GET` | `getStaffDetail` | ADMIN, CEO | Staff profile detail + suspension history |
| `PATCH` | `updateStaffProfile` | ADMIN, CEO | Update staff specializations/bio |
| `PATCH` | `suspendStaff` | ADMIN, CEO | Suspend with reason |
| `PATCH` | `liftStaffSuspension` | ADMIN, CEO | Lift active suspension |
| `PATCH` | `terminateStaff` | CEO only | Permanent termination + violation type |
| `POST` | `requestLeave` | STATISTICIAN, QA_LEAD, ADMIN, FINANCE_OFFICER | Submit structured leave request with date constraints |
| `POST` | `approveLeave` | FINANCE_OFFICER, ADMIN, CEO | Acknowledge & authorize leave (`LEAVE_PENDING` → `ON_LEAVE`) |
| `POST` | `rejectLeave` | FINANCE_OFFICER, ADMIN, CEO | Decline leave request (restores `ACTIVE`) |
| `POST` | `returnFromLeave` | Self, FINANCE_OFFICER, ADMIN, CEO | Conclude leave early and restore to `ACTIVE` duty pool |
| `GET` | `getSpecialistLeaveOverview` | FINANCE_OFFICER, ADMIN, CEO | Specialist capacity overview, pending queue & leave roster |

### Zod Schemas

```ts
export const ProvisionStaffSchema = z.object({
  fullName:        z.string().min(2).max(100),
  email:           z.string().email(),
  role:            z.enum(['STATISTICIAN', 'SENIOR_QA_LEAD', 'FINANCE_OFFICER']),
  specializations: z.array(z.string()).optional(),
});

export const SuspendStaffSchema = z.object({
  reason:        z.string().min(10).max(500),
  violationType: z.nativeEnum(ViolationType).optional(),
});

export const TerminateStaffSchema = z.object({
  reason:        z.string().min(10).max(500),
  violationType: z.nativeEnum(ViolationType),
  forfeitPayouts: z.boolean(),
});

export const SpecialistLeaveRequestSchema = z.object({
  reason:    z.string().min(3).max(500),
  leaveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date"),
  leaveUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid return date"),
});
```

---

## 5. Business Rules

| Rule | Enforcement |
|---|---|
| Staff cannot self-register — Admin creates accounts | `provisionStaffAccount` requires ADMIN/CEO role |
| Only CEO can permanently terminate | `requireRole('CEO')` on terminate action |
| Termination requires a violation type | `TerminateStaffSchema` enforces `violationType` required |
| Serious violations → payout forfeiture flag set | `forfeitPayouts: true` triggers payout voiding in DB |
| Active assignments flagged on suspension/termination | Project assignments flagged `REASSIGNMENT_NEEDED` |
| Leave submissions require 2-step HR approval | Specialist submission sets `LEAVE_PENDING`; Finance Officer (HR) / Admin authorization transitions to `ON_LEAVE` |
| Calendar anti-overlap & past date guardrails | Start date cannot be in the past; return date cannot precede start date; specialists with active/pending leaves cannot submit overlapping requests |
| On-leave specialists excluded from assignment creation | Module 08 capacity pool marks `ON_LEAVE` staff as greyed-out and rejects assignment attempts |

---

## 6. Page Views

| Page | Route | Role | Description |
|---|---|---|---|
| Staff Roster | `/dashboard/admin/staff` | Admin, CEO | Table: name, role badge, status, specializations, active projects, actions |
| Staff Detail | `/dashboard/admin/staff/:id` | Admin, CEO | Profile card, specializations, suspension history, assignments |
| Specialist Leave Approvals | `/dashboard/finance/leaves` | Finance & HR Officer, Admin | Live queue: pending submissions, justification review, 1-click approvals, leave roster |
| Statistician Workbench | `/dashboard/statistician` | Statistician | Self-service leave request modal with reason presets & calendar pickers |
| QA Workbench | `/dashboard/qa` | Senior QA Lead | Self-service leave request modal with rich justification templates |
| Own Profile | `/dashboard/statistician/profile` | Statistician | Bio edit, specialization tag editor |
| Own Profile | `/dashboard/qa/profile` | Senior QA Lead | Bio edit, specialization tags |

---

## 7. Seed Data Requirements

```ts
const seedStaffProfiles = [
  {
    email: 'stat@jaxis.dev',
    specializations: ['Regression', 'ANOVA', 'SEM', 'Factor Analysis'],
    bio: 'Senior statistician specializing in quantitative research methods.',
  },
  {
    email: 'qa@jaxis.dev',
    specializations: ['Instrument Validation', 'Descriptive Statistics'],
    bio: 'QA Lead with expertise in research instrument validation.',
  },
  {
    email: 'finance@jaxis.dev',
    specializations: [],
    bio: 'Finance & HR Officer managing JAXIS escrow vault, payout disbursements, and specialist leave governance.',
  },
];
```

### 🎯 Expected Output (What you should be able to do now)

- [x] **Admin Staff Provisioning:** Admin can provision internal staff accounts (`STATISTICIAN`, `SENIOR_QA_LEAD`, `FINANCE_OFFICER`, `CEO`) with name, email, role, and temporary password at `/dashboard/admin/staff`.
- [x] **Staff Roster Workbench:** Admin can view the staff roster directory with role badges, status indicators, specializations, and active project counters.
- [x] **Specialization Taxonomy:** Staff profiles support standardized specialization tags.
- [x] **Formal Leave Management:** Specialists submit structured leave requests (`LEAVE_PENDING`); Finance Officer (HR) and Admin authorize leave (`ON_LEAVE`).
- [x] **Dedicated HR Leave Desk:** Finance Officer reviews pending queues, audits reasons, and manages specialist return dates at `/dashboard/finance/leaves`.
- [x] **Calendar Anti-Overlap Protection:** Past dates and inverted date ranges are strictly blocked across all leave pickers.
- [x] **Staff Suspension & Audit:** Admin can temporarily suspend staff with mandatory reason logging in `SuspensionLog`.
- [x] **CEO Account Termination:** CEO can permanently terminate staff accounts, auto-flagging active projects for `REASSIGNMENT_NEEDED`.

---

## 8. Acceptance Criteria (Done Checklist)

### Provisioning & Profiles
- [x] Admin can provision a Statistician account with email + role + specializations
- [x] Duplicate email returns 409 `EMAIL_TAKEN`
- [x] Statistician cannot self-register at `/register`
- [x] `StaffProfile` created on provisioning for all staff roles
- [x] Statistician / QA Lead can edit own bio and specializations

### Leave Management (HR & Specialist Governance)
- [x] Specialists can submit leave requests with reason dropdown and justification paragraph
- [x] Leave start date rejects past dates (`from < today`)
- [x] Expected return date rejects inverted ranges (`until < from`)
- [x] Finance Officer (HR) and Admin can approve or decline leave submissions
- [x] Approved specialists transition to `ON_LEAVE` and are visually greyed out in Module 08 assignment pickers
- [x] Specialist or HR can click "End Leave & Restore Duty" to return to active pool

### Suspension & Termination
- [x] Admin can suspend with reason → account status `SUSPENDED` → login blocked
- [x] Admin can lift suspension → status `ACTIVE` → `SuspensionLog.liftedAt` set
- [x] CEO can terminate with violation type → status `TERMINATED` → login permanently blocked
- [x] Active assignments flagged `REASSIGNMENT_NEEDED` on suspension/termination
- [x] Serious violation + `forfeitPayouts: true` → pending payout records voided

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 warnings/errors
- [x] `npm run build` → clean

