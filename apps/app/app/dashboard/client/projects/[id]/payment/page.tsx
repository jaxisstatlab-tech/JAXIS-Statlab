import React from "react";
import { getStudyOnce } from "@/features/projects/study-cache";
import { getPaymentChannels, getPaymentsByProject } from "@/features/payments/actions";
import { ClientPaymentView } from "./ClientPaymentView";

interface PageProps {
  params: Promise<{ id: string }>;
}

// The study comes from the layout's per-request cache; payments and our GCash / bank accounts are read in parallel.
export default async function ClientProjectPaymentPage({ params }: PageProps) {
  const { id } = await params;
  const [studyRes, payRes, channelRes] = await Promise.all([
    getStudyOnce(id),
    getPaymentsByProject(id).catch(() => null),
    getPaymentChannels().catch(() => null),
  ]);
  return (
    <ClientPaymentView
      projectId={id}
      initialProject={studyRes.success ? studyRes.data : null}
      initialData={payRes && payRes.success ? payRes.data : null}
      channels={channelRes && channelRes.success ? channelRes.data.filter((c) => c.isEnabled !== false) : null}
    />
  );
}
