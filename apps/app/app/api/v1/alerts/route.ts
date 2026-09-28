import { NextResponse } from "next/server";
import { getInAppAlertsAction } from "@/features/notifications/actions";

export const dynamic = "force-dynamic";

/**
 * The signed-in person's bell alerts (same data and login check as getInAppAlertsAction).
 * A plain GET so background checks don't go through the page's server-action queue, where they
 * would make sidebar clicks wait.
 */
export async function GET() {
  const res = await getInAppAlertsAction();
  if (!res.success) {
    return NextResponse.json(res, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
}
