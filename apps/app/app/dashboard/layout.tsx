import React from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "../components/layout/DashboardShell";
import { auth, getLiveAccountState, computePasswordFingerprint } from "@/lib/auth";
import { getDevUserByEmail } from "@/lib/mock-data/users.data";
import type { RoleName } from "@prisma/client";
import { getClientProfileOnce } from "@/features/client-profile/profile-cache";
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

  const userRole = (user?.role as RoleName) || "ADMIN";
  const isInternal = ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN", "CEO"].includes(userRole);

  // Everything this layout needs is read at the same time (one database round trip deep instead
  // of four in a row). Each read has its own safe fallback, as before.
  const [liveResult, clientProfile, activeShift, unreadCount] = await Promise.all([
    getLiveAccountState(user.id).then(
      (state) => ({ state, error: null as unknown }),
      (error: unknown) => ({ state: null, error })
    ),
    userRole === "CLIENT"
      ? getClientProfileOnce().catch((err: unknown) => {
          console.warn("[DashboardLayout] Client profile check warning:", err);
          return undefined;
        })
      : Promise.resolve(undefined),
    isInternal
      ? getActiveShift().catch((err: unknown) => {
          console.warn("[DashboardLayout] getActiveShift fallback to null:", err);
          return null;
        })
      : Promise.resolve(null),
    getUnreadMessagesCount().catch((err: unknown) => {
      console.warn("[DashboardLayout] getUnreadMessagesCount fallback to 0:", err);
      return 0;
    }),
  ]);

  // 1. Live account state check: immediate eviction for suspended, terminated, or changed passwords
  try {
    if (liveResult.error) throw liveResult.error;
    const liveState = liveResult.state;
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

  const userEmail = user?.email || "";
  // Name and photo from the live account read, so My Profile changes show without signing in again.
  const offlineDev =
    process.env.JAXIS_OFFLINE === "1" && process.env.NODE_ENV !== "production" && userEmail ? getDevUserByEmail(userEmail) : undefined;
  const liveName = liveResult.state?.fullName ?? offlineDev?.fullName;
  const livePhoto = liveResult.state ? liveResult.state.avatarPath : offlineDev?.avatarPath;
  const userFullName = liveName || user?.fullName || user?.name || "Research Staff";
  const photoOwner = liveResult.state ? user.id : (offlineDev?.id ?? user.id);
  const userAvatarUrl = livePhoto ? `/api/avatar/${encodeURIComponent(photoOwner)}?v=${/\/(\d+)-/.exec(livePhoto)?.[1] ?? "1"}` : null;
  // Offline dev sessions can carry a different id than the offline study files use.
  const presenceId =
    (process.env.JAXIS_OFFLINE === "1" && process.env.NODE_ENV !== "production" && userEmail
      ? getDevUserByEmail(userEmail)?.id
      : undefined) || user.id;

  // A failed profile check (undefined) doesn't nag; a missing or incomplete profile does.
  const clientProfileIncomplete =
    userRole === "CLIENT" &&
    clientProfile !== undefined &&
    (!clientProfile || !clientProfile.institutionSchool || !clientProfile.contactNumber);
  const initialActiveShift = activeShift;
  const initialUnreadMessagesCount = unreadCount;

  return (
    <DashboardShell
      userFullName={userFullName}
      userAvatarUrl={userAvatarUrl}
      userRole={userRole}
      userEmail={userEmail}
      presenceId={presenceId}
      clientProfileIncomplete={clientProfileIncomplete}
      initialActiveShift={initialActiveShift}
      initialUnreadMessagesCount={initialUnreadMessagesCount}
    >
      {children}
    </DashboardShell>
  );
}
