"use server";

import { revalidatePath } from "next/cache";
import { auth, requireRole } from "@/lib/auth";
import { db, getDb, withDbTimeout } from "@/lib/db";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
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

    const entitlements: DefenseLabProjectEntitlementDTO[] = [];

    for (const p of projects) {
      const defenseLabLineItems = p.quotations.flatMap((q) =>
        q.lineItems.filter(
          (li) =>
            li.itemName === "DEFENSELAB" ||
            (li.description && li.description.toLowerCase().includes("defenselab"))
        )
      );

      const hasAddon = defenseLabLineItems.length > 0;
      let totalHoursPurchased = 0;
      for (const item of defenseLabLineItems) {
        const amt = Number(item.amount);
        totalHoursPurchased += Math.max(1, Math.round(amt / DEFENSELAB_RATE_PER_HOUR));
      }
      if (totalHoursPurchased === 0 && hasAddon) {
        totalHoursPurchased = 2;
      }

      const scheduledHours = (rawSessions as any[])
        .filter((s: any) => s.projectId === p.id && s.status !== "CANCELLED")
        .reduce((sum: number, s: any) => sum + (s.durationHours || 1), 0);
      const isPaid = p.payments.length > 0;

      if (hasAddon || isPaid) {
        entitlements.push({
          projectId: p.id,
          intakeId: p.intakeId,
          researchTitle: p.researchTitle,
          hasAddon,
          isPaid,
          totalHoursPurchased,
          remainingHours: Math.max(0, totalHoursPurchased - scheduledHours),
          expertAssignedName: p.assignment?.statistician?.fullName || null,
          expertAssignedId: p.assignment?.statisticianId || null,
        });
      }
    }

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
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: err.message || "Failed to load DefenseLab data." },
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
    console.error("[GetAdminDefenseLabData] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: err.message || "Failed to load DefenseLab operations queue." },
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
          message: "An expert statistician has not yet been assigned to this study. Please contact administration.",
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
      error: { code: "BOOKING_FAILED", message: err.message || "Failed to book DefenseLab session." },
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

    const isClient = session.user.role === "CLIENT" || session.user.id === existing.clientId;
    const isExpert = session.user.id === existing.expertId;
    const isManager = session.user.role === "ADMIN" || session.user.role === "CEO";

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
      error: { code: "RESCHEDULE_FAILED", message: err.message || "Failed to reschedule session." },
    };
  }
}

/**
 * 5. Update Meeting URL (Google Meet / Zoom)
 */
export async function updateDefenseLabMeetingLink(
  input: unknown
): Promise<DefenseLabActionResult<{ meetingUrl: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please log in." } };
  }

  const parsed = UpdateDefenseLabMeetingLinkSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Please provide a valid video meeting URL." },
    };
  }

  const { sessionId, meetingUrl } = parsed.data;

  try {
    const client = getDb();
    const defenseDelegate = (client as any).defenseLabSession || (db as any).defenseLabSession;

    let sessionData: { projectId?: string; clientId?: string; expertId?: string } | null = null;
    if (defenseDelegate) {
      sessionData = await withDbTimeout(
        defenseDelegate.update({
          where: { id: sessionId },
          data: { meetingUrl: meetingUrl.trim() },
        })
      );
    } else {
      await withDbTimeout(
        client.$executeRawUnsafe(
          `UPDATE "defense_lab_sessions" SET "meetingUrl" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
          meetingUrl.trim(),
          sessionId
        )
      );
      const rows: any[] = await client.$queryRawUnsafe(
        `SELECT * FROM "defense_lab_sessions" WHERE "id" = $1 LIMIT 1`,
        sessionId
      );
      sessionData = rows?.[0];
    }

    revalidatePath("/dashboard/client/defenselab");
    revalidatePath("/dashboard/admin/defenselab");

    try {
      if (sessionData) {
        const recipients = [sessionData.clientId, sessionData.expertId].filter((id): id is string => Boolean(id));
        if (recipients.length > 0) {
          dispatchRealtimeNotification({
            eventType: "DEFENSELAB_UPDATE",
            projectId: sessionData.projectId,
            title: "DefenseLab Meeting Link Ready",
            message: "Your DefenseLab video meeting link has been updated. Check your rehearsal desk.",
            targetUserIds: recipients,
            excludeUserId: session.user.id,
          });
        }
      }
    } catch (notifyErr) {
      console.warn("[updateDefenseLabMeetingLink] Realtime notification warning:", notifyErr);
    }

    return {
      success: true,
      data: { meetingUrl: meetingUrl.trim() },
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: err.message || "Failed to update meeting link." },
    };
  }
}

/**
 * 6. Mark Session Completed & Optionally Attach Recording / Notes
 */
export async function completeDefenseLabSession(
  input: unknown
): Promise<DefenseLabActionResult<{ id: string; status: string }>> {
  const session = await requireRole("ADMIN", "CEO", "STATISTICIAN");

  const parsed = CompleteDefenseLabSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid session completion details." },
    };
  }

  const { sessionId, recordingUrl, notes } = parsed.data;

  try {
    const client = getDb();
    const defenseDelegate = (client as any).defenseLabSession || (db as any).defenseLabSession;

    let sessionData: { projectId?: string; clientId?: string } | null = null;
    if (defenseDelegate) {
      sessionData = await withDbTimeout(
        defenseDelegate.update({
          where: { id: sessionId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            completedBy: session.user.id,
            recordingUrl: recordingUrl?.trim() || undefined,
            notes: notes?.trim() || undefined,
          },
        })
      );
    } else {
      await withDbTimeout(
        client.$executeRawUnsafe(
          `UPDATE "defense_lab_sessions"
           SET "status" = 'COMPLETED'::"DefenseLabStatus", "completedAt" = NOW(), "completedBy" = $1,
               "recordingUrl" = COALESCE($2, "recordingUrl"), "notes" = COALESCE($3, "notes"), "updatedAt" = NOW()
           WHERE "id" = $4`,
          session.user.id,
          recordingUrl?.trim() || null,
          notes?.trim() || null,
          sessionId
        )
      );
      const rows: any[] = await client.$queryRawUnsafe(
        `SELECT * FROM "defense_lab_sessions" WHERE "id" = $1 LIMIT 1`,
        sessionId
      );
      sessionData = rows?.[0];
    }

    revalidatePath("/dashboard/client/defenselab");
    revalidatePath("/dashboard/admin/defenselab");

    try {
      if (sessionData?.clientId) {
        dispatchRealtimeNotification({
          eventType: "DEFENSELAB_UPDATE",
          projectId: sessionData.projectId,
          title: "DefenseLab Rehearsal Completed",
          message: "Your DefenseLab mock defense rehearsal has been completed.",
          targetUserIds: [sessionData.clientId],
          excludeUserId: session.user.id,
        });
      }
    } catch (notifyErr) {
      console.warn("[completeDefenseLabSession] Realtime notification warning:", notifyErr);
    }

    return {
      success: true,
      data: { id: sessionId, status: "COMPLETED" },
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: "COMPLETE_FAILED", message: err.message || "Failed to complete DefenseLab session." },
    };
  }
}

/**
 * 7. Upload / Update Recording URL (Admin / Specialist)
 */
export async function uploadDefenseLabRecording(
  input: unknown
): Promise<DefenseLabActionResult<{ recordingUrl: string }>> {
  const session = await requireRole("ADMIN", "CEO", "STATISTICIAN");

  const parsed = UploadDefenseLabRecordingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Please provide a valid cloud storage URL." },
    };
  }

  const { sessionId, recordingUrl } = parsed.data;

  try {
    const client = getDb();
    const defenseDelegate = (client as any).defenseLabSession || (db as any).defenseLabSession;

    if (defenseDelegate) {
      await withDbTimeout(
        defenseDelegate.update({
          where: { id: sessionId },
          data: {
            recordingUrl: recordingUrl.trim(),
            status: "COMPLETED",
            completedAt: new Date(),
            completedBy: session.user.id,
          },
        })
      );
    } else {
      await withDbTimeout(
        client.$executeRawUnsafe(
          `UPDATE "defense_lab_sessions"
           SET "recordingUrl" = $1, "status" = 'COMPLETED'::"DefenseLabStatus", "completedAt" = NOW(), "completedBy" = $2, "updatedAt" = NOW()
           WHERE "id" = $3`,
          recordingUrl.trim(),
          session.user.id,
          sessionId
        )
      );
    }

    revalidatePath("/dashboard/client/defenselab");
    revalidatePath("/dashboard/admin/defenselab");

    return {
      success: true,
      data: { recordingUrl: recordingUrl.trim() },
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: "UPLOAD_FAILED", message: err.message || "Failed to attach recording." },
    };
  }
}

/**
 * 8. Apply Administrative Penalty Determination
 */
export async function applyDefenseLabPenalty(
  input: unknown
): Promise<DefenseLabActionResult<{ penaltyApplied: boolean }>> {
  const session = await requireRole("ADMIN", "CEO");

  const parsed = ApplyDefenseLabPenaltySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid penalty determination input." },
    };
  }

  const { sessionId, penaltyReason, penaltyAmount } = parsed.data;

  try {
    const client = getDb();
    const defenseDelegate = (client as any).defenseLabSession || (db as any).defenseLabSession;

    if (defenseDelegate) {
      await withDbTimeout(
        defenseDelegate.update({
          where: { id: sessionId },
          data: {
            penaltyApplied: true,
            penaltyReason: penaltyReason.trim(),
            penaltyDeterminedBy: session.user.id,
            penaltyAmount: penaltyAmount !== undefined ? penaltyAmount : undefined,
            status: "PENALTY_APPLIED",
          },
        })
      );
    } else {
      await withDbTimeout(
        client.$executeRawUnsafe(
          `UPDATE "defense_lab_sessions"
           SET "penaltyApplied" = TRUE, "penaltyReason" = $1, "penaltyDeterminedBy" = $2, "penaltyAmount" = $3, "status" = 'PENALTY_APPLIED'::"DefenseLabStatus", "updatedAt" = NOW()
           WHERE "id" = $4`,
          penaltyReason.trim(),
          session.user.id,
          penaltyAmount !== undefined ? penaltyAmount : null,
          sessionId
        )
      );
    }

    revalidatePath("/dashboard/admin/defenselab");
    return {
      success: true,
      data: { penaltyApplied: true },
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: "PENALTY_FAILED", message: err.message || "Failed to apply penalty." },
    };
  }
}
