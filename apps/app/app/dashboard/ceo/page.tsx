import React from "react";
import type { Metadata } from "next";
import { projectService } from "@/features/projects/services/project.service";
import { getFinanceReceivablesSummary } from "@/features/payments/actions";
import { CEODashboardClient } from "./CEODashboardClient";

export const metadata: Metadata = {
  title: "CEO Overview | JAXIS StatLab",
  description: "Executive oversight of study progress, revenue, turnaround times, and client retention.",
};

export const dynamic = "force-dynamic";

export default async function CEODashboardPage() {
  const [initialProjects, financeRes] = await Promise.all([
    projectService.getProjects(),
    getFinanceReceivablesSummary(),
  ]);

  return (
    <CEODashboardClient
      initialProjects={initialProjects}
      initialFinanceData={financeRes.success && financeRes.data ? financeRes.data : null}
    />
  );
}
