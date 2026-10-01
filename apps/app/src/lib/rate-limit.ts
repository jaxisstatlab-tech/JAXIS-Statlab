import { headers } from "next/headers";

/**
 * A small sliding-window limiter kept in this server's memory.
 *
 * Each running server counts on its own, so this slows down scripted abuse (mass sign-ups, guessing which
 * emails have accounts) rather than guaranteeing an exact global limit. A Vercel Firewall rate-limit rule is
 * the place for a hard limit across all servers.
 */
const hits = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 10_000;

/** Records an attempt for `key`. Returns true when the key is over `limit` attempts within `windowMs`. */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);

  // Keep memory bounded: drop the oldest keys once there are many.
  if (hits.size > MAX_TRACKED_KEYS) {
    const overflow = hits.size - MAX_TRACKED_KEYS;
    let removed = 0;
    for (const k of hits.keys()) {
      if (removed++ >= overflow) break;
      hits.delete(k);
    }
  }
  return false;
}

/** The caller's IP address as seen by Vercel (first entry of x-forwarded-for), or "unknown". */
export async function callerIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}
