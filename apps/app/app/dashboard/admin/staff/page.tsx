import React, { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getStaffRoster } from "@/features/staff/actions";
import { StaffRosterClient } from "./StaffRosterClient";
import { LoadingState } from "@repo/ui";

export default async function StaffRosterPage() {
  // The role comes from the sign-in session (the same one the sidebar shows), so the CEO always gets the
  // CEO-only actions. It used to come from a profile lookup that fell back to "admin" when it failed.
  // The server actions check the role again, so this only decides which buttons are shown.
  const [rosterRes, session] = await Promise.all([getStaffRoster({ role: "ALL", status: "ALL", search: "" }), auth()]);

  const initialStaff = rosterRes.success && rosterRes.data ? rosterRes.data : [];
  const initialCurrentUserRole = session?.user?.role ?? "ADMIN";

  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
          <LoadingState variant="page" label="Loading staff..." />
        </div>
      }
    >
      <StaffRosterClient initialStaff={initialStaff} initialCurrentUserRole={initialCurrentUserRole} />
    </Suspense>
  );
}
