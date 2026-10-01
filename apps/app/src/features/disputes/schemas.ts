import { z } from "zod";

export const DisputeGroundsEnum = z.enum([
  "METHODOLOGY_DEVIATION",
  "MATHEMATICAL_ERROR",
  "SLA_BREACH",
]);
export type DisputeGrounds = z.infer<typeof DisputeGroundsEnum>;

export const DisputeStatusEnum = z.enum([
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED_REFUND",
  "RESOLVED_NO_REFUND",
  "CHARGEBACK",
]);
export type DisputeStatus = z.infer<typeof DisputeStatusEnum>;

export const DisputeResolutionTypeEnum = z.enum([
  "FULL_REFUND",
  "TURNAROUND_UPGRADE_REFUND_ONLY",
  "NO_REFUND",
  "CHARGEBACK",
]);
export type DisputeResolutionType = z.infer<typeof DisputeResolutionTypeEnum>;

export const SubmitDisputeSchema = z.object({
  projectId: z.string().min(1, "Please select an eligible study."),
  grounds: DisputeGroundsEnum,
  description: z
    .string()
    .min(20, "Please provide at least 20 characters explaining the specific technical or methodology issue.")
    .max(3000, "Description cannot exceed 3,000 characters."),
  evidenceFilePaths: z.array(z.string()).default([]),
});
export type SubmitDisputeInput = z.infer<typeof SubmitDisputeSchema>;

export const ReviewDisputeSchema = z.object({
  disputeId: z.string().min(1, "Dispute ID is required."),
});
export type ReviewDisputeInput = z.infer<typeof ReviewDisputeSchema>;

export const TriggerChargebackSchema = z.object({
  disputeId: z.string().min(1, "Dispute ID is required."),
  reason: z.string().min(10, "Please explain the chargeback justification (min 10 characters)."),
});
export type TriggerChargebackInput = z.infer<typeof TriggerChargebackSchema>;

export const ResolveDisputeSchema = z.object({
  disputeId: z.string().min(1, "Dispute ID is required."),
  resolutionType: DisputeResolutionTypeEnum,
  resolutionNotes: z
    .string()
    .min(10, "Please document the arbitration finding and decision rationale (min 10 characters).")
    .max(2000, "Notes cannot exceed 2,000 characters."),
});
export type ResolveDisputeInput = z.infer<typeof ResolveDisputeSchema>;

export const DisputeFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
});
export type DisputeFilterInput = z.infer<typeof DisputeFilterSchema>;

export interface DisputeDTO {
  id: string;
  projectId: string;
  projectIntakeId: string;
  projectTitle: string;
  packageName: string;
  grossAmount: number;
  clientName: string;
  clientEmail: string;
  grounds: DisputeGrounds;
  description: string;
  evidenceFilePaths: string[];
  status: DisputeStatus;
  resolutionType: DisputeResolutionType | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedByName?: string | null;
  resolvedAt: string | null;
  chargebackTriggeredBy: string | null;
  chargebackAt: string | null;
  disputeWindowExpiresAt: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  slaAddonRefundAmount?: number;
}

export interface DisputeSummaryDTO {
  totalDisputes: number;
  openDisputes: number;
  underReviewDisputes: number;
  resolvedRefunds: number;
  resolvedNoRefunds: number;
  chargebacks: number;
  totalRefundsGranted: number;
}

export interface ClientDisputeEligibilityDTO {
  projectId: string;
  intakeId: string;
  researchTitle: string;
  deliveredAt: string | null;
  windowExpiresAt: string | null;
  isEligible: boolean;
  remainingDays: number;
  remainingMs: number;
  reason?: string;
  existingDispute?: DisputeDTO | null;
  /** End of the free-change window (Request changes); null when it was never opened. */
  revisionWindowExpiresAt?: string | null;
  /** A change request is waiting for us or being worked on, so another can't be sent yet. */
  hasOpenChangeRequest?: boolean;
}
