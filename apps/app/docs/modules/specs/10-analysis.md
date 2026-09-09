# JAXIS — Module 10: Analysis Workbench

**Module Code:** `10-analysis`\
**Domain:** Analysis Workbench\
**Depends On:** `08-assignment`, `09-messaging`\
**Blocks:** `11-qa`

---

## 1. Module Identity

- **Primary Objective:** The assigned Statistician performs the agreed analytical work and uploads output files within their project workspace. File versions are retained permanently. Scope creep flags halt work and trigger a requote flow (RULE_QUO_03). Work is submitted to QA via a one-way action.
- **Core Responsibilities:** `AnalysisFile` with versioning, scope creep halt flow, submit-for-QA action, workbench UI.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `WRK-F01` | **File upload** — Statistician uploads analysis output files (SPSS, R, Python, Excel, PDF report) scoped to their assigned project |
| `WRK-F02` | **File versioning** — Each new upload increments version number; `is_current = true` on new; old versions retained with `is_current = false` |
| `WRK-F03` | **Version history** — All prior versions visible with timestamps; current version marked |
| `WRK-F04` | **Project scope view** — Workbench shows intake info, research objectives, SOW scope as reference |
| `WRK-F05` | **Scope creep flag** — Statistician flags scope expansion → project → `SCOPE_CREEP_HALTED`; all uploads disabled until resolved |
| `WRK-F06` | **RULE_QUO_03** — Scope creep halt triggers supplemental quote flow: Admin issues new quotation; Client accepts and pays before work resumes |
| `WRK-F07` | **Submit for QA** — One-way action: Statistician submits → project → `FOR_QA`; no further uploads allowed by Statistician after submission |
| `WRK-F08` | **QA Lead file access** — QA Lead can view all analysis files (read-only) from their review queue |
| `WRK-F09` | **Admin file access** — Admin can view all versions of analysis files (read-only) |
| `WRK-F10` | **QA revision re-upload** — After QA rejection, Statistician can upload revised files (project moves back to `IN_PROGRESS`) |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Statistician working on a project they are not assigned to | `requireRole + assertAssigned()` gate |
| QA decision from this module | Module 11 |
| Client viewing analysis files | Clients never see raw analysis files — only the final deliverable in Module 12 |
| Inline code editor or SPSS integration | Out of MVP |
| AI/ML assisted analysis | Out of MVP |



---

## 3. Database Schema

```prisma
model AnalysisFile {
  id             String   @id @default(cuid())
  projectId      String
  statisticianId String
  fileName       String
  filePath       String   // R2/S3 object key
  fileType       String   // MIME type
  fileCategory   AnalysisFileCategory
  version        Int      @default(1)
  isCurrent      Boolean  @default(true)
  notes          String?  // Statistician notes on this version
  uploadedAt     DateTime @default(now())

  project      Project @relation(fields: [projectId], references: [id])
  statistician User    @relation(fields: [statisticianId], references: [id])

  @@index([projectId])
  @@index([statisticianId])
  @@index([isCurrent])
  @@index([uploadedAt])
  @@map("analysis_files")
}

enum AnalysisFileCategory {
  SPSS_OUTPUT
  R_OUTPUT
  PYTHON_OUTPUT
  EXCEL_WORKBOOK
  STATA_OUTPUT
  PDF_REPORT
  RAW_DATASET
  OTHER
}

model ScopeCreepLog {
  id              String   @id @default(cuid())
  projectId       String
  flaggedBy       String   // Statistician userId
  flagReason      String
  flaggedAt       DateTime @default(now())
  resolvedAt      DateTime?
  resolvedBy      String?  // Admin userId
  supplementalQuotationId String? // Linked supplemental quotation

  project Project @relation(fields: [projectId], references: [id])

  @@index([projectId])
  @@map("scope_creep_logs")
}
```

---

## 4. API Routes & Server Actions

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/analysis/upload` | STATISTICIAN | Upload analysis file (assigned project only) |
| `GET` | `/api/v1/analysis/:projectId` | STATISTICIAN, ADMIN, SENIOR_QA_LEAD, CEO | All versions for project |
| `GET` | `/api/v1/analysis/:projectId/current` | Same as above | Current version files only |
| `POST` | `/api/v1/projects/:id/flag-scope-creep` | STATISTICIAN | Flag scope creep → halt project |
| `POST` | `/api/v1/analysis/:projectId/submit-for-qa` | STATISTICIAN | Submit work → `FOR_QA` |

### Assignment Guard

```ts
// src/lib/analysis-rules.ts
export async function assertStatisticianAssigned(
  projectId: string,
  statisticianId: string
): Promise<void> {
  const assignment = await db.assignment.findFirst({
    where: { projectId, statisticianId, isActive: true },
  });
  if (!assignment) {
    throw new ApiError('NOT_ASSIGNED', 'You are not assigned to this project.', 403);
  }
}
```

### File Upload Rules

```ts
const ALLOWED_ANALYSIS_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/octet-stream', // SPSS .sav files
  'text/x-r-source',
  'application/zip',
];
const MAX_ANALYSIS_FILE_SIZE = 200 * 1024 * 1024; // 200MB
```

### Versioning Logic

```ts
// On new upload: mark previous files of same category as is_current = false
await db.$transaction([
  db.analysisFile.updateMany({
    where: { projectId, fileCategory: data.fileCategory, isCurrent: true },
    data: { isCurrent: false },
  }),
  db.analysisFile.create({
    data: { ...data, version: prevVersion + 1, isCurrent: true },
  }),
]);
```

---

## 5. Page Views

| Page | Route | Role | Description |
|---|---|---|---|
| Workbench | `/dashboard/statistician/projects/:id/workbench` | Statistician | SOW scope panel, file upload zone, version history table, scope creep flag button, submit for QA button |
| QA File Viewer | `/dashboard/qa/projects/:id/files` | Senior QA Lead | Read-only file list with download links |
| Admin File Viewer | `/dashboard/admin/projects/:id/analysis` | Admin, CEO | All versions, read-only |

---

## 6. Seed Data Requirements

```ts
const seedAnalysisFiles = [
  {
    projectIntakeId:  'JAXIS-202608-0001',
    statisticianEmail: 'stat@jaxis.dev',
    fileName:          'regression_output_v1.xlsx',
    fileCategory:      'EXCEL_WORKBOOK',
    version:           1,
    isCurrent:         false,
    notes:             'Initial regression run — pending review of outliers.',
  },
  {
    projectIntakeId:  'JAXIS-202608-0001',
    statisticianEmail: 'stat@jaxis.dev',
    fileName:          'regression_output_v2_corrected.xlsx',
    fileCategory:      'EXCEL_WORKBOOK',
    version:           2,
    isCurrent:         true,
    notes:             'Outliers addressed. Regression + ANOVA complete.',
  },
];
```

---

### 🎯 Expected Output (What you should be able to do now)

- [x] **Statistician Analysis Workspace:** Assigned Statistician can access client datasets, research objectives, and locked SOW scope terms.
- [x] **Versioned Output File Uploads:** Statistician can upload statistical script files (SPSS `.sav`/`.spv`, R scripts, Python notebooks, Excel tables, draft reports) with auto-incrementing versions.
- [x] **Permanent Version History:** Prior versions are preserved (`isCurrent = false`), timestamped, and auditable.
- [x] **Scope Creep Flagging (RULE_QUO_03):** Statistician can flag out-of-scope requests, immediately halting work (`SCOPE_CREEP_HALTED`) and prompting Admin for a supplemental quote.
- [x] **One-Way Submit for QA:** Statistician can submit complete analysis package, advancing status to `FOR_QA` and locking workbench uploads during QA evaluation.


## 7. Acceptance Criteria (Done Checklist)

### Uploads & Versioning
- [x] Statistician can upload an analysis file to their assigned project
- [x] Non-assigned Statistician gets 403
- [x] Uploading a second file in the same category: prior file `isCurrent = false`, new file `version = prevVersion + 1`, `isCurrent = true`
- [x] All versions remain accessible (no deletion)
- [x] File > 200MB → 422
- [x] Invalid MIME → 422

### Scope Creep
- [x] Statistician can flag scope creep → project → `SCOPE_CREEP_HALTED`
- [x] Further uploads blocked while in `SCOPE_CREEP_HALTED`
- [x] `ScopeCreepLog` record created with reason and timestamp
- [x] Admin can resolve scope creep (after supplemental quote accepted): project → `IN_PROGRESS`

### Submit for QA
- [x] Statistician can submit for QA → project → `FOR_QA`
- [x] After submission, Statistician upload button disabled
- [x] After QA rejection, project → `QA_REVISION` → back to `IN_PROGRESS`; Statistician can upload again
- [x] Cannot submit for QA if no files have been uploaded

### Access
- [x] QA Lead can view and download analysis files (read-only)
- [x] Admin can view and download all versions (read-only)
- [x] Client cannot access analysis files at any point → 403

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 warnings/errors
- [x] `npm run build` → clean
