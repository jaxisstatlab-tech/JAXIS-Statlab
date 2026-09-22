# JAXIS Playbook — 04: Specialist & Statistician Guide
**Target Audience:** Lead Statisticians, Data Analysts, Biostatisticians, Senior QA Leads  
**Topic:** Daily Timeclock, Analysis Workbench, Payout Accounts, and Monthly Payslips

---

## 1. Daily Specialist Routine

As a JAXIS research specialist, your day consists of three core activities:
1. **Clocking in** for your analysis shifts.
2. **Executing statistical consultations** and uploading APA deliverables.
3. **Managing your HR profile** and reviewing your semi-monthly compensation vouchers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SPECIALIST DAILY WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

  1. CLOCK IN VIA TOPBAR       2. ANALYSIS WORKBENCH       3. REGISTER PAYOUT INFO
 ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
 │ Click [▷ Clock In] in │   │ Run SPSS/R models,    │   │ Add your GCash, Maya, │
 │ top navigation when   │──►│ write APA 7th text, & │──►│ or Bank Account in    │
 │ starting lab shift    │   │ submit to Senior QA   │   │ the Staff HR Portal   │
 └───────────────────────┘   └───────────────────────┘   └───────────────────────┘
```

---

## 2. Using the Topbar Live Timeclock

- **Starting Work**: Click the green **`▷ Clock In`** button located at the top-right corner of any dashboard page.
- **Live Elapsed Indicator**: While clocked in, the button pulses with an active timer (e.g., `● 03:42:15`) displaying your continuous shift duration.
- **Ending Work**: Click **`■ Clock Out`** when concluding your session. The system records your total hours, auto-deducts lunch breaks, and credits your payable duty ledger.
- **Shift Limit Safeguard**: Shifts automatically cap at 14 hours. If you accidentally forget to clock out, file a Missed Punch Correction in **Staff HR Portal $\rightarrow$ Attendance Corrections**.

---

## 3. The Analysis & QA Review Workbench

1. Navigate to `/dashboard/studies` and open your assigned research study.
2. Review the client's dataset, research questions, and deadline.
3. Conduct data cleaning, statistical modeling, hypothesis testing, and effect size calculations.
4. Prepare your deliverable package:
   - **Summary Report**: APA 7th formatted narrative with interpretation of $p$-values, effect sizes, and model summaries.
   - **Syntax Scripts**: Fully commented `.R` or `.sps` syntax for 100% reproducibility.
5. Click **"Submit to Senior QA"** $\rightarrow$ The QA Lead verifies your formulas before sending the draft to the client.

---

## 4. Registering Your GCash or Bank Payout Details

To receive semi-monthly salary and commission disbursements:
1. Navigate to `/dashboard/staff/hr` and click **Tab 4: Payout & Settlement Methods**.
2. Select your payment channel:
   - **GCash** or **Maya** (e-Wallets)
   - **Philippine Commercial Bank** (BDO, BPI, Metrobank, UnionBank, Security Bank, etc.)
   - **Corporate Cash Window**
3. Enter your account name and number:
   - The input automatically formats your number as you type (e.g. `0917-123-4567` or `1092-8821-4401`).
   - A live digit indicator verifies that you have entered the exact required digits (11 digits for GCash/Maya).
4. Click **"Save Settlement Channel"**.

---

## 5. Viewing Past Payslips & Official Compensation Statements

1. Navigate to `/dashboard/staff/hr` and click **Tab 5: Monthly Payslips & Earnings**.
2. Review your total YTD net earnings, compensated hours, and completed research deliverables.
3. In the **Historical Payslips Ledger**, locate any pay cycle and click **"View Statement"** to inspect your official, itemized salary voucher breakdown.
