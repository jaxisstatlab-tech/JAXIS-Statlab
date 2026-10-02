import { paymentAccountProblems, referenceProblem } from "@/lib/payment-rules";
import { z } from "zod";

export const PaymentTypeEnum = z.enum([
  "DOWNPAYMENT",
  "INSTALLMENT",
  "BALANCE",
  "FULL",
]);

export const PaymentMethodEnum = z.enum(["GCASH", "BANK_TRANSFER"]);

export const SubmitPaymentProofSchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
  quotationId: z.string().min(1, "Quotation ID is required."),
  paymentType: PaymentTypeEnum.default("DOWNPAYMENT"),
  paymentMethod: PaymentMethodEnum,
  amountSubmitted: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Amount deposited must be a valid positive amount in PHP.",
    }),
  // Required: finance confirms the payment by finding this number in the JAXIS GCash or bank history.
  referenceNumber: z
    .string()
    .trim()
    .max(60, "Type only the reference number.")
    .superRefine((val, ctx) => {
      const problem = referenceProblem(val);
      if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
    }),
  // Optional since 2026-10-02: a screenshot helps finance find the payment but isn't proof on its own.
  receiptFilePath: z.string().trim().min(1).optional(),
  receiptFileName: z.string().trim().min(1).optional(),
  receiptFileSize: z.number().optional(),
});

export type SubmitPaymentProofInput = z.infer<typeof SubmitPaymentProofSchema>;

export const VerifyPaymentSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required."),
});

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;

export const RejectPaymentSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required."),
  rejectionReason: z
    .string()
    .trim()
    .min(5, "Please provide an explanatory reason for rejection (min 5 characters).")
    .max(500, "Reason cannot exceed 500 characters."),
});

export type RejectPaymentInput = z.infer<typeof RejectPaymentSchema>;

export const PaymentChannelConfigSchema = z.object({
  id: PaymentMethodEnum,
  name: z.string().trim().max(100).default(""),
  badge: z.string().trim().max(60).default(""),
  accountName: z.string().trim().min(1, "Account name is required").max(100),
  accountNumber: z.string().trim().min(1, "Account number is required").max(40),
  institution: z.string().trim().max(100).default(""),
  branchOrProvider: z.string().trim().max(100).default(""),
  notes: z.string().trim().max(300).default(""),
  qrImageUrl: z.string().trim().max(500).nullable().optional(),
  isEnabled: z.boolean().default(true),
});

// Same checks as the editor (paymentAccountProblems), so a wrong number can't be saved by any route.
export const UpdatePaymentChannelsSchema = z
  .object({
    channels: z.array(PaymentChannelConfigSchema),
  })
  .superRefine((value, ctx) => {
    for (const problem of paymentAccountProblems(value.channels)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: problem.message,
        path: problem.index >= 0 ? ["channels", problem.index, problem.field] : ["channels"],
      });
    }
  });

export type PaymentChannelConfigInput = z.infer<typeof PaymentChannelConfigSchema>;
export type UpdatePaymentChannelsInput = z.infer<typeof UpdatePaymentChannelsSchema>;

import type { PaymentStatus, PaymentType, PaymentMethod, ProjectStatus } from "@prisma/client";
import type { ProjectPaymentSummary } from "@/lib/payment-rules";

export interface PaymentProofItem {
  id: string;
  paymentId: string;
  filePath: string;
  fileName: string;
  fileSize?: number | null;
  uploadedAt: string;
}

export interface PaymentItem {
  id: string;
  projectId: string;
  quotationId: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod | null;
  amountSubmitted: number;
  balancePaidTotal: number;
  referenceNumber: string | null;
  paymentStatus: PaymentStatus;
  rejectionReason: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  proofs: PaymentProofItem[];
  project?: {
    id: string;
    intakeId: string;
    researchTitle: string;
    masterStatus: ProjectStatus;
    client: {
      fullName: string;
      email: string;
      clientProfile?: {
        institutionSchool: string;
      } | null;
    };
  };
  quotation?: {
    id: string;
    packageName: string;
    totalAmount: number;
    downpaymentRequired: number;
  };
}

export interface ProjectPaymentsData {
  payments: PaymentItem[];
  summary: ProjectPaymentSummary;
  quotationId?: string | null;
}

export interface StudyReceivableItem {
  id: string;
  intakeId: string;
  researchTitle: string;
  clientName: string;
  university: string;
  masterStatus: ProjectStatus;
  totalContractAmount: number;
  totalPaidAmount: number;
  remainingBalance: number;
  downpaymentRequired: number;
  isDownpaymentCleared: boolean;
  isFullyPaid: boolean;
  isOverpaid?: boolean;
  overpaidAmount?: number;
  paymentCount: number;
  lastPaymentAt: string | null;
}

export interface FinanceOverviewData {
  kpis: {
    totalVaultCleared: number;
    totalOutstandingReceivables: number;
    totalContractVolume: number;
    pendingClearancesCount: number;
    completedStudiesCount: number;
  };
  receivables: StudyReceivableItem[];
  /** Last 6 months, oldest first (e.g. "May" … "Oct"), with checked client payments and staff pay sent out per month. */
  months?: string[];
  collectedByMonth?: number[];
  paidOutByMonth?: number[];
  /** Checked client payments by how they were sent (all time). */
  byMethod?: Array<{ method: string; count: number; amount: number }>;
  /** Receipts clients sent that nobody has checked yet. */
  pendingProofAmount?: number;
}

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
