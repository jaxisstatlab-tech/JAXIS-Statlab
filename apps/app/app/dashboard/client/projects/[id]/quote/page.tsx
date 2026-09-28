import React from "react";
import { getStudyOnce } from "@/features/projects/study-cache";
import { getQuotationByProject } from "@/features/quotations/actions";
import { ClientQuoteView } from "./ClientQuoteView";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Loads the study (already cached for this request by the study layout) and the price on the
// server, so the tab opens with its content instead of a spinner and extra browser round trips.
export default async function ClientQuotationReviewPage({ params }: PageProps) {
  const { id } = await params;
  const [studyRes, quotation] = await Promise.all([getStudyOnce(id), getQuotationByProject(id).catch(() => null)]);
  return (
    <ClientQuoteView
      projectId={id}
      initialProject={studyRes.success ? studyRes.data : null}
      initialQuotation={quotation}
      initialError={studyRes.success ? null : studyRes.error.message}
    />
  );
}
