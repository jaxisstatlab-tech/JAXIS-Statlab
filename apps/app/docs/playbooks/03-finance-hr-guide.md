# JAXIS Playbook — 03: Finance & HR Operations Guide
**Target Audience:** Finance Officers, Treasury Staff, HR Administrators  
**Topic:** Payment Clearances, Semi-Monthly Payroll Runs, and Treasury Disbursements

---

## 1. Daily Financial Operations

The Finance desk is responsible for the cash flow and treasury operations of JAXIS StatLab:
- **Client Deposits**: Verifying downpayment and final milestone payment proofs.
- **Specialist Settlements**: Calculating semi-monthly earnings and executing disbursements.
- **Attendance & Leave Governance**: Reviewing specialist attendance records, overtime claims, and leave applications.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FINANCE & HR DAILY WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

  1. VERIFY CLIENT PROOFS      2. RUN PAYROLL CYCLE        3. DISBURSE VIA 1-CLICK
 ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
 │ Inspect GCash/Bank    │   │ Select 1st or 2nd     │   │ Copy specialist's     │
 │ reference photos &    │──►│ half-month cycle;     │──►│ mobile/account number │
 │ release escrow locks  │   │ system auto-calculates│   │ and record reference  │
 └───────────────────────┘   └───────────────────────┘   └───────────────────────┘
```

---

## 2. Verifying Client Downpayments & Milestone Proofs

1. Navigate to `/dashboard/finance` (the "Waiting for a check" card links to the queue).
2. Open the payment ("Check this payment"). The client typed the reference number; a screenshot is there only if they added one.
3. Find the payment in the JAXIS GCash or bank history:
   - Reference number (e.g. `90218844102`).
   - Exact amount, and a time close to what the client said.
   - Bank to our GCash: the reference can differ, so match the amount, time and sender name.
4. Tick **"I found this payment in the JAXIS account and it matches"**, then click **"Confirm Payment"**. The study moves on and the analyst can start. If you can't find it, click **"Not Found"** and pick a reason; the client sees it.

**Our payment accounts** (where clients send money) are on Finance Overview → Payment accounts → Edit: GCash and bank accounts, the registered name, an optional QR code, and a "Shown to clients" switch. Every change is recorded in the activity log.

---

## 3. Executing the Semi-Monthly Payroll Run (15th & 30th)

### Step 1: Select Pay Period Cut-Off
1. Navigate to `/dashboard/finance/payroll`.
2. Use the top dropdown to pick the current cycle:
   - **First Half (Days 1–15)**: Covers clocked hours (hourly staff only) and studies delivered between the 1st and 15th.
   - **Second Half (Days 16–End)**: Covers the 16th to the end of the month.
   - **Full Calendar Month**: For monthly consolidated audits.
3. Click **"Generate Payslips"**.

### Step 2: System Automatic Calculation
The payroll engine automatically executes the following formula for every active specialist:

$$\text{Gross Pay} = \text{Salary for the period} + (\text{Clocked Hours} \times \text{Hourly Rate}) + \text{Study Pay} + \text{Allowance}$$

Clocked hours count only for staff on Hourly Wage. A study counts once it's delivered in the period, paid in full, and has no open claim or refund, and it's paid only once.

$$\text{Net Take-Home} = \text{Gross Pay} - \text{Mandatory & Custom Deductions}$$

### Step 3: 1-Click Payout Disbursement
1. In the **Employee Payslip Ledger & Disbursement Queue**, locate the specialist.
2. Click **"Disburse →"** to open the Treasury Settlement modal.
3. The modal automatically displays the specialist's registered payment channel (**GCash**, **Maya**, or **Philippine Bank**):
   - Click the **Copy** button next to their account number (e.g., `0917-555-0192`).
   - An instant toast notification confirms the number is copied to your clipboard.
4. Open the corporate GCash/Bank app, paste the number, and complete the transfer.
5. Paste the transaction reference number (e.g., `BDO-TXN-884102`) into the modal and click **"Confirm & Record Disbursement"**.
6. The payslip status updates to `DISBURSED`, and an official statement is instantly available in the employee's portal.
