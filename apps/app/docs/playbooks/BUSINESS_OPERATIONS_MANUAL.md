# JAXIS StatLab — Enterprise Business Operations Manual
**Version:** 1.0 (Executive Non-Technical Edition)  
**Target Audience:** Company Founders, Executives, Operations Managers, Staff Specialists, and Non-Technical Stakeholders.

---

## 1. Executive Summary & The JAXIS Model

JAXIS StatLab is a digital consultation operating system built specifically for an enterprise statistical research, methodology auditing, and academic data consulting firm.

Instead of relying on fragmented emails, scattered spreadsheets, unverified timecards, and manual bank wires, JAXIS connects every part of the consulting lifecycle into a unified, secure platform:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          THE COMPLETE JAXIS LIFECYCLE                       │
└─────────────────────────────────────────────────────────────────────────────┘

  1. CLIENT INTAKE           2. CONTRACT & ESCROW       3. ANALYSIS WORKBENCH
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │ Researcher/     │       │ Formal Scope    │       │ Assigned Lead   │
 │ Student submits │ ────► │ of Work (SOW)   │ ────► │ Statistician    │
 │ data & problem  │       │ signed; 50%     │       │ runs SPSS/R &   │
 │ statement       │       │ escrow deposited│       │ builds models   │
 └─────────────────┘       └─────────────────┘       └─────────────────┘
                                                              │
                                                              ▼
  6. PAYDAY DISBURSEMENT     5. DELIVERY & SIGNOFF      4. QUALITY ASSURANCE
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │ Finance clicks  │       │ Client reviews, │       │ Senior QA Lead  │
 │ once to pay     │ ◄──── │ releases final  │ ◄──── │ audits formulas │
 │ staff GCash/Bank│       │ 50%, downloads  │       │ & verifies APA  │
 │ on 15th/30th    │       │ final report    │       │ compliance      │
 └─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 2. Who Does What: Role-by-Role Responsibilities

The system divides authority into 6 distinct roles so that no single person can manipulate data or bypass financial controls:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             ORGANIZATIONAL ROLES                            │
└─────────────────────────────────────────────────────────────────────────────┘

  [ CLIENT ]            [ ADMIN ]            [ STATISTICIAN ]
  • Submits Study       • Triages Submissions• Clocks in via Topbar
  • Deposits Escrow     • Assigns Experts    • Executes Data Analysis
  • Signs SOW Contract  • Provisions Users   • Uploads Deliverables
  • Downloads Reports   • System Settings    • Configures Payout Details

  [ SENIOR QA LEAD ]    [ FINANCE & HR ]     [ CEO / EXECUTIVE ]
  • Audits Math/Syntax  • Verifies Payments  • Sets Pay Rates & Models
  • Enforces APA 7th    • Runs Payroll Runs  • Approves Bespoke Deals
  • Rejects/Approves    • Disburses Salaries • Audits Attendance & Fraud
  • Signs Clearance     • Approves Leaves    • Full Ledger Governance
```

---

## 3. How the Features Connect (The "Wiring" Explained)

### A. The Client & Financial Pipeline
1. **Intake to Quotation**: A client submits a research project at `/dashboard/client/submit`. Admin reviews the dataset and generates a pricing quotation based on complexity (e.g. Simple Regression vs Structural Equation Modeling).
2. **Escrow Vault Security**: The client deposits a 50% downpayment via GCash or Bank Wire. The money is locked in the **JAXIS Escrow Vault**. Work does not begin until Finance verifies the payment proof.
3. **Delivery & Final Balance**: When the analysis passes QA, the client pays the remaining 50% to unlock and download their official deliverable files.

### B. The Specialist Attendance & Labor Pipeline
1. **1-Click Live Timeclock**: All staff members have an integrated live clock-in widget in the topbar. It tracks shifts with server timestamps and device telemetry.
2. **Anti-Runaway Safety**: If an employee forgets to clock out, the system automatically caps the shift at 14 hours (`AUTO_CLOSED`) and prompts them to file a missed punch correction.
3. **Shift Deductions**: Meal breaks (e.g., 60 minutes for shifts over 5 hours) are deducted automatically to calculate **Net Payable Duty Hours**.

### C. The Executive Compensation & Payroll Pipeline
1. **CEO Policy Matrix**: The CEO sets company-wide compensation models for each role:
   - **Fixed Base Retainer** (e.g. ₱35,000/mo)
   - **Commission Only** (e.g. 50% per completed research study)
   - **Hourly Duty** (e.g. ₱250/hr for lab shifts)
   - **Hybrid Structure** (Base Salary + 10% Study Commission + Hourly Duty)
2. **Semi-Monthly Settlement (Every 15 Days)**:
   - **1st Cut-Off**: Days 1 to 15 (50% base salary + first-half duty hours + first-half study completions).
   - **2nd Cut-Off**: Days 16 to End of Month (Remaining 50% base + second-half hours + second-half studies).
3. **Specialist Self-Service Payout Accounts**:
   - Specialists register their preferred payout channel in their HR portal: **GCash**, **Maya**, **Philippine Bank Wire (BDO, BPI, etc.)**, or **Cash Window**.
   - Input fields dynamically format numbers (e.g., `0917-123-4567` for e-wallets, `1092-8821-4401` for banks) and prevent typos with real-time digit validation.
4. **1-Click Treasury Disbursement**:
   - When Finance opens the Disburse modal on payday, the system auto-selects the employee's preferred method and provides a **1-Click Copy** button with instant clipboard feedback.
   - Once marked disbursed, an official itemized Payslip Statement voucher with a tamper-proof reference code is generated for the employee.

---

## 4. Segregation of Duties (Anti-Fraud Protections)

To prevent financial loss or fraud, the system enforces strict rules:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SEGREGATION OF DUTIES (SOD) RULES                     │
└─────────────────────────────────────────────────────────────────────────────┘

  Rule 1: ZERO SELF-APPROVALS
  ────────
  Finance Officers cannot approve their own overtime, attendance corrections,
  or leave requests. These must be reviewed by Operations Manager or the CEO.

  Rule 2: DUAL-MANDATE PAYROLL
  ────────
  The CEO defines compensation models and rates. Finance executes the batch
  calculations and disburses payments. Neither can unilaterally override both.

  Rule 3: ESCROW DELIVERY LOCK
  ────────
  Final deliverable files cannot be released to clients until Finance has verified
  that the 100% total contract balance has cleared into the bank.

  Rule 4: QA CLEARANCE GATE
  ────────
  Statisticians cannot deliver work directly to clients. Every file must pass
  a formal inspection by a Senior QA Lead.
```

---

## 5. Day-to-Day Operations Playbook Quick Reference

For detailed role walkthroughs and visual workflows, refer to the individual guides:
- [01. How the Business Works](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/docs/playbook/01-how-the-business-works.md)
- [02. CEO Executive Guide](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/docs/playbook/02-ceo-guide.md)
- [03. Finance & HR Operations Guide](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/docs/playbook/03-finance-hr-guide.md)
- [04. Specialist & Statistician Guide](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/docs/playbook/04-specialist-statistician-guide.md)
- [05. Client Journey Guide](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/apps/app/docs/playbook/05-client-journey-guide.md)
