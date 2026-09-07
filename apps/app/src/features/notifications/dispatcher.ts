import { db, withDbTimeout } from "@/lib/db";
import { notificationBus } from "@/lib/notifications/event-bus";
import type { RoleName } from "@prisma/client";
import type { InAppAlertDTO } from "./schemas";

export type NotificationEventType =
  | "STATUS_UPDATE"
  | "NEW_INTAKE"
  | "INPUT_UPDATE"
  | "OUTPUT_UPDATE"
  | "QA_DECISION"
  | "ASSIGNMENT"
  | "COMMERCIAL_UPDATE"
  | "PAYMENT_UPDATE"
  | "DELIVERABLE_UPDATE"
  | "REVISION_REQUEST"
  | "DISPUTE"
  | "DATA_PURGE"
  | "SYSTEM_ALERT";

export interface DispatchRealtimeNotificationOptions {
  eventType: NotificationEventType;
  projectId?: string;
  intakeId?: string;
  title: string;
  message: string;
  linkUrl?: string;
  targetRoles?: RoleName[];
  targetUserIds?: string[];
  includeProjectParties?: boolean; // automatically resolves client, assigned specialist, and QA lead
  excludeUserId?: string; // exclude actor from receiving self-notifications
}

/**
 * Maps standard route targets according to user role and event type
 */
function getRoleSpecificLink(
  role: RoleName,
  projectId?: string,
  defaultUrl?: string,
  eventType?: NotificationEventType
): string {
  if (defaultUrl) return defaultUrl;

  if (eventType === "DISPUTE") {
    switch (role) {
      case "CLIENT":
        return "/dashboard/client/disputes";
      case "ADMIN":
        return "/dashboard/admin/disputes";
      case "FINANCE_OFFICER":
        return "/dashboard/finance/disputes";
      case "CEO":
        return "/dashboard/ceo/disputes";
      case "STATISTICIAN":
        return projectId ? `/dashboard/statistician/projects/${projectId}` : "/dashboard/statistician";
      default:
        return "/dashboard";
    }
  }

  if (eventType === "DELIVERABLE_UPDATE" && projectId) {
    switch (role) {
      case "CLIENT":
        return `/dashboard/client/projects/${projectId}/deliverables`;
      case "STATISTICIAN":
        return `/dashboard/statistician/projects/${projectId}/workbench`;
      case "SENIOR_QA_LEAD":
        return `/dashboard/qa/projects/${projectId}/files`;
      case "ADMIN":
        return `/dashboard/admin/projects/${projectId}/deliverables`;
      case "FINANCE_OFFICER":
        return "/dashboard/finance";
      case "CEO":
        return "/dashboard/ceo";
      default:
        return "/dashboard";
    }
  }

  if (eventType === "REVISION_REQUEST" && projectId) {
    switch (role) {
      case "CLIENT":
        return `/dashboard/client/projects/${projectId}/revision`;
      case "STATISTICIAN":
        return `/dashboard/statistician/projects/${projectId}/workbench`;
      case "SENIOR_QA_LEAD":
        return `/dashboard/qa/projects/${projectId}`;
      case "ADMIN":
        return `/dashboard/admin/projects/${projectId}/deliverables`;
      default:
        return "/dashboard";
    }
  }

  if (!projectId) {
    switch (role) {
      case "CLIENT":
        return "/dashboard/client";
      case "STATISTICIAN":
        return "/dashboard/statistician";
      case "SENIOR_QA_LEAD":
        return "/dashboard/qa";
      case "ADMIN":
        return "/dashboard/admin/intake";
      case "CEO":
        return "/dashboard/ceo";
      case "FINANCE_OFFICER":
        return "/dashboard/finance";
      default:
        return "/dashboard";
    }
  }

  switch (role) {
    case "CLIENT":
      return `/dashboard/client/projects/${projectId}`;
    case "STATISTICIAN":
      return `/dashboard/statistician/projects/${projectId}`;
    case "SENIOR_QA_LEAD":
      return `/dashboard/qa/projects/${projectId}`;
    case "ADMIN":
      return `/dashboard/admin/projects/${projectId}`;
    case "CEO":
      return `/dashboard/ceo`;
    case "FINANCE_OFFICER":
      return `/dashboard/finance`;
    default:
      return `/dashboard`;
  }
}

/**
 * Dispatches an in-app alert both to PostgreSQL for persistence
 * and in real time across the SSE notification event bus.
 */
export async function dispatchRealtimeNotification(
  options: DispatchRealtimeNotificationOptions
): Promise<{ success: boolean; count: number }> {
  try {
    const {
      eventType,
      projectId,
      intakeId,
      title,
      message,
      linkUrl,
      targetRoles = [],
      targetUserIds = [],
      includeProjectParties = false,
      excludeUserId,
    } = options;

    interface RecipientTarget {
      userId: string;
      role: RoleName;
    }

    const recipientsMap = new Map<string, RecipientTarget>();

    // 1. Explicit target user IDs
    for (const uId of targetUserIds) {
      if (uId && uId !== excludeUserId) {
        try {
          const user = await withDbTimeout(
            db.user.findUnique({
              where: { id: uId },
              select: {
                id: true,
                userRoles: { select: { role: { select: { name: true } } } },
              },
            }),
            1000
          );
          if (user) {
            const role = (user.userRoles[0]?.role.name || "CLIENT") as RoleName;
            recipientsMap.set(user.id, { userId: user.id, role });
          }
        } catch {
          // ignore lookup errors
        }
      }
    }

    // 2. Resolve project parties (Client, assigned Statistician, assigned QA Lead)
    let projectDisplayIntakeId = intakeId || null;
    if (projectId) {
      try {
        const project = await withDbTimeout(
          db.project.findFirst({
            where: { OR: [{ id: projectId }, { intakeId: projectId }] },
            select: {
              id: true,
              intakeId: true,
              clientId: true,
              client: {
                select: {
                  id: true,
                  userRoles: { select: { role: { select: { name: true } } } },
                },
              },
              assignment: {
                select: {
                  statisticianId: true,
                  qaLeadId: true,
                },
              },
            },
          }),
          1500
        );

        if (project) {
          projectDisplayIntakeId = project.intakeId;

          if (includeProjectParties) {
            // Client
            if (project.client && project.client.id !== excludeUserId) {
              recipientsMap.set(project.client.id, {
                userId: project.client.id,
                role: "CLIENT",
              });
            }

            // Assigned Statistician
            if (
              project.assignment?.statisticianId &&
              project.assignment.statisticianId !== excludeUserId
            ) {
              recipientsMap.set(project.assignment.statisticianId, {
                userId: project.assignment.statisticianId,
                role: "STATISTICIAN",
              });
            }

            // Assigned QA Lead
            if (
              project.assignment?.qaLeadId &&
              project.assignment.qaLeadId !== excludeUserId
            ) {
              recipientsMap.set(project.assignment.qaLeadId, {
                userId: project.assignment.qaLeadId,
                role: "SENIOR_QA_LEAD",
              });
            }
          }
        }
      } catch (err) {
        console.warn("[dispatchRealtimeNotification] Project parties resolution skipped:", err);
      }
    }

    // 3. Resolve target roles (e.g. all ADMINs, all CEOs, all FINANCE_OFFICERs)
    if (targetRoles.length > 0) {
      try {
        const roleUsers = await withDbTimeout(
          db.user.findMany({
            where: {
              userRoles: {
                some: {
                  role: {
                    name: { in: targetRoles },
                  },
                },
              },
            },
            select: {
              id: true,
              userRoles: { select: { role: { select: { name: true } } } },
            },
          }),
          1500
        );

        for (const u of roleUsers) {
          if (u.id !== excludeUserId) {
            const role = (u.userRoles[0]?.role.name || targetRoles[0]) as RoleName;
            recipientsMap.set(u.id, { userId: u.id, role });
          }
        }
      } catch (err) {
        console.warn("[dispatchRealtimeNotification] Role users lookup skipped:", err);
      }
    }

    // Fallback: If no recipients were found but target roles exist (e.g. test environments)
    if (recipientsMap.size === 0 && targetRoles.length > 0) {
      try {
        const fallback = await withDbTimeout(
          db.user.findFirst({
            where: {
              OR: [{ email: "admin@jaxis.dev" }, { email: { contains: "admin" } }],
            },
            select: { id: true },
          }),
          1000
        );
        if (fallback && fallback.id !== excludeUserId) {
          recipientsMap.set(fallback.id, { userId: fallback.id, role: targetRoles[0] || "ADMIN" });
        }
      } catch {
        // ignore
      }
    }

    let createdCount = 0;

    // 4. Persist in database & broadcast across SSE stream
    for (const recipient of Array.from(recipientsMap.values())) {
      const targetLink = getRoleSpecificLink(recipient.role, projectId, linkUrl, eventType);

      let alertRecordId = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      try {
        const saved = await withDbTimeout(
          db.inAppAlert.create({
            data: {
              recipientId: recipient.userId,
              recipientRole: recipient.role,
              alertType: eventType,
              projectId: projectId || null,
              message,
              linkUrl: targetLink,
              isRead: false,
            },
          }),
          1500
        );
        if (saved) alertRecordId = saved.id;
      } catch (dbErr) {
        console.warn("[dispatchRealtimeNotification] DB save skipped, broadcasting in-memory:", dbErr);
      }

      const dto: InAppAlertDTO = {
        id: alertRecordId,
        recipientId: recipient.userId,
        recipientRole: recipient.role,
        alertType: eventType,
        projectId: projectId || null,
        projectIntakeId: projectDisplayIntakeId,
        message,
        linkUrl: targetLink,
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      };

      // Broadcast in real-time across SSE to connected browsers
      notificationBus.broadcast({
        alert: dto,
        title,
        targetUserIds: [recipient.userId],
        targetRoles: [recipient.role],
      });

      createdCount++;
    }

    return { success: true, count: createdCount };
  } catch (err) {
    console.error("[dispatchRealtimeNotification] Fatal error:", err);
    return { success: false, count: 0 };
  }
}
