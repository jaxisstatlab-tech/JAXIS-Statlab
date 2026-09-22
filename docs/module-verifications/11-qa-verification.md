# JAXIS — Module 11: Quality Assurance & Reproducibility Verification Report

**Module Code:** `11-qa`  
**Domain:** Operations / Quality Assurance  
**Status:** ✅ Completed & Formally Verified  
**Date:** August 29, 2026  
**Quality Gates Passed:** `check-types` (0 errors), `lint` (0 warnings/errors), `seed` (clean)

---

## 1. Executive Summary

Module 11 establishes JAXIS StatLab's institutional **Quality Assurance & Dual-Blind Reproducibility Engine**. It provides Senior QA Leads with dedicated evaluation desks to review statistical models, re-execute computational scripts against raw datasets, verify APA 7th formatting, and issue authoritative scorecard verdicts.

The module enforces strict corporate guardrails:
- **`RULE_REL_02` (Tier 2 QA Release Clearance Gate)**: Advanced packages (`JX_03_CORE`, `JX_04_ADVANCED`) require explicit `qaApproved = true` before deliverables can be packaged.
- **`RULE_ETH_01` (Emergency Ethical Breach Lockout)**: Immediate study lockout (`ETHICAL_BREACH`, `isLocked = true`) upon detection of data fabrication or p-hacking, alerting the CEO desk.
- **24-Hour Revision Turnaround Clock**: Automated countdown deadline (`qaRevisionDueAt`) for statisticians when revisions are requested.
- **Repeated Rejection Warning Matrix**: Tracks cumulative rejections (`QARejectionCount`) and flags specialists to administrators when count $\ge 2$.
- **Client-Facing Status Masking**: Internal QA states (`FOR_QA`, `QA_REVISION`, `ETHICAL_BREACH`) are masked as `IN_PROGRESS` to ensure seamless client experience.

---

## 2. Architecture & Data Model Verification

### 2.1 Prisma Schema Models (`prisma/schema.prisma`)

```prisma
enum QADecision {
  QA_APPROVED
  QA_REJECTED
  ESCALATED_TO_CEO
}

enum ErrorClassification {
  MINOR
  MAJOR
  CRITICAL
  ETHICAL_BREACH
}

model QAReview {
  id                  String               @id @default(cuid())
  projectId           String
  reviewerId          String               // Senior QA Lead userId
  decision            QADecision
  errorClassification ErrorClassification?
  comments            String               // Scorecard notes and correction requirements
  qaRevisionDueAt     DateTime?            // Set on rejection: now() + 24 hours
  reviewedAt          DateTime             @default(now())

  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  reviewer User    @relation("QAOfficerReviews", fields: [reviewerId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([reviewerId])
  @@index([decision])
  @@index([reviewedAt])
  @@map("qa_reviews")
}

model QARejectionCount {
  id             String   @id @default(cuid())
  projectId      String
  statisticianId String
  count          Int      @default(1)
  lastRejectedAt DateTime @default(now())

  project      Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  statistician User    @relation("StatisticianQARejections", fields: [statisticianId], references: [id], onDelete: Cascade)

  @@unique([projectId, statisticianId])
  @@index([projectId])
  @@index([statisticianId])
  @@map("qa_rejection_counts")
}
```

---

## 3. Implemented Components & Feature Matrix

| Feature | File Location | Description |
|---|---|---|
| **QA Business Rules & Assertions** | `src/lib/qa-rules.ts` | Assignment checks (`assertQaLeadAssigned`), status gate (`assertCanSubmitQaReview`), 24-hr revision deadline calculator, client status masking. |
| **Server Actions & Zod Schemas** | `src/features/qa/actions.ts`, `src/features/qa/schemas.ts` | `getQaQueue`, `getQaInspectionDesk`, `submitQaReview`, `getQaReviewHistory`, `getCeoEscalations`, `getAdminQaRejectionWarnings`. |
| **QA Lead Dashboard & Queue** | `app/dashboard/qa/page.tsx` | Telemetry cards (Pending QA, Under Revision, Cleared, Urgent SLA) and direct links to the Evaluation Desk. |
| **QA Evaluation Desk UI** | `src/features/qa/components/QAEvaluationDesk.tsx`, `app/dashboard/qa/projects/[id]/review/page.tsx` | Master-detail inspection desk: SOW reference, raw dataset downloads, versioned output files, quick feedback templates, and scorecard decision form. |
| **CEO Ethical Escalation Desk** | `app/dashboard/ceo/escalations/page.tsx` | Emergency executive queue for `RULE_ETH_01` lockouts with full evidence inspection. |
| **Workbench Revision Alert** | `src/features/analysis/components/AnalysisWorkbenchDesk.tsx` | High-visibility amber banner alerting statistician to 24-hr revision cycle with scorecard notes. |

---

## 4. Verification Checkpoints

### 4.1 Senior QA Lead Review Flow
1. QA Lead views assigned study in `FOR_QA` status on `/dashboard/qa`.
2. 1-Click navigation to `/dashboard/qa/projects/[id]/review`.
3. Downloads raw client datasets and current working scripts/workbooks for independent dual-blind calculations.
4. Selects **Approve Study**: Updates `masterStatus` to `DELIVERED`, sets `qaApproved = true`, and records timestamped `QAReview`.

### 4.2 Statistician 24-Hour Revision Flow
1. QA Lead selects **Require Revisions**, specifies `ErrorClassification` (`MINOR`, `MAJOR`, or `CRITICAL`), and enters required adjustments.
2. Server action transitions study to `QA_REVISION`, calculates `qaRevisionDueAt` (24 hours), and increments `QARejectionCount`.
3. Statistician opens workbench (`/dashboard/statistician/projects/[id]/workbench`), sees the 24-hour revision countdown and QA notes, uploads corrected file `v2`, and resubmits to QA.

### 4.3 CEO Ethical Breach Intervention (`RULE_ETH_01`)
1. QA Lead selects **Ethical Breach** (`ETHICAL_BREACH` classification).
2. Project is locked immediately (`isLocked = true`, `masterStatus = ETHICAL_BREACH`).
3. Chief Executive Officer views case in `/dashboard/ceo/escalations` with full evidence transcript.

---

## 5. Quality Gate Summary

```bash
# Type Checking across all 5 workspace packages
npm run check-types
# Result: 3 successful, 3 total (0 errors)

# ESLint verification
npm run lint
# Result: 3 successful, 3 total (0 warnings, 0 errors)
```

**Status:** Ready to advance to **Module 12: Deliverables, Release & Revisions**.
