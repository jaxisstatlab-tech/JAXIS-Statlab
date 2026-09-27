import { z } from "zod";

export const CreateAssignmentSchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
  statisticianId: z.string().min(1, "Statistical analyst selection is required."),
  qaLeadId: z.string().min(1, "Senior QA Lead selection is required."),
  turnaroundDays: z.number().int().positive().optional(),
});

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;

export const ReassignExpertSchema = z
  .object({
    projectId: z.string().min(1, "Project ID is required."),
    newStatisticianId: z.string().optional(),
    statisticianId: z.string().optional(),
    newQaLeadId: z.string().optional(),
    qaLeadId: z.string().optional(),
    reason: z.string().optional(),
    reassignReason: z.string().optional(),
  })
  .refine(
    (data) => {
      const r = (data.reason || data.reassignReason || "").trim();
      return r.length >= 5;
    },
    {
      message: "Please provide a reason for specialist reassignment (at least 5 characters).",
      path: ["reason"],
    }
  );

export type ReassignExpertInput = z.infer<typeof ReassignExpertSchema>;

export const RequestSlaPauseSchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
  reason: z.string().min(5, "Pause reason must be at least 5 characters."),
});

export type RequestSlaPauseInput = z.infer<typeof RequestSlaPauseSchema>;

export const ApproveSlaPauseSchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
  approved: z.boolean(),
});

export type ApproveSlaPauseInput = z.infer<typeof ApproveSlaPauseSchema>;

export const ResumeSlaSchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
});

export type ResumeSlaInput = z.infer<typeof ResumeSlaSchema>;

export interface AssignedStudySummary {
  id: string;
  intakeId: string;
  title: string;
  masterStatus: string;
  slaDueAt: string;
  slaLabel: string;
  isUrgent: boolean;
  isOverdue: boolean;
  isPaused: boolean;
}

export interface BurnoutRiskAssessment {
  isAtRisk: boolean;
  level: "NONE" | "MODERATE" | "HIGH";
  reasons: string[];
}

export interface StaffCapacityItem {
  id: string;
  fullName: string;
  email: string;
  role: "STATISTICIAN" | "SENIOR_QA_LEAD";
  avatarUrl?: string | null;
  specializations: string[];
  tools: string[];
  activeAssignmentCount: number;
  matchScore?: number;
  assignedStudies: AssignedStudySummary[];
  burnoutRisk?: BurnoutRiskAssessment;
  isLeavePending?: boolean;
  isOnLeave?: boolean;
  leaveUntil?: string | null;
  leaveReason?: string | null;
}

export interface AssignmentDetailItem {
  id: string;
  projectId: string;
  projectIntakeId: string;
  projectTitle: string;
  projectMethod?: string | null;
  projectField?: string | null;
  masterStatus: string;
  statistician: {
    id: string;
    fullName: string;
    email: string;
  };
  qaLead: {
    id: string;
    fullName: string;
    email: string;
  };
  assignedAt: string;
  slaStartAt: string;
  slaDueAt: string;
  slaPausedAt?: string | null;
  slaPauseReason?: string | null;
  slaPausedBy?: string | null;
  remainingHours: number;
  remainingDays: number;
  isUrgent: boolean;
  isOverdue: boolean;
  isPaused: boolean;
  slaLabel: string;
  reassignedAt?: string | null;
  reassignReason?: string | null;
  researchObjectives?: string | null;
  researchQuestions?: string | null;
  hypotheses?: string | null;
  files?: {
    id: string;
    fileName: string;
    fileType: string;
    fileCategory: string;
  }[];
}
