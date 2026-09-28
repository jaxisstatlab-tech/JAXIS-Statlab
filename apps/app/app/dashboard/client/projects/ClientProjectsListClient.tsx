"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { PageHeader, Button, Modal, Toast, LoadingState, Pagination, CopyButton } from "@repo/ui";
import { Peso } from "@repo/ui/MoneyDisplay";
import {
  ArrowRight,
  CaretDown,
  ChatCenteredText,
  DownloadSimple,
  Eye,
  FolderDashed,
  MagnifyingGlass,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import { getProjects } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { QuickProfileModal } from "@/features/client-profile/components/QuickProfileModal";
import { RequestStudyDeletionModal } from "@/features/projects/components/RequestStudyDeletionModal";
import { getClientStage, clientStagePriority, type ClientStage, type ClientStageTone } from "@/features/projects/client-stage";
import { ClientStageTag, ClientStudyStepper } from "@/features/projects/components/ClientStudyStepper";
import { formatShortDate, useDueText } from "@/features/projects/due-text";
import { getFileMeta, formatFileCategory, triggerFileDownload } from "@/lib/file-utils";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import { Panel } from "@/components/dashboard/Panel";

// Every study the client has sent, listed like orders in a shopping app: tabs by stage, then one
// card per study with its status, the 5 steps, and the one thing to do next.

export interface ClientProjectsListClientProps {
  initialProjects: ProjectDetailItem[];
  initialProfileComplete: boolean;
}

type StageFilter = "ALL" | ClientStageTone;

const STAGE_TABS: Array<{ value: StageFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "action", label: "Needs you" },
  { value: "wait", label: "In progress" },
  { value: "done", label: "Completed" },
  { value: "stopped", label: "Stopped" },
];

const SORT_OPTIONS = [
  { value: "priority", label: "Needs you first" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "deadline", label: "Closest due date" },
];

const studyHref = (p: ProjectDetailItem, path = "") => `/dashboard/client/projects/${p.id}${path}`;
const money = (n: number) => Math.round(n).toLocaleString("en-PH");

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function ClientProjectsListClient({
  initialProjects,
  initialProfileComplete,
}: ClientProjectsListClientProps) {
  const [projects, setProjects] = useState<ProjectDetailItem[]>(initialProjects);
  const [stageFilter, setStageFilter] = useState<StageFilter>("ALL");
  const [sortBy, setSortBy] = useState<string>("priority");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedStudyForInspect, setSelectedStudyForInspect] = useState<ProjectDetailItem | null>(null);
  const [studyToRequestDeletion, setStudyToRequestDeletion] = useState<{ id: string; intakeId: string; title: string } | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(initialProfileComplete);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "danger";
  } | null>(null);

  // Everything is filtered in the browser, so refresh the full list only when a study changes.
  const refresh = useCallback(async () => {
    try {
      const [res, profile] = await Promise.all([getProjects({ status: "ALL", search: "" }), getClientProfile()]);
      if (res.success) setProjects(res.data);
      setIsProfileComplete(Boolean(profile && profile.institutionSchool && profile.contactNumber));
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[ClientProjectsList] Refresh failed:", err);
      }
    }
  }, []);

  useEffect(() => {
    const onStudyUpdated = () => refresh();
    window.addEventListener("jaxis:study-updated", onStudyUpdated);
    return () => window.removeEventListener("jaxis:study-updated", onStudyUpdated);
  }, [refresh]);

  const stages = useMemo(() => {
    const map = new Map<string, ClientStage>();
    for (const p of projects) map.set(p.id, getClientStage(p.masterStatus));
    return map;
  }, [projects]);
  const stageOf = useCallback((p: ProjectDetailItem) => stages.get(p.id) ?? getClientStage(p.masterStatus), [stages]);

  const counts = useMemo(() => {
    const c: Record<StageFilter, number> = { ALL: projects.length, action: 0, wait: 0, done: 0, stopped: 0 };
    for (const p of projects) c[stageOf(p).tone] += 1;
    return c;
  }, [projects, stageOf]);

  const visibleProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = projects.filter((p) => {
      if (stageFilter !== "ALL" && stageOf(p).tone !== stageFilter) return false;
      if (!q) return true;
      return [p.researchTitle, p.intakeId, p.researchObjectives, p.researchQuestions]
        .some((field) => field?.toLowerCase().includes(q));
    });
    const byNewest = (a: ProjectDetailItem, b: ProjectDetailItem) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return list.sort((a, b) => {
      if (sortBy === "oldest") return -byNewest(a, b);
      if (sortBy === "newest") return byNewest(a, b);
      if (sortBy === "deadline") {
        const ta = a.deadlineRequested ? new Date(a.deadlineRequested).getTime() : Infinity;
        const tb = b.deadlineRequested ? new Date(b.deadlineRequested).getTime() : Infinity;
        return ta !== tb ? ta - tb : byNewest(a, b);
      }
      // "priority": things you need to do first, then work in progress, then finished.
      const pa = clientStagePriority(a.masterStatus);
      const pb = clientStagePriority(b.masterStatus);
      return pa !== pb ? pa - pb : byNewest(a, b);
    });
  }, [projects, stageFilter, searchQuery, sortBy, stageOf]);

  const paginatedProjects = useMemo(
    () => visibleProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visibleProjects, currentPage, pageSize]
  );

  const isFiltered = stageFilter !== "ALL" || searchQuery.trim() !== "";
  const clearFilters = () => {
    setStageFilter("ALL");
    setSortBy("priority");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const copyToast = (id: string) =>
    setToastMessage({ message: "Study ID copied", description: `${id} is on your clipboard.`, variant: "info" });

  const handleProfileSuccess = async () => {
    const profile = await getClientProfile();
    if (profile && profile.institutionSchool && profile.contactNumber) {
      setIsProfileComplete(true);
    }
    setToastMessage({
      message: "Profile saved",
      description: "Your school and contact details are saved. You can send a study now.",
      variant: "success",
    });
  };

  const newStudyAction =
    isProfileComplete === null ? (
      <Button variant="outline" size="sm" disabled className="opacity-50 cursor-wait pointer-events-none">
        <LoadingState variant="inline" label="Loading..." />
      </Button>
    ) : isProfileComplete === false ? (
      <Button variant="primary" size="sm" onClick={() => setIsProfileModalOpen(true)}>
        Finish Your Profile
        <ArrowRight size={14} weight="bold" />
      </Button>
    ) : (
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard/client/projects/new">
          <Plus size={14} weight="bold" />
          Send a New Study
        </Link>
      </Button>
    );

  const summary =
    counts.ALL === 0
      ? "Every study you send shows up here."
      : counts.action > 0
        ? `${counts.action} of your ${counts.ALL} studies ${counts.action === 1 ? "needs" : "need"} something from you.`
        : `You have ${counts.ALL} ${counts.ALL === 1 ? "study" : "studies"}. Nothing needs you right now.`;

  return (
    <div data-portal="client" className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title="All studies"
        description={summary}
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "My Studies", href: "/dashboard/client" },
          { label: "All studies" },
        ]}
        actions={newStudyAction}
      />

      <section className="flex flex-col gap-4" aria-label="Your studies">
        {/* Tabs, then search and sort on one line */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]"
            role="tablist"
            aria-label="Filter by stage"
          >
            {STAGE_TABS.filter((t) => t.value !== "stopped" || counts.stopped > 0).map((t) => {
              const active = stageFilter === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setStageFilter(t.value);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-[2px] px-3 py-1.5 font-sans text-[13px] transition-colors ${
                    active ? "bg-white/[0.08] font-medium text-white" : "text-white/55 hover:text-white"
                  }`}
                >
                  {t.value === "action" && counts.action > 0 ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" />
                  ) : null}
                  {t.label}
                  <span className={`font-mono text-[11px] ${active ? "text-white/60" : "text-white/35"}`}>
                    {counts[t.value]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <SearchBox
              value={searchQuery}
              onChange={(q) => {
                setSearchQuery(q);
                setCurrentPage(1);
              }}
            />
            <label className="relative shrink-0">
              <span className="sr-only">Sort studies</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 cursor-pointer appearance-none rounded-[2px] border border-white/10 bg-white/[0.03] pl-3 pr-8 font-sans text-[13px] text-white/80 transition-colors hover:border-white/20 focus:border-white/30 focus:outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#0A0A18]">
                    {o.label}
                  </option>
                ))}
              </select>
              <CaretDown
                size={12}
                weight="fill"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
              />
            </label>
          </div>
        </div>

        {visibleProjects.length === 0 ? (
          <Panel as="div">
            <div className="flex flex-col items-center px-6 py-14 text-center">
              {isFiltered ? (
                <MagnifyingGlass size={28} weight="fill" className="text-white/25" />
              ) : (
                <FolderDashed size={28} weight="fill" className="text-white/25" />
              )}
              <p className="mt-4 text-sm font-medium text-white">{isFiltered ? "No studies match" : "No studies yet"}</p>
              <p className="mt-1 max-w-sm text-[13px] text-white/55">
                {isFiltered
                  ? "Try another tab or search word, or clear your filters."
                  : "Send your first study and we'll reply with a fixed price within 24 hours."}
              </p>
              <div className="mt-5">
                {isFiltered ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  newStudyAction
                )}
              </div>
            </div>
          </Panel>
        ) : (
          <>
            <ul className="flex flex-col gap-4">
              {paginatedProjects.map((p) => (
                <li key={p.id}>
                  <StudyOrderCard
                    project={p}
                    stage={stageOf(p)}
                    onInspect={() => setSelectedStudyForInspect(p)}
                    onCopy={copyToast}
                    onRequestDeletion={() =>
                      setStudyToRequestDeletion({ id: p.id, intakeId: p.intakeId, title: p.researchTitle })
                    }
                  />
                </li>
              ))}
            </ul>

            {visibleProjects.length > pageSize || pageSize !== 10 ? (
              <Panel as="div" className="overflow-hidden">
                <Pagination
                  currentPage={currentPage}
                  totalItems={visibleProjects.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  itemLabel="studies"
                />
              </Panel>
            ) : null}
          </>
        )}
      </section>

      {selectedStudyForInspect && (
        <StudyQuickView
          project={selectedStudyForInspect}
          stage={stageOf(selectedStudyForInspect)}
          onClose={() => setSelectedStudyForInspect(null)}
          onCopy={copyToast}
          onDownload={(fileName) =>
            setToastMessage({ message: "Download started", description: `Downloading ${fileName}.`, variant: "info" })
          }
        />
      )}

      <QuickProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSuccess={handleProfileSuccess}
      />

      <RequestStudyDeletionModal
        open={!!studyToRequestDeletion}
        onClose={() => setStudyToRequestDeletion(null)}
        study={studyToRequestDeletion}
        onRequested={() => {
          refresh();
        }}
      />

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

/** Search with the `/` shortcut to jump in and Esc to clear. */
function SearchBox({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[2px] border border-white/10 bg-white/[0.03] px-3 transition-colors focus-within:border-white/30 lg:w-72 lg:flex-none">
      <MagnifyingGlass size={14} weight="bold" className="shrink-0 text-white/35" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            e.currentTarget.blur();
          }
        }}
        placeholder="Search studies"
        aria-label="Search your studies"
        className="min-w-0 flex-1 border-0 bg-transparent p-0 font-sans text-base text-white placeholder:text-white/35 focus:outline-none focus:ring-0 sm:text-[13px]"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="shrink-0 text-white/40 transition-colors hover:text-white"
        >
          <X size={12} weight="bold" />
        </button>
      ) : (
        <kbd className="hidden shrink-0 select-none rounded-[2px] border border-white/10 bg-white/[0.05] px-1.5 font-mono text-[10px] leading-4 text-white/40 sm:inline">
          /
        </kbd>
      )}
    </div>
  );
}

const ICON_BUTTON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white";

/** One study, read like an order: status and due date, title, the 5 steps, then one clear button. */
function StudyOrderCard({
  project: p,
  stage,
  onInspect,
  onCopy,
  onRequestDeletion,
}: {
  project: ProjectDetailItem;
  stage: ClientStage;
  onInspect: () => void;
  onCopy: (id: string) => void;
  onRequestDeletion: () => void;
}) {
  const due = useDueText(p.deadlineRequested, stage, p.deliveredAt);
  const f = p.financialSummary;
  const needsYou = stage.tone === "action";
  const fileCount = p.files.length;

  return (
    <Panel as="article" aria-label={p.researchTitle} className={needsYou ? "border-[#CC6600]/25" : ""}>
      {/* Top strip: study ID and sent date, status on the right */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 text-xs text-white/45">
          <CopyButton
            variant="ghost"
            value={p.intakeId}
            label={p.intakeId}
            onCopy={() => onCopy(p.intakeId)}
            className="-ml-2 shrink-0 text-[11px]"
          />
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="hidden truncate sm:inline">{"Sent " + formatShortDate(p.createdAt)}</span>
        </div>
        <ClientStageTag stage={stage} className="shrink-0" />
      </div>

      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:gap-10">
        <div className="min-w-0 lg:flex-1">
          <Link
            href={studyHref(p)}
            prefetch
            className="block font-sans text-base font-semibold leading-snug text-white decoration-white/30 underline-offset-4 hover:underline"
          >
            {p.researchTitle}
          </Link>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{stage.now}</p>
          {p.masterStatus === "AWAITING_INFORMATION" && p.missingInfoReason ? (
            <p className="mt-3 border-l-2 border-[#CC6600]/60 pl-3 text-[13px] leading-relaxed text-white/75">
              <span className="text-white/45">Our note: </span>
              {p.missingInfoReason}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 lg:w-[27rem] lg:shrink-0">
          <ClientStudyStepper stage={stage} />
          <p className="font-mono text-[11px] text-white/45">{due}</p>
        </div>
      </div>

      {/* Bottom strip: small facts and the actions */}
      <div className="flex flex-col gap-3 border-t border-white/[0.06] px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/50">
          <span>{fileCount + (fileCount === 1 ? " file" : " files")}</span>
          {f && f.totalAmount > 0 ? (
            <span className="inline-flex items-baseline gap-1">
              {f.isFullyPaid ? "Paid in full" : f.verifiedPaid > 0 ? "Paid" : "Price"}
              <span className="font-mono text-white/75">
                <Peso />
                {money(f.verifiedPaid > 0 || f.isFullyPaid ? f.verifiedPaid : f.totalAmount)}
              </span>
              {f.isFullyPaid || f.verifiedPaid <= 0 ? null : (
                <>
                  <span>of</span>
                  <span className="font-mono text-white/75">
                    <Peso />
                    {money(f.totalAmount)}
                  </span>
                </>
              )}
            </span>
          ) : null}
          <Link
            href={`/dashboard/client/messages?projectId=${p.id}`}
            className="inline-flex items-center gap-1.5 text-white/60 transition-colors hover:text-white"
          >
            <ChatCenteredText size={14} weight="fill" className="text-white/40" />
            Message
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <button type="button" onClick={onInspect} className={ICON_BUTTON} aria-label={`Quick view of ${p.intakeId}`} title="Quick view">
            <Eye size={16} weight="fill" />
          </button>
          <button
            type="button"
            onClick={onRequestDeletion}
            className={ICON_BUTTON}
            aria-label={`Ask to delete ${p.intakeId}`}
            title="Ask to delete this study"
          >
            <Trash size={15} weight="fill" />
          </button>
          <Button
            asChild
            variant={needsYou ? "primary" : "outline"}
            size="sm"
            className="ml-2 flex-1 gap-1.5 whitespace-nowrap sm:flex-none"
          >
            <Link href={studyHref(p, stage.action?.path ?? "")} prefetch>
              {stage.action?.label ?? "View Study"}
              <ArrowRight size={13} weight="bold" />
            </Link>
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function StudyQuickView({
  project: p,
  stage,
  onClose,
  onCopy,
  onDownload,
}: {
  project: ProjectDetailItem;
  stage: ClientStage;
  onClose: () => void;
  onCopy: (id: string) => void;
  onDownload: (fileName: string) => void;
}) {
  const sections = [
    { label: "Research objectives", body: p.researchObjectives },
    { label: "Research questions", body: p.researchQuestions },
    { label: "Hypotheses", body: p.hypotheses },
  ].filter((s) => s.body && s.body.trim());

  return (
    <Modal
      open
      onClose={onClose}
      title="Quick view"
      description={p.researchTitle}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href={studyHref(p)}>
              Open Study
              <ArrowRight size={13} weight="bold" />
            </Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 font-sans">
        <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ClientStageTag stage={stage} />
            <dl className="flex gap-6 text-xs">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-white/40">Study ID</dt>
                <dd className="mt-1">
                  <CopyButton variant="badge" value={p.intakeId} label={p.intakeId} onCopy={() => onCopy(p.intakeId)} />
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-white/40">Due</dt>
                <dd className="mt-1.5 text-[13px] text-white/85">{formatDate(p.deadlineRequested)}</dd>
              </div>
            </dl>
          </div>
          <ClientStudyStepper stage={stage} />
        </div>

        <p className="text-[13px] leading-relaxed text-white/70">
          <span className="text-white">Now: </span>
          {stage.now}
          <br />
          <span className="text-white">Next: </span>
          {stage.next}
        </p>

        {p.masterStatus === "AWAITING_INFORMATION" && p.missingInfoReason && (
          <div className="rounded-[2px] border border-white/[0.08] border-l-2 border-l-[#CC6600] bg-white/[0.02] px-4 py-3">
            <p className="text-xs font-medium text-white">What we need from you</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/70">{p.missingInfoReason}</p>
          </div>
        )}

        {sections.map((s) => (
          <section key={s.label}>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-white/40">{s.label}</h4>
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-white/75">{s.body}</p>
          </section>
        ))}

        <section>
          <h4 className="font-mono text-[11px] uppercase tracking-wider text-white/40">
            Your files <span className="text-white/30">{p.files.length}</span>
          </h4>
          {p.files.length === 0 ? (
            <p className="mt-2 text-[13px] text-white/45">No files uploaded yet.</p>
          ) : (
            <ul className="mt-2 max-h-64 divide-y divide-white/[0.06] overflow-y-auto rounded-[2px] border border-white/[0.08]">
              {p.files.map((file) => {
                const meta = getFileMeta(file.fileName, file.fileType);
                const category = formatFileCategory(file.fileCategory);
                return (
                  <li key={file.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.04] font-mono text-[10px] font-semibold text-white/70">
                        {meta.ext}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-white">{file.fileName}</p>
                        <p className="font-mono text-[11px] text-white/40">
                          {category.label} · {formatDate(file.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        triggerFileDownload(file.filePath, file.fileName);
                        onDownload(file.fileName);
                      }}
                      aria-label={`Download ${file.fileName}`}
                    >
                      <DownloadSimple size={15} weight="fill" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
