import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAnalysisWorkbenchData } from "@/features/analysis/actions";
import { AnalysisWorkbenchDesk } from "@/features/analysis/components/AnalysisWorkbenchDesk";
import { Card, Button, PageHeader } from "@repo/ui";
import { IconAlertTriangle, IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";

interface StatisticianWorkbenchPageProps {
  params: Promise<{ id: string }>;
}

export default async function StatisticianWorkbenchPage({
  params,
}: StatisticianWorkbenchPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const res = await getAnalysisWorkbenchData(id);

  if (!res.success) {
    if (res.error.code === "PROJECT_NOT_FOUND") {
      notFound();
    }

    return (
      <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
        <PageHeader
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "STATISTICAL ANALYST", href: "/dashboard/statistician" },
            { label: "WORKBENCH" },
          ]}
          title="Access Restricted"
          description="You do not have authorization to view this analytical workbench."
        />

        <Card className="p-8 bg-[#0A0A18] border border-red-500/30 rounded-[2px] flex flex-col items-center text-center gap-4">
          <IconAlertTriangle size={36} stroke={2} className="text-red-400" />
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold text-white">Workbench Authorization Error</h2>
            <p className="text-xs text-white/70 max-w-md">
              {res.error.message || "Only the assigned Lead Statistical Analyst or Senior QA Lead can access this study workspace."}
            </p>
          </div>
          <Link href="/dashboard/statistician">
            <Button variant="secondary" size="sm" className="rounded-[2px] text-xs gap-1.5 mt-2">
              <IconArrowLeft size={14} stroke={2} />
              <span>Return to Dashboard</span>
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return <AnalysisWorkbenchDesk initialData={res.data} />;
}
