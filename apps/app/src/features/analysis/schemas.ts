import { z } from "zod";
import { AnalysisFileCategory } from "@prisma/client";
import type { QaReviewDTO } from "@/features/qa/schemas";

export const AnalysisFileCategoryEnum = z.nativeEnum(AnalysisFileCategory);

export const UploadAnalysisFileSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  fileName: z.string().min(1, "File name is required"),
  filePath: z.string().min(1, "File path is required"),
  fileType: z.string().default("application/octet-stream"),
  fileSize: z.number().int().positive().optional(),
  fileCategory: AnalysisFileCategoryEnum,
  notes: z.string().max(1000).optional(),
});

export type UploadAnalysisFileInput = z.infer<typeof UploadAnalysisFileSchema>;

export const FlagScopeCreepSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  flagReason: z
    .string()
    .min(10, "Please provide a clear description of the out-of-scope work requested (at least 10 characters)")
    .max(2000, "Scope description is too long (maximum 2,000 characters)"),
});

export type FlagScopeCreepInput = z.infer<typeof FlagScopeCreepSchema>;

export const ResolveScopeCreepSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  scopeCreepLogId: z.string().min(1, "Scope creep log ID is required"),
  resolutionNotes: z.string().min(5, "Resolution notes are required"),
  supplementalQuotationId: z.string().optional(),
});

export type ResolveScopeCreepInput = z.infer<typeof ResolveScopeCreepSchema>;

export const SubmitForQASchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  notes: z.string().max(2000).optional(),
});

export type SubmitForQAInput = z.infer<typeof SubmitForQASchema>;

export interface AnalysisFileDTO {
  id: string;
  projectId: string;
  statisticianId: string;
  statisticianName: string;
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
  downloadUrl?: string;
  versionCount?: number;
}

export interface ScopeCreepLogDTO {
  id: string;
  projectId: string;
  flaggedBy: string;
  flaggerName: string;
  flagReason: string;
  flaggedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolverName: string | null;
  resolutionNotes: string | null;
  supplementalQuotationId: string | null;
  isResolved: boolean;
}

export interface ClientDatasetFileDTO {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileCategory: string;
  uploadedAt: string;
}

export interface WorkbenchDataDTO {
  project: {
    id: string;
    intakeId: string;
    researchTitle: string;
    researchQuestions: string;
    researchObjectives: string;
    hypotheses: string | null;
    chapters13: string | null;
    questionnaire: string | null;
    masterStatus: string;
    packageName: string | null;
    clientName: string;
    clientEmail: string;
    clientSchool: string | null;
    createdAt: string;
    deliveredAt: string | null;
  };
  assignment: {
    id: string;
    statisticianId: string;
    statisticianName: string;
    statisticianEmail: string;
    qaLeadId: string;
    qaLeadName: string;
    qaLeadEmail: string;
    slaStartAt: string;
    slaDueAt: string;
    slaDueDays: number;
    slaLabel: string;
    isPaused: boolean;
    isOverdue: boolean;
    isUrgent: boolean;
  } | null;
  sow: {
    id: string;
    scopeOfWork: string;
    deliverables: string[];
    timelineDays: number;
    signedAt: string | null;
  } | null;
  clientFiles: ClientDatasetFileDTO[];
  analysisFiles: AnalysisFileDTO[];
  activeScopeCreep: ScopeCreepLogDTO | null;
  canUpload: boolean;
  uploadDisabledReason?: string;
  isAssignedStatistician: boolean;
  isAssignedQaLead: boolean;
  isManagement: boolean;
  qaReviews?: QaReviewDTO[];
  activeRevision?: QaReviewDTO | null;
}
