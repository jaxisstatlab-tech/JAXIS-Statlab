import { db, withDbTimeout } from "@/lib/db";
import type { AuthEvent } from "@prisma/client";

/**
 * Limits on failed logins and sign-up attempts, counted in the auth audit log so every server sees the same
 * numbers (a counter in memory only covers the one server that handled the request).
 *
 * Per-network limits are generous because students on one campus network share an IP address.
 */
const MINUTE = 60 * 1000;
export const LOGIN_LIMIT = { perEmail: 5, perIp: 30, windowMs: 15 * MINUTE };
export const SIGNUP_LIMIT = { perEmail: 5, perIp: 10, windowMs: 60 * MINUTE };

/** The caller's IP as Vercel reports it (first entry of x-forwarded-for), from a request or a headers object. */
export function ipFrom(source: { headers?: Headers | { get(name: string): string | null } } | Headers | null | undefined): string | null {
  const h = source instanceof Headers ? source : source?.headers;
  const forwarded = h?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h?.get("x-real-ip") || null;
}

async function recentCount(event: AuthEvent, match: { email?: string; ipAddress?: string }, windowMs: number) {
  return withDbTimeout(
    db.authAuditLog.count({ where: { event, ...match, createdAt: { gte: new Date(Date.now() - windowMs) } } }),
    1500
  );
}

async function overLimit(event: AuthEvent, email: string, ip: string | null, limit: typeof LOGIN_LIMIT): Promise<boolean> {
  try {
    const [byEmail, byIp] = await Promise.all([
      recentCount(event, { email }, limit.windowMs),
      ip ? recentCount(event, { ipAddress: ip }, limit.windowMs) : Promise.resolve(0),
    ]);
    return byEmail >= limit.perEmail || byIp >= limit.perIp;
  } catch {
    // If the count can't be read, don't lock everyone out; the attempt itself still needs the right password.
    return false;
  }
}

/** True when this email or network has had too many failed logins recently. */
export function isLoginThrottled(email: string, ip: string | null) {
  return overLimit("LOGIN_FAILED", email, ip, LOGIN_LIMIT);
}

/** True when this email or network has made too many sign-up attempts recently. */
export function isSignupThrottled(email: string, ip: string | null) {
  return overLimit("REGISTRATION", email, ip, SIGNUP_LIMIT);
}

/** Records an auth event with the caller's IP; never throws. */
export async function recordAuthEvent(entry: {
  event: AuthEvent;
  email: string;
  userId?: string | null;
  ip: string | null;
  metadata?: Record<string, string>;
}) {
  try {
    await withDbTimeout(
      db.authAuditLog.create({
        data: {
          event: entry.event,
          email: entry.email,
          userId: entry.userId ?? null,
          ipAddress: entry.ip,
          metadata: entry.metadata,
        },
      }),
      1000
    );
  } catch {
    // Audit logging must never break sign-in.
  }
}
