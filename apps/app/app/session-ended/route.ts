import { NextRequest } from "next/server";
import { signOut } from "@/lib/auth";

/**
 * The middleware sends people here when their login should end (site closed, 30 minutes without
 * activity, or 12 hours since logging in). Auth.js's own signOut clears the session cookie properly
 * (the middleware can't: Auth.js re-sets it on every response), then redirects to the login page.
 */
export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
  const target = new URLSearchParams({ reason: "session_ended" });
  // Only same-site dashboard paths, so this can't be used to send people to another website.
  if (callbackUrl && callbackUrl.startsWith("/dashboard") && !callbackUrl.startsWith("//")) {
    target.set("callbackUrl", callbackUrl);
  }
  await signOut({ redirectTo: `/login?${target}` });
}
