import React, { Suspense } from "react";
import { getProjects } from "@/features/projects/actions";
import { getCommercialCatalog } from "@/features/quotations/actions";
import { getVolunteerSummary } from "@/features/volunteers/actions";
import { AdminIntakeClient } from "./AdminIntakeClient";
import { LoadingState } from "@repo/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studies | JAXIS StatLab",
  description: "Every study, from the client's request to delivery: check new requests, price them, and find finished studies.",
};

export default async function AdminIntakeTriagePage() {
  const [projectsRes, catalogData, offersRes] = await Promise.all([
    getProjects(),
    getCommercialCatalog(),
    // Analysts who offered to take each study (Open Studies).
    getVolunteerSummary().catch(() => null),
  ]);

  const initialProjects = projectsRes.success && projectsRes.data ? projectsRes.data : [];

  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
          <LoadingState variant="page" label="Loading studies..." />
        </div>
      }
    >
      <AdminIntakeClient
        initialProjects={initialProjects}
        initialCatalog={catalogData || undefined}
        offers={offersRes && offersRes.success ? offersRes.data : {}}
      />
    </Suspense>
  );
}
