"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  CopyButton,
} from "@repo/ui";
import {
  IconPlus,
  IconLayoutList,
  IconTable,
  IconSearch,
  IconHelp,
  IconRefresh,
  IconGitCommit,
  IconCheck,
  IconX,
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

const RESEARCH_STAGES = [
  { id: "quote", title: "1. Proposal & Quote", desc: "Scope & pricing review" },
  { id: "sow", title: "2. Contract (SOW)", desc: "Signed agreement" },
  { id: "deposit", title: "3. Downpayment", desc: "Deposit to start" },
  { id: "analysis", title: "4. Analysis & QA", desc: "Statistical modeling" },
  { id: "deliverables", title: "5. Final Outputs", desc: "Reports & data tables" },
];

function getStudyStage(status: string) {
  switch (status) {
    case "NEW_REQUEST":
    case "UNDER_EVALUATION":
      return {
        stageIndex: 0,
        statusLabel: "Proposal Under Review",
        actionText: "Open Study",
        actionPath: "",
      };
    case "AWAITING_INFORMATION":
      return {
        stageIndex: 0,
        statusLabel: "Information Needed",
        actionText: "Upload Files",
        actionPath: "",
      };
    case "QUOTE_SENT":
      return {
        stageIndex: 0,
        statusLabel: "Price Quote Ready",
        actionText: "Review Quote",
        actionPath: "/quote",
      };
    case "CLIENT_APPROVED":
    case "SOW_PENDING":
      return {
        stageIndex: 1,
        statusLabel: "Contract Ready to Sign",
        actionText: "Sign Contract",
        actionPath: "/sow",
      };
    case "SOW_SIGNED":
    case "AWAITING_PAYMENT":
      return {
        stageIndex: 2,
        statusLabel: "Downpayment Required",
        actionText: "Submit Deposit",
        actionPath: "/payment",
      };
    case "ACTIVE":
    case "EXPERT_ASSIGNED":
    case "IN_PROGRESS":
      return {
        stageIndex: 3,
        statusLabel: "Analysis in Progress",
        actionText: "View Study Desk",
        actionPath: "",
      };
    case "FOR_QA":
    case "QA_REVISION":
      return {
        stageIndex: 3,
        statusLabel: "Senior QA Review",
        actionText: "View Study Desk",
        actionPath: "",
      };
    case "DELIVERED":
    case "REVISION_REQUESTED":
    case "CLOSED":
      return {
        stageIndex: 4,
        statusLabel: "Deliverables Ready",
        actionText: "Download Outputs",
        actionPath: "/deliverables",
      };
    default:
      return {
        stageIndex: 0,
        statusLabel: "Active Study",
        actionText: "View Study",
        actionPath: "",
      };
  }
}

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

  // Keyboard shortcut: Press '/' anywhere to focus search, 'Escape' to clear and blur
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isInput =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (!isInput) {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      } else if (e.key === "Escape") {
        if (document.activeElement === searchInputRef.current) {
          e.preventDefault();
          setSearchQuery("");
          searchInputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

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

  // Live Research Journey: Select primary active study for milestone progress tracker
  const primaryStudy = useMemo(() => {
    // 1. Priority: Action required
    const actionStudy = projects.find(
      (p) =>
        p.masterStatus === "QUOTE_SENT" ||
        p.masterStatus === "SOW_PENDING" ||
        p.masterStatus === "AWAITING_PAYMENT" ||
        p.masterStatus === "AWAITING_INFORMATION"
    );
    if (actionStudy) return actionStudy;

    // 2. Secondary: Currently in progress
    const activeStudy = projects.find(
      (p) =>
        p.masterStatus === "ACTIVE" ||
        p.masterStatus === "EXPERT_ASSIGNED" ||
        p.masterStatus === "IN_PROGRESS" ||
        p.masterStatus === "FOR_QA" ||
        p.masterStatus === "QA_REVISION"
    );
    if (activeStudy) return activeStudy;

    // 3. Fallback: Most recent study
    return projects[0] || null;
  }, [projects]);

  const stageInfo = useMemo(() => {
    if (!primaryStudy) return null;
    return getStudyStage(primaryStudy.masterStatus);
  }, [primaryStudy]);

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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsHowToUseModalOpen(true)}
              className="font-sans text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border-white/20 hover:bg-white/[0.08] text-white active:scale-[0.97] transition-transform"
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
                className="font-bold tracking-wider font-sans text-xs sm:text-sm animate-content-fade bg-[#CC6600] hover:bg-[#E67300] text-white active:scale-[0.97] transition-transform"
              >
                1. Setup School First →
              </Button>
            ) : (
              <Link href="/dashboard/client/projects/new" className="animate-content-fade w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full font-bold tracking-wider font-sans text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#CC6600] hover:bg-[#E67300] active:scale-[0.97] transition-transform"
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
        <div className="flex flex-col gap-3 animate-card-reveal">
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
        <div className="flex flex-col gap-3 animate-card-reveal">
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



      {/* ── Actionable KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch">
        <KpiCard
          label="Total Studies"
          value={kpis.total}
          variant="default"
          description="All commissioned research"
          className="animate-card-reveal stagger-1"
        />

        <KpiCard
          label="Action Required"
          value={kpis.actionRequired}
          variant={kpis.actionRequired > 0 ? "orange" : "default"}
          badge={kpis.actionRequired > 0 ? "ACTION NEEDED" : undefined}
          badgeColor={kpis.actionRequired > 0 ? "orange" : "gray"}
          description={
            kpis.actionRequired > 0
              ? `${kpis.actionRequired} pending your response`
              : "All clear & up to date"
          }
          className="animate-card-reveal stagger-2"
        />

        <KpiCard
          label="In Progress / QA"
          value={kpis.inProgress}
          variant="default"
          description="Statistical analysis underway"
          className="animate-card-reveal stagger-3"
        />

        <KpiCard
          label="Defense Ready"
          value={kpis.delivered}
          variant="default"
          description="Tables & write-ups completed"
          className="animate-card-reveal stagger-4"
        />
      </div>

      {/* ── Live Research Journey & Milestone Progress Tracker ── */}
      {primaryStudy && stageInfo && (
        <Card className="p-5 sm:p-6 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-5 animate-card-reveal stagger-5">
          {/* Top Bar: Study Metadata & Direct Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#FFA040] shrink-0">
                <IconGitCommit size={17} stroke={2} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[#FFA040]">
                    {primaryStudy.intakeId}
                  </span>
                  <span className="text-white/30 text-xs font-mono">·</span>
                  <span className="text-xs font-sans text-white/50">
                    Target: {new Date(primaryStudy.deadlineRequested).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white font-sans truncate mt-0.5" title={primaryStudy.researchTitle}>
                  {primaryStudy.researchTitle}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              <Link href={`/dashboard/client/projects/${primaryStudy.id}${stageInfo.actionPath}`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="font-sans text-xs font-semibold px-3.5 py-1.5 bg-[#CC6600] hover:bg-[#E67300] text-white rounded-[2px] active:scale-[0.97] transition-all flex items-center gap-1.5 shadow-md"
                >
                  <span>{stageInfo.actionText} →</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* 5-Stage Visual Stepper */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {RESEARCH_STAGES.map((stg, i) => {
              const isCompleted = i < stageInfo.stageIndex;
              const isCurrent = i === stageInfo.stageIndex;

              return (
                <div
                  key={stg.id}
                  className={`p-3 rounded-[2px] border transition-all flex flex-col justify-between gap-2 ${
                    isCurrent
                      ? "bg-[#011C38] border-[#CC6600]/80 shadow-md ring-1 ring-[#CC6600]/40"
                      : isCompleted
                      ? "bg-emerald-500/[0.04] border-emerald-500/25 text-white/80"
                      : "bg-white/[0.01] border-white/[0.06] text-white/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                        isCurrent
                          ? "bg-[#CC6600] text-white"
                          : isCompleted
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-white/[0.05] text-white/40 border border-white/10"
                      }`}
                    >
                      {isCompleted ? <IconCheck size={12} stroke={2.5} /> : i + 1}
                    </span>

                    <span className="text-[9px] font-mono tracking-wider uppercase font-semibold">
                      {isCompleted ? (
                        <span className="text-emerald-400">Done</span>
                      ) : isCurrent ? (
                        <span className="text-[#FFA040] animate-pulse">Active</span>
                      ) : (
                        <span className="text-white/30">Next</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <h4
                      className={`text-xs font-sans font-semibold leading-snug ${
                        isCurrent ? "text-white" : isCompleted ? "text-white/90" : "text-white/40"
                      }`}
                    >
                      {stg.title}
                    </h4>
                    <p className="text-[10px] font-sans text-white/50 mt-0.5 line-clamp-1">
                      {stg.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subtitle / Context Note */}
          <div className="flex items-center justify-between text-xs text-white/50 font-sans pt-1 border-t border-white/[0.06] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CC6600] animate-pulse" />
              <span>Current Status: <strong className="text-white font-medium">{stageInfo.statusLabel}</strong></span>
            </div>
            <Link
              href={`/dashboard/client/projects/${primaryStudy.id}`}
              className="text-sky-400 hover:text-sky-300 transition-colors font-sans text-xs"
            >
              View Full Study Details →
            </Link>
          </div>
        </Card>
      )}

      {/* ── Studies Header, Filter Tabs, and View Switcher ── */}
      <div className="flex flex-col gap-4 animate-card-reveal stagger-6">
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
              aria-label="Refresh studies list"
              className="flex items-center gap-1.5 font-mono text-xs font-semibold py-1.5 px-3 h-auto active:scale-[0.97] transition-transform"
            >
              <IconRefresh size={14} className={isRefreshing ? "animate-spin" : ""} stroke={2} aria-hidden="true" />
              <span>Refresh</span>
            </Button>
            <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-[2px] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                aria-label="Switch to card view"
                aria-pressed={viewMode === "cards"}
                className={`px-3 py-1.5 rounded-[2px] text-xs font-sans font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97] ${
                  viewMode === "cards"
                    ? "bg-[#CC6600] text-white"
                    : "text-white/60 hover:text-white"
                }`}
                title="Card View (Familiar Feed Style)"
              >
                <IconLayoutList size={15} aria-hidden="true" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label="Switch to table view"
                aria-pressed={viewMode === "table"}
                className={`px-3 py-1.5 rounded-[2px] text-xs font-sans font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97] ${
                  viewMode === "table"
                    ? "bg-[#CC6600] text-white"
                    : "text-white/60 hover:text-white"
                }`}
                title="Table View (Compact Spreadsheet Style)"
              >
                <IconTable size={15} aria-hidden="true" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div
            role="tablist"
            aria-label="Filter research studies by status"
            className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none"
          >
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "ALL"}
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-sans whitespace-nowrap transition-all cursor-pointer border active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-[#CC6600] ${
                statusFilter === "ALL"
                  ? "bg-white/[0.12] border-white/20 text-white font-semibold"
                  : "bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              All Studies ({kpis.total})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "ACTION_REQUIRED"}
              onClick={() => setStatusFilter("ACTION_REQUIRED")}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-sans whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                statusFilter === "ACTION_REQUIRED"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold"
                  : "bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {kpis.actionRequired > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
              )}
              <span>Action Needed ({kpis.actionRequired})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "IN_PROGRESS"}
              onClick={() => setStatusFilter("IN_PROGRESS")}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-sans whitespace-nowrap transition-all cursor-pointer border active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                statusFilter === "IN_PROGRESS"
                  ? "bg-sky-500/20 border-sky-500/40 text-sky-300 font-semibold"
                  : "bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              In Progress ({kpis.inProgress})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "COMPLETED"}
              onClick={() => setStatusFilter("COMPLETED")}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-sans whitespace-nowrap transition-all cursor-pointer border active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
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
            <label htmlFor="client-dashboard-search" className="sr-only">
              Search research study title or ID
            </label>
            <IconSearch
              size={15}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              id="client-dashboard-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title or ID..."
              className="w-full bg-[#010915] border border-white/10 rounded-[2px] pl-9 pr-8 py-2 sm:py-1.5 text-base sm:text-xs text-white placeholder-white/40 outline-none focus:border-[#CC6600] focus-visible:ring-2 focus-visible:ring-[#CC6600] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010114] transition-all font-sans"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer p-0.5 rounded-[2px] active:scale-[0.97]"
                title="Clear search"
                aria-label="Clear search"
              >
                <IconX size={13} stroke={2} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-white/30 bg-white/[0.06] border border-white/10 rounded-[2px] pointer-events-none leading-none select-none">
                /
              </kbd>
            )}
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
            {filteredProjects.map((study, idx) => (
              <ClientStudyCard
                key={study.id}
                study={study}
                onDownloadDeliverable={handleDownloadDeliverable}
                className={`animate-card-reveal stagger-${Math.min(idx + 1, 8)}`}
              />
            ))}
          </div>
        ) : (
          /* ── Compact Table View ── */
          <Card className="p-0 overflow-hidden border border-white/10 bg-[#01142B]/90 rounded-[4px] shadow-2xl -mx-4 sm:mx-0">
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
                      <td className="font-mono text-xs whitespace-nowrap">
                        <CopyButton
                          variant="badge"
                          value={study.intakeId}
                          label={study.intakeId}
                          onCopy={() =>
                            setToast({
                              message: "Study ID Copied",
                              description: `"${study.intakeId}" has been copied to your clipboard.`,
                              variant: "info",
                            })
                          }
                        />
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
                            className="whitespace-nowrap font-sans text-xs font-semibold px-3 py-1.5 active:scale-[0.97] transition-transform min-h-[36px]"
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
      {/* ── Study Quick Details Modal ── */}
      {selectedStudy && (
        <Modal
          open={!!selectedStudy}
          onClose={() => setSelectedStudy(null)}
          title={`Study Details: ${selectedStudy.intakeId}`}
          description={selectedStudy.researchTitle}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedStudy(null)}
                className="rounded-[2px] active:scale-[0.97] transition-transform text-xs font-sans"
              >
                Close
              </Button>
              <Link href={`/dashboard/client/projects/${selectedStudy.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-[2px] active:scale-[0.97] transition-transform text-xs font-semibold bg-[#CC6600] hover:bg-[#E67300] text-white shadow-md"
                >
                  Open Study Desk →
                </Button>
              </Link>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-xs font-sans text-white/85">
            {/* Status & ID Ribbon */}
            <div className="flex items-center justify-between p-3 rounded-[2px] bg-[#01142B] border border-white/10">
              <span className="text-white/50 font-sans text-xs">Current Status:</span>
              {(() => {
                const displayStatus = getProjectDisplayStatus(selectedStudy, "CLIENT");
                return (
                  <StatusBadge
                    status={displayStatus.status}
                    label={displayStatus.label}
                    pulse={displayStatus.pulse}
                  />
                );
              })()}
            </div>

            {selectedStudy.missingInfoReason &&
              selectedStudy.masterStatus === "AWAITING_INFORMATION" && (
                <div className="p-3.5 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-amber-200">
                  <strong className="text-amber-400 font-mono text-[0.6875rem] uppercase block mb-1">
                    Missing Information Requested:
                  </strong>
                  &ldquo;{selectedStudy.missingInfoReason}&rdquo;
                </div>
              )}

            <div className="p-4 rounded-[2px] bg-[#01142B] border border-white/10 flex flex-col gap-3.5 shadow-sm">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[0.6875rem] text-white/45 uppercase tracking-wider font-semibold">
                  Core Objectives:
                </span>
                <p className="text-xs text-white/90 leading-relaxed font-sans">
                  {selectedStudy.researchObjectives}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <span className="font-mono text-[0.6875rem] text-white/45 uppercase tracking-wider font-semibold">
                  Attached Documents:
                </span>
                <span className="text-xs font-mono text-sky-400 font-medium">
                  {selectedStudy.files.length} attached document(s)
                </span>
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
