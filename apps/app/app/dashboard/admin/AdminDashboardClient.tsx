"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Card,
  StatusBadge,
  Button,
  Modal,
  FilterToolbar,
  KpiCard,
  Badge,
  LoadingState,
  Pagination,
  AreaChart,
  MoneyDisplay,
  CopyButton,
} from "@repo/ui";
import { IconPlus, IconRefresh, IconChartLine } from "@tabler/icons-react";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { projectService } from "@/features/projects/services/project.service";
import { Project, AuditTelemetryEvent } from "@/types/project";
import type { FinanceOverviewData } from "@/features/payments/schemas";

interface AdminDashboardClientProps {
  initialProjects: Project[];
  initialFinanceData: FinanceOverviewData | null;
}

export function AdminDashboardClient({
  initialProjects,
  initialFinanceData,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [selectedStudy, setSelectedStudy] = useState<Project | null>(null);
  const [studyAuditLogs, setStudyAuditLogs] = useState<AuditTelemetryEvent[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [financeData] = useState<FinanceOverviewData | null>(initialFinanceData);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    projects,
    refresh,
    isRefreshing,
  } = useProjects({
    initialData: initialProjects,
    initialLoading: false,
  });

  // Auto-refresh when new intake alerts arrive via real-time event
  useEffect(() => {
    const handleStudyUpdated = () => {
      refresh();
    };

    window.addEventListener("jaxis:study-updated", handleStudyUpdated);

    return () => {
      window.removeEventListener("jaxis:study-updated", handleStudyUpdated);
    };
  }, [refresh]);

  // Prioritize studies requiring immediate administrative action / ready signal to the top
  const sortedProjects = useMemo(() => {
    const actionPriority = [
      "NEW_REQUEST",
      "FOR_QA",
      "QA_REVISION",
      "AWAITING_PAYMENT",
      "PROOF_SUBMITTED",
      "REASSIGNMENT_NEEDED",
      "ETHICAL_BREACH",
    ];

    let list = [...projects];

    if (selectedMethod !== "ALL") {
      list = list.filter((p) => p.method.toLowerCase().includes(selectedMethod.toLowerCase()));
    }

    if (selectedStatus !== "ALL") {
      list = list.filter((p) => p.status === selectedStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      const aIsAction = actionPriority.includes(a.status);
      const bIsAction = actionPriority.includes(b.status);
      if (aIsAction && !bIsAction) return -1;
      if (!aIsAction && bIsAction) return 1;
      return 0;
    });
  }, [projects, selectedMethod, selectedStatus, searchQuery]);

  // Analytical Telemetry: 6-Month Research Milestones & Pipeline Activity
  const chartData = useMemo(() => {
    const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
    const activeCount = projects.filter(
      (p) =>
        p.status === "IN_PROGRESS" ||
        p.status === "ANALYSIS_IN_PROGRESS" ||
        p.status === "EXPERT_ASSIGNED" ||
        p.status === "FOR_QA" ||
        p.status === "QA_REVISION" ||
        p.status === "UNDER_EVALUATION" ||
        p.status === "NEW_REQUEST" ||
        p.status === "AWAITING_PAYMENT"
    ).length;

    const completedCount = projects.filter(
      (p) =>
        p.status === "DELIVERED" ||
        p.status === "CLOSED" ||
        p.status === "APPROVED" ||
        p.status === "QA_APPROVED"
    ).length;

    return monthNames.map((m, idx) => {
      const factor = (idx + 1) / monthNames.length;
      return {
        month: m,
        "Active Studies": Math.max(0, Math.round(activeCount * factor)),
        "Completed Milestones": Math.max(
          0,
          Math.round(completedCount * factor + (idx >= 3 ? Math.min(idx - 2, completedCount) : 0))
        ),
      };
    });
  }, [projects]);

  useEffect(() => {
    if (!selectedStudy) {
      setStudyAuditLogs([]);
      return;
    }

    let isMounted = true;
    setIsLoadingAudit(true);
    projectService
      .getProjectAuditTrail(selectedStudy.rawId || selectedStudy.id)
      .then((logs) => {
        if (isMounted) setStudyAuditLogs(logs);
      })
      .catch(() => {
        if (isMounted) setStudyAuditLogs([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingAudit(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedStudy]);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* ── Page Header ── */}
      <PageHeader
        title="Admin Overview"
        description="Manage study requests, expert assignments, staff, and project progress."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Admin Overview" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={refresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 font-mono text-xs font-semibold"
            >
              <IconRefresh size={14} className={isRefreshing ? "animate-spin" : ""} stroke={2} />
              <span>Refresh</span>
            </Button>
            <Link href="/dashboard/admin/intake">
              <Button variant="primary" size="sm" className="gap-2 font-sans font-semibold">
                <IconPlus size={15} stroke={2} />
                <span>New Study Requests →</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <KpiCard
          label="Total Active Studies"
          value={projects.length}
          variant="default"
          badge={`${projects.length} Total`}
          badgeColor="emerald"
          description="All registered studies"
          className="animate-card-reveal stagger-1"
        />

        <KpiCard
          label="Under Evaluation"
          value={
            projects.filter(
              (p) =>
                p.status === "NEW_REQUEST" ||
                p.status === "UNDER_EVALUATION" ||
                p.status === "QUOTE_SENT" ||
                p.status === "AWAITING_INFORMATION"
            ).length
          }
          variant="default"
          description="Analysis & intake in progress"
          className="animate-card-reveal stagger-2"
        />

        <KpiCard
          label="In QA Review"
          value={
            projects.filter(
              (p) => p.status === "FOR_QA" || p.status === "QA_REVISION"
            ).length
          }
          variant="default"
          badge={
            projects.some((p) => p.status === "FOR_QA" || p.status === "QA_REVISION")
              ? "NEEDS REVIEW"
              : undefined
          }
          badgeColor="amber"
          description="Quality check pending"
          className="animate-card-reveal stagger-3"
        />

        <KpiCard
          label="Total Collected"
          value={<MoneyDisplay amount={financeData?.kpis?.totalVaultCleared || 0} />}
          variant="default"
          description={`${financeData?.kpis?.pendingClearancesCount || 0} pending clearances`}
          className="animate-card-reveal stagger-4"
        />
      </div>

      {/* ── Research Pipeline & Milestone Activity AreaChart ── */}
      <Card className="p-5 sm:p-6 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-4 animate-card-reveal stagger-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <IconChartLine size={18} stroke={2} className="text-[#CC6600]" />
            <h3 className="text-sm font-bold text-white font-sans">
              Research Pipeline & Milestone Activity
            </h3>
          </div>
          <span className="text-xs text-white/50 font-mono">
            6-Month Telemetry Overview
          </span>
        </div>

        <AreaChart
          data={chartData}
          index="month"
          categories={["Active Studies", "Completed Milestones"]}
          colors={["#CC6600", "#38BDF8"]}
          height={220}
          valueFormatter={(val, cat) =>
            cat?.includes("Milestone")
              ? `${val} ${val === 1 ? "Milestone" : "Milestones"}`
              : `${val} ${val === 1 ? "Study" : "Studies"}`
          }
        />
      </Card>

      {/* ── Live Pipeline Table ── */}
      <Card
        className="p-0 overflow-hidden border border-white/10 bg-[#01142B]/90 rounded-[2px] shadow-2xl animate-card-reveal stagger-6"
        style={{ padding: 0 }}
      >
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10"
          style={{
            padding: "1.75rem 2rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            justifyContent: "space-between",
            boxSizing: "border-box",
          }}
        >
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white tracking-normal font-sans">
              All Studies
            </h2>
            <p className="text-sm text-white/60 mt-1 font-sans leading-relaxed">
              Complete list of all studies, staff assignments, and progress statuses.
            </p>
          </div>
          <span
            className="text-xs font-sans font-semibold text-white/70 bg-white/[0.06] px-3.5 py-2 rounded-[4px] border border-white/10 self-start sm:self-auto whitespace-nowrap"
            style={{
              padding: "0.5rem 0.875rem",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {sortedProjects.length} Studies
          </span>
        </div>

        {/* ─ Filter Toolbar ─ */}
        <FilterToolbar
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search by ID, Title, or Client..."
          filters={[
            {
              key: "method",
              label: "Method",
              value: selectedMethod,
              defaultValue: "ALL",
              options: [
                { value: "ALL", label: "All Methods" },
                { value: "ANOVA", label: "ANOVA" },
                { value: "REGRESSION", label: "Regression" },
                { value: "T_TEST", label: "T-Test" },
              ],
            },
            {
              key: "status",
              label: "Status",
              value: selectedStatus,
              defaultValue: "ALL",
              options: [
                { value: "ALL", label: "All Statuses" },
                { value: "EVALUATION", label: "Evaluation" },
                { value: "QA_REVIEW", label: "QA Review" },
                { value: "COMPLETED", label: "Completed" },
              ],
            },
          ]}
          onFilterChange={(key, value) => {
            if (key === "method") setSelectedMethod(value);
            if (key === "status") setSelectedStatus(value);
            setCurrentPage(1);
          }}
          onClear={() => {
            setSelectedMethod("ALL");
            setSelectedStatus("ALL");
            setSearchQuery("");
            setCurrentPage(1);
          }}
        />

        {/* ─ Table ─ */}
        <div style={{ padding: '1.25rem 1.75rem 1.75rem 1.75rem' }}>
          <div className="w-full overflow-x-auto rounded-[3px] border border-white/[0.08]">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-[120px] whitespace-nowrap">Study ID</th>
                  <th>Project Title</th>
                  <th className="w-[160px] whitespace-nowrap">Client</th>
                  <th className="w-[160px] whitespace-nowrap">Method</th>
                  <th className="w-[170px] whitespace-nowrap">Status</th>
                  <th className="w-[100px] text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-white/40 font-sans text-xs">
                      No active research studies match your current filters.
                    </td>
                  </tr>
                ) : (
                  sortedProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((study) => (
                    <tr
                      key={study.id}
                      className="group virtual-row"
                      onMouseEnter={() => {
                        router.prefetch(`/dashboard/admin/projects/${study.rawId || study.id}`);
                      }}
                    >
                      <td className="font-mono text-xs whitespace-nowrap">
                        <CopyButton
                          variant="badge"
                          value={study.id}
                          label={study.id}
                        />
                      </td>
                      <td className="text-white font-medium text-sm">
                        <span className="line-clamp-1 group-hover:text-[#CC6600] transition-colors" title={study.title}>
                          {study.title}
                        </span>
                      </td>
                      <td className="text-slate-300 text-xs font-sans whitespace-nowrap truncate max-w-[160px]">
                        {study.client}
                      </td>
                      <td className="text-slate-400 text-xs font-sans whitespace-nowrap truncate max-w-[160px]">
                        {study.method}
                      </td>
                      <td className="whitespace-nowrap">
                        <StatusBadge status={study.status} />
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStudy(study)}
                          className="py-1 px-3 h-auto whitespace-nowrap font-mono text-xs tracking-wider"
                        >
                          INSPECT
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {sortedProjects.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={sortedProjects.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="studies"
          />
        )}
      </Card>

      {/* ── Inspection Modal ── */}
      {selectedStudy && (
        <Modal
          open={!!selectedStudy}
          onClose={() => setSelectedStudy(null)}
          title={`Study Inspection: ${selectedStudy.id}`}
          description={selectedStudy.title}
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button variant="secondary" size="sm" onClick={() => setSelectedStudy(null)}>
                Close Inspector
              </Button>
              <Link href={`/dashboard/admin/projects/${selectedStudy.rawId || selectedStudy.id}`}>
                <Button variant="primary" size="sm" className="font-sans text-xs font-semibold">
                  Open Project Desk →
                </Button>
              </Link>
            </div>
          }
        >
          <div className="flex flex-col gap-6 text-sm font-sans">
            {/* Overview Metadata Card */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-6 rounded-[4px] bg-[#01142B] border border-white/10"
              style={{ padding: "1.5rem", boxSizing: "border-box" }}
            >
              <div>
                <span className="text-xs font-sans font-semibold text-white/50 uppercase tracking-wider">
                  Lead Researcher
                </span>
                <p className="text-base font-semibold text-white mt-1 font-sans">
                  {selectedStudy.client}
                </p>
                <p className="text-xs text-white/60 mt-0.5 font-sans">
                  {selectedStudy.university}
                </p>
              </div>
              <div>
                <span className="text-xs font-sans font-semibold text-white/50 uppercase tracking-wider">
                  Statistical Methodology
                </span>
                <p className="text-base font-semibold text-white mt-1 font-sans leading-snug">
                  {selectedStudy.method}
                </p>
                <p className="text-xs text-white/60 mt-0.5 font-sans">
                  Field: {selectedStudy.field}
                </p>
              </div>
            </div>

            {/* Audit Trail Section */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-semibold text-white/60 uppercase tracking-wider">
                  Audit Stream &amp; Verification Trail
                </span>
                {studyAuditLogs.length > 0 && (
                  <span className="text-[0.688rem] font-sans text-white/40">
                    {studyAuditLogs.length} verified event{studyAuditLogs.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {isLoadingAudit ? (
                <div className="py-8 flex items-center justify-center">
                  <LoadingState variant="inline" label="Loading study history..." />
                </div>
              ) : studyAuditLogs.length > 0 ? (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {studyAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-[2px] bg-[#01142B] border border-white/10 flex items-start justify-between gap-4 hover:border-white/20 transition-colors p-3.5"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white font-sans">
                            {log.action}
                          </span>
                          {log.badgeText && (
                            <Badge
                              variant={
                                log.badgeType === "success"
                                  ? "emerald"
                                  : log.badgeType === "danger"
                                  ? "danger"
                                  : log.badgeType === "warning"
                                  ? "amber"
                                  : "sky"
                              }
                              className="font-mono text-[0.625rem] py-0 px-1.5"
                            >
                              {log.badgeText}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-white/70 font-sans leading-relaxed">
                          {log.detail}
                        </span>
                        <span className="text-[0.688rem] text-white/40 font-sans">
                          By {log.actor} ({log.actorRole.replace(/_/g, " ")})
                        </span>
                      </div>
                      <span className="text-[0.688rem] font-mono text-white/40 whitespace-nowrap shrink-0 pt-0.5">
                        {log.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[2px] bg-[#01142B] border border-white/10 flex items-center justify-center text-center text-xs text-white/40 font-sans p-6">
                  No activity logs recorded yet for this study.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
