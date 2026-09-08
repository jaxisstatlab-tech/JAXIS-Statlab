import { auth } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { ROLE_HOME } from "@/features/auth/schemas";
import type { RoleName } from "@prisma/client";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role as RoleName | undefined;

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

  return NextResponse.next();
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
