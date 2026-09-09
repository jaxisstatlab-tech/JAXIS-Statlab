# JAXIS — Module 07: Payment & Installments

**Module Code:** `07-payments`\
**Domain:** Payments\
**Depends On:** `06-sow`\
**Blocks:** `08-assignment`

---

## 1. Module Identity

- **Primary Objective:** Client uploads GCash or bank transfer payment proof. Finance Officer or Admin verifies. Partial (installment) payments are supported. Project activates after required downpayment clears. Full payment unlocks deliverable release (RULE_REL_01).
- **Core Responsibilities:** `Payment` + `PaymentProof` models, proof upload, verification queue, balance tracking, 3-day pending expiry job.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `PAY-F01` | **Proof upload** — Client uploads receipt image/PDF as proof of GCash or bank transfer |
| `PAY-F02` | **Verification queue** — Finance Officer / Admin sees all `PROOF_SUBMITTED` payments |
| `PAY-F03` | **Payment verification** — Finance verifies → balance updated; if balance ≥ downpayment → project `ACTIVE` |
| `PAY-F04` | **Full payment tracking** — When `balance_paid_total ≥ total_amount` → `FULLY_PAID`; deliverable release gate unlocked |
| `PAY-F05` | **Payment rejection** — Finance rejects with reason; client must re-upload |
| `PAY-F06` | **Installment support** — Multiple proof uploads on same project; each adds to running balance |
| `PAY-F07` | **3-day expiry** — Project with `AWAITING_PAYMENT` and no verified payment after 3 days → `EXPIRED` (background job) |
| `PAY-F08` | **Payment ledger** — Per-project payment history: proofs, verification decisions, balance |
| `PAY-F09` | **RULE_ROL_02** — Only Finance Officer, Admin, CEO may verify/reject; Statisticians/QA → 403 |
| `PAY-F10` | **RULE_REL_01 flag** — `payment_status` field on project used by Module 12 deliverable release gate |
| `PAY-F11` | **Payment method audit** — Record whether proof was GCash or bank transfer |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Automatic payment gateway / API integration | CTO decision per `scope.md` §21. Manual proof upload for MVP. |
| Automatic payment link generation | Future feature. |
| Partial refunds | Policy prohibits partial refunds (`scope.md` §9) |
| Refund processing | Module 15 (Disputes) |
| Online payment form (GCash API, Maya, Stripe) | Out of MVP |



---

## 3. Database Schema

```prisma
enum PaymentStatus {
  AWAITING_PAYMENT
  PROOF_SUBMITTED
  VERIFIED
  REJECTED
  FULLY_PAID
}

enum PaymentType {
  DOWNPAYMENT
  INSTALLMENT
  BALANCE
  FULL
}

enum PaymentMethod {
  GCASH
  BANK_TRANSFER
}

model Payment {
  id                String        @id @default(cuid())
  projectId         String
  quotationId       String
  paymentType       PaymentType
  paymentMethod     PaymentMethod?
  amountSubmitted   Decimal       @db.Decimal(10, 2)
  balancePaidTotal  Decimal       @db.Decimal(10, 2) @default(0)
  paymentStatus     PaymentStatus @default(AWAITING_PAYMENT)
  rejectionReason   String?
  verifiedBy        String?
  verifiedAt        DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  project   Project       @relation(fields: [projectId], references: [id])
  quotation Quotation     @relation(fields: [quotationId], references: [id])
  proofs    PaymentProof[]

  @@index([projectId])
  @@index([paymentStatus])
  @@index([createdAt])
  @@map("payments")
}

model PaymentProof {
  id         String   @id @default(cuid())
  paymentId  String
  filePath   String   // R2/S3 object key
  fileName   String
  uploadedAt DateTime @default(now())

  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  @@index([paymentId])
  @@map("payment_proofs")
}
```

### Payment Balance Logic

```ts
// On verification of a payment proof:
export async function verifyPayment(paymentId: string, verifiedBy: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { project: { include: { quotations: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
  });

  const newBalance = Number(payment.balancePaidTotal) + Number(payment.amountSubmitted);
  const totalAmount = Number(payment.project.quotations[0].totalAmount);
  const downpaymentRequired = Number(payment.project.quotations[0].downpaymentRequired);

  const isFullyPaid = newBalance >= totalAmount;
  const isActivatable = newBalance >= downpaymentRequired;

  await db.$transaction([
    db.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: isFullyPaid ? 'FULLY_PAID' : 'VERIFIED',
        balancePaidTotal: newBalance,
        verifiedBy,
        verifiedAt: new Date(),
      },
    }),
    // Activate project if downpayment threshold met
    ...(isActivatable ? [
      db.project.update({
        where: { id: payment.projectId },
        data: { masterStatus: isFullyPaid ? 'ACTIVE' : 'ACTIVE' },
      }),
    ] : []),
  ]);
}
```

---

## 4. API Routes & Server Actions

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/payments/proof` | CLIENT | Upload proof of payment |
| `PATCH` | `/api/v1/payments/:id/verify` | FINANCE_OFFICER, ADMIN, CEO | Verify payment proof |
| `PATCH` | `/api/v1/payments/:id/reject` | FINANCE_OFFICER, ADMIN, CEO | Reject proof with reason |
| `GET` | `/api/v1/payments/:projectId` | FINANCE_OFFICER, ADMIN, CEO, CLIENT | Payment ledger for project |

---

## 5. File Upload Rules (Payment Proof)

```ts
const ALLOWED_PROOF_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_PROOF_SIZE = 10 * 1024 * 1024; // 10MB
```

---

## 6. Background Job: 3-Day Expiry

```ts
// src/lib/jobs/expire-pending-projects.ts
// Trigger.dev cron — runs daily at 02:00 PH time
import { schedules } from '@trigger.dev/sdk/v3';

export const expirePendingProjectsTask = schedules.task({
  id: 'expire-pending-projects',
  cron: '0 18 * * *', // 02:00 PHT = 18:00 UTC
  run: async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const result = await db.project.updateMany({
      where: {
        masterStatus: 'AWAITING_PAYMENT',
        updatedAt:    { lt: threeDaysAgo },
        payments:     { none: { paymentStatus: { in: ['VERIFIED', 'FULLY_PAID'] } } },
      },
      data: { masterStatus: 'EXPIRED' },
    });
    return { expired: result.count };
  },
});
```

---

## 7. Page Views

| Page | Route | Role | Description |
|---|---|---|---|
| Payment Status | `/dashboard/client/projects/:id/payment` | Client | Balance tracker, proof upload form, verification status |
| Verification Queue | `/dashboard/finance/payments` | Finance, Admin, CEO | All `PROOF_SUBMITTED` payments with proof viewer and verify/reject actions |
| Payment Ledger | `/dashboard/admin/projects/:id/payment` | Admin, CEO | Full payment history, balance, status |

---

## 8. Seed Data Requirements

```ts
const seedPayment = {
  projectIntakeId: 'JAXIS-202608-0001',
  paymentType:     'DOWNPAYMENT',
  paymentMethod:   'GCASH',
  amountSubmitted: 1400.00,
  balancePaidTotal: 1400.00,
  paymentStatus:   'VERIFIED',
  verifiedAt:      new Date('2026-08-11T10:00:00Z'),
};
```

---

### 🎯 Expected Output (What you should be able to do now)

- [ ] **Payment Proof Upload:** Client can upload official bank transfer or GCash payment receipt screenshots (PNG, JPG, PDF) with reference number and amount.
- [ ] **Finance Verification Queue:** Finance Officer and Admin access queue of all pending proofs (`PROOF_SUBMITTED`).
- [ ] **Payment Verification & Ledger:** Finance Officer reviews receipt, confirms cleared funds, and updates project balance.
- [ ] **Escrow Activation:** When verified balance meets required downpayment, project activates (`ACTIVE`) and unlocks expert assignment.
- [ ] **Payment Rejection:** Finance Officer can reject invalid or unverified proofs with clear reason; Client is prompted to re-upload.
- [ ] **Full Payment Gate (RULE_REL_01):** When project is `FULLY_PAID`, release lock is flagged ready for final deliverables in Module 12.


## 9. Acceptance Criteria (Done Checklist)

### Proof Upload
- [ ] Client can upload a payment proof image/PDF
- [ ] Non-allowed MIME type → 422
- [ ] File over 10MB → 422
- [ ] Proof uploaded → `paymentStatus → PROOF_SUBMITTED`

### Verification
- [ ] Finance can view all `PROOF_SUBMITTED` payments in queue
- [ ] Finance can verify → balance updated, `VERIFIED` status set
- [ ] If `newBalance >= downpaymentRequired` → project status → `ACTIVE`
- [ ] If `newBalance >= totalAmount` → `paymentStatus → FULLY_PAID`
- [ ] Finance can reject with reason → status back to `AWAITING_PAYMENT`
- [ ] Statistician attempting to verify → 403 (RULE_ROL_02)

### Installments
- [ ] Second proof upload adds to existing balance (not replaces)
- [ ] Multiple payment records exist on same project

### Expiry
- [ ] Project with `AWAITING_PAYMENT` > 3 days, no verified payments → status → `EXPIRED`
- [ ] Project with a verified payment does NOT expire

### Quality Gates
- [ ] `npm run check-types` → 0 errors
- [ ] `npm run lint` → 0 warnings/errors
- [ ] `npm run build` → clean
