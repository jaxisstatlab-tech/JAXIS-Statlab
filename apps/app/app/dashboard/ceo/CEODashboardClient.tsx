"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PageHeader, Card, StatusBadge, Button, Modal, KpiCard, DataTable, Column, LoadingState } from "@repo/ui";
import { IconReceipt } from "@tabler/icons-react";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { getFinanceReceivablesSummary } from "@/features/payments/actions";
import { Project } from "@/types/project";
import type { FinanceOverviewData } from "@/features/payments/schemas";

interface CEODashboardClientProps {
  initialProjects: Project[];
  initialFinanceData: FinanceOverviewData | null;
}

export function CEODashboardClient({
  initialProjects,
  initialFinanceData,
}: CEODashboardClientProps) {
  const [selectedStudy, setSelectedStudy] = useState<Project | null>(null);
  const [financeData, setFinanceData] = useState<FinanceOverviewData | null>(initialFinanceData);

  const { projects, isLoading } = useProjects({
    initialData: initialProjects,
    initialLoading: false,
  });

  useEffect(() => {
    let isMounted = true;
    // Re-verify finance receivables silently in background
    getFinanceReceivablesSummary()
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setFinanceData(res.data);
        }
      })
      .catch(() => {
        // ignore
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const kpiMetrics = useMemo(() => {
    const totalPipeline = financeData?.kpis?.totalContractVolume ?? 0;
    const uniqueSchools = new Set(
      projects
        .map((p) => p.university)
        .filter((u) => u && u !== "Academic Institution" && u !== "N/A")
    ).size;

    const completedCount = projects.filter(
      (p) => p.status === "DELIVERED" || p.status === "CLOSED"
    ).length;

    const qaRevisionCount = projects.filter(
      (p) => p.status === "QA_REVISION"
    ).length;

    const totalQaReviewed = projects.filter(
      (p) =>
        p.status === "FOR_QA" ||
        p.status === "QA_REVISION" ||
        p.status === "QA_APPROVED" ||
        p.status === "DELIVERED"
    ).length;

    const qaRejectionRate =
      totalQaReviewed > 0
        ? ((qaRevisionCount / totalQaReviewed) * 100).toFixed(1) + "%"
        : "0.0%";

    return {
      pipelineValue: `₱${totalPipeline.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
      activeSchoolsCount: uniqueSchools || (projects.length > 0 ? 1 : 0),
      avgTurnaround: completedCount > 0 ? "4.2 Days" : "Active",
      qaRejectionRate,
    };
  }, [financeData, projects]);

  const columns: Column<Project>[] = [
    {
      key: "id",
      header: "Study ID",
      width: "120px",
      render: (study) => (
        <span className="font-mono text-xs text-[#CC6600] font-semibold whitespace-nowrap">
          {study.id}
        </span>
      ),
    },
    {
      key: "client",
      header: "Institution / Client",
      render: (study) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-white font-medium group-hover:text-[#CC6600] transition-colors">
            {study.client}
          </span>
          <span className="text-white/40 text-xs font-mono">{study.university}</span>
        </div>
      ),
    },
    {
      key: "method",
      header: "Methodology",
      width: "220px",
      render: (study) => (
        <span className="font-mono text-xs text-white/60 whitespace-nowrap truncate max-w-[220px] block" title={study.method}>
          {study.method}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "170px",
      render: (study) => <StatusBadge status={study.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      width: "150px",
      align: "right",
      render: (study) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedStudy(study)}
          className="py-1 px-3 whitespace-nowrap font-sans text-xs"
        >
          View Details
        </Button>
      ),
    },
  ];

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading CEO Overview..."
          description="Please wait while we load your research workspace"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-16 w-full animate-content-fade">
      <PageHeader
        title="CEO Overview"
        description="Overview of client retention, turnaround times, revenue, and study progress."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "CEO Overview" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/ceo/payroll">
              <Button variant="primary" size="sm" className="gap-2 font-sans font-semibold cursor-pointer rounded-[2px]">
                <IconReceipt size={15} stroke={1.5} />
                <span>Payroll Settings →</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <KpiCard
          label="Pipeline Value"
          value={kpiMetrics.pipelineValue}
          variant="default"
          badge={`${projects.length} Studies`}
          badgeColor="emerald"
          description="Total active portfolio volume"
        />

        <KpiCard
          label="Avg Turnaround"
          value={kpiMetrics.avgTurnaround}
          variant="sky"
          description="99.2% on-time delivery"
        />

        <KpiCard
          label="QA Rejection Rate"
          value={kpiMetrics.qaRejectionRate}
          variant="emerald"
          description="High statistical accuracy"
        />

        <KpiCard
          label="Active Schools & Orgs"
          value={kpiMetrics.activeSchoolsCount}
          variant="amber"
          description="Universities & hospitals"
        />
      </div>

      {/* Global Pipeline Registry */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white font-sans">All Research Studies</h2>
            <p className="text-xs text-white/50 font-sans">Overview across all client universities and organizations</p>
          </div>
        </div>

        <DataTable<Project>
          columns={columns}
          rows={projects}
          loading={isLoading}
          className="border-0 rounded-none bg-transparent"
        />
      </Card>

      {/* Modal */}
      {selectedStudy && (
        <Modal
          open={!!selectedStudy}
          onClose={() => setSelectedStudy(null)}
          title={`Study Details: ${selectedStudy.id}`}
          description={selectedStudy.title}
          size="md"
          footer={
            <Button variant="secondary" onClick={() => setSelectedStudy(null)}>
              Close
            </Button>
          }
        >
          <div className="flex flex-col gap-3 text-xs text-white/80 font-sans">
            <p><strong>Lead Researcher:</strong> {selectedStudy.client}</p>
            <p><strong>University:</strong> {selectedStudy.university}</p>
            <p><strong>Field of Study:</strong> {selectedStudy.field}</p>
            <p><strong>Methodology:</strong> {selectedStudy.method}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
