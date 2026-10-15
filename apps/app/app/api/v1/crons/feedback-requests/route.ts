import { NextRequest, NextResponse } from "next/server";
import { sendDueFeedbackRequests } from "@/features/feedback/requests";

/**
 * Daily job: asks clients of newly finished studies for feedback, and reminds them once (see features/feedback/requests).
 * Called once a day by .github/workflows/feedback-requests.yml with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !expected) {
    return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  }
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (expected && token !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await sendDueFeedbackRequests();
    console.info("[cron/feedback-requests]", result);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[cron/feedback-requests] Failed:", err);
    return NextResponse.json({ success: false, error: "The feedback job failed." }, { status: 500 });
  }
}
