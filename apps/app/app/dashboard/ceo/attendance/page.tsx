import { getCeoAttendanceAuditVault } from "@/features/attendance/actions";
import { getPayrollConfigurations } from "@/features/payroll/actions";
import { usesTimeClock } from "@/features/payroll/schemas";
import { CeoAttendanceAuditClient, type ClockUser } from "./CeoAttendanceAuditClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Timesheets | JAXIS StatLab",
  description: "Clock-in records for staff paid by the hour, and the rules for the time clock.",
};

export default async function CeoAttendanceAuditPage() {
  const [initialData, pay] = await Promise.all([
    getCeoAttendanceAuditVault(),
    getPayrollConfigurations().catch(() => null),
  ]);
  // Who uses the time clock: anyone whose pay (their own setting, or their role's) is Hourly Wage.
  const clockUsers: ClockUser[] | null = pay
    ? pay.staffMembers
        .filter((m) => m.status !== "TERMINATED" && usesTimeClock(m.effectiveConfig.compensationType))
        .map((m) => ({ id: m.id, name: m.fullName, role: m.role, personal: Boolean(m.overrideConfig) }))
    : null;
  return <CeoAttendanceAuditClient initialData={initialData} clockUsers={clockUsers} />;
}
