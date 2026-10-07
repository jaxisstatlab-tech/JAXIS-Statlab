import type { Metadata } from "next";
import { getStatisticianWorkload } from "@/features/assignments/actions";
import { getStaffSelfProfile } from "@/features/staff/actions";
import { StatisticianDashboardClient } from "./StatisticianDashboardClient";

export const metadata: Metadata = {
  title: "My Studies | JAXIS StatLab",
  description: "The studies assigned to you, what to work on first, and your deadlines.",
};

export const dynamic = "force-dynamic";

export default async function StatisticianDashboardPage() {
  const [res, profileRes] = await Promise.all([getStatisticianWorkload(), getStaffSelfProfile()]);

  const profile = profileRes.success ? (profileRes.data as { status?: string; leaveReason?: string | null; leaveUntil?: string | null } | undefined) : undefined;

  return (
    <StatisticianDashboardClient
      initialAssignments={res.success && res.data ? res.data : []}
      // An empty list after a failed load would read as "nothing assigned"; say it didn't load instead.
      initialLoadFailed={!res.success}
      initialProfileStatus={profile?.status || "ACTIVE"}
      initialLeaveData={profile ? { reason: profile.leaveReason, until: profile.leaveUntil } : null}
    />
  );
}
