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

    const recipientId = user.id;

    const alertsRaw = await withDbTimeout(
      db.inAppAlert.findMany({
        where: {
          OR: [
            { recipientId },
            { recipientRole: user.role as RoleName },
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

    const count = await withDbTimeout(
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
            { recipientRole: user.role as any },
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
      template: log.template as any,
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
