import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, withDbTimeout } from "@/lib/db";
import { getDevUsers } from "@/lib/mock-data/users.data";

export const dynamic = "force-dynamic";

/**
 * A person's profile photo, for anyone signed in (sidebar, messages, staff lists). Sends the browser on to the
 * file itself (served by /api/files/preview, which treats avatars/ as shared); 404 when they have no photo, so
 * the page shows their initials instead.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Sign in first.", { status: 401 });
  const { userId } = await params;

  let path: string | null = null;
  try {
    const u = await withDbTimeout(db.user.findUnique({ where: { id: userId }, select: { avatarPath: true } }), 5000);
    path = u?.avatarPath ?? null;
  } catch {
    if (process.env.NODE_ENV !== "production" && process.env.JAXIS_OFFLINE === "1") {
      path = Object.values(getDevUsers()).find((u) => u.id === userId)?.avatarPath ?? null;
    }
  }
  if (!path || !path.startsWith("avatars/")) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, max-age=60" } });
  }
  return NextResponse.redirect(new URL(`/api/files/preview?url=${encodeURIComponent(path)}`, _req.url), {
    status: 302,
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
