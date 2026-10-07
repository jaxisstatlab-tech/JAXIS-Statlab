"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Modal, Toast } from "@repo/ui";
import { ArrowRight, Check, DownloadSimple, Warning } from "@phosphor-icons/react";
import { submitQaReview } from "../actions";
import { getAnalysisFileDownloadUrl } from "@/features/analysis/actions";
import { resolveStoredFileUrl } from "@/lib/file-utils";
import { isTier2Package } from "@/lib/qa-rules";
import { clientPackageName } from "@/features/projects/client-packages";
import { StudySection } from "@/features/projects/components/StudySection";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import type { QaInspectionDeskDTO } from "../schemas";
import { QADecision, ErrorClassification } from "@prisma/client";

// The reviewer's page for one study: the analyst's current files to check, what the client asked for, past
// reviews, and the decision (approve, send back, or report a serious problem).

type Data = QaInspectionDeskDTO;
type ToastState = { message: string; description?: string; variant: "info" | "success" | "warning" | "danger" } | null;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

/** Plain names for the reviewer's error levels (the stored values stay the same). */
const LEVELS: Array<{ id: ErrorClassification; label: string; hint: string }> = [
  { id: ErrorClassification.MINOR, label: "Small fix", hint: "Formatting, table labels, wording" },
  { id: ErrorClassification.MAJOR, label: "Analysis needs changes", hint: "Wrong test, assumptions not checked, missing output" },
  { id: ErrorClassification.CRITICAL, label: "Calculation error", hint: "Numbers or conclusions are wrong" },
];
const LEVEL_LABEL: Record<string, string> = {
  MINOR: "Small fix",
  MAJOR: "Analysis needs changes",
  CRITICAL: "Calculation error",
  ETHICAL_BREACH: "Serious problem reported",
};

const DECISIONS: Array<{ id: QADecision; title: string; body: string }> = [
  { id: QADecision.QA_APPROVED, title: "Approve", body: "Everything checks out. The study is delivered to the client." },
  { id: QADecision.QA_REJECTED, title: "Send back for changes", body: "The analyst fixes it within 24 hours and sends it again." },
  { id: QADecision.ESCALATED_TO_CEO, title: "Report a serious problem", body: "Faked or manipulated data. Locks the study and alerts the CEO." },
];

/** Starting text the reviewer can pick and edit. */
const TEMPLATES: Record<QADecision, Array<{ label: string; level?: ErrorClassification; text: string }>> = {
  QA_APPROVED: [
    {
      label: "Checked and matches",
      text: "I re-ran the analysis from the files. The numbers, p-values and effect sizes match, and the tables follow APA 7.",
    },
  ],
  QA_REJECTED: [
    {
      label: "APA table format",
      level: ErrorClassification.MINOR,
      text: "Please format the tables in APA 7: italicize statistical symbols (p, t, F), remove vertical lines, and add a note under each table.",
    },
    {
      label: "Assumption checks missing",
      level: ErrorClassification.MAJOR,
      text: "The normality, multicollinearity (VIF) and equal-variance checks are missing. Please run them, add the output, and say in the write-up whether they were met.",
    },
    {
      label: "Numbers don't match",
      level: ErrorClassification.CRITICAL,
      text: "When I re-ran the analysis, Table __ gave different results. Please check which cases were included and how the variables were coded.",
    },
  ],
  ESCALATED_TO_CEO: [
    {
      label: "Data looks made up",
      level: ErrorClassification.ETHICAL_BREACH,
      text: "The answers in the data follow a pattern that real survey answers don't (for example, many identical rows or a too-even spread). This needs the CEO to look at it before anything else happens.",
    },
  ],
};

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

export function QAEvaluationDesk({ data, hasSignature = true }: { data: Data; hasSignature?: boolean }) {
  const [toast, setToast] = useState<ToastState>(null);
  const status = data.project.masterStatus;
  const analyst = data.assignment?.statisticianName ?? "the analyst";

  const description =
    status === "FOR_QA"
      ? `Check ${analyst}'s files, then approve them or send them back with notes.`
      : status === "QA_REVISION"
        ? `Sent back to ${analyst}. You'll get a notification when the fixed files come in.`
        : status === "ETHICAL_BREACH"
          ? "Reported to the CEO. The study is locked until they decide."
          : data.project.qaApproved || ["DELIVERED", "CLOSED", "DISPUTED"].includes(status)
            ? "Approved and delivered."
            : `${analyst} is still working on it. You'll get a notification when it's ready for you.`;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      <StudySection
        title="Review"
        description={description}
        actions={
          <Button asChild variant="ghost" size="sm" className="active:scale-[0.97]">
            <Link href={`/dashboard/qa/projects/${data.project.id}/files`}>Every Version</Link>
          </Button>
        }
      />

      <StatusNotice data={data} />
      <Facts data={data} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <FilesPanel data={data} onError={(m) => setToast({ message: "Couldn't download", description: m, variant: "danger" })} />
          {data.canReview ? (
            <DecisionPanel data={data} hasSignature={hasSignature} onDone={(t) => setToast(t)} />
          ) : data.reviewDisabledReason && status === "FOR_QA" ? (
            <p className="rounded-[2px] border border-white/[0.07] bg-[#0A0A18] px-5 py-4 text-[13px] text-white/60">{data.reviewDisabledReason}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-6 lg:col-span-4">
          <AskedPanel data={data} />
          <ClientFilesPanel data={data} />
          <HistoryPanel data={data} />
        </div>
      </div>

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

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
  const r = data.activeRevision;
  if (status === "ETHICAL_BREACH") {
    return (
      <Notice title="Reported to the CEO">
        <p className="mt-0.5 text-[13px] text-white/55">The study is locked: no file changes or client messages until the CEO decides.</p>
      </Notice>
    );
  }
  if (status === "QA_REVISION" && r) {
    return (
      <Notice title={`You sent it back${r.errorClassification ? `: ${LEVEL_LABEL[r.errorClassification] ?? r.errorClassificationLabel}` : ""}`}>
        <p className="mt-0.5 text-[13px] text-white/55">
          {dateTime(r.reviewedAt)}.{r.qaRevisionDueAt ? ` The analyst should fix it by ${dateTime(r.qaRevisionDueAt)}.` : ""}
        </p>
        <blockquote className="mt-3 whitespace-pre-wrap rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[13px] leading-relaxed text-white/85">
          {r.comments}
        </blockquote>
      </Notice>
    );
  }
  if (status === "FOR_QA" && data.rejectionCount > 0) {
    return (
      <Notice title={`Sent again after ${data.rejectionCount} ${data.rejectionCount === 1 ? "round" : "rounds"} of changes`}>
        <p className="mt-0.5 text-[13px] text-white/55">Check that your last notes were fixed. Past reviews are on the right.</p>
      </Notice>
    );
  }
  return null;
}

function DueValue({ data }: { data: Data }) {
  const a = data.assignment;
  const status = data.project.masterStatus;
  if (data.project.qaApproved || ["DELIVERED", "CLOSED", "DISPUTED"].includes(status)) return <>Delivered</>;
  if (!a) return <span className="text-white/40">—</span>;
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
  return (
    <>
      {shortDate(a.slaDueAt)}
      <span className="text-white/40"> · in {Math.ceil(diff / DAY)} days</span>
    </>
  );
}

function Facts({ data }: { data: Data }) {
  const pkg = clientPackageName(data.project.packageName);
  const items: Array<[string, React.ReactNode, string | null]> = [
    ["Client", data.project.clientName, data.project.clientSchool],
    ["Analyst", data.assignment?.statisticianName ?? <span className="text-white/40">Not assigned</span>, null],
    ["Package", pkg ?? <span className="text-white/40">—</span>, isTier2Package(data.project.packageName) ? "Can't be delivered without your approval" : null],
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

function FilesPanel({ data, onError }: { data: Data; onError: (message: string) => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const current = data.analysisFiles.filter((f) => f.isCurrent);
  const older = data.analysisFiles.length - current.length;

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
      <PanelHeader
        title="Files to check"
        count={current.length}
        subtitle="The analyst's current version of each file. Download them and re-run the analysis."
        aside={
          older > 0 ? (
            <Link href={`/dashboard/qa/projects/${data.project.id}/files`} className="text-[13px] text-white/55 transition-colors hover:text-white">
              {older} older {older === 1 ? "version" : "versions"}
            </Link>
          ) : null
        }
      />
      {current.length === 0 ? (
        <PanelBody>
          <p className="text-[13px] text-white/45">The analyst hasn&apos;t uploaded any files yet.</p>
        </PanelBody>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
          {current.map((f) => (
            <li key={f.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white" title={f.fileName}>
                  {f.fileName}
                </p>
                <p className="mt-0.5 text-[12px] text-white/45">
                  {f.categoryLabel} · <span className="font-mono">v{f.version}</span>
                  {size(f.fileSize) ? ` · ${size(f.fileSize)}` : ""} · {dateTime(f.uploadedAt)}
                </p>
                {f.notes ? (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">
                    <span className="text-white/45">Analyst&apos;s note: </span>
                    {f.notes}
                  </p>
                ) : null}
              </div>
              <Button variant="outline" size="sm" onClick={() => download(f.id, f.fileName)} loading={busyId === f.id} className="shrink-0 gap-1.5 active:scale-[0.97]">
                {busyId === f.id ? null : <DownloadSimple size={13} weight="fill" />}
                Download
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function DecisionPanel({ data, hasSignature, onDone }: { data: Data; hasSignature: boolean; onDone: (t: ToastState) => void }) {
  const router = useRouter();
  const [decision, setDecision] = useState<QADecision>(QADecision.QA_APPROVED);
  const [level, setLevel] = useState<ErrorClassification | undefined>(undefined);
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, start] = useTransition();
  const current = data.analysisFiles.filter((f) => f.isCurrent);

  const pick = (d: QADecision) => {
    setDecision(d);
    setLevel(d === QADecision.QA_REJECTED ? (level && level !== ErrorClassification.ETHICAL_BREACH ? level : ErrorClassification.MINOR) : d === QADecision.ESCALATED_TO_CEO ? ErrorClassification.ETHICAL_BREACH : undefined);
    setError(null);
  };

  const check = () => {
    if (comments.trim().length < 10) return setError("Write what you checked or what needs fixing (at least 10 characters).");
    if (decision === QADecision.QA_REJECTED && !level) return setError("Pick how serious the problem is.");
    setError(null);
    setConfirmOpen(true);
  };

  const send = () =>
    start(async () => {
      const res = await submitQaReview({
        projectId: data.project.id,
        decision,
        errorClassification: decision === QADecision.QA_APPROVED ? undefined : level,
        comments: comments.trim(),
      });
      setConfirmOpen(false);
      if (!res.success) {
        setError(res.error?.message || "Couldn't save your review. Please try again.");
        return;
      }
      onDone(
        decision === QADecision.QA_APPROVED
          ? { message: "Approved", description: "The study is delivered and the client is told their files are ready.", variant: "success" }
          : decision === QADecision.QA_REJECTED
            ? { message: "Sent back", description: `${data.assignment?.statisticianName ?? "The analyst"} has 24 hours to fix it.`, variant: "success" }
            : { message: "Reported to the CEO", description: "The study is locked until they decide.", variant: "success" },
      );
      router.refresh();
    });

  const choice = DECISIONS.find((d) => d.id === decision)!;
  const buttonLabel = decision === QADecision.QA_APPROVED ? "Approve Study" : decision === QADecision.QA_REJECTED ? "Send Back" : "Report to CEO";

  return (
    <Panel>
      <PanelHeader title="Your decision" subtitle="Every decision is saved with your name and the time." />
      <PanelBody className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Decision">
          {DECISIONS.map((d) => {
            const on = d.id === decision;
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pick(d.id)}
                className={`rounded-[2px] border px-3.5 py-3 text-left transition-colors ${on ? "border-[#CC6600]/70 bg-[#CC6600]/[0.06]" : "border-white/10 hover:border-white/25"}`}
              >
                <p className="text-sm font-medium text-white">{d.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/50">{d.body}</p>
              </button>
            );
          })}
        </div>

        {decision === QADecision.QA_REJECTED ? (
          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-medium text-white/45">How serious is it?</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="How serious">
              {LEVELS.map((l) => {
                const on = l.id === level;
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setLevel(l.id)}
                    className={`rounded-[2px] border px-3 py-2.5 text-left transition-colors ${on ? "border-white/40 bg-white/[0.05]" : "border-white/10 hover:border-white/25"}`}
                  >
                    <p className="text-[13px] font-medium text-white">{l.label}</p>
                    <p className="mt-0.5 text-[12px] text-white/45">{l.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12px] font-medium text-white/45">Start from:</span>
            {TEMPLATES[decision].map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => {
                  setComments(t.text);
                  if (t.level) setLevel(t.level);
                  setError(null);
                }}
                className="rounded-[2px] border border-white/10 px-2.5 py-1 text-[12px] text-white/70 transition-colors hover:border-white/25 hover:text-white"
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
            {decision === QADecision.QA_APPROVED ? "What you checked" : decision === QADecision.QA_REJECTED ? "What the analyst should fix" : "What you found"}
            <textarea
              rows={5}
              maxLength={3000}
              value={comments}
              onChange={(e) => {
                setComments(e.target.value);
                setError(null);
              }}
              placeholder={
                decision === QADecision.QA_REJECTED
                  ? "Be specific: which table or test, what's wrong, and what to change."
                  : decision === QADecision.QA_APPROVED
                    ? "For example: re-ran the regression from the R file; coefficients and p-values match Table 4."
                    : "What looks wrong, and where in the data or files."
              }
              className={`${FIELD} resize-none p-3 leading-relaxed`}
            />
            <span className="self-end font-mono text-[11px] text-white/35">{comments.length} / 3000</span>
          </label>
          {decision === QADecision.QA_REJECTED ? <p className="text-[12px] text-white/45">The analyst sees exactly what you write here.</p> : null}
        </div>

        {error ? (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
            <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}

        {decision === QADecision.QA_APPROVED && !hasSignature ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[2px] border border-[#CC6600]/40 px-3.5 py-2.5 text-[13px] text-white/75">
            Add your signature before approving. It goes on the client&apos;s certificate.
            <Link href="/dashboard/qa/profile#signature" className="font-medium text-white underline underline-offset-2">
              Add Signature
            </Link>
          </p>
        ) : null}

        <div className="flex justify-end border-t border-white/[0.07] pt-4">
          <Button
            variant={decision === QADecision.ESCALATED_TO_CEO ? "danger" : "primary"}
            size="sm"
            onClick={check}
            disabled={decision === QADecision.QA_APPROVED && !hasSignature}
            className="gap-1.5 active:scale-[0.97]"
          >
            {buttonLabel}
            <ArrowRight size={13} weight="bold" />
          </Button>
        </div>
      </PanelBody>

      <Modal
        open={confirmOpen}
        onClose={() => (busy ? undefined : setConfirmOpen(false))}
        title={decision === QADecision.QA_APPROVED ? "Approve this study?" : decision === QADecision.QA_REJECTED ? "Send it back?" : "Report this to the CEO?"}
        description={`${data.project.intakeId} · ${data.project.researchTitle}`}
        size="md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant={decision === QADecision.ESCALATED_TO_CEO ? "danger" : "primary"} size="sm" onClick={send} loading={busy} className="active:scale-[0.97]">
              {buttonLabel}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 font-sans text-[13px]">
          <p className="leading-relaxed text-white/70">
            {decision === QADecision.QA_APPROVED
              ? "The study is delivered right away and the client is told their files are ready. These files become the client's final files (they can download them once the study is paid in full):"
              : decision === QADecision.QA_REJECTED
                ? `${data.assignment?.statisticianName ?? "The analyst"} gets your notes and 24 hours to fix it${level ? ` (${LEVEL_LABEL[level]})` : ""}.`
                : "The study is locked right away (no file changes or client messages) and the CEO is alerted."}
          </p>
          {decision === QADecision.QA_APPROVED ? (
            <ul className="rounded-[2px] border border-white/[0.08] px-3.5 py-2.5 text-white/80">
              {current.length === 0 ? <li className="text-white/45">No files</li> : current.map((f) => <li key={f.id} className="truncate">{f.fileName}</li>)}
            </ul>
          ) : null}
          <div>
            <p className="text-[12px] font-medium text-white/45">{choice.title === "Approve" ? "What you checked" : "Your notes"}</p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-white/85">{comments.trim()}</p>
          </div>
        </div>
      </Modal>
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
        {block("Research questions", p.researchQuestions)}
        {block("Hypotheses", p.hypotheses)}
        {block("What the study wants to find out", p.researchObjectives)}
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
        {!data.sow ? <p className="text-[12px] text-white/40">No signed agreement found for this study.</p> : null}
      </PanelBody>
    </Panel>
  );
}

const CLIENT_KIND: Record<string, string> = { DATASET: "Data file", RESEARCH_DOCUMENT: "Document", QUESTIONNAIRE: "Questionnaire" };

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

function HistoryPanel({ data }: { data: Data }) {
  const reviews = [...data.reviewHistory].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  return (
    <Panel>
      <PanelHeader title="Past reviews" count={reviews.length} subtitle={reviews.length === 0 ? "This is the first time it's been sent." : undefined} />
      {reviews.length > 0 ? (
        <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
          {reviews.map((r) => (
            <li key={r.id} className="px-5 py-3.5 sm:px-6">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-white">
                {r.decision === "QA_APPROVED" ? (
                  <Check size={12} weight="bold" className="text-white/60" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" />
                )}
                {r.decision === "QA_APPROVED" ? "Approved" : r.decision === "QA_REJECTED" ? "Sent back" : "Reported to the CEO"}
              </p>
              <p className="mt-0.5 text-[12px] text-white/45">
                {r.reviewerName} · {dateTime(r.reviewedAt)}
                {r.errorClassification ? ` · ${LEVEL_LABEL[r.errorClassification] ?? r.errorClassificationLabel}` : ""}
              </p>
              {r.comments ? <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-white/70">{r.comments}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="pb-5" />
      )}
    </Panel>
  );
}
