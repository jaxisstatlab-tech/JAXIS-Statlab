import { NextResponse } from "next/server";

/**
 * Offline dev only: stands in for Cloudflare R2 during `npm run dev:offline`, so the upload steps
 * can be tested. It accepts the file and throws it away; nothing is stored. Returns 404 anywhere else.
 */
export async function PUT() {
  if (process.env.NODE_ENV === "production" || process.env.JAXIS_OFFLINE !== "1") {
    return NextResponse.json({ enabled: false }, { status: 404 });
  }
  return new NextResponse(null, { status: 200 });
}
