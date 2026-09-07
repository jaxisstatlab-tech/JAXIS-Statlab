"use server";

import { db, withDbTimeout } from "@/lib/db";
import { auth, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { RoleName, Prisma } from "@prisma/client";
import { runFirewall, getFirewallWarningMessage } from "@/lib/messaging/firewall";
import {
  SendMessageSchema,
  ReviewBlockedMessageSchema,
  FilterBlockedMessagesSchema,
  type SendMessageInput,
  type ReviewBlockedMessageInput,
  type FilterBlockedMessagesInput,
  type MessageDTO,
  type BlockedMessageLogDTO,
  type ProjectThreadSummaryDTO,
  type MessagingActionResult,
} from "./schemas";

/**
 * 1. Send a new message in a project communication thread.
 * Runs server-side communication firewall before saving.
 * If prohibited contact info is found, the message is blocked and logged into BlockedMessageLog.
 */
export async function sendMessage(
  rawInput: SendMessageInput
): Promise<MessagingActionResult<MessageDTO>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in to send messages." },
    };
  }

  const parsed = SendMessageSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid message parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { projectId, content } = parsed.data;
  const callerRole = (session.user as { role?: RoleName }).role || "CLIENT";

  try {
    return await withDbTimeout((async () => {
      // 1. Resolve User and Project Access
      let user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, fullName: true },
      });
      if (!user && session.user.email) {
        user = await db.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, fullName: true },
        });
      }

      if (!user) {
        return {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User profile record could not be resolved." },
        };
      }

      const project = await db.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          clientId: true,
          assignment: {
            select: {
              statisticianId: true,
              qaLeadId: true,
            },
          },
        },
      });

      if (!project) {
        return {
          success: false,
          error: { code: "PROJECT_NOT_FOUND", message: "Research study project not found." },
        };
      }

      // Authorization: Client, assigned Statistician, QA Lead, or Management (Admin, CEO)
      const isClient = project.clientId === user.id;
      const isStatistician = project.assignment?.statisticianId === user.id;
      const isQaLead = project.assignment?.qaLeadId === user.id;
      const isManager = callerRole === "ADMIN" || callerRole === "CEO";

      if (!isClient && !isStatistician && !isQaLead && !isManager) {
        return {
          success: false,
          error: { code: "FORBIDDEN", message: "You do not have access to this study's messaging thread." },
        };
      }

      // Check if team is assigned for clients
      if (isClient && (!project.assignment || (!project.assignment.statisticianId && !project.assignment.qaLeadId))) {
        return {
          success: false,
          error: {
            code: "THREAD_LOCKED",
            message: "Consultation channel is locked until an administrator assigns your Lead Statistician and QA Lead.",
          },
        };
      }

      // 2. Execute Communication Firewall Inspection
      const firewallResult = runFirewall(content);

      if (firewallResult.blocked) {
        const { ruleName, matchedText } = firewallResult.detection;
        const warning = getFirewallWarningMessage(ruleName);

        // Persist blocked message and audit log
        await db.message.create({
          data: {
            projectId: project.id,
            senderId: user.id,
            senderRole: callerRole,
            content,
            isBlocked: true,
            blockedReason: ruleName,
            blockedLog: {
              create: {
                detectedPattern: ruleName,
                matchedText,
              },
            },
          },
        });

        return {
          success: false,
          blocked: true,
          warning,
          error: {
            code: "FIREWALL_BLOCKED",
            message: warning,
          },
        };
      }

      // 3. Normal Clean Message Delivery
      const newMsg = await db.message.create({
        data: {
          projectId: project.id,
          senderId: user.id,
          senderRole: callerRole,
          content: content.trim(),
          isBlocked: false,
          readReceipts: {
            create: {
              userId: user.id,
            },
          },
        },
      });

      const messageDTO: MessageDTO = {
        id: newMsg.id,
        projectId: project.id,
        senderId: user.id,
        senderName: user.fullName,
        senderRole: callerRole,
        content: newMsg.content,
        isBlocked: false,
        blockedReason: null,
        sentAt: newMsg.sentAt.toISOString(),
        isMine: true,
        isRead: true,
        readByCount: 1,
      };

      // Server-side broadcast push to Supabase Realtime REST API (WhatsApp/Telegram event model)
      try {
        const { supabaseUrl, supabaseServiceRoleKey } = await import("@/lib/supabase");
        if (supabaseUrl && supabaseServiceRoleKey) {
          fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
            method: "POST",
            headers: {
              apikey: supabaseServiceRoleKey,
              Authorization: `Bearer ${supabaseServiceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: [
                {
                  topic: `project-messages:${project.id}`,
                  event: "new_message",
                  payload: messageDTO,
                },
              ],
            }),
            signal: AbortSignal.timeout(2000),
          }).catch((fetchErr) => {
            console.warn("[Realtime Server REST Broadcast Warning]", fetchErr);
          });
        }
      } catch (err) {
        // Non-blocking fallback
        console.warn("[Realtime Broadcast Error]", err);
      }

      return {
        success: true,
        data: messageDTO,
      };
    })());
  } catch (err: unknown) {
    console.error("[sendMessage] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}

/**
 * Fast Delta Sync: Retrieves only messages sent after `sinceIso` for a project thread.
 * Highly optimized index query to prevent server database overload (Messenger/Telegram delta model).
 */
export async function syncNewMessages(
  projectId: string,
  sinceIso: string
): Promise<MessagingActionResult<MessageDTO[]>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in to sync messages." },
    };
  }

  try {
    return await withDbTimeout((async () => {
      const sinceDate = new Date(sinceIso);
      if (isNaN(sinceDate.getTime())) {
        return { success: true, data: [] };
      }

      let user = await db.user.findUnique({
        where: { id: session.user.id },
      });
      if (!user && session.user.email) {
        user = await db.user.findUnique({
          where: { email: session.user.email },
        });
      }

      // Quick index-targeted delta lookup (Only clean delivered messages)
      const rawMessages = await db.message.findMany({
        where: {
          projectId,
          sentAt: { gt: sinceDate },
          isBlocked: false,
        },
        include: {
          sender: {
            select: { id: true, fullName: true, email: true },
          },
          readReceipts: true,
        },
        orderBy: { sentAt: "asc" },
        take: 50,
      });

      if (rawMessages.length === 0) {
        return { success: true, data: [] };
      }

      // Mark delivered unread messages as read for this caller
      if (user) {
        const unreadMsgIds = rawMessages
          .filter((m) => !m.readReceipts.some((r) => r.userId === user.id))
          .map((m) => m.id);

        if (unreadMsgIds.length > 0) {
          try {
            await db.messageReadReceipt.createMany({
              data: unreadMsgIds.map((mId) => ({
                messageId: mId,
                userId: user.id,
              })),
              skipDuplicates: true,
            });
          } catch {
            // ignore
          }
        }
      }

      const messages: MessageDTO[] = rawMessages.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        senderId: m.senderId,
        senderName: m.sender.fullName,
        senderRole: m.senderRole,
        content: m.content,
        isBlocked: m.isBlocked,
        blockedReason: m.blockedReason,
        sentAt: m.sentAt.toISOString(),
        isMine: Boolean(user && m.senderId === user.id),
        isRead: Boolean(user && m.readReceipts.some((r) => r.userId === user.id)),
        readByCount: m.readReceipts.length,
      }));

      return {
        success: true,
        data: messages,
      };
    })());
  } catch (err: unknown) {
    console.error("[syncNewMessages] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}

/**
 * 2. Retrieve chronological messages for a project thread with reverse cursor pagination.
 * Automatically marks all delivered messages as read for the caller.
 */
export async function getProjectMessages(
  projectId: string,
  options?: {
    cursor?: string;
    limit?: number;
  }
): Promise<
  MessagingActionResult<{
    project: {
      id: string;
      intakeId: string;
      researchTitle: string;
      masterStatus: string;
      clientName: string;
      statisticianName: string | null;
      qaLeadName: string | null;
    };
    messages: MessageDTO[];
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number;
    currentUserId?: string | null;
  }>
> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in to view messages." },
    };
  }

  const callerRole = (session.user as { role?: RoleName }).role || "CLIENT";
  const userId = session.user.id;
  const limit = options?.limit ?? 20;

  try {
    return await withDbTimeout((async () => {
      // If cursor is provided, find that message's timestamp to load older messages
      let cursorFilter: Prisma.MessageWhereInput = {};
      if (options?.cursor) {
        const cursorMsg = await db.message.findUnique({
          where: { id: options.cursor },
          select: { sentAt: true },
        });
        if (cursorMsg) {
          cursorFilter = {
            sentAt: { lt: cursorMsg.sentAt },
          };
        }
      }

      const baseFilter: Prisma.MessageWhereInput = {
        projectId,
        isBlocked: false,
      };

      // Run project verification, message count, and messages query ALL IN PARALLEL
      const [project, totalCount, rawMessagesDesc] = await Promise.all([
        db.project.findUnique({
          where: { id: projectId },
          select: {
            id: true,
            intakeId: true,
            researchTitle: true,
            masterStatus: true,
            clientId: true,
            client: {
              select: { id: true, fullName: true },
            },
            assignment: {
              select: {
                statisticianId: true,
                qaLeadId: true,
                statistician: { select: { id: true, fullName: true } },
                qaLead: { select: { id: true, fullName: true } },
              },
            },
          },
        }),
        db.message.count({
          where: baseFilter,
        }),
        db.message.findMany({
          where: {
            AND: [baseFilter, cursorFilter],
          },
          select: {
            id: true,
            projectId: true,
            senderId: true,
            senderRole: true,
            content: true,
            isBlocked: true,
            blockedReason: true,
            sentAt: true,
            sender: {
              select: { id: true, fullName: true, email: true },
            },
            readReceipts: {
              select: { userId: true },
            },
          },
          orderBy: { sentAt: "desc" },
          take: limit + 1,
        }),
      ]);

      if (!project) {
        return {
          success: false,
          error: { code: "PROJECT_NOT_FOUND", message: "Project not found." },
        };
      }

      const isClient = project.clientId === userId;
      const isStatistician = project.assignment?.statisticianId === userId;
      const isQaLead = project.assignment?.qaLeadId === userId;
      const isManager = callerRole === "ADMIN" || callerRole === "CEO";

      if (!isClient && !isStatistician && !isQaLead && !isManager) {
        return {
          success: false,
          error: { code: "FORBIDDEN", message: "You do not have access to this study's thread." },
        };
      }

      const hasMore = rawMessagesDesc.length > limit;
      const paginatedRawDesc = hasMore ? rawMessagesDesc.slice(0, limit) : rawMessagesDesc;
      const nextCursor = hasMore ? (paginatedRawDesc[paginatedRawDesc.length - 1]?.id ?? null) : null;

      // Reverse to chronological order [oldest -> newest]
      const chronological = [...paginatedRawDesc].reverse();

      // Mark unread messages as read non-blocking in the background
      const unreadMsgIds = chronological
        .filter((m) => !m.readReceipts.some((r) => r.userId === userId))
        .map((m) => m.id);

      if (unreadMsgIds.length > 0 && userId) {
        db.messageReadReceipt
          .createMany({
            data: unreadMsgIds.map((mId) => ({
              messageId: mId,
              userId,
            })),
            skipDuplicates: true,
          })
          .catch((e) => console.warn("[getProjectMessages] Background receipt write err:", e));
      }

      const messages: MessageDTO[] = chronological.map((m) => {
        const isMine = Boolean(userId && m.senderId === userId);
        const isReadByMe = Boolean(userId && m.readReceipts.some((r) => r.userId === userId));

        return {
          id: m.id,
          projectId: m.projectId,
          senderId: m.senderId,
          senderName: m.sender.fullName,
          senderRole: m.senderRole,
          content: m.content,
          isBlocked: m.isBlocked,
          blockedReason: m.blockedReason,
          sentAt: m.sentAt.toISOString(),
          isMine,
          isRead: isReadByMe,
          readByCount: m.readReceipts.length,
        };
      });

      return {
        success: true,
        data: {
          project: {
            id: project.id,
            intakeId: project.intakeId,
            researchTitle: project.researchTitle,
            masterStatus: project.masterStatus,
            clientName: project.client.fullName,
            statisticianName: project.assignment?.statistician?.fullName || null,
            qaLeadName: project.assignment?.qaLead?.fullName || null,
          },
          messages,
          hasMore,
          nextCursor,
          totalCount,
          currentUserId: userId || null,
        },
      };
    })());
  } catch (err: unknown) {
    console.error("[getProjectMessages] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}

/**
 * 3. Retrieve all project messaging threads accessible to the current user.
 */
export async function getMyProjectThreads(): Promise<
  MessagingActionResult<ProjectThreadSummaryDTO[]>
> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in to view threads." },
    };
  }

  const callerRole = (session.user as { role?: RoleName }).role || "CLIENT";
  const userId = session.user.id;

  try {
    return await withDbTimeout((async () => {
      // Filter accessible projects depending on role
      let projectsWhere: Prisma.ProjectWhereInput = {};
      if (callerRole === "CLIENT") {
        projectsWhere = { clientId: userId };
      } else if (callerRole === "STATISTICIAN") {
        projectsWhere = { assignment: { statisticianId: userId } };
      } else if (callerRole === "SENIOR_QA_LEAD") {
        projectsWhere = { assignment: { qaLeadId: userId } };
      } else {
        // ADMIN or CEO sees all active projects
        projectsWhere = {};
      }

      const projects = await db.project.findMany({
        where: projectsWhere,
        include: {
          client: true,
          assignment: {
            include: {
              statistician: true,
              qaLead: true,
            },
          },
          messages: {
            where: { isBlocked: false },
            take: 1,
            orderBy: { sentAt: "desc" },
            include: {
              sender: { select: { fullName: true } },
              readReceipts: {
                where: { userId },
              },
            },
          },
          _count: {
            select: {
              messages: {
                where: { isBlocked: false },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const summaries: ProjectThreadSummaryDTO[] = projects.map((p) => {
        const lastMsg = p.messages[0];
        const hasUnreadLastMsg = Boolean(
          lastMsg && lastMsg.senderId !== userId && lastMsg.readReceipts.length === 0
        );

        return {
          projectId: p.id,
          intakeId: p.intakeId,
          researchTitle: p.researchTitle,
          masterStatus: p.masterStatus,
          packageName: p.packageName,
          clientName: p.client.fullName,
          statisticianName: p.assignment?.statistician?.fullName || null,
          qaLeadName: p.assignment?.qaLead?.fullName || null,
          lastMessage: lastMsg
            ? {
                content: lastMsg.content,
                sentAt: lastMsg.sentAt.toISOString(),
                senderName: lastMsg.sender.fullName,
                senderRole: lastMsg.senderRole,
              }
            : null,
          unreadCount: hasUnreadLastMsg ? 1 : 0,
          totalMessagesCount: p._count.messages,
        };
      });

      return { success: true, data: summaries };
    })());
  } catch (err: unknown) {
    console.error("[getMyProjectThreads] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}

/**
 * 4. Retrieve all blocked messages across projects for Admin & CEO review.
 */
export async function getBlockedMessages(
  rawInput?: FilterBlockedMessagesInput
): Promise<
  MessagingActionResult<{
    logs: BlockedMessageLogDTO[];
    totalCount: number;
    pendingCount: number;
    reviewedCount: number;
  }>
> {
  await requireRole("ADMIN", "CEO");

  const parsed = FilterBlockedMessagesSchema.safeParse(rawInput || {});
  const { search, category, reviewedStatus, page = 1, pageSize = 20 } = parsed.success
    ? parsed.data
    : { search: "", category: "ALL", reviewedStatus: "ALL", page: 1, pageSize: 20 };

  try {
    return await withDbTimeout((async () => {
      // Build Prisma where query
      const where: Prisma.BlockedMessageLogWhereInput = {};

      if (reviewedStatus === "PENDING_REVIEW") {
        where.reviewedAt = null;
      } else if (reviewedStatus === "REVIEWED") {
        where.reviewedAt = { not: null };
      }

      if (category && category !== "ALL") {
        // Map category to pattern prefix
        if (category === "EMAIL") where.detectedPattern = "EMAIL_ADDRESS";
        else if (category === "PHONE") where.detectedPattern = "PH_MOBILE";
        else if (category === "PAYMENT") where.detectedPattern = "E_WALLET_PAYMENT";
        else if (category === "MESSENGER") where.detectedPattern = "MESSAGING_APP";
        else if (category === "SOCIAL") where.detectedPattern = { in: ["SOCIAL_PLATFORM", "SOCIAL_HANDLE"] };
        else if (category === "URL") where.detectedPattern = { in: ["EXTERNAL_URL", "WWW_URL"] };
      }

      if (search && search.trim()) {
        const query = search.trim();
        where.OR = [
          { matchedText: { contains: query, mode: "insensitive" } },
          { message: { content: { contains: query, mode: "insensitive" } } },
          { message: { sender: { fullName: { contains: query, mode: "insensitive" } } } },
          { message: { sender: { email: { contains: query, mode: "insensitive" } } } },
          { message: { project: { intakeId: { contains: query, mode: "insensitive" } } } },
          { message: { project: { researchTitle: { contains: query, mode: "insensitive" } } } },
        ];
      }

      const [rawLogs, totalCount, pendingCount, reviewedCount] = await Promise.all([
        db.blockedMessageLog.findMany({
          where,
          include: {
            reviewer: { select: { fullName: true } },
            message: {
              include: {
                sender: { select: { id: true, fullName: true, email: true } },
                project: { select: { id: true, intakeId: true, researchTitle: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.blockedMessageLog.count({ where }),
        db.blockedMessageLog.count({ where: { reviewedAt: null } }),
        db.blockedMessageLog.count({ where: { reviewedAt: { not: null } } }),
      ]);

      const logs: BlockedMessageLogDTO[] = rawLogs.map((l) => ({
        id: l.id,
        messageId: l.messageId,
        projectId: l.message.project.id,
        projectTitle: l.message.project.researchTitle,
        intakeId: l.message.project.intakeId,
        senderId: l.message.sender.id,
        senderName: l.message.sender.fullName,
        senderEmail: l.message.sender.email,
        senderRole: l.message.senderRole,
        content: l.message.content,
        detectedPattern: l.detectedPattern,
        matchedText: l.matchedText,
        reviewedBy: l.reviewedBy,
        reviewerName: l.reviewer?.fullName || null,
        reviewedAt: l.reviewedAt ? l.reviewedAt.toISOString() : null,
        reviewNotes: l.reviewNotes,
        createdAt: l.createdAt.toISOString(),
      }));

      return {
        success: true,
        data: {
          logs,
          totalCount,
          pendingCount,
          reviewedCount,
        },
      };
    })());
  } catch (err: unknown) {
    console.error("[getBlockedMessages] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}

/**
 * 5. Mark a flagged blocked message log as reviewed by Admin/CEO.
 */
export async function reviewBlockedMessage(
  rawInput: ReviewBlockedMessageInput
): Promise<MessagingActionResult<{ id: string; reviewedAt: string }>> {
  const session = await requireRole("ADMIN", "CEO");

  const parsed = ReviewBlockedMessageSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid review parameters." },
    };
  }

  const { logId, reviewNotes } = parsed.data;

  try {
    return await withDbTimeout((async () => {
      let user = await db.user.findUnique({
        where: { id: session.user.id },
      });
      if (!user && session.user.email) {
        user = await db.user.findUnique({
          where: { email: session.user.email },
        });
      }

      const updated = await db.blockedMessageLog.update({
        where: { id: logId },
        data: {
          reviewedBy: user?.id || session.user.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes?.trim() || null,
        },
      });

      revalidatePath("/dashboard/admin/messages");

      return {
        success: true,
        data: {
          id: updated.id,
          reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : new Date().toISOString(),
        },
      };
    })());
  } catch (err: unknown) {
    console.error("[reviewBlockedMessage] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}
