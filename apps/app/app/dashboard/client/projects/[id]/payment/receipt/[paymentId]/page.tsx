import React from "react";
import { getStudyOnce } from "@/features/projects/study-cache";
import { getPaymentsByProject } from "@/features/payments/actions";
import { ClientReceiptView } from "./ClientReceiptView";

interface PageProps {
  params: Promise<{ id: string; paymentId: string }>;
}

// The study comes from the layout's per-request cache; payments are read in parallel.
export default async function ClientPaymentReceiptPage({ params }: PageProps) {
  const { id, paymentId } = await params;
  const [studyRes, payRes] = await Promise.all([getStudyOnce(id), getPaymentsByProject(id).catch(() => null)]);
  return (
    <ClientReceiptView
      projectId={id}
      paymentId={paymentId}
      initialProject={studyRes.success ? studyRes.data : null}
      initialData={payRes && payRes.success ? payRes.data : null}
    />
  );
}
