import type { PaymentItem } from "./schemas";

// Plain words for payments, shared by the finance list and the check window.
export const paymentKind = (t: PaymentItem["paymentType"]) =>
  t === "DOWNPAYMENT" ? "Deposit" : t === "BALANCE" ? "The rest" : t === "INSTALLMENT" ? "Part payment" : "In full";
export const paymentMethod = (m: PaymentItem["paymentMethod"]) => (m === "GCASH" ? "GCash" : m === "BANK_TRANSFER" ? "Bank transfer" : "Not given");
