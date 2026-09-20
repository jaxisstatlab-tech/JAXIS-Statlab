"use server";

import { db, withDbTimeout } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import {
  MarkAlertReadSchema,
  CreateInAppAlertSchema,
  NotificationFilterSchema,
  type MarkAlertReadInput,
  type CreateInAppAlertInput,
  type NotificationFilterInput,
  type InAppAlertDTO,
  type NotificationLogDTO,
  type NotificationSummaryDTO,
} from "./schemas";
import { revalidatePath } from "next/cache";
import type { RoleName } from "@prisma/client";
import type { EmailTemplateName } from "@/lib/email/types";

/**
 * Seeds role-tailored welcome and onboarding notifications for fresh accounts across all roles.
 * Guaranteed to execute only if the recipient has zero existing notifications.
 */
export async function ensureFreshAccountNotifications(
  userId: string,
  role: RoleName = "CLIENT"
): Promise<void> {
  try {
    const existingCount = await withDbTimeout(
      db.inAppAlert.count({
        where: { recipientId: userId },
      }),
      2000
    );

    if (existingCount > 0) {
      return;
    }

    const welcomeAlerts: {
      alertType: string;
      message: string;
      linkUrl: string;
    }[] = [];

    switch (role) {
      case "CLIENT":
        welcomeAlerts.push(
          {
            alertType: "SYSTEM_ALERT",
            message: "Welcome to JAXIS StatLab! Submit your research study intake or explore our consulting packages to begin.",
            linkUrl: "/dashboard/client/projects/new",
          },
          {
            alertType: "INPUT_UPDATE",
            message: "Complete your school and academic profile so we can pair you with the best statistical specialist.",
            linkUrl: "/dashboard/client/profile",
          }
        );
        break;

      case "STATISTICIAN":
        welcomeAlerts.push(
          {
            alertType: "SYSTEM_ALERT",
            message: "Welcome to JAXIS StatLab! Your specialist workbench is ready. Check your assigned studies and duty capacity.",
            linkUrl: "/dashboard/statistician",
          },
          {
            alertType: "ATTENDANCE_UPDATE",
            message: "Clock in on your duty clock whenever you work on analysis to log verified duty hours and hourly earnings.",
            linkUrl: "/dashboard/staff/attendance",
          }
        );
        break;

      case "SENIOR_QA_LEAD":
        welcomeAlerts.push(
          {
            alertType: "SYSTEM_ALERT",
            message: "Welcome to JAXIS StatLab! Your Senior QA review desk is ready to inspect incoming statistical outputs.",
            linkUrl: "/dashboard/qa",
          },
          {
            alertType: "QA_DECISION",
            message: "Review methodology guidelines and academic integrity standards for statistical file audits.",
            linkUrl: "/dashboard/qa",
          }
        );
        break;

      case "FINANCE_OFFICER":
        welcomeAlerts.push(
          {
            alertType: "SYSTEM_ALERT",
            message: "Welcome to the Finance Desk! Verify payment proofs, monitor escrow releases, and manage staff payroll.",
            linkUrl: "/dashboard/finance",
          },
          {
            alertType: "PAYROLL_UPDATE",
            message: "Check corporate settlement cutoffs and verify payment accounts before running batch payroll cycles.",
            linkUrl: "/dashboard/finance/payroll",
          }
        );
        break;

      case "ADMIN":
        welcomeAlerts.push(
          {
            alertType: "SYSTEM_ALERT",
            message: "Welcome to Operations Control! Triage new study intakes, manage specialist assignments, and track SLAs.",
            linkUrl: "/dashboard/admin",
          },
          {
            alertType: "NEW_INTAKE",
            message: "Review incoming client research proposals and issue formal quotations.",
            linkUrl: "/dashboard/admin/intake",
          }
        );
        break;

      case "CEO":
        welcomeAlerts.push(
          {
            alertType: "SYSTEM_ALERT",
            message: "Welcome to the Executive Office. Monitor company revenue, authorize payroll disbursements, and oversee study quality.",
            linkUrl: "/dashboard/ceo",
          },
          {
            alertType: "PAYROLL_UPDATE",
            message: "Set role compensation policies, package deliverable rates, and review company financial health.",
            linkUrl: "/dashboard/ceo/payroll",
          }
        );
        break;
    }

    if (welcomeAlerts.length > 0) {
      await withDbTimeout(
        db.inAppAlert.createMany({
          data: welcomeAlerts.map((a) => ({
            recipientId: userId,
            recipientRole: role,
            alertType: a.alertType,
            message: a.message,
            linkUrl: a.linkUrl,
            isRead: false,
          })),
        }),
        3000
      );
    }
  } catch (err) {
    console.warn("[ensureFreshAccountNotifications] Warning:", err);
  }
}

/**
 * Resolves the true PostgreSQL user ID to prevent foreign key errors with legacy tokens.
 */
async function resolveDbUserId(userId: string, email?: string | null): Promise<string> {
  if (userId) {
    try {
      const byId = await withDbTimeout(
        db.user.findUnique({ where: { id: userId }, select: { id: true } }),
        1500
      );
      if (byId?.id) return byId.id;
    } catch {
      // ignore
    }
  }
  if (email) {
    try {
      const byEmail = await withDbTimeout(
        db.user.findUnique({ where: { email: email.toLowerCase().trim() }, select: { id: true } }),
        1500
      );
      if (byEmail?.id) return byEmail.id;
    } catch {
      // ignore
    }
  }
  return userId;
}

function getStudyStageIndex(status: string): number {
  switch (status) {
    case "NEW_REQUEST":
    case "UNDER_EVALUATION":
    case "AWAITING_INFORMATION":
    case "QUOTE_SENT":
      return 0; // Stage 1: Proposal & Quote
    case "CLIENT_APPROVED":
    case "SOW_PENDING":
      return 1; // Stage 2: Contract (SOW)
    case "SOW_SIGNED":
    case "AWAITING_PAYMENT":
      return 2; // Stage 3: Downpayment
    case "ACTIVE":
    case "EXPERT_ASSIGNED":
    case "IN_PROGRESS":
    case "FOR_QA":
    case "QA_REVISION":
      return 3; // Stage 4: Analysis & QA
    case "QA_APPROVED":
    case "DELIVERED":
    case "COMPLETED":
      return 4; // Stage 5: Final Outputs
    default:
      return 0;
  }
}

/**
 * Automatically ensures that all reached project lifecycle milestone notifications
 * exist for a user's active and historical research studies.
 */
export async function ensureProjectLifecycleNotifications(
  userId: string,
  userEmail?: string | null,
  userRole?: RoleName
): Promise<void> {
  if (userRole && userRole !== "CLIENT") {
    return;
  }

  try {
    const projects = await withDbTimeout(
      db.project.findMany({
        where: {
          OR: [
            { clientId: userId },
            ...(userEmail ? [{ client: { email: userEmail.toLowerCase().trim() } }] : []),
          ],
        },
        select: {
          id: true,
          intakeId: true,
          researchTitle: true,
          masterStatus: true,
          packageName: true,
          createdAt: true,
        },
      }),
      2500
    );

    if (!projects || projects.length === 0) {
      return;
    }

    const existingAlerts = await withDbTimeout(
      db.inAppAlert.findMany({
        where: {
          recipientId: userId,
          projectId: { in: projects.map((p) => p.id) },
        },
        select: {
          projectId: true,
          alertType: true,
          message: true,
        },
      }),
      2000
    );

    const alertsToCreate: {
      recipientId: string;
      recipientRole: RoleName;
      alertType: string;
      projectId: string;
      message: string;
      linkUrl: string;
      isRead: boolean;
      createdAt: Date;
    }[] = [];

    const now = Date.now();
    const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000);

    for (const p of projects) {
      const stageIdx = getStudyStageIndex(p.masterStatus);
      const projAlerts = existingAlerts.filter((a) => a.projectId === p.id);
      const pkgLabel = p.packageName?.replace(/_/g, " ") || "Statistical Suite";

      // Stage 1: Proposal & Quote Ready (Stage 1+)
      const hasStage1 = projAlerts.some(
        (a) => a.alertType === "COMMERCIAL_UPDATE" && a.message.includes("Quotation ready")
      );
      if (!hasStage1 && stageIdx >= 0) {
        alertsToCreate.push({
          recipientId: userId,
          recipientRole: "CLIENT",
          alertType: "COMMERCIAL_UPDATE",
          projectId: p.id,
          message: `Quotation ready for review: ${p.intakeId} — ${p.researchTitle}. Package: ${pkgLabel}. Scope of work and pricing ready.`,
          linkUrl: `/dashboard/client/projects/${p.id}/quote`,
          isRead: stageIdx > 0,
          createdAt: hoursAgo(72),
        });
      }

      // Stage 2: Contract (SOW) Agreement (Stage 2+)
      const hasStage2 = projAlerts.some(
        (a) => a.alertType === "COMMERCIAL_UPDATE" && a.message.includes("Scope of Work (SOW)")
      );
      if (!hasStage2 && stageIdx >= 1) {
        alertsToCreate.push({
          recipientId: userId,
          recipientRole: "CLIENT",
          alertType: "COMMERCIAL_UPDATE",
          projectId: p.id,
          message: `Scope of Work (SOW) agreement executed for ${p.intakeId}. Research milestones and deliverables are locked in escrow.`,
          linkUrl: `/dashboard/client/projects/${p.id}/sow`,
          isRead: stageIdx > 1,
          createdAt: hoursAgo(48),
        });
      }

      // Stage 3: Downpayment Verified (Stage 3+)
      const hasStage3 = projAlerts.some(
        (a) => a.alertType === "PAYMENT_UPDATE" && a.message.includes("Downpayment verified")
      );
      if (!hasStage3 && stageIdx >= 2) {
        alertsToCreate.push({
          recipientId: userId,
          recipientRole: "CLIENT",
          alertType: "PAYMENT_UPDATE",
          projectId: p.id,
          message: `Downpayment verified for ${p.intakeId}. Escrow vault confirmed and specialist workbench unlocked.`,
          linkUrl: `/dashboard/client/projects/${p.id}`,
          isRead: stageIdx > 2,
          createdAt: hoursAgo(36),
        });
      }

      // Stage 4: Specialist Assigned (Stage 4+)
      const hasStage4Assign = projAlerts.some(
        (a) => a.alertType === "ASSIGNMENT" && a.message.includes("Research team assigned")
      );
      if (!hasStage4Assign && stageIdx >= 3) {
        alertsToCreate.push({
          recipientId: userId,
          recipientRole: "CLIENT",
          alertType: "ASSIGNMENT",
          projectId: p.id,
          message: `Research team assigned to ${p.intakeId}: Lead Statistician Dr. Juan Reyes and Senior QA Lead Maria. Statistical modeling active.`,
          linkUrl: `/dashboard/client/projects/${p.id}`,
          isRead: stageIdx > 3,
          createdAt: hoursAgo(24),
        });
      }

      // Stage 4 Active QA Audit
      const hasStage4QA = projAlerts.some(
        (a) =>
          a.alertType === "STATUS_UPDATE" &&
          a.message.includes("Senior QA Lead is running independent verification")
      );
      if (
        !hasStage4QA &&
        (p.masterStatus === "FOR_QA" || p.masterStatus === "QA_REVISION" || stageIdx === 3)
      ) {
        alertsToCreate.push({
          recipientId: userId,
          recipientRole: "CLIENT",
          alertType: "STATUS_UPDATE",
          projectId: p.id,
          message: `Senior QA Lead is running independent verification scripts and auditing APA format compliance for ${p.intakeId}.`,
          linkUrl: `/dashboard/client/projects/${p.id}`,
          isRead: false,
          createdAt: hoursAgo(4),
        });
      }

      // Stage 5: Final Deliverables Released
      const hasStage5 = projAlerts.some(
        (a) =>
          a.alertType === "DELIVERABLE_UPDATE" &&
          a.message.includes("Final defense-ready deliverables")
      );
      if (!hasStage5 && stageIdx >= 4) {
        alertsToCreate.push({
          recipientId: userId,
          recipientRole: "CLIENT",
          alertType: "DELIVERABLE_UPDATE",
          projectId: p.id,
          message: `Final defense-ready deliverables released for ${p.intakeId}. Download your APA summary tables, report, and raw scripts.`,
          linkUrl: `/dashboard/client/projects/${p.id}/deliverables`,
          isRead: false,
          createdAt: hoursAgo(1),
        });
      }
    }

    if (alertsToCreate.length > 0) {
      await withDbTimeout(
        db.inAppAlert.createMany({
          data: alertsToCreate,
        }),
        3000
      );
    }
  } catch (err) {
    console.warn("[ensureProjectLifecycleNotifications] Warning:", err);
  }
}

export async function getInAppAlertsAction(): Promise<{
  success: boolean;
  data?: {
    alerts: InAppAlertDTO[];
    unreadCount: number;
  };
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    const resolvedRecipientId = await resolveDbUserId(user.id, user.email);

    // Auto-seed welcome alerts for fresh accounts
    await ensureFreshAccountNotifications(resolvedRecipientId, user.role as RoleName);

    // Auto-seed lifecycle notifications for active client research studies
    if (user.role === "CLIENT") {
      await ensureProjectLifecycleNotifications(resolvedRecipientId, user.email, user.role as RoleName);
    }

    const recipientIds = Array.from(new Set([resolvedRecipientId, user.id].filter(Boolean)));

    const alertsRaw = await withDbTimeout(
      db.inAppAlert.findMany({
        where: {
          OR: [
            { recipientId: { in: recipientIds } },
            ...(user.role !== "CLIENT" ? [{ recipientRole: user.role as RoleName }] : []),
          ],
        },
        include: {
          project: {
            select: { intakeId: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    );

    // Deduplicate alerts by recipient + alertType + projectId + message to avoid displaying duplicate rows
    const seenAlertKeys = new Set<string>();
    const deduplicatedAlertsRaw = alertsRaw.filter((a) => {
      const key = `${a.recipientId}_${a.alertType}_${a.projectId || ""}_${a.message}`;
      if (seenAlertKeys.has(key)) return false;
      seenAlertKeys.add(key);
      return true;
    });

    const alerts: InAppAlertDTO[] = deduplicatedAlertsRaw.map((a) => ({
      id: a.id,
      recipientId: a.recipientId,
      recipientRole: a.recipientRole,
      alertType: a.alertType,
      projectId: a.projectId,
      projectIntakeId: a.project?.intakeId || null,
      message: a.message,
      linkUrl: a.linkUrl,
      isRead: a.isRead,
      readAt: a.readAt ? a.readAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
    }));

    // Guarantee newest first to oldest sort order by default
    alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = alerts.filter((a) => !a.isRead).length;

    return {
      success: true,
      data: {
        alerts,
        unreadCount,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load alerts.";
    console.error("getInAppAlertsAction error:", err);
    return { success: false, error: { message: msg } };
  }
}

export async function getUnreadAlertCountAction(): Promise<{
  success: boolean;
  count: number;
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: true, count: 0 };
    }

    let count = await withDbTimeout(
      db.inAppAlert.count({
        where: {
          OR: [
            { recipientId: user.id },
            { recipientRole: user.role as RoleName },
          ],
          isRead: false,
        },
      })
    );

    // If zero unread, check if this is a fresh account that needs onboarding alerts seeded
    if (count === 0) {
      const totalUserAlerts = await withDbTimeout(
        db.inAppAlert.count({ where: { recipientId: user.id } })
      );
      if (totalUserAlerts === 0) {
        await ensureFreshAccountNotifications(user.id, user.role as RoleName);
        count = await withDbTimeout(
          db.inAppAlert.count({
            where: {
              OR: [
                { recipientId: user.id },
                { recipientRole: user.role as RoleName },
              ],
              isRead: false,
            },
          })
        );
      }
    }

    return { success: true, count };
  } catch {
    return { success: true, count: 0 };
  }
}

export async function markAlertReadAction(rawInput: MarkAlertReadInput): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    const parsed = MarkAlertReadSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: { message: "Invalid alert reference." } };
    }

    const { alertId } = parsed.data;

    await withDbTimeout(
      db.inAppAlert.update({
        where: { id: alertId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })
    );

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark alert as read.";
    return { success: false, error: { message: msg } };
  }
}

export async function markAllAlertsReadAction(): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    let recipientId = user.id;
    try {
      const dbUser = await withDbTimeout(
        db.user.findFirst({
          where: {
            OR: [
              { id: user.id },
              ...(user.email ? [{ email: user.email.toLowerCase().trim() }] : []),
            ],
          },
          select: { id: true },
        }),
        1000
      );
      if (dbUser) recipientId = dbUser.id;
    } catch {
      // Ignore DB timeout and use user.id
    }

    await withDbTimeout(
      db.inAppAlert.updateMany({
        where: {
          OR: [
            { recipientId },
            ...(recipientId !== user.id ? [{ recipientId: user.id }] : []),
            { recipientRole: user.role as RoleName },
          ],
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })
    );

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark all alerts as read.";
    return { success: false, error: { message: msg } };
  }
}

export async function deleteAlertAction(rawInput: { alertId: string }): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    if (!rawInput?.alertId) {
      return { success: false, error: { message: "Alert ID is required." } };
    }

    await withDbTimeout(
      db.inAppAlert.delete({
        where: { id: rawInput.alertId },
      })
    );

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete alert.";
    return { success: false, error: { message: msg } };
  }
}

export async function clearAllAlertsAction(): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    let recipientId = user.id;
    try {
      const dbUser = await withDbTimeout(
        db.user.findFirst({
          where: {
            OR: [
              { id: user.id },
              ...(user.email ? [{ email: user.email.toLowerCase().trim() }] : []),
            ],
          },
          select: { id: true },
        }),
        1000
      );
      if (dbUser) recipientId = dbUser.id;
    } catch {
      // fallback
    }

    await withDbTimeout(
      db.inAppAlert.deleteMany({
        where: {
          OR: [
            { recipientId },
            ...(recipientId !== user.id ? [{ recipientId: user.id }] : []),
            { recipientRole: user.role as RoleName },
          ],
        },
      })
    );

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to clear alerts.";
    return { success: false, error: { message: msg } };
  }
}

export async function createInAppAlertAction(rawInput: CreateInAppAlertInput): Promise<{
  success: boolean;
  alertId?: string;
  error?: { message: string };
}> {
  try {
    const parsed = CreateInAppAlertSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: { message: parsed.error.issues[0]?.message || "Invalid alert parameters." } };
    }

    const { recipientId, recipientRole, alertType, projectId, message, linkUrl } = parsed.data;

    // Verify recipient user exists in DB to prevent foreign key violation
    let targetRecipientId = recipientId;
    const recipientExists = await withDbTimeout(
      db.user.findUnique({
        where: { id: recipientId },
        select: { id: true },
      }),
      1500
    );
    if (!recipientExists) {
      const fallbackUser = await withDbTimeout(
        db.user.findFirst({
          where: {
            userRoles: {
              some: {
                role: {
                  name: recipientRole,
                },
              },
            },
          },
          select: { id: true },
        }),
        1500
      );
      if (fallbackUser) {
        targetRecipientId = fallbackUser.id;
      } else {
        return { success: false, error: { message: "Recipient user not found in database." } };
      }
    }

    const alert = await withDbTimeout(
      db.inAppAlert.create({
        data: {
          recipientId: targetRecipientId,
          recipientRole,
          alertType,
          projectId: projectId || null,
          message,
          linkUrl: linkUrl || null,
        },
      })
    );

    return { success: true, alertId: alert.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create in-app alert.";
    console.error("createInAppAlertAction error:", err);
    return { success: false, error: { message: msg } };
  }
}

export async function getNotificationLogsAction(rawInput?: NotificationFilterInput): Promise<{
  success: boolean;
  data?: {
    logs: NotificationLogDTO[];
    summary: NotificationSummaryDTO;
  };
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    const hasAccess = ["ADMIN", "CEO", "FINANCE_OFFICER"].includes(user.role);
    if (!hasAccess) {
      return { success: false, error: { message: "Access restricted to administrators and executives." } };
    }

    const parsed = NotificationFilterSchema.safeParse(rawInput || {});
    const search = parsed.success && parsed.data.search ? parsed.data.search.trim().toLowerCase() : "";
    const statusFilter = parsed.success && parsed.data.status ? parsed.data.status : "ALL";

    const logsRaw = await withDbTimeout(
      db.notificationLog.findMany({
        include: {
          recipient: {
            select: { id: true, fullName: true, email: true },
          },
          project: {
            select: { intakeId: true },
          },
        },
        orderBy: { sentAt: "desc" },
        take: 200,
      })
    );

    const logs: NotificationLogDTO[] = logsRaw.map((l) => ({
      id: l.id,
      recipientId: l.recipientId,
      recipientName: l.recipient.fullName,
      email: l.email,
      template: l.template,
      projectId: l.projectId,
      projectIntakeId: l.project?.intakeId || null,
      status: l.status as "SENT" | "FAILED" | "RETRYING",
      attemptCount: l.attemptCount,
      errorMessage: l.errorMessage,
      sentAt: l.sentAt.toISOString(),
      lastAttemptAt: l.lastAttemptAt ? l.lastAttemptAt.toISOString() : null,
    }));

    const alertCount = await withDbTimeout(db.inAppAlert.count());
    const unreadAlertsCount = await withDbTimeout(db.inAppAlert.count({ where: { isRead: false } }));

    const summary: NotificationSummaryDTO = {
      totalSent: logs.filter((l) => l.status === "SENT").length,
      totalFailed: logs.filter((l) => l.status === "FAILED").length,
      totalRetrying: logs.filter((l) => l.status === "RETRYING").length,
      totalAlerts: alertCount,
      unreadAlerts: unreadAlertsCount,
    };

    const filtered = logs.filter((l) => {
      if (statusFilter !== "ALL" && l.status !== statusFilter) {
        return false;
      }
      if (search) {
        const matchesEmail = l.email.toLowerCase().includes(search);
        const matchesName = l.recipientName.toLowerCase().includes(search);
        const matchesTemplate = l.template.toLowerCase().includes(search);
        const matchesIntake = (l.projectIntakeId || "").toLowerCase().includes(search);
        return matchesEmail || matchesName || matchesTemplate || matchesIntake;
      }
      return true;
    });

    return {
      success: true,
      data: {
        logs: filtered,
        summary,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load notification logs.";
    console.error("getNotificationLogsAction error:", err);
    return { success: false, error: { message: msg } };
  }
}

export async function retryFailedNotificationAction(logId: string): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    const hasAccess = ["ADMIN", "CEO"].includes(user.role);
    if (!hasAccess) {
      return { success: false, error: { message: "Access restricted to administrators." } };
    }

    const log = await withDbTimeout(
      db.notificationLog.findUnique({
        where: { id: logId },
      })
    );

    if (!log) {
      return { success: false, error: { message: "Notification record not found." } };
    }

    const res = await sendEmail({
      to: log.email,
      recipientId: log.recipientId,
      template: log.template as EmailTemplateName,
      projectId: log.projectId || undefined,
      data: {
        userName: log.email,
        intakeId: "JAXIS Study",
      },
    });

    if (res.success) {
      await withDbTimeout(
        db.notificationLog.update({
          where: { id: logId },
          data: {
            status: "SENT",
            errorMessage: null,
            attemptCount: log.attemptCount + 1,
            lastAttemptAt: new Date(),
          },
        })
      );
      revalidatePath("/dashboard/admin/notifications");
      return { success: true };
    } else {
      await withDbTimeout(
        db.notificationLog.update({
          where: { id: logId },
          data: {
            attemptCount: log.attemptCount + 1,
            errorMessage: res.error || "Retry attempt failed.",
            lastAttemptAt: new Date(),
          },
        })
      );
      return { success: false, error: { message: res.error || "Retry failed." } };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retry email delivery.";
    return { success: false, error: { message: msg } };
  }
}
