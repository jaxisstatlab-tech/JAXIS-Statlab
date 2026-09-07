# JAXIS — Module 12: Deliverables, Release & Revisions

**Module Code:** `12-deliverables`\
**Domain:** Deliverables + Revisions\
**Depends On:** `11-qa`\
**Blocks:** `14-finance`

---

## 1. Module Identity

- **Primary Objective:** Admin uploads finalized output files and releases them to the client — gated on full payment (RULE_REL_01) and QA approval for Tier 2 (RULE_REL_02). After delivery, the client may request one included revision within 3 business days. Admin classifies: included, methodology change, or new paid work.
- **Core Responsibilities:** `Deliverable` model, dual release gate, pre-signed download URLs, 90-day purge timestamp, `RevisionRequest` model, 3-day revision window, revision classification routing.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `DLV-F01` | **Deliverable upload** — Admin uploads finalized output files to the project |
| `DLV-F02` | **Release trigger** — Admin triggers release; both RULE_REL_01 and RULE_REL_02 gates enforced |
| `DLV-F03` | **RULE_REL_01** — `payment_status !== FULLY_PAID` → 402 hard block; no exceptions |
| `DLV-F04` | **RULE_REL_02** — Tier 2 package AND QA not approved → 403 hard block; no exceptions |
| `DLV-F05` | **Client download** — Pre-signed R2/S3 URL; available only after `is_final_released = true` |
| `DLV-F06` | **90-day purge timestamp** — `files_purge_at = delivered_at + 90 days` set on project at release |
| `DLV-F07` | **Revision window** — `revision_window_expires_at = delivered_at + 3 business days` |
| `DLV-F08` | **Revision request** — Client submits revision within window; 422 if window expired |
| `DLV-F09` | **Revision classification** — Admin classifies: `INCLUDED`, `METHODOLOGY_CHANGE`, `NEW_PAID_WORK` |
| `DLV-F10` | **Included revision routing** — Project → `REVISION_REQUESTED` → Statistician → `IN_PROGRESS` |
| `DLV-F11` | **Scope revision routing** — `METHODOLOGY_CHANGE` → supplemental SOW required |
| `DLV-F12` | **New work routing** — `NEW_PAID_WORK` → new intake or supplemental quote |
| `DLV-F13` | **Project closure** — After successful delivery + no revision within window → status → `CLOSED`; Finance payout eligibility unlocked |
| `DLV-F14` | **Revision window countdown** — Client sees remaining days to request revision |
| `DLV-F15` | **Multiple deliverable files** — Admin can upload multiple files per project (e.g., SPSS output + PDF report) |
| `DLV-F16` | **Real-time notification dispatching** — Automatically alerts client and team on deliverable upload, dual-gate release, client revision request, and warranty classification via `dispatchRealtimeNotification` |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Unlimited revisions | Policy: 1 included revision per SOW |
| Client choosing deliverable format | Format defined in SOW |
| Client uploading to their own deliverable | Admin-controlled upload only |
| Payout disbursement | Module 14 |



---

## 3. Database Schema

```prisma
model Deliverable {
  id               String   @id @default(cuid())
  projectId        String
  fileName         String
  filePath         String   // R2/S3 object key
  fileCategory     DeliverableCategory
  isFinalReleased  Boolean  @default(false)
  releasedAt       DateTime?
  releasedBy       String?  // Admin userId
  uploadedBy       String   // Admin userId
  uploadedAt       DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id])

  @@index([projectId])
  @@index([isFinalReleased])
  @@map("deliverables")
}

enum DeliverableCategory {
  STATISTICAL_OUTPUT
  PDF_REPORT
  RAW_DATA_CLEANED
  APPENDIX
  OTHER
}

enum RevisionClassification {
  INCLUDED
  METHODOLOGY_CHANGE
  NEW_PAID_WORK
}

model RevisionRequest {
  id               String                  @id @default(cuid())
  projectId        String
  clientId         String
  description      String
  classification   RevisionClassification?
  classifiedBy     String?                 // Admin userId
  classifiedAt     DateTime?
  revisionWindowExpiresAt DateTime
  createdAt        DateTime                @default(now())

  project Project @relation(fields: [projectId], references: [id])
  client  User    @relation(fields: [clientId], references: [id])

  @@index([projectId])
  @@index([createdAt])
  @@map("revision_requests")
}
```

---

## 4. Release Gate Logic

```ts
// src/lib/delivery-rules.ts
export async function assertReleaseEligible(projectId: string): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      payments:   { orderBy: { createdAt: 'desc' }, take: 1 },
      quotations: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  // RULE_REL_01: Full payment required
  const latestPayment = project?.payments[0];
  if (latestPayment?.paymentStatus !== 'FULLY_PAID') {
    throw new ApiError(
      'PAYMENT_REQUIRED',
      'Deliverables cannot be released until the remaining balance is paid in full.',
      402
    );
  }

  // RULE_REL_02: Tier 2 requires QA approval
  const TIER_2_PACKAGES = ['JX_03_CORE', 'JX_04_ADVANCED'];
  const isTier2 = TIER_2_PACKAGES.includes(project?.packageName ?? '');
  if (isTier2 && !project?.qaApproved) {
    throw new ApiError(
      'QA_APPROVAL_REQUIRED',
      'Deliverables for Tier 2 projects require Senior QA Lead approval before release.',
      403
    );
  }
}
```

---

## 5. API Routes

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/deliverables/upload` | ADMIN, CEO | Upload deliverable files |
| `PATCH` | `/api/v1/deliverables/:id/release` | ADMIN, CEO | Trigger release (both gates enforced) |
| `GET` | `/api/v1/deliverables/:projectId/download` | CLIENT | Pre-signed download URL (post-release only) |
| `GET` | `/api/v1/deliverables/:projectId` | ADMIN, CEO, CLIENT | List deliverables (client sees only if released) |
| `POST` | `/api/v1/revisions` | CLIENT | Submit revision request (window enforced) |
| `PATCH` | `/api/v1/revisions/:id/classify` | ADMIN, CEO | Classify revision |
| `GET` | `/api/v1/admin/revisions` | ADMIN, CEO | All pending revision requests |

---

## 6. Page Views

| Page | Route | Role | Description |
|---|---|---|---|
| Deliverable Upload | `/dashboard/admin/projects/:id/deliverables` | Admin, CEO | Upload panel + gate status indicators (payment ✓/✗, QA ✓/✗) + release button |
| Client Download | `/dashboard/client/projects/:id/deliverables` | Client | Download buttons (active) or "Pending Release" placeholder |
| Revision Form | `/dashboard/client/projects/:id/revision` | Client | Request form + window expiry countdown |
| Revision Queue | `/dashboard/admin/revisions` | Admin, CEO | Classification queue with project context |

---

## 7. Seed Data Requirements

```ts
const seedDeliverables = [
  {
    projectIntakeId: 'JAXIS-202608-0001',
    fileName:        'statistical_output_final.xlsx',
    fileCategory:    'STATISTICAL_OUTPUT',
    isFinalReleased: true,
    releasedAt:      new Date('2026-08-16T11:00:00Z'),
  },
  {
    projectIntakeId: 'JAXIS-202608-0001',
    fileName:        'research_analysis_report.pdf',
    fileCategory:    'PDF_REPORT',
    isFinalReleased: true,
    releasedAt:      new Date('2026-08-16T11:00:00Z'),
  },
];
```

---

### 🎯 Expected Output (What you should be able to do now)

- [x] **Final Deliverable Bundling:** Admin can upload finalized statistical reports, APA tables, and datasets to the deliverable package.
- [x] **Dual Release Enforcement:** Release trigger enforces `paymentStatus === FULLY_PAID` (RULE_REL_01) and QA approval for Tier 2 packages (RULE_REL_02).
- [x] **Secure Client Download:** Client can download final deliverables via pre-signed storage URLs once released.
- [x] **3-Day Revision Clock:** Client dashboard displays a 3-business-day countdown window for submitting the 1 included revision request.
- [x] **Revision Triage & Routing:** Admin classifies client revision requests: `INCLUDED` (routes back to Statistician), `METHODOLOGY_CHANGE` (supplemental SOW), or `NEW_PAID_WORK`.
- [x] **Project Completion & Closure:** Project automatically transitions to `CLOSED` upon revision window expiry, unlocking expert payout calculation in Module 14.
- [x] **Real-Time Delivery & Revision Alerts:** Instant notifications dispatched across connected sessions on output upload, release, revision request, and triage classification.


## 8. Acceptance Criteria (Done Checklist)

### Deliverable Upload & Release
- [x] Admin can upload multiple deliverable files to a project
- [x] Release blocked if `payment_status !== FULLY_PAID` → 402 (RULE_REL_01)
- [x] Release blocked for Tier 2 project without QA approval → 403 (RULE_REL_02)
- [x] Both gates pass → `is_final_released = true`; project → `DELIVERED`; `delivered_at` set
- [x] `files_purge_at` = `delivered_at + 90 days` set on project
- [x] `revision_window_expires_at` = `delivered_at + 3 business days` set on project
- [x] Upload and release dispatch real-time in-app alerts to client and assigned team

### Client Download
- [x] Client download returns 403 before release
- [x] Client download returns pre-signed URL after release
- [x] Pre-signed URL expires (e.g., 1 hour); client must re-request

### Revision Request
- [x] Client can submit revision within 3-day window → `RevisionRequest` created
- [x] Client submitting after window expiry → 422 `REVISION_WINDOW_EXPIRED`
- [x] Client can see remaining revision window days on project page
- [x] Admin sees revision in classification queue
- [x] Revision submission dispatches real-time in-app alerts to Admin and Statistician

### Revision Classification
- [x] `INCLUDED` → project → `REVISION_REQUESTED` → Statistician gets `IN_PROGRESS`
- [x] `METHODOLOGY_CHANGE` → supplemental SOW flow triggered
- [x] `NEW_PAID_WORK` → Admin creates new intake or supplemental quote
- [x] Classification decision dispatches real-time in-app alerts to Client with next steps

### Project Closure
- [x] Project auto-closes to `CLOSED` after delivery + no revision within window
- [x] `CLOSED` status unlocks Finance payout eligibility (Module 14)

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 warnings/errors
- [x] `npm run build` → clean
