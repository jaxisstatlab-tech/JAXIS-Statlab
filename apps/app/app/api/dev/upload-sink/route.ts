import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isOfflineDev } from "@/lib/app-settings";
import { saveDevUpload } from "@/lib/dev-uploads";

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Offline dev only: stands in for Cloudflare R2 during `npm run dev:offline`. The file is kept in the local
 * `.dev-uploads` folder under its storage key, so it can be opened again (for example a payment QR code).
 * Returns 404 anywhere else.
 */
export async function PUT(req: NextRequest) {
  if (process.env.NODE_ENV === "production" || !isOfflineDev()) {
    return NextResponse.json({ enabled: false }, { status: 404 });
  }
  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });

  const key = new URL(req.url).searchParams.get("key") || "";
  const body = Buffer.from(await req.arrayBuffer());
  if (body.length > MAX_BYTES) return new NextResponse(null, { status: 413 });
  if (key && !saveDevUpload(key, body)) return new NextResponse(null, { status: 400 });
  return new NextResponse(null, { status: 200 });
}
