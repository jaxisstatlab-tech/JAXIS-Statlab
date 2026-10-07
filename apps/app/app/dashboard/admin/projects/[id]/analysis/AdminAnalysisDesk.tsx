"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Toast } from "@repo/ui";
import { DownloadSimple, Warning } from "@phosphor-icons/react";
import { ANALYSIS_CATEGORY_METADATA } from "@/lib/analysis-rules";
import { StudySection } from "@/features/projects/components/StudySection";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { getAnalysisFileDownloadUrl, resolveScopeCreep } from "@/features/analysis/actions";
import type { WorkbenchDataDTO } from "@/features/analysis/schemas";
import type { QaReviewDTO } from "@/features/qa/schemas";
import type { AnalysisFileCategory } from "@prisma/client";

// Admin Analysis tab: where the work is, the analyst's files (every version, read-only), the reviewer's
// decisions, and the one admin step here: letting the work continue after an extra-work hold.

type File = WorkbenchDataDTO["analysisFiles"][number];
const KIND_ORDER = Object.keys(ANALYSIS_CATEGORY_METADATA) as AnalysisFileCategory[];
const LEVEL: Record<string, string> = {
  MINOR: "Small fix",
  MAJOR: "Analysis needs changes",
  CRITICAL: "Calculation error",
  ETHICAL_BREACH: "Serious problem reported",
};
const DECISION: Record<string, string> = {
  QA_APPROVED: "Approved",
  QA_REJECTED: "Sent back for changes",
  ESCALATED_TO_CEO: "Reported to the CEO",
};
const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] p-3 font-sans text-[13px] leading-relaxed text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

const dateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const size = (bytes?: number | null) =>
  !bytes ? null : bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function AdminAnalysisDesk({ data, reviews = [], loadError }: { data?: WorkbenchDataDTO; reviews?: QaReviewDTO[]; loadError?: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "danger" } | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);

  const groups = useMemo(() => {
    const byKind = new Map<AnalysisFileCategory, File[]>();
    for (const f of data?.analysisFiles ?? []) byKind.set(f.fileCategory, [...(byKind.get(f.fileCategory) ?? []), f]);
    return KIND_ORDER.filter((k) => byKind.has(k)).map((k) => ({
      kind: k,
      label: ANALYSIS_CATEGORY_METADATA[k].label,
      files: byKind.get(k)!.sort((a, b) => b.version - a.version),
    }));
  }, [data?.analysisFiles]);

  if (!data) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">The analysis didn&apos;t load</p>
              <p className="mt-0.5 text-[13px] text-white/55">{loadError || "Try again in a moment."}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.refresh()}>
              Try Again
            </Button>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  const s = data.project.masterStatus;
  const a = data.assignment;
  const analyst = a?.statisticianName ?? "The analyst";
  const reviewer = a?.qaLeadName ?? "the reviewer";
  const current = data.analysisFiles.filter((f) => f.isCurrent).length;
  const older = data.analysisFiles.length - current;
  const lastUpload = data.analysisFiles.reduce<string | null>((m, f) => (!m || f.uploadedAt > m ? f.uploadedAt : m), null);
  const finished = ["DELIVERED", "CLOSED", "REVISION_REQUESTED", "DISPUTED", "CANCELLED"].includes(s);
  const flag = data.activeScopeCreep && !data.activeScopeCreep.isResolved ? data.activeScopeCreep : null;

  const description = !a
    ? "No team yet. The analyst's files show here once they start."
    : s === "SCOPE_CREEP_HALTED"
      ? `On hold: ${analyst} flagged work outside the agreement. Sort it out with the client, then let the work continue.`
      : s === "FOR_QA"
        ? `${analyst} sent the work to ${reviewer} for checking.`
        : s === "QA_REVISION"
          ? `${reviewer[0]!.toUpperCase()}${reviewer.slice(1)} sent it back to ${analyst} for changes.`
          : s === "SLA_PAUSED"
            ? "The deadline is paused. Resume it on the Overview's Team card."
            : ["DELIVERED", "CLOSED", "REVISION_REQUESTED", "DISPUTED"].includes(s)
              ? "Approved by the reviewer and delivered. These files are final."
              : s === "ETHICAL_BREACH"
                ? "Reported to the CEO by the reviewer. The study is locked."
                : `${analyst} is working on it. Everything they upload shows here.`;

  const download = async (f: File) => {
    setBusyId(f.id);
    try {
      const res = await getAnalysisFileDownloadUrl(f.id);
      if (!res.success) return setToast({ message: "Couldn't download", description: res.error.message || "Please try again.", variant: "danger" });
      const link = document.createElement("a");
      link.href = res.data;
      link.download = f.fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setToast({ message: "Couldn't download", description: "Check your connection and try again.", variant: "danger" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <StudySection
        title="Analysis"
        description={description}
        actions={
          flag && s === "SCOPE_CREEP_HALTED" ? (
            <Button variant="primary" size="sm" onClick={() => setResolveOpen(true)} className="active:scale-[0.97]">
              Let the Work Continue
            </Button>
          ) : null
        }
      />

      {flag ? (
        <Panel as="div">
          <PanelBody className="flex items-start gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">
                {flag.flaggerName} flagged extra work · {dateTime(flag.flaggedAt)}
              </p>
              <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-white/75">&ldquo;{flag.flagReason}&rdquo;</p>
            </div>
          </PanelBody>
        </Panel>
      ) : null}

      <Panel as="div">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 sm:px-6 lg:grid-cols-4">
          {(
            [
              ["Analyst", a?.statisticianName ?? "Not assigned"],
              ["Reviewer", a?.qaLeadName ?? "Not assigned"],
              ["Deadline", a ? dateTime(a.slaDueAt) : "—", a && !finished ? (a.isPaused ? "Paused" : a.slaLabel) : null],
              ["Files", data.analysisFiles.length ? `${current} current${older > 0 ? ` · ${older} older` : ""}` : "None yet", lastUpload ? `Last upload ${dateTime(lastUpload)}` : null],
            ] as Array<[string, string, string | null | undefined]>
          ).map(([label, value, sub]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[12px] text-white/45">{label}</dt>
              <dd className="mt-0.5 text-sm text-white sm:truncate">{value}</dd>
              {sub ? <dd className={`text-[12px] sm:truncate ${a?.isOverdue && label === "Deadline" && !a.isPaused && !finished ? "text-red-300" : "text-white/45"}`}>{sub}</dd> : null}
            </div>
          ))}
        </dl>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <PanelHeader title="Analyst's files" count={data.analysisFiles.length} subtitle="Every version, grouped by kind. Only the analyst can change them." />
          {groups.length === 0 ? (
            <PanelBody>
              <p className="text-[13px] text-white/45">{a ? `${analyst} hasn't uploaded any files yet.` : "Nothing yet."}</p>
            </PanelBody>
          ) : (
            <div className="mt-4 flex flex-col">
              {groups.map((g) => (
                <section key={g.kind} aria-label={g.label} className="border-t border-white/[0.06]">
                  <h3 className="flex items-baseline gap-2 px-5 pb-1 pt-4 text-[13px] font-medium text-white sm:px-6">
                    {g.label}
                    <span className="font-mono text-[11px] font-normal text-white/40">
                      {g.files.length} {g.files.length === 1 ? "version" : "versions"}
                    </span>
                  </h3>
                  <ul className="divide-y divide-white/[0.04]">
                    {g.files.map((f) => (
                      <li key={f.id} className={`flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-start sm:gap-4 sm:px-6 ${f.isCurrent ? "" : "opacity-75"}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-white/60">v{f.version}</span>
                            {f.isCurrent ? (
                              <span className="rounded-[2px] border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-white/80">Current</span>
                            ) : null}
                            <span className="min-w-0 truncate text-sm text-white" title={f.fileName}>
                              {f.fileName}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-white/45">
                            {dateTime(f.uploadedAt)} · {f.statisticianName}
                            {size(f.fileSize) ? ` · ${size(f.fileSize)}` : ""}
                          </p>
                          {f.notes ? <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{f.notes}</p> : null}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => download(f)} loading={busyId === f.id} className="shrink-0 gap-1.5 active:scale-[0.97]">
                          {busyId === f.id ? null : <DownloadSimple size={13} weight="fill" />}
                          Download
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="self-start lg:col-span-4">
          <PanelHeader title="Reviews" count={reviews.length} subtitle={reviews.length ? "Newest first" : undefined} />
          {reviews.length === 0 ? (
            <PanelBody>
              <p className="text-[13px] text-white/45">{s === "FOR_QA" ? `Waiting for ${reviewer}.` : "Not reviewed yet."}</p>
            </PanelBody>
          ) : (
            <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
              {reviews.map((r) => (
                <li key={r.id} className="px-5 py-4 sm:px-6">
                  <p className="text-[13px] font-medium text-white">{DECISION[r.decision] ?? r.decisionLabel}</p>
                  <p className="mt-0.5 text-[12px] text-white/45">
                    {r.reviewerName} · {dateTime(r.reviewedAt)}
                  </p>
                  {r.errorClassification ? (
                    <p className="mt-1 text-[12px] text-white/60">
                      {LEVEL[r.errorClassification] ?? r.errorClassificationLabel}
                      {r.qaRevisionDueAt ? ` · fix by ${dateTime(r.qaRevisionDueAt)}` : ""}
                    </p>
                  ) : null}
                  {r.comments?.trim() ? <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-white/75">{r.comments}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {flag ? (
        <ResolveDialog
          open={resolveOpen}
          projectId={data.project.id}
          logId={flag.id}
          analyst={analyst}
          onClose={() => setResolveOpen(false)}
          onDone={() => {
            setResolveOpen(false);
            setToast({ message: "Work can continue", description: `${analyst} was told.`, variant: "success" });
            router.refresh();
          }}
        />
      ) : null}
      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function ResolveDialog({
  open,
  projectId,
  logId,
  analyst,
  onClose,
  onDone,
}: {
  open: boolean;
  projectId: string;
  logId: string;
  analyst: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  if (!open) return null;
  const send = () => {
    if (notes.trim().length < 5) return setError(`Tell ${analyst} what was agreed (at least 5 characters).`);
    setError(null);
    start(async () => {
      const res = await resolveScopeCreep({ projectId, scopeCreepLogId: logId, resolutionNotes: notes.trim() });
      if (res.success) onDone();
      else setError(res.error.message);
    });
  };
  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title="Let the work continue"
      description={`The study goes back to In progress and ${analyst} gets your note.`}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={send} loading={busy}>
            Continue the Work
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 font-sans">
        <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
          What was agreed with the client?
          <textarea
            rows={4}
            value={notes}
            maxLength={2000}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="For example: The client paid ₱800 for the extra regression. Go ahead with it."
            className={`${FIELD} resize-none`}
          />
        </label>
        {error ? (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
            <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
