"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CaretLeft,
  CaretRight,
  DownloadSimple,
  FilePdf,
  FileDoc,
  FileCsv,
  FileXls,
  FileText,
  Check,
  Printer,
} from "@phosphor-icons/react";
import {
  getFileMeta,
  formatFileCategory,
  resolveStoredFileUrl,
  triggerFileDownload,
} from "@/lib/file-utils";
import type { ProjectFileItem } from "@/features/projects/schemas";
import { FileContentPreview } from "./FileContentPreview";

export interface DocumentViewerLightboxProps {
  file: ProjectFileItem | null;
  files?: ProjectFileItem[];
  onNavigateFile?: (file: ProjectFileItem) => void;
  onClose: () => void;
}

export function DocumentViewerLightbox({
  file,
  files,
  onNavigateFile,
  onClose,
}: DocumentViewerLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  const currentFileIndex = useMemo(() => {
    if (!file || !files || files.length === 0) return -1;
    return files.findIndex((f) => f.id === file.id);
  }, [file, files]);

  const hasMultipleFiles = Boolean(files && files.length > 1 && currentFileIndex !== -1);

  const handlePrevDocument = useCallback(() => {
    if (!hasMultipleFiles || !files || !onNavigateFile) return;
    const prevIndex = currentFileIndex > 0 ? currentFileIndex - 1 : files.length - 1;
    onNavigateFile(files[prevIndex]!);
  }, [hasMultipleFiles, files, onNavigateFile, currentFileIndex]);

  const handleNextDocument = useCallback(() => {
    if (!hasMultipleFiles || !files || !onNavigateFile) return;
    const nextIndex = currentFileIndex < files.length - 1 ? currentFileIndex + 1 : 0;
    onNavigateFile(files[nextIndex]!);
  }, [hasMultipleFiles, files, onNavigateFile, currentFileIndex]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Esc closes; the arrow keys or [ and ] move between this study's documents.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (hasMultipleFiles && (e.key === "[" || e.key === "ArrowLeft")) {
        e.preventDefault();
        handlePrevDocument();
      } else if (hasMultipleFiles && (e.key === "]" || e.key === "ArrowRight")) {
        e.preventDefault();
        handleNextDocument();
      }
    },
    [onClose, hasMultipleFiles, handlePrevDocument, handleNextDocument]
  );

  useEffect(() => {
    if (file) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [file, handleKeyDown]);

  if (!mounted || !file) return null;

  const meta = getFileMeta(file.fileName, file.fileType);
  const category = formatFileCategory(file.fileCategory);
  // Loaded through the signed-in preview route, never the storage bucket's public link.
  const realFileUrl = resolveStoredFileUrl(file.filePath);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await triggerFileDownload(file.filePath, file.fileName);
      setIsDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch {
      setIsDownloading(false);
    }
  };

  const content = (
    <div className="fixed inset-0 z-50 bg-[#000814]/96 backdrop-blur-md flex flex-col select-none text-white animate-in fade-in duration-200">
      {/* ── Top Precision Document Toolbar ── */}
      <header
        className="h-16 flex-shrink-0 bg-[#050513] border-b border-white/10 flex items-center justify-between gap-4 z-40 px-6 sm:px-8"
        style={{ paddingLeft: "1.5rem", paddingRight: "1.5rem" }}
      >
        {/* Left: Document Icon + Title */}
        <div className="flex items-center gap-3.5 min-w-0 max-w-[45%]">
          <div className="h-9 w-9 rounded-[2px] bg-[#0F0F1D] border border-white/15 flex items-center justify-center flex-shrink-0">
            {meta.iconType === "pdf" ? (
              <FilePdf size={20} weight="fill" className="text-rose-400" />
            ) : meta.iconType === "doc" ? (
              <FileDoc size={20} weight="fill" className="text-sky-400" />
            ) : meta.iconType === "data" ? (
              <FileCsv size={20} weight="fill" className="text-emerald-400" />
            ) : meta.iconType === "sheet" ? (
              <FileXls size={20} weight="fill" className="text-emerald-400" />
            ) : (
              <FileText size={20} weight="fill" className="text-white/70" />
            )}
          </div>
          <div className="flex flex-col min-w-0 gap-0.5">
            <span className="font-sans font-semibold text-sm text-white truncate" title={file.fileName}>
              {file.fileName}
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-white/50">
              <span className="text-sky-300 font-semibold">{category.label}</span>
              {hasMultipleFiles && (
                <>
                  <span>·</span>
                  <span className="text-[#FFA040] font-semibold">
                    Doc {currentFileIndex + 1} of {files!.length}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Document Stepper Buttons */}
          {hasMultipleFiles && (
            <div className="hidden sm:flex items-center gap-1 bg-[#0A0A18] border border-white/15 p-0.5 rounded-[2px] ml-1 shrink-0">
              <button
                type="button"
                onClick={handlePrevDocument}
                className="p-1 rounded-[2px] text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-[0.97]"
                title="Previous Document (← or [)"
                aria-label="Previous Document"
              >
                <CaretLeft size={15} weight="bold" />
              </button>
              <span className="text-[10px] font-mono text-white/40 px-1">
                {currentFileIndex + 1}/{files!.length}
              </span>
              <button
                type="button"
                onClick={handleNextDocument}
                className="p-1 rounded-[2px] text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-[0.97]"
                title="Next Document (→ or ])"
                aria-label="Next Document"
              >
                <CaretRight size={15} weight="bold" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Download & Close Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-[2px] text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 hover:border-white/30 transition-colors cursor-pointer"
            title="Print Document"
          >
            <Printer size={16} weight="fill" />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[2px] font-sans text-xs font-semibold transition-all duration-150 cursor-pointer min-h-[36px] select-none ${
              downloadSuccess
                ? "bg-emerald-600/25 text-emerald-300 border border-emerald-500 shadow-sm"
                : "bg-[#CC6600] hover:bg-[#E67300] active:bg-[#B35900] text-white border border-[#E67300]/40 shadow-sm"
            }`}
          >
            {downloadSuccess ? (
              <>
                <Check size={15} weight="bold" className="text-emerald-400" />
                <span>Saved</span>
              </>
            ) : isDownloading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <DownloadSimple size={15} weight="bold" />
                <span>Download</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-[2px] text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 hover:border-white/30 transition-colors cursor-pointer select-none"
            title="Close Preview (Esc)"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
      </header>

      {/* ── Main Viewport Stage ── */}
      <main
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative bg-[#000814] px-4 sm:px-8 py-8 sm:py-12 flex flex-col items-center"
      >
        <div className="my-auto flex w-full flex-col items-center">
          <FileContentPreview key={file.id} fileName={file.fileName} url={realFileUrl} onDownload={handleDownload} />
        </div>
      </main>
    </div>
  );

  return createPortal(content, document.body);
}
