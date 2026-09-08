"use client";

import * as React from "react";
import {
  CloudArrowUp,
  Check,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { cn } from "./utils";
import { FileTypeIcon } from "./FileTypeIcon";

export interface FileDropzoneProps {
  title?: string;
  description?: string;
  categoryBadge?: string;
  hint?: string;
  accept?: string;
  maxSizeMB?: number;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadedFile?: {
    name: string;
    size?: number;
    formattedSize?: string;
    previewUrl?: string | null;
  } | null;
  onFileSelect?: (file: File) => void;
  onRemove?: () => void;
  error?: string | null;
  disabled?: boolean;
  className?: string;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileDropzone({
  title,
  description,
  categoryBadge,
  hint,
  accept,
  maxSizeMB = 15,
  isUploading = false,
  uploadProgress = 0,
  uploadedFile,
  onFileSelect,
  onRemove,
  error,
  disabled = false,
  className = "",
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isUploading) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect?.(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect?.(file);
    }
    // reset value so the same file can be re-selected if needed
    e.target.value = "";
  };

  const formattedSize = uploadedFile?.formattedSize || formatBytes(uploadedFile?.size);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[3px] border border-white/10 bg-[#01142B]/70 p-4 sm:p-5 transition-colors",
        isDragOver && "border-[#CC6600] bg-[#CC6600]/5",
        error && "border-[#EF4444]/60 bg-[#EF4444]/5",
        className
      )}
    >
      {/* Top Header Row */}
      {(title || categoryBadge) && (
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            {title && (
              <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                {title}
              </h4>
            )}
            {description && (
              <p className="text-xs text-white/50 leading-relaxed font-sans">
                {description}
              </p>
            )}
          </div>
          {categoryBadge && (
            <span className="font-mono text-[0.625rem] uppercase font-semibold px-2 py-0.5 rounded-[2px] bg-white/10 text-white/80 border border-white/15 shrink-0">
              {categoryBadge}
            </span>
          )}
        </div>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* ── State 1: Upload in Progress ── */}
      {isUploading ? (
        <div className="p-4 rounded-[2px] bg-[#010D1F] border border-[#CC6600]/60 flex flex-col justify-between min-h-[110px] shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#CC6600] shrink-0 animate-pulse">
                <CloudArrowUp size={18} weight="fill" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-xs font-bold text-white truncate">
                  {uploadedFile?.name ?? "Uploading document..."}
                </span>
                <span className="text-[0.625rem] font-mono text-white/50">
                  {formattedSize}
                </span>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-[#CC6600] px-2 py-0.5 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 shrink-0">
              {uploadProgress}%
            </span>
          </div>

          <div className="flex flex-col gap-2 mt-auto pt-3">
            <div className="w-full bg-[#000D1A] h-2 rounded-[1px] overflow-hidden border border-white/10 p-[1px]">
              <div
                className="bg-[#CC6600] h-full rounded-[1px] transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#CC6600] text-[0.6875rem] flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#CC6600] animate-ping" />
                Uploading file...
              </span>
              <span className="text-white/40 text-[0.6875rem]">Please wait</span>
            </div>
          </div>
        </div>
      ) : uploadedFile ? (
        /* ── State 2: Uploaded File Active ── */
        <div className="p-4 rounded-[2px] bg-[#010D1F] border border-[#10B981]/40 flex flex-col gap-3 min-h-[110px] shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-[2px] bg-white/[0.04] border border-white/15 flex items-center justify-center shrink-0">
                <FileTypeIcon filename={uploadedFile.name} size={18} />
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className="font-mono text-xs font-bold text-white truncate"
                  title={uploadedFile.name}
                >
                  {uploadedFile.name}
                </span>
                <span className="text-[0.625rem] font-mono text-white/50">
                  {formattedSize}
                </span>
              </div>
            </div>
            <span className="font-mono text-[0.6875rem] font-semibold text-[#10B981] px-2 py-0.5 rounded-[2px] bg-[#10B981]/15 border border-[#10B981]/30 flex items-center gap-1 shrink-0">
              <Check size={12} weight="bold" />
              Attached
            </span>
          </div>

          {/* Photo / Image Preview inside Dropzone */}
          {uploadedFile.previewUrl && (
            <div className="w-full max-h-60 rounded-[2px] overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center p-2.5 my-1">
              <img
                src={uploadedFile.previewUrl}
                alt={uploadedFile.name}
                className="max-h-52 w-auto object-contain rounded-[2px] shadow-md border border-white/10"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2.5 border-t border-white/5 mt-auto">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-[0.6875rem] font-mono font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              Change file
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="text-[0.6875rem] font-mono font-medium text-red-400/80 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <X size={12} weight="bold" />
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ── State 3: Empty Dropzone ── */
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-[2px] border border-dashed border-white/20 p-6 text-center transition-colors cursor-pointer select-none",
            "hover:border-white/40 hover:bg-white/[0.02]",
            isDragOver && "border-[#CC6600] bg-[#CC6600]/10",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          <div className="p-2.5 rounded-[2px] bg-white/[0.04] border border-white/10 text-white/60">
            <CloudArrowUp size={22} weight="fill" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-semibold text-white">
              Click to browse or drag and drop
            </p>
            <p className="font-mono text-[0.6875rem] text-white/40">
              {hint ?? `Supported formats (${accept ?? "All files"}), up to ${maxSizeMB}MB`}
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 font-sans">
          <WarningCircle size={14} weight="fill" className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
