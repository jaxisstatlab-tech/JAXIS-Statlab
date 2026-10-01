import { auth } from "@/lib/auth";
import { notificationBus, type RealtimeNotificationPayload } from "@/lib/notifications/event-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial Handshake / Connection confirmation
      const initialPayload = JSON.stringify({
        status: "connected",
        userId: user.id,
        role: user.role,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`event: connected\ndata: ${initialPayload}\n\n`));

      // 2. Real-time broadcast listener
      const onNotification = (payload: RealtimeNotificationPayload) => {
        try {
          // Every alert is addressed to one person, so only that person's browser gets it. (Matching on role
          // used to hand one client's alert, with its study and message, to every other signed-in client.)
          const isTargetUser = Boolean(
            payload.targetUserIds?.includes(user.id) ||
            payload.alert.recipientId === user.id
          );

          if (isTargetUser) {
            const data = JSON.stringify({
              ...payload.alert,
              title: payload.title || "New Notification",
            });
            controller.enqueue(encoder.encode(`event: notification\ndata: ${data}\n\n`));
          }
        } catch {
          // Ignore stream write errors if client disconnected abruptly
        }
      };

      notificationBus.on("notification", onNotification);

      // 3. Heartbeat keep-alive (every 20s) to prevent edge gateway/proxy timeouts
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 20000);

      cleanup = () => {
        notificationBus.off("notification", onNotification);
        clearInterval(pingInterval);
      };
    },
    cancel() {
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
