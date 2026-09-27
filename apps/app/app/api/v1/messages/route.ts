import { NextRequest, NextResponse } from "next/server";
import { db, withDbTimeout } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { RoleName } from "@prisma/client";
import { runFirewall, getFirewallWarningMessage } from "@/lib/messaging/firewall";
import {
  SendMessageSchema,
  type MessageDTO,
  type MessagingActionResult,
} from "@/features/messaging/schemas";
import { syncNewMessages } from "@/features/messaging/actions";
import { devMessagingEnabled, devSendMessage } from "@/features/messaging/dev-store";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";

interface CachedProjectAuth {
  id: string;
  clientId: string;
  statisticianId?: string | null;
  qaLeadId?: string | null;
  cachedAt: number;
}

const projectAuthCache = new Map<string, CachedProjectAuth>();

export async function POST(
  request: NextRequest
): Promise<NextResponse<MessagingActionResult<MessageDTO>>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "You must be logged in to send messages." },
      },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "Invalid JSON body." },
      },
      { status: 400 }
    );
  }

  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid message parameters.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 }
    );
  }

  const { projectId, content } = parsed.data;
  const callerRole = (session.user as { role?: RoleName }).role || "CLIENT";
  const userId = session.user.id;
  const userName =
    (session.user as { fullName?: string; name?: string }).fullName ||
    session.user.name ||
    "User";

  try {
    return await withDbTimeout((async () => {
      // 1. Resolve project and access rights (cached in-memory for 2 minutes to skip 800ms DB latency)
      let project = projectAuthCache.get(projectId);
      if (!project || Date.now() - project.cachedAt > 120_000) {
        const dbProject = await db.project.findUnique({
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

        if (!dbProject) {
          return NextResponse.json(
            {
              success: false,
              error: { code: "PROJECT_NOT_FOUND", message: "Research study project not found." },
            },
            { status: 404 }
          );
        }

        project = {
          id: dbProject.id,
          clientId: dbProject.clientId,
          statisticianId: dbProject.assignment?.statisticianId || null,
          qaLeadId: dbProject.assignment?.qaLeadId || null,
          cachedAt: Date.now(),
        };
        projectAuthCache.set(projectId, project);
      }

      const isClient = project.clientId === userId;
      const isStatistician = project.statisticianId === userId;
      const isQaLead = project.qaLeadId === userId;
      const isManager = callerRole === "ADMIN" || callerRole === "CEO";

      if (!isClient && !isStatistician && !isQaLead && !isManager) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "FORBIDDEN", message: "You do not have access to this study's messaging thread." },
          },
          { status: 403 }
        );
      }

      if (isClient && !project.statisticianId && !project.qaLeadId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "THREAD_LOCKED",
              message: "Consultation channel is locked until an administrator assigns your Lead Statistical Analyst and QA Lead.",
            },
          },
          { status: 403 }
        );
      }

      // 2. Execute Communication Firewall Inspection (<1ms regex)
      const firewallResult = runFirewall(content);

      if (firewallResult.blocked) {
        const { ruleName, matchedText } = firewallResult.detection;
        const warning = getFirewallWarningMessage(ruleName);

        // Persist blocked message audit log asynchronously
        db.message.create({
          data: {
            projectId: project.id,
            senderId: userId,
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
        }).catch((err) => console.warn("[Firewall Audit Write Error]", err));

        dispatchRealtimeNotification({
          eventType: "SECURITY_ALERT",
          projectId: project.id,
          title: "Firewall Alert: Contact Info Blocked",
          message: `${userName} triggered a communication policy block in consultation.`,
          targetRoles: ["ADMIN", "CEO"],
          excludeUserId: userId,
        }).catch((err) => console.warn("[POST /api/v1/messages] Alert warning:", err));

        return NextResponse.json(
          {
            success: false,
            blocked: true,
            warning,
            error: {
              code: "FIREWALL_BLOCKED",
              message: warning,
            },
          },
          { status: 422 }
        );
      }

      // 3. Save clean message
      const newMsg = await db.message.create({
        data: {
          projectId: project.id,
          senderId: userId,
          senderRole: callerRole,
          content: content.trim(),
          isBlocked: false,
        },
      });

      // Bell alert for the other people on the study (same as the sendMessage action). Not awaited.
      const preview = newMsg.content.length > 80 ? `${newMsg.content.slice(0, 80)}...` : newMsg.content;
      dispatchRealtimeNotification({
        eventType: "MESSAGE_ALERT",
        projectId: project.id,
        title: "New Consultation Message",
        message: `${userName}: ${preview}`,
        includeProjectParties: true,
        excludeUserId: userId,
      }).catch((err) => console.warn("[POST /api/v1/messages] Alert warning:", err));

      const messageDTO: MessageDTO = {
        id: newMsg.id,
        projectId: project.id,
        senderId: userId,
        senderName: userName,
        senderRole: callerRole,
        content: newMsg.content,
        isBlocked: false,
        blockedReason: null,
        sentAt: newMsg.sentAt.toISOString(),
        isMine: true,
        isRead: false,
        readByCount: 0,
        status: "sent",
        seenByNames: [],
      };

      return NextResponse.json({
        success: true,
        data: messageDTO,
      });
    })());
  } catch (err: unknown) {
    if (devMessagingEnabled()) {
      const res = devSendMessage(projectId, { ...session.user, role: callerRole }, content);
      return NextResponse.json(res, { status: res.success ? 200 : res.blocked ? 422 : 403 });
    }
    console.error("[POST /api/v1/messages] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: (err as Error).message },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/messages?projectId=…&since=ISO — new messages since a time (the chat's catch-up check).
 * A plain GET instead of a server action, so frequent checks never queue behind other actions.
 */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  const since = request.nextUrl.searchParams.get("since");
  if (!projectId || !since) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "projectId and since are required." } },
      { status: 400 }
    );
  }
  const res = await syncNewMessages(projectId, since);
  const status = res.success ? 200 : res.error?.code === "UNAUTHORIZED" ? 401 : 403;
  return NextResponse.json(res, { status, headers: { "Cache-Control": "no-store" } });
}
