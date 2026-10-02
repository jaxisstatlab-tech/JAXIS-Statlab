# JAXIS — Module 14: Finance, Payouts & Ledger

**Module Code:** `14-finance`\
**Domain:** Finance & Payout\
**Depends On:** `12-deliverables`, `13-defenselab`\
**Blocks:** `15-disputes`

---

## 1. Module Identity

- **Primary Objective:** Finance & HR Officer (`FINANCE_OFFICER`) exercises a dual operational mandate: (1) managing institutional treasury, escrow release gates, and expert milestone disbursements under `RULE_PAY_01`, and (2) serving as Human Resources governance lead, reviewing specialist leave submissions and managing staff duty records.
- **Core Responsibilities:** `FinancialLedger`, `Payout`, `PayoutRateConfig` models; payout eligibility enforcement; disbursement workflow; revenue & margin ledger; specialist leave authorization desk (`/dashboard/finance/leaves`); anti-fraud segregation-of-duties compliance.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `FIN-F01` | **Revenue ledger** — Per-project financial record: gross revenue, platform fee, Expert share, net margin |
| `FIN-F02` | **Payout rate config** — Seeded rate table by package; Finance can update rates |
| `FIN-F03` | **Payout calculation** — Compute Statistician and QA Lead payout from approved rate for package |
| `FIN-F04` | **Payout eligibility check (RULE_PAY_01)** — Project must be DELIVERED or ARCHIVED, FULLY_PAID, no active dispute, no pending refund |
| `FIN-F05` | **Payout disbursement** — Finance Officer marks payout as disbursed after sending via GCash/bank |
| `FIN-F06` | **Payout voiding on reassignment** — If Expert was reassigned, original payout voided before new payout computed |
| `FIN-F07` | **Chargeback payout hold** — Active chargeback/dispute → payout stays `PENDING` until resolved |
| `FIN-F08` | **JAXIS system error protection** — Payouts not voided if reassignment was caused by a JAXIS/platform error |
| `FIN-F09` | **Statistician payout history** — Statistician views own payout history (amount, rate, project, status) |
| `FIN-F10` | **Finance disbursement queue** — Finance sees all `PENDING`/`APPROVED` payouts awaiting disbursement |
| `FIN-F11` | **CEO financial overview** — Full ledger + payout override authority |
| `FIN-F12` | **DefenseLab revenue** — DefenseLab session revenue recorded at 80% payout rate to Expert |
| `FIN-F13` | **Specialist leave governance desk** — Dedicated HR console at `/dashboard/finance/leaves` for reviewing absence justifications and authorizing leave windows |
| `FIN-F14` | **Segregation of duties (SoD) anti-fraud protocol** — Finance Officer is strictly prohibited from approving their own leaves or attendance adjustments; approvals for Finance must be conducted by Admin or CEO |
| `FIN-F15` | **CEO executive oversight & audit vault** — Tamper-proof audit trail for all adjustments and disbursements with CEO override clearance |
| `FIN-F16` | **CEO Role Compensation Policy Matrix** — Executive desk at `/dashboard/ceo/payroll` to configure compensation structures by role (`FIXED_SALARY`, `PERCENTAGE_PER_STUDY`, `HOURLY_DUTY`, `HYBRID`) and rates |
| `FIN-F17` | **Specialist Bespoke Compensation Overrides** — Ability for the CEO to define custom terms for individual senior specialists without altering default role rates |
| `FIN-F18` | **Corporate Settlement Cadence & Semi-Monthly Controls** — Company-wide settlement frequency configuration: Semi-Monthly (Days 1–15 and Days 16–End) with automatic 50% base salary and allowance division |
| `FIN-F19` | **Finance Batch Payroll & Calculation Engine** — Dynamic payroll execution at `/dashboard/finance/payroll` calculating base pay, study percentage commissions, duty wages, overtime, and allowances |
| `FIN-F20` | **Staff Registered Payout Routing & 1-Click Copy** — Finance disbursement modal displays employee's registered GCash, Maya, or Bank Transfer particulars with 1-click clipboard copy and auto-selected disbursement channel |
| `FIN-F21` | **Official JAXIS Payslip Statement** — Itemized statement modal with deliverable breakdowns, verified duty hours, registered settlement account details, and withholding tax |
| `FIN-F22` | **Multi-Channel Payout Disbursement** — Finance records GCash, Maya, Bank Transfer, or Cash references with audit stamps |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Automated direct banking gateway API | Manual disbursement with Finance recording verified transaction reference |
| Multi-currency | PHP only |
| Partial refund processing | Module 15; full refunds only per policy |



---

## 3. Database Schema

```prisma
model PayoutRateConfig {
  id          Int         @id @default(autoincrement())
  packageName String      @unique // PackageName enum value as string
  ratePercent Decimal     @db.Decimal(5, 2) // e.g., 62.50 for 62.5%
  effectiveFrom DateTime  @default(now())
  approvedBy  String?     // Admin/CEO userId

  @@map("payout_rate_configs")
}

enum PayoutStatus {
  NOT_ELIGIBLE
  PENDING
  APPROVED
  DISBURSED
  VOIDED
}

enum PayoutRole {
  STATISTICIAN
  QA_LEAD
}

model Payout {
  id                String      @id @default(cuid())
  projectId         String
  recipientId       String      // Expert userId
  recipientRole     PayoutRole
  grossProjectAmount Decimal    @db.Decimal(10, 2)
  payoutRateApplied Decimal     @db.Decimal(5, 2)
  payoutAmount      Decimal     @db.Decimal(10, 2)
  payoutStatus      PayoutStatus @default(NOT_ELIGIBLE)
  voidReason        String?
  disbursedAt       DateTime?
  disbursedBy       String?     // Finance Officer userId
  approvedBy        String?     // Finance/CEO userId
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  project   Project @relation(fields: [projectId], references: [id])
  recipient User    @relation(fields: [recipientId], references: [id])

  @@index([projectId])
  @@index([recipientId])
  @@index([payoutStatus])
  @@map("payouts")
}

model FinancialLedger {
  id              String   @id @default(cuid())
  projectId       String   @unique
  grossRevenue    Decimal  @db.Decimal(10, 2)
  platformFee     Decimal  @db.Decimal(10, 2) // JAXIS margin
  statisticianShare Decimal @db.Decimal(10, 2)
  qaLeadShare     Decimal  @db.Decimal(10, 2)
  netMargin       Decimal  @db.Decimal(10, 2)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id])

  @@map("financial_ledgers")
}
```

---

## 4. Payout Rate Reference (Seeded)

| Package | Rate Range | Seeded Rate |
|---|---|---|
| JX_01_DATACHECK | 40–50% | 45% |
| JX_02_START | 40–50% | 47% |
| JX_03_CORE | 60–65% | 62% |
| JX_04_ADVANCED | 70–75% | 72% |
| DEFENSELAB (add-on) | 80% | 80% |

> QA Lead payout: 10% of the Statistician payout (MVP flat rate — adjustable via config).

> **Since 2026-10-02 (`62413e6`):** the rates in use are the ones saved on Money & Pay Rates, stored in `payout_rate_configs` (analyst %, reviewer % `qaRatePercent`, `mode` share or flat, flat amounts; empty = package default) and read through `getPackagePayoutRules` / `resolvePackagePayoutRule`. Every change is written to the audit log with old and new values. The table above is only the starting point.

---

## 5. RULE_PAY_01 Enforcement

```ts
// src/lib/payout-rules.ts
export async function assertPayoutEligible(projectId: string): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      payments: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!['DELIVERED', 'CLOSED', 'ARCHIVED'].includes(project?.masterStatus ?? '')) {
    throw new ApiError('PAYOUT_NOT_ELIGIBLE', 'Project must be delivered or archived before payout.', 403);
  }
  if (project?.payments[0]?.paymentStatus !== 'FULLY_PAID') {
    throw new ApiError('PAYOUT_NOT_ELIGIBLE', 'Project balance must be fully paid before payout.', 403);
  }
  if (project?.hasActiveDispute) {
    throw new ApiError('PAYOUT_NOT_ELIGIBLE', 'Payout is on hold due to an active dispute.', 403);
  }
  if (project?.hasPendingRefund) {
    throw new ApiError('PAYOUT_NOT_ELIGIBLE', 'Payout is on hold due to a pending refund.', 403);
  }
}
```

---

## 6. API Routes

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/finance/ledger` | FINANCE_OFFICER, ADMIN, CEO | Full ledger with date/package filters |
| `POST` | `/api/v1/finance/payouts/calculate` | FINANCE_OFFICER, ADMIN, CEO | Compute payout for a project |
| `PATCH` | `/api/v1/finance/payouts/:id/approve` | FINANCE_OFFICER, CEO | Approve payout for disbursement |
| `PATCH` | `/api/v1/finance/payouts/:id/disburse` | FINANCE_OFFICER | Mark payout disbursed (RULE_PAY_01 enforced) |
| `PATCH` | `/api/v1/finance/payouts/:id/void` | ADMIN, CEO | Void payout with reason |
| `GET` | `/api/v1/finance/payouts` | FINANCE_OFFICER, ADMIN, CEO | All payouts with filter by status |
| `GET` | `/api/v1/statistician/payouts` | STATISTICIAN | Own payout history |
| `POST` | `saveRoleCompensationConfig` | CEO | Executive configuration of pay structures and role rates |
| `POST` | `saveStaffCompensationOverride` | CEO | Specialist-specific bespoke compensation terms |
| `POST` | `generateBatchPayslips` | FINANCE_OFFICER, CEO | Dynamic payroll batch generator for active cut-off cycle |
| `POST` | `disbursePayslip` | FINANCE_OFFICER, CEO | Treasury disbursement logging GCash/Bank reference numbers |
| `GET` | `getMyOfficialPayslip` | Internal Staff | Fetches official payslip statement for Staff HR portal |

---

## 7. Page Views

| Page | Route | Role | Description |
|---|---|---|---|
| Finance Overview | `/dashboard/finance` | Finance & HR Officer, CEO | Money collected and owed, payments waiting for a check, staff pay sent, our payment accounts, client payments table (see §10) |
| Specialist Leave Approvals | `/dashboard/finance/leaves` | Finance & HR Officer, Admin | Review leave requests, inspect justification paragraphs, approve/decline leave windows |
| Deposit Verification Queue | `/dashboard/finance/payments` | Finance & HR Officer, Admin | Queue of pending client GCash / Bank Transfer payment proofs |
| Staff Payroll & Payslips Desk | `/dashboard/finance/payroll` | Finance & HR Officer | Run monthly payroll cycles, audit itemized payslip statements, and record disbursements |
| Payroll Settings | `/dashboard/ceo/payroll` | CEO | Pay by role, pay per person, pay schedule and payslips (see `19-payroll.md` §7) |
| Disbursement Queue | `/dashboard/finance/payouts` | Finance & HR Officer, CEO | Pending/Approved payouts with disburse action and eligibility status |
| Ledger | `/dashboard/finance/ledger` | Finance & HR Officer, CEO | Full ledger table with margin breakdown per project |
| Money & Pay Rates | `/dashboard/ceo/finance` | CEO | Revenue, profit, paid to staff, and pay rates and profit by package (edit rates; prices & packages) |
| Statistician Payouts | `/dashboard/statistician/payouts` | Statistician | Own payout history: project, amount, rate, status |

---

## 8. Seed Data Requirements

```ts
const seedPayoutRates = [
  { packageName: 'JX_01_DATACHECK', ratePercent: 45.00 },
  { packageName: 'JX_02_START',     ratePercent: 47.00 },
  { packageName: 'JX_03_CORE',      ratePercent: 62.00 },
  { packageName: 'JX_04_ADVANCED',  ratePercent: 72.00 },
  { packageName: 'DEFENSELAB',      ratePercent: 80.00 },
];

const seedPayout = {
  projectIntakeId: 'JAXIS-202608-0001',
  recipientEmail:  'stat@jaxis.dev',
  recipientRole:   'STATISTICIAN',
  grossProjectAmount: 2800.00,
  payoutRateApplied: 62.00,
  payoutAmount:    1736.00, // 2800 × 0.62
  payoutStatus:    'PENDING',
};
```

---

### 🎯 Expected Output (What you should be able to do now)

- [x] **Financial Revenue Ledger:** Finance Officer and CEO can view itemized gross revenue, platform margin, and expert earnings across all projects.
- [x] **Automated Payout Computation:** System applies seeded payout rate configuration by package tier (`JX-01`, `JX-02`, `JX-03`, `JX-04`, `DefenseLab`).
- [x] **Disbursement Eligibility Gate (RULE_PAY_01):** Payouts are strictly locked until project status is `DELIVERED`/`CLOSED`, `paymentStatus === FULLY_PAID`, and zero active disputes exist.
- [x] **Finance Disbursement Workflow:** Finance Officer logs disbursement reference (GCash/bank ref) and marks payout `DISBURSED`.
- [x] **Expert Earnings & History:** Statisticians and QA Leads can view their individual verified earnings, pending balances, and payout history.


## 9. Acceptance Criteria (Done Checklist)

### Payout Calculation
- [x] Payout computed correctly: `grossRevenue × ratePercent` for Statistician, `grossRevenue × qaRatePercent` for QA Lead
- [x] QA Lead payout rate is customizable per package (replaces legacy hardcoded 10% rule) with live breakdown in `/dashboard/ceo/finance`
- [x] Payout rates pulled from package configuration (`DEFAULT_PAYOUT_RATES` & `DEFAULT_QA_PAYOUT_RATES`, with CEO override storage)
- [x] `FinancialLedger` record created on project delivery with correct margin breakdown

### Disbursement (RULE_PAY_01)
- [x] Project not DELIVERED/CLOSED → 403 `PAYOUT_NOT_ELIGIBLE`
- [x] Project not FULLY_PAID → 403 `PAYOUT_NOT_ELIGIBLE`
- [x] Active dispute → 403 `PAYOUT_NOT_ELIGIBLE`
- [x] All 4 conditions met → Finance can approve and disburse
- [x] `disbursedAt` and `disbursedBy` set on disbursement

### Voiding
- [x] Expert reassignment → original payout voided with reason `REASSIGNMENT`
- [x] `VOIDED` payout cannot be reinstated

### Ledger
- [x] Finance ledger shows all projects with revenue, margin, payout amounts
- [x] Date range filter works
- [x] CEO ledger view shows all data + override button placeholder

### Statistician View
- [x] Statistician sees own payouts only (not other Experts)
- [x] Admin cannot see Statistician-only payout view as Statistician

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 warnings/errors
- [x] `npm run build` → clean

---

## 10. Finance Overview (2026-10-02, `90e7d1d`)

`/dashboard/finance` (finance officers, and the CEO from "Finance & Payments") shows real numbers only:

- **Cards:** Collected this month (change from last month and a 6-month chart), Still owed, Waiting for a check (total of payments to check, with a link), Paid to staff this month.
- **Money in and out:** checked client payments vs staff pay sent, per month.
- **Payment accounts:** exactly what clients see, Shown/Hidden, and Edit (see `07-payments.md` §10).
- **How clients paid:** checked payments by GCash and bank.
- **Leave requests** and the **Client payments** table (filters Waiting for deposit / Deposit paid / Paid in full / Paid too much; copy ID; paid-of-price bar; left to pay; status; Open; a stacked list on phones).

Removed: the made-up cashflow chart, the fixed "Net inflow: Positive" badge, and a payment-channel split that was the study count times fixed percentages.

`getFinanceReceivablesSummary` no longer counts a study without an accepted price as ₱4,650, skips stopped studies' balances, reads sample files only in offline mode, and returns an error when the database doesn't answer instead of showing sample figures. `FinanceOverviewData` gained optional `months`, `collectedByMonth`, `paidOutByMonth`, `byMethod` and `pendingProofAmount`.
