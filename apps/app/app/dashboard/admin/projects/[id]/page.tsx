import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjectById } from "@/features/projects/actions";
import { getQuotationByProject, getCommercialCatalog } from "@/features/quotations/actions";
import { getSOWByProject } from "@/features/sow/actions";
import { getProjectAssignment } from "@/features/assignments/actions";
import { AdminStudyOverview } from "./AdminStudyOverview";

export const metadata: Metadata = {
  title: "Study | JAXIS StatLab",
  description: "Everything about one study: what's next, the client's request, price, agreement, team and files.",
};

export const dynamic = "force-dynamic";

// Loaded on the server in one go (it used to load in the browser after the page appeared, behind a spinner).
export default async function AdminStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [projectRes, quotation, assignRes, sowRes, catalog] = await Promise.all([
    getProjectById(id),
    getQuotationByProject(id).catch(() => null),
    getProjectAssignment(id).catch(() => null),
    getSOWByProject(id).catch(() => null),
    getCommercialCatalog().catch(() => undefined),
  ]);

  if (!projectRes.success) {
    if (projectRes.error.code === "NOT_FOUND" || projectRes.error.code === "PROJECT_NOT_FOUND") notFound();
    return <AdminStudyOverview loadError={projectRes.error.message} />;
  }

  return (
    <AdminStudyOverview
      project={projectRes.data}
      quotation={quotation}
      assignment={assignRes && assignRes.success ? assignRes.data : null}
      sow={sowRes && sowRes.success ? sowRes.data : null}
      catalog={catalog ?? undefined}
    />
  );
}
