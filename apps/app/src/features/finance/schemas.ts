import { z } from "zod";

export const PayoutStatusEnum = z.enum([
  "NOT_ELIGIBLE",
  "PENDING",
  "APPROVED",
  "DISBURSED",
  "VOIDED",
]);

export const PayoutRoleEnum = z.enum(["STATISTICIAN", "QA_LEAD"]);

export const DisbursementMethodEnum = z.enum([
  "GCASH",
  "MAYA",
  "BANK_TRANSFER",
  "CASH",
]);

export const DisbursePayoutSchema = z.object({
  payoutId: z.string().min(1, "Payout ID is required"),
  disbursementMethod: DisbursementMethodEnum,
  disbursementRef: z.string().min(2, "Transaction reference number is required (e.g. GCash Ref, Bank Wire Ref)"),
  disbursementProofUrl: z.string().url("Please provide a valid proof URL").optional().or(z.literal("")),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export type DisbursePayoutInput = z.infer<typeof DisbursePayoutSchema>;

export const VoidPayoutSchema = z.object({
  payoutId: z.string().min(1, "Payout ID is required"),
  voidReason: z.string().min(3, "Please provide a reason for voiding this payout"),
});

export type VoidPayoutInput = z.infer<typeof VoidPayoutSchema>;

export const UpdatePayoutRateSchema = z.object({
  packageName: z.string().min(1, "Package name is required"),
  ratePercent: z.number().min(0, "Rate must be at least 0%").max(100, "Rate cannot exceed 100%"),
  qaRatePercent: z.number().min(0, "QA Rate must be at least 0%").max(100, "QA Rate cannot exceed 100%").optional(),
});

export type UpdatePayoutRateInput = z.infer<typeof UpdatePayoutRateSchema>;

export const PayoutFilterSchema = z.object({
  status: z.enum(["ALL", "NOT_ELIGIBLE", "PENDING", "APPROVED", "DISBURSED", "VOIDED"]).default("ALL"),
  search: z.string().optional(),
});

export type PayoutFilterInput = z.infer<typeof PayoutFilterSchema>;

export const LedgerFilterSchema = z.object({
  packageName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

export type LedgerFilterInput = z.infer<typeof LedgerFilterSchema>;

export interface RegisteredPayoutAccountDTO {
  payoutMethod: string;
  accountName: string;
  accountNumber: string;
  bankName: string | null;
  isVerified: boolean;
}

export interface PayoutDTO {
  id: string;
  projectId: string;
  projectIntakeId: string;
  projectTitle: string;
  masterStatus: string;
  packageName: string;
  clientName: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole: "STATISTICIAN" | "QA_LEAD";
  grossProjectAmount: number;
  payoutRateApplied: number;
  payoutAmount: number;
  payoutStatus: "NOT_ELIGIBLE" | "PENDING" | "APPROVED" | "DISBURSED" | "VOIDED";
  isEligible: boolean;
  eligibilityReasons: string[];
  registeredAccount: RegisteredPayoutAccountDTO | null;
  voidReason: string | null;
  disbursedAt: string | null;
  disbursedBy: string | null;
  disbursedByName: string | null;
  approvedBy: string | null;
  disbursementMethod: string | null;
  disbursementRef: string | null;
  disbursementProofUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialLedgerDTO {
  id: string;
  projectId: string;
  projectIntakeId: string;
  projectTitle: string;
  clientName: string;
  packageName: string;
  masterStatus: string;
  grossRevenue: number;
  platformFee: number;
  statisticianShare: number;
  qaLeadShare: number;
  netMargin: number;
  marginPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutRateConfigDTO {
  id: number;
  packageName: string;
  ratePercent: number;
  qaRatePercent?: number;
  effectiveFrom: string;
  approvedBy: string | null;
  approvedByName: string | null;
}

export interface CeoFinancialOverviewDTO {
  escrowBalance: number;
  grossRealizedRevenue: number;
  totalDisbursed: number;
  pendingDisbursements: number;
  netRealizedMargin: number;
  averageMarginPercent: number;
  packageProfitability: {
    packageName: string;
    projectCount: number;
    grossRevenue: number;
    totalPayouts: number;
    netMargin: number;
    marginPercent: number;
    currentRatePercent: number;
    currentQaRatePercent?: number;
  }[];
  rateConfigs: PayoutRateConfigDTO[];
}

export interface SpecialistPayoutDTO {
  id: string;
  projectId: string;
  projectIntakeId: string;
  projectTitle: string;
  packageName: string;
  role: "STATISTICIAN" | "QA_LEAD";
  grossProjectAmount: number;
  payoutRateApplied: number;
  payoutAmount: number;
  payoutStatus: "NOT_ELIGIBLE" | "PENDING" | "APPROVED" | "DISBURSED" | "VOIDED";
  disbursedAt: string | null;
  disbursementMethod: string | null;
  disbursementRef: string | null;
  createdAt: string;
}
