# JAXIS — Module 17: Reporting, Analytics & Archive

**Module Code:** `17-reporting`\
**Domain:** Reports & Analytics + Archive\
**Depends On:** All preceding modules\
**Blocks:** Nothing — terminal module.

---

## 1. Module Identity

- **Primary Objective:** Generate operational and financial reports with PDF export for Admin, Finance, and CEO. Archive closed projects as immutable read-only snapshots. Purge files after 90 days per retention policy. Honor client data deletion requests within legal retention boundaries.
- **Core Responsibilities:** Parameterized report queries, PDF export, `ArchivedProject` snapshot model, 90-day file purge job, data deletion request handling, full audit trail.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `RPT-F01` | **8 report types** — Parameterized by date range; see report table below |
| `RPT-F02` | **Date range filtering** — All reports accept `startDate` + `endDate` query params |
| `RPT-F03` | **PDF export** — Server-side PDF generation via `@react-pdf/renderer`; downloadable from report pages |
| `RPT-F04` | **Role-scoped report access** — Admin: operational + performance reports; Finance: ledger + payout reports; CEO: all reports |
| `RPT-F05` | **Manual archive** — Admin manually archives `CLOSED` projects → `ArchivedProject` snapshot |
| `RPT-F06` | **Archive read-only** — Archived projects cannot have any status changes, uploads, or actions |
| `RPT-F07` | **90-day file purge** — Daily scheduled job: delete R2/S3 files for projects where `files_purge_at <= now()` |
| `RPT-F08` | **Data deletion request** — Client submits deletion request; system evaluates what can vs. must be retained |
| `RPT-F09` | **Audit trail** — All project status transitions and Admin actions logged with actor, timestamp, old→new status, reason |
| `RPT-F10` | **Searchable archive** — Admin can search archived projects by intake ID, client name, package, date range |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Real-time dashboard (live charts) | Scheduled/on-demand reports only for MVP |
| External BI integration (Metabase, Tableau) | Future feature |
| Automated data deletion (no client request) | Data deletion only on explicit client request |
| Report scheduling (email reports) | Future feature |



---

## 3. Report Types

| Report Code | Report Name | Audience | Key Metrics |
|---|---|---|---|
| `revenue-summary` | Revenue Summary | Admin, CEO, Finance | Total gross revenue, platform margin, Expert payouts, period totals; breakdown by package |
| `expert-performance` | Expert Performance | Admin, CEO | Per-Expert: QA pass rate, rejection count, average turnaround, project volume |
| `project-volume` | Project Volume | Admin, CEO | Active/Completed/Cancelled/Expired count; breakdown by package and month |
| `turnaround-analytics` | Turnaround Analytics | Admin, CEO | Average turnaround days, SLA miss rate, Rush/Express/Emergency sales |
| `dispute-refund` | Dispute & Refund Report | Admin, CEO | Dispute count, resolution breakdown, total refunds, chargeback count |
| `client-acquisition` | Client Acquisition | Admin, CEO | New clients per period, repeat clients, project frequency per client |
| `ledger-export` | Finance Ledger Export | Finance, CEO | Full ledger: gross, platform fee, payout per project; filterable |
| `payout-report` | Expert Payout Report | Finance, CEO | Payout history per Expert, pending disbursements, voided payouts |

---

## 4. Database Schema

```prisma
model ArchivedProject {
  id            String   @id @default(cuid())
  projectId     String   @unique
  intakeId      String   // JAXIS-YYYYMM-XXXX for search
  clientName    String   // Denormalized for search
  packageName   String   // Denormalized for filter
  snapshot      Json     // Full immutable project data snapshot
  archivedAt    DateTime @default(now())
  archivedBy    String   // Admin userId
  filesPurged   Boolean  @default(false)
  filesPurgedAt DateTime?

  @@index([intakeId])
  @@index([clientName])
  @@index([packageName])
  @@index([archivedAt])
  @@map("archived_projects")
}

model AuditLog {
  id         String   @id @default(cuid())
  projectId  String?
  actorId    String
  actorRole  RoleName
  action     String                // e.g. "STATUS_TRANSITION", "FILE_RELEASED", "PAYOUT_DISBURSED"
  oldValue   String?               // Old status or value
  newValue   String?               // New status or value
  reason     String?
  metadata   Json?                 // Additional context
  createdAt  DateTime @default(now())

  actor User @relation(fields: [actorId], references: [id])

  @@index([projectId])
  @@index([actorId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}

model DataDeletionRequest {
  id              String   @id @default(cuid())
  clientId        String
  requestedAt     DateTime @default(now())
  processedAt     DateTime?
  deletedFields   String[] // Which non-essential data was deleted
  retainedFields  String[] // What was retained and why
  status          DeletionStatus @default(PENDING)
  processedBy     String?  // Admin userId

  client User @relation(fields: [clientId], references: [id])

  @@index([clientId])
  @@map("data_deletion_requests")
}

enum DeletionStatus {
  PENDING
  PROCESSED
  REJECTED  // If legal/financial hold prevents full deletion
}
```

---

## 5. 90-Day File Purge Job

```ts
// src/lib/jobs/purge-project-files.ts
// Trigger.dev cron — runs daily at 03:00 PH time
import { schedules } from '@trigger.dev/sdk/v3';
import { r2Client } from '@/lib/storage';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { env } from '@/lib/env';

export const purgeProjectFilesTask = schedules.task({
  id: 'purge-project-files',
  cron: '0 19 * * *', // 03:00 PHT = 19:00 UTC
  run: async () => {
    const now = new Date();
    const projectsToPurge = await db.project.findMany({
      where: {
        filesPurgeAt: { lte: now },
        filesPurged:  false,
      },
      select: { id: true, files: true },
    });

    for (const project of projectsToPurge) {
      const fileKeys = project.files.map(f => ({ Key: f.filePath }));
      if (fileKeys.length > 0) {
        await r2Client.send(new DeleteObjectsCommand({
          Bucket:  env.R2_BUCKET_NAME,
          Delete:  { Objects: fileKeys },
        }));
      }
      await db.project.update({
        where: { id: project.id },
        data:  { filesPurged: true },
      });
    }
    return { purged: projectsToPurge.length };
  },
});
```

---

## 6. Data Deletion Policy

Fields **retained** regardless of deletion request (legal/financial/dispute):
- `AuthAuditLog` entries
- `SOW` snapshots (signed contract)
- `Payment` and `PaymentProof` records
- `Dispute` records and evidence
- `AuditLog` entries
- `FinancialLedger` and `Payout` records

Fields **deleted** on valid request:
- `ClientProfile` non-essential fields (phone, region)
- Uploaded research documents (`ProjectFile` paths → purge from R2/S3)
- `Message` content (replace with `"[deleted]"`)
- `StaffProfile` bio (if staff requests deletion — separate from client request)

---

## 7. API Routes

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/reports/:type` | ADMIN, FINANCE, CEO | Query report with date range |
| `GET` | `/api/v1/reports/:type/pdf` | ADMIN, FINANCE, CEO | Download PDF version of report |
| `POST` | `/api/v1/projects/:id/archive` | ADMIN, CEO | Archive a CLOSED project |
| `GET` | `/api/v1/archive` | ADMIN, CEO | Searchable archive list |
| `GET` | `/api/v1/archive/:id` | ADMIN, CEO | Archived project detail (read-only) |
| `POST` | `/api/v1/account/data-deletion-request` | CLIENT | Submit data deletion request |
| `GET` | `/api/v1/admin/audit-log` | ADMIN, CEO | Full audit log with filters |

---

## 8. Page Views

| Page | Route | Role | Description |
|---|---|---|---|
| Reports Home | `/dashboard/admin/reports` | Admin | Report type cards + date filter + PDF export |
| CEO Reports | `/dashboard/ceo/reports` | CEO | All report types + financial overlay |
| Finance Reports | `/dashboard/finance/reports` | Finance | Ledger export + payout report |
| Archive | `/dashboard/admin/archive` | Admin, CEO | Searchable archive table (intake ID, client, package, date) |
| Archive Detail | `/dashboard/admin/archive/:id` | Admin, CEO | Read-only project snapshot |
| Audit Log | `/dashboard/admin/audit-log` | Admin, CEO | Filterable action log |

---

## 9. Seed Data Requirements

```ts
// One archived project for dev testing
const seedArchivedProject = {
  projectIntakeId: 'JAXIS-202601-0099',
  clientName:      'Sample Client',
  packageName:     'JX_02_START',
  snapshot: { /* full project data snapshot */ },
  archivedAt:      new Date('2026-07-01T00:00:00Z'),
};

// Seed audit log entries for the seed project
const seedAuditLogs = [
  { action: 'STATUS_TRANSITION', oldValue: 'NEW_REQUEST', newValue: 'UNDER_EVALUATION' },
  { action: 'STATUS_TRANSITION', oldValue: 'UNDER_EVALUATION', newValue: 'QUOTE_SENT' },
  { action: 'FILE_RELEASED', newValue: 'DELIVERED' },
  { action: 'PROJECT_CLOSED', newValue: 'CLOSED' },
];
```

---

### 🎯 Expected Output (What you should be able to do now)

- [x] **Operational & Financial Reports:** Admin, Finance, and CEO can query and view 8 parameterized reports (Revenue Summary, Expert Performance, Project Volume, Turnaround Analytics, Dispute/Refund, Client Acquisition, Ledger Export, Expert Payouts).
- [x] **PDF Report Export:** Download formatted, branded PDF summaries for any report generated within selected date ranges.
- [x] **Project Archival Engine:** Admin can archive `CLOSED` projects into read-only snapshot records (`ArchivedProject`).
- [x] **Automated 90-Day Storage Purge:** Trigger.dev background cron automatically purges raw storage files for projects 90 days post-delivery while preserving report records.
- [x] **Client Data Deletion Request Workflow:** Compliant client account deletion handling honoring mandatory financial and legal audit retention windows.


## 10. Acceptance Criteria (Done Checklist)

### Reports
- [x] All 8 report types return correct data for a given date range
- [x] Finance role can access `ledger-export` and `payout-report` only
- [x] Admin role cannot access Finance-only reports → 403
- [x] CEO role can access all report types
- [x] PDF export generates a readable, styled PDF for each report type

### Archive
- [x] Admin can archive a `CLOSED` project → `ArchivedProject` snapshot created
- [x] Archived project is read-only: status transition attempt → 422 `PROJECT_ARCHIVED`
- [x] Archive search by intake ID returns correct results
- [x] Archive search by package name filter works

### 90-Day Purge
- [x] Daily purge job identifies projects with `filesPurge_at <= now()` and `filesPurged = false`
- [x] Files deleted from R2/S3 after purge runs
- [x] `filesPurged = true` and `filesPurgedAt` set post-purge
- [x] Audit log entry created for each purge event

### Data Deletion
- [x] Client can submit data deletion request
- [x] System retains financial, legal, and audit records
- [x] Non-essential data (profile fields, document files, message content) purged
- [x] Client notified of deletion via email (Module 16)

### Audit Log
- [x] Every project status transition creates an `AuditLog` entry with actor, old→new, reason
- [x] Every Admin financial action (payout disburse, verify) logged
- [x] Audit log is read-only — no delete or edit endpoints

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 errors
- [x] `npm run build` → clean
