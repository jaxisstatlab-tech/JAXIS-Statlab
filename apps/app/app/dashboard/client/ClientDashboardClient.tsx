"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader, Button, Toast, LoadingState, CopyButton } from "@repo/ui";
import { Peso } from "@repo/ui/MoneyDisplay";
import {
  ArrowRight,
  ChatCenteredText,
  Check,
  CheckCircle,
  GraduationCap,
  Plus,
  Question,
  Trash,
} from "@phosphor-icons/react";
import { getProjects } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { QuickProfileModal } from "@/features/client-profile/components/QuickProfileModal";
import { HowToUseModal } from "@/features/client-onboarding/components/HowToUseModal";
import { RequestStudyDeletionModal } from "@/features/projects/components/RequestStudyDeletionModal";
import { ClientStageTag, ClientStudyStepper } from "@/features/projects/components/ClientStudyStepper";
import {
  clientStagePriority,
  getClientStage,
  type ClientStageTone,
} from "@/features/projects/client-stage";
import { useDueText } from "@/features/projects/due-text";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import { Meter, Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";

// The client home is deliberately simple, modelled on the order tracking students already know
// from online shopping: a "to do" list, tabs by stage, and one tracker card per study.
// The detailed table (search, sort, quick view) lives on the All Studies page.

const STUDY_BASE = "/dashboard/client/projects";
const CARDS_ON_HOME = 4;

// What happens after a study is sent, shown to first-time clients.
const JOURNEY = [
  { step: "Price", body: "A fixed written price within 24 hours" },
  { step: "Agreement", body: "Sign your scope online" },
  { step: "Deposit", body: "Pay by GCash or bank transfer" },
  { step: "Analysis", body: "Run, then checked by a second statistical analyst" },
  { step: "Files", body: "Tables, write-up, and code" },
];

type TabValue = "ALL" | ClientStageTone;
// Needs-you studies already sit in the To do list, so the list opens on "In progress".
const TABS: Array<{ value: TabValue; label: string }> = [
  { value: "wait", label: "In progress" },
  { value: "action", label: "Needs you" },
  { value: "done", label: "Completed" },
  { value: "stopped", label: "Stopped" },
  { value: "ALL", label: "All" },
];

const money = (n: number) => Math.round(n).toLocaleString("en-PH");

interface ClientDashboardClientProps {
  userName?: string;
  initialProjects?: ProjectDetailItem[];
  initialIsProfileComplete?: boolean;
}

type ToastState = {
  variant: "success" | "danger" | "warning" | "info";
  message: string;
  description?: string;
} | null;

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
  const [tab, setTab] = useState<TabValue>(() =>
    initialProjects.some((p) => getClientStage(p.masterStatus).tone === "wait") ? "wait" : "ALL"
  );
  const [studyToRequestDeletion, setStudyToRequestDeletion] = useState<{
    id: string;
    intakeId?: string;
    title: string;
  } | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

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
    let lastVisibleRefreshAt = Date.now();
    const handleStudyUpdated = () => {
      loadData(false);
    };

    // Coming back to the tab re-renders the page from the server at most once a minute (study changes still
    // arrive right away through the event above).
    const handleVisibilityChange = () => {
      if (typeof document === "undefined" || document.visibilityState !== "visible") return;
      if (Date.now() - lastVisibleRefreshAt < 60_000) return;
      lastVisibleRefreshAt = Date.now();
      router.refresh();
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
      [...projects].sort((a, b) => {
        const pa = clientStagePriority(a.masterStatus);
        const pb = clientStagePriority(b.masterStatus);
        if (pa !== pb) return pa - pb;
        return new Date(a.deadlineRequested).getTime() - new Date(b.deadlineRequested).getTime();
      }),
    [projects]
  );

  const todo = useMemo(
    () => sortedStudies.filter((p) => getClientStage(p.masterStatus).tone === "action"),
    [sortedStudies]
  );

  const counts = useMemo(() => {
    const c: Record<TabValue, number> = { ALL: projects.length, action: 0, wait: 0, done: 0, stopped: 0 };
    for (const p of projects) c[getClientStage(p.masterStatus).tone] += 1;
    return c;
  }, [projects]);

  const tabStudies = useMemo(
    () => (tab === "ALL" ? sortedStudies : sortedStudies.filter((p) => getClientStage(p.masterStatus).tone === tab)),
    [sortedStudies, tab]
  );

  const firstName = userName ? userName.split(" ")[0] : undefined;
  const hasStudies = projects.length > 0;

  const copyToast = (id: string) =>
    setToast({ variant: "info", message: "Study ID copied", description: `${id} is on your clipboard.` });

  const handleProfileSuccess = async () => {
    await loadData();
    setToast({
      variant: "success",
      message: "Profile Saved",
      description: "You can now send your first study.",
    });
  };

  const todoCount = todo.length + (isProfileComplete ? 0 : 1);

  // The to-do buttons carry the orange; the header button stays quiet while there is anything to do.
  // Without a finished profile, "Send a New Study" opens the profile form first.
  const newStudyButton = isProfileComplete ? (
    <Button asChild variant={todoCount > 0 ? "outline" : "primary"} size="sm" className="gap-1.5 active:scale-[0.97]">
      <Link href={`${STUDY_BASE}/new`}>
        <Plus size={15} weight="bold" />
        Send a New Study
      </Link>
    </Button>
  ) : (
    <Button variant="outline" size="sm" onClick={() => setIsProfileModalOpen(true)} className="gap-1.5 active:scale-[0.97]">
      <Plus size={15} weight="bold" />
      Send a New Study
    </Button>
  );

  return (
    <div data-portal="client" className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : "My Studies"}
        description={
          hasStudies
            ? todoCount > 0
              ? `You have ${todoCount} ${todoCount === 1 ? "thing" : "things"} to do. Everything else is on track.`
              : "You're all set. Here's how your studies are going."
            : "Two quick steps and your first study is on its way."
        }
        breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, { label: "My Studies" }]}
        actions={
          <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHowToUseModalOpen(true)}
              className="gap-1.5 active:scale-[0.97]"
            >
              <Question size={15} weight="fill" className="text-white/60" />
              How It Works
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
        <FirstRun
          isProfileComplete={isProfileComplete}
          onAddDetails={() => setIsProfileModalOpen(true)}
          onHowItWorks={() => setIsHowToUseModalOpen(true)}
        />
      ) : (
        <>
          <TodoPanel
            studies={todo}
            needsProfile={!isProfileComplete}
            onAddDetails={() => setIsProfileModalOpen(true)}
          />

          {/* ── My studies: tabs + tracker cards ── */}
          <section aria-labelledby="my-studies-title" className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="my-studies-title" className="font-sans text-lg font-semibold tracking-[-0.01em] text-white">
                My studies
              </h2>
              <div
                className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]"
                role="tablist"
                aria-label="Show studies"
              >
                {TABS.filter((t) => t.value !== "stopped" || counts.stopped > 0).map((t) => {
                  const active = tab === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(t.value)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-[2px] px-3 py-1.5 font-sans text-[13px] transition-colors ${
                        active ? "bg-white/[0.08] font-medium text-white" : "text-white/55 hover:text-white"
                      }`}
                    >
                      {t.label}
                      <span className={`font-mono text-[11px] ${active ? "text-white/60" : "text-white/35"}`}>
                        {counts[t.value]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {tabStudies.length === 0 ? (
              <Panel>
                <PanelBody className="py-10 text-center">
                  <p className="text-sm text-white/55">No studies here right now.</p>
                  <button
                    type="button"
                    onClick={() => setTab("ALL")}
                    className="mt-2 text-[13px] text-white/75 underline decoration-white/25 underline-offset-4 hover:text-white"
                  >
                    Show all studies
                  </button>
                </PanelBody>
              </Panel>
            ) : (
              <ul className="flex flex-col gap-4">
                {tabStudies.slice(0, CARDS_ON_HOME).map((study) => (
                  <li key={study.id}>
                    <StudyCard
                      study={study}
                      onCopy={copyToast}
                      onRequestDeletion={() =>
                        setStudyToRequestDeletion({ id: study.id, intakeId: study.intakeId, title: study.researchTitle })
                      }
                    />
                  </li>
                ))}
              </ul>
            )}

            {tabStudies.length > CARDS_ON_HOME ? (
              <Link
                href={STUDY_BASE}
                className="group inline-flex items-center justify-center gap-2 self-center rounded-[2px] px-4 py-2 text-[13px] text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                See all {tabStudies.length} studies
                <ArrowRight size={13} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : null}
          </section>

          <HelpStrip onHowItWorks={() => setIsHowToUseModalOpen(true)} />
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

// ─── Pieces ──────────────────────────────────────────────────────────────────

/** "To do": each item is one sentence and one button. Calm "all set" state when empty. */
function TodoPanel({
  studies,
  needsProfile,
  onAddDetails,
}: {
  studies: ProjectDetailItem[];
  needsProfile: boolean;
  onAddDetails: () => void;
}) {
  const total = studies.length + (needsProfile ? 1 : 0);
  if (total === 0) {
    return (
      <Panel as="div">
        <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
          <CheckCircle size={22} weight="fill" className="shrink-0 text-white/40" />
          <p className="text-sm text-white/70">
            <span className="font-medium text-white">Nothing to do right now.</span> We&apos;ll tell you here when we
            need something from you.
          </p>
        </div>
      </Panel>
    );
  }
  return (
    <Panel className="border-[#CC6600]/30" aria-label="To do">
      <PanelHeader
        title="To do"
        count={total}
        subtitle="Finish these so we can keep working on your studies."
      />
      <ul className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06]">
        {needsProfile ? (
          <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Finish your profile</p>
                <p className="mt-0.5 text-[13px] text-white/55">
                  Add your school, program, and contact number. They go on your agreements.
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={onAddDetails} className="shrink-0 gap-1.5 self-start whitespace-nowrap sm:self-center">
              Add Details
              <ArrowRight size={14} weight="bold" />
            </Button>
          </li>
        ) : null}
        {studies.map((study) => {
          const stage = getClientStage(study.masterStatus);
          return (
            <li
              key={study.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{stage.label}</p>
                  <p className="mt-0.5 truncate text-[13px] text-white/55" title={study.researchTitle}>
                    {study.researchTitle}
                  </p>
                  {study.masterStatus === "AWAITING_INFORMATION" && study.missingInfoReason ? (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">
                      <span className="text-white/45">Our note: </span>
                      {study.missingInfoReason}
                    </p>
                  ) : null}
                </div>
              </div>
              {stage.action ? (
                <Button asChild variant="primary" size="sm" className="shrink-0 gap-1.5 self-start whitespace-nowrap sm:self-center">
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
    </Panel>
  );
}

/** One study, tracked like an online order: what it is, the 5 steps, what's happening, one button. */
function StudyCard({
  study,
  onCopy,
  onRequestDeletion,
}: {
  study: ProjectDetailItem;
  onCopy: (id: string) => void;
  onRequestDeletion: () => void;
}) {
  const stage = getClientStage(study.masterStatus);
  const due = useDueText(study.deadlineRequested, stage, study.deliveredAt);
  const f = study.financialSummary;
  const href = `${STUDY_BASE}/${study.id}`;

  return (
    <Panel as="article" aria-label={study.researchTitle}>
      <PanelBody className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <ClientStageTag stage={stage} />
              <span className="font-mono text-[11px] text-white/45">{due}</span>
            </div>
            <Link
              href={href}
              prefetch
              className="mt-2.5 block font-sans text-base font-semibold leading-snug text-white decoration-white/30 underline-offset-4 hover:underline"
            >
              {study.researchTitle}
            </Link>
          </div>
          <button
            type="button"
            onClick={onRequestDeletion}
            aria-label={`Ask to delete ${study.intakeId}`}
            title="Ask to delete this study"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Trash size={15} weight="fill" />
          </button>
        </div>

        <ClientStudyStepper stage={stage} />

        <p className="text-[13px] leading-relaxed text-white/65">{stage.now}</p>

        {f && f.totalAmount > 0 ? (
          <div className="max-w-sm">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-white/50">{f.isFullyPaid ? "Paid in full" : "Paid"}</span>
              <span className="font-mono text-white/70">
                <Peso />
                {money(f.verifiedPaid)} <span className="text-white/35">of</span> <Peso />
                {money(f.totalAmount)}
              </span>
            </div>
            <Meter value={f.verifiedPaid} max={f.totalAmount} label={`Paid on ${study.intakeId}`} className="mt-1.5" />
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            <CopyButton variant="ghost" value={study.intakeId} label={study.intakeId} onCopy={() => onCopy(study.intakeId)} className="-ml-2 text-[11px]" />
            <Link
              href={`/dashboard/client/messages?projectId=${study.id}`}
              className="inline-flex items-center gap-1.5 text-white/60 transition-colors hover:text-white"
            >
              <ChatCenteredText size={14} weight="fill" className="text-white/40" />
              Message
            </Link>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 self-start whitespace-nowrap sm:self-auto">
            <Link href={`${href}${stage.action?.path ?? ""}`}>
              {stage.action?.label ?? "View Study"}
              <ArrowRight size={14} weight="bold" />
            </Link>
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}

/** Three familiar help tiles: message us, how it works, practice your defense. */
function HelpStrip({ onHowItWorks }: { onHowItWorks: () => void }) {
  const tile =
    "group flex h-full flex-col gap-2 rounded-[2px] border border-white/[0.07] bg-[#0A0A18] p-5 text-left transition-colors hover:border-white/[0.14] hover:bg-[#0E0E1E]";
  return (
    <section aria-labelledby="help-title" className="flex flex-col gap-4">
      <h2 id="help-title" className="font-sans text-lg font-semibold tracking-[-0.01em] text-white">
        Need help?
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/dashboard/client/messages" className={tile}>
          <ChatCenteredText size={20} weight="fill" className="text-white/50" />
          <span className="text-sm font-medium text-white">Message our team</span>
          <span className="text-[13px] leading-relaxed text-white/50">Ask about your study, price, or what to send.</span>
        </Link>
        <button type="button" onClick={onHowItWorks} className={tile}>
          <Question size={20} weight="fill" className="text-white/50" />
          <span className="text-sm font-medium text-white">How JAXIS works</span>
          <span className="text-[13px] leading-relaxed text-white/50">The 5 steps from your price to your files.</span>
        </button>
        <Link href="/dashboard/client/defenselab" className={tile}>
          <GraduationCap size={20} weight="fill" className="text-white/50" />
          <span className="text-sm font-medium text-white">Practice your defense</span>
          <span className="text-[13px] leading-relaxed text-white/50">
            1-on-1 mock panel, <Peso />
            250 per hour.
          </span>
        </Link>
      </div>
    </section>
  );
}

function HelpPanel({ onHowItWorks, projectId }: { onHowItWorks: () => void; projectId?: string }) {
  return (
    <Panel className="flex-1" aria-label="Questions">
      <PanelHeader title="Questions?" subtitle="Message our team anytime. We reply here." />
      <PanelBody className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] leading-relaxed text-white/55">
          Ask about your study, your price, or what to send. Your conversation stays inside JAXIS.
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-4">
          <Button asChild variant="outline" size="sm" className="active:scale-[0.97]">
            <Link href={projectId ? `/dashboard/client/messages?projectId=${projectId}` : "/dashboard/client/messages"}>
              <ChatCenteredText size={15} weight="fill" />
              Open Messages
            </Link>
          </Button>
          <button
            type="button"
            onClick={onHowItWorks}
            className="text-[13px] text-white/55 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
          >
            How it works
          </button>
        </div>
      </PanelBody>
    </Panel>
  );
}

function DefenseLabPanel() {
  return (
    <Panel className="flex-1" aria-label="Practice your defense">
      <PanelHeader title="Practice your defense" subtitle="DefenseLab mock panel" />
      <PanelBody className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] leading-relaxed text-white/55">
          A 1-on-1 video session with a senior statistical analyst who asks the questions panels ask. You get the recording.
        </p>
        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="font-mono text-sm font-bold text-white">
            <Peso />
            250
            <span className="ml-1 font-sans text-xs font-normal text-white/45">per hour</span>
          </span>
          <Button asChild variant="outline" size="sm" className="active:scale-[0.97]">
            <Link href="/dashboard/client/defenselab">
              <GraduationCap size={15} weight="fill" />
              Learn More
            </Link>
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}

function FirstRun({
  isProfileComplete,
  onAddDetails,
  onHowItWorks,
}: {
  isProfileComplete: boolean;
  onAddDetails: () => void;
  onHowItWorks: () => void;
}) {
  const steps = [
    {
      n: 1,
      title: "Add your school details",
      body: "Your school, program, and contact number. They go on your agreement.",
      done: isProfileComplete,
      cta: (
        <Button variant="primary" size="sm" onClick={onAddDetails} className="gap-1.5 active:scale-[0.97]">
          Add Details
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
            Send a Study
            <ArrowRight size={14} weight="bold" />
          </Link>
        </Button>
      ) : (
        <span className="text-xs text-white/40">After step 1</span>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
      <Panel className="lg:col-span-8" aria-label="Get started">
        <PanelHeader
          title="Get started"
          subtitle="Two quick steps. It takes about five minutes."
          aside={
            <span className="font-mono text-xs text-white/50">{isProfileComplete ? "1 of 2 done" : "0 of 2 done"}</span>
          }
        />
        <PanelBody className="flex flex-col gap-6">
          <Meter value={isProfileComplete ? 1 : 0} max={2} label="Setup progress" />
          <ol className="flex flex-col">
            {steps.map((item, i) => (
              <li
                key={item.n}
                className={`flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between ${
                  i > 0 ? "border-t border-white/[0.07]" : ""
                }`}
              >
                <div className="flex gap-4">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] border font-mono text-xs ${
                      item.done ? "border-white/20 bg-white/[0.08] text-white" : "border-[#CC6600]/50 text-[#FFA040]"
                    }`}
                  >
                    {item.done ? <Check size={13} weight="bold" /> : item.n}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${item.done ? "text-white/55 line-through decoration-white/30" : "text-white"}`}>
                      {item.title}
                    </p>
                    <p className="mt-1 max-w-md text-[13px] leading-relaxed text-white/55">{item.body}</p>
                  </div>
                </div>
                <div className="shrink-0 pl-11 sm:pl-0">
                  {item.done ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
                      <Check size={12} weight="bold" /> Done
                    </span>
                  ) : (
                    item.cta
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="border-t border-white/[0.07] pt-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-white/45">What happens after you send it</p>
            <ol className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-5 sm:gap-3">
              {JOURNEY.map((j, i) => (
                <li key={j.step} className="flex gap-3 sm:flex-col sm:gap-2">
                  <span className="font-mono text-[11px] text-white/35">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{j.step}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/50">{j.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </PanelBody>
      </Panel>

      <div className="flex flex-col gap-6 lg:col-span-4">
        <HelpPanel onHowItWorks={onHowItWorks} />
        <DefenseLabPanel />
      </div>
    </div>
  );
}
