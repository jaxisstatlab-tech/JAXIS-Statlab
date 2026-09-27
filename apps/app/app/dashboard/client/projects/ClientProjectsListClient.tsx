"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  KpiCard,
  FilterToolbar,
  Modal,
  Toast,
  LoadingState,
  EmptyState,
  Pagination,
  CopyButton,
} from "@repo/ui";
import {
  ArrowRight,
  DownloadSimple,
  Eye,
  FolderDashed,
  MagnifyingGlass,
  Plus,
} from "@phosphor-icons/react";
import { getProjects } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { QuickProfileModal } from "@/features/client-profile/components/QuickProfileModal";
import { getClientStage, clientStagePriority, type ClientStage, type ClientStageTone } from "@/features/projects/client-stage";
import { ClientStageMeter, ClientStageTag } from "@/features/projects/components/ClientStudyStepper";
import { getFileMeta, formatFileCategory, triggerFileDownload } from "@/lib/file-utils";
import type { ProjectDetailItem } from "@/features/projects/schemas";

export interface ClientProjectsListClientProps {
  initialProjects: ProjectDetailItem[];
  initialProfileComplete: boolean;
}

type StageFilter = "ALL" | ClientStageTone;

const STAGE_TABS: Array<{ value: StageFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "action", label: "Needs you" },
  { value: "wait", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "stopped", label: "Stopped" },
];

const studyHref = (p: ProjectDetailItem, path = "") => `/dashboard/client/projects/${p.id}${path}`;

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

/** "in 6 days", "today", "3 days ago" relative to now. */
function relativeDays(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(new Date())) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
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
      <Button variant="primary" size="sm" disabled className="opacity-50 cursor-wait pointer-events-none">
        <LoadingState variant="inline" label="Loading..." />
      </Button>
    ) : isProfileComplete === false ? (
      <Button variant="primary" size="sm" onClick={() => setIsProfileModalOpen(true)}>
        Finish Your Profile
        <ArrowRight size={14} weight="bold" />
      </Button>
    ) : (
      <Button asChild variant="primary" size="sm">
        <Link href="/dashboard/client/projects/new">
          <Plus size={14} weight="bold" />
          Send a New Study
        </Link>
      </Button>
    );

  return (
    <div data-portal="client" className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title="All Studies"
        description="Every study you've sent, where it stands, and what to do next."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "My Studies", href: "/dashboard/client" },
          { label: "All Studies" },
        ]}
        actions={newStudyAction}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard label="All studies" value={counts.ALL} description="Since you joined" />
        <KpiCard
          label="Needs you"
          value={counts.action}
          variant={counts.action > 0 ? "orange" : "default"}
          description={counts.action > 0 ? "Waiting on you" : "Nothing waiting"}
        />
        <KpiCard label="In progress" value={counts.wait} description="We're on it" />
        <KpiCard label="Done" value={counts.done} description="All finished" />
      </div>

      <Card className="p-0 overflow-hidden">
        {/* Stage tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.08] px-4 py-3 [scrollbar-width:none]" role="tablist" aria-label="Filter by stage">
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
                {t.value === "action" && counts.action > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" />
                )}
                {t.label}
                <span className={`font-mono text-[11px] ${active ? "text-white/60" : "text-white/35"}`}>
                  {counts[t.value]}
                </span>
              </button>
            );
          })}
        </div>

        <FilterToolbar
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search by title, study ID, or objectives..."
          filters={[
            {
              key: "sort",
              label: "SORT",
              value: sortBy,
              defaultValue: "priority",
              options: [
                { value: "priority", label: "Needs you first" },
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "deadline", label: "Closest due date" },
              ],
            },
          ]}
          onFilterChange={(key, value) => {
            if (key === "sort") {
              setSortBy(value);
              setCurrentPage(1);
            }
          }}
          onClear={clearFilters}
        />

        {visibleProjects.length === 0 ? (
          <div className="border-t border-white/[0.08] py-16">
            <EmptyState
              icon={isFiltered ? MagnifyingGlass : FolderDashed}
              title={isFiltered ? "No studies match" : "No studies yet"}
              description={
                isFiltered
                  ? "Try another tab or search, or clear your filters."
                  : "Send your first study and we'll reply with a fixed price within 24 hours."
              }
              action={
                isFiltered ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  newStudyAction
                )
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto border-t border-white/[0.08]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    {["Study", "Where it stands", "Due", ""].map((h, i) => (
                      <th
                        key={h || i}
                        scope="col"
                        className={`px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-white/40 ${
                          i === 3 ? "text-right" : ""
                        }`}
                      >
                        {h || <span className="sr-only">Actions</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {paginatedProjects.map((p) => (
                    <StudyRow
                      key={p.id}
                      project={p}
                      stage={stageOf(p)}
                      onInspect={() => setSelectedStudyForInspect(p)}
                      onCopy={copyToast}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-white/[0.06] border-t border-white/[0.08]">
              {paginatedProjects.map((p) => (
                <StudyCard
                  key={p.id}
                  project={p}
                  stage={stageOf(p)}
                  onInspect={() => setSelectedStudyForInspect(p)}
                  onCopy={copyToast}
                />
              ))}
            </ul>

            <Pagination
              currentPage={currentPage}
              totalItems={visibleProjects.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="studies"
            />
          </>
        )}
      </Card>

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

interface StudyItemProps {
  project: ProjectDetailItem;
  stage: ClientStage;
  onInspect: () => void;
  onCopy: (id: string) => void;
}

/** One line under the title: our note when we need something, otherwise ID + files + sent date. */
function StudyMeta({ project: p, onCopy }: Pick<StudyItemProps, "project" | "onCopy">) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-white/45">
      <CopyButton variant="ghost" value={p.intakeId} label={p.intakeId} onCopy={() => onCopy(p.intakeId)} className="-ml-2 text-[11px]" />
      <span aria-hidden="true">·</span>
      <span>{p.files.length} {p.files.length === 1 ? "file" : "files"}</span>
      <span aria-hidden="true">·</span>
      <span>Sent {formatDate(p.createdAt)}</span>
    </div>
  );
}

function MissingInfoNote({ project: p }: { project: ProjectDetailItem }) {
  if (p.masterStatus !== "AWAITING_INFORMATION" || !p.missingInfoReason) return null;
  return (
    <p className="mt-2 border-l-2 border-[#CC6600]/60 pl-3 text-[13px] leading-relaxed text-white/70 line-clamp-2">
      <span className="text-white/45">Our note: </span>
      {p.missingInfoReason}
    </p>
  );
}

// Row buttons stay outlined: the orange "needs you" tag already marks rows that need action,
// and the page keeps a single orange button (the header action).
function StudyActions({ project: p, stage, onInspect, fill = false }: Omit<StudyItemProps, "onCopy"> & { fill?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${fill ? "w-full" : "justify-end"}`}>
      <button
        type="button"
        onClick={onInspect}
        className="h-9 w-9 shrink-0 rounded-[2px] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
        aria-label={`Quick view of ${p.intakeId}`}
        title="Quick view"
      >
        <Eye size={16} weight="fill" />
      </button>
      <Button asChild variant="outline" size="sm" className={`whitespace-nowrap ${fill ? "flex-1" : "min-w-[7.5rem]"}`}>
        <Link href={studyHref(p, stage.action?.path ?? "")} prefetch>
          {stage.action?.label ?? "Open"}
          {stage.tone === "action" && <ArrowRight size={13} weight="bold" />}
        </Link>
      </Button>
    </div>
  );
}

function DueDate({ project: p, stage }: { project: ProjectDetailItem; stage: ClientStage }) {
  const rel = relativeDays(p.deadlineRequested);
  const late = rel.endsWith("ago") && stage.tone !== "done" && stage.tone !== "stopped";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] text-white/85 whitespace-nowrap">{formatDate(p.deadlineRequested)}</span>
      {rel && <span className={`font-mono text-[11px] ${late ? "text-white/70" : "text-white/40"}`}>{late ? `${rel.replace(" ago", "")} late` : rel}</span>}
    </div>
  );
}

function StudyRow({ project: p, stage, onInspect, onCopy }: StudyItemProps) {
  return (
    <tr className="group align-top transition-colors hover:bg-white/[0.02]">
      <td className="px-5 py-4 min-w-0 max-w-[30rem]">
        <Link
          href={studyHref(p)}
          prefetch
          className="font-sans text-sm font-medium leading-snug text-white line-clamp-2 decoration-white/30 underline-offset-4 hover:underline"
          title={p.researchTitle}
        >
          {p.researchTitle}
        </Link>
        <div className="mt-1.5">
          <StudyMeta project={p} onCopy={onCopy} />
        </div>
        <MissingInfoNote project={p} />
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col items-start gap-2">
          <ClientStageTag stage={stage} />
          <ClientStageMeter stage={stage} />
        </div>
      </td>
      <td className="px-5 py-4">
        <DueDate project={p} stage={stage} />
      </td>
      <td className="px-5 py-4">
        <StudyActions project={p} stage={stage} onInspect={onInspect} />
      </td>
    </tr>
  );
}

function StudyCard({ project: p, stage, onInspect, onCopy }: StudyItemProps) {
  return (
    <li className="px-4 py-5">
      <div className="flex items-start justify-between gap-3">
        <ClientStageTag stage={stage} />
        <DueDate project={p} stage={stage} />
      </div>
      <Link href={studyHref(p)} prefetch className="mt-3 block font-sans text-[15px] font-medium leading-snug text-white">
        {p.researchTitle}
      </Link>
      <div className="mt-1.5">
        <StudyMeta project={p} onCopy={onCopy} />
      </div>
      <MissingInfoNote project={p} />
      <ClientStageMeter stage={stage} className="mt-3" />
      <div className="mt-4">
        <StudyActions project={p} stage={stage} onInspect={onInspect} fill />
      </div>
    </li>
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
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-white/[0.08] pb-5">
          <div className="flex flex-col gap-2">
            <ClientStageTag stage={stage} />
            <ClientStageMeter stage={stage} />
          </div>
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
