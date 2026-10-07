import { getProjects } from "@/features/projects/actions";
import { getStaffCapacity } from "@/features/assignments/actions";
import { getPickedStudies } from "@/features/volunteers/actions";
import { AssignmentsClient } from "./AssignmentsClient";

export const metadata = {
  title: "Expert Assignments & Workload | JAXIS StatLab",
  description: "Assign Lead Statistical Analysts and QA Leads to paid studies and manage workload.",
};

export const dynamic = "force-dynamic";

export default async function AdminAssignmentsPage() {
  const [projRes, capRes, pickRes] = await Promise.all([
    getProjects({ status: "ACTIVE" }),
    getStaffCapacity(),
    // Analysts picked from "I'll take this study" offers, waiting for the deposit.
    getPickedStudies().catch(() => null),
  ]);

  const initialProjects = projRes.success && projRes.data ? projRes.data : [];
  const initialStatisticians = capRes.success && capRes.data ? capRes.data.statisticians : [];
  const initialQaLeads = capRes.success && capRes.data ? capRes.data.qaLeads : [];

  return (
    <AssignmentsClient
      initialProjects={initialProjects}
      initialStatisticians={initialStatisticians}
      initialQaLeads={initialQaLeads}
      picks={pickRes && pickRes.success ? pickRes.data : []}
    />
  );
}
