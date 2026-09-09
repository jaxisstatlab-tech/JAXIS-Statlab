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
