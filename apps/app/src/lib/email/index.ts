import { db, withDbTimeout } from "@/lib/db";
import { EmailPayload } from "./types";
import { renderEmailTemplate } from "./renderer";
import { EMAIL_POLICY, isCriticalEmail, isEmailAllowed } from "./policy";

type SendResult = {
  success: boolean;
  logId?: string;
  simulated?: boolean;
  /** Not sent on purpose: not on the email list, already sent, or the daily/monthly budget is used up. */
  skipped?: "not-on-list" | "already-sent" | "over-budget";
  error?: string;
};

/** Sent emails in the last `hours` (from the email log). */
async function sentSince(hours: number): Promise<number> {
  return withDbTimeout(
    db.notificationLog.count({ where: { status: "SENT", sentAt: { gte: new Date(Date.now() - hours * 3_600_000) } } }),
    3000
  );
}

/**
 * Sends an email through Resend and records it in the email log (NotificationLog).
 * - Only templates on EMAIL_POLICY's lists go out; others are skipped.
 * - Near Resend's free limits (100 a day, 3,000 a month) only critical emails (password reset) are sent.
 * - Development only logs the email unless EMAIL_SEND_IN_DEV=1, so testing never emails real people.
 * - Up to 3 attempts with a short back-off.
 */
export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  const { to, recipientId, template, projectId, data, once } = payload;

  if (!isEmailAllowed(template)) {
    return { success: false, skipped: "not-on-list" };
  }

  if (once && projectId) {
    const already = await withDbTimeout(
      db.notificationLog.findFirst({ where: { template, projectId, email: to, status: "SENT" }, select: { id: true } }),
      3000
    ).catch(() => null);
    if (already) return { success: true, skipped: "already-sent" };
  }

  const record = (status: "SENT" | "FAILED" | "RETRYING", attemptCount: number, errorMessage: string | null) =>
    recipientId
      ? withDbTimeout(
          db.notificationLog.create({
            data: { recipientId, email: to, template, projectId: projectId || null, status, attemptCount, errorMessage, lastAttemptAt: new Date() },
            select: { id: true },
          })
        ).catch((err) => {
          console.error("Failed to save NotificationLog record:", err);
          return null;
        })
      : Promise.resolve(null);

  if (!isCriticalEmail(template)) {
    try {
      const [day, month] = await Promise.all([sentSince(24), sentSince(24 * 30)]);
      if (day >= EMAIL_POLICY.dailyLimit || month >= EMAIL_POLICY.monthlyLimit) {
        const note = `Held back: email budget used (${day} in 24 hours, ${month} in 30 days). The in-app alert still went out.`;
        console.warn(`[email] ${template} to ${to} held back. ${note}`);
        const log = await record("FAILED", 0, note);
        return { success: false, skipped: "over-budget", logId: log?.id, error: note };
      }
    } catch {
      // Can't read the log: send anyway rather than drop an important email.
    }
  }

  const { subject, html, text } = renderEmailTemplate(template, data);
  const resendApiKey = process.env.RESEND_API_KEY;
  const sendForReal = Boolean(resendApiKey) && (process.env.NODE_ENV === "production" || process.env.EMAIL_SEND_IN_DEV === "1");

  if (!sendForReal) {
    console.log(`\n[email: not sent, development] ${template} → ${to}\nSubject: ${subject}\n`);
    const log = await record("SENT", 1, null);
    return { success: true, simulated: true, logId: log?.id };
  }

  const configuredFrom = process.env.RESEND_FROM_EMAIL?.trim();
  const from =
    configuredFrom && !configuredFrom.includes("onboarding@resend.dev")
      ? configuredFrom
      : "JAXIS StatLab <notifications@jaxis-statlab.com>";

  let errorMessage: string | null = null;
  let attempt = 0;
  for (attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, html, text }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Resend HTTP error ${res.status}`);
      }
      errorMessage = null;
      break;
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : "Network delivery failure";
      console.warn(`[email] attempt ${attempt}/3 failed for ${template} → ${to}: ${errorMessage}`);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  const status = errorMessage ? "FAILED" : "SENT";
  const log = await record(status, Math.min(attempt, 3), errorMessage);
  return { success: status === "SENT", logId: log?.id, error: errorMessage || undefined };
}

export * from "./types";
export * from "./renderer";
export * from "./policy";
