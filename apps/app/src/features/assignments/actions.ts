"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { db, withDbTimeout } from "@/lib/db";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache-tags";
import {
  assertCanManageAssignments,
  assertCanBeAssigned,
  calculateSpecializationScore,
  assessBurnoutRisk,
} from "@/lib/assignment-rules";
import {
  computeSlaDueDate,
  calculateSlaRemaining,
  computeResumeDueDate,
} from "@/lib/sla-calculator";
import {
  CreateAssignmentSchema,
  ReassignExpertSchema,
  RequestSlaPauseSchema,
  ApproveSlaPauseSchema,
  ResumeSlaSchema,
  type StaffCapacityItem,
  type AssignmentDetailItem,
  type AssignedStudySummary,
} from "./schemas";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import type { ActionResponse } from "@/features/projects/schemas";

/**
 * 1. Assigns a Lead Statistician and Senior QA Lead to an active study.
 * Calculates SLA due date excluding Philippine holidays and weekends.
 */
export async function assignExperts(
  input: unknown
): Promise<ActionResponse<AssignmentDetailItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  try {
    assertCanManageAssignments(session.user.role);
  } catch (err: unknown) {
    return { success: false, error: { code: "FORBIDDEN", message: (err as Error).message } };
  }

  const parsed = CreateAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid payload" } };
  }

  const { projectId, statisticianId, qaLeadId, turnaroundDays: customDays } = parsed.data;

  try {
    // 1. Fetch project details and turnaround basis outside the transaction
    const project = await db.project.findFirst({
      where: { OR: [{ id: projectId }, { intakeId: projectId }] },
      include: { sows: { orderBy: { generatedAt: "desc" }, take: 1 } },
    });

    if (!project) {
      return { success: false, error: { code: "NOT_FOUND", message: "Research study not found." } };
    }

    assertCanBeAssigned(project.masterStatus);

    // 2. Pre-compute SLA due date outside the transaction
    const turnaround = customDays || project.sows[0]?.turnaroundDays || 5;
    const now = new Date();
    const slaDueAt = await computeSlaDueDate(now, turnaround);

    // 3. Fast atomic transaction with high timeout budget (30s)
    const result = await withDbTimeout(
      db.$transaction(
        async (tx) => {
          // Verify selected specialists are not currently on leave in parallel
          const [statUser, qaUser] = await Promise.all([
            tx.user.findUnique({ where: { id: statisticianId } }),
            tx.user.findUnique({ where: { id: qaLeadId } }),
          ]);

          if (statUser?.status === "ON_LEAVE") {
            throw new Error("CONFLICT: Selected Lead Statistician is currently on leave and unavailable for assignments.");
          }
          if (qaUser?.status === "ON_LEAVE") {
            throw new Error("CONFLICT: Selected Senior QA Lead is currently on leave and unavailable for assignments.");
          }

          // Create or update active assignment
          const assignment = await tx.assignment.upsert({
            where: { projectId: project.id },
            create: {
              projectId: project.id,
              statisticianId,
              qaLeadId,
              assignedBy: session.user.id,
              assignedAt: now,
              slaStartAt: now,
              slaDueAt,
              isActive: true,
            },
            update: {
              statisticianId,
              qaLeadId,
              assignedBy: session.user.id,
              assignedAt: now,
              slaStartAt: now,
              slaDueAt,
              slaPausedAt: null,
              slaPauseReason: null,
              slaPausedBy: null,
              slaApprovedBy: null,
              isActive: true,
            },
            include: {
              project: true,
              statistician: true,
              qaLead: true,
            },
          });

          // Transition project to EXPERT_ASSIGNED
          await tx.project.update({
            where: { id: project.id },
            data: {
              masterStatus: "EXPERT_ASSIGNED",
            },
          });

          return assignment;
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      ),
      35000
    );

    revalidatePath("/dashboard/admin/assignments");
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath("/dashboard/statistician");
    revalidatePath("/dashboard/qa");
    invalidateCacheTags(CACHE_TAGS.STAFF_CAPACITY, CACHE_TAGS.PROJECTS);

    try {
      await dispatchRealtimeNotification({
        eventType: "ASSIGNMENT",
        projectId: result.projectId,
        intakeId: result.project.intakeId,
        title: "Assigned to Research Study",
        message: `Assigned to study ${result.project.intakeId} ("${result.project.researchTitle}"). Target turnaround: ${turnaround} days.`,
        targetRoles: ["ADMIN"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[assignExperts] Realtime dispatch warning:", e);
    }

    const remaining = calculateSlaRemaining(result.slaDueAt, result.slaPausedAt);

    return {
      success: true,
      data: {
        id: result.id,
        projectId: result.projectId,
        projectIntakeId: result.project.intakeId,
        projectTitle: result.project.researchTitle,
        projectMethod: result.project.packageName,
        masterStatus: "EXPERT_ASSIGNED",
        statistician: {
          id: result.statistician.id,
          fullName: result.statistician.fullName,
          email: result.statistician.email,
        },
        qaLead: {
          id: result.qaLead.id,
          fullName: result.qaLead.fullName,
          email: result.qaLead.email,
        },
        assignedAt: result.assignedAt.toISOString(),
        slaStartAt: result.slaStartAt.toISOString(),
        slaDueAt: result.slaDueAt.toISOString(),
        slaPausedAt: result.slaPausedAt?.toISOString() || null,
        slaPauseReason: result.slaPauseReason,
        slaPausedBy: result.slaPausedBy,
        remainingHours: remaining.remainingHours,
        remainingDays: remaining.remainingDays,
        isUrgent: remaining.isUrgent,
        isOverdue: remaining.isOverdue,
        isPaused: remaining.isPaused,
        slaLabel: remaining.label,
      },
    };
  } catch (err: unknown) {
    console.error("[assignExperts] Error:", err);
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}

/**
 * 2. Reassigns a study to a new Lead Statistician or QA Lead.
 * Archives previous assignment in AssignmentHistory and voids prior payout rights.
 */
export async function reassignExperts(
  input: unknown
): Promise<ActionResponse<AssignmentDetailItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  try {
    assertCanManageAssignments(session.user.role);
  } catch (err: unknown) {
    return { success: false, error: { code: "FORBIDDEN", message: (err as Error).message } };
  }

  const parsed = ReassignExpertSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid payload" } };
  }

  const { projectId } = parsed.data;
  const newStatisticianId = parsed.data.newStatisticianId || parsed.data.statisticianId;
  const newQaLeadId = parsed.data.newQaLeadId || parsed.data.qaLeadId;
  const reason = (parsed.data.reason || parsed.data.reassignReason || "Specialist capacity / domain realignment").trim();

  try {
    const result = await withDbTimeout(
      db.$transaction(
        async (tx) => {
          const existing = await tx.assignment.findFirst({
            where: {
              OR: [{ projectId }, { project: { intakeId: projectId } }],
            },
            include: { project: true, statistician: true, qaLead: true },
          });

          if (!existing) {
            throw new Error("NOT_FOUND: Active assignment not found for this study.");
          }

          const now = new Date();

          // 1. Record archive history
          await tx.assignmentHistory.create({
            data: {
              projectId: existing.projectId,
              statisticianId: existing.statisticianId,
              qaLeadId: existing.qaLeadId,
              assignedAt: existing.assignedAt,
              reassignedAt: now,
              reason,
              payoutVoided: true,
            },
          });

          // 2. Validate replacement specialists are not on leave in parallel
          const [statUser, qaUser] = await Promise.all([
            newStatisticianId ? tx.user.findUnique({ where: { id: newStatisticianId } }) : null,
            newQaLeadId ? tx.user.findUnique({ where: { id: newQaLeadId } }) : null,
          ]);

          if (statUser?.status === "ON_LEAVE") {
            throw new Error("CONFLICT: Target Lead Statistician is currently on leave and unavailable for assignments.");
          }
          if (qaUser?.status === "ON_LEAVE") {
            throw new Error("CONFLICT: Target Senior QA Lead is currently on leave and unavailable for assignments.");
          }

          // 3. Update active assignment
          const updated = await tx.assignment.update({
            where: { id: existing.id },
            data: {
              statisticianId: newStatisticianId || existing.statisticianId,
              qaLeadId: newQaLeadId || existing.qaLeadId,
              reassignedAt: now,
              reassignedBy: session.user.id,
              reassignReason: reason,
            },
            include: { project: true, statistician: true, qaLead: true },
          });

          return updated;
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      ),
      35000
    );

    revalidatePath("/dashboard/admin/assignments");
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath("/dashboard/statistician");
    revalidatePath("/dashboard/qa");
    invalidateCacheTags(CACHE_TAGS.STAFF_CAPACITY, CACHE_TAGS.PROJECTS);

    const remaining = calculateSlaRemaining(result.slaDueAt, result.slaPausedAt);

    return {
      success: true,
      data: {
        id: result.id,
        projectId: result.projectId,
        projectIntakeId: result.project.intakeId,
        projectTitle: result.project.researchTitle,
        masterStatus: result.project.masterStatus,
        statistician: {
          id: result.statistician.id,
          fullName: result.statistician.fullName,
          email: result.statistician.email,
        },
        qaLead: {
          id: result.qaLead.id,
          fullName: result.qaLead.fullName,
          email: result.qaLead.email,
        },
        assignedAt: result.assignedAt.toISOString(),
        slaStartAt: result.slaStartAt.toISOString(),
        slaDueAt: result.slaDueAt.toISOString(),
        slaPausedAt: result.slaPausedAt?.toISOString() || null,
        slaPauseReason: result.slaPauseReason,
        slaPausedBy: result.slaPausedBy,
        remainingHours: remaining.remainingHours,
        remainingDays: remaining.remainingDays,
        isUrgent: remaining.isUrgent,
        isOverdue: remaining.isOverdue,
        isPaused: remaining.isPaused,
        slaLabel: remaining.label,
        reassignedAt: result.reassignedAt?.toISOString() || null,
        reassignReason: result.reassignReason,
      },
    };
  } catch (err: unknown) {
    console.error("[reassignExperts] Error:", err);
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}

/**
 * 3. Statistician requests an SLA pause due to client delay or data issue.
 */
export async function requestSlaPause(
  input: unknown
): Promise<ActionResponse<{ message: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  const parsed = RequestSlaPauseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid payload" } };
  }

  const { projectId, reason } = parsed.data;

  try {
    const assignment = await db.assignment.findFirst({
      where: {
        OR: [{ projectId }, { project: { intakeId: projectId } }],
      },
    });

    if (!assignment) {
      return { success: false, error: { code: "NOT_FOUND", message: "Assignment not found." } };
    }

    await db.assignment.update({
      where: { id: assignment.id },
      data: {
        slaPauseReason: reason,
        slaPausedBy: session.user.id,
      },
    });

    revalidatePath("/dashboard/admin/assignments");
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath("/dashboard/statistician");
    invalidateCacheTags(CACHE_TAGS.STAFF_CAPACITY, CACHE_TAGS.PROJECTS);

    return {
      success: true,
      data: { message: "SLA pause request submitted for administrative approval." },
    };
  } catch (err: unknown) {
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}

/**
 * 4. Admin approves or denies an SLA pause request.
 */
export async function approveSlaPause(
  input: unknown
): Promise<ActionResponse<{ message: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  try {
    assertCanManageAssignments(session.user.role);
  } catch (err: unknown) {
    return { success: false, error: { code: "FORBIDDEN", message: (err as Error).message } };
  }

  const parsed = ApproveSlaPauseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid payload" } };
  }

  const { projectId, approved } = parsed.data;

  try {
    const assignment = await db.assignment.findFirst({
      where: {
        OR: [{ projectId }, { project: { intakeId: projectId } }],
      },
    });

    if (!assignment) {
      return { success: false, error: { code: "NOT_FOUND", message: "Assignment not found." } };
    }

    if (approved) {
      const now = new Date();
      await db.$transaction([
        db.assignment.update({
          where: { id: assignment.id },
          data: {
            slaPausedAt: now,
            slaApprovedBy: session.user.id,
          },
        }),
        db.project.update({
          where: { id: assignment.projectId },
          data: { masterStatus: "SLA_PAUSED" },
        }),
      ]);
    } else {
      await db.assignment.update({
        where: { id: assignment.id },
        data: {
          slaPauseReason: null,
          slaPausedBy: null,
        },
      });
    }

    revalidatePath("/dashboard/admin/assignments");
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath("/dashboard/statistician");
    invalidateCacheTags(CACHE_TAGS.STAFF_CAPACITY, CACHE_TAGS.PROJECTS);

    return {
      success: true,
      data: {
        message: approved ? "SLA timer paused successfully." : "SLA pause request declined.",
      },
    };
  } catch (err: unknown) {
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}

/**
 * 5. Admin resumes an SLA timer, adding the elapsed pause duration to the due date.
 */
export async function resumeSla(
  input: unknown
): Promise<ActionResponse<{ message: string; newSlaDueAt: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  try {
    assertCanManageAssignments(session.user.role);
  } catch (err: unknown) {
    return { success: false, error: { code: "FORBIDDEN", message: (err as Error).message } };
  }

  const parsed = ResumeSlaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid payload" } };
  }

  const { projectId } = parsed.data;

  try {
    const assignment = await db.assignment.findFirst({
      where: {
        OR: [{ projectId }, { project: { intakeId: projectId } }],
      },
    });

    if (!assignment) {
      return { success: false, error: { code: "NOT_FOUND", message: "Assignment not found." } };
    }

    if (!assignment.slaPausedAt) {
      return { success: false, error: { code: "NOT_PAUSED", message: "SLA is not currently paused." } };
    }

    const now = new Date();
    const newDue = computeResumeDueDate(assignment.slaDueAt, assignment.slaPausedAt, now);

    await db.$transaction([
      db.assignment.update({
        where: { id: assignment.id },
        data: {
          slaDueAt: newDue,
          slaPausedAt: null,
          slaResumedAt: now,
          slaPauseReason: null,
          slaPausedBy: null,
          slaApprovedBy: null,
        },
      }),
      db.project.update({
        where: { id: assignment.projectId },
        data: { masterStatus: "IN_PROGRESS" },
      }),
    ]);

    revalidatePath("/dashboard/admin/assignments");
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath("/dashboard/statistician");
    invalidateCacheTags(CACHE_TAGS.STAFF_CAPACITY, CACHE_TAGS.PROJECTS);

    return {
      success: true,
      data: {
        message: "SLA resumed. Target deadline updated.",
        newSlaDueAt: newDue.toISOString(),
      },
    };
  } catch (err: unknown) {
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}

/**
 * Module-scoped cached query for staff directory and capacity
 */
const fetchCachedStaffUsers = unstable_cache(
  async () => {
    return withDbTimeout(
      db.user.findMany({
        where: {
          status: { in: ["ACTIVE", "LEAVE_PENDING", "ON_LEAVE"] },
          userRoles: {
            some: {
              role: {
                name: { in: ["STATISTICIAN", "SENIOR_QA_LEAD"] },
              },
            },
          },
        },
        include: {
          staffProfile: true,
          userRoles: { include: { role: true } },
          statisticianAssignments: {
            where: { isActive: true },
            include: {
              project: {
                select: {
                  id: true,
                  intakeId: true,
                  researchTitle: true,
                  masterStatus: true,
                },
              },
            },
          },
          qaAssignments: {
            where: { isActive: true },
            include: {
              project: {
                select: {
                  id: true,
                  intakeId: true,
                  researchTitle: true,
                  masterStatus: true,
                },
              },
            },
          },
        },
      }),
      10000
    );
  },
  ["staff-capacity-users-cache"],
  { tags: [CACHE_TAGS.STAFF_CAPACITY], revalidate: 30 }
);

/**
 * 6. Retrieves staff directory with current active assignments and optional specialization match.
 */
export async function getStaffCapacity(
  projectIntakeId?: string
): Promise<ActionResponse<{ statisticians: StaffCapacityItem[]; qaLeads: StaffCapacityItem[] }>> {
  try {
    let targetMethod: string | null = null;
    let targetField: string | null = null;

    if (projectIntakeId) {
      const project = await db.project.findFirst({
        where: { OR: [{ id: projectIntakeId }, { intakeId: projectIntakeId }] },
        include: { client: { include: { clientProfile: true } } },
      });
      if (project) {
        targetMethod = project.packageName;
        targetField = project.client?.clientProfile?.academicProgram || null;
      }
    }

    type StaffUserWithRelations = {
      id: string;
      fullName: string;
      email: string;
      status: string;
      leaveUntil?: Date | string | null;
      leaveReason?: string | null;
      userRoles?: Array<{ role?: { name: string } }>;
      staffProfile?: { specializations?: string[] } | null;
      statisticianAssignments?: Array<{
        slaDueAt: Date | string;
        slaPausedAt?: Date | string | null;
        project?: {
          id: string;
          intakeId: string;
          researchTitle: string;
          masterStatus: string;
        };
      }>;
      qaAssignments?: Array<{
        slaDueAt: Date | string;
        slaPausedAt?: Date | string | null;
        project?: {
          id: string;
          intakeId: string;
          researchTitle: string;
          masterStatus: string;
        };
      }>;
    };

    let staffUsers: StaffUserWithRelations[] = [];
    try {
      staffUsers = (await fetchCachedStaffUsers()) as StaffUserWithRelations[];
    } catch (cacheErr) {
      console.warn("[getStaffCapacity] Cache lookup failed, querying direct DB:", cacheErr);
      try {
        staffUsers = (await withDbTimeout(
          db.user.findMany({
            where: {
              status: { in: ["ACTIVE", "LEAVE_PENDING", "ON_LEAVE"] },
              userRoles: {
                some: {
                  role: {
                    name: { in: ["STATISTICIAN", "SENIOR_QA_LEAD"] },
                  },
                },
              },
            },
            include: {
              staffProfile: true,
              userRoles: { include: { role: true } },
              statisticianAssignments: {
                where: { isActive: true },
                include: {
                  project: {
                    select: {
                      id: true,
                      intakeId: true,
                      researchTitle: true,
                      masterStatus: true,
                    },
                  },
                },
              },
              qaAssignments: {
                where: { isActive: true },
                include: {
                  project: {
                    select: {
                      id: true,
                      intakeId: true,
                      researchTitle: true,
                      masterStatus: true,
                    },
                  },
                },
              },
            },
          }),
          10000
        )) as StaffUserWithRelations[];
      } catch (dbErr) {
        console.warn("[getStaffCapacity] Direct DB lookup also failed:", dbErr);
      }
    }

    // Dev fallback if database returned 0 staff or in offline development
    if (!staffUsers || staffUsers.length === 0) {
      const { DEV_USERS } = await import("@/lib/mock-data/users.data");
      const devStaff = Object.values(DEV_USERS).filter(
        (u) => u.role === "STATISTICIAN" || u.role === "SENIOR_QA_LEAD"
      );
      staffUsers = devStaff.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        status: u.status,
        userRoles: [{ role: { name: u.role } }],
        staffProfile: u.staffProfile || { specializations: [] },
        statisticianAssignments: [],
        qaAssignments: [],
      }));
    }

    const statisticians: StaffCapacityItem[] = [];
    const qaLeads: StaffCapacityItem[] = [];

    for (const u of staffUsers) {
      const isStat = u.userRoles?.some((r) => r.role?.name === "STATISTICIAN") ?? false;
      const isQA = u.userRoles?.some((r) => r.role?.name === "SENIOR_QA_LEAD") ?? false;
      const specs = u.staffProfile?.specializations || [];
      const activeAssignments = (isStat ? u.statisticianAssignments : u.qaAssignments) || [];
      const activeCount = activeAssignments.length;

      const score = calculateSpecializationScore(targetMethod, targetField, specs, []);

      const assignedStudies: AssignedStudySummary[] = activeAssignments
        .filter((a) => a && a.project)
        .map((a) => {
          const dueDate = a.slaDueAt instanceof Date ? a.slaDueAt : new Date(a.slaDueAt);
          const remaining = calculateSlaRemaining(dueDate, a.slaPausedAt);
          const proj = a.project!;
          return {
            id: proj.id,
            intakeId: proj.intakeId,
            title: proj.researchTitle,
            masterStatus: proj.masterStatus,
            slaDueAt: dueDate.toISOString(),
            slaLabel: remaining.label,
            isUrgent: remaining.isUrgent,
            isOverdue: remaining.isOverdue,
            isPaused: remaining.isPaused,
          };
        });

      const burnout = assessBurnoutRisk(assignedStudies);

      const item: StaffCapacityItem = {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: isStat ? "STATISTICIAN" : "SENIOR_QA_LEAD",
        specializations: specs,
        tools: [],
        activeAssignmentCount: activeCount,
        matchScore: score,
        assignedStudies,
        burnoutRisk: burnout,
        isLeavePending: u.status === "LEAVE_PENDING",
        isOnLeave: u.status === "ON_LEAVE",
        leaveUntil: u.leaveUntil
          ? u.leaveUntil instanceof Date
            ? u.leaveUntil.toISOString()
            : String(u.leaveUntil)
          : null,
        leaveReason: u.leaveReason || null,
      };

      if (isStat) statisticians.push(item);
      if (isQA) qaLeads.push(item);
    }

    // Task balancing: deprioritize on-leave specialists to bottom, then burnout risk, then least busy, then best match
    statisticians.sort((a, b) => {
      if (a.isOnLeave !== b.isOnLeave) {
        return a.isOnLeave ? 1 : -1;
      }
      const aRisk = a.burnoutRisk?.level === "HIGH" ? 1 : 0;
      const bRisk = b.burnoutRisk?.level === "HIGH" ? 1 : 0;
      if (aRisk !== bRisk) {
        return aRisk - bRisk;
      }
      if (a.activeAssignmentCount !== b.activeAssignmentCount) {
        return a.activeAssignmentCount - b.activeAssignmentCount;
      }
      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    qaLeads.sort((a, b) => {
      if (a.isOnLeave !== b.isOnLeave) {
        return a.isOnLeave ? 1 : -1;
      }
      const aRisk = a.burnoutRisk?.level === "HIGH" ? 1 : 0;
      const bRisk = b.burnoutRisk?.level === "HIGH" ? 1 : 0;
      if (aRisk !== bRisk) {
        return aRisk - bRisk;
      }
      return a.activeAssignmentCount - b.activeAssignmentCount;
    });

    return {
      success: true,
      data: { statisticians, qaLeads },
    };
  } catch (err: unknown) {
    console.error("[getStaffCapacity] Error:", err);
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}

/**
 * 7. Retrieves assigned studies for the currently logged-in Statistician.
 */
export async function getStatisticianWorkload(): Promise<ActionResponse<AssignmentDetailItem[]>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  try {
    const assignments = await db.assignment.findMany({
      where: {
        statisticianId: session.user.id,
        isActive: true,
      },
      include: {
        project: {
          include: {
            client: { include: { clientProfile: true } },
            files: true,
          },
        },
        statistician: true,
        qaLead: true,
      },
      orderBy: { slaDueAt: "asc" },
    });

    const items: AssignmentDetailItem[] = assignments.map((a) => {
      const remaining = calculateSlaRemaining(a.slaDueAt, a.slaPausedAt);
      return {
        id: a.id,
        projectId: a.projectId,
        projectIntakeId: a.project.intakeId,
        projectTitle: a.project.researchTitle,
        projectMethod: a.project.packageName?.replace(/_/g, " "),
        projectField: a.project.client?.clientProfile?.academicProgram,
        masterStatus: a.project.masterStatus,
        researchObjectives: a.project.researchObjectives,
        researchQuestions: a.project.researchQuestions,
        hypotheses: a.project.hypotheses,
        files: a.project.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          fileType: f.fileType,
          fileCategory: f.fileCategory,
        })),
        statistician: {
          id: a.statistician.id,
          fullName: a.statistician.fullName,
          email: a.statistician.email,
        },
        qaLead: {
          id: a.qaLead.id,
          fullName: a.qaLead.fullName,
          email: a.qaLead.email,
        },
        assignedAt: a.assignedAt.toISOString(),
        slaStartAt: a.slaStartAt.toISOString(),
        slaDueAt: a.slaDueAt.toISOString(),
        slaPausedAt: a.slaPausedAt?.toISOString() || null,
        slaPauseReason: a.slaPauseReason,
        slaPausedBy: a.slaPausedBy,
        remainingHours: remaining.remainingHours,
        remainingDays: remaining.remainingDays,
        isUrgent: remaining.isUrgent,
        isOverdue: remaining.isOverdue,
        isPaused: remaining.isPaused,
        slaLabel: remaining.label,
      };
    });

    return { success: true, data: items };
  } catch (err: unknown) {
    console.error("[getStatisticianWorkload] Error:", err);
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}

/**
 * 8. Retrieves assigned studies for the currently logged-in QA Lead.
 */
export async function getQaWorkload(): Promise<ActionResponse<AssignmentDetailItem[]>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  try {
    const assignments = await db.assignment.findMany({
      where: {
        qaLeadId: session.user.id,
        isActive: true,
      },
      include: {
        project: {
          include: {
            client: { include: { clientProfile: true } },
            files: true,
          },
        },
        statistician: true,
        qaLead: true,
      },
      orderBy: { slaDueAt: "asc" },
    });

    const items: AssignmentDetailItem[] = assignments.map((a) => {
      const remaining = calculateSlaRemaining(a.slaDueAt, a.slaPausedAt);
      return {
        id: a.id,
        projectId: a.projectId,
        projectIntakeId: a.project.intakeId,
        projectTitle: a.project.researchTitle,
        projectMethod: a.project.packageName?.replace(/_/g, " "),
        projectField: a.project.client?.clientProfile?.academicProgram,
        masterStatus: a.project.masterStatus,
        researchObjectives: a.project.researchObjectives,
        researchQuestions: a.project.researchQuestions,
        hypotheses: a.project.hypotheses,
        files: a.project.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          fileType: f.fileType,
          fileCategory: f.fileCategory,
        })),
        statistician: {
          id: a.statistician.id,
          fullName: a.statistician.fullName,
          email: a.statistician.email,
        },
        qaLead: {
          id: a.qaLead.id,
          fullName: a.qaLead.fullName,
          email: a.qaLead.email,
        },
        assignedAt: a.assignedAt.toISOString(),
        slaStartAt: a.slaStartAt.toISOString(),
        slaDueAt: a.slaDueAt.toISOString(),
        slaPausedAt: a.slaPausedAt?.toISOString() || null,
        slaPauseReason: a.slaPauseReason,
        slaPausedBy: a.slaPausedBy,
        remainingHours: remaining.remainingHours,
        remainingDays: remaining.remainingDays,
        isUrgent: remaining.isUrgent,
        isOverdue: remaining.isOverdue,
        isPaused: remaining.isPaused,
        slaLabel: remaining.label,
      };
    });

    return { success: true, data: items };
  } catch (err: unknown) {
    console.error("[getQaWorkload] Error:", err);
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}

/**
 * 9. Retrieves the active assignment for a specific project.
 */
export async function getProjectAssignment(
  projectId: string
): Promise<ActionResponse<AssignmentDetailItem | null>> {
  try {
    const assignment = await db.assignment.findFirst({
      where: {
        OR: [{ projectId }, { project: { intakeId: projectId } }],
        isActive: true,
      },
      include: {
        project: {
          include: { client: { include: { clientProfile: true } } },
        },
        statistician: true,
        qaLead: true,
      },
    });

    if (!assignment) {
      return { success: true, data: null };
    }

    const remaining = calculateSlaRemaining(assignment.slaDueAt, assignment.slaPausedAt);

    return {
      success: true,
      data: {
        id: assignment.id,
        projectId: assignment.projectId,
        projectIntakeId: assignment.project.intakeId,
        projectTitle: assignment.project.researchTitle,
        projectMethod: assignment.project.packageName?.replace(/_/g, " "),
        projectField: assignment.project.client?.clientProfile?.academicProgram,
        masterStatus: assignment.project.masterStatus,
        statistician: {
          id: assignment.statistician.id,
          fullName: assignment.statistician.fullName,
          email: assignment.statistician.email,
        },
        qaLead: {
          id: assignment.qaLead.id,
          fullName: assignment.qaLead.fullName,
          email: assignment.qaLead.email,
        },
        assignedAt: assignment.assignedAt.toISOString(),
        slaStartAt: assignment.slaStartAt.toISOString(),
        slaDueAt: assignment.slaDueAt.toISOString(),
        slaPausedAt: assignment.slaPausedAt?.toISOString() || null,
        slaPauseReason: assignment.slaPauseReason,
        slaPausedBy: assignment.slaPausedBy,
        remainingHours: remaining.remainingHours,
        remainingDays: remaining.remainingDays,
        isUrgent: remaining.isUrgent,
        isOverdue: remaining.isOverdue,
        isPaused: remaining.isPaused,
        slaLabel: remaining.label,
        reassignedAt: assignment.reassignedAt?.toISOString() || null,
        reassignReason: assignment.reassignReason,
      },
    };
  } catch (err: unknown) {
    console.error("[getProjectAssignment] Error:", err);
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}
