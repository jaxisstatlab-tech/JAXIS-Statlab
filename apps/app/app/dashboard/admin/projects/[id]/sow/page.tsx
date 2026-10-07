import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjectById } from "@/features/projects/actions";
import { getQuotationByProject } from "@/features/quotations/actions";
import { getSOWByProject } from "@/features/sow/actions";
import { AdminAgreementDesk } from "./AdminAgreementDesk";

export const metadata: Metadata = {
  title: "Agreement | JAXIS StatLab",
  description: "Draft the study's agreement, send it for signing, and see the signed copy.",
};

export const dynamic = "force-dynamic";

export default async function AdminAgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [projectRes, quotation, sowRes] = await Promise.all([
    getProjectById(id),
    getQuotationByProject(id).catch(() => null),
    getSOWByProject(id).catch(() => null),
  ]);

  if (!projectRes.success) {
    if (projectRes.error.code === "NOT_FOUND" || projectRes.error.code === "PROJECT_NOT_FOUND") notFound();
    return <AdminAgreementDesk loadError={projectRes.error.message} />;
  }

  return (
    <AdminAgreementDesk
      project={projectRes.data}
      quotation={quotation}
      sow={sowRes && sowRes.success ? sowRes.data : null}
    />
  );
}
