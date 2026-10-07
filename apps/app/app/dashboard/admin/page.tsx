import React from "react";
import type { Metadata } from "next";
import { getProjects } from "@/features/projects/actions";
import { getFinanceReceivablesSummary } from "@/features/payments/actions";
import { getVolunteerSummary } from "@/features/volunteers/actions";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin Overview | JAXIS StatLab",
  description: "What needs you today, where every study is, and what's due soon.",
};

export const dynamic = "force-dynamic";

// Loaded on the server; the page comes back quietly when you return to the tab.
export default async function AdminDashboardPage() {
  const [projectsRes, financeRes, offersRes] = await Promise.all([
    getProjects().catch(() => null),
    getFinanceReceivablesSummary().catch(() => null),
    getVolunteerSummary().catch(() => null),
  ]);

  return (
    <AdminDashboardClient
      projects={projectsRes && projectsRes.success ? projectsRes.data : []}
      failed={!projectsRes || !projectsRes.success}
      finance={financeRes && financeRes.success && financeRes.data ? financeRes.data : null}
      offers={offersRes && offersRes.success ? offersRes.data : {}}
    />
  );
}
