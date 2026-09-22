import React from "react";
import { redirect } from "next/navigation";
import { auth, getLiveAccountState, computePasswordFingerprint } from "@/lib/auth";
import type { RoleName } from "@prisma/client";
import { getClientProfile } from "@/features/client-profile/actions";
import { getActiveShift } from "@/features/attendance/actions";
import { getUnreadMessagesCount } from "@/features/messaging/actions";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    redirect("/login");
  }

  // Real-time security verification: bounce suspended accounts and invalidated sessions
  try {
    const liveState = await getLiveAccountState(user.id);
    if (liveState) {
      if (liveState.status === "SUSPENDED") {
        redirect("/login?error=AccountSuspended");
      }
      if (liveState.status === "TERMINATED") {
        redirect("/login?error=AccountTerminated");
      }
      if (user.pwdFp && liveState.passwordHash) {
        if (computePasswordFingerprint(liveState.passwordHash) !== user.pwdFp) {
          redirect("/login?error=SessionRevoked");
        }
      }
    }
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "digest" in err) {
      const digest = String((err as { digest?: unknown }).digest || "");
      if (digest.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
    }
    console.warn("[DashboardLayout] Live account check non-blocking warning:", err);
  }

  const userRole = (user?.role as RoleName) || "ADMIN";
  const userFullName = user?.fullName || user?.name || "Dr. Aris Thorne";
  const userEmail = user?.email || "admin@jaxis.dev";

  let clientProfileIncomplete = false;
  if (userRole === "CLIENT" && user?.id) {
    try {
      const profile = await getClientProfile();
      if (!profile || !profile.institutionSchool || !profile.contactNumber) {
        clientProfileIncomplete = true;
      }
    } catch (err) {
      console.warn("[DashboardLayout] Client profile check warning:", err);
    }
  }

  const isInternal = ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN", "CEO"].includes(userRole);
  let initialActiveShift = null;
  if (isInternal) {
    try {
      initialActiveShift = await getActiveShift();
    } catch (err) {
      console.warn("[DashboardLayout] getActiveShift fallback to null:", err);
      initialActiveShift = null;
    }
  }

  let initialUnreadMessagesCount = 0;
  try {
    initialUnreadMessagesCount = await getUnreadMessagesCount();
  } catch (err) {
    console.warn("[DashboardLayout] getUnreadMessagesCount fallback to 0:", err);
    initialUnreadMessagesCount = 0;
  }

  return (
    <div className="min-h-screen bg-[#010114] text-white">
      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
}

