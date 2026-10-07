import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjectById } from "@/features/projects/actions";
import { getPaymentsByProject } from "@/features/payments/actions";
import { AdminPaymentDesk } from "./AdminPaymentDesk";

export const metadata: Metadata = {
  title: "Payment | JAXIS StatLab",
  description: "What the study costs, what's been paid, and the client's receipts.",
};

export const dynamic = "force-dynamic";

export default async function AdminPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [projectRes, payRes] = await Promise.all([getProjectById(id), getPaymentsByProject(id).catch(() => null)]);

  if (!projectRes.success) {
    if (projectRes.error.code === "NOT_FOUND" || projectRes.error.code === "PROJECT_NOT_FOUND") notFound();
    return <AdminPaymentDesk loadError={projectRes.error.message} />;
  }
  if (!payRes || !payRes.success) {
    return <AdminPaymentDesk loadError={payRes && !payRes.success ? payRes.error.message : "The payments didn't load."} />;
  }
  return <AdminPaymentDesk project={projectRes.data} data={payRes.data} />;
}
