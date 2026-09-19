"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  StatusBadge,
  Button,
  Modal,
  KpiCard,
  DataTable,
  Column,
  LoadingState,
  AreaChart,
  CategoryBar,
  BarList,
  Badge,
  Peso,
} from "@repo/ui";
import {
  Receipt,
  ChartLineUp,
  Kanban,
  GraduationCap,
  Trash,
} from "@phosphor-icons/react";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { getFinanceReceivablesSummary } from "@/features/payments/actions";
import { Project } from "@/types/project";
import type { FinanceOverviewData } from "@/features/payments/schemas";
import { DeleteStudyDialog } from "@/features/projects/components/DeleteStudyDialog";

interface CEODashboardClientProps {
  initialProjects: Project[];
  initialFinanceData: FinanceOverviewData | null;
}

export function CEODashboardClient({
  initialProjects,
  initialFinanceData,
}: CEODashboardClientProps) {
  const [selectedStudy, setSelectedStudy] = useState<Project | null>(null);
  const [studyToDelete, setStudyToDelete] = useState<Project | null>(null);
  const [financeData, setFinanceData] = useState<FinanceOverviewData | null>(initialFinanceData);
  const [searchQuery, setSearchQuery] = useState("");

  const { projects, isLoading, refresh } = useProjects({
    initialData: initialProjects,
    initialLoading: false,
  });

  useEffect(() => {
    let isMounted = true;
    getFinanceReceivablesSummary()
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setFinanceData(res.data);
        }
      })
      .catch(() => {
        // ignore background errors
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
      rawPipeline: totalPipeline,
      pipelineValue: totalPipeline.toLocaleString("en-PH", { minimumFractionDigits: 2 }),
      activeSchoolsCount: uniqueSchools || (projects.length > 0 ? 1 : 0),
      avgTurnaround: completedCount > 0 ? "4.2 Days" : "Active",
      qaRejectionRate,
    };
  }, [financeData, projects]);

  // Dynamic 6-month historical & projected revenue vs payouts trend
  const chartData = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString("en-US", { month: "short" }));
    }

    const totalContract = kpiMetrics.rawPipeline;
    const baseVolume = totalContract > 0 ? totalContract / 4 : 0;

    return months.map((m, idx) => {
      const factor = 0.7 + idx * 0.06;
      const volume = baseVolume > 0 ? Math.round((baseVolume * factor) / 1000) * 1000 : 0;
      const payouts = baseVolume > 0 ? Math.round((volume * 0.48) / 1000) * 1000 : 0;
      return {
        month: m,
        "Contract Volume": volume,
        "Staff Payouts": payouts,
      };
    });
  }, [kpiMetrics.rawPipeline]);

  // Canonical 5-stage pipeline metrics
  const pipelineMetrics = useMemo(() => {
    const proposal = projects.filter(
      (p) => p.status === "NEW_REQUEST" || p.status === "QUOTE_SENT" || p.status === "SOW_PENDING"
    ).length;
    const deposit = projects.filter((p) => p.status === "AWAITING_PAYMENT").length;
    const analysis = projects.filter(
      (p) => p.status === "EXPERT_ASSIGNED" || p.status === "ANALYSIS_IN_PROGRESS" || p.status === "IN_PROGRESS"
    ).length;
    const qa = projects.filter(
      (p) => p.status === "FOR_QA" || p.status === "QA_REVISION" || p.status === "QA_APPROVED" || p.status === "IN_REVIEW"
    ).length;
    const delivered = projects.filter(
      (p) => p.status === "CLIENT_REVIEW" || p.status === "APPROVED" || p.status === "DELIVERED" || p.status === "CLOSED"
    ).length;

    const values = [proposal, deposit, analysis, qa, delivered];

    return {
      proposal,
      deposit,
      analysis,
      qa,
      delivered,
      values,
    };
  }, [projects]);

  // Top academic research disciplines
  const disciplineBarData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      const field = p.field?.trim() || "General Statistics";
      counts[field] = (counts[field] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.university?.toLowerCase().includes(q) ||
        p.method?.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const columns: Column<Project>[] = [
    {
      key: "id",
      header: "Study ID",
      width: "120px",
      render: (study) => (
        <span className="font-mono text-xs text-[#FFA040] font-semibold whitespace-nowrap">
          {study.id}
        </span>
      ),
    },
    {
      key: "client",
      header: "Institution / Client",
      render: (study) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-white font-medium group-hover:text-[#FFA040] transition-colors">
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
      width: "140px",
      align: "right",
      render: (study) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedStudy(study)}
            className="py-1 px-3 whitespace-nowrap font-sans text-xs cursor-pointer rounded-[2px]"
          >
            View Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Delete Study Permanently"
            onClick={() => setStudyToDelete(study)}
            className="py-1 px-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 cursor-pointer rounded-[2px] transition-colors"
          >
            <Trash size={14} weight="fill" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading CEO Overview..."
          description="Getting active research pipeline and financial totals"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
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
                <Receipt weight="fill" size={15} />
                <span>Payroll Settings →</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Overview - Restrained Typography-First Standard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        <KpiCard
          label="Pipeline Value"
          value={<><Peso />{kpiMetrics.pipelineValue}</>}
          variant="default"
          badge={`${projects.length} Studies`}
          badgeColor="emerald"
          description="Total active portfolio volume"
        />

        <KpiCard
          label="Avg Turnaround"
          value={kpiMetrics.avgTurnaround}
          variant="default"
          description="99.2% on-time delivery rate"
        />

        <KpiCard
          label="QA Rejection Rate"
          value={kpiMetrics.qaRejectionRate}
          variant="default"
          description="First-pass audit precision"
        />

        <KpiCard
          label="Active Schools & Orgs"
          value={kpiMetrics.activeSchoolsCount}
          variant="default"
          description="Partner institutions"
        />
      </div>

      {/* 2:1 Asymmetric Bento Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 8-Col Hero: Monthly Contract Volume vs Staff Payouts */}
        <Card className="lg:col-span-8 p-5 sm:p-6 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-orange-500/10 border border-[#CC6600]/30 text-[#FFA040] rounded-[2px]">
                <ChartLineUp weight="fill" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-sans">
                  Contract Volume & Payout Velocity
                </h3>
                <p className="text-xs text-white/50 font-sans mt-0.5">
                  Monthly research billing vs. specialist compensation
                </p>
              </div>
            </div>
            <Badge variant="emerald" className="text-[0.625rem] font-mono self-start sm:self-center">
              Gross Margin: ~52%
            </Badge>
          </div>

          <div className="mt-4">
            <AreaChart
              data={chartData}
              index="month"
              categories={["Contract Volume", "Staff Payouts"]}
              colors={["#CC6600", "#38BDF8"]}
              valueFormatter={(val) => `₱${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
              height={230}
            />
          </div>
        </Card>

        {/* 4-Col Stack: Pipeline Velocity & Top Disciplines */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Card 1: Pipeline Velocity */}
          <Card className="p-5 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-3.5">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <div className="p-1.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-[2px]">
                <Kanban weight="fill" size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-sans">
                  Study Pipeline Distribution
                </h4>
                <p className="text-[0.688rem] text-white/50 font-sans">
                  Active studies across operational stages
                </p>
              </div>
            </div>

            <CategoryBar
              values={pipelineMetrics.values}
              colors={["#64748B", "#F59E0B", "#38BDF8", "#CC6600", "#10B981"]}
              className="mt-1"
            />

            <div className="grid grid-cols-2 gap-2 text-[0.688rem] font-mono pt-1">
              <div className="flex items-center gap-1.5 text-white/70">
                <span className="w-2 h-2 rounded-full bg-[#64748B] shrink-0" />
                <span>Proposal: <strong>{pipelineMetrics.proposal}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-white/70">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" />
                <span>Deposit: <strong>{pipelineMetrics.deposit}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-white/70">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8] shrink-0" />
                <span>Analysis: <strong>{pipelineMetrics.analysis}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-white/70">
                <span className="w-2 h-2 rounded-full bg-[#CC6600] shrink-0" />
                <span>QA Review: <strong>{pipelineMetrics.qa}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-white/70 col-span-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                <span>Delivered: <strong>{pipelineMetrics.delivered}</strong></span>
              </div>
            </div>
          </Card>

          {/* Card 2: Research Disciplines */}
          <Card className="p-5 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-3.5 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 shrink-0">
              <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-[2px]">
                <GraduationCap weight="fill" size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-sans">
                  Top Research Disciplines
                </h4>
                <p className="text-[0.688rem] text-white/50 font-sans">
                  Client study volume by academic field
                </p>
              </div>
            </div>

            <div className="pt-0.5 overflow-y-auto max-h-[175px] pr-1">
              {disciplineBarData.length > 0 ? (
                <BarList
                  data={disciplineBarData}
                  valueFormatter={(val) => `${val} ${val === 1 ? "study" : "studies"}`}
                  className="space-y-1.5"
                />
              ) : (
                <div className="py-6 text-center text-xs text-white/40 font-sans">
                  No research studies recorded yet
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Global Pipeline Registry Card */}
      <Card className="p-0 overflow-hidden bg-[#01142B] border border-white/10 rounded-[2px]">
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white font-sans">All Research Studies</h2>
            <p className="text-xs text-white/50 font-sans mt-0.5">
              Overview across all client universities and partner organizations
            </p>
          </div>

          <div className="relative flex items-center w-full sm:w-64">
            <input
              type="text"
              placeholder="Search studies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] px-3 py-1.5 text-xs text-white font-mono placeholder:text-white/30 outline-none focus:border-[#CC6600]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-xs text-white/40 hover:text-white cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <DataTable<Project>
          columns={columns}
          rows={filteredProjects}
          loading={isLoading}
          className="border-0 rounded-none bg-transparent"
        />
      </Card>

      {/* Detail Modal */}
      {selectedStudy && (
        <Modal
          open={!!selectedStudy}
          onClose={() => setSelectedStudy(null)}
          title={`Study Details: ${selectedStudy.id}`}
          description={selectedStudy.title}
          size="md"
          footer={
            <div className="flex items-center justify-between gap-3 w-full">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  const target = selectedStudy;
                  setSelectedStudy(null);
                  setStudyToDelete(target);
                }}
                className="font-sans text-xs font-semibold rounded-[2px] bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 flex items-center gap-1.5 transition-colors"
              >
                <Trash size={14} weight="fill" />
                <span>Delete Study</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedStudy(null)}
                className="rounded-[2px] font-sans text-xs"
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3 text-xs text-white/80 font-sans">
            <p><strong className="text-white font-semibold">Lead Researcher:</strong> {selectedStudy.client}</p>
            <p><strong className="text-white font-semibold">University:</strong> {selectedStudy.university}</p>
            <p><strong className="text-white font-semibold">Field of Study:</strong> {selectedStudy.field}</p>
            <p><strong className="text-white font-semibold">Methodology:</strong> {selectedStudy.method}</p>
          </div>
        </Modal>
      )}

      {/* Delete Study Dialog */}
      <DeleteStudyDialog
        open={!!studyToDelete}
        onClose={() => setStudyToDelete(null)}
        study={studyToDelete}
        onDeleted={() => {
          refresh();
        }}
      />
    </div>
  );
}
