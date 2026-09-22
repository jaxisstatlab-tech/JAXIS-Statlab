# JAXIS — Module 18: Staff Attendance, Duty Tracking & Payroll Adjustments

**Module Code:** `18-attendance`\
**Domain:** People Operations / Duty Governance\
**Depends On:** `01-auth`, `02-staff`, `14-finance`\
**Blocks:** Future Payroll & Compensation Settlement Engine

---

## 1. Module Identity

- **Primary Objective:** Provide automated, tamper-proof duty time tracking (Clock-In / Clock-Out) for internal staff roles (`STATISTICIAN`, `SENIOR_QA_LEAD`, `FINANCE_OFFICER`, `ADMIN`), with a structured self-service **Missed Punch / Attendance Correction** filing system for payroll settlement.
- **Anti-Fraud & Governance Mandate:** Implements strict **Segregation of Duties (SoD)** so that no staff member (including the Finance & HR Officer) can approve their own time adjustments. Includes automated 14-hour runaway shift capping and a comprehensive **CEO Executive Audit Vault**.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `ATT-F01` | **Topbar Duty Tracker & Clock Widget** — Persistent header action widget with Server Component (RSC) pre-loading (0ms first-paint), 0ms optimistic visual transitions on Clock-In / Clock-Out, browser cache fallback, wall-clock precise timer (`Date.now() - clockInMs`), and silent background server synchronization |
| `ATT-F02` | **Tamper-Proof Punch Logging** — Server-side timestamping (immune to client device clock tampering), client IP address capture, and browser user-agent auditing |
| `ATT-F03` | **Runaway Session Auto-Cap (`AUTO_CLOSED`)** — System automatically flags and caps open shifts exceeding 14 hours at the 14-hour boundary to prevent multi-day payroll inflation |
| `ATT-F04` | **Missed Punch / Adjustment Filing** — Staff can file attendance corrections for: (1) Forgot Clock-In, (2) Forgot Clock-Out, (3) Missed Full Shift, or (4) Overtime / Extra Duty Claim |
| `ATT-F05` | **Break & Lunch Deduction Calculation** — Automatic deduction of standard unpaid breaks (e.g. 60 min lunch) from gross elapsed shift duration to compute verified net payable hours |
| `ATT-F06` | **Segregation of Duties (SoD) Approval Matrix** — Strict multi-tier approval routing preventing self-authorizations: Specialists → Finance HR/Admin; Finance → Admin/CEO; Admin → Finance/CEO |
| `ATT-F07` | **HR Attendance Adjustment Queue** — Centralized desk at `/dashboard/finance/attendance` for Finance HR and Administrators to review stated justifications and verify deliverables before crediting |
| `ATT-F08` | **Personal Duty History & Timesheets** — Specialists can view their chronological punch log, break deductions, adjusted shift tags (`isAdjusted`), and approval audit stamps |
| `ATT-F09` | **CEO Executive Payroll Integrity Ledger** — Executive audit desk in `/dashboard/ceo/attendance` showing all raw punches, adjustments, approver IDs, and CEO override authority |
| `ATT-F10` | **Leave & Duty Mutual Exclusion** — Specialists with `ON_LEAVE` status cannot clock in unless leave is concluded or administrative override is granted |
| `ATT-F11` | **Staff HR & People Operations Portal** — Centralized hub at `/dashboard/staff/hr` across all internal roles featuring: (1) Interactive Monthly Duty Calendar with day inspector, (2) Leave balances & request center, (3) Overtime claims tracker, and (4) Itemized Statement of Duty Earnings / Payslip generator |
| `ATT-F12` | **Device & OS Telemetry Intelligence & Mobile Punch Flag** — Automatic classification of desktop workstation vs mobile devices (Windows/macOS/iOS/Android) with amber `Mobile Punch` flags for non-workstation sessions |
| `ATT-F13` | **In-Shift Study Activity Cross-Correlation** — Automated tracking of in-platform analytical events (syntax uploads, verification reports, dataset reviews) with `Zero Study Activity` indicators for full shifts without outputs |
| `ATT-F14` | **CEO Dynamic Labor & Duty Policy Controls** — Executive policy console at `/dashboard/ceo/attendance` (POLICIES tab) allowing the CEO to customize: (1) Weekend work authorization, (2) Philippine Holiday duty authorization, (3) Operating shift hours mode (Flexible 24/7 vs Fixed Core Hours with start/end windows), (4) Meal break automation with customizable duration (30/45/60/90m) and shift threshold (4/5/6/8h), and (5) Base hourly duty wage (₱450.00 / hr) and runaway session auto-cap (10/12/14/16/20h) |

### Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Biometric hardware scanner integration | Web-based digital clock-in with IP verification & device fingerprinting |
| Automated tax withholding & statutory deduction computation | Future institutional payroll extension |
| Direct bank disbursement via automated ACH / PESONet | Handled via Module 14 disbursement workflows |

---

## 3. Database Schema

```prisma
enum AttendanceLogStatus {
  IN_PROGRESS
  COMPLETED
  AUTO_CLOSED
  ADJUSTED
  VOIDED
}

enum AttendanceCorrectionType {
  MISSED_CLOCK_IN
  MISSED_CLOCK_OUT
  MISSED_FULL_SHIFT
  BREAK_ADJUSTMENT
  OVERTIME_CLAIM
}

enum CorrectionRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model AttendancePolicyConfig {
  id                      Int      @id @default(autoincrement())
  allowWeekendWork        Boolean  @default(true)
  allowHolidayWork        Boolean  @default(true)
  operatingHoursMode      String   @default("FLEXIBLE_24_7") // "FLEXIBLE_24_7" | "FIXED_CORE_HOURS"
  coreHoursStart          String   @default("08:00")         // HH:mm format
  coreHoursEnd            String   @default("18:00")         // HH:mm format
  autoDeductMealBreak     Boolean  @default(true)
  mealBreakMinutes        Int      @default(60)
  mealBreakThresholdHours Decimal  @default(5.00) @db.Decimal(4, 2)
  baseHourlyRate          Decimal  @default(450.00) @db.Decimal(10, 2)
  maxShiftCapHours        Int      @default(14)
  updatedAt               DateTime @updatedAt
  updatedBy               String?

  @@map("attendance_policy_configs")
}

model StaffAttendanceLog {
  id              String               @id @default(cuid())
  userId          String
  clockInAt       DateTime             @default(now())
  clockOutAt      DateTime?
  breakMinutes    Int                  @default(0)
  totalMinutes    Int?                 // Net payable minutes = (clockOut - clockIn) - breakMinutes
  status          AttendanceLogStatus  @default(IN_PROGRESS)
  isAdjusted      Boolean              @default(false)
  ipAddress       String?
  userAgent       String?
  notes           String?

  user            User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  corrections     AttendanceCorrectionRequest[]

  @@index([userId])
  @@index([clockInAt])
  @@index([status])
  @@map("staff_attendance_logs")
}

model AttendanceCorrectionRequest {
  id                String                   @id @default(cuid())
  attendanceLogId   String?
  userId            String                   // Requester
  correctionType    AttendanceCorrectionType
  targetDate        DateTime                 @db.Date
  claimedClockIn    DateTime
  claimedClockOut   DateTime
  claimedBreakMins  Int                      @default(60)
  claimedNetHours   Decimal                  @db.Decimal(5, 2)
  reason            String                   // Stated justification
  tasksDelivered    String?                  // Project IDs or deliverables accomplished
  status            CorrectionRequestStatus  @default(PENDING)
  reviewedBy        String?                  // Approver userId
  reviewedAt        DateTime?
  reviewNotes       String?
  createdAt         DateTime                 @default(now())
  updatedAt         DateTime                 @updatedAt

  attendanceLog     StaffAttendanceLog?      @relation(fields: [attendanceLogId], references: [id])
  user              User                     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
  @@index([targetDate])
  @@map("attendance_correction_requests")
}
```

---

## 4. Segregation of Duties (SoD) Anti-Cheating Protocol

| Requester Role | Authorized Approvers | Anti-Fraud Rationale |
| :--- | :--- | :--- |
| **Statistician** (`STATISTICIAN`) | **Finance & HR Officer**, **Administrator**, **CEO** | Supervisor verifies computational runs and deliverables before crediting hours. |
| **Senior QA Lead** (`SENIOR_QA_LEAD`) | **Finance & HR Officer**, **Administrator**, **CEO** | Peer review and verification milestones verified before crediting hours. |
| **Finance & HR Officer** (`FINANCE_OFFICER`) | **Administrator**, **CEO** | **Strictly prohibits self-approval** for payroll hours. |
| **Administrator** (`ADMIN`) | **Finance & HR Officer**, **CEO** | Cross-department operational balance between Admin and HR/Finance. |
| **CEO / Owner** (`CEO`) | Full Audit & Override Authority | Absolute platform oversight and tamper-proof ledger access. |

---

## 5. API Routes & Server Actions

| Method | Server Action | Role | Description |
|---|---|---|---|
| `POST` | `clockIn` | STATISTICIAN, QA_LEAD, FINANCE_OFFICER, ADMIN, CEO | Clock in on active duty; enforces weekend/holiday/operating hour policies, captures server timestamp, client IP, and device user-agent |
| `POST` | `clockOut` | STATISTICIAN, QA_LEAD, FINANCE_OFFICER, ADMIN, CEO | Conclude duty session; calculates dynamic meal deductions and computes verified net hours |
| `GET` | `getActiveShift` | Any internal staff | Fetch current open shift status, elapsed timer, and auto-cap check |
| `GET` | `getMyAttendanceHistory` | Any internal staff | Fetch paginated personal timesheet and adjustment status |
| `POST` | `fileAttendanceCorrection` | Any internal staff | File missed punch / time adjustment request |
| `GET` | `getAttendanceReviewDeskData` | FINANCE_OFFICER, ADMIN, CEO | View pending adjustment queue with SoD filters |
| `POST` | `reviewAttendanceCorrection` | FINANCE_OFFICER, ADMIN, CEO | Authorize or reject adjustment (enforces SoD: requester != approver) |
| `GET` | `getCeoAttendanceAuditVault` | CEO, ADMIN | Executive raw telemetry audit ledger + active policy configurations |
| `GET` | `getCompanyAttendancePolicy` | Any internal staff | Retrieve active corporate labor & duty policy |
| `POST` | `updateCompanyAttendancePolicy` | CEO | Executive update of weekend/holiday toggles, shift hours, meal breaks, and hourly rates |
| `GET` | `getMyHrPortalData` | Any internal staff | Comprehensive HR Hub data (Monthly calendar, leave balances, overtime log, itemized payslip) |

---

## 6. Page Views

| Page | Route | Role | Description |
|---|---|---|---|
| Topbar Duty Widget | Topbar header component | Internal Staff | Live active shift indicator, timer, and modal clock punch trigger |
| My Timesheets & Attendance | `/dashboard/staff/attendance` | Internal Staff | Personal shift ledger, adjustment filing modal, and claimed status |
| Staff HR & People Operations Portal | `/dashboard/staff/hr` | Internal Staff | Centralized hub with interactive monthly duty calendar, leave requests, overtime claims, and itemized payslips |
| HR Attendance Review Desk | `/dashboard/finance/attendance` | Finance & HR Officer, Admin | Queue of pending missed punch submissions with deliverable verification |
| CEO Institutional Ledger & Policy Controls | `/dashboard/ceo/attendance` | CEO | Dual-tab executive desk with raw punch telemetry ledger and dynamic corporate labor policy controls |

---

## 7. Acceptance Criteria (Done Checklist)

### Clock-In / Clock-Out Operations
- [x] Internal staff roles (`STATISTICIAN`, `SENIOR_QA_LEAD`, `FINANCE_OFFICER`, `ADMIN`, `CEO`) can clock in and clock out from the topbar
- [x] Clients cannot clock in (restricted to internal operations)
- [x] Server timestamp is strictly used (immune to client device clock tampering)
- [x] Client IP address, device telemetry, and mobile punch detection are logged for auditability
- [x] Open shifts exceeding max shift cap (default 14h) are automatically flagged as `AUTO_CLOSED`
- [x] Dynamic weekend and holiday restrictions are enforced according to CEO corporate policy
- [x] Fixed core operating hours window restrictions are enforced when enabled

### Missed Punch & Adjustment Filing
- [x] Staff can submit adjustment requests with date, claimed time in/out, break deduction, and justification
- [x] System automatically calculates net claimed hours
- [x] Segregation of Duties (SoD) strictly blocks users from approving their own adjustments
- [x] Finance Officer adjustments must be approved by Admin or CEO
- [x] Admin adjustments must be approved by Finance Officer or CEO
- [x] Approved adjustments update the attendance log and flag `isAdjusted = true`

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 warnings/errors
- [x] `npm run build` → clean
