import { redirect } from "next/navigation";
import { getMyAttendanceHistory } from "@/features/attendance/actions";
import { getTimeClockAccess } from "@/features/payroll/actions";
import { StaffAttendanceClient } from "./StaffAttendanceClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Duty Attendance & Timesheets | JAXIS StatLab",
  description: "Review personal clock-in records, shift history, and file timesheet corrections.",
};

export default async function StaffAttendancePage() {
  // Timesheets are only for staff paid by the hour; everyone else has nothing to see here.
  const timeClock = await getTimeClockAccess();
  if (!timeClock.enabled) redirect("/dashboard/staff/hr");
  const initialData = await getMyAttendanceHistory();
  return <StaffAttendanceClient initialData={initialData} />;
}
