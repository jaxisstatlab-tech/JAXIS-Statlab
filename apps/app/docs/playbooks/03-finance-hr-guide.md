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

1. Navigate to `/dashboard/finance`.
2. Open the **Deposit Verification Queue**.
3. Compare the client's uploaded screenshot with corporate bank transactions:
   - Check Reference Number (e.g. `GCash Ref: 90218844102`).
   - Check Exact Amount Received.
4. Click **"Verify & Clear Escrow"** $\rightarrow$ The study status changes to `IN_PROGRESS`, unlocking the analysis workbench for the assigned statistician.

---

## 3. Executing the Semi-Monthly Payroll Run (15th & 30th)

### Step 1: Select Pay Period Cut-Off
1. Navigate to `/dashboard/finance/payroll`.
2. Use the top dropdown to pick the current cycle:
   - **First Half (Days 1–15)**: Covers all duty hours and study completions between the 1st and 15th of the month.
   - **Second Half (Days 16–End)**: Covers all duty hours and completions from the 16th to the end of the month.
   - **Full Calendar Month**: For monthly consolidated audits.
3. Click **"Run Selected Cycle"**.

### Step 2: System Automatic Calculation
The payroll engine automatically executes the following formula for every active specialist:

$$\text{Gross Pay} = \text{Pro-Rated Base Retainer} + (\text{Verified Duty Hours} \times \text{Hourly Rate}) + \text{Study Commissions} + \text{Bonuses}$$

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
