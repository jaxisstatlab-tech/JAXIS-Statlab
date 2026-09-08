"use client";

import * as React from "react";
import {
  FilePdf,
  FileDoc,
  FileXls,
  FileCsv,
  FileArchive,
  FileCode,
  Image as ImageIcon,
  FileText,
  Database,
} from "@phosphor-icons/react";
import { cn } from "./utils";

export type FileTypeCategory =
  | "pdf"
  | "doc"
  | "sheet"
  | "csv"
  | "data"
  | "code"
  | "archive"
  | "image"
  | "default";

export interface FileTypeIconProps {
  type?: FileTypeCategory | string;
  filename?: string;
  size?: number;
  stroke?: number;
  className?: string;
}

export function resolveFileType(filename?: string, type?: string): FileTypeCategory {
  if (type) {
    const t = type.toLowerCase();
    if (t === "pdf") return "pdf";
    if (["doc", "docx", "word"].includes(t)) return "doc";
    if (["sheet", "xls", "xlsx", "excel"].includes(t)) return "sheet";
    if (t === "csv") return "csv";
    if (["data", "sav", "dta", "spss"].includes(t)) return "data";
    if (["code", "ts", "tsx", "js", "py", "r", "sql"].includes(t)) return "code";
    if (["archive", "zip", "rar", "tar", "7z"].includes(t)) return "archive";
    if (["image", "png", "jpg", "jpeg", "webp", "svg"].includes(t)) return "image";
  }

  if (filename) {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf") return "pdf";
    if (["doc", "docx"].includes(ext)) return "doc";
    if (["xls", "xlsx"].includes(ext)) return "sheet";
    if (ext === "csv") return "csv";
    if (["sav", "dta", "dat", "matrix"].includes(ext)) return "data";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
    if (["png", "jpg", "jpeg", "webp", "svg"].includes(ext)) return "image";
    if (["ts", "tsx", "js", "jsx", "py", "r", "sql"].includes(ext)) return "code";
  }

  return "default";
}

export function FileTypeIcon({
  type,
  filename,
  size = 20,
  className = "",
}: FileTypeIconProps) {
  const resolved = resolveFileType(filename, type);

  switch (resolved) {
    case "pdf":
      return (
        <FilePdf
          size={size}
          weight="fill"
          className={cn("text-red-400 shrink-0", className)}
        />
      );
    case "doc":
      return (
        <FileDoc
          size={size}
          weight="fill"
          className={cn("text-sky-400 shrink-0", className)}
        />
      );
    case "sheet":
      return (
        <FileXls
          size={size}
          weight="fill"
          className={cn("text-emerald-400 shrink-0", className)}
        />
      );
    case "csv":
      return (
        <FileCsv
          size={size}
          weight="fill"
          className={cn("text-teal-400 shrink-0", className)}
        />
      );
    case "data":
      return (
        <Database
          size={size}
          weight="fill"
          className={cn("text-[#CC6600] shrink-0", className)}
        />
      );
    case "code":
      return (
        <FileCode
          size={size}
          weight="fill"
          className={cn("text-purple-400 shrink-0", className)}
        />
      );
    case "archive":
      return (
        <FileArchive
          size={size}
          weight="fill"
          className={cn("text-amber-400 shrink-0", className)}
        />
      );
    case "image":
      return (
        <ImageIcon
          size={size}
          weight="fill"
          className={cn("text-teal-400 shrink-0", className)}
        />
      );
    default:
      return (
        <FileText
          size={size}
          weight="fill"
          className={cn("text-white/60 shrink-0", className)}
        />
      );
  }
}
