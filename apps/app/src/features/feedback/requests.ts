import { db, withDbTimeout } from "@/lib/db";
import { emailClient } from "@/lib/email/notify";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import { REMIND_AFTER_DAYS } from "./rules";

// Server-only (not a server action, so the browser can't call it): asks clients of newly finished studies for
// feedback, and reminds them once. Run once a day by /api/v1/crons/feedback-requests.
// Limits so the first run can't flood anyone: only studies that finished in the last 30 days, at most MAX_ASKS new
// asks per run (Resend's free plan allows 100 emails a day).

const DAY = 86_400_000;
const MAX_ASKS = 20;
const LOOK_BACK_DAYS = 30;

export async function sendDueFeedbackRequests(now = new Date()): Promise<{ asked: number; reminded: number }> {
  const since = new Date(now.getTime() - LOOK_BACK_DAYS * DAY);

  // 1. Newly finished studies nobody has asked about yet: delivered with the free-changes window over (or closed),
  //    final files released, no feedback, no request.
  const due = await withDbTimeout(
    db.project.findMany({
      where: {
        feedback: { is: null },
        feedbackRequest: { is: null },
        deliverables: { some: { isFinalReleased: true } },
        OR: [
          { masterStatus: "DELIVERED", revisionWindowExpiresAt: { lt: now, gte: since } },
          { masterStatus: "CLOSED", updatedAt: { gte: since } },
        ],
        client: { status: "ACTIVE" },
      },
      select: { id: true, intakeId: true, researchTitle: true, clientId: true },
      orderBy: { updatedAt: "asc" },
      take: MAX_ASKS,
    }),
    15000,
  );

  let asked = 0;
  for (const p of due) {
    try {
      await withDbTimeout(db.feedbackRequest.create({ data: { projectId: p.id, askedAt: now } }));
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") continue; // another run got there first
      throw e;
    }
    asked += 1;
    try {
      await dispatchRealtimeNotification({
        eventType: "CLIENT_FEEDBACK",
        projectId: p.id,
        intakeId: p.intakeId,
        title: "How did we do?",
        message: `Your study "${p.researchTitle}" is finished. Tell us how it went: one rating and two short questions.`,
        linkUrl: `/dashboard/client/projects/${p.id}#feedback`,
        targetUserIds: [p.clientId],
      });
    } catch (e) {
      console.warn("[sendDueFeedbackRequests] Notification failed:", e);
    }
    emailClient(p.id, "FeedbackRequest", {}, { once: true });
  }

  // 2. One reminder, REMIND_AFTER_DAYS after asking, if they still haven't answered.
  const remindBefore = new Date(now.getTime() - REMIND_AFTER_DAYS * DAY);
  const pending = await withDbTimeout(
    db.feedbackRequest.findMany({
      where: { remindedAt: null, askedAt: { lte: remindBefore }, project: { feedback: { is: null }, client: { status: "ACTIVE" } } },
      select: { id: true, project: { select: { id: true, intakeId: true, researchTitle: true, clientId: true } } },
      take: MAX_ASKS,
    }),
    15000,
  );

  let reminded = 0;
  for (const r of pending) {
    // Claim it first, so two runs at once can't both remind.
    const claimed = await withDbTimeout(db.feedbackRequest.updateMany({ where: { id: r.id, remindedAt: null }, data: { remindedAt: now } }));
    if (claimed.count === 0) continue;
    reminded += 1;
    try {
      await dispatchRealtimeNotification({
        eventType: "CLIENT_FEEDBACK",
        projectId: r.project.id,
        intakeId: r.project.intakeId,
        title: "A minute to tell us how we did?",
        message: `We'd really like to know how "${r.project.researchTitle}" went. This is the only reminder.`,
        linkUrl: `/dashboard/client/projects/${r.project.id}#feedback`,
        targetUserIds: [r.project.clientId],
      });
    } catch (e) {
      console.warn("[sendDueFeedbackRequests] Reminder notification failed:", e);
    }
    emailClient(r.project.id, "FeedbackReminder", {}, { once: true });
  }

  return { asked, reminded };
}
