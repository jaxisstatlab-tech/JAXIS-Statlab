"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader, Card, Button, KpiCard, Toast, LoadingState, CopyButton } from "@repo/ui";
import { Peso } from "@repo/ui/MoneyDisplay";
import {
  ArrowRight,
  CalendarBlank,
  ChatCenteredText,
  Check,
  FileText,
  Flag,
  GraduationCap,
  Plus,
  Question,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { getProjects } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { QuickProfileModal } from "@/features/client-profile/components/QuickProfileModal";
import { HowToUseModal } from "@/features/client-onboarding/components/HowToUseModal";
import { RequestStudyDeletionModal } from "@/features/projects/components/RequestStudyDeletionModal";
import { ClientStageTag, ClientStudyStepper } from "@/features/projects/components/ClientStudyStepper";
import { clientStagePriority, getClientStage } from "@/features/projects/client-stage";
import type { ProjectDetailItem } from "@/features/projects/schemas";

const STUDY_BASE = "/dashboard/client/projects";

// What happens after a study is sent, shown to first-time clients.
const JOURNEY = [
  { step: "Price", body: "A fixed written price within 24 hours" },
  { step: "Agreement", body: "Sign your scope online" },
  { step: "Deposit", body: "Pay by GCash or bank transfer" },
  { step: "Analysis", body: "Run, then checked by a second statistician" },
  { step: "Files", body: "Tables, write-up, and code" },
];

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

function paymentLabel(study: ProjectDetailItem): string | null {
  const f = study.financialSummary;
  if (!f) return null;
  if (f.isFullyPaid) return "Fully paid";
  if (f.isDownpaymentCleared) return "Deposit paid";
  return null;
}

// Card header anatomy shared across the dashboard: inline orange icon, title, subtitle, optional tag, hairline.
function CardHeader({
  icon: Icon,
  title,
  subtitle,
  aside,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center">
      <div>
        <h2 className="flex items-center gap-2.5 font-sans text-base font-bold text-white">
          <Icon size={18} weight="fill" className="shrink-0 text-[#CC6600]" />
          <span>{title}</span>
        </h2>
        <p className="mt-1 font-sans text-xs text-white/60">{subtitle}</p>
      </div>
      {aside ? <div className="shrink-0 self-start sm:self-auto">{aside}</div> : null}
    </div>
  );
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

  const loadData = React.useCallback(
    async (showFullPageSpinner = false) => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      if (showFullPageSpinner) {
        setIsLoading(true);
      }
      try {
        const [projRes, profile] = await Promise.all([getProjects(), getClientProfile()]);

        if (projRes.success && Array.isArray(projRes.data)) {
          setProjects(projRes.data);
        }

        setIsProfileComplete(Boolean(profile && profile.institutionSchool && profile.contactNumber));
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
    },
    [router]
  );

  // Re-fetch immediately when redirected from a newly submitted intake
  useEffect(() => {
    const created = searchParams.get("created");
    const intakeId = searchParams.get("intakeId");
    if (created === "true" && !hasHandledCreatedRef.current) {
      hasHandledCreatedRef.current = true;
      setToast({
        variant: "success",
        message: "Study Sent",
        description: intakeId
          ? `We'll send your fixed written price within 24 hours. Your study ID is ${intakeId}.`
          : "We'll send your fixed written price within 24 hours.",
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

  // Studies ordered by urgency: things the client must do first, then work in progress, then the rest.
  const sortedStudies = useMemo(
    () =>
      [...projects].sort((a, b) => clientStagePriority(a.masterStatus) - clientStagePriority(b.masterStatus)),
    [projects]
  );

  const actionStudies = useMemo(
    () => sortedStudies.filter((p) => getClientStage(p.masterStatus).tone === "action"),
    [sortedStudies]
  );

  const counts = useMemo(() => {
    const tones = projects.map((p) => getClientStage(p.masterStatus).tone);
    return {
      total: projects.length,
      action: tones.filter((t) => t === "action").length,
      working: tones.filter((t) => t === "wait").length,
      ready: projects.filter((p) => p.masterStatus === "DELIVERED" || p.masterStatus === "CLOSED").length,
    };
  }, [projects]);

  // Spotlight the study we're working on; actions already have their own list above it.
  // Only when nothing is in progress does the most urgent study take the spotlight.
  const focusStudy =
    sortedStudies.find((p) => getClientStage(p.masterStatus).tone === "wait") ?? sortedStudies[0] ?? null;
  const focusStage = focusStudy ? getClientStage(focusStudy.masterStatus) : null;
  const attentionStudies = actionStudies.filter((p) => p.id !== focusStudy?.id);

  const firstName = userName ? userName.split(" ")[0] : undefined;
  const hasStudies = projects.length > 0;

  const handleProfileSuccess = async () => {
    await loadData();
    setToast({
      variant: "success",
      message: "Profile Saved",
      description: "You can now send your first study.",
    });
  };

  const newStudyButton = isProfileComplete ? (
    <Button asChild variant="primary" size="sm" className="gap-1.5 active:scale-[0.97]">
      <Link href={`${STUDY_BASE}/new`}>
        <Plus size={15} weight="bold" />
        Send a new study
      </Link>
    </Button>
  ) : (
    <Button variant="primary" size="sm" onClick={() => setIsProfileModalOpen(true)} className="gap-1.5 active:scale-[0.97]">
      Set up your profile
      <ArrowRight size={14} weight="bold" />
    </Button>
  );

  return (
    <div data-portal="client" className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "My Studies"}
        description={
          hasStudies
            ? "Here's where your studies stand and what, if anything, needs you."
            : "Two quick steps and your first study is on its way."
        }
        breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, { label: "My Studies" }]}
        actions={
          <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHowToUseModalOpen(true)}
              className="gap-1.5 active:scale-[0.97]"
            >
              <Question size={15} weight="fill" className="text-white/60" />
              How it works
            </Button>
            {hasStudies ? newStudyButton : null}
          </div>
        }
      />

      {isLoading && !hasStudies ? (
        <div className="flex items-center justify-center py-24">
          <LoadingState variant="page" label="Loading your studies..." />
        </div>
      ) : !hasStudies ? (
        /* ── First run: two-step checklist and what happens next ── */
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          <Card className="flex flex-col gap-6 rounded-[2px] border border-white/10 bg-[#01142B] p-6 sm:p-8 lg:col-span-8">
            <CardHeader
              icon={Flag}
              title="Get started"
              subtitle="Two quick steps. It takes about five minutes."
              aside={
                <span className="rounded-[2px] border border-white/10 bg-white/[0.06] px-2.5 py-1 font-mono text-xs font-semibold text-white/70">
                  {isProfileComplete ? "1 of 2 done" : "0 of 2 done"}
                </span>
              }
            />

            <ol className="flex flex-col">
              {[
                {
                  n: 1,
                  title: "Add your school details",
                  body: "Your school, program, and contact number. They go on your agreement.",
                  done: isProfileComplete,
                  cta: (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsProfileModalOpen(true)}
                      className="gap-1.5 active:scale-[0.97]"
                    >
                      Add details
                      <ArrowRight size={14} weight="bold" />
                    </Button>
                  ),
                },
                {
                  n: 2,
                  title: "Send your first study",
                  body: "Your research questions, method, and data. We reply with a fixed written price within 24 hours.",
                  done: false,
                  cta: isProfileComplete ? (
                    <Button asChild variant="primary" size="sm" className="gap-1.5 active:scale-[0.97]">
                      <Link href={`${STUDY_BASE}/new`}>
                        Send a study
                        <ArrowRight size={14} weight="bold" />
                      </Link>
                    </Button>
                  ) : (
                    <span className="font-sans text-xs text-white/40">After step 1</span>
                  ),
                },
              ].map((item, i) => (
                <li
                  key={item.n}
                  className={`flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between ${
                    i > 0 ? "border-t border-white/[0.08]" : ""
                  }`}
                >
                  <div className="flex gap-4">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] border font-mono text-xs ${
                        item.done
                          ? "border-white/20 bg-white/[0.08] text-white"
                          : "border-[#CC6600]/50 text-[#FFA040]"
                      }`}
                    >
                      {item.done ? <Check size={13} weight="bold" /> : item.n}
                    </span>
                    <div>
                      <p className={`font-sans text-sm font-semibold ${item.done ? "text-white/55 line-through decoration-white/30" : "text-white"}`}>
                        {item.title}
                      </p>
                      <p className="mt-1 max-w-md font-sans text-sm leading-relaxed text-white/55">{item.body}</p>
                    </div>
                  </div>
                  <div className="shrink-0 pl-11 sm:pl-0">
                    {item.done ? (
                      <span className="inline-flex items-center gap-1.5 font-sans text-xs text-white/55">
                        <Check size={12} weight="bold" /> Done
                      </span>
                    ) : (
                      item.cta
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <div className="border-t border-white/10 pt-6">
              <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-white/45">
                What happens after you send it
              </p>
              <ol className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-5 sm:gap-3">
                {JOURNEY.map((j, i) => (
                  <li key={j.step} className="flex gap-3 sm:flex-col sm:gap-2">
                    <span className="font-mono text-[11px] text-white/35">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="font-sans text-sm font-semibold text-white">{j.step}</p>
                      <p className="mt-0.5 font-sans text-xs leading-relaxed text-white/50">{j.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Card>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <HelpCard onHowItWorks={() => setIsHowToUseModalOpen(true)} />
            <DefenseLabCard />
          </div>
        </div>
      ) : (
        <>
          {/* ── Needs your attention ── */}
          {attentionStudies.length > 0 ? (
            <Card className="flex flex-col gap-2 rounded-[2px] border border-[#CC6600]/35 bg-[#01142B] p-6 sm:p-8">
              <CardHeader
                icon={Warning}
                title="Needs your attention"
                subtitle={
                  attentionStudies.length === 1
                    ? "One study is waiting on you."
                    : `${attentionStudies.length} studies are waiting on you.`
                }
              />
              <ul className="flex flex-col">
                {attentionStudies.map((study, i) => {
                  const stage = getClientStage(study.masterStatus);
                  return (
                    <li
                      key={study.id}
                      className={`flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between ${
                        i > 0 ? "border-t border-white/[0.08]" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <ClientStageTag stage={stage} />
                          <CopyButton variant="badge" value={study.intakeId} label={study.intakeId} />
                        </div>
                        <p className="mt-2 truncate font-sans text-sm font-semibold text-white" title={study.researchTitle}>
                          {study.researchTitle}
                        </p>
                        <p className="mt-1 font-sans text-sm text-white/60">{stage.now}</p>
                        {study.masterStatus === "AWAITING_INFORMATION" && study.missingInfoReason ? (
                          <p className="mt-2 border-l-2 border-[#CC6600]/50 pl-3 font-sans text-sm text-white/75">
                            &ldquo;{study.missingInfoReason}&rdquo;
                          </p>
                        ) : null}
                      </div>
                      {stage.action ? (
                        <Button asChild variant="primary" size="sm" className="shrink-0 gap-1.5 self-start active:scale-[0.97] md:self-center">
                          <Link href={`${STUDY_BASE}/${study.id}${stage.action.path}`}>
                            {stage.action.label}
                            <ArrowRight size={14} weight="bold" />
                          </Link>
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}

          {/* ── At a glance ── */}
          <div className="grid grid-cols-2 items-stretch gap-6 lg:grid-cols-4">
            <KpiCard label="All studies" value={counts.total} description="Sent to us" />
            <KpiCard
              label="Needs you"
              value={counts.action}
              variant={counts.action > 0 ? "orange" : "default"}
              description={counts.action > 0 ? "Need your action" : "Nothing needed"}
            />
            <KpiCard label="In progress" value={counts.working} description="Being worked on" />
            <KpiCard label="Ready" value={counts.ready} description="To download" />
          </div>

          {/* ── Current study + side cards ── */}
          {focusStudy && focusStage ? (
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
              <Card className="flex flex-col gap-6 rounded-[2px] border border-white/10 bg-[#01142B] p-6 sm:p-8 lg:col-span-8">
                <CardHeader
                  icon={Flag}
                  title="Current study"
                  subtitle="Where it is now and what comes next."
                  aside={<ClientStageTag stage={focusStage} />}
                />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-sans text-xs text-white/50">
                    <CopyButton variant="badge" value={focusStudy.intakeId} label={focusStudy.intakeId} />
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarBlank size={13} weight="fill" className="text-white/35" />
                      Due {formatDate(focusStudy.deadlineRequested)}
                    </span>
                    {focusStudy.files && focusStudy.files.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <FileText size={13} weight="fill" className="text-white/35" />
                        {focusStudy.files.length} file{focusStudy.files.length > 1 ? "s" : ""}
                      </span>
                    ) : null}
                    {paymentLabel(focusStudy) ? <span>{paymentLabel(focusStudy)}</span> : null}
                  </div>
                  <h3
                    className="mt-3 line-clamp-2 font-sans text-lg font-bold tracking-[-0.01em] text-white sm:text-xl"
                    title={focusStudy.researchTitle}
                  >
                    {focusStudy.researchTitle}
                  </h3>
                </div>

                <ClientStudyStepper stage={focusStage} />

                <div className="grid grid-cols-1 gap-4 rounded-[2px] border border-white/[0.08] bg-[#010D1F] p-5 sm:grid-cols-2">
                  <div>
                    <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-white/45">Now</p>
                    <p className="mt-1.5 font-sans text-sm leading-relaxed text-white/80">{focusStage.now}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-white/45">Next</p>
                    <p className="mt-1.5 font-sans text-sm leading-relaxed text-white/80">{focusStage.next}</p>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-3 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-sm">
                    <Link
                      href={`/dashboard/client/messages?projectId=${focusStudy.id}`}
                      className="inline-flex items-center gap-1.5 text-white/65 transition-colors hover:text-white"
                    >
                      <ChatCenteredText size={15} weight="fill" className="text-white/40" />
                      Message your team
                    </Link>
                    <Link
                      href={`${STUDY_BASE}/${focusStudy.id}`}
                      className="text-white/65 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
                    >
                      Open study
                    </Link>
                  </div>
                  {focusStage.action ? (
                    <Button asChild variant="primary" size="sm" className="gap-1.5 self-start active:scale-[0.97] sm:self-auto">
                      <Link href={`${STUDY_BASE}/${focusStudy.id}${focusStage.action.path}`}>
                        {focusStage.action.label}
                        <ArrowRight size={14} weight="bold" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </Card>

              <div className="flex flex-col gap-6 lg:col-span-4">
                <HelpCard onHowItWorks={() => setIsHowToUseModalOpen(true)} projectId={focusStudy.id} />
                <DefenseLabCard />
              </div>
            </div>
          ) : null}

          {/* ── All studies ── */}
          <Card className="overflow-hidden rounded-[2px] border border-white/10 bg-[#01142B] p-0">
            <div className="flex flex-col justify-between gap-3 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:px-8">
              <div>
                <h2 className="flex items-center gap-2.5 font-sans text-base font-bold text-white">
                  <FileText size={18} weight="fill" className="shrink-0 text-[#CC6600]" />
                  Your studies
                </h2>
                <p className="mt-1 font-sans text-xs text-white/60">Newest actions first. Open a study to see every detail.</p>
              </div>
              <span className="self-start rounded-[2px] border border-white/10 bg-white/[0.06] px-2.5 py-1 font-mono text-xs font-semibold text-white/70 sm:self-auto">
                {projects.length} {projects.length === 1 ? "study" : "studies"}
              </span>
            </div>

            <ul className="divide-y divide-white/[0.06]">
              {sortedStudies.map((study) => {
                const stage = getClientStage(study.masterStatus);
                return (
                  <li
                    key={study.id}
                    className="group grid cursor-pointer grid-cols-1 gap-3 px-6 py-4 transition-colors hover:bg-white/[0.02] sm:px-8 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-6"
                    onClick={() => router.push(`${STUDY_BASE}/${study.id}`)}
                    onMouseEnter={() => router.prefetch(`${STUDY_BASE}/${study.id}`)}
                  >
                    <div className="min-w-0">
                      <p
                        className="truncate font-sans text-sm font-semibold text-white transition-colors group-hover:text-[#FFA040]"
                        title={study.researchTitle}
                      >
                        {study.researchTitle}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-sans text-xs text-white/45" onClick={(e) => e.stopPropagation()}>
                        <CopyButton variant="badge" value={study.intakeId} label={study.intakeId} />
                        <span>Due {formatDate(study.deadlineRequested)}</span>
                      </div>
                    </div>
                    <ClientStageTag stage={stage} className="justify-self-start" />
                    <div className="flex items-center gap-1.5 justify-self-start md:justify-self-end" onClick={(e) => e.stopPropagation()}>
                      <Button asChild variant="outline" size="sm" className="active:scale-[0.97]">
                        <Link href={`${STUDY_BASE}/${study.id}${stage.action?.path ?? ""}`}>
                          {stage.action?.label ?? "Open"}
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ask to delete ${study.intakeId}`}
                        title="Ask to delete this study"
                        onClick={() =>
                          setStudyToRequestDeletion({ id: study.id, intakeId: study.intakeId, title: study.researchTitle })
                        }
                        className="h-9 min-h-[36px] w-9 min-w-[36px] text-white/40 hover:text-white"
                      >
                        <Trash size={15} weight="fill" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      <QuickProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSuccess={handleProfileSuccess}
      />

      <HowToUseModal
        isOpen={isHowToUseModalOpen}
        onClose={() => setIsHowToUseModalOpen(false)}
        isProfileComplete={isProfileComplete === true}
        onSetupProfile={() => setIsProfileModalOpen(true)}
        onStartRequest={() => {
          window.location.href = `${STUDY_BASE}/new`;
        }}
      />

      <RequestStudyDeletionModal
        open={!!studyToRequestDeletion}
        onClose={() => setStudyToRequestDeletion(null)}
        study={studyToRequestDeletion}
        onRequested={() => {
          loadData();
        }}
      />

      {toast && (
        <Toast variant={toast.variant} message={toast.message} description={toast.description} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

function HelpCard({ onHowItWorks, projectId }: { onHowItWorks: () => void; projectId?: string }) {
  return (
    <Card className="flex flex-1 flex-col gap-4 rounded-[2px] border border-white/10 bg-[#01142B] p-6">
      <CardHeader icon={ChatCenteredText} title="Questions?" subtitle="Message our team anytime. We reply here." />
      <p className="font-sans text-sm leading-relaxed text-white/60">
        Ask about your study, your price, or what to send. Your conversation stays inside JAXIS.
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        <Button asChild variant="outline" size="sm" className="active:scale-[0.97]">
          <Link href={projectId ? `/dashboard/client/messages?projectId=${projectId}` : "/dashboard/client/messages"}>
            Open messages
          </Link>
        </Button>
        <button
          type="button"
          onClick={onHowItWorks}
          className="font-sans text-sm text-white/60 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
        >
          How it works
        </button>
      </div>
    </Card>
  );
}

function DefenseLabCard() {
  return (
    <Card className="flex flex-1 flex-col gap-4 rounded-[2px] border border-white/10 bg-[#01142B] p-6">
      <CardHeader icon={GraduationCap} title="Practice your defense" subtitle="DefenseLab mock panel" />
      <p className="font-sans text-sm leading-relaxed text-white/60">
        A 1-on-1 video session with a senior statistician who asks the questions panels ask. You get the recording.
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <span className="font-mono text-sm font-bold text-white">
          <Peso />
          250
          <span className="ml-1 font-sans text-xs font-normal text-white/45">per hour</span>
        </span>
        <Button asChild variant="outline" size="sm" className="active:scale-[0.97]">
          <Link href="/dashboard/client/defenselab">Learn more</Link>
        </Button>
      </div>
    </Card>
  );
}
