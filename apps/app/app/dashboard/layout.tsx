import React from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { auth } from "@/lib/auth";
import type { RoleName } from "@prisma/client";
import { getClientProfile } from "@/features/client-profile/actions";
import { getActiveShift } from "@/features/attendance/actions";
import { getUnreadMessagesCount } from "@/features/messaging/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;
  const userRole = (user?.role as RoleName) || "ADMIN";
  const userFullName = user?.fullName || user?.name || "Dr. Aris Thorne";
  const userEmail = user?.email || "admin@jaxis.dev";

  let clientProfileIncomplete = false;
  if (userRole === "CLIENT" && user?.id) {
    const profile = await getClientProfile();
    if (!profile || !profile.institutionSchool || !profile.contactNumber) {
      clientProfileIncomplete = true;
    }
  }

  const isInternal = ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN", "CEO"].includes(userRole);
  const initialActiveShift = isInternal ? await getActiveShift() : null;
  const initialUnreadMessagesCount = await getUnreadMessagesCount();

  return (
    <DashboardShell
      userFullName={userFullName}
      userRole={userRole}
      userEmail={userEmail}
      clientProfileIncomplete={clientProfileIncomplete}
      initialActiveShift={initialActiveShift}
      initialUnreadMessagesCount={initialUnreadMessagesCount}
    >
      {children}
    </DashboardShell>
  );
}
