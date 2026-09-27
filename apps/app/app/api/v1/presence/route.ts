import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDevUserByEmail } from "@/lib/mock-data/users.data";
import { devMessagingEnabled } from "@/features/messaging/dev-store";

/**
 * Offline dev only: "who's online" and "who's typing" without Supabase Realtime.
 * In production this returns 404 and the app uses Supabase presence instead (in-memory state
 * here would not be shared between server instances).
 *
 * POST { typingIn?: projectId, stoppedTyping?: boolean }  → check in (and typing signal)
 * GET  ?ids=a,b,c&projectId=p                          → { online: string[], typing: {userId,name}[] }
 */

const ONLINE_FOR_MS = 25_000; // clients check in every 10 s
const TYPING_FOR_MS = 4_000;

type Store = {
  seen: Map<string, number>;
  typing: Map<string, Map<string, { at: number; name: string }>>;
};
const g = globalThis as typeof globalThis & { __jaxisDevPresence?: Store };
const store: Store = (g.__jaxisDevPresence ??= { seen: new Map(), typing: new Map() });

async function whoAmI() {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) return null;
  // Offline sessions can carry a different id than the dev account used in the offline study files.
  const devId = session.user.email ? getDevUserByEmail(session.user.email)?.id : undefined;
  const user = session.user as { id?: string; fullName?: string; name?: string | null };
  return { id: devId || user.id || "", name: user.fullName || user.name || "Someone" };
}

const notFound = () => NextResponse.json({ enabled: false }, { status: 404 });

export async function POST(request: NextRequest) {
  if (!devMessagingEnabled()) return notFound();
  const me = await whoAmI();
  if (!me?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { typingIn?: unknown; stoppedTyping?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // empty check-in
  }
  const now = Date.now();
  store.seen.set(me.id, now);
  if (typeof body.typingIn === "string" && body.typingIn) {
    const room = store.typing.get(body.typingIn) ?? new Map();
    if (body.stoppedTyping === true) room.delete(me.id);
    else room.set(me.id, { at: now, name: me.name });
    store.typing.set(body.typingIn, room);
  }
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  if (!devMessagingEnabled()) return notFound();
  const me = await whoAmI();
  if (!me?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const now = Date.now();
  store.seen.set(me.id, now); // looking counts as being online
  const ids = (request.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 50);
  const online = ids.filter((id) => now - (store.seen.get(id) ?? 0) < ONLINE_FOR_MS);

  const projectId = request.nextUrl.searchParams.get("projectId");
  const room = projectId ? store.typing.get(projectId) : undefined;
  const typing = room
    ? [...room.entries()]
        .filter(([id, t]) => id !== me.id && now - t.at < TYPING_FOR_MS)
        .map(([userId, t]) => ({ userId, name: t.name }))
    : [];

  return NextResponse.json({ online, typing }, { headers: { "Cache-Control": "no-store" } });
}
