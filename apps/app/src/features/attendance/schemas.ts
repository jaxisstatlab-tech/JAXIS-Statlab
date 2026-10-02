import { z } from "zod";
import type { AttendanceLogStatus, AttendanceCorrectionType, CorrectionRequestStatus, RoleName } from "@prisma/client";

// ==========================================
// Zod Request Validation Schemas
// ==========================================

export const ClockInSchema = z.object({
  notes: z.string().max(250).optional(),
});

export const ClockOutSchema = z.object({
  breakMinutes: z.coerce.number().min(0).max(360).optional(),
  notes: z.string().max(250).optional(),
});

export const AttendanceCorrectionSchema = z.object({
  correctionType: z.enum([
    "MISSED_CLOCK_IN",
    "MISSED_CLOCK_OUT",
    "MISSED_FULL_SHIFT",
    "BREAK_ADJUSTMENT",
    "OVERTIME_CLAIM",
  ]),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  claimedClockInTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  claimedClockOutTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  claimedBreakMins: z.coerce.number().min(0).max(360).default(60),
  reason: z.string().min(10, "Stated justification must be at least 10 characters").max(500),
  tasksDelivered: z.string().min(5, "Please specify key deliverables or tasks accomplished").max(1000),
});

export const ReviewCorrectionSchema = z.object({
  correctionId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  reviewNotes: z.string().max(500).optional(),
});

export const UpdateAttendancePolicySchema = z.object({
  allowWeekendWork: z.boolean(),
  allowHolidayWork: z.boolean(),
  operatingHoursMode: z.enum(["FLEXIBLE_24_7", "FIXED_CORE_HOURS"]),
  coreHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time (HH:mm)"),
  coreHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time (HH:mm)"),
  autoDeductMealBreak: z.boolean(),
  mealBreakMinutes: z.coerce.number().min(0).max(180),
  mealBreakThresholdHours: z.coerce.number().min(1).max(12),
  baseHourlyRate: z.coerce.number().min(0).max(100000),
  maxShiftCapHours: z.coerce.number().min(4).max(24),
});

export type UpdateAttendancePolicyInput = z.infer<typeof UpdateAttendancePolicySchema>;

export interface AttendancePolicyDTO {
  id?: number;
  allowWeekendWork: boolean;
  allowHolidayWork: boolean;
  operatingHoursMode: "FLEXIBLE_24_7" | "FIXED_CORE_HOURS";
  coreHoursStart: string;
  coreHoursEnd: string;
  autoDeductMealBreak: boolean;
  mealBreakMinutes: number;
  mealBreakThresholdHours: number;
  baseHourlyRate: number;
  maxShiftCapHours: number;
  updatedAt?: string;
  updatedBy?: string | null;
}

// ==========================================
// Domain Response Types & DTOs
// ==========================================

export type AttendanceActionResult<T = void> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

export interface ActiveShiftStatus {
  isOnDuty: boolean;
  activeLogId: string | null;
  clockInAt: string | null;
  elapsedSeconds: number;
  ipAddress: string | null;
  notes: string | null;
  isOnLeave: boolean;
  leaveReason?: string | null;
  /** Whether this person uses the time clock (only staff paid by the hour). Missing means "yes" for older callers. */
  timeClock?: import("@/features/payroll/schemas").TimeClockAccess;
}

export interface StaffAttendanceItem {
  id: string;
  userId: string;
  staffName: string;
  staffRole: RoleName;
  clockInAt: string;
  clockOutAt: string | null;
  breakMinutes: number;
  totalMinutes: number | null;
  netHoursFormatted: string;
  status: AttendanceLogStatus;
  isAdjusted: boolean;
  ipAddress: string | null;
  deviceLabel: string;
  isMobile: boolean;
  studyActionsCount: number;
  isZeroActivity: boolean;
  notes: string | null;
  createdAt: string;
}

export interface AttendanceCorrectionItem {
  id: string;
  attendanceLogId: string | null;
  userId: string;
  staffName: string;
  staffEmail: string;
  staffRole: RoleName;
  correctionType: AttendanceCorrectionType;
  targetDate: string;
  claimedClockIn: string;
  claimedClockOut: string;
  claimedBreakMins: number;
  claimedNetHours: number;
  reason: string;
  tasksDelivered: string | null;
  status: CorrectionRequestStatus;
  reviewedBy: string | null;
  reviewerName?: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  canApprove: boolean; // Computed based on Segregation of Duties (approver != requester)
  sodReason?: string; // Why user is blocked from approving if self-request
}

export interface AttendanceSummaryKPIs {
  totalHoursThisMonth: number;
  completedShiftsCount: number;
  pendingCorrectionsCount: number;
  adjustedShiftsCount: number;
  onDutyStaffCount: number;
}

export interface DailyAttendanceEvent {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // Mon, Tue, etc.
  dayOfMonth: number;
  isToday: boolean;
  status: "PRESENT" | "ON_LEAVE" | "OVERTIME" | "REST_DAY" | "MISSED_PUNCH" | "IN_PROGRESS";
  clockInTime?: string;
  clockOutTime?: string;
  totalHours?: string;
  netMinutes?: number;
  leaveReason?: string;
  isHoliday?: boolean;
  holidayName?: string;
  isWeekend?: boolean;
  isWorkingDay?: boolean;
  logId?: string;
  isAdjusted?: boolean;
}

export interface LeaveRecordItem {
  status: "ACTIVE_LEAVE" | "PENDING_APPROVAL" | "COMPLETED_LEAVE";
  reason: string;
  leaveFrom: string;
  leaveUntil: string;
  totalDays: number;
}

export interface PayslipSummary {
  payPeriod: string; // e.g. "August 2026"
  baseHourlyRate: number; // e.g. PHP 450.00
  totalDutyHours: number; // e.g. 168.5
  dutyHourlyEarnings: number; // dutyHours * hourlyRate
  projectMilestoneEarnings: number; // e.g. from studies
  overtimeEarnings: number;
  allowances: number;
  grossPay: number;
  withholdingTax?: number;
  netPay: number;
  status?: "DRAFT" | "APPROVED" | "DISBURSED" | string;
  payslipNumber?: string;
  commissionPercentage?: number;
  completedStudiesCount?: number;
  compensationType?: string;
  baseSalary?: number;
}

export interface HrPortalData {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: RoleName;
    status: string;
    isOnLeave: boolean;
    leaveReason?: string | null;
    leaveUntil?: string | null;
    annualLeaveBalance: number;
    medicalLeaveBalance: number;
  };
  currentMonthEvents: DailyAttendanceEvent[];
  recentLogs: StaffAttendanceItem[];
  leaveHistory: LeaveRecordItem[];
  corrections: AttendanceCorrectionItem[];
  payslip: PayslipSummary;
  policy?: AttendancePolicyDTO;
}
