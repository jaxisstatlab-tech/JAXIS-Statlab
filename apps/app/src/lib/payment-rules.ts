import type { PaymentStatus, PaymentMethod, RoleName } from "@prisma/client";

/**
 * Role-Based Access Control Guard: RULE_ROL_02
 * Only Finance Officer, Admin, or CEO may verify or reject payment proofs.
 * Statisticians and QA Leads attempting this action must be blocked with HTTP 403.
 */
export const VERIFYING_ROLES: RoleName[] = ["FINANCE_OFFICER", "ADMIN", "CEO"];

export function canVerifyPayment(role?: string | null): boolean {
  if (!role) return false;
  return VERIFYING_ROLES.includes(role as RoleName);
}

export function assertCanVerifyPayment(role?: string | null): void {
  if (!canVerifyPayment(role)) {
    throw new Error(
      "FORBIDDEN_RULE_ROL_02: Only a Finance Officer, Administrator, or CEO has clearance to verify or reject institutional payment receipts."
    );
  }
}

/**
 * Upload constraints for payment receipts (PAY-F01)
 */
export const ALLOWED_PROOF_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const MAX_PROOF_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Official JAXIS StatLab payment channels displayed to Lead Researchers
 */
export interface PaymentChannelDetails {
  id: PaymentMethod;
  name: string;
  badge: string;
  accountName: string;
  accountNumber: string;
  institution: string;
  branchOrProvider: string;
  notes: string;
  qrImageUrl?: string | null;
  isEnabled?: boolean;
}

export const OFFICIAL_PAYMENT_CHANNELS: PaymentChannelDetails[] = [
  {
    id: "GCASH",
    name: "GCash Corporate Transfer",
    badge: "INSTANT VERIFICATION",
    accountName: "JAXIS STATISTICAL CONSULTING SERVICES",
    accountNumber: "0917-882-5294",
    institution: "GCash / Mynt",
    branchOrProvider: "Merchant Pay & Express Send",
    notes: "Please include your Study Intake ID in the optional message box before completing transfer.",
  },
  {
    id: "BANK_TRANSFER",
    name: "BDO Institutional Direct Deposit",
    badge: "CLEARING: 1-2 HOURS",
    accountName: "JAXIS STATISTICAL CONSULTING SERVICES",
    accountNumber: "0012-8801-4491",
    institution: "Banco de Oro (BDO)",
    branchOrProvider: "Ortigas Center Business Branch",
    notes: "Direct deposit or InstaPay/PESONet. Upload the official transaction confirmation screenshot or deposit slip PDF.",
  },
  {
    id: "BANK_TRANSFER",
    name: "BPI Corporate Account",
    badge: "CLEARING: 1-2 HOURS",
    accountName: "JAXIS STATISTICAL CONSULTING SERVICES",
    accountNumber: "2881-0042-99",
    institution: "Bank of the Philippine Islands (BPI)",
    branchOrProvider: "Ayala Avenue Corporate Center",
    notes: "Include your Study Intake ID in the transfer reference notes.",
  },
];

/**
 * Financial metrics and milestone balance calculation engine
 */
export interface ProjectPaymentSummary {
  totalAmount: number;
  downpaymentRequired: number;
  verifiedPaid: number;
  pendingVerification: number;
  remainingBalance: number;
  isDownpaymentCleared: boolean;
  isFullyPaid: boolean;
  isOverpaid: boolean;
  overpaidAmount: number;
  downpaymentPercentage: number;
  totalPaidPercentage: number;
}

export function calculateProjectBalance(
  payments: Array<{
    amountSubmitted: number | string | { toString(): string } | { toNumber?(): number };
    paymentStatus: PaymentStatus;
  }>,
  totalAmount: number,
  downpaymentRequired: number
): ProjectPaymentSummary {
  let verifiedPaid = 0;
  let pendingVerification = 0;

  for (const payment of payments) {
    const amt = Number(payment.amountSubmitted) || 0;
    if (payment.paymentStatus === "VERIFIED" || payment.paymentStatus === "FULLY_PAID") {
      verifiedPaid += amt;
    } else if (payment.paymentStatus === "PROOF_SUBMITTED") {
      pendingVerification += amt;
    }
  }

  const remainingBalance = Math.max(0, totalAmount - verifiedPaid);
  const isOverpaid = totalAmount > 0 && verifiedPaid > totalAmount;
  const overpaidAmount = isOverpaid ? verifiedPaid - totalAmount : 0;
  const isDownpaymentCleared = verifiedPaid >= downpaymentRequired && downpaymentRequired > 0;
  const isFullyPaid = totalAmount > 0 && verifiedPaid >= totalAmount && !isOverpaid;

  const downpaymentPercentage =
    downpaymentRequired > 0
      ? Math.min(100, Math.round((verifiedPaid / downpaymentRequired) * 100))
      : 100;

  const totalPaidPercentage =
    totalAmount > 0
      ? Math.min(100, Math.round((verifiedPaid / totalAmount) * 100))
      : 100;

  return {
    totalAmount,
    downpaymentRequired,
    verifiedPaid,
    pendingVerification,
    remainingBalance,
    isDownpaymentCleared,
    isFullyPaid,
    isOverpaid,
    overpaidAmount,
    downpaymentPercentage,
    totalPaidPercentage,
  };
}

/**
 * Whether a new payment's amount is allowed (a plain message when it isn't, null when it is).
 * Clients can send exactly what the payment page offers: what's left of the deposit before it's confirmed, or
 * everything that's left ("Pay in full" / "The rest"), and nothing while an earlier receipt is still being
 * checked. Admin and CEO, who record payments for a client, can record any amount up to what's left.
 * Only confirmed payments (VERIFIED / FULLY_PAID) count as paid.
 */
export function paymentAmountProblem(input: {
  total: number;
  deposit: number;
  confirmedPaid: number;
  hasPendingReceipt: boolean;
  paymentType: string;
  amount: number;
  isStaff: boolean;
}): string | null {
  const left = Math.max(0, input.total - input.confirmedPaid);
  const same = (a: number, b: number) => Math.abs(a - b) < 0.01;

  if (left <= 0) return "This study is already paid in full.";
  if (!(input.amount > 0)) return "Please enter the amount you paid.";
  if (input.amount > left + 0.005) return "That's more than what's left to pay on this study.";
  if (input.isStaff) return null;

  if (input.hasPendingReceipt) {
    return "We're still checking your last receipt. You can send the next one once we've confirmed it.";
  }
  const depositLeft = Math.max(0, input.deposit - input.confirmedPaid);
  const depositOpen = depositLeft > 0 && input.deposit < input.total;
  if (input.paymentType === "DOWNPAYMENT") {
    return depositOpen && same(input.amount, depositLeft)
      ? null
      : "The deposit amount doesn't match your agreement. Please refresh the page and try again.";
  }
  if (input.paymentType === "FULL" || input.paymentType === "BALANCE") {
    return same(input.amount, left)
      ? null
      : "The amount doesn't match what's left to pay. Please refresh the page and try again.";
  }
  return "Please choose the deposit or the full amount left to pay.";
}

// ─── Payment accounts (what clients see on their Payment page) ───────────────

export const MAX_PAYMENT_ACCOUNTS = 10;

export interface PaymentAccountProblem {
  index: number;
  field: "accountNumber" | "accountName" | "institution" | "notes" | "qrImageUrl" | "list";
  message: string;
}

/** Where payment QR codes are stored. Every signed-in client may view this folder; only finance, admin and CEO may upload to it. */
export const PAYMENT_QR_FOLDER = "treasury/payments/SYSTEM_CONFIG/";

/** True for a QR code uploaded from the payment account settings (a storage key or our R2 address for one). */
export function isPaymentQrPath(path?: string | null): boolean {
  if (!path) return false;
  let key = path.trim();
  if (/^https?:\/\//.test(key)) {
    try {
      key = new URL(key).pathname.replace(/^\/+/, "");
    } catch {
      return false;
    }
  }
  return key.startsWith(PAYMENT_QR_FOLDER) && !key.includes("..");
}

/**
 * Checks the accounts before they're saved (the editor and the server use the same rules), so a typo
 * never reaches a client who is about to send money. Returns nothing when everything is fine.
 */
export function paymentAccountProblems(
  accounts: Array<
    Pick<PaymentChannelDetails, "id" | "accountNumber" | "accountName" | "institution" | "notes" | "isEnabled"> & {
      qrImageUrl?: string | null;
    }
  >
): PaymentAccountProblem[] {
  const problems: PaymentAccountProblem[] = [];
  if (accounts.length > MAX_PAYMENT_ACCOUNTS) {
    problems.push({ index: -1, field: "list", message: `Keep it to ${MAX_PAYMENT_ACCOUNTS} accounts or fewer.` });
  }
  const seen = new Map<string, number>();
  accounts.forEach((a, index) => {
    const digits = (a.accountNumber || "").replace(/\D/g, "");
    if (a.id === "GCASH") {
      if (!/^09\d{9}$/.test(digits)) {
        problems.push({ index, field: "accountNumber", message: "A GCash number has 11 digits and starts with 09, like 0917-123-4567." });
      }
    } else {
      if (!(a.institution || "").trim()) problems.push({ index, field: "institution", message: "Add the bank's name, like BDO or BPI." });
      if (digits.length < 6 || digits.length > 20) {
        problems.push({ index, field: "accountNumber", message: "Check the account number. It should have 6 to 20 digits." });
      }
    }
    const name = (a.accountName || "").trim();
    if (name.length < 2) problems.push({ index, field: "accountName", message: "Add the name the account is registered to." });
    if ((a.notes || "").length > 300) problems.push({ index, field: "notes", message: "Keep the note under 300 characters." });
    if (a.qrImageUrl && !isPaymentQrPath(a.qrImageUrl)) {
      problems.push({ index, field: "qrImageUrl", message: "Upload the QR code here instead of linking to a picture elsewhere." });
    }
    if (digits) {
      const key = `${a.id}:${digits}`;
      if (seen.has(key)) problems.push({ index, field: "accountNumber", message: "This account is listed twice." });
      else seen.set(key, index);
    }
  });
  return problems;
}

/**
 * Notes that shipped with the app as samples. The Payment page already tells clients to write their study ID,
 * so these are hidden from clients (they stay visible in the editor, where they can be cleared or rewritten).
 */
const STOCK_NOTES = new Set(
  [
    ...OFFICIAL_PAYMENT_CHANNELS.map((c) => c.notes),
    "Direct deposit or InstaPay/PESONet. Upload the official transaction confirmation screenshot or deposit slip PDF.",
    "Include your Study Intake ID in transfer notes.",
  ].map((n) => n.trim().toLowerCase())
);

export function clientNote(note?: string | null): string | null {
  const text = (note || "").trim();
  return text && !STOCK_NOTES.has(text.toLowerCase()) ? text : null;
}

// ─── Reference numbers ───────────────────────────────────────────────────────

/**
 * A reference number the way it's stored and compared: capitals, no spaces, dashes or dots. GCash shows
 * "1002 984 182 91" and a client may type "1002984182 91"; both are the same payment.
 */
export function normalizeReference(raw: string): string {
  return (raw || "").toUpperCase().replace(/[\s.\-_/#]/g, "");
}

/**
 * Finance confirms a payment by finding this number in the JAXIS GCash or bank history, so it must look like a
 * real reference (letters and digits, 6 to 30 of them). Returns a plain message, or null when it's fine.
 */
export function referenceProblem(raw: string): string | null {
  const ref = normalizeReference(raw);
  if (!ref) return "Type the reference number from your GCash or bank confirmation.";
  if (!/^[A-Z0-9]+$/.test(ref)) return "Use only the letters and numbers of the reference number.";
  if (ref.length < 6) return "That looks too short. Check the reference number in your GCash or bank text.";
  if (ref.length > 30) return "That looks too long. Type only the reference number.";
  return null;
}
