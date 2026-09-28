import { NextResponse } from "next/server";
import { getUnreadMessagesCount } from "@/features/messaging/actions";

export const dynamic = "force-dynamic";

/**
 * Unread chat messages for the signed-in person (same login check as getUnreadMessagesCount).
 * A plain GET so the sidebar's background refresh doesn't hold up page navigation.
 */
export async function GET() {
  try {
    const count = await getUnreadMessagesCount();
    return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ count: 0 }, { headers: { "Cache-Control": "no-store" } });
  }
}
