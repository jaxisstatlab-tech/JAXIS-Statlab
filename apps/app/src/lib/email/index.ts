import { db, withDbTimeout } from "@/lib/db";
import { EmailPayload, EmailTemplateName } from "./types";
import { renderEmailTemplate } from "./renderer";

/**
 * Sends a transactional operational email.
 * - In Production: Uses Resend API when RESEND_API_KEY is configured.
 * - In Local Development: Simulates email sending, renders HTML templates, and logs full audit record in NotificationLog.
 * - Retries: Retries failed deliveries up to 3 times with exponential backoff.
 */
export async function sendEmail(payload: EmailPayload): Promise<{
  success: boolean;
  logId?: string;
  simulated?: boolean;
  error?: string;
}> {
  const { to, recipientId, template, projectId, data } = payload;
  const resendApiKey = process.env.RESEND_API_KEY;

  const { subject, html, text } = renderEmailTemplate(template, data);

  let status: "SENT" | "FAILED" | "RETRYING" = "SENT";
  let errorMessage: string | null = null;
  let attemptCount = 1;
  let isSimulated = false;

  if (resendApiKey) {
    // Production Resend Execution
    let sentSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      attemptCount = attempt;
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || "JAXIS StatLab <onboarding@resend.dev>",
            to,
            subject,
            html,
            text,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Resend HTTP error ${res.status}`);
        }

        sentSuccess = true;
        status = "SENT";
        errorMessage = null;
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Network delivery failure";
        errorMessage = msg;
        status = attempt < 3 ? "RETRYING" : "FAILED";
        console.warn(`[Email Delivery Attempt ${attempt}/3 Failed for ${to}]: ${msg}`);
        if (attempt < 3) {
          // Exponential backoff: 500ms, 1000ms
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        }
      }
    }
  } else {
    // Development Simulation Mode
    isSimulated = true;
    status = "SENT";
    console.log(
      `\n📨 [DEV EMAIL SIMULATION] Template: ${template} -> To: ${to}\nSubject: ${subject}\nPayload:`,
      JSON.stringify(data, null, 2)
    );
  }

  // Record Audit Trail in NotificationLog
  let logRecord: { id: string } | null = null;
  if (recipientId) {
    try {
      logRecord = await withDbTimeout(
        db.notificationLog.create({
          data: {
            recipientId,
            email: to,
            template,
            projectId: projectId || null,
            status,
            attemptCount,
            errorMessage,
            lastAttemptAt: new Date(),
          },
          select: { id: true },
        })
      );
    } catch (dbErr) {
      console.error("Failed to save NotificationLog record:", dbErr);
    }
  }

  return {
    success: status === "SENT",
    logId: logRecord?.id,
    simulated: isSimulated,
    error: errorMessage || undefined,
  };
}

export * from "./types";
export * from "./renderer";
