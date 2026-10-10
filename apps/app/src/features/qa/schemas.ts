import { z } from "zod";
import { QADecision, ErrorClassification, AnalysisFileCategory } from "@prisma/client";

/**
 * 1. Zod Schema for Submitting a QA Review
 */
export const SubmitQAReviewSchema = z
  .object({
    projectId: z.string().min(1, "Project ID is required"),
    decision: z.nativeEnum(QADecision, {
      errorMap: () => ({ message: "Please select a valid evaluation decision." }),
    }),
    errorClassification: z.nativeEnum(ErrorClassification).optional(),
    comments: z
      .string()
      .min(10, "Please provide detailed scorecard comments (min 10 characters).")
      .max(3000, "Comments cannot exceed 3,000 characters."),
  })
  .refine(
    (data) => {
      // Rejection or Escalation requires error classification
      if (data.decision !== "QA_APPROVED" && !data.errorClassification) {
        return false;
      }
      // Escalation must specify ETHICAL_BREACH classification
      if (data.decision === "ESCALATED_TO_CEO" && data.errorClassification !== "ETHICAL_BREACH") {
        return false;
      }
      return true;
    },
    {
      message: "An error classification is required when rejecting or escalating a study.",
      path: ["errorClassification"],
    }
  );

export type SubmitQAReviewInput = z.infer<typeof SubmitQAReviewSchema>;

/**
 * 2. DTO Interfaces for Module 11
 */

export interface QaQueueItemDTO {
  id: string;
  intakeId: string;
  researchTitle: string;
  packageName: string | null;
  masterStatus: string;
  statisticianId: string;
  statisticianName: string;
  statisticianEmail: string;
  filesCount: number;
  submittedForQaAt: string | null;
  slaDueAt: string | null;
  slaDueDays: number | null;
  isSlaOverdue: boolean;
  rejectionCount: number;
}

export interface QaReviewDTO {
  id: string;
  projectId: string;
  reviewerId: string;
  reviewerName: string;
  decision: QADecision;
  decisionLabel: string;
  errorClassification: ErrorClassification | null;
  errorClassificationLabel: string | null;
  comments: string;
  qaRevisionDueAt: string | null;
  reviewedAt: string;
}

export interface QaInspectionDeskDTO {
  project: {
    id: string;
    intakeId: string;
    researchTitle: string;
    researchQuestions: string;
    researchObjectives: string;
    /** Anything else the client wrote on the intake form. */
    clientNotes?: string | null;
    hypotheses: string | null;
    chapters13: string | null;
    questionnaire: string | null;
    masterStatus: string;
    packageName: string | null;
    clientName: string;
    clientSchool: string | null;
    createdAt: string;
    qaApproved: boolean;
    isLocked: boolean;
  };
  assignment: {
    statisticianId: string;
    statisticianName: string;
    statisticianEmail: string;
    qaLeadId: string;
    qaLeadName: string;
    qaLeadEmail: string;
    slaDueAt: string;
    slaDueDays: number;
    isOverdue: boolean;
    isPaused: boolean;
  } | null;
  sow: {
    id: string;
    scopeOfWork: string;
    deliverables: string[];
    turnaroundDays: number;
    signedAt: string | null;
  } | null;
  analysisFiles: Array<{
    id: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number | null;
    fileCategory: AnalysisFileCategory;
    categoryLabel: string;
    version: number;
    isCurrent: boolean;
    notes: string | null;
    uploadedAt: string;
    statisticianName: string;
  }>;
  clientFiles: Array<{
    id: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileCategory: string;
    uploadedAt: string;
  }>;
  reviewHistory: QaReviewDTO[];
  rejectionCount: number;
  activeRevision: QaReviewDTO | null;
  canReview: boolean;
  reviewDisabledReason: string | null;
}

export interface CeoEscalationItemDTO {
  id: string;
  projectId: string;
  intakeId: string;
  researchTitle: string;
  packageName: string | null;
  qaLeadName: string;
  qaLeadEmail: string;
  statisticianName: string;
  statisticianEmail: string;
  comments: string;
  escalatedAt: string;
  isLocked: boolean;
}

export interface AdminQaRejectionWarningDTO {
  projectId: string;
  intakeId: string;
  researchTitle: string;
  statisticianName: string;
  statisticianEmail: string;
  rejectionCount: number;
  lastRejectedAt: string;
}
