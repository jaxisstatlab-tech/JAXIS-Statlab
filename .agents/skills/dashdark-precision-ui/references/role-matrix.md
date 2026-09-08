# Dashdark Precision UI — Role Implementation Matrix

This guide provides concrete layouts, data points, and component recipes for upgrading all 4 core roles in JAXIS StatLab to the Dashdark X standard.

---

## 1. Client Portal (`/dashboard/client`)

### Role Mandate:
Transparency, milestone tracking, 1-click downloads, clear billing visibility, and zero confusion.

### Bento Tier Mapping:
- **Tier 1 (Greeting & Actions)**:
  - Header: `"Welcome back, [Client Name]"`
  - Description: `"Track research deliverables, review statistical models, and verify milestones."`
  - Actions: `How to Use Guide` (secondary) + `+ Submit New Study` (primary orange).
- **Tier 2 (KPIs)**:
  - Card 1: `ACTIVE STUDIES` (count, bold white numeral)
  - Card 2: `AWAITING SIGNATURE` (count, orange if > 0)
  - Card 3: `AWAITING DEPOSIT` (escrow required, amber if > 0)
  - Card 4: `DELIVERED STUDIES` (completed total, bold white)
- **Tier 3 (2:1 Asymmetric Bento)**:
  - **8-col Hero Card**: 5-Stage Study Pipeline Stepper (`Proposal` $\rightarrow$ `Contract (SOW)` $\rightarrow$ `Deposit` $\rightarrow$ `Analysis` $\rightarrow$ `Deliverables`). Displays current study code, assigned statistician badge, and direct primary CTA (e.g. `"Review & Sign SOW →"` or `"Verify Deposit →"`).
  - **4-col Auxiliary Stack**:
    - Top: `DefenseLab Rehearsal Hours` (Purchased vs remaining gauge with `<Microphone weight="fill" />`).
    - Bottom: `Escrow Security Vault` (`<ShieldCheck weight="fill" />`, 100% deposit protected badge).
- **Tier 4 (Command Ribbon)**:
  - Filter Tabs: `All Studies`, `Under Evaluation`, `In Analysis`, `Delivered`.
  - Search Input: Real-time title/ID filter with `<kbd>/</kbd>` keycap and `Esc` clear.
- **Tier 5 (Lower Bento)**:
  - **4-col Card**: Deliverable Quick Access & SOW Download Vault.
  - **8-col Table**: Studies Ledger (Study ID with `<CopyButton variant="badge" />`, Topic, Assigned Lead, Status Badge, `<Peso />` Amount, Actions).

---

## 2. Lead Statistician Desk (`/dashboard/statistician`)

### Role Mandate:
Focused computational workbench, live shift duty clock, hypothesis tracking, and dataset processing.

### Bento Tier Mapping:
- **Tier 1 (Greeting & Actions)**:
  - Header: `"Statistician Operations Terminal"`
  - Description: `"Run statistical analyses, upload APA 7th deliverables, and track duty hours."`
  - Actions: `Duty Clock Widget` (`Clock In` / `Clock Out` with 0ms optimistic updates) + `+ New Analysis Log`.
- **Tier 2 (KPIs)**:
  - Card 1: `ASSIGNED STUDIES` (active workload count, bold white)
  - Card 2: `HOURS ON DUTY` (wall-clock elapsed total for cycle)
  - Card 3: `PENDING QA REVIEW` (submitted dossiers awaiting QA check)
  - Card 4: `ESTIMATED PAYOUT` (`<Peso />` sum, bold white)
- **Tier 3 (2:1 Asymmetric Bento)**:
  - **8-col Hero Card**: Active Computation Workbench (Current study intake ID, hypothesis summary, dataset download link, R/SPSS output upload zone).
  - **4-col Auxiliary Stack**:
    - Top: `Shift Telemetry Card` (Current shift wall-clock elapsed timer with `● Active Shift` live beacon).
    - Bottom: `QA Verification Rate` (First-pass approval % micro gauge).
- **Tier 4 (Command Ribbon)**:
  - Filter Tabs: `All Active`, `Chapter 4 Analysis`, `Revisions Requested`, `QA Approved`.
  - Search Input: Instant study and client search with `<kbd>/</kbd>`.
- **Tier 5 (Lower Bento)**:
  - **8-col Table**: Assigned Workload Queue (Study ID, Client, Deadline, Stage, Actions).
  - **4-col Card**: Upcoming DefenseLab Rehearsals Schedule.

---

## 3. Senior QA Lead Desk (`/dashboard/qa`)

### Role Mandate:
Methodological rigor, p-value verification, APA 7th formatting audit, escrow release gating.

### Bento Tier Mapping:
- **Tier 1 (Greeting & Actions)**:
  - Header: `"Statistical Quality Assurance Terminal"`
  - Description: `"Certify statistical models, audit methodology, and authorize escrow releases."`
  - Actions: `Audit Guidelines` + `+ New Verification Dossier`.
- **Tier 2 (KPIs)**:
  - Card 1: `QUEUE FOR REVIEW` (pending audits, amber if > 0)
  - Card 2: `STUDIES CERTIFIED` (total approved, bold white)
  - Card 3: `REVISION RATE` (percentage)
  - Card 4: `AVG TURNAROUND` (hours)
- **Tier 3 (2:1 Asymmetric Bento)**:
  - **8-col Hero Card**: Primary QA Inspection Workbench (Methodology verification checklist, p-value audit, APA 7th formatting validation, Release to Client CTA).
  - **4-col Auxiliary Stack**:
    - Top: `Verification Gate Status` (`<ShieldCheck weight="fill" />`, Escrow release gate readiness).
    - Bottom: `Lead Statistician Workload` (Active allocations sparkline).
- **Tier 4 (Command Ribbon)**:
  - Filter Tabs: `Awaiting Audit`, `Under Review`, `Certified`, `Revision Needed`.
  - Search Input: Filter by study code or statistician with `<kbd>/</kbd>`.
- **Tier 5 (Lower Bento)**:
  - **8-col Table**: QA Evaluation Ledger (Study ID, Statistician, Submission Date, Result, Actions).
  - **4-col Card**: Rejection & Revision Notes Feed.

---

## 4. Executive / CEO / Admin Portal (`/dashboard/admin`)

### Role Mandate:
Platform-wide revenue telemetry, active escrow vaulting, staff shift oversight, dispute tribunal.

### Bento Tier Mapping:
- **Tier 1 (Greeting & Actions)**:
  - Header: `"Executive Governance Terminal"`
  - Description: `"High-level platform oversight, financial escrow telemetry, and team operations."`
  - Actions: `Export Financials ↓` + `+ Run Payroll Batch`.
- **Tier 2 (KPIs)**:
  - Card 1: `TOTAL REVENUE` (`<Peso />` gross volume, bold white)
  - Card 2: `ACTIVE ESCROW` (`<Peso />` safely held in escrow vault)
  - Card 3: `ACTIVE RESEARCH STUDIES` (total monorepo count)
  - Card 4: `OPEN DISPUTES` (amber if > 0)
- **Tier 3 (2:1 Asymmetric Bento)**:
  - **8-col Hero Card**: Platform Financial & Intake Velocity Hero Card (Monthly revenue trend, intake velocity, completed deliverables volume).
  - **4-col Auxiliary Stack**:
    - Top: `Specialist Duty Clock Status` (Staff currently on duty count with live ping beacon).
    - Bottom: `Dispute Tribunal Queue` (Open client claims awaiting CEO ruling).
- **Tier 4 (Command Ribbon)**:
  - Filter Tabs: `All Operations`, `Escrow Inflows`, `Staff Payroll`, `Disputes`.
  - Search Input: Unified transaction and study search with `<kbd>/</kbd>`.
- **Tier 5 (Lower Bento)**:
  - **8-col Table**: Institutional Operations Ledger (Transaction Ref, Client, Study ID, Gross, Status, Action).
  - **4-col Card**: Revenue Breakdown Donut (Consultation vs Analysis vs DefenseLab).
