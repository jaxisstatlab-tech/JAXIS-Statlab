"use client";

import React, { useState } from "react";
import { Button, Toast } from "@repo/ui";
import { DownloadSimple, Eye, Trash } from "@phosphor-icons/react";
import { getFileMeta, triggerFileDownload } from "@/lib/file-utils";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import type { ProjectFileItem } from "@/features/projects/schemas";
import dynamic from "next/dynamic";

const DocumentViewerLightbox = dynamic(
  () => import("./DocumentViewerLightbox").then((m) => m.DocumentViewerLightbox),
  { ssr: false }
);

// The files the client added to a study: preview (with arrow keys between files), download one, or download all.

const KIND: Record<string, string> = {
  RESEARCH_DOCUMENT: "Paper or manuscript",
  DATASET: "Data",
  QUESTIONNAIRE: "Questionnaire",
  PAYMENT_PROOF: "Payment proof",
  ANALYSIS_OUTPUT: "Analysis output",
  DELIVERABLE: "Final file",
  DISPUTE_EVIDENCE: "Claim evidence",
};

const shortDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });

export interface ProjectFilesCardProps {
  files: ProjectFileItem[];
  studyId?: string;
  className?: string;
  canDelete?: boolean;
  onDeleteFile?: (file: ProjectFileItem) => void;
}

export function ProjectFilesCard({ files, className = "", canDelete = false, onDeleteFile }: ProjectFilesCardProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [allBusy, setAllBusy] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFileItem | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "danger" } | null>(null);

  const download = async (file: ProjectFileItem) => {
    setBusyId(file.id);
    try {
      await triggerFileDownload(file.filePath, file.fileName);
    } catch {
      setToast({ message: "Couldn't download", description: "Check your connection and try again.", variant: "danger" });
    } finally {
      setBusyId(null);
    }
  };

  const downloadAll = async () => {
    if (files.length === 0 || allBusy) return;
    setAllBusy(true);
    try {
      for (const file of files) {
        await triggerFileDownload(file.filePath, file.fileName);
        // Browsers block several downloads fired at once.
        await new Promise((r) => setTimeout(r, 500));
      }
      setToast({ message: "Downloading", description: `${files.length} files are on their way to your device.`, variant: "success" });
    } catch {
      setToast({ message: "Some files didn't download", description: "Try them one at a time.", variant: "danger" });
    } finally {
      setAllBusy(false);
    }
  };

  return (
    <Panel className={className}>
      <PanelHeader
        title="Client's files"
        count={files.length}
        subtitle="What the client uploaded with the request. Click a file to preview it."
        aside={
          files.length > 1 ? (
            <Button variant="outline" size="sm" onClick={downloadAll} loading={allBusy} className="gap-1.5 active:scale-[0.97]">
              {allBusy ? null : <DownloadSimple size={13} weight="fill" />}
              Download All
            </Button>
          ) : null
        }
      />
      {files.length === 0 ? (
        <PanelBody>
          <p className="text-[13px] text-white/45">The client didn&apos;t add any files.</p>
        </PanelBody>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06] font-sans">
          {files.map((file) => {
            const meta = getFileMeta(file.fileName, file.fileType);
            return (
              <li key={file.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.04] font-mono text-[10px] uppercase text-white/60">
                  {meta.ext}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  className="min-w-0 flex-1 text-left"
                  aria-label={`Preview ${file.fileName}`}
                >
                  <span className="block truncate text-[13px] text-white hover:underline hover:underline-offset-2" title={file.fileName}>
                    {file.fileName}
                  </span>
                  <span className="block truncate text-[12px] text-white/45">
                    {KIND[file.fileCategory] ?? meta.friendlyType} · {shortDate(file.uploadedAt)}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton label={`Preview ${file.fileName}`} onClick={() => setPreviewFile(file)}>
                    <Eye size={15} weight="fill" />
                  </IconButton>
                  <IconButton label={`Download ${file.fileName}`} onClick={() => download(file)} disabled={busyId === file.id}>
                    <DownloadSimple size={15} weight="fill" className={busyId === file.id ? "animate-pulse" : ""} />
                  </IconButton>
                  {canDelete && onDeleteFile ? (
                    <IconButton label={`Remove ${file.fileName}`} onClick={() => onDeleteFile(file)} danger>
                      <Trash size={15} weight="fill" />
                    </IconButton>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {previewFile ? (
        <DocumentViewerLightbox
          file={previewFile}
          files={files}
          onNavigateFile={(file) => setPreviewFile(file)}
          onClose={() => setPreviewFile(null)}
        />
      ) : null}
      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </Panel>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-[2px] p-2 transition-colors active:scale-95 disabled:opacity-50 ${
        danger ? "text-white/40 hover:bg-red-500/10 hover:text-red-300" : "text-white/50 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
