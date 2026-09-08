"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  PageHeader,
  Card,
  Button,
  KpiCard,
  Toast,
  LoadingState,
  CopyButton,
} from "@repo/ui";
import {
  Plus,
  Question,
  Target,
  Check,
  Clock,
  ChatCenteredText,
  GraduationCap,
} from "@phosphor-icons/react";
import { getProjects } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { QuickProfileModal } from "@/features/client-profile/components/QuickProfileModal";
import { HowToUseModal } from "@/features/client-onboarding/components/HowToUseModal";
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
        statusLabel: "Quotation Ready",
        actionText: "Review Quote",
        actionPath: "/quote",
      };
    case "SOW_PENDING":
      return {
        stageIndex: 1,
        statusLabel: "Agreement Ready",
        actionText: "Sign Agreement",
        actionPath: "/sow",
      };
    case "AWAITING_PAYMENT":
      return {
        stageIndex: 2,
        statusLabel: "Downpayment Required",
        actionText: "Pay Deposit",
        actionPath: "/deposit",
      };
    case "ACTIVE":
    case "EXPERT_ASSIGNED":
    case "IN_PROGRESS":
      return {
        stageIndex: 3,
        statusLabel: "Analysis in Progress",
        actionText: "View Progress",
        actionPath: "",
      };
    case "FOR_QA":
    case "QA_REVISION":
      return {
        stageIndex: 3,
        statusLabel: "Quality Assurance Check",
        actionText: "View QA Audit",
        actionPath: "",
      };
    case "DELIVERED":
    case "CLOSED":
      return {
        stageIndex: 4,
        statusLabel: "Defense Ready",
        actionText: "Get Deliverables",
        actionPath: "",
      };
    default:
      return {
        stageIndex: 0,
        statusLabel: "Under Review",
        actionText: "View Study",
        actionPath: "",
      };
  }
}

interface ClientDashboardClientProps {
  userName?: string;
  initialProjects?: ProjectDetailItem[];
  initialIsProfileComplete?: boolean;
}

export function ClientDashboardClient({
  userName = "Client",
  initialProjects = [],
  initialIsProfileComplete = true,
}: ClientDashboardClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectDetailItem[]>(initialProjects);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(initialIsProfileComplete);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHowToUseModalOpen, setIsHowToUseModalOpen] = useState(false);
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
  const isRefreshingRef = React.useRef(false);

  const loadData = React.useCallback(async (showFullPageSpinner = false) => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
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
      isRefreshingRef.current = false;
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
    const awaitingInfo = awaitingInfoProjects.length;
    const pendingQuotes = pendingQuoteProjects.length;
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
  }, [projects, awaitingInfoProjects.length, pendingQuoteProjects.length]);

  // Live Research Journey: Select primary active study for milestone progress tracker
  const primaryStudy = useMemo(() => {
    if (!projects || projects.length === 0) return null;

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

  return (
    <div
      data-portal="client"
      className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade"
    >
      <PageHeader
        title={userName ? `Welcome back, ${userName.split(" ")[0]}` : "Client Research Workspace"}
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
              className="font-sans text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border-white/15 hover:bg-white/[0.06] text-white active:scale-[0.97] transition-all rounded-[2px]"
              title="How to Use JAXIS Guide"
            >
              <Question size={16} weight="fill" className="text-sky-400" />
              <span>How It Works</span>
            </Button>

            {isProfileComplete === null ? (
              <Button
                variant="primary"
                size="md"
                disabled
                className="font-bold tracking-wider font-sans text-xs sm:text-sm opacity-50 cursor-wait pointer-events-none rounded-[2px]"
              >
                <LoadingState variant="inline" label="Loading..." />
              </Button>
            ) : isProfileComplete === false ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsProfileModalOpen(true)}
                className="font-bold tracking-wider font-sans text-xs sm:text-sm animate-content-fade bg-[#CC6600] hover:bg-[#B35500] text-white active:scale-[0.97] transition-all rounded-[2px]"
              >
                1. Setup School First →
              </Button>
            ) : (
              <Link href="/dashboard/client/projects/new" className="animate-content-fade w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full font-bold tracking-wider font-sans text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#CC6600] hover:bg-[#B35500] text-white active:scale-[0.97] transition-all rounded-[2px]"
                >
                  <Plus size={16} weight="bold" />
                  <span>Submit New Study Request</span>
                </Button>
              </Link>
            )}
          </div>
        }
      />


      {/* ── High-Priority Pending Quotation Alert Banner ── */}
      {pendingQuoteProjects.length > 0 && (
        <div className="flex flex-col gap-3 animate-card-reveal">
          {pendingQuoteProjects.map((p) => (
            <Card
              key={p.id}
              className="p-5 border border-amber-500/40 bg-amber-500/[0.08] shadow-xl flex flex-col gap-3 rounded-[2px]"
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
              className="p-5 border border-amber-500/30 bg-amber-500/[0.06] shadow-xl flex flex-col gap-3 rounded-[2px]"
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

      {/* ── Actionable KPI Metric Cards (Typography-First Dashdark X Precision Standard) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch">
        <KpiCard
          label="Total Studies"
          value={kpis.total}
          variant="default"
          badge="ALL TIME"
          badgeColor="gray"
          description="Commissioned research studies"
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
              ? `${kpis.actionRequired} items require your review`
              : "All clear & up to date"
          }
          icon={
            kpis.actionRequired > 0 ? (
              <Clock size={16} weight="fill" className="text-[#FFA040]" />
            ) : undefined
          }
          className="animate-card-reveal stagger-2"
        />

        <KpiCard
          label="In Progress / QA"
          value={kpis.inProgress}
          variant="default"
          badge="ACTIVE"
          badgeColor="sky"
          description="Under active statistical analysis"
          className="animate-card-reveal stagger-3"
        />

        <KpiCard
          label="Defense Ready"
          value={kpis.delivered}
          variant="default"
          badge="DELIVERED"
          badgeColor="emerald"
          description="Tables & reports ready to download"
          className="animate-card-reveal stagger-4"
        />
      </div>


      {/* ── Asymmetric 2:1 Bento Architecture (Dashdark X Precision Standard) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch animate-card-reveal stagger-5">
        {/* 8-Col Primary Hero: Live Research Journey & 5-Stage Stepper */}
        <div className="lg:col-span-8 flex flex-col">
          <Card className="p-6 sm:p-7 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col justify-between gap-5 h-full">
            {primaryStudy && stageInfo ? (
              <>
                {/* Category Micro-Label */}
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-white/50 tracking-wider uppercase border-b border-white/[0.06] pb-3">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CC6600]" />
                    Active Research Journey
                  </span>
                  <span className="text-white/40 font-mono text-[10px]">
                    Stage {stageInfo.stageIndex + 1} of 5
                  </span>
                </div>

                {/* Study Metadata & Direct Action Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#FFA040] shrink-0">
                      <Target size={20} weight="fill" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CopyButton
                          variant="badge"
                          value={primaryStudy.intakeId}
                          label={primaryStudy.intakeId}
                        />
                        <span className="text-white/30 text-xs font-mono">·</span>
                        <span className="text-xs font-sans text-white/50">
                          Target: {new Date(primaryStudy.deadlineRequested).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white font-sans truncate mt-1" title={primaryStudy.researchTitle}>
                        {primaryStudy.researchTitle}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <Link href={`/dashboard/client/projects/${primaryStudy.id}${stageInfo.actionPath}`}>
                      <Button
                        variant="primary"
                        size="sm"
                        className="font-sans text-xs font-semibold px-4 py-2 bg-[#CC6600] hover:bg-[#B35500] text-white rounded-[2px] active:scale-[0.97] transition-all flex items-center gap-1.5 shadow-md"
                      >
                        <span>{stageInfo.actionText} →</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* 5-Stage Visual Stepper Container (Recessed Well L2) */}
                <div className="bg-[#010D1F] border border-white/10 rounded-[2px] p-3.5 sm:p-4 my-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {RESEARCH_STAGES.map((stg, i) => {
                      const isCompleted = i < stageInfo.stageIndex;
                      const isCurrent = i === stageInfo.stageIndex;

                      return (
                        <div
                          key={stg.id}
                          className={`p-3 rounded-[2px] border transition-all flex flex-col justify-between gap-2.5 ${
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
                              {isCompleted ? <Check size={12} weight="bold" /> : i + 1}
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
                </div>

                {/* Bottom Status Ribbon */}
                <div className="flex items-center justify-between text-xs text-white/50 font-sans pt-3 border-t border-white/[0.06] flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#CC6600] animate-pulse" />
                    <span>Current Status: <strong className="text-white font-medium">{stageInfo.statusLabel}</strong></span>
                  </div>
                  <div className="flex items-center gap-4">
                    {projects.length > 1 && (
                      <Link
                        href="/dashboard/client/projects"
                        prefetch={true}
                        onMouseEnter={() => router.prefetch("/dashboard/client/projects")}
                        className="text-white/60 hover:text-white transition-colors font-sans text-xs font-medium cursor-pointer"
                      >
                        All Studies ({projects.length}) →
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/client/projects/${primaryStudy.id}`}
                      prefetch={true}
                      onMouseEnter={() => router.prefetch(`/dashboard/client/projects/${primaryStudy.id}`)}
                      className="text-sky-400 hover:text-sky-300 transition-colors font-sans text-xs font-medium cursor-pointer"
                    >
                      View Full Study Details →
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Category Micro-Label */}
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-white/50 tracking-wider uppercase border-b border-white/[0.06] pb-3">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CC6600]" />
                    Active Research Journey
                  </span>
                  <span className="text-white/40 font-mono text-[10px]">
                    Stage 1 of 5
                  </span>
                </div>

                {/* Study Metadata & Direct Action Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#FFA040] shrink-0">
                      <Target size={20} weight="fill" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono uppercase bg-white/[0.08] text-white/70 border border-white/10 font-semibold">
                          NEW STUDY
                        </span>
                        <span className="text-white/30 text-xs font-mono">·</span>
                        <span className="text-xs font-sans text-white/50">
                          Turnaround: 2–5 days
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white font-sans truncate mt-1">
                        {isProfileComplete === false
                          ? "Setup Your School Profile to Begin"
                          : "Commission Your First Research Study"}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    {isProfileComplete === false ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsProfileModalOpen(true)}
                        className="font-sans text-xs font-semibold px-4 py-2 bg-[#CC6600] hover:bg-[#B35500] text-white rounded-[2px] active:scale-[0.97] transition-all flex items-center gap-1.5 shadow-md"
                      >
                        <span>1. Setup School First →</span>
                      </Button>
                    ) : (
                      <Link href="/dashboard/client/projects/new">
                        <Button
                          variant="primary"
                          size="sm"
                          className="font-sans text-xs font-semibold px-4 py-2 bg-[#CC6600] hover:bg-[#B35500] text-white rounded-[2px] active:scale-[0.97] transition-all flex items-center gap-1.5 shadow-md"
                        >
                          <Plus size={14} weight="bold" />
                          <span>Start Study Request →</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* 5-Stage Visual Stepper Container (Recessed Well L2) */}
                <div className="bg-[#010D1F] border border-white/10 rounded-[2px] p-3.5 sm:p-4 my-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {RESEARCH_STAGES.map((stg, i) => {
                      const isCurrent = i === 0;

                      return (
                        <div
                          key={stg.id}
                          className={`p-3 rounded-[2px] border transition-all flex flex-col justify-between gap-2.5 ${
                            isCurrent
                              ? "bg-[#011C38] border-[#CC6600]/80 shadow-md ring-1 ring-[#CC6600]/40"
                              : "bg-white/[0.01] border-white/[0.06] text-white/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                                isCurrent
                                  ? "bg-[#CC6600] text-white"
                                  : "bg-white/[0.05] text-white/40 border border-white/10"
                              }`}
                            >
                              {i + 1}
                            </span>

                            <span className="text-[9px] font-mono tracking-wider uppercase font-semibold">
                              {isCurrent ? (
                                <span className="text-[#FFA040] animate-pulse">Active</span>
                              ) : (
                                <span className="text-white/30">Next</span>
                              )}
                            </span>
                          </div>

                          <div>
                            <h4
                              className={`text-xs font-sans font-semibold leading-snug ${
                                isCurrent ? "text-white" : "text-white/40"
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
                </div>

                {/* Bottom Status Ribbon */}
                <div className="flex items-center justify-between text-xs text-white/50 font-sans pt-3 border-t border-white/[0.06] flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#CC6600] animate-pulse" />
                    <span>
                      Current Status:{" "}
                      <strong className="text-white font-medium">
                        {isProfileComplete === false
                          ? "Profile Setup Required"
                          : "Ready for Intake Submission"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setIsHowToUseModalOpen(true)}
                      className="text-sky-400 hover:text-sky-300 transition-colors font-sans text-xs font-medium cursor-pointer"
                    >
                      How It Works Guide →
                    </button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* 4-Col Double-Stacked Auxiliary Intelligence Cards */}
        <div className="lg:col-span-4 flex flex-col gap-5 sm:gap-6">
          {/* Auxiliary Card 1: Statistical Consultation Desk */}
          <Card className="p-6 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col justify-between gap-4 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[2px] bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0">
                  <ChatCenteredText size={18} weight="fill" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-sans leading-snug">
                    Statistical Consultation
                  </h4>
                  <span className="text-xs font-sans text-white/50">
                    Assigned Statistical Team
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-white/70 font-sans leading-relaxed">
              {primaryStudy &&
              (primaryStudy.masterStatus === "ACTIVE" ||
                primaryStudy.masterStatus === "EXPERT_ASSIGNED" ||
                primaryStudy.masterStatus === "IN_PROGRESS" ||
                primaryStudy.masterStatus === "FOR_QA")
                ? "Your assigned statistician is actively computing model estimates and QA verification."
                : "Our triage team reviews your study specifications and methodological requirements."}
            </p>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-xs font-mono text-white/40">
                Turnaround: 2–4 hrs
              </span>
              <Link
                href={
                  primaryStudy
                    ? `/dashboard/client/messages?projectId=${primaryStudy.id}`
                    : "/dashboard/client/messages"
                }
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-sans font-semibold py-1.5 px-3 h-auto border-white/15 hover:bg-white/[0.06] text-white rounded-[2px] active:scale-[0.97] transition-all flex items-center gap-1.5"
                >
                  <span>Message Desk →</span>
                </Button>
              </Link>
            </div>
          </Card>

          {/* Auxiliary Card 2: DefenseLab Oral Defense Simulator */}
          <Card className="p-6 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col justify-between gap-4 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#FFA040] shrink-0">
                  <GraduationCap size={18} weight="fill" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-sans leading-snug">
                    DefenseLab Practice
                  </h4>
                  <span className="text-xs font-sans text-white/50">
                    Oral Defense Simulator
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-white/[0.06] border border-white/10 text-white/70 text-[10px] font-mono font-semibold shrink-0">
                READY
              </span>
            </div>

            <p className="text-xs text-white/70 font-sans leading-relaxed">
              Practice defense questions on methodology, sample formulas, and test interpretation before facing your panel.
            </p>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-xs font-mono text-white/40">
                5 Mock Questions
              </span>
              <Link href="/dashboard/client/defenselab">
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs font-sans font-semibold py-1.5 px-3 h-auto bg-[#CC6600] hover:bg-[#B35500] text-white rounded-[2px] active:scale-[0.97] transition-all flex items-center gap-1.5 shadow-md"
                >
                  <span>Launch Simulator →</span>
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Initial Page Loader if Data is Fetching ── */}
      {isLoading && projects.length === 0 && (
        <div className="py-24 flex justify-center items-center">
          <LoadingState variant="page" label="Loading research workspace..." />
        </div>
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
