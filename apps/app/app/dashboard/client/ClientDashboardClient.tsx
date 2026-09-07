"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  PageHeader,
  Card,
  StatusBadge,
  Button,
  Modal,
  KpiCard,
  Toast,
  LoadingState,
  EmptyState,
  Pagination,
} from "@repo/ui";
import {
  IconPlus,
  IconLayoutList,
  IconTable,
  IconSearch,
  IconHelp,
  IconRefresh,
} from "@tabler/icons-react";
import { getProjects } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { QuickProfileModal } from "@/features/client-profile/components/QuickProfileModal";
import { getProjectDisplayStatus } from "@/lib/project-rules";
import { triggerFileDownload } from "@/lib/file-utils";
import { ClientStudyCard } from "@/features/projects/components/ClientStudyCard";
import { HowToUseModal } from "@/features/client-onboarding/components/HowToUseModal";
import { ClientWelcomeBanner } from "@/features/client-onboarding/components/ClientWelcomeBanner";
import type { ProjectDetailItem } from "@/features/projects/schemas";

interface ClientDashboardClientProps {
  initialProjects: ProjectDetailItem[];
  initialIsProfileComplete: boolean;
}

export function ClientDashboardClient({
  initialProjects,
  initialIsProfileComplete,
}: ClientDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectDetailItem[]>(initialProjects);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(initialIsProfileComplete);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedStudy, setSelectedStudy] = useState<ProjectDetailItem | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHowToUseModalOpen, setIsHowToUseModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTION_REQUIRED" | "IN_PROGRESS" | "COMPLETED">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [toast, setToast] = useState<{
    variant: "success" | "danger" | "warning" | "info";
    message: string;
    description?: string;
  } | null>(null);

  // Sync projects if initialProjects from Server Component updates (without wiping newer client-fetched data)
  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) {
      setProjects((prev) => {
        if (!prev || prev.length === 0) return initialProjects;
        const initialMap = new Map(initialProjects.map((p) => [p.id, p]));
        const merged = [...initialProjects];
        for (const p of prev) {
          if (!initialMap.has(p.id)) {
            merged.unshift(p);
          }
        }
        return merged;
      });
    }
  }, [initialProjects]);

  const hasHandledCreatedRef = React.useRef(false);

  const loadData = React.useCallback(async (showFullPageSpinner = false) => {
    setIsRefreshing(true);
    if (showFullPageSpinner) {
      setIsLoading(true);
    }
    try {
      const [projRes, profile] = await Promise.all([
        getProjects(),
        getClientProfile(),
      ]);

      if (projRes.success && Array.isArray(projRes.data)) {
        setProjects(projRes.data);
      }

      if (profile && profile.institutionSchool && profile.contactNumber) {
        setIsProfileComplete(true);
      } else {
        setIsProfileComplete(false);
      }
    } catch (err) {
      console.error("Failed to load client portal data", err);
    } finally {
      setIsRefreshing(false);
      if (showFullPageSpinner) {
        setIsLoading(false);
      }
    }
  }, []);

  // Re-fetch immediately when redirected from a newly submitted intake
  useEffect(() => {
    const created = searchParams.get("created");
    const intakeId = searchParams.get("intakeId");
    if (created === "true" && !hasHandledCreatedRef.current) {
      hasHandledCreatedRef.current = true;
      setToast({
        variant: "success",
        message: "Study Request Successfully Submitted",
        description: intakeId
          ? `Your research study specifications have been queued for triage. Assigned ID: ${intakeId}`
          : "Your research study specifications have been queued for triage.",
      });
      loadData(false);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [searchParams, loadData]);

  // Listen to SSE updates and tab visibility (silent sync without flashing loading screen)
  useEffect(() => {
    const handleStudyUpdated = () => {
      loadData(false);
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadData(false);
      }
    };

    window.addEventListener("jaxis:study-updated", handleStudyUpdated);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("jaxis:study-updated", handleStudyUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadData]);

  // Filter out any projects with pending missing info
  const awaitingInfoProjects = useMemo(() => {
    return projects.filter((p) => p.masterStatus === "AWAITING_INFORMATION");
  }, [projects]);

  // Filter projects with active quotation awaiting client response
  const pendingQuoteProjects = useMemo(() => {
    return projects.filter((p) => p.masterStatus === "QUOTE_SENT");
  }, [projects]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = projects.length;
    const awaitingInfo = projects.filter((p) => p.masterStatus === "AWAITING_INFORMATION").length;
    const pendingQuotes = projects.filter((p) => p.masterStatus === "QUOTE_SENT").length;
    const actionRequired = awaitingInfo + pendingQuotes;

    const inProgress = projects.filter(
      (p) =>
        p.masterStatus === "ACTIVE" ||
        p.masterStatus === "IN_PROGRESS" ||
        p.masterStatus === "EXPERT_ASSIGNED" ||
        p.masterStatus === "FOR_QA" ||
        p.masterStatus === "QA_REVISION"
    ).length;

    const delivered = projects.filter(
      (p) => p.masterStatus === "DELIVERED" || p.masterStatus === "CLOSED"
    ).length;

    return { total, awaitingInfo, actionRequired, inProgress, delivered };
  }, [projects]);

  // Filter projects based on tabs and search
  const filteredProjects = useMemo(() => {
    return projects.filter((study) => {
      // Tab filter
      if (statusFilter === "ACTION_REQUIRED") {
        if (
          study.masterStatus !== "AWAITING_INFORMATION" &&
          study.masterStatus !== "QUOTE_SENT"
        ) {
          return false;
        }
      } else if (statusFilter === "IN_PROGRESS") {
        if (
          study.masterStatus !== "ACTIVE" &&
          study.masterStatus !== "IN_PROGRESS" &&
          study.masterStatus !== "EXPERT_ASSIGNED" &&
          study.masterStatus !== "FOR_QA" &&
          study.masterStatus !== "QA_REVISION"
        ) {
          return false;
        }
      } else if (statusFilter === "COMPLETED") {
        if (
          study.masterStatus !== "DELIVERED" &&
          study.masterStatus !== "CLOSED"
        ) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = study.researchTitle.toLowerCase().includes(q);
        const matchId = study.intakeId.toLowerCase().includes(q);
        return matchTitle || matchId;
      }

      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  // Reset page on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  // Paginated studies for table view
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  const handleProfileSuccess = async () => {
    await loadData();
    setToast({
      variant: "success",
      message: "Affiliation Saved",
      description: "Your academic credentials have been verified. Request desk unlocked.",
    });
  };

  const handleDownloadDeliverable = (study: ProjectDetailItem) => {
    const deliverableFiles = study.files?.filter(
      (f) => f.fileCategory === "DELIVERABLE" || f.fileCategory === "ANALYSIS_OUTPUT"
    );
    if (deliverableFiles && deliverableFiles.length > 0) {
      const latestFile = deliverableFiles[deliverableFiles.length - 1]!;
      triggerFileDownload(latestFile.filePath, latestFile.fileName);
      setToast({
        variant: "success",
        message: "Download Started",
        description: `Transferring "${latestFile.fileName}" to your device.`,
      });
    } else {
      window.location.href = `/dashboard/client/projects/${study.id}`;
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title="My Research Studies"
        description="Track your research progress, message your assigned statistician, and download defense-ready statistical packages."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Client Portal" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsHowToUseModalOpen(true)}
              className="font-sans text-xs sm:text-sm font-semibold flex items-center gap-2 border-white/20 hover:bg-white/[0.08] text-white"
              title="How to Use JAXIS Guide"
            >
              <IconHelp size={16} className="text-sky-400" />
              <span>How It Works</span>
            </Button>

            {isProfileComplete === null ? (
              <Button
                variant="primary"
                size="md"
                disabled
                className="font-bold tracking-wider font-sans text-xs sm:text-sm opacity-50 cursor-wait pointer-events-none"
              >
                <LoadingState variant="inline" label="Loading..." />
              </Button>
            ) : isProfileComplete === false ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsProfileModalOpen(true)}
                className="font-bold tracking-wider font-sans text-xs sm:text-sm animate-content-fade bg-[#CC6600] hover:bg-[#E67300] text-white"
              >
                1. Setup School First →
              </Button>
            ) : (
              <Link href="/dashboard/client/projects/new" className="animate-content-fade">
                <Button
                  variant="primary"
                  size="md"
                  className="font-bold tracking-wider font-sans text-xs sm:text-sm flex items-center gap-2 bg-[#CC6600] hover:bg-[#E67300]"
                >
                  <IconPlus size={16} stroke={2.5} />
                  <span>Submit New Study Request</span>
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* ── First-Time Onboarding Guide (When No Active Studies or Profile Incomplete) ── */}
      {(projects.length === 0 || isProfileComplete === false) && (
        <ClientWelcomeBanner
          isProfileComplete={isProfileComplete}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenHowToUseModal={() => setIsHowToUseModalOpen(true)}
        />
      )}

      {/* ── High-Priority Pending Quotation Alert Banner ── */}
      {pendingQuoteProjects.length > 0 && (
        <div className="flex flex-col gap-3">
          {pendingQuoteProjects.map((p) => (
            <Card
              key={p.id}
              className="p-5 border border-amber-500/40 bg-amber-500/[0.08] shadow-xl flex flex-col gap-3 rounded-[4px]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                    Action Required: Proposal &amp; Quote Ready for Review
                  </span>
                  <span className="text-xs font-mono font-bold text-white bg-amber-500/20 px-2 py-0.5 rounded-[2px]">
                    {p.intakeId}
                  </span>
                </div>
                <Link href={`/dashboard/client/projects/${p.id}/quote`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="py-1.5 px-3.5 h-auto font-sans text-xs font-bold tracking-wider bg-[#CC6600] text-white hover:bg-[#E67300]"
                  >
                    Review Proposal &amp; Scope →
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-white font-sans">
                  {p.researchTitle}
                </p>
                <div className="text-xs text-white/70 font-sans mt-0.5">
                  Your customized statistical methodology and deliverables breakdown are ready. Review and approve your quote to lock in your assigned statistician.
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── High-Priority Missing Information Alert Banner ── */}
      {awaitingInfoProjects.length > 0 && (
        <div className="flex flex-col gap-3">
          {awaitingInfoProjects.map((p) => (
            <Card
              key={p.id}
              className="p-5 border border-amber-500/30 bg-amber-500/[0.06] shadow-xl flex flex-col gap-3 rounded-[4px]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Action Required: Additional Files or Information Needed
                  </span>
                  <span className="text-xs font-mono font-bold text-white bg-amber-500/20 px-2 py-0.5 rounded-[2px]">
                    {p.intakeId}
                  </span>
                </div>
                <Link href={`/dashboard/client/projects/${p.id}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="py-1.5 px-3.5 h-auto font-sans text-xs font-bold tracking-wider"
                  >
                    View &amp; Upload Files →
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-white font-sans">
                  {p.researchTitle}
                </p>
                <div
                  className="p-3.5 rounded-[2px] bg-black/40 border border-amber-500/30 text-xs text-amber-100 font-sans leading-relaxed mt-1"
                  style={{ padding: "0.875rem 1rem" }}
                >
                  <strong className="text-amber-300 font-mono text-[0.6875rem] uppercase block mb-1">
                    Note from Statistical Team:
                  </strong>
                  &ldquo;{p.missingInfoReason || "Please attach the requested dataset or questionnaire clarification."}&rdquo;
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Quick Start Consultation Hero Card (When Studies Already Exist) ── */}
      {projects.length > 0 && (
        <Card className="p-6 sm:p-8 border border-white/10 bg-[#01142B]/90 rounded-[4px] shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex flex-col gap-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#FF9433] bg-[#CC6600]/15 border border-[#CC6600]/30 px-2.5 py-0.5 rounded-[2px] uppercase">
                  New Research Request
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white font-sans">
                Need statistical analysis for another thesis or dissertation?
              </h2>
              <p className="text-sm text-white/70 font-sans leading-relaxed">
                Submit your research questions, raw dataset, or survey questionnaire. Our expert team will review your methodology and assign a dedicated PhD statistician.
              </p>
            </div>
            <div className="shrink-0 self-start md:self-center">
              <Link href="/dashboard/client/projects/new">
                <Button
                  variant="primary"
                  size="md"
                  className="font-sans text-xs sm:text-sm font-bold tracking-wider px-5 py-2.5 flex items-center gap-2 bg-[#CC6600] hover:bg-[#E67300]"
                >
                  <IconPlus size={16} stroke={2.5} />
                  <span>Start New Request →</span>
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* ── Actionable KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch">
        <KpiCard
          label="Total Studies"
          value={kpis.total}
          variant="default"
          description="All commissioned research"
        />

        <KpiCard
          label="Action Required"
          value={kpis.actionRequired}
          variant={kpis.actionRequired > 0 ? "orange" : "emerald"}
          description={
            kpis.actionRequired > 0
              ? `${kpis.actionRequired} pending your response`
              : "All clear & up to date"
          }
        />

        <KpiCard
          label="In Progress / QA"
          value={kpis.inProgress}
          variant="amber"
          description="Statistical analysis underway"
        />

        <KpiCard
          label="Defense Ready"
          value={kpis.delivered}
          variant="sky"
          description="Tables & write-ups completed"
        />
      </div>

      {/* ── Studies Header, Filter Tabs, and View Switcher ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-sans">
              Recent Studies &amp; Progress
            </h2>
            <p className="text-xs sm:text-sm text-white/60 font-sans mt-0.5">
              Live status, milestone pipeline, and direct communication with your assigned team
            </p>
          </div>

          {/* View Toggle (Cards vs. Table) & Refresh */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => loadData(false)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 font-mono text-xs font-semibold py-1.5 px-3 h-auto"
            >
              <IconRefresh size={14} className={isRefreshing ? "animate-spin" : ""} stroke={2} />
              <span>Refresh</span>
            </Button>
            <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-[2px] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 rounded-[2px] text-xs font-sans font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-[#CC6600] text-white"
                    : "text-white/60 hover:text-white"
                }`}
                title="Card View (Familiar Social / Feed Style)"
              >
                <IconLayoutList size={15} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-[2px] text-xs font-sans font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-[#CC6600] text-white"
                    : "text-white/60 hover:text-white"
                }`}
                title="Table View (Compact Spreadsheet Style)"
              >
                <IconTable size={15} />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-sans whitespace-nowrap transition-colors cursor-pointer border ${
                statusFilter === "ALL"
                  ? "bg-white/[0.12] border-white/20 text-white font-semibold"
                  : "bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              All Studies ({kpis.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ACTION_REQUIRED")}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-sans whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1.5 ${
                statusFilter === "ACTION_REQUIRED"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold"
                  : "bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {kpis.actionRequired > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
              <span>Action Needed ({kpis.actionRequired})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("IN_PROGRESS")}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-sans whitespace-nowrap transition-colors cursor-pointer border ${
                statusFilter === "IN_PROGRESS"
                  ? "bg-sky-500/20 border-sky-500/40 text-sky-300 font-semibold"
                  : "bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              In Progress ({kpis.inProgress})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("COMPLETED")}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-sans whitespace-nowrap transition-colors cursor-pointer border ${
                statusFilter === "COMPLETED"
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold"
                  : "bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              Completed ({kpis.delivered})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64 shrink-0">
            <IconSearch
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title or ID..."
              className="w-full bg-[#010915] border border-white/10 rounded-[2px] pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#CC6600] transition-colors font-sans"
            />
          </div>
        </div>

        {/* ── Studies Display (Cards Feed or Table) ── */}
        {isLoading && projects.length === 0 ? (
          <div className="py-20 flex justify-center items-center">
            <LoadingState variant="page" label="Loading research studies..." />
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="p-12 text-center border border-white/10 bg-[#01142B]/80 rounded-[4px]">
            <EmptyState
              title={
                searchQuery
                  ? "No matching studies found"
                  : statusFilter !== "ALL"
                  ? "No studies in this category"
                  : "No Research Studies Yet"
              }
              description={
                searchQuery
                  ? `No studies matched "${searchQuery}". Try a different keyword.`
                  : statusFilter !== "ALL"
                  ? "You have no active studies under this filter tab."
                  : "Submit your thesis or research specifications to begin your consultation."
              }
              action={
                statusFilter !== "ALL" || searchQuery ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusFilter("ALL");
                      setSearchQuery("");
                    }}
                    className="font-sans text-xs font-semibold px-4 py-2"
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Link href="/dashboard/client/projects/new">
                    <Button
                      variant="primary"
                      size="md"
                      className="font-sans text-xs sm:text-sm font-bold tracking-wider px-5 py-2.5 bg-[#CC6600]"
                    >
                      + Submit Study Request →
                    </Button>
                  </Link>
                )
              }
            />
          </Card>
        ) : viewMode === "cards" ? (
          /* ── Feed of Familiar Study Cards (Facebook / Shopee Order Style) ── */
          <div className="flex flex-col gap-5">
            {filteredProjects.map((study) => (
              <ClientStudyCard
                key={study.id}
                study={study}
                onDownloadDeliverable={handleDownloadDeliverable}
              />
            ))}
          </div>
        ) : (
          /* ── Compact Table View ── */
          <Card className="p-0 overflow-hidden border border-white/10 bg-[#01142B]/90 rounded-[4px] shadow-2xl">
            <div className="w-full overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-[140px] whitespace-nowrap">Study ID</th>
                    <th>Research Study Title</th>
                    <th className="w-[150px] whitespace-nowrap">Target Deadline</th>
                    <th className="w-[170px] whitespace-nowrap">Status</th>
                    <th className="w-[130px] text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProjects.map((study) => (
                    <tr
                      key={study.id}
                      onMouseEnter={() =>
                        router.prefetch(`/dashboard/client/projects/${study.id}`)
                      }
                      className="group hover:bg-white/[0.02] transition-colors virtual-row"
                    >
                      <td className="font-mono text-xs text-[#FF9433] font-bold whitespace-nowrap">
                        <span className="bg-[#CC6600]/15 border border-[#CC6600]/35 px-2.5 py-1 rounded-[2px]">
                          {study.intakeId}
                        </span>
                      </td>
                      <td className="max-w-[440px] min-w-0">
                        <div className="flex flex-col gap-1 pr-2 min-w-0">
                           <Link
                            href={`/dashboard/client/projects/${study.id}`}
                            className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors line-clamp-2 leading-relaxed"
                            title={study.researchTitle}
                          >
                            {study.researchTitle}
                          </Link>
                          {study.missingInfoReason &&
                            study.masterStatus === "AWAITING_INFORMATION" && (
                              <span
                                className="text-xs text-amber-300/90 font-sans truncate italic block min-w-0"
                                title={`Action Required: ${study.missingInfoReason}`}
                              >
                                Action Required: {study.missingInfoReason}
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-sans text-amber-400 font-semibold">
                            {new Date(study.deadlineRequested).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                          <span className="text-xs text-white/40 font-sans">
                            Target
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        {(() => {
                          const displayStatus = getProjectDisplayStatus(study);
                          return (
                            <StatusBadge
                              status={displayStatus.status}
                              label={displayStatus.label}
                              pulse={displayStatus.pulse}
                            />
                          );
                        })()}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <Link href={`/dashboard/client/projects/${study.id}`}>
                          <Button
                            variant={
                              study.masterStatus === "AWAITING_INFORMATION"
                                ? "primary"
                                : "outline"
                            }
                            size="sm"
                            className="whitespace-nowrap font-sans text-xs font-semibold px-3 py-1.5"
                          >
                            {study.masterStatus === "AWAITING_INFORMATION"
                              ? "Resolve →"
                              : "View Study"}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Table Pagination ── */}
            {filteredProjects.length > 0 && (
              <div className="border-t border-white/10 p-3 sm:px-6">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredProjects.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── Modal for Selected Study Quick Inspection ── */}
      {selectedStudy && (
        <Modal
          open={!!selectedStudy}
          onClose={() => setSelectedStudy(null)}
          title={`Study Details: ${selectedStudy.intakeId}`}
          description={selectedStudy.researchTitle}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="secondary" onClick={() => setSelectedStudy(null)}>
                Close
              </Button>
              <Link href={`/dashboard/client/projects/${selectedStudy.id}`}>
                <Button variant="primary">Open Project Desk →</Button>
              </Link>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-xs font-sans text-white/80">
            {selectedStudy.missingInfoReason &&
              selectedStudy.masterStatus === "AWAITING_INFORMATION" && (
                <div className="p-4 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-amber-200">
                  <strong className="text-amber-400 font-mono text-[0.6875rem] uppercase block mb-1">
                    Missing Information Requested:
                  </strong>
                  &ldquo;{selectedStudy.missingInfoReason}&rdquo;
                </div>
              )}
            <div className="p-4 rounded-[2px] bg-white/[0.03] border border-white/[0.08] flex flex-col gap-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                  Core Objectives:
                </span>
                <p className="text-xs text-white leading-relaxed">
                  {selectedStudy.researchObjectives}
                </p>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[0.6875rem] text-white/40 uppercase tracking-wider">
                  Submitted Files:
                </span>
                <p className="text-xs font-mono text-sky-300">
                  {selectedStudy.files.length} attached document(s)
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Quick Profile Setup Modal ── */}
      <QuickProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSuccess={handleProfileSuccess}
      />

      {/* ── How to Use JAXIS Interactive Guide Modal ── */}
      <HowToUseModal
        isOpen={isHowToUseModalOpen}
        onClose={() => setIsHowToUseModalOpen(false)}
        isProfileComplete={isProfileComplete === true}
        onSetupProfile={() => setIsProfileModalOpen(true)}
        onStartRequest={() => {
          window.location.href = "/dashboard/client/projects/new";
        }}
      />

      {/* ── Floating Responsive Toast Notification ── */}
      {toast && (
        <Toast
          variant={toast.variant}
          message={toast.message}
          description={toast.description}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
