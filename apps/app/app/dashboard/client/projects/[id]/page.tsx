import React, { Suspense } from "react";
import type { Metadata } from "next";
import { getStudyOnce } from "@/features/projects/study-cache";
import { ClientProjectDetailClient } from "./ClientProjectDetailClient";
import { LoadingState } from "@repo/ui";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const res = await getStudyOnce(resolvedParams.id);
  if (res.success && res.data) {
    return {
      title: `${res.data.intakeId} – ${res.data.researchTitle} | JAXIS StatLab`,
      description:
        res.data.researchObjectives ||
        "Where your study stands, what you sent, and what to do next.",
    };
  }
  return {
    title: "Your study | JAXIS StatLab",
    description: "Where your study stands, what you sent, and what to do next.",
  };
}

export default async function ClientProjectDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  const res = await getStudyOnce(projectId);

  const initialProject = res.success ? res.data : null;
  const initialError = !res.success ? res.error.message : null;

  return (
    <Suspense
      fallback={
        <div className="py-24 flex justify-center items-center">
          <LoadingState variant="page" label="Loading your study..." />
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
