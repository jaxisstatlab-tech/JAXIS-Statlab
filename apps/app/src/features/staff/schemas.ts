import { z } from "zod";
import { RoleName, UserStatus, ViolationType, SuspensionAction } from "@prisma/client";

export const STAFF_ROLES = [
  "ADMIN",
  "STATISTICIAN",
  "SENIOR_QA_LEAD",
  "FINANCE_OFFICER",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const MANAGER_CREATABLE_ROLES: StaffRole[] = [
  "STATISTICIAN",
  "SENIOR_QA_LEAD",
];

export const CEO_CREATABLE_ROLES: StaffRole[] = [
  "ADMIN",
  "FINANCE_OFFICER",
  "SENIOR_QA_LEAD",
  "STATISTICIAN",
];

export const STANDARD_SPECIALIZATIONS = [
  "Regression",
  "ANOVA",
  "SEM",
  "Factor Analysis",
  "Time Series",
  "Instrument Validation",
  "Descriptive Statistics",
  "Mixed Methods",
  "Survival Analysis",
  "Econometrics",
  "Biostatistics",
  "Machine Learning",
] as const;

export const ProvisionStaffSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name must not exceed 50 characters")
      .optional(),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name must not exceed 50 characters")
      .optional(),
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must not exceed 100 characters")
      .optional(),
    email: z.string().email("Invalid institutional email address format"),
    role: z.enum(STAFF_ROLES, {
      errorMap: () => ({ message: "Select a valid internal staff role" }),
    }),
    specializations: z.array(z.string()).default([]),
    bio: z.string().max(1000, "Bio cannot exceed 1000 characters").optional(),
  })
  .refine(
    (data) =>
      Boolean((data.firstName && data.lastName) || data.fullName),
    {
      message: "First name and last name are required",
      path: ["firstName"],
    }
  );

export type ProvisionStaffInput = z.infer<typeof ProvisionStaffSchema>;

export const SuspendStaffSchema = z.object({
  reason: z
    .string()
    .min(10, "Suspension reason must be at least 10 characters")
    .max(500, "Reason cannot exceed 500 characters"),
  violationType: z.nativeEnum(ViolationType).optional(),
});

export type SuspendStaffInput = z.infer<typeof SuspendStaffSchema>;

export const TerminateStaffSchema = z.object({
  reason: z
    .string()
    .min(10, "Termination reason must be at least 10 characters")
    .max(500, "Reason cannot exceed 500 characters"),
  violationType: z.nativeEnum(ViolationType, {
    errorMap: () => ({ message: "Disciplinary violation type is required for termination" }),
  }),
  forfeitPayouts: z.boolean().default(false),
});

export type TerminateStaffInput = z.infer<typeof TerminateStaffSchema>;

export const UpdateStaffProfileSchema = z.object({
  bio: z.string().max(1000, "Bio cannot exceed 1000 characters").optional(),
  specializations: z
    .array(z.string())
    .min(1, "Select at least one specialization area"),
  signatureUrl: z.string().optional().nullable(),
});

export type UpdateStaffProfileInput = z.infer<typeof UpdateStaffProfileSchema>;

export const RequestLeaveSchema = z.object({
  userId: z.string().optional(),
  reason: z
    .string()
    .min(3, "Please specify a reason for leave (at least 3 characters)")
    .max(500, "Reason cannot exceed 500 characters"),
  leaveFrom: z.string().optional(),
  leaveUntil: z.string().optional(),
});

export type RequestLeaveInput = z.infer<typeof RequestLeaveSchema>;

export const StaffFilterSchema = z.object({
  role: z.enum(["ALL", ...STAFF_ROLES]).optional().default("ALL"),
  status: z.enum(["ALL", "ACTIVE", "SUSPENDED", "TERMINATED", "ON_LEAVE", "LEAVE_PENDING"]).optional().default("ALL"),
  search: z.string().optional(),
});

export type StaffFilterInput = z.infer<typeof StaffFilterSchema>;

export interface PendingLeaveItem {
  id: string;
  fullName: string;
  email: string;
  role: RoleName;
  leaveReason: string | null;
  leaveFrom: Date | string | null;
  leaveUntil: Date | string | null;
  updatedAt: Date | string;
}

export interface SpecialistLeaveOverviewData {
  kpis: {
    totalSpecialists: number;
    activeCount: number;
    pendingCount: number;
    onLeaveCount: number;
  };
  pendingLeaves: PendingLeaveItem[];
  specialists: StaffListItem[];
}

export interface StaffListItem {
  id: string;
  fullName: string;
  email: string;
  role: RoleName;
  status: UserStatus;
  specializations: string[];
  bio: string | null;
  activeProjectsCount: number;
  joinedAt: Date | string;
  leaveReason?: string | null;
  leaveFrom?: Date | string | null;
  leaveUntil?: Date | string | null;
}

export interface StaffDetailItem extends StaffListItem {
  phone: string | null;
  updatedAt: Date | string;
  suspensionLogs: {
    id: string;
    action: SuspensionAction;
    reason: string;
    violationType: ViolationType | null;
    performedBy: string;
    performedAt: Date | string;
    liftedAt: Date | string | null;
    liftedBy: string | null;
  }[];
}

export type StaffActionResult<T = unknown> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };
