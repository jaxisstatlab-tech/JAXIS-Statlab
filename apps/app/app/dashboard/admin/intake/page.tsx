import React, { Suspense } from "react";
import { getProjects } from "@/features/projects/actions";
import { getCommercialCatalog } from "@/features/quotations/actions";
import { AdminIntakeClient } from "./AdminIntakeClient";
import { LoadingState } from "@repo/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New study requests | JAXIS StatLab",
  description: "Read new study requests, ask clients for anything missing, and price each study.",
};

export default async function AdminIntakeTriagePage() {
  const [projectsRes, catalogData] = await Promise.all([
    getProjects(),
    getCommercialCatalog(),
  ]);

  const initialProjects = projectsRes.success && projectsRes.data ? projectsRes.data : [];

  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
          <LoadingState variant="page" label="Loading new study requests..." />
        </div>
      }
    >
      <AdminIntakeClient
        initialProjects={initialProjects}
        initialCatalog={catalogData || undefined}
      />
    </Suspense>
  );
}
