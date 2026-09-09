# JAXIS — Module 15: Disputes, Refunds & Chargebacks

**Module Code:** `15-disputes`\
**Domain:** Disputes\
**Depends On:** `14-finance`\
**Blocks:** `16-notifications`

---

## 1. Module Identity

- **Primary Objective:** Clients may formally dispute a delivered project within 7 days. Admin manages the dispute queue. CEO has exclusive authority to issue refunds and chargebacks. Chargebacks halt the project and freeze any pending Expert payout. No partial refunds under any circumstance.
- **Core Responsibilities:** `Dispute` model, 7-day dispute window, evidence upload, chargeback action, CEO-only refund authority, SLA failure refund type.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `DSP-F01` | **Dispute submission** — Client submits dispute within 7 days of delivery; window enforced server-side |
| `DSP-F02` | **Valid grounds enforcement** — Only `METHODOLOGY_DEVIATION` or `MATHEMATICAL_ERROR` accepted; subjective academic disagreements rejected with 422 |
| `DSP-F03` | **Evidence upload** — Client attaches supporting files during submission |
| `DSP-F04` | **Admin review** — Admin moves dispute to `UNDER_REVIEW` and investigates |
| `DSP-F05` | **Chargeback action** — Admin/CEO: project → `HALTED`; payout → `PENDING` (frozen) |
| `DSP-F06` | **CEO refund decision (RULE_ROL_01)** — CEO only can resolve: `RESOLVED_REFUND` or `RESOLVED_NO_REFUND` |
| `DSP-F07` | **Full refund policy** — No partial refunds; refund = full project amount |
| `DSP-F08` | **Payout fate on refund** — If JAXIS error: Expert payout protected; if client-caused: Expert payout intact; if JAXIS fault: payout absorbed by platform |
| `DSP-F09` | **SLA failure refund type** — Only the Rush/Express/Emergency add-on fee is refunded (not the package price) per Core Rule 11 |
| `DSP-F10` | **Resolution notes** — CEO documents resolution rationale |
| `DSP-F11` | **Admin dispute queue** — All disputes: open, under review, resolved |
| `DSP-F12` | **CEO authority panel** — CEO sees all disputes and can execute any resolution action |
| `DSP-F13` | **Real-time dispute notification triggers** — Dispatches high-priority in-app alerts on dispute submission (`submitDisputeAction`) and CEO executive resolution (`resolveDisputeAction`) to Admin, Finance Officer, CEO, and Client |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Partial refunds | Policy: full refunds only, or no refund |
| Client disputing a non-delivered project | Dispute window opens only after `delivered_at` |
| Subjective academic disputes ("I don't like the methodology") | Not valid grounds — enforced via enum validation |
| Automatic refund processing via payment gateway | Manual process; Finance records the action |



---

## 3. Database Schema

```prisma
enum DisputeStatus {
  OPEN
  UNDER_REVIEW
  RESOLVED_REFUND
  RESOLVED_NO_REFUND
  CHARGEBACK
}

enum DisputeGrounds {
  METHODOLOGY_DEVIATION   // JAXIS deviated from agreed methodology
  MATHEMATICAL_ERROR      // Verifiable mathematical error in output
  SLA_BREACH              // SLA turnaround was missed (refund = upgrade fee only)
}

enum DisputeResolutionType {
  FULL_REFUND
  TURNAROUND_UPGRADE_REFUND_ONLY  // SLA breach: refund add-on fee only
  NO_REFUND
  CHARGEBACK
}

model Dispute {
  id                    String                  @id @default(cuid())
  projectId             String
  clientId              String
  grounds               DisputeGrounds
  description           String
  evidenceFilePaths     String[]               // R2/S3 keys
  status                DisputeStatus           @default(OPEN)
  resolutionType        DisputeResolutionType?
  resolutionNotes       String?
  resolvedBy            String?               // CEO userId
  resolvedAt            DateTime?
  chargebackTriggeredBy String?
  chargebackAt          DateTime?
  disputeWindowExpiresAt DateTime              // delivered_at + 7 days
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  project Project @relation(fields: [projectId], references: [id])
  client  User    @relation(fields: [clientId], references: [id])

  @@index([projectId])
  @@index([status])
  @@index([createdAt])
  @@map("disputes")
}
```

---

## 4. Business Rules

```ts
// src/lib/dispute-rules.ts
export async function assertDisputeWindowOpen(projectId: string): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { deliveredAt: true },
  });
  if (!project?.deliveredAt) {
    throw new ApiError('NOT_DELIVERED', 'Project has not been delivered yet.', 422);
  }
  const windowExpiry = new Date(project.deliveredAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (new Date() > windowExpiry) {
    throw new ApiError('DISPUTE_WINDOW_EXPIRED', 'The 7-day dispute window has closed.', 422);
  }
}

// SLA breach refund: only the turnaround upgrade fee is refundable
const TURNAROUND_ADDONS = ['RUSH', 'EXPRESS', 'EMERGENCY'];
export async function computeSLABreachRefund(projectId: string): Promise<Decimal> {
  const lineItems = await db.quotationLineItem.findMany({
    where: {
      quotation: { projectId },
      itemName: { in: TURNAROUND_ADDONS },
    },
  });
  return lineItems.reduce((sum, item) => sum.plus(item.amount), new Decimal(0));
}
```

---

## 5. API Routes

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/disputes` | CLIENT | Submit dispute (7-day window + grounds validation) |
| `PATCH` | `/api/v1/disputes/:id/review` | ADMIN, CEO | Move dispute to `UNDER_REVIEW` |
| `PATCH` | `/api/v1/disputes/:id/chargeback` | ADMIN, CEO | Trigger chargeback: halt project + freeze payout |
| `PATCH` | `/api/v1/disputes/:id/resolve` | CEO only | Resolve: refund type + notes (RULE_ROL_01) |
| `GET` | `/api/v1/admin/disputes` | ADMIN, CEO | All disputes with filters |
| `GET` | `/api/v1/disputes/:projectId` | CLIENT, ADMIN, CEO | Dispute for project |

### Zod Schema

```ts
export const SubmitDisputeSchema = z.object({
  projectId:   z.string().cuid(),
  grounds:     z.nativeEnum(DisputeGrounds),
  description: z.string().min(20).max(3000),
});

export const ResolveDisputeSchema = z.object({
  resolutionType: z.nativeEnum(DisputeResolutionType),
  notes:          z.string().min(10).max(1000),
});
```

---

## 6. Chargeback Flow

```
Chargeback triggered by Admin/CEO:
  → project.masterStatus = 'HALTED'
  → project.hasActiveDispute = true
  → All pending Payouts for this project → status = 'PENDING' (frozen — cannot disburse)
  → Finance notified in-app

CEO resolves RESOLVED_REFUND:
  → Dispute resolved
  → Refund type determines Expert payout fate:
      JAXIS error → Expert payout status stays PENDING → Finance disburses normally
      Client-caused → Expert payout status stays PENDING → Finance disburses normally
      (Full refund liability absorbed by platform margin)
  → project.hasActiveDispute = false
  → project.hasPendingRefund = false
  → Payout eligibility re-evaluated

CEO resolves RESOLVED_NO_REFUND:
  → project.masterStatus = 'CLOSED'
  → project.hasActiveDispute = false
  → Payout PENDING → APPROVED (disbursement unblocked)
```

---

## 7. Page Views

| Page | Route | Role | Description |
|---|---|---|---|
| Dispute Queue | `/dashboard/admin/disputes` | Admin, CEO | Dispute table: grounds, status, submitted date, project, action buttons |
| CEO Disputes | `/dashboard/ceo/disputes` | CEO | Full dispute panel with resolve form and resolution type selector |
| Client Dispute | `/dashboard/client/projects/:id/dispute` | Client | Submission form (window-gated) + dispute status tracker |

---

## 8. Seed Data Requirements

```ts
// No active disputes in seed (clean state for dev)
// One resolved dispute for testing history:
const seedDisputeResolved = {
  projectIntakeId:  'JAXIS-202608-0001',
  clientEmail:      'client@jaxis.dev',
  grounds:          'METHODOLOGY_DEVIATION',
  description:      'The regression model used does not match the agreed-upon method in the SOW.',
  status:           'RESOLVED_NO_REFUND',
  resolutionType:   'NO_REFUND',
  resolutionNotes:  'Upon review, the methodology was correctly applied per SOW Section 3. No deviation found.',
  resolvedAt:       new Date('2026-08-19T16:00:00Z'),
};
```

---

### 🎯 Expected Output (What you should be able to do now)

- [x] **7-Day Formal Dispute Filing:** Client can lodge a formal dispute within 7 days of delivery with valid grounds (`METHODOLOGY_DEVIATION`, `MATHEMATICAL_ERROR`, or `SLA_BREACH`) and evidence attachments.
- [x] **Admin Investigation Queue:** Admin reviews dispute claims, inspects SOW scope vs outputs, and transitions status to `UNDER_REVIEW`.
- [x] **CEO Refund Authority (RULE_ROL_01):** Exclusive ruling desk for CEO to issue `RESOLVED_REFUND` (full refund or SLA upgrade only) or `RESOLVED_NO_REFUND` with documented rationale.
- [x] **Chargeback & Payout Freeze:** Chargebacks immediately freeze project state (`HALTED`) and lock related expert payouts pending arbitration.
- [x] **SLA Failure Add-On Refund:** Automated handling of turnaround breach claims refunding rush fee add-ons without canceling core package deliverables.
- [x] **Real-Time Arbitration Alerts:** Instant in-app alerts dispatched across Admin, Finance, CEO, and Client upon claim submission and executive resolution.


## 9. Acceptance Criteria (Done Checklist)

### Dispute Submission
- [x] Client can submit dispute within 7 days of delivery
- [x] Dispute submitted after 7 days → 422 `DISPUTE_WINDOW_EXPIRED`
- [x] Invalid grounds (not in enum) → 422 validation error
- [x] Evidence files upload correctly
- [x] `project.hasActiveDispute = true` set on submission
- [x] `disputeWindowExpiresAt` = `deliveredAt + 7 days`
- [x] Dispute submission dispatches real-time in-app alerts to Admin, Finance Officer, and CEO

### Admin Actions
- [x] Admin can move dispute to `UNDER_REVIEW`
- [x] Admin can trigger chargeback → project → `HALTED`; payouts frozen

### CEO Resolution (RULE_ROL_01)
- [x] Non-CEO attempting to resolve → 403
- [x] CEO resolves `RESOLVED_REFUND` with resolution type and notes
- [x] CEO resolves `RESOLVED_NO_REFUND` → project → `CLOSED`; payout unblocked
- [x] SLA breach resolution → only add-on fee computed as refund
- [x] Executive resolution dispatches real-time in-app alert to Client with resolution details and next steps

### Payout Impact
- [x] Active dispute → payout disbursement blocked (RULE_PAY_01 gate returns 403)
- [x] Dispute resolved `RESOLVED_NO_REFUND` → payout unblocked

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 errors
- [x] `npm run build` → clean
