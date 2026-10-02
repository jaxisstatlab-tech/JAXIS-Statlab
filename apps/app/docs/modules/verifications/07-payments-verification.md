# JAXIS — Module 07: Verification Report

**Module:** `07-payments` (Payment & Installments)\
**Date:** 2026-08-27\
**Status:** ✅ PASSED (100% Gates & Criteria Verified)

---

## 1. Overview & Objectives Verified

Module 07 implements the institutional payment ledger, client deposit submission for GCash and Bank Transfer receipts, Finance Officer and Admin verification queue, partial (installment) payment tracking, and automated milestone state machine activation (`AWAITING_PAYMENT` → `ACTIVE` upon downpayment clearance).

### Core Features Validated:
1. **Database Models & Relations (`PAY-F01`, `PAY-F08`)**:
   - `Payment` model with `PaymentStatus`, `PaymentType`, `PaymentMethod`, and running `balancePaidTotal`.
   - `PaymentProof` model storing R2 storage keys and receipt metadata with cascade delete.
   - Bidirectional opposite relations added to `Project` (`payments Payment[]`) and `Quotation` (`payments Payment[]`).
   - Synced to Supabase PostgreSQL via `npx prisma db push`.
2. **Role-Based Authorization & Guardrails (`PAY-F09`, `RULE_ROL_02`)**:
   - `assertCanVerifyPayment(role)` strictly restricts verification and rejection actions to `FINANCE_OFFICER`, `ADMIN`, and `CEO`.
   - Statisticians and QA Leads attempting to verify receipts are blocked with HTTP 403 Forbidden.
3. **Milestone Activation & Full Payment Gates (`PAY-F03`, `PAY-F04`, `RULE_REL_01`)**:
   - Verification atomically adds deposited funds to `balancePaidTotal`.
   - If `balancePaidTotal >= downpaymentRequired`: Project status automatically transitions to `ACTIVE`, unblocking Module 08 (Expert Assignment).
   - If `balancePaidTotal >= totalAmount`: Payment status transitions to `FULLY_PAID`, fulfilling the prerequisite for Module 12 deliverable release.
4. **Client Payment Portal (`PAY-F01`, `PAY-F06`)**:
   - Route: `/dashboard/client/projects/[id]/payment`.
   - Interactive financial ribbon displaying Total Agreed SOW Fee, Required Downpayment, Verified Cleared Balance, and Remaining Balance.
   - Dual-channel payment modal using `@repo/ui` `<Tabs>` for GCash Instant Pay and BDO/BPI Corporate Bank Deposit instructions.
   - Multi-installment payment support: subsequent submissions append to transaction history rather than overwriting.
5. **Finance Officer & Admin Deposit Verification Queue (`PAY-F02`, `PAY-F05`)**:
   - Route: `/dashboard/finance/payments`.
   - Live queue of all `PROOF_SUBMITTED` deposits with channel badges and reference numbers.
   - Inspection modal (`PaymentVerificationModal.tsx`) with image/PDF receipt lightbox.
   - One-click "Authorize & Clear Funds" action or "Reject Deposit Proof" with mandatory audit reason.

---

## 2. Quality Gates & Build Verification

| Gate Check | Command | Result | Notes |
|---|---|---|---|
| **TypeScript Typecheck** | `npm run check-types` | ✅ PASSED | 0 errors across all 3 packages (`@repo/ui`, `app`, `web`) |
| **ESLint Quality** | `npm run lint` | ✅ PASSED | 0 warnings, 0 errors across monorepo |
| **Database Sync** | `npx prisma db push` | ✅ PASSED | PostgreSQL schema synced on Supabase pooler |
| **Prisma Generation** | `npx prisma generate` | ✅ PASSED | Client v6.19.3 generated with `Payment` and `PaymentProof` |
| **Dev Servers** | Turborepo Pipeline | ✅ PASSED | HTTP 200 OK |

---

## 3. Route Inventory

| Route | Role Access | Purpose |
|---|---|---|
| `/dashboard/client/projects/[id]/payment` | `CLIENT` | Client payment portal, GCash/bank channels, and proof upload |
| `/dashboard/finance/payments` | `FINANCE_OFFICER`, `ADMIN`, `CEO` | Deposit verification queue with receipt inspection and clearance |
| `/dashboard/admin/projects/[id]/payment` | `ADMIN`, `CEO` | Administrative financial audit ledger for individual studies |
| `/dashboard/finance` | `FINANCE_OFFICER`, `ADMIN`, `CEO` | Treasury overview updated with queue link and layout standard |
| `/dashboard/client/projects/[id]` | `CLIENT` | Study tracker updated with Awaiting Payment milestone banner |
| `/dashboard/admin/projects/[id]` | `ADMIN`, `CEO` | Project inspection desk updated with Payment Ledger action |

---

## 4. Next Module Transition

With Module 07 complete and verified:
- **Module 08: Expert Assignment & Workload (`08-assignment`)** is now unblocked and ready to start.

---

## 5. Re-check 2026-10-02: reference numbers, payment accounts and QR (`90e7d1d`)

Run on the local test database (`npm run dev:localdb`) and the offline server, desktop 1440 and phone 390.

| Check | Result |
|---|---|
| Client Payment tab with accounts set | Amount, accounts, copy buttons, study ID and "I've Paid" shown; no sideways scroll at 390 px |
| Tap the QR | Payment window with QR, amount, number, name, study ID and "Save QR Code" |
| Pay in full, study 4 (₱3,000) | ₱2,999 refused; ₱3,000 accepted; a second payment while one is being checked refused; confirmed → paid in full, study moves to Analysis |
| Deposit (₱1,500) | ₱1,400 refused; ₱1,500 accepted and confirmed; the remaining ₱1,500 accepted and confirmed → paid in full |
| References "abc", "12-34-5", "!!!123456" | Refused with plain messages |
| Payment with no screenshot | Accepted; reference saved as `100298418291` |
| Same reference on another study | Refused |
| Reference from a rejected payment | Can be sent again |
| Finance "Check this payment" | Confirm stays off until the box is ticked, then confirms |
| Payment accounts editor | Short GCash number and a bank without a name refused (window and server); saved accounts appear on the client page; hidden ones disappear; `PAYMENT_ACCOUNTS_CHANGED` logged |
| QR permissions | Client asking to upload a QR gets 403; finance and CEO get an upload link; client can view the QR folder but not another study's receipts; outside or `..` paths refused |
| Offline QR upload | Saved under `.dev-uploads/treasury/payments/SYSTEM_CONFIG/`; shows in the editor and on the client page (200, image/png) |

Not checked: a real QR upload to file storage on the live site (the local test setup has no storage).
