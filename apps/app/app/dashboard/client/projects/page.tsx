import { getProjects } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { ClientProjectsListClient } from "./ClientProjectsListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Research Projects | JAXIS StatLab",
  description: "Track statistical analysis, review deliverables, and communicate with assigned specialists.",
};

export default async function ClientProjectsListPage() {
  const [projectsRes, profile] = await Promise.all([
    getProjects({ status: "ALL", search: "" }),
    getClientProfile(),
  ]);

  const initialProjects = projectsRes.success ? projectsRes.data : [];
  const initialProfileComplete = Boolean(
    profile && profile.institutionSchool && profile.contactNumber
  );

  return (
    <ClientProjectsListClient
      initialProjects={initialProjects}
      initialProfileComplete={initialProfileComplete}
    />
  );
}
