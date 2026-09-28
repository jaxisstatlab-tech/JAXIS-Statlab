/**
 * "Log out when I leave" rules, shared by the middleware (server) and IdleSessionManager (browser).
 *
 * The browser keeps a small `jaxis_active` cookie with the time of the last activity. It has no
 * expiry date, so the browser deletes it when it closes, and every open tab shares it. The
 * middleware ends the session when that cookie is missing (browser was closed) or older than
 * IDLE_LIMIT_MS (tab closed or left alone), or 12 hours after logging in. A brand-new login gets a
 * short grace period, since the cookie is written on the first page load after signing in.
 *
 * Edge-safe: no Node imports.
 */
export const ACTIVE_COOKIE = "jaxis_active";
export const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes without activity
export const FRESH_LOGIN_MS = 2 * 60 * 1000; // grace period right after logging in
export const SESSION_MAX_AGE_S = 12 * 60 * 60; // a login lasts at most 12 hours

export function isSessionStale(lastActiveMs: number | null, loginAtMs: number | null, now = Date.now()): boolean {
  // Hard cap: Auth.js renews its own expiry on every visit, so the 12-hour limit is checked here.
  if (loginAtMs && now - loginAtMs > SESSION_MAX_AGE_S * 1000) return true;
  if (loginAtMs && now - loginAtMs < FRESH_LOGIN_MS) return false;
  if (!lastActiveMs || !Number.isFinite(lastActiveMs)) return true;
  return now - lastActiveMs > IDLE_LIMIT_MS;
}

/** Browser only: record activity now (session cookie, shared by all tabs). */
export function markActive(now = Date.now()): void {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ACTIVE_COOKIE}=${now}; Path=/; SameSite=Lax${secure}`;
}

/** Browser only: last activity time from any tab, or null. */
export function readLastActive(): number | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${ACTIVE_COOKIE}=(\\d+)`));
  return match ? Number(match[1]) : null;
}

/** Browser only: forget activity (on logout). */
export function clearActive(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ACTIVE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
