import type { Metadata } from "next";
import { getQaWorkload } from "@/features/assignments/actions";
import { getOwnProfile } from "@/features/staff/actions";
import { QADashboardClient } from "./QADashboardClient";

export const metadata: Metadata = {
  title: "Review Desk | JAXIS StatLab",
  description: "Studies ready for you to check, the ones sent back to the analyst, and your deadlines.",
};

export const dynamic = "force-dynamic";

export default async function QALeadDashboardPage() {
  const [res, profileRes] = await Promise.all([getQaWorkload(), getOwnProfile()]);

  const profile = profileRes.success ? profileRes.data : undefined;

  return (
    <QADashboardClient
      initialAssignments={res.success && res.data ? res.data : []}
      // An empty list after a failed load would read as "nothing assigned"; say it didn't load instead.
      initialLoadFailed={!res.success}
      initialProfileStatus={profile?.status || "ACTIVE"}
      initialLeaveData={profile ? { reason: profile.leaveReason, until: profile.leaveUntil } : null}
      // Approving needs a signature (it goes on the client's certificate); remind fresh accounts.
      hasSignature={profile ? Boolean(profile.signatureUrl) : true}
    />
  );
}
