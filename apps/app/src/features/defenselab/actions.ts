"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { auth, requireRole } from "@/lib/auth";
import { db, getDb, withDbTimeout } from "@/lib/db";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import { devAdminSessions, devComplete, devDefenseLabEnabled, devFee, devRecording, devSetLink } from "./dev-sessions";
import {
  BookDefenseLabSessionSchema,
  RescheduleDefenseLabSessionSchema,
  CompleteDefenseLabSessionSchema,
  UploadDefenseLabRecordingSchema,
  UpdateDefenseLabMeetingLinkSchema,
  ApplyDefenseLabPenaltySchema,
  type DefenseLabSessionDTO,
  type DefenseLabProjectEntitlementDTO,
} from "./schemas";
import {
  assertRescheduleEligible,
  computeDefenseLabAmount,
  assertDefenseLabEntitlement,
  DEFENSELAB_RATE_PER_HOUR,
} from "@/lib/defenselab-rules";

export interface DefenseLabActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

/** Business-rule errors pass through; database/infrastructure errors never reach the client's screen. */
function userFacingMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const isInfra =
    err.name.startsWith("Prisma") ||
    err.constructor?.name?.startsWith("Prisma") ||
    err.message === "DB_TIMEOUT" ||
    /Can't reach database|invocation in|ECONNREFUSED|ETIMEDOUT/i.test(err.message);
  return isInfra ? `${fallback} Please try again in a moment.` : err.message || fallback;
}

interface EntitlementSource {
  id: string;
  intakeId: string;
  researchTitle: string;
  lineItems: Array<{ itemName: string; description?: string | null; amount: unknown }>;
  isPaid: boolean;
  expertName: string | null;
  expertId: string | null;
}

/** A study is listed when it bought the DefenseLab add-on or has a verified payment. */
function buildEntitlement(
  p: EntitlementSource,
  sessions: Array<{ projectId: string; status: string; durationHours?: number }>
): DefenseLabProjectEntitlementDTO | null {
  const defenseLabLineItems = p.lineItems.filter(
    (li) => li.itemName === "DEFENSELAB" || (li.description && li.description.toLowerCase().includes("defenselab"))
  );
  const hasAddon = defenseLabLineItems.length > 0;
  let totalHoursPurchased = 0;
  for (const item of defenseLabLineItems) {
    totalHoursPurchased += Math.max(1, Math.round(Number(item.amount) / DEFENSELAB_RATE_PER_HOUR));
  }
  if (totalHoursPurchased === 0 && hasAddon) {
    totalHoursPurchased = 2;
  }
  if (!hasAddon && !p.isPaid) return null;

  const scheduledHours = sessions
    .filter((s) => s.projectId === p.id && s.status !== "CANCELLED")
    .reduce((sum, s) => sum + (s.durationHours || 1), 0);

  return {
    projectId: p.id,
    intakeId: p.intakeId,
    researchTitle: p.researchTitle,
    hasAddon,
    isPaid: p.isPaid,
    totalHoursPurchased,
    remainingHours: Math.max(0, totalHoursPurchased - scheduledHours),
    expertAssignedName: p.expertName,
    expertAssignedId: p.expertId,
  };
}

/** Local dev only: entitlements and sessions from the offline JSON stores when the DB is unreachable. */
function readDevDefenseLabData(
  userId: string,
  email?: string | null
): { entitlements: DefenseLabProjectEntitlementDTO[]; sessions: DefenseLabSessionDTO[] } {
  if (process.env.NODE_ENV === "production") return { entitlements: [], sessions: [] };
  // Fixed file paths (not built from a variable) so the build doesn't trace the whole project.
  const readJson = <T,>(full: string): T[] => {
    try {
      return fs.existsSync(full) ? (JSON.parse(fs.readFileSync(full, "utf-8")) as T[]) : [];
    } catch {
      return [];
    }
  };
  type DevProject = {
    id: string;
    intakeId: string;
    researchTitle: string;
    clientId: string;
    createdAt: string;
    client?: { email?: string };
    assignment?: { statisticianId?: string; statistician?: { fullName?: string } } | null;
  };
  type DevQuote = { projectId: string; status: string; lineItems?: EntitlementSource["lineItems"] };
  type DevPayment = { projectId: string; paymentStatus: string };

  const lowerEmail = email?.toLowerCase();
  const projects = readJson<DevProject>(path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-projects.json"))
    .filter((p) => p.clientId === userId || (!!lowerEmail && p.client?.email?.toLowerCase() === lowerEmail))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const quotes = readJson<DevQuote>(path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-quotations.json"));
  const payments = readJson<DevPayment>(path.join(/*turbopackIgnore: true*/ process.cwd(), "dev_data", "payments.json"));
  const projectIds = new Set(projects.map((p) => p.id));
  const sessions = readJson<DefenseLabSessionDTO>(path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-defenselab.json"))
    .filter((s) => projectIds.has(s.projectId))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const entitlements = projects.flatMap((p) => {
    const entitlement = buildEntitlement(
      {
        id: p.id,
        intakeId: p.intakeId,
        researchTitle: p.researchTitle,
        lineItems: quotes
          .filter((q) => q.projectId === p.id && ["CLIENT_APPROVED", "SUPERSEDED"].includes(q.status))
          .flatMap((q) => q.lineItems ?? []),
        isPaid: payments.some((pay) => pay.projectId === p.id && ["VERIFIED", "FULLY_PAID"].includes(pay.paymentStatus)),
        expertName: p.assignment?.statistician?.fullName ?? null,
        expertId: p.assignment?.statisticianId ?? null,
      },
      sessions
    );
    return entitlement ? [entitlement] : [];
  });
  return { entitlements, sessions };
}

/**
 * 1. Fetch Client DefenseLab Data (Entitled Projects & Scheduled Sessions)
 */
export async function getClientDefenseLabData(): Promise<
  DefenseLabActionResult<{
    entitlements: DefenseLabProjectEntitlementDTO[];
    sessions: DefenseLabSessionDTO[];
  }>
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please log in to continue." } };
  }

  try {
    const [projects, rawSessions] = await Promise.all([
      withDbTimeout(
        db.project.findMany({
          where: { clientId: session.user.id },
          include: {
            quotations: {
              where: { status: { in: ["CLIENT_APPROVED", "SUPERSEDED"] } },
              include: { lineItems: true },
            },
            assignment: {
              include: { statistician: true },
            },
            payments: {
              where: { paymentStatus: { in: ["VERIFIED", "FULLY_PAID"] } },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      ),
      withDbTimeout(
        (db as any).defenseLabSession
          ? (db as any).defenseLabSession.findMany({
              where: { clientId: session.user.id },
              include: {
                project: true,
                client: true,
                expert: true,
              },
              orderBy: { scheduledAt: "desc" },
            })
          : Promise.resolve([])
      ),
    ]);

    const entitlements = projects.flatMap((p) => {
      const entitlement = buildEntitlement(
        {
          id: p.id,
          intakeId: p.intakeId,
          researchTitle: p.researchTitle,
          lineItems: p.quotations.flatMap((q) => q.lineItems),
          isPaid: p.payments.length > 0,
          expertName: p.assignment?.statistician?.fullName || null,
          expertId: p.assignment?.statisticianId || null,
        },
        rawSessions as Array<{ projectId: string; status: string; durationHours?: number }>
      );
      return entitlement ? [entitlement] : [];
    });

    const sessions: DefenseLabSessionDTO[] = (rawSessions as any[]).map((s: any) => ({
      id: s.id,
      projectId: s.projectId,
      projectIntakeId: s.project.intakeId,
      projectTitle: s.project.researchTitle,
      clientId: s.clientId,
      clientName: s.client.fullName,
      clientEmail: s.client.email,
      expertId: s.expertId,
      expertName: s.expert.fullName,
      expertEmail: s.expert.email,
      scheduledAt: s.scheduledAt.toISOString(),
      durationHours: s.durationHours,
      amountPaid: Number(s.amountPaid),
      status: s.status,
      meetingUrl: s.meetingUrl,
      recordingUrl: s.status === "COMPLETED" ? s.recordingUrl : null, // Gated until completed
      completedAt: s.completedAt?.toISOString() || null,
      notes: s.notes,
      rescheduledAt: s.rescheduledAt?.toISOString() || null,
      rescheduleReason: s.rescheduleReason,
      rescheduleBy: s.rescheduleBy,
      penaltyApplied: s.penaltyApplied,
      penaltyReason: s.penaltyReason,
      penaltyDeterminedBy: s.penaltyDeterminedBy,
      penaltyAmount: s.penaltyAmount ? Number(s.penaltyAmount) : null,
      createdAt: s.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: { entitlements, sessions },
    };
  } catch (err: any) {
    console.error("[GetClientDefenseLabData] Error:", err);
    if (process.env.NODE_ENV !== "production") {
      // Offline dev: studies and sessions from the local stores (.dev-projects.json, .dev-defenselab.json).
      return {
        success: true,
        data: readDevDefenseLabData(session.user.id, session.user.email),
      };
    }
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: userFacingMessage(err, "Failed to load DefenseLab data.") },
    };
  }
}

/**
 * 2. Fetch Admin / CEO DefenseLab Operations Queue
 */
export async function getAdminDefenseLabData(): Promise<
  DefenseLabActionResult<{
    sessions: DefenseLabSessionDTO[];
    stats: {
      totalScheduled: number;
      totalCompleted: number;
      pendingMeetingLinks: number;
      pendingRecordings: number;
      lateNoShows: number;
      penaltiesLogged: number;
    };
  }>
> {
  const session = await requireRole("ADMIN", "CEO", "FINANCE_OFFICER");

  try {
    const rawSessions = (db as any).defenseLabSession
      ? await withDbTimeout(
          (db as any).defenseLabSession.findMany({
            include: {
              project: true,
              client: true,
              expert: true,
            },
            orderBy: { scheduledAt: "desc" },
          })
        )
      : [];

    const sessions: DefenseLabSessionDTO[] = (rawSessions as any[]).map((s: any) => ({
      id: s.id,
      projectId: s.projectId,
      projectIntakeId: s.project.intakeId,
      projectTitle: s.project.researchTitle,
      clientId: s.clientId,
      clientName: s.client.fullName,
      clientEmail: s.client.email,
      expertId: s.expertId,
      expertName: s.expert.fullName,
      expertEmail: s.expert.email,
      scheduledAt: s.scheduledAt.toISOString(),
      durationHours: s.durationHours,
      amountPaid: Number(s.amountPaid),
      status: s.status,
      meetingUrl: s.meetingUrl,
      recordingUrl: s.recordingUrl,
      completedAt: s.completedAt?.toISOString() || null,
      notes: s.notes,
      rescheduledAt: s.rescheduledAt?.toISOString() || null,
      rescheduleReason: s.rescheduleReason,
      rescheduleBy: s.rescheduleBy,
      penaltyApplied: s.penaltyApplied,
      penaltyReason: s.penaltyReason,
      penaltyDeterminedBy: s.penaltyDeterminedBy,
      penaltyAmount: s.penaltyAmount ? Number(s.penaltyAmount) : null,
      createdAt: s.createdAt.toISOString(),
    }));

    const stats = {
      totalScheduled: sessions.filter((s) => s.status === "SCHEDULED").length,
      totalCompleted: sessions.filter((s) => s.status === "COMPLETED").length,
      pendingMeetingLinks: sessions.filter((s) => s.status === "SCHEDULED" && !s.meetingUrl).length,
      pendingRecordings: sessions.filter((s) => s.status === "COMPLETED" && !s.recordingUrl).length,
      lateNoShows: sessions.filter((s) => s.status === "NO_SHOW_CLIENT").length,
      penaltiesLogged: sessions.filter((s) => s.penaltyApplied).length,
    };

    return {
      success: true,
      data: { sessions, stats },
    };
  } catch (err: any) {
    // Offline mode: the sample sessions in .dev-defenselab.json.
    if (devDefenseLabEnabled()) return { success: true, data: devAdminSessions() };
    console.error("[GetAdminDefenseLabData] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: userFacingMessage(err, "Failed to load DefenseLab operations queue.") },
    };
  }
}

/**
 * 3. Book a DefenseLab Mock Defense Session
 */
export async function bookDefenseLabSession(
  input: unknown
): Promise<DefenseLabActionResult<DefenseLabSessionDTO>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please log in to book a session." } };
  }

  const parsed = BookDefenseLabSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please fill out all booking parameters properly.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { projectId, scheduledAt, durationHours, notes } = parsed.data;

  try {
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() < Date.now()) {
      return {
        success: false,
        error: { code: "INVALID_SCHEDULE", message: "DefenseLab rehearsal must be scheduled for a future date and time." },
      };
    }

    // Verify client ownership of project
    const projectRecord = await withDbTimeout(
      db.project.findUnique({
        where: { id: projectId },
        select: { clientId: true },
      })
    );
    if (!projectRecord) {
      return { success: false, error: { code: "NOT_FOUND", message: "Study not found." } };
    }
    const isProjectOwner = projectRecord.clientId === session.user.id;
    const isProjectManager = session.user.role === "ADMIN" || session.user.role === "CEO";
    if (!isProjectOwner && !isProjectManager) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "You can only book DefenseLab sessions for your own studies." },
      };
    }

    // Verify entitlement & payment
    const entitlement = await assertDefenseLabEntitlement(projectId);

    if (!entitlement.isPaid) {
      return {
        success: false,
        error: {
          code: "PAYMENT_REQUIRED",
          message: "Payment verification is required before scheduling your DefenseLab mock defense rehearsal.",
        },
      };
    }

    if (!entitlement.assignedStatisticianId) {
      return {
        success: false,
        error: {
          code: "NO_EXPERT_ASSIGNED",
          message: "A statistical analyst has not yet been assigned to this study. Please contact administration.",
        },
      };
    }

    const amountPaid = computeDefenseLabAmount(durationHours);
    const client = getDb();
    const defenseDelegate = (client as any).defenseLabSession || (db as any).defenseLabSession;

    let newSession: any = null;
    if (defenseDelegate) {
      newSession = await withDbTimeout(
        defenseDelegate.create({
          data: {
            projectId,
            clientId: session.user.id,
            expertId: entitlement.assignedStatisticianId,
            scheduledAt: scheduledDate,
            durationHours,
            amountPaid,
            status: "SCHEDULED",
            notes: notes?.trim() || null,
          },
          include: {
            project: true,
            client: true,
            expert: true,
          },
        })
      );
    } else {
      const id = `dlab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await withDbTimeout(
        client.$executeRawUnsafe(
          `INSERT INTO "defense_lab_sessions" ("id", "projectId", "clientId", "expertId", "scheduledAt", "durationHours", "amountPaid", "status", "notes", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'SCHEDULED'::"DefenseLabStatus", $8, NOW(), NOW())`,
          id,
          projectId,
          session.user.id,
          entitlement.assignedStatisticianId,
          scheduledDate,
          durationHours,
          amountPaid,
          notes?.trim() || null
        )
      );
      const user = await client.user.findUnique({ where: { id: session.user.id } });
      const expert = await client.user.findUnique({ where: { id: entitlement.assignedStatisticianId } });
      const proj = await client.project.findUnique({ where: { id: projectId } });
      newSession = {
        id,
        projectId,
        project: proj,
        clientId: session.user.id,
        client: user,
        expertId: entitlement.assignedStatisticianId,
        expert,
        scheduledAt: scheduledDate,
        durationHours,
        amountPaid,
        status: "SCHEDULED",
        notes: notes?.trim() || null,
        meetingUrl: null,
        recordingUrl: null,
        completedAt: null,
        rescheduledAt: null,
        rescheduleReason: null,
        rescheduleBy: null,
        penaltyApplied: false,
        penaltyReason: null,
        penaltyDeterminedBy: null,
        penaltyAmount: null,
        createdAt: new Date(),
      };
    }

    revalidatePath("/dashboard/client/defenselab");
    revalidatePath("/dashboard/admin/defenselab");

    try {
      dispatchRealtimeNotification({
        eventType: "DEFENSELAB_UPDATE",
        projectId,
        title: "Mock Defense Booked",
        message: `Client scheduled a ${durationHours}-hour DefenseLab rehearsal on ${scheduledDate.toLocaleDateString()}.`,
        targetRoles: ["ADMIN"],
        targetUserIds: entitlement.assignedStatisticianId ? [entitlement.assignedStatisticianId] : undefined,
        excludeUserId: session.user.id,
      });
    } catch (notifyErr) {
      console.warn("[bookDefenseLabSession] Realtime notification warning:", notifyErr);
    }

    return {
      success: true,
      data: {
        id: newSession.id,
        projectId: newSession.projectId,
        projectIntakeId: newSession.project.intakeId,
        projectTitle: newSession.project.researchTitle,
        clientId: newSession.clientId,
        clientName: newSession.client.fullName,
        clientEmail: newSession.client.email,
        expertId: newSession.expertId,
        expertName: newSession.expert.fullName,
        expertEmail: newSession.expert.email,
        scheduledAt: newSession.scheduledAt.toISOString(),
        durationHours: newSession.durationHours,
        amountPaid: Number(newSession.amountPaid),
        status: newSession.status,
        meetingUrl: newSession.meetingUrl,
        recordingUrl: null,
        completedAt: null,
        notes: newSession.notes,
        rescheduledAt: null,
        rescheduleReason: null,
        rescheduleBy: null,
        penaltyApplied: false,
        penaltyReason: null,
        penaltyDeterminedBy: null,
        penaltyAmount: null,
        createdAt: newSession.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error("[BookDefenseLabSession] Error:", err);
    return {
      success: false,
      error: { code: "BOOKING_FAILED", message: userFacingMessage(err, "Failed to book DefenseLab session.") },
    };
  }
}

/**
 * 4. Reschedule a DefenseLab Session (Enforcing 12-Hour Rule)
 */
export async function rescheduleDefenseLabSession(
  input: unknown
): Promise<DefenseLabActionResult<{ status: string; message: string; session: DefenseLabSessionDTO }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please log in to reschedule." } };
  }

  const parsed = RescheduleDefenseLabSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid rescheduling parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { sessionId, newScheduledAt, reason } = parsed.data;

  try {
    const client = getDb();
    const defenseDelegate = (client as any).defenseLabSession || (db as any).defenseLabSession;

    let existing: any = null;
    if (defenseDelegate) {
      existing = await withDbTimeout(
        defenseDelegate.findUnique({
          where: { id: sessionId },
          include: { project: true, client: true, expert: true },
        })
      );
    } else {
      const rows: any[] = await withDbTimeout(
        client.$queryRawUnsafe(
          `SELECT * FROM "defense_lab_sessions" WHERE "id" = $1 LIMIT 1`,
          sessionId
        )
      );
      if (rows && rows[0]) {
        existing = rows[0];
        existing.project = await client.project.findUnique({ where: { id: existing.projectId } });
        existing.client = await client.user.findUnique({ where: { id: existing.clientId } });
        existing.expert = await client.user.findUnique({ where: { id: existing.expertId } });
      }
    }

    if (!existing) {
      return { success: false, error: { code: "NOT_FOUND", message: "DefenseLab session not found." } };
    }

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      return {
        success: false,
        error: { code: "INVALID_STATE", message: "Cannot reschedule a completed or cancelled session." },
      };
    }

    const isClientOwner = session.user.id === existing.clientId;
    const isExpert = session.user.id === existing.expertId;
    const isManager = session.user.role === "ADMIN" || session.user.role === "CEO";

    if (!isClientOwner && !isExpert && !isManager) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "You do not have permission to reschedule this session." },
      };
    }

    const isClient = isClientOwner;

    const eligibility = assertRescheduleEligible(existing.scheduledAt, new Date(), isClient);

    const newDate = new Date(newScheduledAt);
    if (isNaN(newDate.getTime()) || newDate.getTime() < Date.now()) {
      return {
        success: false,
        error: { code: "INVALID_DATE", message: "New session time must be in the future." },
      };
    }

    let updatedStatus: any = "RESCHEDULED";
    let message = "Session rescheduled successfully.";
    let penaltyApplied = false;
    let penaltyReason: string | null = null;
    let finalScheduledAt = newDate;

    if (!eligibility.eligible) {
      if (eligibility.violation === "CLIENT_LATE" && isClient) {
        // Strict Policy: Notice < 12 hours from client -> Marked NO_SHOW_CLIENT, no refund, original time stands
        updatedStatus = "NO_SHOW_CLIENT";
        finalScheduledAt = existing.scheduledAt; // Do not move session
        message =
          "Notice given was less than 12 hours before session. Under policy DEF-F04, this has been marked as a late cancellation (No-Show). The session fee is non-refundable.";
      } else if (eligibility.violation === "EXPERT_LATE" || isExpert) {
        // Notice < 12 hours from expert -> Rebooked, but expert penalty logged
        updatedStatus = "RESCHEDULED";
        penaltyApplied = true;
        penaltyReason = `Expert late reschedule notice (${Math.round(eligibility.hoursUntilSession)}h prior). Stated reason: ${reason}`;
        message = "Session rescheduled. An administrative note regarding late specialist notice has been logged.";
      }
    }

    let updated: any = null;
    if (defenseDelegate) {
      updated = await withDbTimeout(
        defenseDelegate.update({
          where: { id: sessionId },
          data: {
            scheduledAt: finalScheduledAt,
            status: updatedStatus,
            rescheduledAt: new Date(),
            rescheduleReason: reason.trim(),
            rescheduleBy: session.user.id,
            penaltyApplied: penaltyApplied || existing.penaltyApplied,
            penaltyReason: penaltyReason || existing.penaltyReason,
          },
          include: { project: true, client: true, expert: true },
        })
      );
    } else {
      await withDbTimeout(
        client.$executeRawUnsafe(
          `UPDATE "defense_lab_sessions"
           SET "scheduledAt" = $1, "status" = $2::"DefenseLabStatus", "rescheduledAt" = NOW(), "rescheduleReason" = $3, "rescheduleBy" = $4, "penaltyApplied" = $5, "penaltyReason" = $6, "updatedAt" = NOW()
           WHERE "id" = $7`,
          finalScheduledAt,
          updatedStatus,
          reason.trim(),
          session.user.id,
          penaltyApplied || existing.penaltyApplied,
          penaltyReason || existing.penaltyReason,
          sessionId
        )
      );
      updated = {
        ...existing,
        scheduledAt: finalScheduledAt,
        status: updatedStatus,
        rescheduledAt: new Date(),
        rescheduleReason: reason.trim(),
        rescheduleBy: session.user.id,
        penaltyApplied: penaltyApplied || existing.penaltyApplied,
        penaltyReason: penaltyReason || existing.penaltyReason,
      };
    }

    revalidatePath("/dashboard/client/defenselab");
    revalidatePath("/dashboard/admin/defenselab");

    try {
      dispatchRealtimeNotification({
        eventType: "DEFENSELAB_UPDATE",
        projectId: updated.projectId,
        title: "DefenseLab Session Rescheduled",
        message: `DefenseLab rehearsal was rescheduled to ${finalScheduledAt.toLocaleDateString()}.`,
        targetUserIds: [updated.clientId, updated.expertId].filter(Boolean),
        targetRoles: ["ADMIN"],
        excludeUserId: session.user.id,
      });
    } catch (notifyErr) {
      console.warn("[rescheduleDefenseLabSession] Realtime notification warning:", notifyErr);
    }

    return {
      success: true,
      data: {
        status: updated.status,
        message,
        session: {
          id: updated.id,
          projectId: updated.projectId,
          projectIntakeId: updated.project.intakeId,
          projectTitle: updated.project.researchTitle,
          clientId: updated.clientId,
          clientName: updated.client.fullName,
          clientEmail: updated.client.email,
          expertId: updated.expertId,
          expertName: updated.expert.fullName,
          expertEmail: updated.expert.email,
          scheduledAt: updated.scheduledAt.toISOString(),
          durationHours: updated.durationHours,
          amountPaid: Number(updated.amountPaid),
          status: updated.status,
          meetingUrl: updated.meetingUrl,
          recordingUrl: updated.status === "COMPLETED" ? updated.recordingUrl : null,
          completedAt: updated.completedAt?.toISOString() || null,
          notes: updated.notes,
          rescheduledAt: updated.rescheduledAt?.toISOString() || null,
          rescheduleReason: updated.rescheduleReason,
          rescheduleBy: updated.rescheduleBy,
          penaltyApplied: updated.penaltyApplied,
          penaltyReason: updated.penaltyReason,
          penaltyDeterminedBy: updated.penaltyDeterminedBy,
          penaltyAmount: updated.penaltyAmount ? Number(updated.penaltyAmount) : null,
          createdAt: updated.createdAt.toISOString(),
        },
      },
    };
  } catch (err: any) {
    console.error("[RescheduleDefenseLabSession] Error:", err);
    return {
      success: false,
      error: { code: "RESCHEDULE_FAILED", message: userFacingMessage(err, "Failed to reschedule session.") },
    };
  }
}

const OPEN_STATUSES = ["SCHEDULED", "RESCHEDULED"] as const;
type Fail = { success: false; error: { code: string; message: string } };
const fail = (code: string, message: string): Fail => ({ success: false, error: { code, message } });

async function findSession(sessionId: string) {
  return withDbTimeout(
    db.defenseLabSession.findUnique({
      where: { id: sessionId },
      select: { id: true, projectId: true, clientId: true, expertId: true, status: true, scheduledAt: true, penaltyApplied: true },
    })
  );
}

/**
 * 5. Set or change the meeting link (admins and the CEO), only for a session that hasn't happened yet. The client
 * and the expert are told.
 */
export async function updateDefenseLabMeetingLink(
  input: unknown
): Promise<DefenseLabActionResult<{ meetingUrl: string }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "Please log in.");
  // Any signed-in user could change any session's link before (and the app then sent it to the client and expert).
  if (session.user.role !== "ADMIN" && session.user.role !== "CEO") {
    return fail("FORBIDDEN", "Only administrators can change meeting links.");
  }
  const parsed = UpdateDefenseLabMeetingLinkSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Paste the full meeting link.");
  const { sessionId, meetingUrl } = parsed.data;

  try {
    const row = await findSession(sessionId);
    if (!row) return fail("NOT_FOUND", "Session not found.");
    const moved = await db.defenseLabSession.updateMany({
      where: { id: sessionId, status: { in: [...OPEN_STATUSES] } },
      data: { meetingUrl },
    });
    if (moved.count === 0) return fail("CLOSED", "This session already happened or was cancelled, so its link can't change.");

    revalidatePath("/dashboard/client/defenselab");
    revalidatePath("/dashboard/admin/defenselab");
    try {
      await dispatchRealtimeNotification({
        eventType: "DEFENSELAB_UPDATE",
        projectId: row.projectId,
        title: "DefenseLab meeting link ready",
        message: `The video link for your practice defense on ${row.scheduledAt.toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} is ready.`,
        targetUserIds: [row.clientId, row.expertId],
        excludeUserId: session.user.id,
      });
    } catch (notifyErr) {
      console.warn("[updateDefenseLabMeetingLink] Notification warning:", notifyErr);
    }
    return { success: true, data: { meetingUrl } };
  } catch (err: unknown) {
    if (devDefenseLabEnabled()) {
      const r = devSetLink(sessionId, meetingUrl);
      revalidatePath("/dashboard/admin/defenselab");
      return r.success ? { success: true, data: { meetingUrl } } : r;
    }
    return fail("UPDATE_FAILED", userFacingMessage(err, "The link wasn't saved. Please try again."));
  }
}

/**
 * 6. Mark a session done (admins, the CEO, or its own expert), with an optional recording link and notes. Only a
 * scheduled session whose start time has passed (it used to work on cancelled or already-finished sessions, and
 * before the session had happened).
 */
export async function completeDefenseLabSession(
  input: unknown
): Promise<DefenseLabActionResult<{ id: string; status: string }>> {
  const session = await requireRole("ADMIN", "CEO", "STATISTICIAN");
  const parsed = CompleteDefenseLabSessionSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Check the details.");
  const { sessionId, recordingUrl, notes } = parsed.data;

  try {
    const row = await findSession(sessionId);
    if (!row) return fail("NOT_FOUND", "Session not found.");
    if (session.user.role === "STATISTICIAN" && row.expertId !== session.user.id) {
      return fail("FORBIDDEN", "You are not the expert for this session.");
    }
    if (row.scheduledAt.getTime() > Date.now()) return fail("TOO_EARLY", "This session hasn't started yet.");
    const moved = await db.defenseLabSession.updateMany({
      where: { id: sessionId, status: { in: [...OPEN_STATUSES] } },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy: session.user.id,
        ...(recordingUrl ? { recordingUrl } : {}),
        ...(notes?.trim() ? { notes: notes.trim() } : {}),
      },
    });
    if (moved.count === 0) return fail("CLOSED", "This session is already done, missed or cancelled.");

    revalidatePath("/dashboard/client/defenselab");
    revalidatePath("/dashboard/admin/defenselab");
    try {
      await dispatchRealtimeNotification({
        eventType: "DEFENSELAB_UPDATE",
        projectId: row.projectId,
        title: "DefenseLab practice done",
        message: recordingUrl ? "Your practice defense is done. The recording is on your DefenseLab page." : "Your practice defense is done.",
        targetUserIds: [row.clientId],
        excludeUserId: session.user.id,
      });
    } catch (notifyErr) {
      console.warn("[completeDefenseLabSession] Notification warning:", notifyErr);
    }
    return { success: true, data: { id: sessionId, status: "COMPLETED" } };
  } catch (err: unknown) {
    if (devDefenseLabEnabled()) {
      const r = devComplete(sessionId, recordingUrl || undefined, notes);
      revalidatePath("/dashboard/admin/defenselab");
      return r.success ? { success: true, data: { id: sessionId, status: "COMPLETED" } } : r;
    }
    return fail("COMPLETE_FAILED", userFacingMessage(err, "The session wasn't marked done. Please try again."));
  }
}

/**
 * 7. Add or change the recording link of a finished session (admins, the CEO, or its own expert). It used to mark
 * any session done (even missed ones) and let any analyst change any session's recording.
 */
export async function uploadDefenseLabRecording(
  input: unknown
): Promise<DefenseLabActionResult<{ recordingUrl: string }>> {
  const session = await requireRole("ADMIN", "CEO", "STATISTICIAN");
  const parsed = UploadDefenseLabRecordingSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Paste the full recording link.");
  const { sessionId, recordingUrl } = parsed.data;

  try {
    const row = await findSession(sessionId);
    if (!row) return fail("NOT_FOUND", "Session not found.");
    if (session.user.role === "STATISTICIAN" && row.expertId !== session.user.id) {
      return fail("FORBIDDEN", "You are not the expert for this session.");
    }
    const moved = await db.defenseLabSession.updateMany({ where: { id: sessionId, status: "COMPLETED" }, data: { recordingUrl } });
    if (moved.count === 0) return fail("NOT_DONE", "Mark the session done first.");

    revalidatePath("/dashboard/client/defenselab");
    revalidatePath("/dashboard/admin/defenselab");
    try {
      await dispatchRealtimeNotification({
        eventType: "DEFENSELAB_UPDATE",
        projectId: row.projectId,
        title: "Your DefenseLab recording is ready",
        message: "Watch your practice defense again from your DefenseLab page.",
        targetUserIds: [row.clientId],
        excludeUserId: session.user.id,
      });
    } catch (notifyErr) {
      console.warn("[uploadDefenseLabRecording] Notification warning:", notifyErr);
    }
    return { success: true, data: { recordingUrl } };
  } catch (err: unknown) {
    if (devDefenseLabEnabled()) {
      const r = devRecording(sessionId, recordingUrl);
      revalidatePath("/dashboard/admin/defenselab");
      return r.success ? { success: true, data: { recordingUrl } } : r;
    }
    return fail("UPLOAD_FAILED", userFacingMessage(err, "The recording link wasn't saved. Please try again."));
  }
}

/**
 * 8. Charge a late-change or no-show fee (admins and the CEO), once per session, never on a finished or cancelled
 * one. Recorded in the activity log.
 */
export async function applyDefenseLabPenalty(
  input: unknown
): Promise<DefenseLabActionResult<{ penaltyApplied: boolean }>> {
  const session = await requireRole("ADMIN", "CEO");
  const parsed = ApplyDefenseLabPenaltySchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Check the details.");
  const { sessionId, penaltyReason, penaltyAmount } = parsed.data;

  try {
    const row = await findSession(sessionId);
    if (!row) return fail("NOT_FOUND", "Session not found.");
    const moved = await db.defenseLabSession.updateMany({
      where: { id: sessionId, penaltyApplied: false, status: { in: ["SCHEDULED", "RESCHEDULED", "NO_SHOW_CLIENT"] } },
      data: {
        penaltyApplied: true,
        penaltyReason,
        penaltyDeterminedBy: session.user.id,
        penaltyAmount: penaltyAmount ?? null,
        status: "PENALTY_APPLIED",
      },
    });
    if (moved.count === 0) return fail("CLOSED", "A fee can't be added: the session is done, cancelled, or already has one.");
    await db.auditLog
      .create({
        data: {
          projectId: row.projectId,
          actorId: session.user.id,
          actorRole: session.user.role as "ADMIN" | "CEO",
          action: "DEFENSELAB_FEE",
          oldValue: row.status,
          newValue: "PENALTY_APPLIED",
          reason: `${penaltyReason}${penaltyAmount ? ` (₱${penaltyAmount})` : ""}`,
        },
      })
      .catch(() => null);

    revalidatePath("/dashboard/client/defenselab");
    revalidatePath("/dashboard/admin/defenselab");
    return { success: true, data: { penaltyApplied: true } };
  } catch (err: unknown) {
    if (devDefenseLabEnabled()) {
      const r = devFee(sessionId, penaltyReason, penaltyAmount, session.user.id);
      revalidatePath("/dashboard/admin/defenselab");
      return r.success ? { success: true, data: { penaltyApplied: true } } : r;
    }
    return fail("PENALTY_FAILED", userFacingMessage(err, "The fee wasn't saved. Please try again."));
  }
}
