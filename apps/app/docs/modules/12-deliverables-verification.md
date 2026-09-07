# JAXIS — Module 12: Deliverables, Release & Revisions Verification Report

**Module Code:** `12-deliverables`  
**Domain:** Operations / Delivery & Client Experience  
**Status:** ✅ Completed & Formally Verified  
**Date:** August 29, 2026  
**Quality Gates Passed:** `check-types` (0 errors), `lint` (0 warnings/errors), `seed` (clean)

---

## 1. Executive Summary

Module 12 establishes JAXIS StatLab's institutional **Final Deliverables Packaging, Dual-Gate Release, and Client Revision Engine**. It provides administrators and statisticians with packaging desks to compile statistical tables, manuscript reports, cleaned datasets, and appendices, while enforcing strict dual-gate clearance rules before client release.

The module enforces core institutional guardrails:
- **`RULE_REL_01` (Financial Clearance Gate)**: Final release is strictly blocked if the project has an outstanding balance (`paymentStatus !== FULLY_PAID` or balance $> 0$).
- **`RULE_REL_02` (Quality Assurance Clearance Gate)**: Advanced/Tier 2 packages (`JX_03_CORE`, `JX_04_ADVANCED`) strictly require Senior QA Lead sign-off (`qaApproved === true`) before final release.
- **Packaging Gate**: At least 1 deliverable asset must be packaged before authorizing release.
- **Automated Compliance Timestamps on Release**:
  - `deliveredAt`: Instant timestamp when final release is authorized.
  - `filesPurgeAt`: Calculated to exactly `deliveredAt + 90 days` for archival data retention compliance.
  - `revisionWindowExpiresAt`: Calculated to `deliveredAt + 3 Philippine business days` (skipping Saturdays, Sundays, and 17 statutory Philippine holidays).
- **Secure Cloud Storage Downloads**: Pre-signed Cloudflare R2 / S3 download URLs generated on demand with strict client-ownership verification and download counters.
- **Client 3-Day Included Revision Window**: Active countdown banner with days/hours remaining and form submission for 1 included round of scope adjustments.
- **Administrative Revision Triage Desk**: Dedicated queue for auditing revision requests and classifying items into `INCLUDED` (free adjustment routed to Lead Statistician), `METHODOLOGY_CHANGE` (supplemental SOW required), or `NEW_PAID_WORK` (supplemental quotation required).

---

## 2. Architecture & Data Model Verification

### 2.1 Prisma Schema Models (`prisma/schema.prisma`)

```prisma
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

enum RevisionStatus {
  PENDING_REVIEW
  INCLUDED
  METHODOLOGY_CHANGE
  NEW_PAID_WORK
  RESOLVED
  CANCELLED
}

model Deliverable {
  id              String              @id @default(cuid())
  projectId       String
  category        DeliverableCategory
  fileName        String
  filePath        String              // R2 storage key
  fileSize        Int                 // bytes
  fileType        String              // mime type
  uploadedBy      String              // User id
  isFinalReleased Boolean             @default(false)
  releasedAt      DateTime?
  releasedBy      String?             // Admin userId
  downloadCount   Int                 @default(0)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  project         Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  uploader        User                @relation("DeliverableUploader", fields: [uploadedBy], references: [id], onDelete: Cascade)
  releaser        User?               @relation("DeliverableReleaser", fields: [releasedBy], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@index([category])
  @@index([isFinalReleased])
  @@index([uploadedBy])
  @@map("deliverables")
}

model RevisionRequest {
  id                      String                  @id @default(cuid())
  projectId               String
  clientId                String
  description             String
  requestedSections       String?
  status                  RevisionStatus          @default(PENDING_REVIEW)
  classification          RevisionClassification?
  classificationNotes     String?
  classifiedBy            String?                 // Admin userId
  classifiedAt            DateTime?
  supplementalQuotationId String?
  supplementalSowId       String?
  resolvedAt              DateTime?
  createdAt               DateTime                @default(now())
  updatedAt               DateTime                @updatedAt

  project                 Project                 @relation(fields: [projectId], references: [id], onDelete: Cascade)
  client                  User                    @relation("ClientRevisionRequests", fields: [clientId], references: [id], onDelete: Cascade)
  classifier              User?                   @relation("ClassifiedRevisions", fields: [classifiedBy], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@index([clientId])
  @@index([status])
  @@index([createdAt])
  @@map("revision_requests")
}
```

---

## 3. Implemented Components & Feature Matrix

| Feature | File Location | Description |
|---|---|---|
| **Delivery Rules Engine** | `src/lib/delivery-rules.ts` | Dual release gate assertions (`assertReleaseEligibility`), holiday-skipping revision window calculator, 90-day archive purge deadline, and metadata constants. |
| **Server Actions & Schemas** | `src/features/deliverables/actions.ts`, `src/features/deliverables/schemas.ts` | `getAdminDeliverablesDesk`, `uploadDeliverable`, `deleteDeliverable`, `releaseDeliverables`, `getClientDeliverables`, `getDeliverableDownloadUrl`, `submitClientRevision`, `getAdminRevisionQueue`, `classifyRevision`. |
| **Admin Deliverables Packaging Desk** | `src/features/deliverables/components/AdminDeliverablesDesk.tsx`, `app/dashboard/admin/projects/[id]/deliverables/page.tsx` | Live Dual Gate checklist, asset upload modal with category selection, packaged file table with download test and delete actions, release modal, and revision history. |
| **Client Deliverables Portal** | `src/features/deliverables/components/ClientDeliverablesDesk.tsx`, `app/dashboard/client/projects/[id]/deliverables/page.tsx` | Under-packaging status notice, 3-day revision window countdown banner, 90-day retention notice, 1-click download cards, and revision inquiry log. |
| **Client Revision Request Desk** | `src/features/deliverables/components/ClientRevisionForm.tsx`, `app/dashboard/client/projects/[id]/revision/page.tsx` | Active window validation, scope guidelines, character counter, affected sections input, and submission workflow. |
| **Admin Revision Triage Queue** | `src/features/deliverables/components/AdminRevisionQueue.tsx`, `app/dashboard/admin/revisions/page.tsx` | Triage table with filter tabs (All, Pending Triage, Classified), and interactive classification modal for scope boundary routing. |
| **Navigation & Toolbars** | `Sidebar.tsx`, `client/projects/[id]/page.tsx`, `admin/projects/[id]/page.tsx` | Added "Client Revisions" to Admin sidebar, activated "Final Files & Outputs" in Client sidebar, and added direct links to deliverables desks across study workspaces. |

---

## 4. Verification Checkpoints

### 4.1 Dual Release Gate Validation
1. **Financial Lockout (`RULE_REL_01`)**: When a project has an unpaid balance, `assertReleaseEligibility` marks the financial gate as failed and blocks final release with an explicit balance due warning.
2. **QA Approval Lockout (`RULE_REL_02`)**: Tier 2 studies (`JX_03_CORE`, `JX_04_ADVANCED`) without QA sign-off are blocked from release until the Senior QA Lead approves the analysis.
3. **Packaging Assertion**: Attempts to release an empty package are rejected with a prompt to upload at least one deliverable file.

### 4.2 Release Execution & Automatic Timestamps
1. Administrator clicks **Authorize & Release to Client** in `/dashboard/admin/projects/[id]/deliverables`.
2. Atomic database transaction marks all deliverables as released (`isFinalReleased = true`, `releasedAt`, `releasedBy`), transitions project status to `DELIVERED`, computes `deliveredAt` (current timestamp), `filesPurgeAt` (90 days forward), and `revisionWindowExpiresAt` (3 business days skipping weekends and PH holidays).

### 4.3 Client Download & Revision Flow
1. Client logs in, navigates to `/dashboard/client/projects/[id]/deliverables`, and views active 3-day countdown timer (`2d 14h remaining`).
2. Client clicks **Download File** to securely retrieve reports and Excel workbooks via pre-signed Cloudflare R2 URLs.
3. Client clicks **Request Included Revision**, fills out the form at `/dashboard/client/projects/[id]/revision`, and submits specific adjustment requests.
4. Study transitions to `REVISION_REQUESTED` and appears immediately on the Admin Triage Desk.

### 4.4 Admin Revision Classification
1. Administrator opens `/dashboard/admin/revisions` and selects **Triage & Classify**.
2. Administrator chooses **Included Revision** (routes back to Lead Statistician), **Methodology Change** (prompts supplemental SOW), or **New Paid Scope** (prompts supplemental quote), enters triage notes, and saves.

---

## 5. Quality Gate Summary

```bash
# Type Checking across all workspace packages
npm run check-types
# Result: 0 errors

# ESLint verification
npm run lint
# Result: 0 warnings, 0 errors

# Database Seeding
npx tsx prisma/seed.ts
# Result: Seeded draft deliverables and released study JAXIS-202608-0002 with revision request
```

**Status:** Formally closed and verified. Ready to proceed to the next module in `apps/app/TASKS.md`.
