import { getProjects } from "@/features/projects/actions";
import { getStaffCapacity } from "@/features/assignments/actions";
import { AssignmentsClient } from "./AssignmentsClient";

export const metadata = {
  title: "Expert Assignments & Workload | JAXIS StatLab",
  description: "Assign Lead Statisticians and QA Leads to paid studies and manage workload.",
};

export const dynamic = "force-dynamic";

export default async function AdminAssignmentsPage() {
  const [projRes, capRes] = await Promise.all([
    getProjects({ status: "ACTIVE" }),
    getStaffCapacity(),
  ]);

  const initialProjects = projRes.success && projRes.data ? projRes.data : [];
  const initialStatisticians = capRes.success && capRes.data ? capRes.data.statisticians : [];
  const initialQaLeads = capRes.success && capRes.data ? capRes.data.qaLeads : [];

  return (
    <AssignmentsClient
      initialProjects={initialProjects}
      initialStatisticians={initialStatisticians}
      initialQaLeads={initialQaLeads}
    />
  );
}
