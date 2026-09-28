import React from "react";
import { getStudyOnce } from "@/features/projects/study-cache";
import { getPaymentsByProject } from "@/features/payments/actions";
import { ClientPaymentView } from "./ClientPaymentView";

interface PageProps {
  params: Promise<{ id: string }>;
}

// The study comes from the layout's per-request cache; payments are read in parallel.
export default async function ClientProjectPaymentPage({ params }: PageProps) {
  const { id } = await params;
  const [studyRes, payRes] = await Promise.all([getStudyOnce(id), getPaymentsByProject(id).catch(() => null)]);
  return (
    <ClientPaymentView
      projectId={id}
      initialProject={studyRes.success ? studyRes.data : null}
      initialData={payRes && payRes.success ? payRes.data : null}
    />
  );
}
