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
  const trace: Record<string, unknown> = {};

  try {
    trace.step = "auth_start";
    const session = await auth();
    trace.session = !!session;
    trace.userId = session?.user?.id;
    trace.userRole = session?.user?.role;

    const user = session?.user;
    if (!user?.id) {
      trace.step = "redirecting_to_login";
      redirect("/login");
    }

    trace.step = "live_account_start";
    try {
      const liveState = await getLiveAccountState(user.id);
      trace.hasLiveState = !!liveState;
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
    } catch (liveErr: unknown) {
      if (typeof liveErr === "object" && liveErr !== null && "digest" in liveErr) {
        const digest = String((liveErr as { digest?: unknown }).digest || "");
        if (digest.startsWith("NEXT_REDIRECT")) throw liveErr;
      }
      trace.liveStateErr = String(liveErr);
    }

    const userRole = (user?.role as RoleName) || "ADMIN";

    trace.step = "shift_start";
    let initialActiveShift = null;
    const isInternal = ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN", "CEO"].includes(userRole);
    if (isInternal) {
      try {
        initialActiveShift = await getActiveShift();
        trace.activeShiftOk = true;
      } catch (err) {
        trace.activeShiftErr = String(err);
      }
    }

    trace.step = "unread_start";
    let initialUnreadMessagesCount = 0;
    try {
      initialUnreadMessagesCount = await getUnreadMessagesCount();
      trace.unreadOk = true;
    } catch (err) {
      trace.unreadErr = String(err);
    }

    trace.step = "returning_layout";

    return (
      <div className="min-h-screen bg-[#010114] text-white p-6">
        <div className="bg-[#01142B] p-4 border border-white/10 mb-4 font-mono text-xs">
          <strong>SSR TRACE LOG:</strong>
          <pre>{JSON.stringify(trace, null, 2)}</pre>
        </div>
        <main>
          <div id="test-isolation-success" className="text-emerald-400 font-mono text-lg font-bold">
            ISOLATION TEST: CHILDREN OMITTED. LAYOUT ALIVE!
          </div>
        </main>
      </div>
    );
  } catch (layoutError: unknown) {
    if (typeof layoutError === "object" && layoutError !== null && "digest" in layoutError) {
      const digest = String((layoutError as { digest?: unknown }).digest || "");
      if (digest.startsWith("NEXT_REDIRECT")) {
        throw layoutError;
      }
    }
    const errMsg = layoutError instanceof Error ? layoutError.stack || layoutError.message : String(layoutError);
    return (
      <div style={{ padding: 40, background: "#010114", color: "#ff4444", fontFamily: "monospace" }}>
        <h1>DASHBOARD LAYOUT CRASH CAUGHT</h1>
        <p>Last Step: {String(trace.step)}</p>
        <pre>{errMsg}</pre>
      </div>
    );
  }
}

