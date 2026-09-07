import { getMyAttendanceHistory } from "@/features/attendance/actions";
import { StaffAttendanceClient } from "./StaffAttendanceClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Duty Attendance & Timesheets | JAXIS StatLab",
  description: "Review personal clock-in records, shift history, and file timesheet corrections.",
};

export default async function StaffAttendancePage() {
  const initialData = await getMyAttendanceHistory();
  return <StaffAttendanceClient initialData={initialData} />;
}
