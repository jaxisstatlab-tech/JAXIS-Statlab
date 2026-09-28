import { auth } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { ROLE_HOME } from "@/features/auth/schemas";
import type { RoleName } from "@prisma/client";
import { ACTIVE_COOKIE, isSessionStale } from "@/lib/session-activity";

/**
 * Ends the login. Auth.js re-sets its session cookie on every middleware response, so we can't
 * delete it here; /session-ended runs Auth.js's own signOut, then shows the login page.
 */
function endSession(req: Parameters<Parameters<typeof auth>[0]>[0]) {
  const { nextUrl } = req;
  const url = new URL("/session-ended", nextUrl);
  if (nextUrl.pathname.startsWith("/dashboard")) url.searchParams.set("callbackUrl", nextUrl.pathname);
  return NextResponse.redirect(url);
}

export default auth((req) => {
  const { nextUrl } = req;

  // [TEMPORARY DOMAIN RETRY]: Re-enable this canonical redirect when app.jaxis-statlab.com DNS is restored:
  // const hostname = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  // if (
  //   hostname.includes("jaxis-statlab-app.vercel.app") &&
  //   !hostname.includes("localhost")
  // ) {
  //   const canonicalUrl = new URL(
  //     nextUrl.pathname + nextUrl.search,
  //     "https://app.jaxis-statlab.com"
  //   );
  //   return NextResponse.redirect(canonicalUrl, 308);
  // }

  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role as RoleName | undefined;

  // Log out when the site was closed (activity cookie gone) or left alone for 30 minutes.
  if (isLoggedIn) {
    const lastActive = Number(req.cookies.get(ACTIVE_COOKIE)?.value) || null;
    const loginAt = req.auth?.user?.loginAt ?? null;
    if (isSessionStale(lastActive, loginAt)) {
      // Sessions from before this rule have no login time; treat them the same (log in again once).
      return endSession(req);
    }
  }

  // 0. If visiting root "/" or exactly "/dashboard" -> redirect to role dashboard if logged in
  if (nextUrl.pathname === "/" || nextUrl.pathname === "/dashboard") {
    if (isLoggedIn && userRole) {
      const targetHome = ROLE_HOME[userRole] || "/dashboard";
      // Avoid infinite redirect if targetHome is somehow "/dashboard"
      if (targetHome !== "/dashboard") {
        return NextResponse.redirect(new URL(targetHome, nextUrl));
      }
    }
    if (nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
  }

  const isAuthRoute =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register") ||
    nextUrl.pathname.startsWith("/forgot-password") ||
    nextUrl.pathname.startsWith("/reset-password");
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");

  // 1. If already logged in and visiting /login or /register -> redirect to role dashboard
  if (isAuthRoute) {
    if (isLoggedIn && userRole) {
      const targetHome = ROLE_HOME[userRole] || "/dashboard";
      return NextResponse.redirect(new URL(targetHome, nextUrl));
    }
    return NextResponse.next();
  }

  // 2. If visiting protected /dashboard routes and NOT logged in -> redirect to /login
  if (isDashboardRoute) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-specific workspace boundaries
    const roleRoutes: Record<string, RoleName> = {
      "/dashboard/admin": "ADMIN",
      "/dashboard/ceo": "CEO",
      "/dashboard/client": "CLIENT",
      "/dashboard/finance": "FINANCE_OFFICER",
      "/dashboard/qa": "SENIOR_QA_LEAD",
      "/dashboard/statistician": "STATISTICIAN",
    };

    // Redirect finance officers attempting to access admin payment desks to their native finance desk
    if (
      userRole === "FINANCE_OFFICER" &&
      nextUrl.pathname.startsWith("/dashboard/admin/projects/") &&
      nextUrl.pathname.endsWith("/payment")
    ) {
      const financeUrl = nextUrl.pathname.replace("/dashboard/admin/projects/", "/dashboard/finance/projects/");
      return NextResponse.redirect(new URL(financeUrl, nextUrl));
    }

    for (const [routePrefix, requiredRole] of Object.entries(roleRoutes)) {
      if (nextUrl.pathname.startsWith(routePrefix)) {
        // Admin and CEO can inspect other desks, but others cannot
        if (
          userRole !== requiredRole &&
          userRole !== "ADMIN" &&
          userRole !== "CEO"
        ) {
          return NextResponse.redirect(new URL("/unauthorized", nextUrl));
        }
      }
    }
  }

  const res = NextResponse.next();
  // Opening a page counts as activity. Session cookie: no expiry, so it's gone when the browser closes.
  if (isLoggedIn) {
    res.cookies.set(ACTIVE_COOKIE, String(Date.now()), {
      path: "/",
      sameSite: "lax",
      secure: nextUrl.protocol === "https:",
    });
  }
  return res;
});

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
