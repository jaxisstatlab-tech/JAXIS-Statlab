# JAXIS — Module 07: Payment & Installments

**Module Code:** `07-payments`\
**Domain:** Payments\
**Depends On:** `06-sow`\
**Blocks:** `08-assignment`

---

## 1. Module Identity

- **Primary Objective:** Client uploads GCash or bank transfer payment proof. Finance Officer or Admin verifies. Partial (installment) payments are supported. Project activates after required downpayment clears. Full payment unlocks deliverable release (RULE_REL_01).
- **Core Responsibilities:** `Payment` + `PaymentProof` models, proof upload, verification queue, balance tracking, 3-day pending expiry job.

> **Since 2026-10-02 (`90e7d1d`):** the client sends the **reference number** of their GCash or bank transfer; the screenshot is optional. Our payment accounts are shown on the client's Payment tab, and finance edits them in "Payment accounts". See §10. Where this document says the client must upload a receipt, read it with that change.

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

---

## 10. Changes on 2026-10-02 (`90e7d1d`)

### Where clients pay (client Payment tab)

- `/dashboard/client/projects/[id]/payment` loads our payment accounts on the server. The "Pay your deposit" / "Pay the rest" card shows the amount, each account that is switched on (number in large type, registered name, bank and branch, QR if set, Copy that copies the number without dashes), the study ID to write in the message (with Copy), and "I've Paid". When nothing is due, the accounts are under "Where to send a payment". With no account set up, the card says so and links to Messages.
- Tapping a QR opens a payment window: large QR, amount, number, registered name, bank and branch, study ID (each with Copy), "Save QR Code" and a one-line how-to.

### Telling us about a payment (client)

"I've Paid" opens "Tell us about your payment": what you paid (deposit or in full, only what is due), how you sent it (only the methods switched on), the reference number, and an optional "Add Screenshot" (PNG, JPG or PDF, up to 10 MB).

Rules shared by the form and the server (`src/lib/payment-rules.ts`):

| Rule | Detail |
|---|---|
| `normalizeReference` | Uppercase; spaces, dots, dashes and similar removed. "1002 984 182 91" and "100298418291" are the same |
| `referenceProblem` | Letters and digits only, 6 to 30 of them |
| Duplicate check (`submitPaymentProof`) | A reference already used on another payment is refused, unless that payment was rejected (so a client can resend a corrected number) |
| Amount (`paymentAmountProblem`) | Only what is due: what's left of the deposit, or everything left; nothing while another payment is being checked |

The payment is saved as `PROOF_SUBMITTED` with the reference. A `PaymentProof` row is created only when a screenshot is sent.

### Checking a payment (finance, admin, CEO)

"Check this payment" (`PaymentVerificationModal`) lists what to match in the JAXIS GCash or bank history: the reference (with Copy), the exact amount and time, and what to do for bank-to-GCash transfers where the reference can differ. **Confirm Payment stays off until "I found this payment in the JAXIS account and it matches" is ticked.** "Not Found" offers ready reasons the client sees.

### Payment accounts (finance, admin, CEO)

- Edited in Finance Overview → Payment accounts → Edit (`PaymentChannelSettingsModal`). Stored in `app_settings` under `payment_channels`; the shipped `dev_data/payment_channels.json` is read only until the first save, and is the store only in offline mode.
- Each GCash or bank account: number, registered name, bank name and branch (banks), optional QR and note, a "Shown to clients" switch, Remove. Up to 10 accounts (`MAX_PAYMENT_ACCOUNTS`).
- The same checks run in the window and on the server (`paymentAccountProblems`): GCash 11 digits starting 09; bank 6–20 digits and a bank name; a registered name; no account listed twice. A warning shows when no account is shown to clients.
- Every save is written to the activity log as `PAYMENT_ACCOUNTS_CHANGED` with the old and new numbers.
- Clients see saved changes at once. Stock notes that shipped with the app are not shown to clients (`clientNote`).

### QR codes

- PNG or JPG only. Uploads into the QR folder (`treasury/payments/SYSTEM_CONFIG/`, `PAYMENT_QR_FOLDER`) are allowed only for finance, admin and CEO, in both upload routes (`/api/upload/presigned`, `/api/upload`).
- A saved QR must be a file in that folder (`isPaymentQrPath`); outside addresses and `..` are refused.
- Any signed-in client can view the QR folder through `/api/files/preview`, but not another study's receipts.
- Offline mode (`npm run dev:offline`) keeps uploads in the git-ignored `.dev-uploads/` folder under the same path (`src/lib/dev-uploads.ts`, `/api/dev/upload-sink`), and the file viewer serves them after its usual checks.
