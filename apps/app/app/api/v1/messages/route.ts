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
      // 1. Resolve project and access rights in single fast PK lookup
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
        return NextResponse.json(
          {
            success: false,
            error: { code: "PROJECT_NOT_FOUND", message: "Research study project not found." },
          },
          { status: 404 }
        );
      }

      const isClient = project.clientId === userId;
      const isStatistician = project.assignment?.statisticianId === userId;
      const isQaLead = project.assignment?.qaLeadId === userId;
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

      if (isClient && (!project.assignment || (!project.assignment.statisticianId && !project.assignment.qaLeadId))) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "THREAD_LOCKED",
              message: "Consultation channel is locked until an administrator assigns your Lead Statistician and QA Lead.",
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
