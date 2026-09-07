import { getCeoAttendanceAuditVault } from "@/features/attendance/actions";
import { CeoAttendanceAuditClient } from "./CeoAttendanceAuditClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Attendance & Duty Audit Ledger | JAXIS StatLab",
  description: "Executive timesheet audit, shift logs, and labor policy configurations.",
};

export default async function CeoAttendanceAuditPage() {
  const initialData = await getCeoAttendanceAuditVault();
  return <CeoAttendanceAuditClient initialData={initialData} />;
}
