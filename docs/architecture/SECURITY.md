# JAXIS StatLab — Security & Compliance Protocol

This document establishes the security standards, data integrity safeguards, role-based authorization requirements, and compliance rules for **JAXIS StatLab**.

---

## 1. Role-Based Access Control (RBAC) Enforcement

All API endpoints must perform strict server-side session authentication and role validation before processing requests.

```ts
// Example Server-Side Guard Logic
export async function assertUserRole(req: Request, allowedRoles: UserRole[]) {
  const session = await getSession(req);
  if (!session || !session.user) {
    throw new SecurityException("UNAUTHORIZED", 401, "Authentication required.");
  }
  
  const hasRole = session.user.roles.some((role) => allowedRoles.includes(role));
  if (!hasRole) {
    throw new SecurityException("FORBIDDEN", 403, "Insufficient role permissions.");
  }
  
  return session.user;
}
```

---

## 2. Release Gate Security (Payment Settlement)

> 🔒 **CRITICAL SECURITY RULE:** Deliverable files (final analysis reports, processed datasets, certificates) **MUST NEVER** be accessible via public URL or released unless the payment status is explicitly verified as `FULLY_PAID`.

```ts
// Server-side Deliverable Download Gate
export async function getDeliverableDownloadUrl(deliverableId: string, userId: string) {
  const deliverable = await prisma.deliverables.findUnique({
    where: { id: deliverableId },
    include: { project: { include: { payments: true } } }
  });

  if (!deliverable) throw new NotFoundException("Deliverable not found.");

  // Enforce Payment Gate
  const payment = deliverable.project.payments.find(p => p.payment_status === "FULLY_PAID");
  if (!payment) {
    throw new SecurityException("PAYMENT_REQUIRED", 402, "Release blocked: Outstanding balance pending.");
  }

  // Generate short-lived signed S3/R2 URL (expires in 15 mins)
  return generateSignedUrl(deliverable.file_path, 900);
}
```

---

## 3. Dataset & File Upload Security

JAXIS StatLab handles confidential research datasets (CSV, XLSX, SAV, RData) and payment proof receipts. All file uploads must comply with:

1. **MIME Type Whitelisting:**
   - Datasets: `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/x-spss-sav`
   - Receipts: `image/jpeg`, `image/png`, `application/pdf`
2. **File Size Limits:**
   - Payment Proofs: Maximum 10 MB
   - Datasets: Maximum 100 MB per file
3. **Filename Sanitization:** All uploaded files must be re-indexed using randomly generated UUID v4 identifiers in cloud storage (`s3://jaxis-storage/datasets/[uuid].[ext]`) to prevent path traversal or original filename collision.
4. **Malware & Executable Blocking:** Executable files (`.exe`, `.sh`, `.bat`, `.js`, `.php`, `.py`) are strictly rejected at the API gateway layer.

---

## 4. Ethical Integrity & Misconduct Escalation

- **Fraudulent Request Blocking:** If a client or party requests unethical manipulation (e.g. altering data to force $p < 0.05$ or fabricating survey entries), the system allows any Statistician or QA Lead to trigger an immediate **`ETHICAL_BREACH`** flag.
- **Escalation Protocol:** Ethical flags instantly halt the project clock, log an immutable record in `qa_reviews`, and notify the **CEO / Owner** for executive review.

---

## 5. Financial Ledger & Payout Safeguards

- **Hold Status Rule:** Payouts remain locked on status `HELD` if an active dispute, active revision, or pending refund exists.
- **Immutability:** Financial ledger entries (`financial_ledgers`) are read-only once created and cannot be edited via standard API endpoints. Any correction requires a signed adjustment transaction record.

---

## 6. Secrets & Environment Variable Policy

- Secret keys (`DATABASE_URL`, `NEXTAUTH_SECRET`, `AWS_SECRET_ACCESS_KEY`, `PAYMENT_GATEWAY_SECRET`) **MUST NEVER** be prefixed with `NEXT_PUBLIC_`.
- All environment variables must be declared in `.env.example` without real secret credentials.
