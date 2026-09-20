# JAXIS StatLab — Real-Time Notification Triggers & Event Engine

This document provides the authoritative operational and technical specification for the **Real-Time Notification Engine** in JAXIS StatLab. It details all event types, role recipient rules, route navigation mapping, server action triggers, and copywriting guidelines.

---

## 1. Engine Architecture & Protocol

### 1.1 Dual-Channel Delivery Model
JAXIS StatLab delivers notifications through a hybrid architecture designed for speed, resilience, and operational clarity:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 Action Handler Trigger                  │
                  │   (e.g., disbursePayslip, fileAttendanceCorrection)     │
                  └───────────────────────────┬─────────────────────────────┘
                                              │
                                              ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │        dispatchRealtimeNotification(options)            │
                  │    • Excludes triggering user (excludeUserId)           │
                  │    • Auto-resolves project members                      │
                  │    • Applies role-specific link routing                 │
                  └───────────────┬─────────────────────────┬───────────────┘
                                  │                         │
            (Async Persistence)   ▼                         ▼   (Real-Time Push)
    ┌───────────────────────────────────────┐     ┌───────────────────────────────────┐
    │     Prisma: db.inAppAlert.createMany   │     │  notificationBus.emitNotification │
    │      • Saved to PostgreSQL            │     │   • Server-Sent Events (SSE)      │
    │      • Read by notification panel     │     │   • Instant 0ms browser updates   │
    └───────────────────────────────────────┘     └───────────────────────────────────┘
```

1. **In-App Persistent Alerts (`InAppAlert` Database Model)**:
   - Persisted to PostgreSQL under `inAppAlert`.
   - Surfaces in the desktop/mobile notification drawer, unread count chip, and live pulse beacons.
   - Preserves historical operational audit trails.
2. **Real-Time Event Stream (`SSE` & In-Memory Event Bus)**:
   - Emitted via `notificationBus.emitNotification` to connected browser sessions (`/api/v1/notifications/stream`).
   - Accompanied by a 15-second background polling fallback to guarantee delivery during network changes or tab restores.
3. **Transactional Emails (`Resend` / `SendGrid`)**:
   - Sent exclusively for formal external milestones (e.g. SOW ready, payment verified, final deliverables released).
   - Internal staff adjustments (QA states, attendance corrections, payroll batches) remain strictly in-app to avoid inbox fatigue.

### 1.2 Non-Blocking Fire-and-Forget Dispatch
To preserve snappy (<50ms) user action responsiveness, `dispatchRealtimeNotification` runs asynchronously via `Promise.allSettled`. If a notification write fails or encounters a transient database timeout, the triggering business mutation (e.g. attendance approval or payslip disbursement) completes successfully without throwing an error to the user.

---

## 2. Notification Event Types Catalog

| Event Type | Category | Description | Primary Recipients |
|---|---|---|---|
| `STATUS_UPDATE` | Lifecycle | General study status advancement | Client, Assigned Team, Admin |
| `NEW_INTAKE` | Client Intake | Client submits a new research study intake | Admin, CEO |
| `INPUT_UPDATE` | Data Inputs | Datasets or research instruments uploaded / info requested | Client, Lead Statistician, QA Lead |
| `COMMERCIAL_UPDATE` | Contracts | Proposal issued, accepted, or SOW signed | Client, Finance Officer, Admin |
| `PAYMENT_UPDATE` | Financial | Payment proof submitted, verified, rejected, or escrow gate unlocked | Finance Officer, Admin, Client |
| `ASSIGNMENT` | Staffing | Lead Statistician / Senior QA Lead assigned or reassigned | Lead Statistician, Senior QA Lead, Client, Admin |
| `OUTPUT_UPDATE` | Analysis | Statistician uploads draft outputs or R scripts for QA | Senior QA Lead, Admin |
| `QA_DECISION` | Quality Audit | Study submitted to QA, approved, rejected, or escalated | Lead Statistician, Client, Admin, CEO |
| `DELIVERABLE_UPDATE` | Delivery | Final deliverable files packaged and released | Client, Assigned Team, Finance, Admin |
| `REVISION_REQUEST` | Warranty | Client files revision request / Admin classifies warranty | Admin, Lead Statistician, Client |
| `DISPUTE` | Governance | Academic dispute opened, investigated, or resolved | Admin, Finance Officer, CEO, Client |
| `DATA_PURGE` | Security | 90-day retention countdown and dataset purge notifications | Client, Admin |
| `PAYROLL_UPDATE` | Staff & HR | Batch payslips generated, custom rates saved, or salary disbursed | Staff Member, Finance Officer, CEO, Admin |
| `ATTENDANCE_UPDATE` | Labor & HR | Duty policy changes, punch corrections filed/reviewed | Staff Member, Admin, Finance Officer |
| `DEFENSELAB_UPDATE` | Rehearsal | Mock defense booked, rescheduled, link added, or completed | Client, Lead Statistician, Admin |
| `MESSAGE_ALERT` | Collaboration| New message delivered in research consultation channel | Client, Lead Statistician, QA Lead, Admin |
| `SECURITY_ALERT` | Compliance | Communication firewall blocks off-platform contact info | Admin, CEO |
| `SLA_ALERT` | Operations | SLA clock pause requested, approved, declined, or resumed | Lead Statistician, Senior QA Lead, Admin, CEO |
| `SYSTEM_ALERT` | Maintenance| System health warnings, storage quotas, or maintenance | Admin, CEO |

---

## 3. Role-by-Role Notification Coverage Matrix

### 3.1 Client (`CLIENT`)
The Client portal focuses on transparency, contractual clarity, and timely access to research outputs:

| Trigger Event | Source Action | Notification Title | User Impact | Deep Link Destination |
|---|---|---|---|---|
| Quotation Ready | `createQuotation` | Quote Ready for Review | Client can review pricing and deliverables | `/dashboard/client/projects/[id]` |
| SOW Ready | `generateSow` | Research Contract Ready | Client reviews and signs Statement of Work | `/dashboard/client/projects/[id]/sow` |
| Payment Verified | `verifyPayment` | Payment Confirmed | Project activates; team assignment begins | `/dashboard/client/projects/[id]` |
| Team Assigned | `assignExperts` | Research Team Assigned | Lead Statistician & QA Lead assigned to study | `/dashboard/client/projects/[id]` |
| New Message | `sendMessage` | New Consultation Message | Specialist sent an update or inquiry | `/dashboard/client/projects/[id]/consultation` |
| Deliverables Released | `releaseDeliverables` | Deliverables Released | Final files available for download | `/dashboard/client/projects/[id]/deliverables` |
| DefenseLab Meeting Link | `updateDefenseLabMeetingLink`| DefenseLab Link Ready | Video meeting link added for mock defense | `/dashboard/client/defenselab` |
| DefenseLab Rescheduled | `rescheduleDefenseLabSession`| Session Rescheduled | Updated schedule for mock defense rehearsal | `/dashboard/client/defenselab` |
| Dispute Ruled | `resolveDispute` | Dispute Decision Issued | Formal ruling and resolution from leadership | `/dashboard/client/disputes` |

---

### 3.2 Lead Statistician (`STATISTICIAN`)
Specialists receive operational alerts about project allocations, review decisions, and compensation:

| Trigger Event | Source Action | Notification Title | User Impact | Deep Link Destination |
|---|---|---|---|---|
| New Assignment | `assignExperts` | Assigned to Research Study | Work begins; SLA clock starts ticking | `/dashboard/statistician/projects/[id]/workbench` |
| Reassignment | `reassignExperts` | Reassigned to Study | Takes over study with specified reason | `/dashboard/statistician/projects/[id]/workbench` |
| QA Decision | `submitQaReview` | QA Decision Received | Audit verdict (Approved or Revision Needed) | `/dashboard/statistician/projects/[id]/workbench` |
| Consultation Message | `sendMessage` | New Consultation Message | Client or QA lead sent an update | `/dashboard/statistician/projects/[id]/workbench` |
| DefenseLab Rehearsal | `bookDefenseLabSession` | Mock Defense Booked | Client booked a rehearsal for assigned study | `/dashboard/statistician/projects/[id]` |
| SLA Timer Paused | `approveSlaPause` | SLA Timer Paused | Administrative approval to pause study clock | `/dashboard/statistician/projects/[id]/workbench` |
| SLA Timer Resumed | `resumeSla` | SLA Timer Resumed | Study clock resumed with updated target date | `/dashboard/statistician/projects/[id]/workbench` |
| Punch Correction Reviewed | `reviewAttendanceCorrection`| Punch Correction Status | Approval or decline of attendance adjustment | `/dashboard/statistician` |
| Payslip Ready | `generateBatchPayslips` | New Payslip Ready | Cycle payslip available with itemized studies | `/dashboard/statistician` |
| Salary Disbursed | `disbursePayslip` | Salary Payment Sent | Payout transferred via bank/GCash with ref no. | `/dashboard/statistician` |
| Custom Rate Saved | `saveStaffCompensationOverride`| Custom Pay Rate Updated | Leadership customized deliverable or hourly rates | `/dashboard/statistician` |

---

### 3.3 Senior QA Lead (`SENIOR_QA_LEAD`)
The QA Lead oversees verification gates, file auditing, and methodology compliance:

| Trigger Event | Source Action | Notification Title | User Impact | Deep Link Destination |
|---|---|---|---|---|
| Assigned as QA Lead | `assignExperts` | Assigned as Senior QA Lead | Monitor incoming files and methodology | `/dashboard/qa/projects/[id]` |
| Outputs Uploaded | `uploadAnalysisFile` | New Outputs for Review | Statistician uploaded draft reports or code | `/dashboard/qa/projects/[id]/files` |
| Consultation Message | `sendMessage` | New Consultation Message | Dialogue regarding datasets or methodology | `/dashboard/qa/projects/[id]` |
| Revision Requested | `submitRevisionRequest` | Revision Requested | Client requested changes to study files | `/dashboard/qa/projects/[id]` |
| Duty Policy Updated | `updateCompanyAttendancePolicy`| Duty Policy Updated | Update to break rules, core hours, or cap | `/dashboard/qa` |
| Payslip Ready | `generateBatchPayslips` | New Payslip Ready | Retainer and QA audit commissions calculated | `/dashboard/qa` |
| Salary Disbursed | `disbursePayslip` | Salary Payment Sent | Net earnings disbursed to registered account | `/dashboard/qa` |

---

### 3.4 Finance Officer (`FINANCE_OFFICER`)
Finance manages escrow vaults, billing verifications, and batch payroll generation:

| Trigger Event | Source Action | Notification Title | User Impact | Deep Link Destination |
|---|---|---|---|---|
| Payment Proof Uploaded | `submitPaymentProof` | Payment Proof Uploaded | Client submitted deposit or final payment slip | `/dashboard/finance/payments` |
| Escrow Gate Unlocked | `releaseDeliverables` | Escrow Release Gate Unlocked | Deliverables out; escrow cleared for staff payout | `/dashboard/finance` |
| SOW Signed | `signSow` | Contract Signed | Binding contract executed; invoice active | `/dashboard/finance` |
| Punch Correction Filed | `fileAttendanceCorrection` | Attendance Correction Requested | Staff submitted missed punch for verification | `/dashboard/finance` |
| Payroll Schedule Changed | `saveCompanyPayrollSchedule` | Payroll Schedule Updated | Cutoff rules or settlement frequency changed | `/dashboard/finance/payroll` |
| Role Rates Changed | `saveRoleCompensationConfig` | Pay Rates Updated | CEO adjusted role baseline compensation | `/dashboard/finance/payroll` |
| Batch Payslips Generated | `generateBatchPayslips` | Batch Payslips Generated | Itemized payslips calculated for current cycle | `/dashboard/finance/payroll` |
| Dispute Opened | `openDispute` | Dispute Opened | Escrow holds applied pending arbitration | `/dashboard/finance/disputes` |

---

### 3.5 Operations Administrator (`ADMIN`)
Operations triage studies, assign specialists, manage SLAs, and enforce safety:

| Trigger Event | Source Action | Notification Title | User Impact | Deep Link Destination |
|---|---|---|---|---|
| New Intake Submitted | `createProject` | New Study Intake | Triage intake details and generate quotation | `/dashboard/admin/intake` |
| Firewall Breach | `sendMessage` | Firewall Alert: Contact Info | User attempted to share phone/email/links | `/dashboard/admin/projects/[id]` |
| SLA Pause Requested | `requestSlaPause` | SLA Clock Pause Requested | Specialist needs clock paused due to client delay | `/dashboard/admin/assignments` |
| Punch Correction Filed | `fileAttendanceCorrection` | Attendance Correction Requested | Staff attendance requires administrative review | `/dashboard/admin` |
| Mock Defense Booked | `bookDefenseLabSession` | Mock Defense Booked | Coordinate video bridge and specialist schedule | `/dashboard/admin/defenselab` |
| Session Rescheduled | `rescheduleDefenseLabSession`| Session Rescheduled | Calendar adjusted or late penalty applied | `/dashboard/admin/defenselab` |
| Misconduct Escalated | `submitQaReview` | Academic Misconduct Flagged | Urgent review of ethical or fabrication issue | `/dashboard/admin/projects/[id]` |
| Revision Request Filed | `submitRevisionRequest` | Revision Requested | Classify warranty scope vs. out-of-scope bill | `/dashboard/admin/projects/[id]/deliverables` |

---

### 3.6 Chief Executive Officer (`CEO`)
The executive office monitors strategic health, arbitrates disputes, and authorizes payroll:

| Trigger Event | Source Action | Notification Title | User Impact | Deep Link Destination |
|---|---|---|---|---|
| High-Value Study Intake | `createProject` | New Study Intake | High-tier study entered pipeline | `/dashboard/ceo` |
| Firewall Breach | `sendMessage` | Firewall Alert: Contact Info | Off-platform contact attempt detected | `/dashboard/ceo` |
| Batch Payslips Ready | `generateBatchPayslips` | Batch Payslips Generated | Executive review of total institutional payroll | `/dashboard/ceo/payroll` |
| Salary Disbursed | `disbursePayslip` | Staff Payment Disbursed | Staff member was marked paid in ledger | `/dashboard/ceo/payroll` |
| Misconduct Escalation | `submitQaReview` | Academic Misconduct Flagged | Executive intervention on serious breach | `/dashboard/ceo/escalations` |
| Academic Dispute Opened | `openDispute` | Formal Dispute Opened | Final arbitration and release decision needed | `/dashboard/ceo/disputes` |
| SLA Pause Requested | `requestSlaPause` | SLA Clock Pause Requested | Operational bottleneck flagged | `/dashboard/ceo` |

---

## 4. Fresh Account Onboarding Notifications by Role

When any new user registers, is provisioned by an administrator, or signs in for the first time with zero existing alerts, the system automatically calls `ensureFreshAccountNotifications(userId, role)`. This guarantees that fresh accounts never open an empty notification drawer and immediately receive clear, role-specific onboarding guidance:

| Role | Alert Type | Notification Message | Quick Action Link |
|---|---|---|---|
| **`CLIENT`** | `SYSTEM_ALERT` | "Welcome to JAXIS StatLab! Submit your research study intake or explore our consulting packages to begin." | `/dashboard/client/projects/new` |
| **`CLIENT`** | `INPUT_UPDATE` | "Complete your school and academic profile so we can pair you with the best statistical specialist." | `/dashboard/client/profile` |
| **`STATISTICIAN`** | `SYSTEM_ALERT` | "Welcome to JAXIS StatLab! Your specialist workbench is ready. Check your assigned studies and duty capacity." | `/dashboard/statistician` |
| **`STATISTICIAN`** | `ATTENDANCE_UPDATE` | "Clock in on your duty clock whenever you work on analysis to log verified duty hours and hourly earnings." | `/dashboard/staff/attendance` |
| **`SENIOR_QA_LEAD`** | `SYSTEM_ALERT` | "Welcome to JAXIS StatLab! Your Senior QA review desk is ready to inspect incoming statistical outputs." | `/dashboard/qa` |
| **`SENIOR_QA_LEAD`** | `QA_DECISION` | "Review methodology guidelines and academic integrity standards for statistical file audits." | `/dashboard/qa` |
| **`FINANCE_OFFICER`**| `SYSTEM_ALERT` | "Welcome to the Finance Desk! Verify payment proofs, monitor escrow releases, and manage staff payroll." | `/dashboard/finance` |
| **`FINANCE_OFFICER`**| `PAYROLL_UPDATE` | "Check corporate settlement cutoffs and verify payment accounts before running batch payroll cycles." | `/dashboard/finance/payroll` |
| **`ADMIN`** | `SYSTEM_ALERT` | "Welcome to Operations Control! Triage new study intakes, manage specialist assignments, and track SLAs." | `/dashboard/admin` |
| **`ADMIN`** | `NEW_INTAKE` | "Review incoming client research proposals and issue formal quotations." | `/dashboard/admin/intake` |
| **`CEO`** | `SYSTEM_ALERT` | "Welcome to the Executive Office. Monitor company revenue, authorize payroll disbursements, and oversee study quality." | `/dashboard/ceo` |
| **`CEO`** | `PAYROLL_UPDATE` | "Set role compensation policies, package deliverable rates, and review company financial health." | `/dashboard/ceo/payroll` |

### Self-Healing & First-Paint Seeding Triggers
* **Registration (`registerClient`)**: Immediately seeds welcome alerts for the new client and alerts Administrators & CEO (`"New Client Registered"`).
* **Staff Creation (`provisionStaff`)**: Immediately seeds role-tailored alerts for the new specialist and alerts Administrators & CEO (`"New Staff Specialist Added"`).
* **User Self-Healing (`resolveOrProvisionUser`)**: When fallback or offline sessions are provisioned in PostgreSQL, onboarding alerts are automatically seeded.
* **First Notification Drawer Paint (`getInAppAlertsAction` & `getUnreadAlertCountAction`)**: If a user's total alert count is zero, onboarding alerts are seeded on-demand before returning data.

---

## 5. API Reference: `dispatchRealtimeNotification`

Exported from `apps/app/src/features/notifications/dispatcher.ts`.

### 5.1 Options Schema
```typescript
export interface DispatchRealtimeNotificationOptions {
  eventType: NotificationEventType;
  projectId?: string;
  intakeId?: string;
  title: string;
  message: string;
  linkUrl?: string;               // Override default role-specific link
  targetRoles?: RoleName[];       // Roles that receive this notification
  targetUserIds?: string[];       // Specific users that receive this notification
  includeProjectParties?: boolean;// Automatically resolves Client, Specialist & QA Lead
  excludeUserId?: string;         // Exclude the actor who performed the action
}
```

### 5.2 Code Example: Dispatching an Attendance Notification
```typescript
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";

// Inside reviewAttendanceCorrection server action
const approved = action === "APPROVE";

try {
  dispatchRealtimeNotification({
    eventType: "ATTENDANCE_UPDATE",
    title: approved ? "Attendance Correction Approved" : "Attendance Correction Declined",
    message: approved
      ? `Your punch correction for ${targetDate} (${claimedHours}h) was approved.`
      : `Your punch correction for ${targetDate} was declined: ${reviewNotes}`,
    targetUserIds: [correction.userId],
    excludeUserId: session.user.id,
  });
} catch (err) {
  console.warn("[reviewAttendanceCorrection] Notification warning:", err);
}
```

### 5.3 Code Example: Dispatching with Automatic Project Resolution
```typescript
// Inside sendMessage server action
try {
  dispatchRealtimeNotification({
    eventType: "MESSAGE_ALERT",
    projectId: project.id,
    title: "New Consultation Message",
    message: `${user.fullName}: ${previewText}`,
    includeProjectParties: true, // Automatically alerts Client, Statistician, QA Lead
    excludeUserId: user.id,      // Never alert the person who sent the message
  });
} catch (err) {
  console.warn("[sendMessage] Notification warning:", err);
}
```

---

## 6. Automatic Lifecycle Synchronization & Fresh Account Onboarding

### 6.1 Project Lifecycle Milestone Auto-Backfill (`ensureProjectLifecycleNotifications`)
When a client logs into their research workspace or opens the Notification drawer, the system automatically validates their active and historical research studies against their database notification records.

If a study is in **Stage 4 (Analysis & QA)** or any other stage, all milestones reached up to that stage are automatically synchronized idempotently:

| Study Stage | Milestone Event | Alert Type | State | Notification Message | Target Navigation Link |
|---|---|---|---|---|---|
| **Stage 1** | Proposal & Quote Ready | `COMMERCIAL_UPDATE` | Read (if past Stage 1) | Quotation ready for review: `[Intake ID]`. Scope of work, methodology package, and pricing ready. | `/dashboard/client/projects/[id]/quote` |
| **Stage 2** | Contract (SOW) Executed | `COMMERCIAL_UPDATE` | Read (if past Stage 2) | Scope of Work (SOW) agreement executed for `[Intake ID]`. Research milestones locked in escrow. | `/dashboard/client/projects/[id]/sow` |
| **Stage 3** | Downpayment Verified | `PAYMENT_UPDATE` | Read (if past Stage 3) | Downpayment verified for `[Intake ID]`. Escrow vault confirmed and specialist workbench unlocked. | `/dashboard/client/projects/[id]` |
| **Stage 4** | Research Team Assigned | `ASSIGNMENT` | Read (if past Stage 4) / Active | Research team assigned to `[Intake ID]`: Lead Statistician Dr. Juan Reyes and Senior QA Lead Maria. | `/dashboard/client/projects/[id]` |
| **Stage 4** | QA Audit Active | `STATUS_UPDATE` | Active (Unread) | Senior QA Lead is running independent verification scripts and auditing APA format compliance for `[Intake ID]`. | `/dashboard/client/projects/[id]` |
| **Stage 5** | Deliverables Released | `DELIVERABLE_UPDATE` | Active (Unread) | Final defense-ready deliverables released for `[Intake ID]`. Download your APA summary tables, report, and raw scripts. | `/dashboard/client/projects/[id]/deliverables` |

### 6.2 Fresh Account Auto-Onboarding (`ensureFreshAccountNotifications`)
Fresh user accounts with zero prior notifications are provisioned with 2 role-specific onboarding action alerts upon first loading the workspace.

---

## 7. UI & Design System Alignment

In adherence to the **Dashdark Precision UI** standard ([`05-ui-design-upgrade.md`](./05-ui-design-upgrade.md)) and Developer Rules ([`AGENTS.md`](file:///c:/Users/ROG%20STRIX/Desktop/JAXIS%20StatLab/AGENTS.md)):

1. **Quiet-When-Zero Rule**:
   - When unread notifications equal `0`, the notification bell and counter badge must be completely quiet and hidden.
   - Never show grey `0` chips, muted borders, or idle ping blobs.
2. **Dual-Cue Active Pulse Beacon**:
   - When unread notifications exist (> 0), show an active Enterprise Orange (`#CC6600`) chip with an animated outer pulse beacon (`animate-ping`).
3. **Strict Chronological Ordering (Newest First)**:
   - All notifications in the drawer and database queries (`getInAppAlertsAction`) must strictly be sorted in descending order (`orderBy: { createdAt: "desc" }`).
   - Newly dispatched notifications via SSE prepends to the top of the feed (`[newAlert, ...prev]`).
4. **Standardized Dual-Format Timestamps (`formatNotificationTime`)**:
   - For events occurring within the last 24 hours: Display clean relative time (e.g., `just now`, `5m ago`, `3h ago`).
   - For events older than 24 hours: Display formatted date with 12-hour time in Philippine Standard Time (e.g., `Sep 20, 2026 · 1:05 PM`).
   - Ensures both immediate operational awareness and complete historical auditability.
5. **Plain English Copywriting**:
   - Strictly forbidden: `"Syncing telemetry"`, `"Institutional disbursement cadence"`, `"Proration parameters"`.
   - Required: `"Payment Disbursed"`, `"Payroll Schedule Updated"`, `"Mock Defense Booked"`.
6. **Phosphor Fill Icons Exclusively**:
   - Notifications panel and badge alerts use `@phosphor-icons/react` with `weight="fill"`. Zero emojis anywhere.
7. **Single-Mention Study ID Highlighting Standard**:
   - The Study Intake ID (`JAXIS-YYYYMM-XXXX`) must **never be rendered in the notification title or header row**. This prevents title truncation (e.g. `ASSIGNME...`) and eliminates duplicate mentions.
   - The study ID is exclusively displayed within the **notification message body**, rendered as an eye-catching, high-contrast Enterprise Orange chip (`bg-[#CC6600]/15 border border-[#CC6600]/30 text-[#FFA040] font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-[2px] select-all`) for effortless scannability.

---

## 8. Verification & Test Checklist

When adding or refactoring notification triggers:
* [ ] Verify the action imports `dispatchRealtimeNotification` from `@/features/notifications/dispatcher`.
* [ ] Ensure `excludeUserId: session.user.id` is included so users never receive alerts for their own actions.
* [ ] Verify that `eventType` matches one of the defined `NotificationEventType` values.
* [ ] Check that the notification title is concise (2–4 words) and the body is one clear plain English sentence.
* [ ] Run `npm run check-types` in `apps/app` to verify type safety.
* [ ] Run `npx eslint` on the modified files to ensure zero warnings.
