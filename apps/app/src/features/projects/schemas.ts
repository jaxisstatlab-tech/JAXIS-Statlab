import { z } from "zod";
import type { ProjectStatus, FileCategory } from "@prisma/client";
import { ANALYSIS_GOAL_CODES } from "./analysis-goals";
import { CLIENT_NOTES_MAX, PREFERRED_ADDON_OPTIONS, PREFERRED_PACKAGE_OPTIONS, addOnsProblem } from "./intake-preferences";

export const FileCategoryEnum = z.enum([
  "RESEARCH_DOCUMENT",
  "DATASET",
  "QUESTIONNAIRE",
  "PAYMENT_PROOF",
  "ANALYSIS_OUTPUT",
  "DELIVERABLE",
  "DISPUTE_EVIDENCE",
]);

export const ProjectFileSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  filePath: z.string().min(1, "File path is required"),
  fileType: z.string().min(1, "File MIME type is required"),
  fileCategory: FileCategoryEnum,
});

export const CreateProjectSchema = z.object({
  researchTitle: z
    .string()
    .min(3, "Research title must be at least 3 characters")
    .max(300, "Research title cannot exceed 300 characters"),
  // On the form (since 2026-10-10): researchQuestions is "Research objectives" (a numbered list, required) and
  // researchObjectives is "Statement of the problem" (a paragraph, optional). The column names are older than
  // the labels. One of the two is enough on the server, so a tab still showing the older form can submit.
  researchQuestions: z.string().trim().max(5000).optional().default(""),
  researchObjectives: z.string().trim().max(5000).optional().default(""),
  hypotheses: z.string().optional().nullable(),
  deadlineRequested: z.string().or(z.date()),
  chapters13: z.string().optional().nullable(),
  questionnaire: z.string().optional().nullable(),
  // Optional on the server so a tab still showing the older form can submit; the form itself requires one.
  analysisGoals: z.array(z.enum(ANALYSIS_GOAL_CODES)).max(ANALYSIS_GOAL_CODES.length).optional().default([]),
  // Preferences (the form requires both; optional here for older tabs).
  preferredPackage: z.enum(PREFERRED_PACKAGE_OPTIONS).optional().nullable(),
  preferredAddOns: z
    .array(z.enum(PREFERRED_ADDON_OPTIONS))
    .max(PREFERRED_ADDON_OPTIONS.length)
    .optional()
    .default([])
    .refine((v) => v.length === 0 || addOnsProblem(v) === null, { message: "Check the add-ons you picked." }),
  clientNotes: z.string().trim().max(CLIENT_NOTES_MAX, `Keep your notes under ${CLIENT_NOTES_MAX} characters.`).optional().default(""),
  files: z.array(ProjectFileSchema).optional().default([]),
}).refine((v) => v.researchQuestions.length >= 5 || v.researchObjectives.length >= 5, {
  message: "Add your research objectives.",
  path: ["researchQuestions"],
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectStatusSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  status: z.custom<ProjectStatus>(),
  /** Why (saved in the audit log). */
  reason: z.string().max(500).optional(),
});

export type UpdateProjectStatusInput = z.infer<typeof UpdateProjectStatusSchema>;

export const RequestMissingInfoSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  reason: z
    .string()
    .min(5, "Please provide a detailed reason explaining the missing information required"),
});

export type RequestMissingInfoInput = z.infer<typeof RequestMissingInfoSchema>;

export const ProjectFilterSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

export type ProjectFilterInput = z.infer<typeof ProjectFilterSchema>;

export interface ProjectFileItem {
  id: string;
  projectId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileCategory: FileCategory;
  uploadedAt: Date | string;
}

export interface ProjectDetailItem {
  id: string;
  intakeId: string;
  clientId: string;
  researchTitle: string;
  researchQuestions: string;
  researchObjectives: string;
  hypotheses: string | null;
  /** Analysis goal codes chosen on the intake form (see analysis-goals.ts). */
  analysisGoals?: string[];
  /** The client's wishes from the intake form (see intake-preferences.ts); null / [] on older studies. */
  preferredPackage?: string | null;
  preferredAddOns?: string[];
  clientNotes?: string | null;
  chapters13: string | null;
  questionnaire: string | null;
  deadlineRequested: Date | string;
  masterStatus: ProjectStatus;
  packageName: string | null;
  missingInfoReason: string | null;
  deliveredAt: Date | string | null;
  filesPurgeAt: Date | string | null;
  filesPurged: boolean;
  hasActiveDispute: boolean;
  hasPendingRefund: boolean;
  latestPaymentStatus?: string | null;
  hasPendingPaymentVerification?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  client: {
    id: string;
    fullName: string;
    email: string;
    clientProfile?: {
      institutionSchool: string;
      academicProgram: string;
      contactNumber: string;
      region: string;
    } | null;
  };
  financialSummary?: {
    totalAmount: number;
    downpaymentRequired: number;
    verifiedPaid: number;
    remainingBalance: number;
    isDownpaymentCleared: boolean;
    isFullyPaid: boolean;
  } | null;
  files: ProjectFileItem[];
}

export type ActionResponse<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: { code?: string; message: string; fieldErrors?: Record<string, string[]> } };

export const DeleteStudySchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  reason: z.string().min(3, "Please provide a deletion reason (at least 3 characters)"),
  purgeFiles: z.boolean().optional().default(true),
});

export type DeleteStudyInput = z.infer<typeof DeleteStudySchema>;

export const RequestStudyDeletionSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  reason: z.string().min(3, "Please select a deletion reason"),
  notes: z.string().optional(),
});

export type RequestStudyDeletionInput = z.infer<typeof RequestStudyDeletionSchema>;
