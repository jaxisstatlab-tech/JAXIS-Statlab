"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Toast } from "@repo/ui";
import { Check, CloudArrowUp, DownloadSimple, Plus, Trash, Warning } from "@phosphor-icons/react";
import { ANALYSIS_CATEGORY_METADATA, MAX_ANALYSIS_FILE_SIZE_BYTES, missingForReview } from "@/lib/analysis-rules";
import { fileExtension } from "@/lib/file-types";
import { resolveStoredFileUrl } from "@/lib/file-utils";
import { uploadFileToR2 } from "@/lib/storage-client";
import { clientPackageName } from "@/features/projects/client-packages";
import { StudySection } from "@/features/projects/components/StudySection";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { uploadAnalysisFile, getAnalysisFileDownloadUrl } from "../actions";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { ScopeCreepModal } from "./ScopeCreepModal";
import { SubmitForQAModal } from "./SubmitForQAModal";
import type { WorkbenchDataDTO } from "../schemas";
import { AnalysisFileCategory } from "@prisma/client";

// The analyst's workbench for one study: what's needed, upload files (each kind keeps its versions), send the work
// to the reviewer, and read what the client asked for and what the reviewer said.

const MAX_ROWS = 4;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const CATEGORIES = Object.keys(ANALYSIS_CATEGORY_METADATA) as AnalysisFileCategory[];

const FIELD =
  "rounded-[2px] border border-white/10 bg-[#050513] font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

/** Plain names for the reviewer's error levels. */
const LEVEL: Record<string, string> = {
  MINOR: "Small fix",
  MAJOR: "Analysis needs changes",
  CRITICAL: "Calculation error",
  ETHICAL_BREACH: "Ethics concern",
};

const DONE = ["DELIVERED", "CLOSED", "DISPUTED"];
const STOPPED = ["CANCELLED", "EXPIRED", "HALTED", "ETHICAL_BREACH"];

type Row = { id: string; category: AnalysisFileCategory; file: File | null };
type ToastState = { message: string; description?: string; variant: "info" | "success" | "warning" | "danger" } | null;
type Data = WorkbenchDataDTO;

function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function shortDate(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—";
}
function size(bytes?: number | null) {
  if (!bytes) return null;
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const freshRows = (): Row[] => [
  { id: "r1", category: "PDF_REPORT", file: null },
  { id: "r2", category: "R_OUTPUT", file: null },
];

interface AnalysisWorkbenchDeskProps {
  initialData: WorkbenchDataDTO;
}

export const AnalysisWorkbenchDesk: React.FC<AnalysisWorkbenchDeskProps> = ({ initialData }) => {
  const router = useRouter();
  const [data, setData] = useState<Data>(initialData);
  const [historyCategory, setHistoryCategory] = useState<AnalysisFileCategory | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const current = useMemo(() => data.analysisFiles.filter((f) => f.isCurrent), [data.analysisFiles]);
  const missing = missingForReview(current.map((f) => f.fileCategory));
  const isAnalyst = data.isAssignedStatistician;
  // Same rule as uploads: not while on hold, with the reviewer, delivered or stopped.
  const canSend = isAnalyst && data.canUpload;
  // After "changes asked", the old files don't count: any upload moves the study back to In progress.
  const needsFix = data.project.masterStatus === "QA_REVISION";
  const ready = canSend && missing.length === 0 && !needsFix;

  const onUploaded = (uploaded: Data["analysisFiles"]) => {
    setData((prev) => {
      let files = [...prev.analysisFiles];
      for (const u of uploaded) {
        const versions = files.filter((f) => f.fileCategory === u.fileCategory).length + 1;
        files = files.map((f) => (f.fileCategory === u.fileCategory ? { ...f, isCurrent: false, versionCount: versions } : f));
        files = [{ ...u, versionCount: versions }, ...files];
      }
      return {
        ...prev,
        analysisFiles: files,
        project: {
          ...prev.project,
          masterStatus: ["EXPERT_ASSIGNED", "ACTIVE", "QA_REVISION"].includes(prev.project.masterStatus) ? "IN_PROGRESS" : prev.project.masterStatus,
        },
      };
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      <StudySection
        title="Workbench"
        description={
          !isAnalyst
            ? "The analyst's files for this study, with every version."
            : data.canUpload && needsFix
              ? "Upload the fixed files, then send them to your reviewer again."
              : data.canUpload && missing.length > 0
              ? `Upload ${missing.join(" and ")}, then send them to your reviewer.`
              : data.canUpload
                ? "Everything needed is here. Send it to your reviewer when you're ready."
                : "Your files for this study, with every version."
        }
        actions={
          isAnalyst && data.canUpload ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setScopeOpen(true)} className="active:scale-[0.97]">
                Flag Extra Work
              </Button>
              <Button
                variant={ready ? "primary" : "outline"}
                size="sm"
                onClick={() => setSubmitOpen(true)}
                disabled={!ready}
                className="active:scale-[0.97]"
              >
                Send for Review
              </Button>
            </>
          ) : null
        }
      />

      <StatusNotice data={data} />
      <Facts data={data} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          {isAnalyst && data.canUpload ? (
            <UploadPanel
              projectId={data.project.id}
              onUploaded={(files) => {
                onUploaded(files);
                // The study header above shows the status (Not started → In progress); let it catch up.
                router.refresh();
                setToast({
                  message: files.length > 1 ? `${files.length} files uploaded` : `${files[0]?.fileName} uploaded`,
                  description: files.length === 1 && files[0]!.version > 1 ? `Saved as version ${files[0]!.version}. Older versions stay in History.` : "Your reviewer will see them when you send the work.",
                  variant: "success",
                });
              }}
            />
          ) : isAnalyst && data.uploadDisabledReason ? (
            <p className="rounded-[2px] border border-white/[0.07] bg-[#0A0A18] px-5 py-4 text-[13px] text-white/60">{data.uploadDisabledReason}</p>
          ) : null}

          <FilesPanel
            files={current}
            missing={missing}
            showChecklist={isAnalyst && data.canUpload}
            onHistory={setHistoryCategory}
            onError={(message) => setToast({ message: "Couldn't download", description: message, variant: "danger" })}
          />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <AskedPanel data={data} />
          <ClientFilesPanel data={data} />
        </div>
      </div>

      <ReviewsPanel data={data} />

      <VersionHistoryModal projectId={data.project.id} fileCategory={historyCategory} onClose={() => setHistoryCategory(null)} />
      <ScopeCreepModal
        projectId={data.project.id}
        projectTitle={data.project.researchTitle}
        isOpen={scopeOpen}
        onClose={() => setScopeOpen(false)}
        onSuccess={() => {
          setToast({ message: "Study put on hold", description: "An admin will price the extra work with the client.", variant: "success" });
          router.refresh();
          setData((prev) => ({
            ...prev,
            project: { ...prev.project, masterStatus: "SCOPE_CREEP_HALTED" },
            canUpload: false,
            uploadDisabledReason: "Work is on hold while the extra work you flagged is priced. Uploads open again once that is settled.",
          }));
        }}
      />
      <SubmitForQAModal
        projectId={data.project.id}
        projectTitle={data.project.researchTitle}
        reviewerName={data.assignment?.qaLeadName ?? null}
        missing={missing}
        isOpen={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSuccess={() => {
          setToast({ message: "Sent for review", description: `${data.assignment?.qaLeadName ?? "Your reviewer"} has your files now.`, variant: "success" });
          router.refresh();
          setData((prev) => ({
            ...prev,
            project: { ...prev.project, masterStatus: "FOR_QA" },
            canUpload: false,
            uploadDisabledReason: "Your files are with the reviewer. Uploads open again if they ask for changes.",
          }));
        }}
      />

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
};

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Panel as="div">
      <PanelBody className="flex items-start gap-3">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{title}</p>
          {children}
        </div>
      </PanelBody>
    </Panel>
  );
}

function StatusNotice({ data }: { data: Data }) {
  const status = data.project.masterStatus;
  const reviewer = data.activeRevision?.reviewerName || data.assignment?.qaLeadName || "Your reviewer";
  if (status === "QA_REVISION") {
    const r = data.activeRevision;
    return (
      <Notice title={`${reviewer} asked for changes`}>
        <p className="mt-0.5 text-[13px] text-white/55">
          {r?.reviewedAt ? `On ${dateTime(r.reviewedAt)}. ` : ""}
          {r?.errorClassification ? `${LEVEL[r.errorClassification] ?? r.errorClassificationLabel}. ` : ""}
          {r?.qaRevisionDueAt ? `Fix by ${dateTime(r.qaRevisionDueAt)}.` : "Upload the fixed files, then send them again."}
        </p>
        {r?.comments ? (
          <blockquote className="mt-3 whitespace-pre-wrap rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[13px] leading-relaxed text-white/85">
            {r.comments}
          </blockquote>
        ) : null}
      </Notice>
    );
  }
  // Still fixing after the reviewer sent it back (the first upload moves it to In progress): keep their notes in view.
  const latest = [...(data.qaReviews ?? [])].sort((x, y) => y.reviewedAt.localeCompare(x.reviewedAt))[0];
  if ((status === "IN_PROGRESS" || status === "EXPERT_ASSIGNED") && latest?.decision === "QA_REJECTED") {
    return (
      <Notice title={`Fixing what ${latest.reviewerName} asked`}>
        <p className="mt-0.5 text-[13px] text-white/55">
          {[
            `${dateTime(latest.reviewedAt)}.`,
            latest.errorClassification ? `${LEVEL[latest.errorClassification] ?? latest.errorClassificationLabel}.` : "",
            latest.qaRevisionDueAt ? `Fix by ${dateTime(latest.qaRevisionDueAt)}.` : "",
            "Send it for review again when you're done.",
          ]
            .filter(Boolean)
            .join(" ")}
        </p>
        {latest.comments ? (
          <blockquote className="mt-3 whitespace-pre-wrap rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[13px] leading-relaxed text-white/85">
            {latest.comments}
          </blockquote>
        ) : null}
      </Notice>
    );
  }
  if (status === "SCOPE_CREEP_HALTED") {
    const f = data.activeScopeCreep;
    return (
      <Notice title="Work is on hold">
        <p className="mt-0.5 text-[13px] text-white/55">
          Extra work was flagged. An admin is pricing it with the client; uploads open again once that&apos;s settled.
          {f?.flaggedAt ? ` Flagged ${dateTime(f.flaggedAt)}${f.flaggerName ? ` by ${f.flaggerName}` : ""}.` : ""}
        </p>
        {f?.flagReason ? <p className="mt-2 text-[13px] text-white/75">&ldquo;{f.flagReason}&rdquo;</p> : null}
      </Notice>
    );
  }
  if (status === "FOR_QA") {
    return (
      <Notice title={`With ${reviewer}`}>
        <p className="mt-0.5 text-[13px] text-white/55">They&apos;re checking your files. You&apos;ll get a notification when they answer.</p>
      </Notice>
    );
  }
  if (status === "SLA_PAUSED") {
    return (
      <Notice title="Deadline paused">
        <p className="mt-0.5 text-[13px] text-white/55">The due date doesn&apos;t count down until an admin resumes it. You can keep working.</p>
      </Notice>
    );
  }
  if (status === "REVISION_REQUESTED") {
    return (
      <Notice title="The client asked for changes">
        <p className="mt-0.5 text-[13px] text-white/55">Upload the updated files, then send them for review again. The request is on the study page under Revisions.</p>
      </Notice>
    );
  }
  if (DONE.includes(status)) {
    return (
      <Notice title="Delivered">
        <p className="mt-0.5 text-[13px] text-white/55">These files are final and can&apos;t change.</p>
      </Notice>
    );
  }
  if (STOPPED.includes(status)) return <Notice title="This study was stopped" />;
  return null;
}

function DueValue({ data }: { data: Data }) {
  const a = data.assignment;
  const status = data.project.masterStatus;
  if (DONE.includes(status)) return <>Delivered {shortDate(data.project.deliveredAt)}</>;
  if (STOPPED.includes(status) || !a) return <span className="text-white/40">—</span>;
  if (status === "REVISION_REQUESTED") return <span className="text-white/70">No new due date</span>;
  if (a.isPaused || status === "SLA_PAUSED") return <span className="text-white/70">Paused</span>;
  const diff = new Date(a.slaDueAt).getTime() - Date.now();
  if (diff < 0) {
    const days = Math.floor(-diff / DAY);
    return (
      <span className="inline-flex items-center gap-1.5 font-medium">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
        {days === 0 ? "Due today, late" : `Late by ${days} ${days === 1 ? "day" : "days"}`}
      </span>
    );
  }
  if (diff <= DAY) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
        Due in {Math.max(1, Math.round(diff / HOUR))}h
      </span>
    );
  }
  const days = Math.ceil(diff / DAY);
  return (
    <>
      {shortDate(a.slaDueAt)}
      <span className="text-white/40"> · in {days} days</span>
    </>
  );
}

function Facts({ data }: { data: Data }) {
  const items: Array<[string, React.ReactNode, string | null]> = [
    ["Client", data.project.clientName, data.project.clientSchool],
    ["Reviewer", data.assignment?.qaLeadName ?? <span className="text-white/40">Not assigned</span>, null],
    ["Package", clientPackageName(data.project.packageName) ?? <span className="text-white/40">—</span>, null],
    ["Due", <DueValue key="due" data={data} />, null],
  ];
  return (
    <Panel as="div">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 sm:px-6 lg:grid-cols-4">
        {items.map(([label, value, sub]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[12px] text-white/45">{label}</dt>
            <dd className="mt-0.5 truncate text-sm text-white">{value}</dd>
            {sub ? <dd className="truncate text-[12px] text-white/45">{sub}</dd> : null}
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function UploadPanel({ projectId, onUploaded }: { projectId: string; onUploaded: (files: Data["analysisFiles"]) => void }) {
  const [rows, setRows] = useState<Row[]>(freshRows);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const chosen = rows.filter((r): r is Row & { file: File } => r.file !== null);
  const setRow = (id: string, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const pick = (row: Row, file: File | undefined) => {
    if (!file) return;
    const meta = ANALYSIS_CATEGORY_METADATA[row.category];
    if (file.size > MAX_ANALYSIS_FILE_SIZE_BYTES) return setError(`${file.name} is ${size(file.size)}. Files can be up to 15 MB; try a ZIP.`);
    if (!meta.allowedExtensions.includes(fileExtension(file.name))) {
      return setError(`${file.name} can't be added as ${meta.label}. Use ${meta.hint}, or pick another kind.`);
    }
    setError(null);
    setRow(row.id, { file });
  };

  const changeKind = (row: Row, category: AnalysisFileCategory) => {
    const keep = row.file && ANALYSIS_CATEGORY_METADATA[category].allowedExtensions.includes(fileExtension(row.file.name));
    setRow(row.id, { category, file: keep ? row.file : null });
    if (row.file && !keep) setError(`${row.file.name} was taken off: it can't be added as ${ANALYSIS_CATEGORY_METADATA[category].label}.`);
  };

  const addRow = () => {
    const used = new Set(rows.map((r) => r.category));
    const next = CATEGORIES.find((c) => !used.has(c)) ?? "OTHER";
    setRows((all) => [...all, { id: `r${Date.now()}`, category: next, file: null }]);
  };

  const upload = async () => {
    if (chosen.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    const done: Data["analysisFiles"] = [];
    try {
      for (const [i, row] of chosen.entries()) {
        setProgress(chosen.length > 1 ? `Uploading ${i + 1} of ${chosen.length}...` : "Uploading...");
        // 1. The file itself goes to storage, into this study's workbench folder.
        const stored = await uploadFileToR2(row.file, "ANALYSIS_OUTPUT", projectId);
        if (!stored.success || !stored.data) throw new Error(stored.error?.message || `${row.file.name} didn't upload. Please try again.`);
        // 2. Then the record, which makes it the current version of its kind.
        const res = await uploadAnalysisFile({
          projectId,
          fileName: row.file.name,
          filePath: stored.data.storageKey,
          fileType: row.file.type || "application/octet-stream",
          fileSize: row.file.size,
          fileCategory: row.category,
          notes: notes.trim() || undefined,
        });
        if (!res.success) throw new Error(res.error?.message || `${row.file.name} didn't save. Please try again.`);
        done.push(res.data);
        setRow(row.id, { file: null });
      }
      setRows(freshRows());
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The upload didn't finish. Please try again.");
    } finally {
      if (done.length > 0) onUploaded(done);
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Upload files"
        subtitle="Pick what each file is. A new upload of the same kind becomes the current version; older ones stay in History."
      />
      <PanelBody className="flex flex-col gap-3">
        {rows.map((row) => {
          const meta = ANALYSIS_CATEGORY_METADATA[row.category];
          const takenElsewhere = new Set(rows.filter((r) => r.id !== row.id).map((r) => r.category));
          return (
            <div key={row.id} className="flex flex-col gap-2 rounded-[2px] border border-white/[0.08] bg-white/[0.015] p-3 sm:flex-row sm:items-center sm:gap-3">
              <label className="flex shrink-0 flex-col gap-1 sm:w-52">
                <span className="sr-only">What this file is</span>
                <select
                  value={row.category}
                  onChange={(e) => changeKind(row, e.target.value as AnalysisFileCategory)}
                  disabled={busy}
                  className={`${FIELD} h-9 cursor-pointer px-2.5 [&>option]:bg-[#0A0A18]`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} disabled={takenElsewhere.has(c)}>
                      {ANALYSIS_CATEGORY_METADATA[c].label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <input
                  ref={(el) => {
                    inputs.current[row.id] = el;
                  }}
                  type="file"
                  accept={meta.accept}
                  className="hidden"
                  onChange={(e) => {
                    pick(row, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => inputs.current[row.id]?.click()} disabled={busy} className="shrink-0 active:scale-[0.97]">
                  {row.file ? "Change" : "Choose File"}
                </Button>
                {row.file ? (
                  <span className="min-w-0 truncate text-[13px] text-white">
                    {row.file.name} <span className="text-white/40">· {size(row.file.size)}</span>
                  </span>
                ) : (
                  <span className="min-w-0 truncate text-[12px] text-white/40" title={meta.hint}>
                    {meta.hint}
                  </span>
                )}
              </div>
              {rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setRows((all) => all.filter((r) => r.id !== row.id))}
                  disabled={busy}
                  aria-label="Remove this row"
                  className="self-end rounded-[2px] p-2 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white sm:self-center"
                >
                  <Trash size={14} weight="fill" />
                </button>
              ) : null}
            </div>
          );
        })}

        {rows.length < MAX_ROWS ? (
          <button
            type="button"
            onClick={addRow}
            disabled={busy}
            className="inline-flex w-fit items-center gap-1.5 rounded-[2px] px-1 py-1 text-[13px] text-white/60 transition-colors hover:text-white"
          >
            <Plus size={13} weight="bold" />
            Add another file
          </button>
        ) : null}

        <div className="mt-1 flex flex-col gap-2.5 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            disabled={busy}
            placeholder="What changed in this version? (optional)"
            aria-label="Version note"
            className={`${FIELD} h-9 flex-1 px-3`}
          />
          <Button variant="primary" size="sm" onClick={upload} loading={busy} disabled={chosen.length === 0} className="gap-1.5 active:scale-[0.97]">
            {busy ? null : <CloudArrowUp size={14} weight="fill" />}
            {busy ? progress : chosen.length > 1 ? `Upload ${chosen.length} Files` : "Upload"}
          </Button>
        </div>

        {error ? (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
            <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
        <p className="text-[12px] text-white/40">Up to 15 MB each. R, Quarto, R Markdown, Python, SPSS, Stata, SAS, JASP, jamovi, Excel, Word, PDF, HTML and ZIP.</p>
      </PanelBody>
    </Panel>
  );
}

function FilesPanel({
  files,
  missing,
  showChecklist,
  onHistory,
  onError,
}: {
  files: Data["analysisFiles"];
  missing: string[];
  showChecklist: boolean;
  onHistory: (c: AnalysisFileCategory) => void;
  onError: (message: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const hasWriteUp = !missing.some((m) => m.includes("write-up"));
  const hasCode = !missing.some((m) => m.includes("code"));
  const ordered = [...files].sort((a, b) => CATEGORIES.indexOf(a.fileCategory) - CATEGORIES.indexOf(b.fileCategory));

  const download = async (id: string, name: string) => {
    setBusyId(id);
    try {
      const res = await getAnalysisFileDownloadUrl(id);
      if (!res.success) return onError(res.error.message || "Please try again.");
      const link = document.createElement("a");
      link.href = res.data;
      link.download = name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      onError("Check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Panel>
      <PanelHeader title="Current files" count={files.length} subtitle="The latest version of each kind. This is what your reviewer checks." />
      {showChecklist ? (
        <ul className="mx-5 mt-4 grid grid-cols-1 gap-2 sm:mx-6 sm:grid-cols-2">
          {[
            ["Results write-up", hasWriteUp],
            ["Code or output (R, Quarto, Python, SPSS, Stata, Excel…)", hasCode],
          ].map(([label, ok]) => (
            <li key={String(label)} className="flex items-center gap-2 rounded-[2px] border border-white/[0.07] px-3 py-2 text-[13px]">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${ok ? "border-white/60 bg-white/90 text-[#0A0A18]" : "border-white/25"}`}
                aria-hidden="true"
              >
                {ok ? <Check size={10} weight="bold" /> : null}
              </span>
              <span className={ok ? "text-white/85" : "text-white/55"}>{label}</span>
              <span className="sr-only">{ok ? "added" : "still needed"}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {files.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <CloudArrowUp size={22} weight="fill" className="text-white/25" />
          <p className="text-sm text-white/60">No files yet.</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
          {ordered.map((f) => (
            <li key={f.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white" title={f.fileName}>
                  {f.fileName}
                </p>
                <p className="mt-0.5 text-[12px] text-white/45">
                  {f.categoryLabel} · <span className="font-mono">v{f.version}</span>
                  {size(f.fileSize) ? ` · ${size(f.fileSize)}` : ""} · {dateTime(f.uploadedAt)} · {f.statisticianName}
                </p>
                {f.notes ? <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{f.notes}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => onHistory(f.fileCategory)} className="active:scale-[0.97]">
                  {f.versionCount && f.versionCount > 1 ? `${f.versionCount} Versions` : "History"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => download(f.id, f.fileName)} loading={busyId === f.id} className="gap-1.5 active:scale-[0.97]">
                  {busyId === f.id ? null : <DownloadSimple size={13} weight="fill" />}
                  Download
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AskedPanel({ data }: { data: Data }) {
  const p = data.project;
  const block = (title: string, text?: string | null) =>
    text?.trim() ? (
      <div>
        <p className="text-[12px] font-medium text-white/45">{title}</p>
        <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-white/80">{text}</p>
      </div>
    ) : null;
  return (
    <Panel>
      <PanelHeader title="What the client asked" subtitle={data.sow?.signedAt ? `From the agreement signed ${shortDate(data.sow.signedAt)}` : "From the study request"} />
      <PanelBody className="flex flex-col gap-4">
        {block("Statement of the problem", p.researchObjectives)}
        {block("Research objectives", p.researchQuestions)}
        {block("Hypotheses", p.hypotheses)}
        {block("Additional notes from the client", p.clientNotes ?? null)}
        {data.sow?.deliverables && data.sow.deliverables.length > 0 ? (
          <div>
            <p className="text-[12px] font-medium text-white/45">What we agreed to deliver</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {data.sow.deliverables.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-white/80">
                  <Check size={12} weight="bold" className="mt-1 shrink-0 text-white/40" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {!p.researchQuestions?.trim() && !p.researchObjectives?.trim() ? <p className="text-[13px] text-white/40">Nothing written yet.</p> : null}
      </PanelBody>
    </Panel>
  );
}

const CLIENT_KIND: Record<string, string> = {
  DATASET: "Data file",
  RESEARCH_DOCUMENT: "Document",
  QUESTIONNAIRE: "Questionnaire",
};

function ClientFilesPanel({ data }: { data: Data }) {
  const files = data.clientFiles;
  return (
    <Panel>
      <PanelHeader title="Client's files" count={files.length} />
      {files.length === 0 ? (
        <PanelBody>
          <p className="text-[13px] text-white/45">The client hasn&apos;t added any files.</p>
        </PanelBody>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
          {files.map((f) => {
            const url = resolveStoredFileUrl(f.filePath);
            return (
              <li key={f.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-white" title={f.fileName}>
                    {f.fileName}
                  </p>
                  <p className="text-[12px] text-white/45">
                    {CLIENT_KIND[f.fileCategory] ?? "File"} · {shortDate(f.uploadedAt)}
                  </p>
                </div>
                {url ? (
                  <a
                    href={url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Download ${f.fileName}`}
                    className="shrink-0 rounded-[2px] p-2 text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <DownloadSimple size={15} weight="fill" />
                  </a>
                ) : (
                  <span className="shrink-0 text-[12px] text-white/30" title="This sample file has nothing inside (offline mode).">
                    Sample
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function ReviewsPanel({ data }: { data: Data }) {
  const reviews = [...(data.qaReviews ?? [])].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  if (reviews.length === 0) return null;
  return (
    <Panel>
      <PanelHeader title="Reviews" count={reviews.length} subtitle="What the reviewer said each time, newest first." />
      <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
        {reviews.map((r) => {
          const approved = r.decision === "QA_APPROVED";
          return (
            <li key={r.id} className="px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white">
                  {approved ? (
                    <Check size={13} weight="bold" className="text-white/60" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" />
                  )}
                  {approved ? "Approved" : "Changes asked"}
                </span>
                <span className="text-[12px] text-white/45">
                  {r.reviewerName} · {dateTime(r.reviewedAt)}
                  {r.errorClassification ? ` · ${LEVEL[r.errorClassification] ?? r.errorClassificationLabel}` : ""}
                </span>
              </div>
              {r.comments ? <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-white/75">{r.comments}</p> : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
