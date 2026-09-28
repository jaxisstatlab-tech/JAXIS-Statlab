import { NextResponse } from "next/server";
import { getDevUsers } from "@/lib/mock-data/users.data";

/**
 * Offline dev only: the sample accounts for the login page's "Sign in as" picker.
 * Answers only under `npm run dev:offline` (JAXIS_OFFLINE=1) and never in a production build,
 * so the list (with the sample passwords) can't be fetched from the live site.
 */
export function GET() {
  if (process.env.NODE_ENV === "production" || process.env.JAXIS_OFFLINE !== "1") {
    return NextResponse.json({ enabled: false }, { status: 404 });
  }
  const accounts = Object.values(getDevUsers())
    .map((u) => ({ email: u.email, password: u.password, fullName: u.fullName, role: u.role, status: u.status ?? "ACTIVE" }))
    .sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email));
  return NextResponse.json({ accounts }, { headers: { "Cache-Control": "no-store" } });
}
