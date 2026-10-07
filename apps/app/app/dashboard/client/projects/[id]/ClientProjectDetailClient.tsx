"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button, Modal, Toast, ConfirmDialog, LoadingState } from "@repo/ui";
import { Peso } from "@repo/ui/MoneyDisplay";
import {
  ArrowRight,
  ChatCenteredText,
  Check,
  CloudArrowUp,
  DownloadSimple,
  Eye,
  Lock,
  Plus,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { getProjectById, deleteProjectFile, resolveMissingInfo, addProjectFile } from "@/features/projects/actions";
import { uploadFileToR2 } from "@/lib/storage-client";
import { getFileMeta, triggerFileDownload } from "@/lib/file-utils";
import { RequestStudyDeletionModal } from "@/features/projects/components/RequestStudyDeletionModal";
import { getClientStage, type ClientStage } from "@/features/projects/client-stage";
import { clientPackageName } from "@/features/projects/client-packages";
import { useDueText } from "@/features/projects/due-text";
import type { ProjectDetailItem, ProjectFileItem } from "@/features/projects/schemas";
import { CODE_EXTENSIONS, DATA_EXTENSIONS, REPORT_AND_FIGURE_EXTENSIONS, STUDY_FILE_EXTENSIONS } from "@/lib/file-types";
import type { FileCategory } from "@prisma/client";
import { Meter, Panel, PanelHeader } from "@/components/dashboard/Panel";

// The study's Overview tab, written for students: what's happening and the one thing to do next,
// then what they sent us (questions and files), with dates, payment and help on the side.
// The title, study ID, stage and 5-step tracker live in the shared study header above this page.

const DocumentViewerLightbox = dynamic(
  () => import("@/features/projects/components/DocumentViewerLightbox").then((m) => m.DocumentViewerLightbox),
  { ssr: false }
);

const MAX_BYTES = 15 * 1024 * 1024;

// What a client can add before the agreement is signed. Extensions match what addProjectFile accepts.
const FILE_TYPES: Array<{ id: string; category: FileCategory; label: string; hint: string; extensions: string[]; formats: string }> = [
  {
    id: "chapters",
    category: "RESEARCH_DOCUMENT",
    label: "Chapters 1–3",
    hint: "Your proposal or draft chapters",
    extensions: [".pdf", ".docx", ".doc", ".odt", ".rtf"],
    formats: "PDF or Word",
  },
  {
    id: "data",
    category: "DATASET",
    label: "Data file",
    hint: "Your survey answers or data table",
    extensions: DATA_EXTENSIONS,
    formats: "Excel, CSV, SPSS, Stata, SAS, R, JASP or jamovi",
  },
  {
    id: "questionnaire",
    category: "QUESTIONNAIRE",
    label: "Questionnaire",
    hint: "Survey form, interview guide or rating scale",
    extensions: STUDY_FILE_EXTENSIONS.QUESTIONNAIRE,
    formats: "PDF, Word, Excel or CSV",
  },
  {
    id: "earlier",
    category: "RESEARCH_DOCUMENT",
    label: "Earlier analysis or code",
    hint: "R, Quarto, Python, SPSS, Stata, SAS, JASP or jamovi files, or their output",
    extensions: [...new Set([...CODE_EXTENSIONS, ".rds", ".rdata", ".rda", ".sav", ".dta", ".sas7bdat", ...REPORT_AND_FIGURE_EXTENSIONS, ".pdf", ".docx", ".zip"])],
    formats: "R, Quarto (.qmd), R Markdown, Python, SPSS, Stata, SAS, JASP, jamovi, HTML, PDF or ZIP",
  },
  {
    id: "other",
    category: "RESEARCH_DOCUMENT",
    label: "Something else",
    hint: "Adviser notes, ethics approval or a reference paper",
    extensions: [".pdf", ".docx", ".doc", ".odt", ".rtf", ".txt", ".png", ".jpg", ".jpeg", ".zip"],
    formats: "PDF, Word, picture or ZIP",
  },
];

const CATEGORY_LABEL: Partial<Record<FileCategory, string>> = {
  RESEARCH_DOCUMENT: "Document",
  DATASET: "Data file",
  QUESTIONNAIRE: "Questionnaire",
};

// Files can be added or removed until the agreement is signed.
const EDITABLE_STATUSES = new Set([
  "NEW_REQUEST",
  "AWAITING_INFORMATION",
  "UNDER_EVALUATION",
  "QUOTE_SENT",
  "CLIENT_APPROVED",
  "SOW_PENDING",
]);

const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ToastState = { message: string; description?: string; variant: "success" | "danger" | "info" } | null;

export interface ClientProjectDetailClientProps {
  projectId: string;
  initialProject: ProjectDetailItem | null;
  initialError?: string | null;
}

export function ClientProjectDetailClient({ projectId, initialProject, initialError = null }: ClientProjectDetailClientProps) {
  const [project, setProject] = useState<ProjectDetailItem | null>(initialProject);
  const [isLoading, setIsLoading] = useState(!initialProject && !initialError);
  const [loadError, setLoadError] = useState<string | null>(initialError);
  const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ProjectFileItem | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isResolving, startResolveTransition] = useTransition();
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    // Preloaded by the server component: no second fetch.
    if (initialProject && (initialProject.id === projectId || initialProject.intakeId === projectId)) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      const res = await getProjectById(projectId);
      if (cancelled) return;
      if (res.success) setProject(res.data);
      else setLoadError(res.error.message);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, initialProject]);

  const handleDeleteFile = () => {
    if (!fileToDelete || !project) return;
    const target = fileToDelete;
    startDeleteTransition(async () => {
      const res = await deleteProjectFile(project.id, target.id);
      if (res.success) {
        setProject((prev) => (prev ? { ...prev, files: prev.files.filter((f) => f.id !== target.id) } : prev));
        setToast({ message: "File removed", description: `${target.fileName} was removed from your study.`, variant: "success" });
      } else {
        setToast({ message: "Couldn't remove the file", description: res.error.message, variant: "danger" });
      }
      setFileToDelete(null);
    });
  };

  const handleResolve = () => {
    if (!project) return;
    startResolveTransition(async () => {
      const res = await resolveMissingInfo(project.id);
      if (res.success) {
        setProject(res.data);
        window.dispatchEvent(new Event("jaxis:study-updated"));
        setToast({
          message: "Sent to our team",
          description: "We'll look at what you added and finish your price.",
          variant: "success",
        });
      } else {
        setToast({ message: "That didn't go through", description: res.error.message, variant: "danger" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <LoadingState variant="page" label="Loading your study..." />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div data-portal="client" className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 animate-content-fade">
        <Panel as="div">
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <WarningCircle size={28} weight="fill" className="text-white/30" />
            <p className="mt-4 text-sm font-medium text-white">We couldn&apos;t open this study</p>
            <p className="mt-1 max-w-md text-[13px] text-white/55">
              {loadError || "It may have been removed, or it belongs to another account."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-5">
              <Link href="/dashboard/client/projects">Back to All Studies</Link>
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  const stage = getClientStage(project.masterStatus);
  const canEditFiles = EDITABLE_STATUSES.has(project.masterStatus);

  return (
    <div data-portal="client" className="grid grid-cols-1 gap-6 pb-24 lg:grid-cols-12">
      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}

      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
        <NowPanel
          project={project}
          stage={stage}
          isResolving={isResolving}
          onResolve={handleResolve}
          onAddFile={() => setIsUploadOpen(true)}
        />
        <QuestionsPanel project={project} />
        <FilesPanel
          project={project}
          canEdit={canEditFiles}
          onAdd={() => setIsUploadOpen(true)}
          onRemove={setFileToDelete}
          onToast={setToast}
        />
      </div>

      <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4" aria-label="Study details">
        <DetailsPanel project={project} stage={stage} />
        <PaymentPanel project={project} stage={stage} />
        <HelpPanel project={project} stage={stage} onAskToDelete={() => setIsDeletionModalOpen(true)} />
      </aside>

      <RequestStudyDeletionModal
        open={isDeletionModalOpen}
        onClose={() => setIsDeletionModalOpen(false)}
        study={{ id: project.id, intakeId: project.intakeId, title: project.researchTitle }}
      />

      {fileToDelete ? (
        <ConfirmDialog
          open
          onCancel={() => setFileToDelete(null)}
          title="Remove this file?"
          description={`${fileToDelete.fileName} will be removed from your study. You can add it again before your agreement is signed.`}
          confirmLabel="Remove File"
          confirmVariant="destructive"
          loading={isDeleting}
          onConfirm={handleDeleteFile}
        />
      ) : null}

      {isUploadOpen ? (
        <UploadModal
          project={project}
          onClose={() => setIsUploadOpen(false)}
          onAdded={(file) => {
            setProject((prev) => (prev ? { ...prev, files: [...prev.files, file] } : prev));
            setIsUploadOpen(false);
            setToast({ message: "File added", description: `${file.fileName} is now part of your study.`, variant: "success" });
          }}
        />
      ) : null}
    </div>
  );
}

// ─── What's happening ────────────────────────────────────────────────────────

function NowPanel({
  project: p,
  stage,
  isResolving,
  onResolve,
  onAddFile,
}: {
  project: ProjectDetailItem;
  stage: ClientStage;
  isResolving: boolean;
  onResolve: () => void;
  onAddFile: () => void;
}) {
  const base = `/dashboard/client/projects/${p.id}`;
  const f = p.financialSummary;
  const status = p.masterStatus;
  const awaitingDeposit = status === "SOW_SIGNED" || status === "AWAITING_PAYMENT";
  const receiptSent = awaitingDeposit && (p.hasPendingPaymentVerification || p.latestPaymentStatus === "PROOF_SUBMITTED");
  const delivered = status === "DELIVERED" || status === "REVISION_REQUESTED";
  const balanceDue = delivered && f && !f.isFullyPaid && f.remainingBalance > 0 ? f.remainingBalance : 0;

  let title = stage.label;
  let body: React.ReactNode = stage.now;
  let next: string | null = stage.next;
  let needsYou = stage.tone === "action";
  let actions: React.ReactNode = null;

  if (status === "AWAITING_INFORMATION") {
    next = "Add the files below, then tell us you're done. We'll finish your price.";
    actions = (
      <>
        <Button variant="outline" size="sm" onClick={onAddFile} className="gap-1.5">
          <Plus size={14} weight="bold" />
          Add a File
        </Button>
        <Button variant="primary" size="sm" onClick={onResolve} loading={isResolving} className="gap-1.5">
          {isResolving ? "Sending..." : "I've Added Everything"}
        </Button>
      </>
    );
  } else if (receiptSent) {
    title = "We're checking your receipt";
    body = "We got your deposit receipt. Our team usually confirms it within one working day.";
    next = "Once it's confirmed, we assign your statistical analyst.";
    needsYou = false;
    actions = <ActionLink href={`${base}/payment`} label="View Payment" />;
  } else if (balanceDue > 0) {
    title = "Pay the rest to get your files";
    body = (
      <>
        Your files passed the final check. Pay the remaining{" "}
        <span className="font-mono font-semibold text-white">
          <Peso />
          {money(balanceDue)}
        </span>{" "}
        to unlock the downloads.
      </>
    );
    next = "Your download links open as soon as we confirm the payment.";
    needsYou = true;
    actions = <ActionLink href={`${base}/payment`} label="Pay the Rest" primary />;
  } else if (stage.action && stage.action.path) {
    const primary = needsYou || stage.tone === "done";
    actions = <ActionLink href={`${base}${stage.action.path}`} label={stage.action.label} primary={primary} />;
  }

  return (
    <Panel
      aria-label="What's happening"
      className={needsYou ? "border-[#CC6600]/35" : ""}
    >
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-white/45">
            {needsYou ? <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" /> : null}
            {needsYou ? "Your turn" : "What's happening"}
          </p>
          <h2 className="mt-1.5 font-sans text-lg font-semibold tracking-[-0.01em] text-white">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/70">{body}</p>
        </div>

        {status === "AWAITING_INFORMATION" && p.missingInfoReason ? (
          <div className="rounded-[2px] border border-white/[0.08] border-l-2 border-l-[#CC6600] bg-white/[0.02] px-4 py-3">
            <p className="text-xs font-medium text-white/50">What we need from you</p>
            <p className="mt-1 text-sm leading-relaxed text-white/85">{p.missingInfoReason}</p>
          </div>
        ) : null}

        {p.hasActiveDispute && status !== "DISPUTED" ? (
          <p className="text-[13px] text-white/60">
            You have an open claim on this study.{" "}
            <Link href="/dashboard/client/disputes" className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
              See it in Revisions &amp; help
            </Link>
          </p>
        ) : null}

        {next || actions ? (
          <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
            {next ? (
              <p className="text-[13px] leading-relaxed text-white/55">
                <span className="text-white/80">Next: </span>
                {next}
              </p>
            ) : (
              <span />
            )}
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function ActionLink({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return (
    <Button asChild variant={primary ? "primary" : "outline"} size="sm" className="gap-1.5 whitespace-nowrap">
      <Link href={href}>
        {label}
        <ArrowRight size={13} weight="bold" />
      </Link>
    </Button>
  );
}

// ─── What you sent ───────────────────────────────────────────────────────────

function QuestionsPanel({ project: p }: { project: ProjectDetailItem }) {
  const rows = [
    { label: "Objectives", body: p.researchObjectives },
    { label: "Statement of the problem", body: p.researchQuestions },
    { label: "Hypotheses", body: p.hypotheses },
  ].filter((r) => r.body && r.body.trim());

  return (
    <Panel aria-label="What you sent us">
      <PanelHeader title="What you sent us" subtitle="What you asked us to answer. Your statistical analyst works from this." />
      {rows.length === 0 ? (
        <p className="px-5 pb-6 pt-4 text-[13px] text-white/45 sm:px-6">You didn&apos;t add your objectives yet.</p>
      ) : (
        <dl className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06]">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:gap-6 sm:px-6">
              <dt className="w-40 shrink-0 text-xs font-medium text-white/45 sm:pt-0.5">{r.label}</dt>
              <dd className="min-w-0 flex-1 whitespace-pre-line text-sm leading-relaxed text-white/80">{r.body}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

const ICON_BUTTON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50";

function FilesPanel({
  project: p,
  canEdit,
  onAdd,
  onRemove,
  onToast,
}: {
  project: ProjectDetailItem;
  canEdit: boolean;
  onAdd: () => void;
  onRemove: (file: ProjectFileItem) => void;
  onToast: (t: ToastState) => void;
}) {
  const [preview, setPreview] = useState<ProjectFileItem | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const files = p.files;

  const download = async (file: ProjectFileItem) => {
    onToast({ message: "Download started", description: `Downloading ${file.fileName}.`, variant: "info" });
    await triggerFileDownload(file.filePath, file.fileName);
  };

  const downloadAll = async () => {
    if (downloadingAll) return;
    setDownloadingAll(true);
    onToast({ message: "Download started", description: `Downloading ${files.length} files.`, variant: "info" });
    for (const file of files) {
      await triggerFileDownload(file.filePath, file.fileName);
      await new Promise((r) => setTimeout(r, 500));
    }
    setDownloadingAll(false);
  };

  return (
    <Panel aria-label="Files you sent">
      <PanelHeader
        title="Files you sent"
        count={files.length}
        subtitle={canEdit ? "You can add or remove files until your agreement is signed." : "Your statistical analyst works from these files."}
        aside={
          <div className="flex items-center gap-2">
            {files.length > 1 ? (
              <Button variant="ghost" size="sm" onClick={downloadAll} loading={downloadingAll} className="gap-1.5">
                <DownloadSimple size={14} weight="bold" />
                <span className="hidden sm:inline">Download All</span>
              </Button>
            ) : null}
            {canEdit ? (
              <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5">
                <Plus size={14} weight="bold" />
                Add a File
              </Button>
            ) : null}
          </div>
        }
      />

      {files.length === 0 ? (
        <p className="mx-5 mb-6 mt-4 rounded-[2px] border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-white/45 sm:mx-6">
          No files yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06]">
          {files.map((file) => {
            const meta = getFileMeta(file.fileName, file.fileType);
            return (
              <li key={file.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.04] font-mono text-[10px] font-semibold text-white/70">
                  {meta.ext}
                </span>
                <button
                  type="button"
                  onClick={() => setPreview(file)}
                  className="min-w-0 flex-1 text-left"
                  title={`Open ${file.fileName}`}
                >
                  <span className="block truncate text-sm text-white hover:underline hover:decoration-white/30 hover:underline-offset-4">
                    {file.fileName}
                  </span>
                  <span className="block text-xs text-white/45">
                    {(CATEGORY_LABEL[file.fileCategory] ?? "File") + " · Added " + formatDate(file.uploadedAt)}
                  </span>
                </button>
                <div className="flex shrink-0 items-center">
                  <button type="button" onClick={() => setPreview(file)} className={ICON_BUTTON} aria-label={`Preview ${file.fileName}`} title="Preview">
                    <Eye size={16} weight="fill" />
                  </button>
                  <button type="button" onClick={() => download(file)} className={ICON_BUTTON} aria-label={`Download ${file.fileName}`} title="Download">
                    <DownloadSimple size={16} weight="bold" />
                  </button>
                  {canEdit ? (
                    <button type="button" onClick={() => onRemove(file)} className={ICON_BUTTON} aria-label={`Remove ${file.fileName}`} title="Remove">
                      <Trash size={15} weight="fill" />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!canEdit ? (
        <p className="flex items-center gap-2 border-t border-white/[0.06] px-5 py-3 text-xs text-white/45 sm:px-6">
          <Lock size={13} weight="fill" className="shrink-0" />
          Files are locked once your agreement is signed. Need to change one? Message your team.
        </p>
      ) : null}

      {preview ? (
        <DocumentViewerLightbox file={preview} files={files} onNavigateFile={setPreview} onClose={() => setPreview(null)} />
      ) : null}
    </Panel>
  );
}

// ─── Side column ─────────────────────────────────────────────────────────────

function DetailsPanel({ project: p, stage }: { project: ProjectDetailItem; stage: ClientStage }) {
  const due = useDueText(p.deadlineRequested, stage, p.deliveredAt);
  const pkg = clientPackageName(p.packageName);
  const school = p.client.clientProfile;
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: stage.tone === "done" ? "Delivered" : "Due", value: due.replace(/^(Due|Delivered) /, "") },
    { label: "Sent", value: formatDate(p.createdAt) },
    { label: "Last update", value: formatDate(p.updatedAt) },
  ];
  if (pkg) rows.push({ label: "Package", value: pkg });
  rows.push({
    label: "School",
    value: school?.institutionSchool ? (
      <>
        {school.institutionSchool}
        {school.academicProgram ? <span className="block text-white/50">{school.academicProgram}</span> : null}
      </>
    ) : (
      <Link href="/dashboard/client/profile" className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
        Add your school
      </Link>
    ),
  });

  return (
    <Panel aria-label="Details">
      <PanelHeader title="Details" />
      <dl className="mt-3 flex flex-col px-5 pb-5 sm:px-6">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-4 border-b border-white/[0.05] py-2.5 last:border-b-0">
            <dt className="shrink-0 text-[13px] text-white/45">{r.label}</dt>
            <dd className="min-w-0 text-right text-[13px] text-white/85">{r.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function PaymentPanel({ project: p, stage }: { project: ProjectDetailItem; stage: ClientStage }) {
  const f = p.financialSummary;
  if (!f || f.totalAmount <= 0) return null;
  const href = `/dashboard/client/projects/${p.id}${stage.step >= 2 ? "/payment" : "/quote"}`;
  return (
    <Panel aria-label="Payment">
      <PanelHeader
        title="Payment"
        aside={
          <Link href={href} className="text-xs text-white/55 underline-offset-4 hover:text-white hover:underline">
            {stage.step >= 2 ? "Details" : "See price"}
          </Link>
        }
      />
      <div className="px-5 pb-5 pt-3 sm:px-6">
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] text-white/45">{f.isFullyPaid ? "Paid in full" : "Paid so far"}</span>
          <span className="font-mono text-sm text-white">
            <Peso />
            {money(f.verifiedPaid)}
            <span className="text-white/40">
              {" of "}
              <Peso />
              {money(f.totalAmount)}
            </span>
          </span>
        </p>
        <Meter value={f.verifiedPaid} max={f.totalAmount} label="Paid so far" className="mt-2" />
        {!f.isFullyPaid ? (
          <dl className="mt-3 flex flex-col gap-1.5 text-[13px]">
            {!f.isDownpaymentCleared && f.downpaymentRequired > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-white/45">Deposit</dt>
                <dd className="font-mono text-white/80">
                  <Peso />
                  {money(f.downpaymentRequired)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-white/45">Left to pay</dt>
              <dd className="font-mono text-white/80">
                <Peso />
                {money(f.remainingBalance)}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </Panel>
  );
}

function HelpPanel({ project: p, stage, onAskToDelete }: { project: ProjectDetailItem; stage: ClientStage; onAskToDelete: () => void }) {
  const base = `/dashboard/client/projects/${p.id}`;
  return (
    <Panel aria-label="Need help">
      <PanelHeader title="Need help?" subtitle="Our team replies in your study's messages." />
      <div className="flex flex-col gap-2 px-5 pb-5 pt-4 sm:px-6">
        <Button asChild variant="outline" size="sm" className="w-full justify-center gap-1.5">
          <Link href={`${base}/messages`}>
            <ChatCenteredText size={14} weight="fill" />
            Message Your Team
          </Link>
        </Button>
        {stage.step >= 4 ? (
          <Button asChild variant="ghost" size="sm" className="w-full justify-center">
            <Link href="/dashboard/client/disputes">Revisions &amp; Help</Link>
          </Button>
        ) : null}
        <button
          type="button"
          onClick={onAskToDelete}
          className="mt-1 inline-flex items-center justify-center gap-1.5 self-center text-xs text-white/40 transition-colors hover:text-white"
        >
          <Trash size={12} weight="fill" />
          Ask to delete this study
        </button>
      </div>
    </Panel>
  );
}

// ─── Add a file ──────────────────────────────────────────────────────────────

function UploadModal({
  project,
  onClose,
  onAdded,
}: {
  project: ProjectDetailItem;
  onClose: () => void;
  onAdded: (file: ProjectFileItem) => void;
}) {
  const [typeId, setTypeId] = useState(FILE_TYPES[0]!.id);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isUploading, startUpload] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const type = FILE_TYPES.find((t) => t.id === typeId) ?? FILE_TYPES[0]!;

  const check = (f: File, t = type): string | null => {
    if (f.size > MAX_BYTES) return `${f.name} is ${formatSize(f.size)}. Files can be up to 15 MB.`;
    const name = f.name.toLowerCase();
    if (!t.extensions.some((ext) => name.endsWith(ext))) return `${f.name} isn't accepted for ${t.label}. Use ${t.formats}.`;
    return null;
  };

  const pick = (f: File) => {
    const problem = check(f);
    setError(problem);
    setFile(problem ? null : f);
  };

  const chooseType = (id: string) => {
    setTypeId(id);
    const t = FILE_TYPES.find((x) => x.id === id);
    if (file && t) {
      const problem = check(file, t);
      if (problem) {
        setFile(null);
        setError(problem);
      } else setError(null);
    }
  };

  const upload = () => {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setError(null);
    startUpload(async () => {
      const up = await uploadFileToR2(file, type.category, project.intakeId);
      if (!up.success || !up.data) {
        setError(up.error?.message || "The upload didn't finish. Please try again.");
        return;
      }
      const res = await addProjectFile(project.id, {
        fileName: file.name,
        filePath: up.data.publicUrl,
        fileType: file.type || "application/octet-stream",
        fileCategory: type.category,
      });
      if (res.success) onAdded(res.data);
      else setError(res.error.message);
    });
  };

  return (
    <Modal
      open
      onClose={() => {
        if (!isUploading) onClose();
      }}
      title="Add a file"
      description="Pick what it is, then choose the file. Up to 15 MB."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={upload} loading={isUploading} disabled={!file || isUploading}>
            {isUploading ? "Uploading..." : "Add File"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 font-sans">
        <fieldset>
          <legend className="text-xs font-medium text-white/55">What is it?</legend>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FILE_TYPES.map((t) => {
              const on = t.id === typeId;
              return (
                <label
                  key={t.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-[2px] border px-3.5 py-3 transition-colors ${
                    on ? "border-[#CC6600]/70 bg-[#CC6600]/[0.06]" : "border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="file-type"
                    value={t.id}
                    checked={on}
                    onChange={() => chooseType(t.id)}
                    className="mt-0.5 accent-[#CC6600]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-white">{t.label}</span>
                    <span className="block text-xs text-white/50">{t.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <p className="text-xs font-medium text-white/55">Your file</p>
          {file ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-white/10 bg-white/[0.02] p-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <Check size={15} weight="bold" className="shrink-0 text-[#CC6600]" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-white" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-white/45">{isUploading ? "Uploading..." : formatSize(file.size)}</span>
                </span>
              </span>
              {!isUploading ? (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs text-white/55 underline-offset-4 hover:text-white hover:underline"
                >
                  Choose another
                </button>
              ) : null}
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!dragging) setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) pick(f);
              }}
              className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[2px] border border-dashed px-4 py-8 text-center transition-colors ${
                dragging ? "border-[#CC6600] bg-[#CC6600]/[0.06]" : "border-white/15 hover:border-white/35 hover:bg-white/[0.02]"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept={type.extensions.join(",")}
                className="hidden"
                aria-label={`Choose your ${type.label}`}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pick(f);
                  e.target.value = "";
                }}
              />
              <CloudArrowUp size={22} weight="fill" className="text-white/40" />
              <span className="text-[13px] text-white/80">
                <span className="font-medium text-white underline underline-offset-4">Choose a file</span> or drop it here
              </span>
              <span className="text-xs text-white/40">{type.formats}</span>
            </div>
          )}
          {error ? (
            <p role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] text-[#FFA040]">
              <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

