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
  StatusBadge,
} from "@repo/ui";
import {
  Plus,
  Question,
  Target,
  CheckCircle,
  Clock,
  ChatCenteredText,
  GraduationCap,
  ShieldCheck,
  Trash,
  ArrowRight,
  CalendarBlank,
  FileText,
} from "@phosphor-icons/react";
import { getProjects } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { QuickProfileModal } from "@/features/client-profile/components/QuickProfileModal";
import { HowToUseModal } from "@/features/client-onboarding/components/HowToUseModal";
import { RequestStudyDeletionModal } from "@/features/projects/components/RequestStudyDeletionModal";
import type { ProjectDetailItem } from "@/features/projects/schemas";

const RESEARCH_STAGES = [
  { id: "quote", title: "1. Proposal & Quote", desc: "Scope & pricing review" },
  { id: "sow", title: "2. Contract (SOW)", desc: "Signed agreement" },
  { id: "deposit", title: "3. Downpayment", desc: "Deposit to start" },
  { id: "analysis", title: "4. Analysis & QA", desc: "Statistical modeling" },
  { id: "deliverables", title: "5. Final Outputs", desc: "Reports & data tables" },
];

export interface StudyStageInfo {
  stageIndex: number;
  statusLabel: string;
  actionText: string;
  actionPath: string;
  summary: string;
  nextStep: string;
}

function getStudyStage(status: string): StudyStageInfo {
  switch (status) {
    case "NEW_REQUEST":
    case "UNDER_EVALUATION":
      return {
        stageIndex: 0,
        statusLabel: "Proposal Under Review",
        actionText: "Open Study",
        actionPath: "",
        summary: "Our methodological triage desk is assessing your research scope and model requirements.",
        nextStep: "Admin will formulate an itemized package quotation tailored to your statistical objectives.",
      };
    case "AWAITING_INFORMATION":
      return {
        stageIndex: 0,
        statusLabel: "Information Needed",
        actionText: "Upload Files",
        actionPath: "",
        summary: "Additional research instruments or documentation required to finalize your quote.",
        nextStep: "Please upload questionnaire drafts, raw datasets, or institutional guidelines.",
      };
    case "QUOTE_SENT":
      return {
        stageIndex: 0,
        statusLabel: "Quotation Ready",
        actionText: "Review Quote",
        actionPath: "/quote",
        summary: "Official quotation and package options have been prepared for your study.",
        nextStep: "Review the pricing breakdown and approve to generate the formal Scope of Work.",
      };
    case "CLIENT_APPROVED":
    case "SOW_PENDING":
      return {
        stageIndex: 1,
        statusLabel: "Agreement Ready",
        actionText: "Sign Agreement",
        actionPath: "/sow",
        summary: "The formal Scope of Work contract is ready for your electronic signature.",
        nextStep: "Review the milestone terms, statistical deliverables, and sign to formalize engagement.",
      };
    case "SOW_SIGNED":
    case "AWAITING_PAYMENT":
      return {
        stageIndex: 2,
        statusLabel: "Downpayment Required",
        actionText: "Pay Deposit",
        actionPath: "/deposit",
        summary: "Contract successfully executed. Initial downpayment is required to lock specialist scheduling.",
        nextStep: "Upload your GCash, Maya, or bank transfer deposit slip to unlock specialist assignment.",
      };
    case "ACTIVE":
    case "EXPERT_ASSIGNED":
    case "IN_PROGRESS":
      return {
        stageIndex: 3,
        statusLabel: "Analysis in Progress",
        actionText: "View Progress",
        actionPath: "",
        summary: "Your assigned Lead Statistician is cleaning datasets, specifying models, and computing statistical tests.",
        nextStep: "Outputs will be compiled into draft tables and sent to the QA Lead for reproducibility auditing.",
      };
    case "FOR_QA":
    case "QA_REVISION":
      return {
        stageIndex: 3,
        statusLabel: "Quality Assurance Check",
        actionText: "View QA Audit",
        actionPath: "",
        summary: "Senior QA Lead is running independent verification scripts and auditing APA format compliance.",
        nextStep: "Once all formulas and interpretations pass statistical peer review, final files will be released.",
      };
    case "DELIVERED":
    case "CLOSED":
      return {
        stageIndex: 4,
        statusLabel: "Defense Ready",
        actionText: "Get Deliverables",
        actionPath: "",
        summary: "All statistical tables, narrative interpretations, and verification certificates are finalized.",
        nextStep: "Download your complete deliverable package. You have 7 days to request any included revisions.",
      };
    default:
      return {
        stageIndex: 0,
        statusLabel: "Under Review",
        actionText: "View Study",
        actionPath: "",
        summary: "Your research submission is being processed by the administration team.",
        nextStep: "Follow live milestone updates here as your study advances through the research milestones.",
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
  const [studyToRequestDeletion, setStudyToRequestDeletion] = useState<{
    id: string;
    intakeId?: string;
    title: string;
  } | null>(null);
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

  useEffect(() => {
    if (initialIsProfileComplete !== undefined) {
      setIsProfileComplete(initialIsProfileComplete);
    }
  }, [initialIsProfileComplete]);

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
      // In development mode (Turbopack), hot-reloading while a tab is idle in the background
      // can cause transient action ID mismatches. Fall back to router.refresh() to reload RSC tree.
      router.refresh();
      if (process.env.NODE_ENV === "development") {
        console.warn("[ClientDashboard] Background sync refreshed via router:", err);
      }
    } finally {
      isRefreshingRef.current = false;
      if (showFullPageSpinner) {
        setIsLoading(false);
      }
    }
  }, [router]);

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
        router.refresh();
      }
    };

    window.addEventListener("jaxis:study-updated", handleStudyUpdated);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("jaxis:study-updated", handleStudyUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadData, router]);

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

  const stagePercentage = useMemo(() => {
    if (!stageInfo) return 20;
    return Math.round(((stageInfo.stageIndex + 1) / 5) * 100);
  }, [stageInfo]);

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
      className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade"
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
                  <Plus size={16} weight="fill" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-card-reveal stagger-5">
        {/* 8-Col Primary Hero: Live Research Journey & 5-Stage Stepper */}
        <div className="lg:col-span-8 flex flex-col">
          <Card className="p-6 sm:p-7 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col justify-between gap-4 sm:gap-5 h-full">
            {primaryStudy && stageInfo ? (
              <>
                {/* 1. Header: Categorical Identity & Stage Readout */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <Target size={16} weight="fill" className="text-[#CC6600]" />
                    <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Active Research Journey
                    </h2>
                  </div>
                  <span className="text-white/40 font-mono text-[11px]">
                    Stage {stageInfo.stageIndex + 1} of 5 · {stagePercentage}%
                  </span>
                </div>

                {/* 2. Study Focal Subject & Direct Action CTA */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex flex-col min-w-0 flex-1">
                    {/* Unified Metadata Row (Zero nested container box) */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <CopyButton
                        variant="badge"
                        value={primaryStudy.intakeId}
                        label={primaryStudy.intakeId}
                      />
                      {primaryStudy.packageName && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono uppercase bg-white/[0.06] text-white/70 border border-white/10 font-medium">
                          {primaryStudy.packageName.replace(/_/g, " ")}
                        </span>
                      )}
                      <span className="text-white/30 font-mono">·</span>
                      <span className="text-xs font-sans text-white/50 inline-flex items-center gap-1">
                        <CalendarBlank size={12} weight="fill" className="text-white/40 shrink-0" />
                        <span>Due {new Date(primaryStudy.deadlineRequested).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </span>
                      {primaryStudy.files && primaryStudy.files.length > 0 && (
                        <>
                          <span className="text-white/30 font-mono">·</span>
                          <span className="text-xs font-sans text-white/50 inline-flex items-center gap-1">
                            <FileText size={12} weight="fill" className="text-white/40 shrink-0" />
                            <span>{primaryStudy.files.length} file{primaryStudy.files.length > 1 ? "s" : ""}</span>
                          </span>
                        </>
                      )}
                      <span className="text-white/30 font-mono">·</span>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono ${
                        primaryStudy.financialSummary?.isFullyPaid || primaryStudy.financialSummary?.isDownpaymentCleared
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          primaryStudy.financialSummary?.isFullyPaid || primaryStudy.financialSummary?.isDownpaymentCleared
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                        }`} />
                        {primaryStudy.financialSummary?.isFullyPaid
                          ? "100% Cleared"
                          : primaryStudy.financialSummary?.isDownpaymentCleared
                          ? "Deposit Cleared"
                          : "Deposit Pending"}
                      </span>
                    </div>

                    <h3
                      className="text-base sm:text-lg lg:text-xl font-bold text-white font-sans truncate mt-2 tracking-tight"
                      title={primaryStudy.researchTitle}
                    >
                      {primaryStudy.researchTitle}
                    </h3>
                    {primaryStudy.researchObjectives && (
                      <p
                        className="text-xs text-white/50 font-sans line-clamp-1 mt-1"
                        title={primaryStudy.researchObjectives}
                      >
                        {primaryStudy.researchObjectives}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    <Link href={`/dashboard/client/projects/${primaryStudy.id}${stageInfo.actionPath}`}>
                      <Button
                        variant="primary"
                        size="sm"
                        className="font-sans text-xs font-semibold px-4 py-2 bg-[#CC6600] hover:bg-[#B35500] text-white rounded-[2px] active:scale-[0.97] transition-all flex items-center gap-1.5 shadow-md whitespace-nowrap cursor-pointer"
                      >
                        <span>{stageInfo.actionText} →</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* 3. Sleek 5-Stage Precision Pipeline */}
                <div className="flex flex-col gap-2.5 pt-1">
                  {/* Continuous Segmented Bar */}
                  <div className="grid grid-cols-5 gap-2 w-full">
                    {RESEARCH_STAGES.map((_, i) => {
                      const isCompleted = i < stageInfo.stageIndex;
                      const isCurrent = i === stageInfo.stageIndex;
                      return (
                        <div
                          key={i}
                          className={`h-2 rounded-[2px] transition-all duration-300 ${
                            isCompleted
                              ? "bg-emerald-500"
                              : isCurrent
                              ? "bg-[#CC6600]"
                              : "bg-white/[0.08]"
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* 5 Stage Node Labels */}
                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {RESEARCH_STAGES.map((stg, i) => {
                      const isCompleted = i < stageInfo.stageIndex;
                      const isCurrent = i === stageInfo.stageIndex;
                      const cleanTitle = stg.title.replace(/^\d+\.\s*/, "");

                      return (
                        <div key={stg.id} className="flex flex-col min-w-0 pr-1">
                          <div className="flex items-center gap-1.5">
                            {isCompleted ? (
                              <CheckCircle size={13} weight="fill" className="text-emerald-400 shrink-0" />
                            ) : isCurrent ? (
                              <span className="w-2 h-2 rounded-full bg-[#CC6600] ring-2 ring-[#CC6600]/30 shrink-0" />
                            ) : (
                              <span className="text-[10px] font-mono text-white/30 shrink-0">{i + 1}.</span>
                            )}
                            <span
                              className={`text-xs font-sans truncate transition-colors ${
                                isCurrent
                                  ? "font-bold text-white"
                                  : isCompleted
                                  ? "font-medium text-white/80"
                                  : "font-normal text-white/40"
                              }`}
                              title={cleanTitle}
                            >
                              {cleanTitle}
                            </span>
                          </div>
                          <div className="mt-1">
                            {isCurrent ? (
                              <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#CC6600]/20 text-[#FFA040] border border-[#CC6600]/35 font-semibold">
                                Active Stage
                              </span>
                            ) : isCompleted ? (
                              <span className="inline-flex items-center text-[10px] font-mono text-emerald-400/90 font-medium">
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-mono text-white/30">
                                Upcoming
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Active Milestone Mission & Quality Assurance Panel */}
                <div className="bg-[#010D1F]/90 border border-white/[0.08] rounded-[2px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#FFA040] bg-[#CC6600]/20 border border-[#CC6600]/35 px-1.5 py-0.5 rounded-[2px]">
                        STAGE {stageInfo.stageIndex + 1} · {stageInfo.statusLabel.toUpperCase()}
                      </span>
                      <span className="text-white/30 font-mono text-xs hidden sm:inline">·</span>
                      <span className="text-[11px] font-mono text-white/50">
                        Turnaround: 2–5 Business Days
                      </span>
                    </div>

                    <p className="text-xs text-white/85 font-sans mt-2 leading-relaxed">
                      {stageInfo.summary}
                    </p>

                    <div className="flex items-center gap-2 mt-2 text-xs font-sans text-white/55">
                      <ArrowRight size={12} weight="bold" className="text-[#CC6600] shrink-0" />
                      <span className="text-white/40 font-mono text-[10px] uppercase font-semibold">Next Action:</span>
                      <span className="text-white/70 truncate">{stageInfo.nextStep}</span>
                    </div>
                  </div>

                  {/* Quality & Rigor Credentials Strip */}
                  <div className="flex flex-row md:flex-col gap-3 shrink-0 border-t md:border-t-0 md:border-l border-white/[0.08] pt-3 md:pt-0 md:pl-5">
                    <div className="flex items-center gap-2 text-xs">
                      <ShieldCheck size={16} weight="fill" className="text-emerald-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono uppercase text-white/40 leading-none">Format Protocol</span>
                        <span className="text-[11px] font-sans font-semibold text-white/90 mt-0.5">APA 7th Edition</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle size={16} weight="fill" className="text-sky-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono uppercase text-white/40 leading-none">Verification</span>
                        <span className="text-[11px] font-sans font-semibold text-white/90 mt-0.5">Dual-Audit Review</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Live Activity Status & Footer Actions Strip */}
                <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-auto">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CC6600] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#CC6600]" />
                    </span>
                    <span className="text-white/70 font-sans truncate" title={stageInfo.summary}>
                      Live Consultation & Verification Desk is active
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 self-end sm:self-center font-sans">
                    <Link
                      href={`/dashboard/client/messages?projectId=${primaryStudy.id}`}
                      prefetch={true}
                      onMouseEnter={() => router.prefetch(`/dashboard/client/messages?projectId=${primaryStudy.id}`)}
                      className="text-white/60 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                    >
                      <ChatCenteredText size={13} weight="fill" className="text-[#CC6600]" />
                      <span>Consultation Chat</span>
                    </Link>

                    {projects.length > 1 && (
                      <Link
                        href="/dashboard/client/projects"
                        prefetch={true}
                        onMouseEnter={() => router.prefetch("/dashboard/client/projects")}
                        className="text-white/50 hover:text-white transition-colors cursor-pointer text-xs"
                      >
                        All Studies ({projects.length}) →
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/client/projects/${primaryStudy.id}`}
                      prefetch={true}
                      onMouseEnter={() => router.prefetch(`/dashboard/client/projects/${primaryStudy.id}`)}
                      className="text-sky-400 hover:text-sky-300 font-semibold transition-colors cursor-pointer text-xs"
                    >
                      View Full Details →
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 1. Category Micro-Label */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <Target size={16} weight="fill" className="text-[#CC6600]" />
                    <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Active Research Journey
                    </h2>
                  </div>
                  <span className="text-white/40 font-mono text-[11px]">
                    Stage 1 of 5
                  </span>
                </div>

                {/* 2. Study Metadata & Direct Action Header */}
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
                          Standard SLA: 2–5 business days
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white font-sans truncate mt-1">
                        {isProfileComplete === false
                          ? "Setup Your School Profile to Begin"
                          : "Commission Your First Research Study"}
                      </h3>
                      <p className="text-xs text-white/50 font-sans line-clamp-1 mt-0.5">
                        Submit your research title, hypotheses, and questionnaire to initiate methodological evaluation.
                      </p>
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
                          <Plus size={14} weight="fill" />
                          <span>Start Study Request →</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* 3. Sleek 5-Stage Minimalist Pipeline (Zero Nested Boxes) */}
                <div className="flex flex-col gap-2.5 pt-1">
                  {/* Continuous Segmented Bar */}
                  <div className="grid grid-cols-5 gap-2 w-full">
                    {RESEARCH_STAGES.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-[1px] transition-all duration-300 ${
                          i === 0 ? "bg-[#CC6600]" : "bg-white/[0.08]"
                        }`}
                      />
                    ))}
                  </div>

                  {/* 5 Stage Node Labels */}
                  <div className="grid grid-cols-5 gap-2 pt-0.5">
                    {RESEARCH_STAGES.map((stg, i) => {
                      const isCurrent = i === 0;
                      const cleanTitle = stg.title.replace(/^\d+\.\s*/, "");

                      return (
                        <div key={stg.id} className="flex flex-col min-w-0 pr-1">
                          <div className="flex items-center gap-1">
                            {isCurrent && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#CC6600] shrink-0" />
                            )}
                            <span
                              className={`text-[11px] sm:text-xs font-sans truncate transition-colors ${
                                isCurrent
                                  ? "font-bold text-white"
                                  : "font-normal text-white/30"
                              }`}
                              title={cleanTitle}
                            >
                              {cleanTitle}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-sans truncate mt-0.5 hidden sm:block ${
                              isCurrent ? "text-[#FFA040] font-medium" : "text-white/20"
                            }`}
                          >
                            {isCurrent ? "Step 1" : `Step ${i + 1}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Integrity & SLA Guarantee Footer (Clean Single Row) */}
                <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-auto">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-5 h-5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                      <ShieldCheck size={13} weight="fill" />
                    </div>
                    <span className="text-white/70 font-sans truncate">
                      Publication-Grade Rigor & Data Confidentiality · Audited by Senior QA Lead
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsHowToUseModalOpen(true)}
                    className="text-sky-400 hover:text-sky-300 transition-colors font-sans text-xs font-medium cursor-pointer shrink-0 self-end sm:self-center"
                  >
                    How It Works Guide →
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* 4-Col Double-Stacked Auxiliary Intelligence Cards */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Auxiliary Card 1: Statistical Consultation Desk */}
          <Card className="p-6 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col justify-between gap-4 flex-1">
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <ChatCenteredText size={18} weight="fill" className="text-sky-400 shrink-0" />
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
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <GraduationCap size={18} weight="fill" className="text-[#FFA040] shrink-0" />
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

      {/* ── Commissioned Research Studies Table ── */}
      {projects.length > 0 && (
        <Card className="p-0 overflow-hidden border border-white/10 bg-[#01142B]/90 rounded-[2px] shadow-2xl animate-card-reveal stagger-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-white tracking-normal font-sans">
                My Commissioned Studies
              </h2>
              <p className="text-sm text-white/60 mt-1 font-sans leading-relaxed">
                Track research milestones, review contracts, and access statistical deliverables.
              </p>
            </div>
            <span className="text-xs font-sans font-semibold text-white/70 bg-white/[0.06] px-3.5 py-1.5 rounded-[2px] border border-white/10 self-start sm:self-auto whitespace-nowrap inline-flex items-center">
              {projects.length} {projects.length === 1 ? "Study" : "Studies"}
            </span>
          </div>

          <div className="w-full overflow-x-auto p-4 sm:p-6">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-[130px] whitespace-nowrap">Study ID</th>
                  <th>Research Title</th>
                  <th className="w-[160px] whitespace-nowrap">Package</th>
                  <th className="w-[140px] whitespace-nowrap">Target Date</th>
                  <th className="w-[160px] whitespace-nowrap">Status</th>
                  <th className="w-[110px] text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((study) => (
                  <tr
                    key={study.id}
                    className="group virtual-row cursor-pointer"
                    onClick={() => router.push(`/dashboard/client/projects/${study.id}`)}
                    onMouseEnter={() => router.prefetch(`/dashboard/client/projects/${study.id}`)}
                  >
                    <td className="font-mono text-xs whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <CopyButton variant="badge" value={study.intakeId} label={study.intakeId} />
                    </td>
                    <td className="text-white font-medium text-sm">
                      <span className="line-clamp-1 group-hover:text-[#CC6600] transition-colors" title={study.researchTitle}>
                        {study.researchTitle}
                      </span>
                    </td>
                    <td className="text-slate-300 text-xs font-sans whitespace-nowrap">
                      {study.packageName?.replace(/_/g, " ") || "Statistical Suite"}
                    </td>
                    <td className="text-slate-400 text-xs font-mono whitespace-nowrap">
                      {new Date(study.deadlineRequested).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="whitespace-nowrap">
                      <StatusBadge status={study.masterStatus} />
                    </td>
                    <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/dashboard/client/projects/${study.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="py-1 px-3 h-auto whitespace-nowrap font-mono text-xs tracking-wider"
                          >
                            OPEN
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Request Study Deletion"
                          onClick={() =>
                            setStudyToRequestDeletion({
                              id: study.id,
                              intakeId: study.intakeId,
                              title: study.researchTitle,
                            })
                          }
                          className="py-1 px-2 h-auto text-white/40 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        >
                          <Trash size={14} weight="fill" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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

      {/* ── Request Study Deletion Modal ── */}
      <RequestStudyDeletionModal
        open={!!studyToRequestDeletion}
        onClose={() => setStudyToRequestDeletion(null)}
        study={studyToRequestDeletion}
        onRequested={() => {
          loadData();
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
