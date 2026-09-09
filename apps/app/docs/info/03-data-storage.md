# JAXIS StatLab — Master Data Storage Reference

**Document Version:** 1.0  
**Domain:** Infrastructure, Persistence & Data Architecture  
**Primary Databases & Stores:**
1. **Supabase (Managed PostgreSQL via Prisma ORM)** — Relational metadata, audit logs, financial ledgers, user accounts, and state machines.
2. **Cloudflare R2 (S3-Compatible Object Store)** — Unstructured binary assets, research datasets, statistical outputs, deliverables, and payment receipts.
3. **Local Dev & Governance Store (`apps/app/dev_data/`)** — Hot configuration, payroll compensation matrices, package commission rates, and payslips ledger.

---

## 1. Storage Architecture Overview

JAXIS StatLab enforces a strict separation of concerns between **Structured Relational State** and **Unstructured Binary Objects**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                    JAXIS Web / SaaS App                                   │
└─────────────────────────────┬──────────────────────────────────────────┬─────────────────┘
                              │                                          │
                              ▼                                          ▼
     ┌──────────────────────────────────────────────────┐  ┌───────────────────────────────┐
     │        SUPABASE (PostgreSQL via Prisma)          │  │     CLOUDFLARE R2 BUCKET      │
     ├──────────────────────────────────────────────────┤  ├───────────────────────────────┤
     │ • User Accounts & RBAC Roles                     │  │ • Raw Research Datasets       │
     │ • Study Metadata & 24-State Workflow Status      │  │ • Client Thesis Documents     │
     │ • Commercial Quotations & Itemized Lines         │  │ • Survey Questionnaires       │
     │ • SOW Terms, Signatures & Snapshots              │  │ • Payment Proof Screenshots   │
     │ • Payment Milestones & Verification Records      │  │ • Statistical Outputs (SPSS)  │
     │ • Expert Allocations & Business Day SLAs         │  │ • Final Release Deliverables  │
     │ • Firewall-Filtered Communication Messages       │  │ • Arbitration Evidence Files  │
     │ • QA Scorecards, Reviews & Rejection Counts      │  │ • SOW PDF Contracts           │
     │ • Treasury Ledgers & Specialist Payouts          │  │ • DefenseLab Recordings       │
     │ • Staff Duty Clock Logs & Correction Claims      │  │                               │
     │ • Pointers to R2 Storage Keys (filePath strings) │  │ Key: studies/{id}/{timestamp} │
     └──────────────────────────────────────────────────┘  └───────────────────────────────┘
                              │
                              ▼
     ┌──────────────────────────────────────────────────┐
     │      LOCAL CONFIGS & LEDGERS (dev_data/)         │
     ├──────────────────────────────────────────────────┤
     │ • Role Compensation Policies (payroll_configs)   │
     │ • Statistician & Senior QA Commission Rates      │
     │ • Historic Batch Payslips & Disbursement Vouchers│
     │ • Specialist E-Wallet & Bank Settlement Profiles │
     │ • Company Collection Accounts (GCash/Maya/Banks) │
     └──────────────────────────────────────────────────┘
```

### Why this separation?
1. **Zero Database Bloat**: Binary files are never stored in PostgreSQL as `BYTEA` or `BLOB`. The database stays lean (sub-millisecond queries, fast transactional backups, minimal connection RAM).
2. **Zero Egress Fees**: Cloudflare R2 provides $0 egress fees forever, saving substantial bandwidth costs when clients download large SPSS datasets and final deliverables.
3. **Immutability & Integrity**: PostgreSQL holds the authoritative truth (timestamps, checksums, user IDs, audit trails), while R2 holds the raw file contents referenced by predictable storage keys (`studies/{studyId}/{timestamp}-{cleanFileName}`).

---

## 2. Supabase (PostgreSQL) Database Inventory

All data in Supabase is managed via Prisma ORM (`apps/app/prisma/schema.prisma`) and connects through the Supabase connection pooler (`DATABASE_URL`).

### 2.1 Identity, Authentication & User Management

| Model / Table | Primary Data Stored |
|---|---|
| `users` | User credentials, email, password hash (`bcryptjs`), full name, phone number, account status (`ACTIVE`, `SUSPENDED`, `TERMINATED`, `ON_LEAVE`, `LEAVE_PENDING`), leave date ranges and reasons. |
| `roles` | System roles: `CLIENT`, `STATISTICIAN`, `SENIOR_QA_LEAD`, `ADMIN`, `FINANCE_OFFICER`, `CEO`. |
| `user_roles` | Join table binding users to one or more roles, with assignment timestamps and `assignedBy` admin ID. |
| `auth_audit_logs` | Authentication security events (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `REGISTRATION`, `ACCOUNT_SUSPENDED_BLOCK`), client IP address, User Agent, and JSON metadata. |
| `password_reset_tokens` | Secure token hashes for password resets with strict expiration and single-use tracking. |

### 2.2 Client Management & Academic Profiles

| Model / Table | Primary Data Stored |
|---|---|
| `client_profiles` | Client academic background: university/institution name, academic program (e.g., Master's in Nursing, PhD in Education), emergency contact number, and Philippine geographic region. |
| `staff_profiles` | Specialist biography, technical research specializations (e.g., SPSS, R, Stata, Python, Econometrics, Structural Equation Modeling), join date, and profile updates. |
| `suspension_logs` | Disciplinary tracking for staff or clients: action (`SUSPENDED`, `SUSPENSION_LIFTED`, `TERMINATED`), violation classification (`ETHICAL_BREACH`, `DIRECT_PAYMENT_BYPASS`, `DATA_FALSIFICATION`, `GHOSTWRITING`, `POLICY_VIOLATION`), who initiated it, and who lifted it. |

### 2.3 Research Intake & Study Lifecycle

| Model / Table | Primary Data Stored |
|---|---|
| `projects` | Core study record: `intakeId` (canonical ID: `JAXIS-YYYYMM-XXXX`), `clientId`, research title, research questions, research objectives, hypotheses, Chapter 1–3 summary, questionnaire overview, requested deadline date, 24-state master workflow status (`NEW_REQUEST`, `AWAITING_INFORMATION`, `UNDER_EVALUATION`, `QUOTE_SENT`, `CLIENT_APPROVED`, `SOW_PENDING`, `SOW_SIGNED`, `AWAITING_PAYMENT`, `ACTIVE`, `EXPERT_ASSIGNED`, `IN_PROGRESS`, `SCOPE_CREEP_HALTED`, `SLA_PAUSED`, `FOR_QA`, `QA_REVISION`, `DELIVERED`, `REVISION_REQUESTED`, `CLOSED`, `HALTED`, `CANCELLED`, `DISPUTED`, `ETHICAL_BREACH`, `EXPIRED`, `REASSIGNMENT_NEEDED`), delivered timestamp, retention purge dates, dispute/refund flags, and revision window expiry (`deliveredAt + 7 days`). |
| `project_files` | Metadata records for all client documents submitted during intake: file name, MIME type, file category (`RESEARCH_DOCUMENT`, `DATASET`, `QUESTIONNAIRE`), upload timestamp, and `filePath` string pointing to the object key in Cloudflare R2. |

### 2.4 Commercial Quotations & SOW Contracts

| Model / Table | Primary Data Stored |
|---|---|
| `quotations` | Official quotation proposal: `packageName` (`JX_01_DATACHECK`, `JX_02_START`, `JX_03_CORE`, `JX_04_ADVANCED`), base package price, total amount (including add-ons), required downpayment amount, expiration date, status (`DRAFT`, `QUOTE_SENT`, `CLIENT_APPROVED`, `QUOTE_DECLINED`, `QUOTE_EXPIRED`, `SUPERSEDED`), decline reason, admin creator ID, and client response timestamps. |
| `quotation_line_items` | Itemized line items: item type (`PACKAGE` vs `ADDON`), item name (e.g., `DEFENSELAB`, `RUSH`, `EXPRESS`, `EMERGENCY`), item description, and monetary amount. |
| `package_price_configs` | Minimum and maximum price floors and ceilings per package, including boolean flags indicating if 100% upfront payment is mandatory (`isUpfront`). |
| `sows` | Legally binding Scope of Work agreements: SOW type (`PRIMARY`, `SUPPLEMENTAL`), immutable snapshot JSON (denormalized copy of scope, terms, deliverables, and package details), turnaround days, add-ons list, electronic signature name, signature timestamp, signing client user ID, admin generator user ID, and `pdfPath` string (pointing to the generated legal PDF in Cloudflare R2). |

### 2.5 Payments, Escrow & Installments

| Model / Table | Primary Data Stored |
|---|---|
| `payments` | Financial payment transactions: payment type (`DOWNPAYMENT`, `INSTALLMENT`, `BALANCE`, `FULL`), payment method (`GCASH`, `BANK_TRANSFER`), amount submitted, cumulative balance paid total, transaction reference number, status (`AWAITING_PAYMENT`, `PROOF_SUBMITTED`, `VERIFIED`, `REJECTED`, `FULLY_PAID`), verification admin ID, verified timestamp, and rejection reason. |
| `payment_proofs` | Metadata records for payment receipts: `filePath` (R2 storage key), file name, file size, and upload timestamp. |

### 2.6 Workload Assignments & Business Day SLAs

| Model / Table | Primary Data Stored |
|---|---|
| `assignments` | Active project assignments: links project to `statisticianId` and `qaLeadId`, admin assigner ID, SLA start date, SLA due date, SLA pause state (`slaPausedAt`, `slaResumedAt`, pause reason, requested by, approved by), and reassignment details. |
| `assignment_histories` | Historical record of staff reassignments with reasons and `payoutVoided` tracking. |
| `philippine_holidays` | Calendar of Philippine regular and special non-working holidays used by the SLA engine to calculate working days excluding weekends and national holidays. |

### 2.7 Staff Attendance & Duty Governance

| Model / Table | Primary Data Stored |
|---|---|
| `staff_attendance_logs` | Specialist live duty records: clock-in timestamp, clock-out timestamp, meal break minutes, total net payable working minutes, status (`IN_PROGRESS`, `COMPLETED`, `AUTO_CLOSED`, `ADJUSTED`, `VOIDED`), 14-hour max shift auto-close flag, IP address, user agent, and notes. |
| `attendance_correction_requests` | Formal shift adjustment claims: correction type (`MISSED_CLOCK_IN`, `MISSED_CLOCK_OUT`, `MISSED_FULL_SHIFT`, `BREAK_ADJUSTMENT`, `OVERTIME_CLAIM`), target date, claimed clock in/out/breaks, claimed net hours, stated reason, tasks accomplished, review status (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`), reviewing manager ID, and review notes. |
| `attendance_policy_configs` | System-wide attendance rules: weekend/holiday work toggles, core operating hours, automatic meal break threshold hours (default 5.0h) and deduction minutes (60 min), base hourly rate, and maximum shift cap hours (14 hours). |

### 2.8 Messaging & Communication Firewall

| Model / Table | Primary Data Stored |
|---|---|
| `messages` | Internal project chat messages: `projectId`, `senderId`, `senderRole`, message content, sent timestamp, `isBlocked` firewall flag, and `blockedReason`. |
| `message_read_receipts` | Per-user message read timestamps (`messageId`, `userId`, `readAt`). |
| `blocked_message_logs` | Intercepted off-platform evasion attempts: matched firewall pattern name (e.g., direct email, phone number, Facebook/Telegram/WhatsApp handle, GCash/bank direct payment attempt), snippet of matched text, review status, reviewer ID, and notes. |

### 2.9 Statistical Analysis Workbench

| Model / Table | Primary Data Stored |
|---|---|
| `analysis_files` | Draft working files uploaded by statisticians: `fileName`, `filePath` (R2 storage key), MIME type, size, category (`SPSS_OUTPUT`, `R_OUTPUT`, `PYTHON_OUTPUT`, `EXCEL_WORKBOOK`, `STATA_OUTPUT`, `PDF_REPORT`, `RAW_DATASET`, `OTHER`), version number, `isCurrent` boolean, and version notes. |
| `scope_creep_logs` | Flags raised by statisticians when research questions or data structures exceed the agreed SOW scope: reason, flagged timestamp, resolving admin ID, resolution notes, and optional `supplementalQuotationId`. |

### 2.10 Quality Assurance (QA) & Reproducibility

| Model / Table | Primary Data Stored |
|---|---|
| `qa_reviews` | Formal evaluation scorecards: `reviewerId` (Senior QA Lead), decision (`QA_APPROVED`, `QA_REJECTED`, `ESCALATED_TO_CEO`), error classification (`MINOR`, `MAJOR`, `CRITICAL`, `ETHICAL_BREACH`), correction comments, 24-hour revision deadline (`qaRevisionDueAt`), and review timestamp. |
| `qa_rejection_counts` | Cumulative rejection counter per project and statistician to detect recurring statistical deficiencies and trigger reassignments. |

### 2.11 Deliverables & Post-Delivery Revisions

| Model / Table | Primary Data Stored |
|---|---|
| `deliverables` | Client-facing final deliverables: `category` (`STATISTICAL_OUTPUT`, `PDF_REPORT`, `RAW_DATA_CLEANED`, `APPENDIX`, `OTHER`), `fileName`, `filePath` (R2 storage key), file size, uploader ID, `isFinalReleased` boolean (gated strictly by 100% payment clearance), `releasedAt`, releaser ID, and download counter. |
| `revision_requests` | Revisions filed within the 7-day post-delivery window: client description, requested sections, status (`PENDING_REVIEW`, `INCLUDED`, `METHODOLOGY_CHANGE`, `NEW_PAID_WORK`, `RESOLVED`, `CANCELLED`), classification notes, classifying admin ID, and supplemental quotation/SOW references. |

### 2.12 DefenseLab Oral Defense Simulation

| Model / Table | Primary Data Stored |
|---|---|
| `defense_lab_sessions` | Oral mock defense session records: `clientId`, `expertId`, scheduled date/time, duration (hours), amount paid, status (`SCHEDULED`, `COMPLETED`, `NO_SHOW_CLIENT`, `RESCHEDULED`, `CANCELLED`, `PENALTY_APPLIED`), meeting URL (Google Meet), `recordingUrl` (Cloudflare R2 or cloud video link), agenda notes, reschedule tracking, and penalty fee calculations. |

### 2.13 Finance, Ledgers & Specialist Payouts

| Model / Table | Primary Data Stored |
|---|---|
| `financial_ledgers` | Project financial summary: `grossRevenue`, `platformFee` (JAXIS net profit), `statisticianShare`, `qaLeadShare`, and `netMargin`. |
| `payouts` | Itemized specialist payout disbursements: `recipientId`, `recipientRole` (`STATISTICAL`, `QA_LEAD`), gross project sum, payout rate percentage applied, final calculated payout amount, payout status (`NOT_ELIGIBLE`, `PENDING`, `APPROVED`, `DISBURSED`, `VOIDED`), disbursement method (GCash, Maya, Bank), transaction reference number, `disbursementProofUrl`, approving manager ID, and disbursing finance officer ID. |
| `payout_rate_configs` | Database fallback table for package payout rate percentages. |

### 2.14 Disputes, Academic Arbitrations & Refunds

| Model / Table | Primary Data Stored |
|---|---|
| `disputes` | Formal dispute cases filed by clients within 7 days of delivery: `grounds` (`METHODOLOGY_DEVIATION`, `MATHEMATICAL_ERROR`, `SLA_BREACH`), client description, array of `evidenceFilePaths` (R2 keys), status (`OPEN`, `UNDER_REVIEW`, `RESOLVED_REFUND`, `RESOLVED_NO_REFUND`, `CHARGEBACK`), resolution type (`FULL_REFUND`, `TURNAROUND_UPGRADE_REFUND_ONLY`, `NO_REFUND`, `CHARGEBACK`), resolution notes, resolving CEO ID, and chargeback timestamps. |

### 2.15 Notifications, Alerts & Audit Logs

| Model / Table | Primary Data Stored |
|---|---|
| `notification_logs` | Transactional email delivery logs via Resend: recipient email, template name, status (`SENT`, `FAILED`, `RETRYING`), attempt count, error messages, and timestamps. |
| `in_app_alerts` | User notification bell items: recipient ID, recipient role, alert type (e.g. `NEW_INTAKE`, `QA_SUBMISSION`, `PRE_DEADLINE`), message copy, direct navigation link URL, and read status. |
| `archived_projects` | Immutable historical archive of closed projects: `intakeId`, client name, package name, full project JSON snapshot, archive date, archiving admin ID, and file purge flags. |
| `audit_logs` | Comprehensive tamper-evident system audit log: project ID, actor ID, actor role, action string, old value, new value, reason, and JSON metadata. |
| `data_deletion_requests` | Client privacy data deletion records under DPA/GDPR: list of deleted non-essential fields, list of retained legal/tax fields (contracts, financial logs), and admin processor ID. |
| `storage_retention_configs` | Automated file retention settings: retention days (default 90), inactive purge days (180), auto-purge toggle, and categorical protection flags (`keepDatasets`, `keepResearchDocs`, `keepQuestionnaires`, `keepReceiptPhotos`, `keepChatHistory`, `keepDeliverables`). |

---

## 3. Cloud Storage (Cloudflare R2) Inventory

Cloudflare R2 is an S3-compatible, zero-egress cloud object store managed through the AWS SDK S3 Client (`@aws-sdk/client-s3`) in `src/lib/storage.ts` and the unified upload route `/api/upload`.

### 3.1 Object Key Structure
All files stored in Cloudflare R2 follow a standardized, predictable key hierarchy:
```
studies/{studyId}/{timestamp}-{cleanFileName}
```
*Example:* `studies/JAXIS-202609-0001/1788912345678-research_survey_raw.xlsx`

### 3.2 Categorical Asset Inventory

| File Category | Allowed Extensions | Max Size | Primary Content Stored |
|---|---|---|---|
| **`RESEARCH_DOCUMENT`** | `.pdf`, `.docx`, `.doc`, `.zip` | 15MB | Thesis proposals, Chapter 1–3 drafts, university guidelines, institutional review board (IRB) ethics approvals. |
| **`DATASET`** | `.xlsx`, `.xls`, `.csv`, `.sav`, `.dta`, `.tsv` | 15MB | Raw research datasets, survey exports (Google Forms/Qualtrics), laboratory observations, experimental measurements, tabular research data. |
| **`QUESTIONNAIRE`** | `.pdf`, `.docx`, `.doc`, `.xlsx`, `.csv` | 15MB | Survey instruments, measurement scales, interview question guides, Likert scale templates. |
| **`PAYMENT_PROOF`** | `.pdf`, `.png`, `.jpg`, `.jpeg` | 15MB | GCash receipts, Maya payment confirmation screenshots, BDO/BPI bank deposit slips, wire transfer receipts. |
| **`ANALYSIS_OUTPUT`** | `.pdf`, `.docx`, `.xlsx`, `.csv`, `.zip`, `.sav` | 15MB | Statistician working files: SPSS `.spv` output logs, R scripts (`.R`), Python notebooks, Stata `.log` files, preliminary statistical tables. |
| **`DELIVERABLE`** | `.pdf`, `.docx`, `.xlsx`, `.csv`, `.zip` | 15MB | Final client-facing files: Verified and labeled datasets, APA-7th formatted Statistical Summary Reports, Certificates of Statistical Verification, defense slide decks. |
| **`DISPUTE_EVIDENCE`** | `.pdf`, `.docx`, `.png`, `.jpg`, `.jpeg`, `.zip` | 15MB | Client arbitration evidence: thesis committee comment sheets, panel rejection notes, screenshot logs. |
| **Contract PDFs** | `.pdf` | 15MB | System-generated, digitally signed Scope of Work (SOW) legal agreements (`pdfPath` in `sows`). |
| **DefenseLab Media** | `.mp4`, `.webm`, `.zip` | Presigned URL | Oral defense rehearsal recordings, mock defense video streams (`recordingUrl` in `defense_lab_sessions`). |
| **Payout Proofs** | `.pdf`, `.png`, `.jpg`, `.jpeg` | 15MB | Treasury disbursement transfer slips uploaded by Finance Officer (`disbursementProofUrl` in `payouts`). |

### 3.3 Access & Retention Controls
- **Upload Protocol**: Uploads execute either via server API route `/api/upload` (for validated category uploads) or via pre-signed S3 PUT URLs generated by `getR2UploadUrl(key, contentType)` (expires in 5 minutes).
- **Download Protocol**: Files are downloaded via pre-signed S3 GET URLs generated by `getR2DownloadUrl(key)` (expires in 1 hour) or via public CDN URL `env.R2_PUBLIC_URL` when enabled.
- **Payment Gating**: Final deliverables (`isFinalReleased = true`) can only be downloaded by clients once payments are 100% verified.
- **Retention & Purge Protocol**: Completed projects trigger a 90-day retention countdown. When `filesPurgeAt` is reached, background jobs execute `deleteMultipleR2Objects()` in S3 batches of up to 1,000 keys, preserving metadata in Supabase while freeing cloud storage.

---

## 4. Local Dev & Governance Storage (`apps/app/dev_data/`)

To allow instant configuration updates without complex SQL migrations, local JSON files in `apps/app/dev_data/` store operational parameters:

| File Name | Content Stored |
|---|---|
| **`payroll_configs.json`** | Role compensation configurations: monthly base retainers, hourly rates, per-study bonus rates, QA review bonus rates, compensation models (`HOURLY`, `COMMISSION`, `HYBRID`, `STIPEND`, `FIXED_BASE`), pay schedules (`SEMI_MONTHLY`, `MONTHLY`), cutoff dates, and bespoke specialist rate overrides. |
| **`package_rates.json`** | Customizable Statistician commission percentage (`ratePercent`, e.g. 45%–72%) and Senior QA Reviewer commission percentage (`qaRatePercent`, e.g. 5%–15%) per package tier (`JX_01_DATACHECK`, `JX_02_START`, `JX_03_CORE`, `JX_04_ADVANCED`, `DEFENSELAB`). |
| **`payslips.json`** | Complete history of generated staff payslips: payslip numbers, period dates, duty hours worked, completed studies, itemized earnings, statutory deductions, net payouts, disbursement status, and verification tokens. |
| **`payout_details.json`** | Registered specialist disbursement settlement destinations: Philippine mobile wallets (GCash, Maya) and commercial bank accounts (BDO, BPI, UnionBank, Metrobank) with verified account names. |
| **`payment_channels.json`** | Official corporate receiving accounts displayed on client checkout forms (JAXIS corporate GCash, Maya QR, and BDO corporate accounts). |

---

## 5. Cross-Reference Mapping: Supabase ↔ Cloudflare R2

The table below illustrates how Supabase database records point directly to Cloudflare R2 objects:

| Supabase Table | Supabase Field Pointer | Referenced Cloudflare R2 Object |
|---|---|---|
| `project_files` | `filePath` | `studies/{studyId}/{timestamp}-{fileName}` (Intake document / raw dataset) |
| `payment_proofs` | `filePath` | `studies/{studyId}/{timestamp}-receipt.{ext}` (Payment deposit slip) |
| `sows` | `pdfPath` | `studies/{studyId}/sow-{sowId}.pdf` (Executed legal agreement) |
| `analysis_files` | `filePath` | `studies/{studyId}/analysis/{timestamp}-{fileName}` (Statistician draft / output) |
| `deliverables` | `filePath` | `studies/{studyId}/deliverables/{timestamp}-{fileName}` (Final deliverable) |
| `defense_lab_sessions` | `recordingUrl` | `studies/{studyId}/defenselab/{timestamp}-session.mp4` (Session recording) |
| `payouts` | `disbursementProofUrl` | `treasury/payouts/{payoutId}-transfer.{ext}` (Disbursement proof) |
| `disputes` | `evidenceFilePaths[]` | `studies/{studyId}/disputes/{timestamp}-{fileName}` (Arbitration evidence) |

---

## 6. Summary Comparison

| Metric / Dimension | Supabase (PostgreSQL) | Cloudflare R2 |
|---|---|---|
| **Data Nature** | Highly structured, relational, transactional | Unstructured binary files & media |
| **Primary Protocol** | Prisma ORM / PostgreSQL Client | S3-Compatible API (`@aws-sdk/client-s3`) |
| **Average Item Size** | Kilobytes (Rows / JSON fields) | Megabytes (Up to 15MB per file) |
| **Cost Model** | Managed database tier ($0 dev / $25 Pro) | Pay-per-storage (10GB free, $0 egress forever) |
| **Access Control** | Server-side NextAuth session & role checks | Pre-signed temporary URLs (300s upload / 3600s download) |
| **Backup / Snapshot** | Continuous WAL & daily automated Postgres backups | Multi-region distributed object replication |
