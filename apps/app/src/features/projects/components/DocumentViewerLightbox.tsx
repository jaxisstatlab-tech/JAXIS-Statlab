"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { CaretLeft, CaretRight, Check, DownloadSimple, X } from "@phosphor-icons/react";
import { getFileMeta, resolveStoredFileUrl, triggerFileDownload } from "@/lib/file-utils";
import type { ProjectFileItem } from "@/features/projects/schemas";
import { FileContentPreview } from "./FileContentPreview";

// Full-screen viewer for a study's files: the file in the middle, previous / next on the sides (or arrow keys),
// the other files in a strip at the bottom, Download and Close at the top. Esc closes.

const KIND: Record<string, string> = {
  RESEARCH_DOCUMENT: "Paper or manuscript",
  DATASET: "Data",
  QUESTIONNAIRE: "Questionnaire",
  PAYMENT_PROOF: "Payment proof",
  ANALYSIS_OUTPUT: "Analysis output",
  DELIVERABLE: "Final file",
  DISPUTE_EVIDENCE: "Claim evidence",
};

const ext = (name: string) => (name.split(".").pop() ?? "").slice(0, 4).toUpperCase();

export interface DocumentViewerLightboxProps {
  file: ProjectFileItem | null;
  files?: ProjectFileItem[];
  onNavigateFile?: (file: ProjectFileItem) => void;
  onClose: () => void;
}

export function DocumentViewerLightbox({ file, files, onNavigateFile, onClose }: DocumentViewerLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const index = useMemo(() => (file && files?.length ? files.findIndex((f) => f.id === file.id) : -1), [file, files]);
  const many = Boolean(files && files.length > 1 && index !== -1 && onNavigateFile);

  const prev = useCallback(() => {
    if (!many) return;
    onNavigateFile!(files![index > 0 ? index - 1 : files!.length - 1]!);
  }, [many, files, index, onNavigateFile]);
  const next = useCallback(() => {
    if (!many) return;
    onNavigateFile!(files![index < files!.length - 1 ? index + 1 : 0]!);
  }, [many, files, index, onNavigateFile]);

  useEffect(() => setMounted(true), []);
  useEffect(() => setSaved(false), [file?.id]);

  // Esc closes; the arrow keys or [ and ] move between the files.
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (many && (e.key === "[" || e.key === "ArrowLeft")) {
        e.preventDefault();
        prev();
      } else if (many && (e.key === "]" || e.key === "ArrowRight")) {
        e.preventDefault();
        next();
      }
    },
    [onClose, many, prev, next]
  );

  useEffect(() => {
    if (!file) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [file, onKey]);

  if (!mounted || !file) return null;

  const meta = getFileMeta(file.fileName, file.fileType);
  // Loaded through the signed-in preview route, never the storage bucket's public link.
  const url = resolveStoredFileUrl(file.filePath);

  const download = async () => {
    setBusy(true);
    try {
      await triggerFileDownload(file.filePath, file.fileName);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  const arrow = "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[2px] border border-white/10 bg-[#0A0A18]/90 text-white/70 transition-colors hover:border-white/25 hover:text-white active:scale-95 md:flex";

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${file.fileName}`}
      className="fixed inset-0 z-[10000] flex flex-col bg-[#010114] font-sans text-white animate-in fade-in duration-150"
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.08] bg-[#0A0A18] px-4 sm:h-16 sm:px-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.04] font-mono text-[10px] text-white/70">
          {ext(file.fileName) || meta.ext}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white" title={file.fileName}>
            {file.fileName}
          </p>
          <p className="truncate text-[12px] text-white/45">
            {KIND[file.fileCategory] ?? meta.friendlyType}
            {many ? ` · ${index + 1} of ${files!.length}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[2px] bg-[#CC6600] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[#E67300] active:scale-[0.97] disabled:opacity-70 sm:px-4"
        >
          {saved ? <Check size={14} weight="bold" /> : <DownloadSimple size={14} weight="bold" />}
          <span className="hidden sm:inline">{saved ? "Downloading" : busy ? "Starting…" : "Download"}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          title="Close (Esc)"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-white/10 text-white/70 transition-colors hover:border-white/25 hover:text-white"
        >
          <X size={17} weight="bold" />
        </button>
      </header>

      <main className="relative flex min-h-0 flex-1">
        {many ? (
          <button type="button" onClick={prev} aria-label="Previous file" title="Previous (←)" className={`${arrow} left-4`}>
            <CaretLeft size={18} weight="bold" />
          </button>
        ) : null}
        <div className="flex min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-16 sm:py-8">
          <div className="m-auto flex w-full flex-col items-center">
            <FileContentPreview key={file.id} fileName={file.fileName} url={url} onDownload={download} />
          </div>
        </div>
        {many ? (
          <button type="button" onClick={next} aria-label="Next file" title="Next (→)" className={`${arrow} right-4`}>
            <CaretRight size={18} weight="bold" />
          </button>
        ) : null}
      </main>

      {many ? (
        <footer className="shrink-0 border-t border-white/[0.08] bg-[#0A0A18]">
          <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
            {files!.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onNavigateFile!(f)}
                aria-current={i === index ? "true" : undefined}
                className={`flex max-w-[220px] shrink-0 items-center gap-2 rounded-[2px] border px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                  i === index ? "border-[#CC6600]/60 bg-white/[0.06] text-white" : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
                }`}
              >
                <span className="font-mono text-[10px] text-white/45">{ext(f.fileName)}</span>
                <span className="truncate">{f.fileName}</span>
              </button>
            ))}
            <span className="ml-auto hidden shrink-0 pl-4 text-[11px] text-white/35 lg:inline">← → to move · Esc to close</span>
          </div>
        </footer>
      ) : null}
    </div>
  );

  return createPortal(content, document.body);
}
