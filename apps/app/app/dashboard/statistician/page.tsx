import React, { Suspense } from "react";
import type { Metadata } from "next";
import { getStatisticianWorkload } from "@/features/assignments/actions";
import { getStaffSelfProfile } from "@/features/staff/actions";
import { StatisticianDashboardClient } from "./StatisticianDashboardClient";
import { LoadingState } from "@repo/ui";

export const metadata: Metadata = {
  title: "Statistical Analyst Workbench | JAXIS StatLab",
  description:
    "View assigned research studies, run statistical analysis, and submit defense-ready statistical packages for QA review.",
};

export const dynamic = "force-dynamic";

export default async function StatisticianDashboardPage() {
  const [res, profileRes] = await Promise.all([
    getStatisticianWorkload(),
    getStaffSelfProfile(),
  ]);

  const initialAssignments = res.success && res.data ? res.data : [];
  const initialProfileStatus = (profileRes.success && profileRes.data?.status) || "ACTIVE";
  const initialLeaveData =
    profileRes.success && profileRes.data
      ? {
          reason: (profileRes.data as { leaveReason?: string | null }).leaveReason,
          until: (profileRes.data as { leaveUntil?: string | null }).leaveUntil,
        }
      : null;

  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
          <LoadingState variant="page" label="Loading statistical workbench..." />
        </div>
      }
    >
      <StatisticianDashboardClient
        initialAssignments={initialAssignments}
        initialProfileStatus={initialProfileStatus}
        initialLeaveData={initialLeaveData}
      />
    </Suspense>
  );
}
