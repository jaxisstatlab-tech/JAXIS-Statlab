# 03 — Simple Lead Statistician Guide (For Data Analysts)

Welcome to the team! As a Lead Statistician at JAXIS StatLab, your mission is to take messy raw survey data, run clean and accurate statistical formulas, format beautiful Chapter 4 tables, and help students understand what their thesis results mean.

---

## 1. Your Daily Routine (ASCII Flowchart)

```
STEP 1: CLOCK IN (ONLY IF YOU'RE PAID BY THE HOUR)
┌─────────────────────────────────────────────────────────┐
│ • Click "Clock In" in the sidebar                       │
│ • Paid per study or salary? You don't need to clock in  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
STEP 2: OPEN YOUR MODELING WORKBENCH
┌─────────────────────────────────────────────────────────┐
│ • Go to /dashboard/statistician/workbench               │
│ • Click on your assigned study to download raw files    │
│ • Read the student's research questions carefully       │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
STEP 3: CLEAN DATA & RUN THE FORMULAS
┌─────────────────────────────────────────────────────────┐
│ • Fix typos and missing answers in the Excel file       │
│ • Run the formulas in R, SPSS, or Stata                 │
│ • Save your code script (.R or .sps)                    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
STEP 4: FORMAT NEAT APA 7TH TABLES & WRITE FINDINGS
┌─────────────────────────────────────────────────────────┐
│ • Format clean Word tables (zero vertical lines!)       │
│ • Write clear explanations of the numbers               │
│ • Answer every research question stated in the contract │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
STEP 5: SUBMIT TO SENIOR QA REVIEW
┌─────────────────────────────────────────────────────────┐
│ • Upload the finished Word report + Clean Excel + Code  │
│ • Click "Submit for Senior QA Review"                   │
│ • QA checks the math; once approved, you earn your fee! │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Step-by-Step Screen Guide

### Step 1: Clocking In (only if you're paid by the hour)

Only staff paid by the hour (Hourly Wage) use the time clock. If you're paid per study or a salary, the button reads **"Clock in not needed"** and is greyed out: your hours don't change your pay, and My HR has no timesheets. Skip to Step 2.

If you are paid by the hour, before starting your work:
1. Find the clock in the sidebar (on phones, in the top bar).
2. Click **"Clock In"**:
   ```
   [ ⏰ Clock In ] ➔ Shows active timer: [ 🟢 Duty: 01h 24m ]
   ```
3. When taking a meal break, click **"Start Break"**.
4. When ending your shift, click **"Clock Out"**.
5. **Why this matters:** your clocked hours times your hourly rate are your pay for the period.

---

### Step 2: Opening Your Assigned Studies (`Workbench`)

1. Click **"Statistician Workbench"** in the sidebar.
2. You will see your active studies:
   ```
   ┌─────────────────────────────────────────────────────────────────────┐
   │ 📘 JAXIS-5622: Predictors of Patient Readmission                    │
   │ Target: Sep 10, 2026 • Client: Ana Cruz • Package: Multiple Regress │
   │ [Download Raw Data (.xlsx)]  [Download Survey Tool]                 │
   │ [ 💬 Chat with Client ]                     [ Open Modeling Desk → ]│
   └─────────────────────────────────────────────────────────────────────┘
   ```
3. Download the raw Excel data file and the survey questionnaire.
4. Read the contract scope: see exactly which questions you need to answer.

---

### Step 3: Cleaning Data & Running Formulas

1. Open the raw data in Excel, R, or SPSS.
2. **Data Cleaning Checklist:**
   - Are there missing numbers? Treat them properly (e.g. mean imputation if agreed in scope).
   - Are there reverse-worded questions in the survey? (For example: *"I feel hopeless at work"* must be reversed if measuring job satisfaction!).
   - Check if the numbers follow a normal bell curve.
3. Run the statistical tests (Regression, Correlation, ANOVA, etc.) using your script.
4. **Important Rule:** Always save your script file (`.R` or `.sps`). Our Senior QA Lead will re-run your script from scratch to verify the math!

---

### Step 4: Formatting APA 7th Tables & Writing the Summary

1. Create a clean Microsoft Word (`.docx`) file.
2. Format tables strictly following university APA 7th standards:
   - **Horizontal lines only:** Top border, header bottom border, table bottom border. Never use vertical dividing lines!
   - **Italic statistical letters:** Letters like *$M$, $SD$, $t$, $F$, $p$, $r$, $\beta$* must always be italicized.
   - **p-values:** Write the exact number (e.g., *$p = .018$*, not *$p < .05$*).
3. Write a clear explanation for the student:
   - State whether the hypothesis is supported or not.
   - Explain what the number means in simple words that the student can proudly explain to their panel.

---

### Step 5: Chatting with the Client (`Messages`)

1. If you are not sure what a column in the student's survey means:
   - Click **"Message Client"**.
   - Type a friendly question (e.g., *"Hi Ana! For Question 14, did you code 1 as Strongly Agree or Strongly Disagree?"*).
2. **Anti-Leak Policy:** Never share your personal cell number, personal Facebook, or private GCash. All messages must stay inside JAXIS. This protects you and ensures you get paid for all your hard work.

---

### Step 6: Submitting to Senior QA Review

Once your report is complete:
1. In your workbench, upload 3 files:
   - Formatted Word Report (`.docx`)
   - Cleaned Master Excel File (`.xlsx`)
   - Math Script (`.R` or `.sps`)
2. Click **"Submit for Senior QA Review"**.
3. If the QA reviewer finds a small typo, they will send it back with friendly notes. Fix it quickly and re-submit!
4. Once QA stamps **"Approved"**, your study commission (standard 60% of the study fee) is added to your account ledger!

---

## 3. Golden Rules of Scientific Integrity

1. **Zero Faking (No p-Hacking):** Never alter formulas or delete respondents just to force a statistically significant result ($p < .05$). Honest science is the pride of JAXIS.
2. **100% Reproducibility:** Anyone on our team should be able to press "Run" on your script and get the exact same numbers.
3. **Be Kind to Students:** Thesis students are often stressed. Write clear, patient explanations that build their confidence!
