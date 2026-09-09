# JAXIS — Module 16: Email Notifications

**Module Code:** `16-notifications`\
**Domain:** Notifications\
**Depends On:** `07-payments` through `15-disputes`\
**Blocks:** `17-reporting`

---

## 1. Module Identity

- **Primary Objective:** Trigger transactional email notifications for all client-facing operational events. Internal events (QA states, blocked messages, deadline alerts, ethical breaches) are surfaced as in-app alerts only — never emailed to clients. Failed deliveries are retried and logged.
- **Core Responsibilities:** Email provider abstraction, React Email templates, `NotificationLog` model, in-app alert system, retry logic.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `NTF-F01` | **Email provider abstraction** — `sendEmail(template, recipient, data)` interface backed by Resend or SendGrid |
| `NTF-F02` | **11 client-facing email templates** — See template table below |
| `NTF-F03` | **In-app alerts** — 5 internal event types surfaced as role-desk alert badges (not email) |
| `NTF-F04` | **`NotificationLog` table** — All sent/failed emails logged with status |
| `NTF-F05` | **Retry on failure** — Failed email delivery retried up to 3 times with exponential backoff |
| `NTF-F06` | **React Email templates** — Server-side rendering; JAXIS brand colors; Disket Mono for heading |
| `NTF-F07` | **Internal send endpoint** — `POST /api/v1/notifications/send` is server-only; not publicly accessible |
| `NTF-F08` | **Unread alert badge** — In-app alert badge count visible in topbar for roles with pending internal events |
| `NTF-F09` | **Real-Time Lifecycle Push & In-App Dispatch** — Real-time event streaming (`/api/v1/notifications/stream`) connecting Deliverables, Revisions, Datasets, and Disputes across all 6 roles (`CLIENT`, `STATISTICIAN`, `SENIOR_QA_LEAD`, `ADMIN`, `FINANCE_OFFICER`, and `CEO`) |
| `NTF-F10` | **Event-Aware Multi-Role Deep Linking** — In-app alerts resolve to role-specific target paths with customized action buttons (`View Deliverables →`, `Review Revisions →`, `View Dispute →`) |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| SMS notifications | Not in MVP |
| Push notifications (mobile) | Not in MVP |
| Email preference management (unsubscribe) | Future feature — all operational emails are transactional and cannot be unsubscribed in MVP |
| In-app message notification | Messaging module handles read receipts; this module handles email digest only |
| QA internal states emailed to client | Strictly prohibited — internal only |



---

## 3. Email Templates

All templates are React Email components in `src/lib/email/templates/`.

| Template File | Event | Recipient |
|---|---|---|
| `SOWReady.tsx` | SOW generated and ready for client review | Client |
| `SOWSigned.tsx` | SOW signed confirmation + project activated | Client |
| `ProofReceived.tsx` | Payment proof upload acknowledged | Client |
| `PaymentVerified.tsx` | Payment verified; project activated | Client |
| `PaymentRejected.tsx` | Payment proof rejected with reason | Client |
| `ExpertAssigned.tsx` | Expert assigned; work begins | Client |
| `NewMessage.tsx` | Unread message in project thread | Client, Statistician |
| `InfoRequested.tsx` | Admin requests additional intake information | Client |
| `ProjectDelivered.tsx` | Project delivered; revision window open | Client |
| `RefundProcessed.tsx` | Refund issued (dispute resolved) | Client |
| `DisputeOpened.tsx` | Dispute submission confirmation | Client |

---

## 4. Real-Time In-App Alerts & Multi-Role Notification Engine

All operational lifecycle transitions dispatch real-time in-app alerts across connected browser sessions via Server-Sent Events (`/api/v1/notifications/stream`) with a 15-second background delta fallback.

| Event Type | Typical Trigger | Target Desks & Recipients | Link Destination |
|---|---|---|---|
| `NEW_INTAKE` | Client submits research study intake | Admin, CEO, Client | `/dashboard/admin/projects/[id]`, `/dashboard/client` |
| `INPUT_UPDATE` | Admin requests missing info / Client uploads datasets | Client, Admin, Statistician, QA Lead | Study Workspace / Input files tab |
| `COMMERCIAL_UPDATE` | Quotation issued, accepted/declined, or SOW signed | Client, Admin, Finance Officer | Proposal / SOW desk |
| `PAYMENT_UPDATE` | Client submits receipt / Finance verifies or rejects | Finance Officer, Admin, Client | `/dashboard/finance/payments`, Payment portal |
| `ASSIGNMENT` | Admin assigns Statistician and QA Lead | Statistician, Senior QA Lead, Client, Admin | Workbench, QA Desk, Client Desk |
| `OUTPUT_UPDATE` | Statistician uploads analysis outputs / scripts | Senior QA Lead, Admin | QA file review queue |
| `QA_DECISION` | Study submitted for QA / QA Approved / QA Rejected | Senior QA Lead, Statistician, Admin, Client | QA Queue / Statistician Workbench |
| `QA_DECISION` (Escalation) | QA flags ethical/academic misconduct | Admin, CEO, Statistician | `/dashboard/ceo/escalations` |
| `DELIVERABLE_UPDATE` | Final files uploaded or released to client | Client, Admin, Senior QA Lead, Finance | `/dashboard/client/projects/[id]/deliverables` |
| `REVISION_REQUEST` | Client requests revisions / Admin classifies warranty | Admin, Statistician, Client | Revision Triage Queue / Workbench |
| `DISPUTE` | Academic dispute filed or executive ruling issued | Admin, Finance Officer, CEO, Client | `/dashboard/admin/disputes`, `/dashboard/ceo/disputes` |
| `SYSTEM_ALERT` | Storage quota limit warning / Purge recommendation | Admin, CEO | `/dashboard/ceo/retention` |

---

## 5. Database Schema

```prisma
enum NotificationStatus {
  SENT
  FAILED
  RETRYING
}

model NotificationLog {
  id          String             @id @default(cuid())
  recipientId String
  email       String
  template    String             // Template name e.g. "SOWReady"
  projectId   String?
  status      NotificationStatus @default(SENT)
  attemptCount Int               @default(1)
  errorMessage String?
  sentAt      DateTime           @default(now())
  lastAttemptAt DateTime?

  recipient User @relation(fields: [recipientId], references: [id])

  @@index([recipientId])
  @@index([projectId])
  @@index([status])
  @@index([sentAt])
  @@map("notification_logs")
}

model InAppAlert {
  id          String   @id @default(cuid())
  recipientId String
  recipientRole RoleName
  alertType   String   // e.g. "NEW_INTAKE", "QA_SUBMISSION", "PRE_DEADLINE"
  projectId   String?
  message     String
  isRead      Boolean  @default(false)
  readAt      DateTime?
  createdAt   DateTime @default(now())

  recipient User @relation(fields: [recipientId], references: [id])

  @@index([recipientId])
  @@index([isRead])
  @@index([createdAt])
  @@map("in_app_alerts")
}
```

---

## 6. Email Service Abstraction

```ts
// src/lib/email.ts
export type EmailTemplate =
  | 'SOWReady' | 'SOWSigned' | 'ProofReceived' | 'PaymentVerified'
  | 'PaymentRejected' | 'ExpertAssigned' | 'NewMessage' | 'InfoRequested'
  | 'ProjectDelivered' | 'RefundProcessed' | 'DisputeOpened';

export interface EmailPayload {
  to:        string;
  template:  EmailTemplate;
  data:      Record<string, unknown>;
  projectId?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const { to, template, data, projectId } = payload;
  let status: NotificationStatus = 'SENT';
  let errorMessage: string | undefined;

  try {
    const html = await renderEmailTemplate(template, data);
    await resend.emails.send({
      from:    'JAXIS StatLab <noreply@jaxis.dev>',
      to,
      subject: EMAIL_SUBJECTS[template],
      html,
    });
  } catch (err) {
    status = 'FAILED';
    errorMessage = String(err);
  }

  await db.notificationLog.create({
    data: { recipientId: data.userId as string, email: to, template, projectId, status, errorMessage },
  });

  if (status === 'FAILED') {
    // Schedule retry via Inngest or queue
    await scheduleEmailRetry(payload, attemptCount: 1);
  }
}
```

---

## 7. Template Base Design

All email templates share:
- **Background:** `#010114` (Midnight Navy)
- **Card surface:** `#012E57` (Deep Ocean Blue)
- **Accent CTA button:** `#CC6600` (Enterprise Orange)
- **Body font:** Inter 14px, `#FFFFFF`
- **Header logo:** JAXIS StatLab wordmark in Disket Mono
- **Footer:** "This is an automated notification. Do not reply to this email." + support email link

---

## 8. API Routes

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/notifications/send` | Server-only (no public access) | Send a notification email |
| `GET` | `/api/v1/alerts` | Any authenticated | Own unread in-app alerts |
| `PATCH` | `/api/v1/alerts/:id/read` | Any authenticated | Mark alert as read |
| `GET` | `/api/v1/alerts/count` | Any authenticated | Unread alert count (for badge) |

---

## 9. Seed Data Requirements

```ts
// No email sends in seed (no email provider in dev)
// Seed 2 unread in-app alerts for Admin:
const seedAlerts = [
  {
    recipientRole: 'ADMIN',
    alertType:    'NEW_INTAKE',
    message:      'New project submission received: JAXIS-202608-0001',
    projectId:    seedProject.id,
  },
  {
    recipientRole: 'ADMIN',
    alertType:    'QA_SUBMISSION',
    message:      'QA approved for JAXIS-202608-0001 — ready for deliverable preparation.',
    projectId:    seedProject.id,
  },
];
```

---

### 🎯 Expected Output (What you should be able to do now)

- [x] **Transactional Email Dispatch:** Automated dispatch of 11 core client-facing transactional email templates via Resend (SOW ready, payment confirmed, expert assigned, delivery ready, etc.).
- [x] **React Email Component Templates:** Responsive HTML email layouts with JAXIS branding, dark palette accenting, and clear call-to-action links.
- [x] **In-App Notification Center:** Real-time topbar notification badge and drawer displaying internal action items, status transitions, and unread alerts.
- [x] **Email Delivery Audit & Retries:** All outbound notifications tracked in `NotificationLog` with status, timestamp, and automatic 3-attempt exponential retry on failure.
- [x] **Internal Event Masking:** Sensitive internal operational events (QA rejections, ethical breaches, firewall triggers) are strictly confined to in-app alerts and never sent to clients.
- [x] **Platform-Wide Real-Time In-App Dispatch:** Real-time push alerts via Server-Sent Events connecting final deliverables, revisions, dataset uploads, and disputes across all 6 roles.
- [x] **Event-Aware Deep-Linking Engine:** Contextual notification navigation links pointing directly to the exact work desk with tailored action buttons.


## 10. Acceptance Criteria (Done Checklist)

### Email Templates
- [x] All 11 template files render without errors in React Email preview
- [x] Each template uses correct brand colors and typography
- [x] `sendEmail()` sends via Resend in production; logs result in `NotificationLog`
- [x] Failed send → status `FAILED` in log; retry scheduled

### Retry Logic
- [x] Failed sends retried up to 3 times with exponential backoff (500ms, 1000ms)
- [x] After 3 failed attempts → status `FAILED` (no further retries); Admin can see in log

### In-App Alerts & Real-Time Engine
- [x] New intake creates an in-app alert for Admin
- [x] QA approval creates an in-app alert for Admin
- [x] 24-hour deadline alert creates in-app alert for Admin
- [x] Ethical breach creates in-app alert for CEO
- [x] Blocked message creates in-app alert for Admin
- [x] Alert badge count in topbar reflects unread count
- [x] Marking alert as read → badge count decrements
- [x] Deliverable upload & release dispatches real-time alert to Client, Admin, QA Lead, and Finance Officer
- [x] Revision request dispatches real-time alert to Admin and Statistician; classification alerts Client
- [x] Dispute filing dispatches real-time alert to Admin, Finance Officer, and CEO; resolution alerts Client
- [x] Dataset modification alerts staff while excluding the uploading user to prevent self-alert loops

### Event Coverage
- [x] SOW generated → SOWReady email sent to Client
- [x] SOW signed → SOWSigned email sent to Client
- [x] Payment proof uploaded → ProofReceived email sent to Client
- [x] Payment verified → PaymentVerified email sent to Client
- [x] Payment rejected → PaymentRejected email sent to Client
- [x] Expert assigned → ExpertAssigned email sent to Client
- [x] Project delivered → ProjectDelivered email sent to Client
- [x] Dispute confirmed → DisputeOpened email sent to Client
- [x] **QA internal events (FOR_QA, QA_REVISION) → NO email to Client**

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 errors
- [x] `npm run build` → clean
