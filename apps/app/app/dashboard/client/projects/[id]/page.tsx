import React, { Suspense } from "react";
import type { Metadata } from "next";
import { getProjectById } from "@/features/projects/actions";
import { ClientProjectDetailClient } from "./ClientProjectDetailClient";
import { LoadingState } from "@repo/ui";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const res = await getProjectById(resolvedParams.id);
  if (res.success && res.data) {
    return {
      title: `${res.data.intakeId} – ${res.data.researchTitle} | JAXIS StatLab`,
      description:
        res.data.researchObjectives ||
        "Research study detail, deliverables, and progress tracking.",
    };
  }
  return {
    title: "Study Details | JAXIS StatLab",
    description: "Research study detail, deliverables, and progress tracking.",
  };
}

export default async function ClientProjectDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  const res = await getProjectById(projectId);

  const initialProject = res.success ? res.data : null;
  const initialError = !res.success ? res.error.message : null;

  return (
    <Suspense
      fallback={
        <div className="py-24 flex justify-center items-center">
          <LoadingState variant="page" label="Loading study details..." />
        </div>
      }
    >
      <ClientProjectDetailClient
        projectId={projectId}
        initialProject={initialProject}
        initialError={initialError}
      />
    </Suspense>
  );
}
