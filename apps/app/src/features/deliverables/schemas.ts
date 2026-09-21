import { z } from "zod";
import { DeliverableCategory, RevisionClassification, RevisionStatus } from "@prisma/client";

export const DeliverableCategoryEnum = z.enum([
  "STATISTICAL_OUTPUT",
  "PDF_REPORT",
  "RAW_DATA_CLEANED",
  "APPENDIX",
  "OTHER",
]);

export const RevisionClassificationEnum = z.enum([
  "INCLUDED",
  "METHODOLOGY_CHANGE",
  "NEW_PAID_WORK",
]);

export const RevisionStatusEnum = z.enum([
  "PENDING_REVIEW",
  "INCLUDED",
  "METHODOLOGY_CHANGE",
  "NEW_PAID_WORK",
  "RESOLVED",
  "CANCELLED",
]);

export const UploadDeliverableSchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
  category: DeliverableCategoryEnum,
  fileName: z.string().min(1, "File name is required."),
  filePath: z.string().min(1, "File storage path is required."),
  fileSize: z.number().positive("File size must be greater than 0."),
  fileType: z.string().min(1, "File type is required."),
});

export type UploadDeliverableInput = z.infer<typeof UploadDeliverableSchema>;

export const ReleaseDeliverablesSchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
  notes: z.string().optional(),
});

export type ReleaseDeliverablesInput = z.infer<typeof ReleaseDeliverablesSchema>;

export const SubmitRevisionRequestSchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
  description: z
    .string()
    .min(10, "Please describe the specific items or chapters requiring revision (at least 10 characters).")
    .max(3000, "Revision request details cannot exceed 3,000 characters."),
  requestedSections: z.string().optional(),
});

export type SubmitRevisionRequestInput = z.infer<typeof SubmitRevisionRequestSchema>;

export const ClassifyRevisionSchema = z.object({
  revisionRequestId: z.string().min(1, "Revision Request ID is required."),
  classification: RevisionClassificationEnum,
  notes: z.string().min(5, "Please provide brief notes explaining the classification decision."),
  supplementalQuotationId: z.string().optional(),
  supplementalSowId: z.string().optional(),
});

export type ClassifyRevisionInput = z.infer<typeof ClassifyRevisionSchema>;

export interface DeliverableDTO {
  id: string;
  projectId: string;
  category: DeliverableCategory;
  categoryLabel: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploaderName: string;
  isFinalReleased: boolean;
  releasedAt: string | null;
  releasedBy: string | null;
  releaserName?: string | null;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionRequestDTO {
  id: string;
  projectId: string;
  projectTitle: string;
  intakeId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  description: string;
  requestedSections?: string | null;
  status: RevisionStatus;
  classification?: RevisionClassification | null;
  classificationLabel?: string | null;
  classificationNotes?: string | null;
  classifiedBy?: string | null;
  classifierName?: string | null;
  classifiedAt?: string | null;
  supplementalQuotationId?: string | null;
  supplementalSowId?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDeliverablesDeskDTO {
  project: {
    id: string;
    intakeId: string;
    researchTitle: string;
    masterStatus: string;
    packageName?: string | null;
    qaApproved: boolean;
    deliveredAt?: string | null;
    filesPurgeAt?: string | null;
    revisionWindowExpiresAt?: string | null;
    client: {
      id: string;
      fullName: string;
      email: string;
    };
    assignedStatistician?: {
      id: string;
      fullName: string;
    } | null;
    assignedQaLead?: {
      id: string;
      fullName: string;
    } | null;
  };
  gateEligibility: {
    eligible: boolean;
    financialGatePassed: boolean;
    qaGatePassed: boolean;
    totalAmount: number;
    totalPaid: number;
    remainingBalance: number;
    isTier2Package: boolean;
    qaApproved: boolean;
    deliverablesCount: number;
    reasons: string[];
  };
  deliverables: DeliverableDTO[];
  revisions: RevisionRequestDTO[];
}

export interface QaCertificateDTO {
  certificateId: string;
  researchTitle: string;
  clientName: string;
  clientEmail: string;
  institution: string;
  program: string;
  tierExecuted: string;
  completionDate: string;
  qaLeadName: string;
  qaLeadTitle: string;
  qaSignatureUrl?: string | null;
  statisticianName?: string | null;
  statisticianTitle?: string | null;
  statisticianSignatureUrl?: string | null;
}

export interface ClientDeliverablesDTO {
  project: {
    id: string;
    intakeId: string;
    researchTitle: string;
    masterStatus: string;
    packageName?: string | null;
    deliveredAt?: string | null;
    filesPurgeAt?: string | null;
    revisionWindowExpiresAt?: string | null;
  };
  isReleased: boolean;
  paymentLock?: {
    isLocked: boolean;
    remainingBalance: number;
    totalAmount: number;
    totalPaid: number;
  } | null;
  revisionWindow: {
    isActive: boolean;
    isExpired: boolean;
    remainingDays: number;
    remainingHours: number;
    remainingFormatted: string;
    expiresAtFormatted?: string | null;
  };
  deliverables: DeliverableDTO[];
  revisions: RevisionRequestDTO[];
  hasPendingRevision: boolean;
  qaCertificate?: QaCertificateDTO | null;
}
