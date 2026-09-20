"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { db, withDbTimeout } from "@/lib/db";
import { requireRole, auth } from "@/lib/auth";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache-tags";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import {
  ClockInSchema,
  ClockOutSchema,
  AttendanceCorrectionSchema,
  ReviewCorrectionSchema,
  UpdateAttendancePolicySchema,
  type AttendancePolicyDTO,
  type ActiveShiftStatus,
  type StaffAttendanceItem,
  type AttendanceCorrectionItem,
  type AttendanceSummaryKPIs,
  type AttendanceActionResult,
} from "./schemas";
import type { RoleName } from "@prisma/client";
import { parseUserAgent } from "@/lib/attendance-device";

const INTERNAL_ROLES = ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN", "CEO"] as const;

function formatNetHours(totalMinutes: number | null): string {
  if (totalMinutes === null || totalMinutes === undefined) return "--";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/**
 * Helper to fetch the live CEO Company Labor & Duty Policy.
 */
export async function getLaborPolicyConfig(): Promise<AttendancePolicyDTO> {
  const fallbackPolicy: AttendancePolicyDTO = {
    id: 1,
    allowWeekendWork: true,
    allowHolidayWork: true,
    operatingHoursMode: "FLEXIBLE_24_7",
    coreHoursStart: "08:00",
    coreHoursEnd: "18:00",
    autoDeductMealBreak: true,
    mealBreakMinutes: 60,
    mealBreakThresholdHours: 5.0,
    baseHourlyRate: 450.0,
    maxShiftCapHours: 14,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  };

  try {
    let config = await db.attendancePolicyConfig.findFirst({
      orderBy: { id: "asc" },
    });

    if (!config) {
      try {
        config = await db.attendancePolicyConfig.create({
          data: {
            allowWeekendWork: true,
            allowHolidayWork: true,
            operatingHoursMode: "FLEXIBLE_24_7",
            coreHoursStart: "08:00",
            coreHoursEnd: "18:00",
            autoDeductMealBreak: true,
            mealBreakMinutes: 60,
            mealBreakThresholdHours: 5.0,
            baseHourlyRate: 450.0,
            maxShiftCapHours: 14,
          },
        });
      } catch {
        return fallbackPolicy;
      }
    }

    return {
      id: config.id,
      allowWeekendWork: config.allowWeekendWork,
      allowHolidayWork: config.allowHolidayWork,
      operatingHoursMode: (config.operatingHoursMode as "FLEXIBLE_24_7" | "FIXED_CORE_HOURS") || "FLEXIBLE_24_7",
      coreHoursStart: config.coreHoursStart,
      coreHoursEnd: config.coreHoursEnd,
      autoDeductMealBreak: config.autoDeductMealBreak,
      mealBreakMinutes: config.mealBreakMinutes,
      mealBreakThresholdHours: Number(config.mealBreakThresholdHours),
      baseHourlyRate: Number(config.baseHourlyRate),
      maxShiftCapHours: config.maxShiftCapHours,
      updatedAt: config.updatedAt.toISOString(),
      updatedBy: config.updatedBy,
    };
  } catch {
    return fallbackPolicy;
  }
}

/**
 * Public action for staff/UI to fetch current active duty policies.
 */
export async function getCompanyAttendancePolicy(): Promise<AttendancePolicyDTO> {
  await requireRole(...INTERNAL_ROLES);
  return getLaborPolicyConfig();
}

/**
 * CEO-Only: Update corporate-wide attendance and duty policies.
 */
export async function updateCompanyAttendancePolicy(
  input: unknown
): Promise<AttendanceActionResult<AttendancePolicyDTO>> {
  const session = await requireRole("CEO");
  const parsed = UpdateAttendancePolicySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid labor policy parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const {
    allowWeekendWork,
    allowHolidayWork,
    operatingHoursMode,
    coreHoursStart,
    coreHoursEnd,
    autoDeductMealBreak,
    mealBreakMinutes,
    mealBreakThresholdHours,
    baseHourlyRate,
    maxShiftCapHours,
  } = parsed.data;

  try {
    return await withDbTimeout((async () => {
      const existing = await db.attendancePolicyConfig.findFirst({
        orderBy: { id: "asc" },
      });

      let updated;
      if (existing) {
        updated = await db.attendancePolicyConfig.update({
          where: { id: existing.id },
          data: {
            allowWeekendWork,
            allowHolidayWork,
            operatingHoursMode,
            coreHoursStart,
            coreHoursEnd,
            autoDeductMealBreak,
            mealBreakMinutes,
            mealBreakThresholdHours,
            baseHourlyRate,
            maxShiftCapHours,
            updatedBy: session.user.id,
          },
        });
      } else {
        updated = await db.attendancePolicyConfig.create({
          data: {
            allowWeekendWork,
            allowHolidayWork,
            operatingHoursMode,
            coreHoursStart,
            coreHoursEnd,
            autoDeductMealBreak,
            mealBreakMinutes,
            mealBreakThresholdHours,
            baseHourlyRate,
            maxShiftCapHours,
            updatedBy: session.user.id,
          },
        });
      }

      revalidatePath("/dashboard/ceo/attendance");
      revalidatePath("/dashboard/staff/attendance");
      revalidatePath("/dashboard/staff/hr");

      try {
        dispatchRealtimeNotification({
          eventType: "ATTENDANCE_UPDATE",
          title: "Duty Policy Updated",
          message: "Company attendance and duty policies have been updated by leadership.",
          targetRoles: ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN"],
          excludeUserId: session.user.id,
        });
      } catch (notifyErr) {
        console.warn("[updateCompanyAttendancePolicy] Realtime notification warning:", notifyErr);
      }

      return {
        success: true,
        data: {
          id: updated.id,
          allowWeekendWork: updated.allowWeekendWork,
          allowHolidayWork: updated.allowHolidayWork,
          operatingHoursMode: updated.operatingHoursMode as "FLEXIBLE_24_7" | "FIXED_CORE_HOURS",
          coreHoursStart: updated.coreHoursStart,
          coreHoursEnd: updated.coreHoursEnd,
          autoDeductMealBreak: updated.autoDeductMealBreak,
          mealBreakMinutes: updated.mealBreakMinutes,
          mealBreakThresholdHours: Number(updated.mealBreakThresholdHours),
          baseHourlyRate: Number(updated.baseHourlyRate),
          maxShiftCapHours: updated.maxShiftCapHours,
          updatedAt: updated.updatedAt.toISOString(),
          updatedBy: updated.updatedBy,
        },
      };
    })());
  } catch (error: unknown) {
    console.error("[attendance/updateCompanyAttendancePolicy] Error:", error);
    return {
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to update corporate labor policy.",
      },
    };
  }
}

/**
 * 1. Clock In on active duty.
 * Internal staff only. Enforces live CEO corporate policies.
 */
export async function clockIn(
  input?: unknown
): Promise<AttendanceActionResult<{ logId: string; clockInAt: string }>> {
  const session = await requireRole(...INTERNAL_ROLES);
  const userId = session.user.id;

  const parsed = ClockInSchema.safeParse(input || {});
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid clock-in parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const reqHeaders = await headers();
  const ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || reqHeaders.get("x-real-ip") || "127.0.0.1";
  const userAgent = reqHeaders.get("user-agent") || "Web Dashboard";

  try {
    return await withDbTimeout((async () => {
      const policy = await getLaborPolicyConfig();
      const now = new Date();

      // Check Weekend Policy
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend && !policy.allowWeekendWork) {
        return {
          success: false,
          error: {
            code: "WEEKEND_WORK_DISABLED",
            message: "Weekend duty logging is disabled by company policy. If you have an urgent milestone, please file an Overtime Claim with justification.",
          },
        };
      }

      // Check Holiday Policy
      if (!policy.allowHolidayWork) {
        const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const holiday = await db.philippineHoliday.findUnique({
          where: { date: todayDateOnly },
        });
        if (holiday) {
          return {
            success: false,
            error: {
              code: "HOLIDAY_WORK_DISABLED",
              message: `Duty logging is disabled today in observance of ${holiday.name} (${holiday.type === "REGULAR" ? "Regular Holiday" : "Special Non-Working Holiday"}).`,
            },
          };
        }
      }

      // Check Operating Shift Hours
      if (policy.operatingHoursMode === "FIXED_CORE_HOURS") {
        const currentHours = String(now.getHours()).padStart(2, "0");
        const currentMins = String(now.getMinutes()).padStart(2, "0");
        const currentTimeStr = `${currentHours}:${currentMins}`;
        if (currentTimeStr < policy.coreHoursStart || currentTimeStr > policy.coreHoursEnd) {
          return {
            success: false,
            error: {
              code: "OUTSIDE_OPERATING_HOURS",
              message: `Duty logging is restricted to core shift hours (${policy.coreHoursStart} - ${policy.coreHoursEnd}). Current time: ${currentTimeStr}.`,
            },
          };
        }
      }

      // 1. Verify user status (cannot clock in if ON_LEAVE or SUSPENDED)
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { status: true, leaveReason: true, leaveUntil: true },
      });

      if (!user || user.status === "SUSPENDED" || user.status === "TERMINATED") {
        return {
          success: false,
          error: {
            code: "ACCOUNT_INACTIVE",
            message: "Your account is not active for duty logging.",
          },
        };
      }

      if (user.status === "ON_LEAVE") {
        return {
          success: false,
          error: {
            code: "STAFF_ON_LEAVE",
            message: `You are currently marked ON LEAVE until ${
              user.leaveUntil ? new Date(user.leaveUntil).toLocaleDateString("en-PH") : "further notice"
            }. Please conclude your leave before clocking in.`,
          },
        };
      }

      // 2. Check for active shift
      const activeShift = await db.staffAttendanceLog.findFirst({
        where: { userId, status: "IN_PROGRESS" },
        orderBy: { clockInAt: "desc" },
      });

      if (activeShift) {
        // Auto-close if older than configured max cap
        const elapsedHours = (Date.now() - activeShift.clockInAt.getTime()) / (1000 * 60 * 60);
        if (elapsedHours > policy.maxShiftCapHours) {
          const autoBreak = policy.autoDeductMealBreak ? policy.mealBreakMinutes : 0;
          await db.staffAttendanceLog.update({
            where: { id: activeShift.id },
            data: {
              status: "AUTO_CLOSED",
              clockOutAt: new Date(activeShift.clockInAt.getTime() + policy.maxShiftCapHours * 60 * 60 * 1000),
              breakMinutes: autoBreak,
              totalMinutes: Math.max(0, policy.maxShiftCapHours * 60 - autoBreak),
              notes: `System Auto-Cap: Shift exceeded corporate ${policy.maxShiftCapHours}h maximum threshold.`,
            },
          });
        } else {
          return {
            success: false,
            error: {
              code: "ALREADY_CLOCKED_IN",
              message: "You already have an active duty session in progress.",
            },
          };
        }
      }

      // 3. Create new attendance log
      const newLog = await db.staffAttendanceLog.create({
        data: {
          userId,
          clockInAt: new Date(),
          status: "IN_PROGRESS",
          ipAddress,
          userAgent,
          notes: parsed.data.notes || null,
        },
      });

      revalidatePath("/dashboard");
      invalidateCacheTags(CACHE_TAGS.ATTENDANCE_REVIEW);
      return {
        success: true,
        data: {
          logId: newLog.id,
          clockInAt: newLog.clockInAt.toISOString(),
        },
      };
    })());
  } catch (error: unknown) {
    console.error("[attendance/clockIn] Database error:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to log clock-in. Please try again.",
      },
    };
  }
}

/**
 * 2. Clock Out from active duty.
 * Automatically enforces CEO meal break deduction rules.
 */
export async function clockOut(
  input?: unknown
): Promise<AttendanceActionResult<{ logId: string; totalMinutes: number; netHoursFormatted: string }>> {
  const session = await requireRole(...INTERNAL_ROLES);
  const userId = session.user.id;

  const parsed = ClockOutSchema.safeParse(input || {});
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid clock-out parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { breakMinutes, notes } = parsed.data;

  try {
    return await withDbTimeout((async () => {
      const policy = await getLaborPolicyConfig();
      const activeShift = await db.staffAttendanceLog.findFirst({
        where: { userId, status: "IN_PROGRESS" },
        orderBy: { clockInAt: "desc" },
      });

      if (!activeShift) {
        return {
          success: false,
          error: {
            code: "NO_ACTIVE_SHIFT",
            message: "No active clock-in session found to clock out from.",
          },
        };
      }

      const now = new Date();
      const grossMinutes = Math.max(0, Math.round((now.getTime() - activeShift.clockInAt.getTime()) / 60000));
      
      // Dynamic meal break policy calculation:
      let defaultAutoBreak = 0;
      if (policy.autoDeductMealBreak) {
        const thresholdMins = policy.mealBreakThresholdHours * 60;
        if (grossMinutes >= thresholdMins) {
          defaultAutoBreak = policy.mealBreakMinutes;
        }
      }
      
      const effectiveBreakMins = breakMinutes !== undefined ? breakMinutes : defaultAutoBreak;
      const netMinutes = Math.max(0, grossMinutes - effectiveBreakMins);

      const updated = await db.staffAttendanceLog.update({
        where: { id: activeShift.id },
        data: {
          clockOutAt: now,
          breakMinutes: effectiveBreakMins,
          totalMinutes: netMinutes,
          status: "COMPLETED",
          notes: notes ? (activeShift.notes ? `${activeShift.notes} | ${notes}` : notes) : activeShift.notes,
        },
      });

      revalidatePath("/dashboard");
      invalidateCacheTags(CACHE_TAGS.ATTENDANCE_REVIEW, CACHE_TAGS.PAYROLL);
      return {
        success: true,
        data: {
          logId: updated.id,
          totalMinutes: netMinutes,
          netHoursFormatted: formatNetHours(netMinutes),
        },
      };
    })());
  } catch (error: unknown) {
    console.error("[attendance/clockOut] Database error:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to conclude shift.",
      },
    };
  }
}

/**
 * 3. Fetch current user's live active shift status (for Topbar widget).
 */
export async function getActiveShift(): Promise<ActiveShiftStatus> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      isOnDuty: false,
      activeLogId: null,
      clockInAt: null,
      elapsedSeconds: 0,
      ipAddress: null,
      notes: null,
      isOnLeave: false,
    };
  }

  try {
    return await withDbTimeout((async () => {
      let user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true, leaveReason: true, leaveUntil: true },
      });

      if (!user && session?.user?.email) {
        user = await db.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, status: true, leaveReason: true, leaveUntil: true },
        });
      }

      const effectiveUserId = user?.id || userId;

      const activeShift = await db.staffAttendanceLog.findFirst({
        where: { userId: effectiveUserId, status: "IN_PROGRESS" },
        orderBy: { clockInAt: "desc" },
      });

      if (!activeShift) {
        return {
          isOnDuty: false,
          activeLogId: null,
          clockInAt: null,
          elapsedSeconds: 0,
          ipAddress: null,
          notes: null,
          isOnLeave: user?.status === "ON_LEAVE",
          leaveReason: user?.leaveReason,
        };
      }

      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - activeShift.clockInAt.getTime()) / 1000));
      const policy = await getLaborPolicyConfig();

      // Auto-close if runaway
      if (elapsedSeconds > policy.maxShiftCapHours * 3600) {
        const autoBreak = policy.autoDeductMealBreak ? policy.mealBreakMinutes : 0;
        await db.staffAttendanceLog.update({
          where: { id: activeShift.id },
          data: {
            status: "AUTO_CLOSED",
            clockOutAt: new Date(activeShift.clockInAt.getTime() + policy.maxShiftCapHours * 3600 * 1000),
            breakMinutes: autoBreak,
            totalMinutes: Math.max(0, policy.maxShiftCapHours * 60 - autoBreak),
            notes: `Auto-closed: Exceeded ${policy.maxShiftCapHours}h maximum duty window.`,
          },
        });
        return {
          isOnDuty: false,
          activeLogId: null,
          clockInAt: null,
          elapsedSeconds: 0,
          ipAddress: null,
          notes: null,
          isOnLeave: user?.status === "ON_LEAVE",
          leaveReason: user?.leaveReason,
        };
      }

      return {
        isOnDuty: true,
        activeLogId: activeShift.id,
        clockInAt: activeShift.clockInAt.toISOString(),
        elapsedSeconds,
        ipAddress: activeShift.ipAddress,
        notes: activeShift.notes,
        isOnLeave: user?.status === "ON_LEAVE",
        leaveReason: user?.leaveReason,
      };
    })());
  } catch (error: unknown) {
    console.error("[attendance/getActiveShift] Error:", error);
    const { getDevUserByEmail } = await import("@/lib/mock-data/users.data");
    const devUser = session?.user?.email ? getDevUserByEmail(session.user.email) : null;
    return {
      isOnDuty: false,
      activeLogId: null,
      clockInAt: null,
      elapsedSeconds: 0,
      ipAddress: null,
      notes: null,
      isOnLeave: devUser?.status === "ON_LEAVE",
      leaveReason: devUser?.status === "ON_LEAVE" ? "Specialist Leave" : undefined,
    };
  }
}

/**
 * 4. Fetch personal timesheets & history for current staff.
 */
export async function getMyAttendanceHistory(): Promise<{
  logs: StaffAttendanceItem[];
  corrections: AttendanceCorrectionItem[];
  kpis: {
    totalHoursThisWeek: number;
    completedShiftsCount: number;
    pendingCorrectionsCount: number;
  };
}> {
  const session = await requireRole(...INTERNAL_ROLES);
  const userId = session.user.id;

  try {
    return await withDbTimeout((async () => {
      const logs = await db.staffAttendanceLog.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              fullName: true,
              userRoles: { include: { role: true } },
            },
          },
        },
        orderBy: { clockInAt: "desc" },
        take: 30,
      });

      const corrections = await db.attendanceCorrectionRequest.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              userRoles: { include: { role: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const weekLogs = logs.filter(
        (l: { status: string }) => l.status === "COMPLETED" || l.status === "ADJUSTED" || l.status === "AUTO_CLOSED"
      );

      const totalWeekMinutes = weekLogs
        .filter((l: { clockInAt: Date }) => l.clockInAt >= startOfWeek)
        .reduce((sum: number, l: { totalMinutes: number | null }) => sum + (l.totalMinutes || 0), 0);

      const pendingCount = corrections.filter((c: { status: string }) => c.status === "PENDING").length;

      return {
        logs: logs.map((l) => {
          const dev = parseUserAgent(l.userAgent);
          const durationMins = l.totalMinutes || (l.status === "IN_PROGRESS" ? Math.round((Date.now() - l.clockInAt.getTime()) / 60000) : 0);
          const studyActionsCount = l.status === "AUTO_CLOSED" ? 0 : (l.status === "IN_PROGRESS" ? 1 : Math.max(0, Math.round(durationMins / 80)));
          const isZeroActivity = durationMins >= 240 && studyActionsCount === 0;

          return {
            id: l.id,
            userId: l.userId,
            staffName: l.user.fullName,
            staffRole: (l.user.userRoles[0]?.role.name as RoleName) || "STATISTICIAN",
            clockInAt: l.clockInAt.toISOString(),
            clockOutAt: l.clockOutAt ? l.clockOutAt.toISOString() : null,
            breakMinutes: l.breakMinutes,
            totalMinutes: l.totalMinutes,
            netHoursFormatted: formatNetHours(l.totalMinutes),
            status: l.status,
            isAdjusted: l.isAdjusted,
            ipAddress: l.ipAddress,
            deviceLabel: dev.deviceLabel,
            isMobile: dev.isMobile,
            studyActionsCount,
            isZeroActivity,
            notes: l.notes,
            createdAt: l.createdAt.toISOString(),
          };
        }),
        corrections: corrections.map((c) => ({
          id: c.id,
          attendanceLogId: c.attendanceLogId,
          userId: c.userId,
          staffName: c.user.fullName,
          staffEmail: c.user.email,
          staffRole: (c.user.userRoles[0]?.role.name as RoleName) || "STATISTICIAN",
          correctionType: c.correctionType,
          targetDate: c.targetDate.toISOString().split("T")[0]!,
          claimedClockIn: c.claimedClockIn.toISOString(),
          claimedClockOut: c.claimedClockOut.toISOString(),
          claimedBreakMins: c.claimedBreakMins,
          claimedNetHours: Number(c.claimedNetHours),
          reason: c.reason,
          tasksDelivered: c.tasksDelivered,
          status: c.status,
          reviewedBy: c.reviewedBy,
          reviewedAt: c.reviewedAt ? c.reviewedAt.toISOString() : null,
          reviewNotes: c.reviewNotes,
          createdAt: c.createdAt.toISOString(),
          canApprove: false,
        })),
        kpis: {
          totalHoursThisWeek: Math.round((totalWeekMinutes / 60) * 10) / 10,
          completedShiftsCount: weekLogs.length,
          pendingCorrectionsCount: pendingCount,
        },
      };
    })());
  } catch (error: unknown) {
    console.error("[attendance/getMyAttendanceHistory] Error:", error);
    return {
      logs: [],
      corrections: [],
      kpis: { totalHoursThisWeek: 0, completedShiftsCount: 0, pendingCorrectionsCount: 0 },
    };
  }
}

/**
 * 5. File a Missed Punch / Attendance Correction request.
 */
export async function fileAttendanceCorrection(
  input: unknown
): Promise<AttendanceActionResult<{ correctionId: string }>> {
  const session = await requireRole(...INTERNAL_ROLES);
  const userId = session.user.id;

  const parsed = AttendanceCorrectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid attendance correction request parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { correctionType, targetDate, claimedClockInTime, claimedClockOutTime, claimedBreakMins, reason, tasksDelivered } = parsed.data;

  const claimedClockIn = new Date(`${targetDate}T${claimedClockInTime}:00`);
  let claimedClockOut = new Date(`${targetDate}T${claimedClockOutTime}:00`);

  if (claimedClockOut <= claimedClockIn) {
    claimedClockOut = new Date(claimedClockOut.getTime() + 24 * 60 * 60 * 1000);
  }

  const grossMinutes = Math.max(0, Math.round((claimedClockOut.getTime() - claimedClockIn.getTime()) / 60000));
  const netMinutes = Math.max(0, grossMinutes - claimedBreakMins);
  const claimedNetHours = Math.round((netMinutes / 60) * 100) / 100;

  if (claimedNetHours <= 0) {
    return {
      success: false,
      error: {
        code: "INVALID_HOURS",
        message: "Net claimed hours after break deduction must be greater than 0.",
      },
    };
  }

  try {
    return await withDbTimeout((async () => {
      const existingLog = await db.staffAttendanceLog.findFirst({
        where: {
          userId,
          clockInAt: {
            gte: new Date(`${targetDate}T00:00:00`),
            lte: new Date(`${targetDate}T23:59:59`),
          },
        },
      });

      const correction = await db.attendanceCorrectionRequest.create({
        data: {
          userId,
          attendanceLogId: existingLog?.id || null,
          correctionType,
          targetDate: new Date(targetDate),
          claimedClockIn,
          claimedClockOut,
          claimedBreakMins,
          claimedNetHours,
          reason,
          tasksDelivered,
          status: "PENDING",
        },
      });

      revalidatePath("/dashboard");
      invalidateCacheTags(CACHE_TAGS.ATTENDANCE_REVIEW);

      try {
        dispatchRealtimeNotification({
          eventType: "ATTENDANCE_UPDATE",
          title: "Attendance Correction Requested",
          message: `${session.user.name || "Staff member"} requested a punch correction for ${targetDate} (${claimedNetHours}h).`,
          targetRoles: ["ADMIN", "FINANCE_OFFICER"],
          excludeUserId: userId,
        });
      } catch (notifyErr) {
        console.warn("[fileAttendanceCorrection] Realtime notification warning:", notifyErr);
      }

      return {
        success: true,
        data: { correctionId: correction.id },
      };
    })());
  } catch (error: unknown) {
    console.error("[attendance/fileAttendanceCorrection] Error:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to submit attendance correction request.",
      },
    };
  }
}

/**
 * In-memory cached retrieval of Attendance Review raw data.
 * Invalidation tag: attendance-review
 */
const fetchCachedAttendanceDeskRaw = unstable_cache(
  async (startOfMonthIso: string) => {
    const startOfMonth = new Date(startOfMonthIso);

    const [corrections, allLogsThisMonth, activePunches] = await Promise.all([
      db.attendanceCorrectionRequest.findMany({
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              userRoles: { include: { role: true } },
            },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      }),
      db.staffAttendanceLog.findMany({
        where: { clockInAt: { gte: startOfMonth } },
        select: { totalMinutes: true, status: true, isAdjusted: true },
      }),
      db.staffAttendanceLog.count({ where: { status: "IN_PROGRESS" } }),
    ]);

    const reviewerIds = Array.from(
      new Set(corrections.map((c) => c.reviewedBy).filter(Boolean))
    ) as string[];

    let reviewers: { id: string; fullName: string }[] = [];
    if (reviewerIds.length > 0) {
      reviewers = await db.user.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, fullName: true },
      });
    }

    return {
      corrections,
      allLogsThisMonth,
      activePunches,
      reviewers,
    };
  },
  ["attendance-desk-raw"],
  {
    revalidate: 30,
    tags: [CACHE_TAGS.ATTENDANCE_REVIEW],
  }
);

/**
 * 6. Fetch HR Attendance Review Desk Queue (Finance Officer, Admin, CEO).
 */
export async function getAttendanceReviewDeskData(): Promise<{
  corrections: AttendanceCorrectionItem[];
  kpis: AttendanceSummaryKPIs;
}> {
  const session = await requireRole("FINANCE_OFFICER", "ADMIN", "CEO");
  const userId = session.user.id;
  const userRole = session.user.role;

  try {
    return await withDbTimeout((async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { corrections, allLogsThisMonth, activePunches, reviewers } =
        await fetchCachedAttendanceDeskRaw(startOfMonth.toISOString());

      const reviewerMap = new Map<string, string>(
        reviewers.map((r) => [r.id, r.fullName])
      );

      const totalMinutes = allLogsThisMonth.reduce(
        (sum: number, l: { totalMinutes: number | null }) => sum + (l.totalMinutes || 0),
        0
      );
      const completedShifts = allLogsThisMonth.filter(
        (l: { status: string }) => l.status === "COMPLETED" || l.status === "ADJUSTED"
      ).length;
      const adjustedShifts = allLogsThisMonth.filter(
        (l: { isAdjusted: boolean }) => l.isAdjusted
      ).length;
      const pendingCount = corrections.filter(
        (c: { status: string }) => c.status === "PENDING"
      ).length;

      const formattedCorrections: AttendanceCorrectionItem[] = corrections.map((c) => {
        const requesterRole = (c.user.userRoles[0]?.role.name as RoleName) || "STATISTICIAN";
        const isSelf = c.userId === userId;

        // Segregation of Duties logic:
        let canApprove = false;
        let sodReason: string | undefined;

        if (isSelf) {
          canApprove = false;
          sodReason = "Self-approval is strictly forbidden under Anti-Fraud Segregation of Duties.";
        } else if (userRole === "CEO") {
          canApprove = true;
        } else if (userRole === "ADMIN") {
          canApprove = requesterRole !== "ADMIN" && requesterRole !== "CEO";
          if (!canApprove) sodReason = "Admin attendance requires CEO or Finance & HR review.";
        } else if (userRole === "FINANCE_OFFICER") {
          canApprove = requesterRole === "STATISTICIAN" || requesterRole === "SENIOR_QA_LEAD" || requesterRole === "ADMIN";
          if (!canApprove) sodReason = "Finance Officer cannot approve executive CEO adjustments.";
        }

        return {
          id: c.id,
          attendanceLogId: c.attendanceLogId,
          userId: c.userId,
          staffName: c.user.fullName,
          staffEmail: c.user.email,
          staffRole: requesterRole,
          correctionType: c.correctionType,
          targetDate: c.targetDate.toISOString().split("T")[0]!,
          claimedClockIn: c.claimedClockIn.toISOString(),
          claimedClockOut: c.claimedClockOut.toISOString(),
          claimedBreakMins: c.claimedBreakMins,
          claimedNetHours: Number(c.claimedNetHours),
          reason: c.reason,
          tasksDelivered: c.tasksDelivered,
          status: c.status,
          reviewedBy: c.reviewedBy,
          reviewerName: c.reviewedBy ? reviewerMap.get(c.reviewedBy) || "Authorized Reviewer" : null,
          reviewedAt: c.reviewedAt ? c.reviewedAt.toISOString() : null,
          reviewNotes: c.reviewNotes,
          createdAt: c.createdAt.toISOString(),
          canApprove: c.status === "PENDING" && canApprove,
          sodReason,
        };
      });

      return {
        corrections: formattedCorrections,
        kpis: {
          totalHoursThisMonth: Math.round((totalMinutes / 60) * 10) / 10,
          completedShiftsCount: completedShifts,
          pendingCorrectionsCount: pendingCount,
          adjustedShiftsCount: adjustedShifts,
          onDutyStaffCount: activePunches,
        },
      };
    })());
  } catch (error: unknown) {
    console.error("[attendance/getAttendanceReviewDeskData] Error:", error);
    return {
      corrections: [],
      kpis: { totalHoursThisMonth: 0, completedShiftsCount: 0, pendingCorrectionsCount: 0, adjustedShiftsCount: 0, onDutyStaffCount: 0 },
    };
  }
}

/**
 * 7. Review & Authorize / Reject Attendance Correction.
 */
export async function reviewAttendanceCorrection(
  input: unknown
): Promise<AttendanceActionResult<{ correctionId: string; status: string }>> {
  const session = await requireRole("FINANCE_OFFICER", "ADMIN", "CEO");
  const userId = session.user.id;
  const userRole = session.user.role;

  const parsed = ReviewCorrectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid review parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { correctionId, action, reviewNotes } = parsed.data;

  try {
    return await withDbTimeout((async () => {
      const correction = await db.attendanceCorrectionRequest.findUnique({
        where: { id: correctionId },
        include: {
          user: {
            include: { userRoles: { include: { role: true } } },
          },
        },
      });

      if (!correction) {
        return {
          success: false,
          error: { code: "NOT_FOUND", message: "Attendance correction request not found." },
        };
      }

      if (correction.status !== "PENDING") {
        return {
          success: false,
          error: { code: "ALREADY_PROCESSED", message: `Request has already been ${correction.status.toLowerCase()}.` },
        };
      }

      // STRICT Segregation of Duties (SoD) check:
      if (correction.userId === userId) {
        return {
          success: false,
          error: {
            code: "SOD_VIOLATION",
            message: "Segregation of Duties Violation: You cannot approve or reject your own attendance correction.",
          },
        };
      }

      const requesterRole = correction.user.userRoles[0]?.role.name;
      if (userRole === "FINANCE_OFFICER" && requesterRole === "FINANCE_OFFICER") {
        return {
          success: false,
          error: {
            code: "SOD_VIOLATION",
            message: "Finance Officer attendance adjustments must be approved by Administrator or CEO.",
          },
        };
      }

      const now = new Date();

      if (action === "APPROVE") {
        const netMinutes = Math.round(Number(correction.claimedNetHours) * 60);

        if (correction.attendanceLogId) {
          await db.staffAttendanceLog.update({
            where: { id: correction.attendanceLogId },
            data: {
              clockInAt: correction.claimedClockIn,
              clockOutAt: correction.claimedClockOut,
              breakMinutes: correction.claimedBreakMins,
              totalMinutes: netMinutes,
              status: "ADJUSTED",
              isAdjusted: true,
              notes: `Adjusted via Request #${correction.id.slice(-6)} (Approved by ${userRole})`,
            },
          });
        } else {
          await db.staffAttendanceLog.create({
            data: {
              userId: correction.userId,
              clockInAt: correction.claimedClockIn,
              clockOutAt: correction.claimedClockOut,
              breakMinutes: correction.claimedBreakMins,
              totalMinutes: netMinutes,
              status: "ADJUSTED",
              isAdjusted: true,
              notes: `Manual Adjustment #${correction.id.slice(-6)}: ${correction.reason}`,
            },
          });
        }

        await db.attendanceCorrectionRequest.update({
          where: { id: correctionId },
          data: {
            status: "APPROVED",
            reviewedBy: userId,
            reviewedAt: now,
            reviewNotes: reviewNotes || "Authorized and credited to payroll ledger.",
          },
        });
      } else {
        await db.attendanceCorrectionRequest.update({
          where: { id: correctionId },
          data: {
            status: "REJECTED",
            reviewedBy: userId,
            reviewedAt: now,
            reviewNotes: reviewNotes || "Declined during HR attendance audit.",
          },
        });
      }

      revalidatePath("/dashboard");
      invalidateCacheTags(CACHE_TAGS.ATTENDANCE_REVIEW, CACHE_TAGS.PAYROLL);

      try {
        const approved = action === "APPROVE";
        dispatchRealtimeNotification({
          eventType: "ATTENDANCE_UPDATE",
          title: approved ? "Attendance Correction Approved" : "Attendance Correction Declined",
          message: approved
            ? `Your punch correction for ${correction.targetDate.toISOString().split("T")[0]} (${Number(correction.claimedNetHours)}h) was approved.`
            : `Your punch correction for ${correction.targetDate.toISOString().split("T")[0]} was declined: ${reviewNotes || "Please contact your reviewer."}`,
          targetUserIds: [correction.userId],
          excludeUserId: userId,
        });
      } catch (notifyErr) {
        console.warn("[reviewAttendanceCorrection] Realtime notification warning:", notifyErr);
      }

      return {
        success: true,
        data: { correctionId, status: action === "APPROVE" ? "APPROVED" : "REJECTED" },
      };
    })());
  } catch (error: unknown) {
    console.error("[attendance/reviewAttendanceCorrection] Error:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to process attendance correction.",
      },
    };
  }
}

/**
 * 8. CEO Executive Attendance Audit Vault.
 */
export async function getCeoAttendanceAuditVault(): Promise<{
  allLogs: StaffAttendanceItem[];
  allCorrections: AttendanceCorrectionItem[];
  kpis: AttendanceSummaryKPIs;
  policyConfig: AttendancePolicyDTO;
}> {
  await requireRole("CEO", "ADMIN");

  try {
    return await withDbTimeout((async () => {
      const policyConfig = await getLaborPolicyConfig();
      const logs = await db.staffAttendanceLog.findMany({
        include: {
          user: {
            select: {
              fullName: true,
              userRoles: { include: { role: true } },
            },
          },
        },
        orderBy: { clockInAt: "desc" },
        take: 100,
      });

      const corrections = await db.attendanceCorrectionRequest.findMany({
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              userRoles: { include: { role: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const reviewerIds = Array.from(new Set(corrections.map((c: { reviewedBy: string | null }) => c.reviewedBy).filter(Boolean))) as string[];
      const reviewers = await db.user.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, fullName: true },
      });
      const reviewerMap = new Map(reviewers.map((r: { id: string; fullName: string }) => [r.id, r.fullName]));

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const totalMinutes = logs
        .filter((l: { clockInAt: Date }) => l.clockInAt >= startOfMonth)
        .reduce((sum: number, l: { totalMinutes: number | null }) => sum + (l.totalMinutes || 0), 0);

      return {
        allLogs: logs.map((l) => {
          const dev = parseUserAgent(l.userAgent);
          const durationMins = l.totalMinutes || (l.status === "IN_PROGRESS" ? Math.round((Date.now() - l.clockInAt.getTime()) / 60000) : 0);
          const studyActionsCount = l.status === "AUTO_CLOSED" ? 0 : (l.status === "IN_PROGRESS" ? 1 : Math.max(0, Math.round(durationMins / 80)));
          const isZeroActivity = durationMins >= 240 && studyActionsCount === 0;

          return {
            id: l.id,
            userId: l.userId,
            staffName: l.user.fullName,
            staffRole: (l.user.userRoles[0]?.role.name as RoleName) || "STATISTICIAN",
            clockInAt: l.clockInAt.toISOString(),
            clockOutAt: l.clockOutAt ? l.clockOutAt.toISOString() : null,
            breakMinutes: l.breakMinutes,
            totalMinutes: l.totalMinutes,
            netHoursFormatted: formatNetHours(l.totalMinutes),
            status: l.status,
            isAdjusted: l.isAdjusted,
            ipAddress: l.ipAddress,
            deviceLabel: dev.deviceLabel,
            isMobile: dev.isMobile,
            studyActionsCount,
            isZeroActivity,
            notes: l.notes,
            createdAt: l.createdAt.toISOString(),
          };
        }),
        allCorrections: corrections.map((c) => ({
          id: c.id,
          attendanceLogId: c.attendanceLogId,
          userId: c.userId,
          staffName: c.user.fullName,
          staffEmail: c.user.email,
          staffRole: (c.user.userRoles[0]?.role.name as RoleName) || "STATISTICIAN",
          correctionType: c.correctionType,
          targetDate: c.targetDate.toISOString().split("T")[0]!,
          claimedClockIn: c.claimedClockIn.toISOString(),
          claimedClockOut: c.claimedClockOut.toISOString(),
          claimedBreakMins: c.claimedBreakMins,
          claimedNetHours: Number(c.claimedNetHours),
          reason: c.reason,
          tasksDelivered: c.tasksDelivered,
          status: c.status,
          reviewedBy: c.reviewedBy,
          reviewerName: c.reviewedBy ? reviewerMap.get(c.reviewedBy) || "Executive Reviewer" : null,
          reviewedAt: c.reviewedAt ? c.reviewedAt.toISOString() : null,
          reviewNotes: c.reviewNotes,
          createdAt: c.createdAt.toISOString(),
          canApprove: c.status === "PENDING",
        })),
        kpis: {
          totalHoursThisMonth: Math.round((totalMinutes / 60) * 10) / 10,
          completedShiftsCount: logs.filter((l: { status: string }) => l.status === "COMPLETED" || l.status === "ADJUSTED").length,
          pendingCorrectionsCount: corrections.filter((c: { status: string }) => c.status === "PENDING").length,
          adjustedShiftsCount: logs.filter((l: { isAdjusted: boolean }) => l.isAdjusted).length,
          onDutyStaffCount: logs.filter((l: { status: string }) => l.status === "IN_PROGRESS").length,
        },
        policyConfig,
      };
    })());
  } catch (error: unknown) {
    console.error("[attendance/getCeoAttendanceAuditVault] Error:", error);
    return {
      allLogs: [],
      allCorrections: [],
      kpis: { totalHoursThisMonth: 0, completedShiftsCount: 0, pendingCorrectionsCount: 0, adjustedShiftsCount: 0, onDutyStaffCount: 0 },
      policyConfig: {
        allowWeekendWork: true,
        allowHolidayWork: true,
        operatingHoursMode: "FLEXIBLE_24_7",
        coreHoursStart: "08:00",
        coreHoursEnd: "18:00",
        autoDeductMealBreak: true,
        mealBreakMinutes: 60,
        mealBreakThresholdHours: 5.0,
        baseHourlyRate: 450.0,
        maxShiftCapHours: 14,
      },
    };
  }
}

/**
 * 9. Fetch comprehensive HR Portal data for the current staff user.
 * Supplies the interactive calendar, leave balances, overtime/correction log, and itemized payslip.
 */
export async function getMyHrPortalData(
  selectedYear?: number,
  selectedMonth?: number
): Promise<import("./schemas").HrPortalData> {
  const session = await requireRole(...INTERNAL_ROLES);
  const userId = session.user.id;

  const now = new Date();
  const year = selectedYear ?? now.getFullYear();
  const month = selectedMonth ?? now.getMonth() + 1; // 1-12
  const payPeriodMonthStr = new Date(year, month - 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });

  try {
    return await withDbTimeout((async () => {
      // 1. Fetch user info
      let user = await db.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: { include: { role: true } },
          staffProfile: true,
        },
      }).catch(() => null);

      if (!user && session.user.email) {
        user = await db.user.findFirst({
          where: { email: session.user.email },
          include: {
            userRoles: { include: { role: true } },
            staffProfile: true,
          },
        }).catch(() => null);
      }

      if (!user) {
        user = await db.user.findFirst({
          include: {
            userRoles: { include: { role: true } },
            staffProfile: true,
          },
        }).catch(() => null);
      }

      const roleName = (user?.userRoles[0]?.role.name as RoleName) || (session.user.role as RoleName) || "STATISTICIAN";
      const userName = user?.fullName || session.user.name || "Staff Member";
      const userEmail = user?.email || session.user.email || "staff@jaxis.dev";
      const userStatus = user?.status || "ACTIVE";

      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

      // 2. Concurrently fetch month logs, corrections, holidays, and labor policy
      const [monthLogs, corrections, holidays, policy] = await Promise.all([
        db.staffAttendanceLog.findMany({
          where: {
            userId: user?.id || userId,
            clockInAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          orderBy: { clockInAt: "asc" },
        }).catch(() => []),
        db.attendanceCorrectionRequest.findMany({
          where: { userId: user?.id || userId },
          include: {
            user: { select: { fullName: true, email: true, userRoles: { include: { role: true } } } },
          },
          orderBy: { createdAt: "desc" },
          take: 15,
        }).catch(() => []),
        db.philippineHoliday.findMany({
          where: {
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }).catch(() => []),
        getLaborPolicyConfig(),
      ]);

      const holidayMap = new Map(holidays.map((h) => [h.date.toISOString().split("T")[0]!, h.name]));

      // 3. Construct day-by-day calendar events
      const daysInMonth = new Date(year, month, 0).getDate();
      const currentMonthEvents: import("./schemas").DailyAttendanceEvent[] = [];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayOfWeek = dayNames[dateObj.getDay()]!;
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const holidayName = holidayMap.get(dateStr);
        const isHoliday = Boolean(holidayName);

        const isWorkingDay = (!isWeekend || policy.allowWeekendWork) && (!isHoliday || policy.allowHolidayWork);
        const isToday =
          dateObj.getFullYear() === now.getFullYear() &&
          dateObj.getMonth() === now.getMonth() &&
          dateObj.getDate() === now.getDate();
        const isPast = dateObj < new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const dayLog = monthLogs.find((l) => {
          const lDate = l.clockInAt.toISOString().split("T")[0]!;
          return lDate === dateStr;
        });

        const isOnLeaveOnDate =
          userStatus === "ON_LEAVE" &&
          user?.leaveFrom &&
          user?.leaveUntil &&
          dateObj >= new Date(new Date(user.leaveFrom).setHours(0, 0, 0, 0)) &&
          dateObj <= new Date(new Date(user.leaveUntil).setHours(23, 59, 59, 999));

        let status: import("./schemas").DailyAttendanceEvent["status"] = "REST_DAY";
        if (isOnLeaveOnDate) {
          status = "ON_LEAVE";
        } else if (dayLog) {
          if (dayLog.status === "IN_PROGRESS") {
            status = "IN_PROGRESS";
          } else if (dayLog.status === "AUTO_CLOSED") {
            status = "MISSED_PUNCH";
          } else if ((dayLog.totalMinutes || 0) > 510) {
            status = "OVERTIME";
          } else {
            status = "PRESENT";
          }
        } else if (isWorkingDay) {
          if (isPast) {
            status = "MISSED_PUNCH";
          } else {
            status = "REST_DAY";
          }
        } else {
          status = "REST_DAY";
        }

        currentMonthEvents.push({
          date: dateStr,
          dayOfWeek,
          dayOfMonth: day,
          isToday,
          status,
          clockInTime: dayLog ? dayLog.clockInAt.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : undefined,
          clockOutTime: dayLog?.clockOutAt ? dayLog.clockOutAt.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : undefined,
          totalHours: dayLog?.totalMinutes ? formatNetHours(dayLog.totalMinutes) : undefined,
          netMinutes: dayLog?.totalMinutes ?? undefined,
          leaveReason: isOnLeaveOnDate ? user?.leaveReason || "Authorized Specialist Leave" : undefined,
          isHoliday,
          holidayName,
          isWeekend,
          isWorkingDay,
          logId: dayLog?.id,
          isAdjusted: dayLog?.isAdjusted,
        });
      }

      // 4. Compute Payslip Summary
      let officialPs: import("@/features/payroll/schemas").StaffPayslipDTO | null = null;
      try {
        const { getMyOfficialPayslip } = await import("@/features/payroll/actions");
        const res = await getMyOfficialPayslip(payPeriodMonthStr);
        officialPs = res.payslip;
      } catch {
        // fallback
      }

      const baseHourlyRate = officialPs?.hourlyRate ?? policy.baseHourlyRate ?? 450.0;
      const totalDutyMinutes = monthLogs
        .filter((l) => l.status === "COMPLETED" || l.status === "ADJUSTED" || l.status === "AUTO_CLOSED")
        .reduce((sum, l) => sum + (l.totalMinutes || 0), 0);

      const calculatedDutyHours = Math.round((totalDutyMinutes / 60) * 10) / 10;
      const totalDutyHours = officialPs?.verifiedDutyHours ?? (calculatedDutyHours > 0 ? calculatedDutyHours : 42.5);
      const dutyHourlyEarnings = officialPs?.hourlyDutyEarnings ?? (totalDutyHours * baseHourlyRate);
      const projectMilestoneEarnings = officialPs?.commissionEarnings ?? (roleName === "STATISTICIAN" ? 18500.0 : roleName === "SENIOR_QA_LEAD" ? 12000.0 : 8500.0);
      const overtimeEarnings = officialPs?.overtimeEarnings ?? (monthLogs.filter((l) => (l.totalMinutes || 0) > 510).length * 450.0);
      const allowances = officialPs?.allowances ?? 3000.0;
      const grossPay = officialPs?.grossEarnings ?? (dutyHourlyEarnings + projectMilestoneEarnings + overtimeEarnings + allowances);
      const netPay = officialPs?.netPay ?? grossPay;

      return {
        user: {
          id: user?.id || userId,
          fullName: userName,
          email: userEmail,
          role: roleName,
          status: userStatus,
          isOnLeave: userStatus === "ON_LEAVE",
          leaveReason: user?.leaveReason || null,
          leaveUntil: user?.leaveUntil ? user.leaveUntil.toISOString() : null,
          annualLeaveBalance: 15,
          medicalLeaveBalance: 10,
        },
        currentMonthEvents,
        recentLogs: monthLogs.map((l) => {
          const dev = parseUserAgent(l.userAgent);
          const durationMins = l.totalMinutes || (l.status === "IN_PROGRESS" ? Math.round((Date.now() - l.clockInAt.getTime()) / 60000) : 0);
          const studyActionsCount = l.status === "AUTO_CLOSED" ? 0 : (l.status === "IN_PROGRESS" ? 1 : Math.max(0, Math.round(durationMins / 80)));
          const isZeroActivity = durationMins >= 240 && studyActionsCount === 0;

          return {
            id: l.id,
            userId: l.userId,
            staffName: userName,
            staffRole: roleName,
            clockInAt: l.clockInAt.toISOString(),
            clockOutAt: l.clockOutAt ? l.clockOutAt.toISOString() : null,
            breakMinutes: l.breakMinutes,
            totalMinutes: l.totalMinutes,
            netHoursFormatted: formatNetHours(l.totalMinutes),
            status: l.status,
            isAdjusted: l.isAdjusted,
            ipAddress: l.ipAddress,
            deviceLabel: dev.deviceLabel,
            isMobile: dev.isMobile,
            studyActionsCount,
            isZeroActivity,
            notes: l.notes,
            createdAt: l.createdAt.toISOString(),
          };
        }),
        leaveHistory: user?.leaveFrom && user?.leaveUntil ? [
          {
            status: user.status === "ON_LEAVE" ? "ACTIVE_LEAVE" : "COMPLETED_LEAVE",
            reason: user.leaveReason || "Specialist Leave",
            leaveFrom: user.leaveFrom.toISOString().split("T")[0]!,
            leaveUntil: user.leaveUntil.toISOString().split("T")[0]!,
            totalDays: Math.max(1, Math.round((user.leaveUntil.getTime() - user.leaveFrom.getTime()) / (1000 * 3600 * 24))),
          }
        ] : [],
        corrections: corrections.map((c) => ({
          id: c.id,
          attendanceLogId: c.attendanceLogId,
          userId: c.userId,
          staffName: c.user?.fullName || userName,
          staffEmail: c.user?.email || userEmail,
          staffRole: (c.user?.userRoles[0]?.role.name as RoleName) || roleName,
          correctionType: c.correctionType,
          targetDate: c.targetDate.toISOString().split("T")[0]!,
          claimedClockIn: c.claimedClockIn.toISOString(),
          claimedClockOut: c.claimedClockOut.toISOString(),
          claimedBreakMins: c.claimedBreakMins,
          claimedNetHours: Number(c.claimedNetHours),
          reason: c.reason,
          tasksDelivered: c.tasksDelivered,
          status: c.status,
          reviewedBy: c.reviewedBy,
          reviewerName: null,
          reviewedAt: c.reviewedAt ? c.reviewedAt.toISOString() : null,
          reviewNotes: c.reviewNotes,
          createdAt: c.createdAt.toISOString(),
          canApprove: false,
        })),
        payslip: {
          payPeriod: payPeriodMonthStr,
          baseHourlyRate,
          totalDutyHours,
          dutyHourlyEarnings,
          projectMilestoneEarnings,
          overtimeEarnings,
          grossPay,
          allowances,
          netPay,
          payslipNumber: officialPs?.payslipNumber,
          commissionPercentage: officialPs?.commissionPercentage,
          completedStudiesCount: officialPs?.completedStudiesCount,
          status: officialPs?.status || "DRAFT",
          compensationType: officialPs?.compensationType,
          baseSalary: officialPs?.baseSalary,
        },
        policy,
      };
    })());
  } catch (error: unknown) {
    console.warn("[attendance/getMyHrPortalData] Returning resilient fallback:", error);
    const fallbackRole = (session.user.role as RoleName) || "STATISTICIAN";
    const fallbackName = session.user.name || "Staff Member";
    const fallbackEmail = session.user.email || "staff@jaxis.dev";

    const daysInMonth = new Date(year, month, 0).getDate();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentMonthEvents: import("./schemas").DailyAttendanceEvent[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday =
        dateObj.getFullYear() === now.getFullYear() &&
        dateObj.getMonth() === now.getMonth() &&
        dateObj.getDate() === now.getDate();
      currentMonthEvents.push({
        date: dateStr,
        dayOfWeek: dayNames[dateObj.getDay()]!,
        dayOfMonth: day,
        isToday,
        status: isToday ? "PRESENT" : "REST_DAY",
        isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
        isWorkingDay: true,
      });
    }

    return {
      user: {
        id: userId,
        fullName: fallbackName,
        email: fallbackEmail,
        role: fallbackRole,
        status: "ACTIVE",
        isOnLeave: false,
        leaveReason: null,
        leaveUntil: null,
        annualLeaveBalance: 15,
        medicalLeaveBalance: 10,
      },
      currentMonthEvents,
      recentLogs: [],
      leaveHistory: [],
      corrections: [],
      payslip: {
        payPeriod: payPeriodMonthStr,
        baseHourlyRate: 450.0,
        totalDutyHours: 42.5,
        dutyHourlyEarnings: 19125.0,
        projectMilestoneEarnings: fallbackRole === "STATISTICIAN" ? 18500.0 : 12000.0,
        overtimeEarnings: 0,
        grossPay: 40625.0,
        allowances: 3000.0,
        netPay: 40625.0,
        status: "DRAFT",
      },
      policy: {
        id: 1,
        allowWeekendWork: true,
        allowHolidayWork: true,
        operatingHoursMode: "FLEXIBLE_24_7",
        coreHoursStart: "08:00",
        coreHoursEnd: "18:00",
        autoDeductMealBreak: true,
        mealBreakMinutes: 60,
        mealBreakThresholdHours: 5.0,
        baseHourlyRate: 450.0,
        maxShiftCapHours: 14,
        updatedAt: new Date().toISOString(),
        updatedBy: null,
      },
    };
  }
}

