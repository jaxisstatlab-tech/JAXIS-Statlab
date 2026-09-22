import React from "react";
import type { Metadata } from "next";
import { projectService } from "@/features/projects/services/project.service";
import { getFinanceReceivablesSummary } from "@/features/payments/actions";
import { db } from "@/lib/db";
import { CEODashboardClient } from "./CEODashboardClient";

export const metadata: Metadata = {
  title: "CEO Overview | JAXIS StatLab",
  description: "Executive oversight of study progress, revenue, turnaround times, and client retention.",
};

export const dynamic = "force-dynamic";

export default async function CEODashboardPage() {
  try {
    await db.authAuditLog.create({
      data: {
        event: "SSR_CEO_PAGE_START",
        email: "ceo_page_entry",
      },
    });
  } catch {
    // ignore
  }

  let initialProjects: any[] = [];
  let initialFinanceData = null;

  try {
    const [projectsRes, financeRes] = await Promise.allSettled([
      projectService.getProjects(),
      getFinanceReceivablesSummary(),
    ]);

    if (projectsRes.status === "fulfilled") {
      initialProjects = projectsRes.value || [];
    } else {
      console.warn("[CEODashboardPage] Failed to prefetch projects:", projectsRes.reason);
    }

    if (financeRes.status === "fulfilled" && financeRes.value?.success && financeRes.value?.data) {
      initialFinanceData = financeRes.value.data;
    } else if (financeRes.status === "rejected") {
      console.warn("[CEODashboardPage] Failed to prefetch finance summary:", financeRes.reason);
    }
  } catch (err) {
    console.warn("[CEODashboardPage] SSR prefetch exception caught:", err);
  }

  try {
    await db.authAuditLog.create({
      data: {
        event: "SSR_CEO_PAGE_FINISH",
        email: "ceo_page_returning_jsx",
        metadata: {
          projectsCount: initialProjects.length,
          hasFinanceData: !!initialFinanceData,
        },
      },
    });
  } catch {
    // ignore
  }

  return (
    <CEODashboardClient
      initialProjects={initialProjects}
      initialFinanceData={initialFinanceData}
    />
  );
}

