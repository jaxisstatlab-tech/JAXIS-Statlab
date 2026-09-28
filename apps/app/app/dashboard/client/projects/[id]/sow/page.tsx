import React from "react";
import { getStudyOnce } from "@/features/projects/study-cache";
import { getSOWByProject } from "@/features/sow/actions";
import { ClientSowView } from "./ClientSowView";

interface PageProps {
  params: Promise<{ id: string }>;
}

// The study comes from the layout's per-request cache; the agreement is read in parallel.
export default async function ClientSowPage({ params }: PageProps) {
  const { id } = await params;
  const [studyRes, sowRes] = await Promise.all([getStudyOnce(id), getSOWByProject(id).catch(() => null)]);
  return (
    <ClientSowView
      projectId={id}
      initialProject={studyRes.success ? studyRes.data : null}
      initialSow={sowRes && sowRes.success ? sowRes.data : null}
      initialError={studyRes.success ? null : studyRes.error.message}
    />
  );
}
