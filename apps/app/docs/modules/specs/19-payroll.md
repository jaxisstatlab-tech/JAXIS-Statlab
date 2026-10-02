# JAXIS — Module 19: Corporate Payroll Policies, Specialist Compensation & Multi-Channel Settlement Engine

**Module Code:** `19-payroll`\
**Domain:** People Operations / Treasury Settlement\
**Depends On:** `01-auth`, `02-staff`, `08-assignment`, `09-messaging`, `14-finance`, `18-attendance`\
**Status:** ✅ Production-Ready

---

## 1. Module Identity & Dual Mandate

Module 19 implements institutional compensation governance, dual-mandate separation of powers, and end-to-end multi-channel salary settlement across all internal platform staff (`STATISTICIAN`, `SENIOR_QA_LEAD`, `FINANCE_OFFICER`, `ADMIN`, `CEO`).

### Dual-Mandate Architecture:
1. **CEO Executive Authority (Policy & Rates)**:
   - Sets institutional compensation models (`FIXED_SALARY`, `PERCENTAGE_PER_STUDY`, `HOURLY_DUTY`, `HYBRID`) and company-wide baseline figures.
   - Configures corporate settlement cadence: **Semi-Monthly (Every 15 Days)** vs **Monthly (Full Calendar Month)** vs **Bi-Weekly (Every 14 Days)**.
   - Configures cut-off boundaries (e.g. Day 15 and Month-End) with automated 50% retainer and allowance proration.
   - Manages bespoke senior specialist overrides for tailored retention contracts without distorting global role rates.
2. **Finance Treasury Authority (Batch Calculation & Disbursements)**:
   - Runs deterministic batch payroll cycles dynamically pulling verified data from Module 18 (Attendance Hours) and Module 08/09 (Delivered Research Studies).
   - Audits itemized compensation statements and releases payments directly to the employee's preferred e-wallet or bank account with reference proof tracking.
3. **Specialist Self-Service Payouts & Historical Ledger (`/dashboard/staff/hr`)**:
   - Employees configure their verified settlement destinations (GCash, Maya, Philippine Commercial Banks, or Cash Window).
   - Live Treasury Verification card displays real-time synchronization with Finance and CEO desks.
   - Interactive Historical Cycle selector and full chronological Statement Ledger with printable document vouchers.

> **Storage and pay rules (2026-10-02).** Payslips are stored in the `payslips` table (one per person per period, `payslipNumber` unique), payout details in `staff_payout_details`, and payroll settings in `app_settings` under `payroll_config`. The `dev_data` files are read only until the first save, and are the store only in offline mode. A payslip counts real clock-ins, and studies the person was assigned to that were delivered in the period, paid in full against the accepted price, and have no open claim or refund. Each study is paid once. Admin and finance get no study pay. Approved or paid payslips are never recalculated. `getPayslipById` and `getStaffPayoutDetails` return data only to the owner or to `FINANCE_OFFICER`, `CEO` and `ADMIN`.

> **Time clock rule (2026-10-02, `ae31f9e`).** Only people paid by the hour (`HOURLY_DUTY`, "Hourly Wage") use the time clock. For them, payslips count clocked hours at their own rate, and each shift longer than 8.5 hours adds 1.5 overtime hours at 1.25x that rate (no fallback rate). For everyone else (`TIER_DELIVERABLE` "Per Study", `FIXED_SALARY` "Monthly Salary", `HYBRID` "Salary + Per Study", `PERCENTAGE_PER_STUDY`) hours never change pay: `hourlyDutyEarnings` and `overtimeEarnings` are 0 even if they have shifts on record. The person's own pay setting is checked first, then their role's. See §6. Where this document says hybrid pay includes an hourly duty rate, that no longer applies.

---

## 2. Module Scope & Feature Registry

| Feature ID | Feature Description |
|---|---|
| `PAY-F01` | **CEO Role Compensation Policy Matrix** — Executive rate matrix desk at `/dashboard/ceo/payroll` allowing the CEO to define active compensation models (`FIXED_SALARY`, `PERCENTAGE_PER_STUDY`, `HOURLY_DUTY`, `HYBRID`) and baseline rates by employee role with auto-generated dynamic card notes, 0ms optimistic UI synchronization, and operational role per-study commission calculation. |
| `PAY-F02` | **Corporate Settlement Cadence & Semi-Monthly Controls** — Company-wide settlement frequency configuration: Semi-Monthly (Days 1–15 and Days 16–End) with automatic 50% base salary and allowance division. |
| `PAY-F03` | **Individual Specialist Bespoke Overrides** — Directory of internal specialists allowing the CEO to tailor bespoke retention terms (custom study %, base salary, or duty rates) with 1-click revert to role default. |
| `PAY-F04` | **Finance Batch Payroll & Calculation Engine** — Dynamic batch calculation engine at `/dashboard/finance/payroll` calculating gross earnings, verified duty wages, deliverable study commissions, allowances, withholding taxes, and net take-home pay. |
| `PAY-F05` | **Multi-Period & Cycle Selector** — Interactive period switcher supporting `First Half (Days 1–15)`, `Second Half (Days 16–End)`, and `Full Calendar Month` across CEO, Finance, and Staff desks. |
| `PAY-F06` | **Specialist Self-Service Payout Account Configuration** — 6th navigation tab in Staff HR portal (`/dashboard/staff/hr`) allowing employees to register and manage their verified **GCash**, **Maya**, **Philippine Bank Transfer** (BDO, BPI, Metrobank, UnionBank, RCBC, Landbank, Security Bank, GoTyme, Maya Bank, CIMB Bank), or **Cash Window** accounts with KYC name verification. |
| `PAY-F07` | **Live Treasury Verification Preview Card** — Real-time card inside Staff HR portal showing how Finance Officers and CEO see the employee's payout destination, with 1-click clipboard copying. |
| `PAY-F08` | **Finance Disbursement Modal with Auto-Routing** — Prominent staff registered payout banner in `/dashboard/finance/payroll`, auto-populating channel selection and providing 1-click copy for rapid treasury disbursement. |
| `PAY-F09` | **Official Payslip Statement Modal (`PayslipStatementModal`)** — High-precision voucher with document stamping (e.g. `JAX-PS-202608-001`), line-by-line itemized study commission tables, attendance subtotals, payout destination particulars, and treasury audit signature blocks. |
| `PAY-F10` | **Staff Historical Payslips Ledger** — Chronological historical ledger in `/dashboard/staff/hr` allowing specialists to audit and print past duty statements across all historical cut-offs. |
| `PAY-F11` | **CEO Override Modal Payout Reflection** — Displays the specialist's active registered settlement badge when configuring bespoke contract terms. |
| `PAY-F12` | **Standardized KPI Telemetry Integration** — All payroll overview metrics utilize the canonical `@repo/ui` `<KpiCard />` with uppercase mono headers, bold mono values, and unit suffixes. |
| `PAY-F13` | **Real-Time Settlement Account Number Formatter** — Dynamic formatting and digit capping for e-wallets (`09XX-XXX-XXXX`, max 11 digits) and Philippine bank accounts (`XXXX-XXXX-XXXX`, max 16 digits) with live digit counter and validation hints. |
| `PAY-F14` | **Real-Time Payroll Event Notification Triggers** — Instantaneous in-app alerts on schedule changes, rate updates, bespoke overrides, batch generation, and disbursements across Finance, CEO, and staff. |
| `PAY-F15` | **Package Tier Rates & Dual QA Split Governance** — Tier-specific deliverable compensation amounts (`BASIC`, `STANDARD`, `PREMIUM`, `ENTERPRISE`) and configurable Statistician vs Senior QA Lead commission splits. |

---

## 3. Data Architecture & Schemas

### Compensation Models & Payout Types (`src/features/payroll/schemas.ts`):

```typescript
export const CompensationTypeEnum = z.enum([
  "FIXED_SALARY",
  "PERCENTAGE_PER_STUDY",
  "HOURLY_DUTY",
  "HYBRID",
]);

export const PayrollFrequencyEnum = z.enum([
  "SEMI_MONTHLY",
  "MONTHLY",
  "BI_WEEKLY",
]);

export const PayoutChannelEnum = z.enum([
  "GCASH",
  "MAYA",
  "BANK_TRANSFER",
  "CASH",
]);

export const StaffPayoutDetailsSchema = z.object({
  userId: z.string(),
  payoutChannel: PayoutChannelEnum,
  accountNumber: z.string().min(3, "Account or mobile number is required."),
  accountName: z.string().min(2, "Account holder name is required."),
  bankName: z.string().optional(),
  notes: z.string().optional(),
  updatedAt: z.string().optional(),
});
```

### Official Payslip Data Transfer Object (`StaffPayslipDTO`):

```typescript
export interface StaffPayslipDTO {
  id: string;
  payslipNumber: string;
  userId: string;
  staffName: string;
  staffEmail: string;
  staffRole: RoleName;
  payPeriodMonth: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  cutOffCycle?: "FIRST_HALF" | "SECOND_HALF" | "FULL_MONTH";
  compensationType: CompensationType;
  baseSalary: number;
  verifiedDutyHours: number;
  hourlyRate: number;
  hourlyDutyEarnings: number;
  completedStudiesCount: number;
  completedStudiesGrossValue: number;
  commissionPercentage: number;
  commissionEarnings: number;
  itemizedStudies: Array<{
    projectId: string;
    intakeId: string;
    researchTitle: string;
    grossAmount: number;
    commissionPercentage: number;
    commissionEarned: number;
    status: string;
  }>;
  overtimeHours: number;
  overtimeEarnings: number;
  allowances: number;
  grossEarnings: number;
  withholdingTax: number;
  otherDeductions: number;
  netPay: number;
  status: "DRAFT" | "APPROVED" | "DISBURSED";
  disbursementMethod?: string;
  disbursementReference?: string;
  payoutDetails?: StaffPayoutDetailsDTO | null;
  disbursedAt?: string;
  disbursedBy?: string;
  disbursedByName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Server Action Architecture

| Action | Roles Permitted | Description |
|---|---|---|
| `getPayrollConfigurations()` | `CEO`, `FINANCE_OFFICER`, `ADMIN` | Retrieves company-wide compensation policies, specialist overrides, settlement frequency, and internal staff directory with active payout details. |
| `saveRoleCompensationConfig(input)` | `CEO` | Sets institutional compensation parameters (monthly salary, commission %, duty rate, allowances) for a specific role. |
| `saveStaffCompensationOverride(input)` | `CEO` | Applies bespoke contract compensation terms to an individual specialist. |
| `revertStaffCompensationOverride(userId)` | `CEO` | Removes bespoke override and restores specialist to standard role defaults. |
| `saveCorporateSchedulePolicy(input)` | `CEO` | Updates company-wide settlement cadence (Semi-Monthly, Monthly, Bi-Weekly) and cut-off boundary days. |
| `generateBatchPayslips(input)` | `FINANCE_OFFICER`, `CEO`, `ADMIN` | Deterministic batch generator computing all active staff payslips for the selected cycle. |
| `getCompanyPayslips(filters)` | `FINANCE_OFFICER`, `CEO`, `ADMIN` | Fetches corporate payslip ledger with KPI aggregates, status filters, and payout metadata. |
| `disbursePayslip(input)` | `FINANCE_OFFICER`, `CEO`, `ADMIN` | Records multi-channel disbursement with proof reference number and audit timestamp. |
| `approvePayslip(payslipId)` | `FINANCE_OFFICER`, `CEO`, `ADMIN` | Marks draft payslip as approved for treasury disbursement. |
| `getMyOfficialPayslip(period)` | `All Internal Staff` | Retrieves logged-in employee's official statement, itemized deliverables, and historical statements. |
| `getMyPayoutDetails()` | `All Internal Staff` | Retrieves logged-in employee's preferred settlement channel and account information. |
| `updateMyPayoutDetails(input)` | `All Internal Staff` | Validates and persists employee's preferred GCash, Maya, Bank Transfer, or Cash settlement details. |

---

## 5. UI / UX Design Standards

1. **Dark Precision Terminal Aesthetic**:
   - Master canvas `#010114` with solid `#01142B` / `#011B38` substrates.
   - Precision `rounded-[2px]` on all buttons, cards, modals, and input fields.
   - Zero glowing blurry box-shadows; crisp `border-white/10` borders.
2. **Typography Hierarchy**:
   - `font-mono` strictly for IDs (`JAX-PS-202608-001`), numeric currencies (`₱34,468.70`), duty hours, and tags.
   - `font-sans` for all readable descriptions, labels, and research titles.
   - Zero double slashes (`//`) anywhere in copy or loading states.
3. **Tabler Icons Exclusively**:
   - `IconBuildingBank` for Payout & Banking methods.
   - `IconDeviceMobile` for GCash.
   - `IconWallet` for Maya.
   - `IconCoins` for Cash Window.
   - Zero emojis across all views.
4. **Toast Notification Protocol**:
   - Standard toasts for settlement savings, batch payroll generation, 1-click clipboard copying, and treasury disbursements.

---

## 6. Time clock and pay models (2026-10-02)

Shared helpers in `src/features/payroll/schemas.ts`:

- `usesTimeClock(payModel)`: true only for `HOURLY_DUTY`.
- `PAY_MODEL_OPTIONS`: the four choices shown in Payroll Settings, each with a one-line meaning: Per Study ("A share of each delivered study. No clock-in."), Monthly Salary, Hourly Wage ("Uses the time clock."), Salary + Per Study.
- `payModelSummary(config)`: one plain sentence of what someone on a setting gets, for example "₱200 for each clocked-in hour, plus a ₱1,000 monthly allowance." Used on the role cards, the role editor and the "own pay" window, and saved as the role's note.

`getTimeClockAccess()` (payroll actions) returns `{ enabled, payModel, reason }` for the signed-in person. It reads their own pay setting first, then their role's (cached with the payroll settings, tag `CACHE_TAGS.PAYROLL`). `reason` is a plain sentence shown to them, for example "You're paid per study, so you don't need to clock in. Hours don't change your pay."

Where it is used:

| Place | When the clock isn't used |
|---|---|
| `clockIn`, `fileAttendanceCorrection` (attendance actions) | Refused with `TIME_CLOCK_NOT_USED` and the reason |
| `getActiveShift` | Returns `timeClock` so the sidebar clock knows |
| Sidebar and phone-header clock (`DutyClockWidget`) | Greyed "Clock in not needed"; tapping shows the reason. Someone already clocked in can still clock out |
| My HR (`/dashboard/staff/hr`) | Title "My HR", a short note, no Timesheets or Overtime tabs, no "File Overtime / Correction", no hours cards on the payslip; opens on Payslips |
| `/dashboard/staff/attendance` | Redirects to My HR |
| Staff Timesheets (`/dashboard/ceo/attendance`) | Lists only the people who do use the clock |
| `generateBatchPayslips` | No hours, hourly pay or overtime |

## 7. Payroll Settings page (`/dashboard/ceo/payroll`, 2026-10-02, `ebd4822`)

Rebuilt in the calm dashboard style (neutral colours, one orange action, Phosphor fill icons, plain words):

- **Top:** pay period picker and "Make Payslips"; four cards: Payroll, Paid out, Hours paid (hourly staff only), Studies paid.
- **Pay by role:** the pay schedule (twice or once a month, the day the first half ends, pay within N working days, split salaries in half) and one card per role (Analysts, Reviewers, Finance, Admins) with the pay model, "Uses the time clock" or "No clock-in", the rate, the `payModelSummary` sentence and who changed it when. Edit opens the fields for that model with a live "They get:" line. For Per Study the rate shown is "Package rate" (the rates are on Money & Pay Rates, `/dashboard/ceo/finance`).
- **Pay per person:** each person's pay and whether it comes from their role or their own setting. "Set Own Pay" (or "Edit") opens `SpecialistOverrideModal` ("{name}'s own pay"): pay model, amounts, the "They get:" line, an optional reason, and "Use Their Role's Pay", which asks for a second click (no browser confirm).
- **Payslips:** number with copy, period, hours, studies, take-home, status (Needs approval / Approved, not paid yet / Paid), Approve and View.

The old "Package Tier Key Rules" box showed fixed percentages instead of the saved rates and was removed.
