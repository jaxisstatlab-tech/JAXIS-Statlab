import type { PaymentItem } from "./schemas";

// Small helpers for the client's Payment tab and receipts.

/** Confirmed by our team (a receipt can be issued). */
export const isConfirmed = (p: Pick<PaymentItem, "paymentStatus">) =>
  p.paymentStatus === "VERIFIED" || p.paymentStatus === "FULLY_PAID";

const when = (p: PaymentItem) => new Date(p.verifiedAt || p.createdAt).getTime();

/** Total confirmed up to and including this payment, oldest first. */
export function paidUpTo(payments: PaymentItem[], target: PaymentItem): number {
  const cutoff = when(target);
  return payments
    .filter((p) => isConfirmed(p) && (p.id === target.id || when(p) < cutoff || (when(p) === cutoff && p.id < target.id)))
    .reduce((sum, p) => sum + p.amountSubmitted, 0);
}

export type PaymentTone = "checking" | "confirmed" | "rejected" | "waiting";

export function paymentTone(p: Pick<PaymentItem, "paymentStatus">): PaymentTone {
  if (isConfirmed(p)) return "confirmed";
  if (p.paymentStatus === "PROOF_SUBMITTED") return "checking";
  if (p.paymentStatus === "REJECTED") return "rejected";
  return "waiting";
}

export const PAYMENT_TONE_LABEL: Record<PaymentTone, string> = {
  checking: "Checking",
  confirmed: "Confirmed",
  rejected: "Not accepted",
  waiting: "Waiting",
};
