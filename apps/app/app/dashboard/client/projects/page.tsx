import { getProjects } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { ClientProjectsListClient } from "./ClientProjectsListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All studies | JAXIS StatLab",
  description: "Every study you've sent, where it stands, and what to do next.",
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
