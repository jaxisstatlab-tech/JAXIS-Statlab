import { getSpecialistLeaveOverview } from "@/features/staff/actions";
import { SpecialistLeaveApprovalsClient } from "./SpecialistLeaveApprovalsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Specialist Leave Approvals | JAXIS StatLab",
  description: "Review staff leave requests, authorize absence windows, and govern specialist availability.",
};

export default async function SpecialistLeaveApprovalsPage() {
  const res = await getSpecialistLeaveOverview();
  const initialData = res.success && res.data ? res.data : null;

  return <SpecialistLeaveApprovalsClient initialData={initialData} />;
}
