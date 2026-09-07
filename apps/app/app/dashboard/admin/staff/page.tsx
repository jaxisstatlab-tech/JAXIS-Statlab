import React, { Suspense } from "react";
import { getStaffRoster, getStaffSelfProfile } from "@/features/staff/actions";
import { StaffRosterClient } from "./StaffRosterClient";
import { LoadingState } from "@repo/ui";

export default async function StaffRosterPage() {
  const [rosterRes, profileRes] = await Promise.all([
    getStaffRoster({ role: "ALL", status: "ALL", search: "" }),
    getStaffSelfProfile(),
  ]);

  const initialStaff = rosterRes.success && rosterRes.data ? rosterRes.data : [];
  const initialCurrentUserRole =
    profileRes.success && profileRes.data ? profileRes.data.role : "ADMIN";

  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
          <LoadingState variant="page" label="Loading staff roster..." />
        </div>
      }
    >
      <StaffRosterClient
        initialStaff={initialStaff}
        initialCurrentUserRole={initialCurrentUserRole}
      />
    </Suspense>
  );
}
