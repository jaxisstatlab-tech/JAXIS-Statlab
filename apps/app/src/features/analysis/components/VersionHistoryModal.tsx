"use client";

import React, { useEffect, useState } from "react";
import { Modal, Button, LoadingState } from "@repo/ui";
import { DownloadSimple } from "@phosphor-icons/react";
import { getAnalysisFileVersionHistory, getAnalysisFileDownloadUrl } from "../actions";
import { ANALYSIS_CATEGORY_METADATA } from "@/lib/analysis-rules";
import type { AnalysisFileDTO } from "../schemas";
import { AnalysisFileCategory } from "@prisma/client";

// Every version of one kind of analysis file, newest first, each with Download.

interface VersionHistoryModalProps {
  projectId: string;
  fileCategory: AnalysisFileCategory | null;
  onClose: () => void;
}

const when = (iso: string) => new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const size = (b?: number | null) => (b ? (b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`) : null);

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ projectId, fileCategory, onClose }) => {
  const [history, setHistory] = useState<AnalysisFileDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!fileCategory) return;
    setLoading(true);
    setError(null);
    getAnalysisFileVersionHistory(projectId, fileCategory)
      .then((res) => {
        if (res.success) setHistory(res.data ?? []);
        else setError(res.error.message || "The versions didn't load.");
      })
      .catch(() => setError("The versions didn't load. Check your connection."))
      .finally(() => setLoading(false));
  }, [projectId, fileCategory]);

  const download = async (id: string, name: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await getAnalysisFileDownloadUrl(id);
      if (!res.success) return setError(res.error.message || "Couldn't download it.");
      const link = document.createElement("a");
      link.href = res.data;
      link.download = name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      setBusyId(null);
    }
  };

  if (!fileCategory) return null;
  const label = ANALYSIS_CATEGORY_METADATA[fileCategory]?.label || fileCategory;

  return (
    <Modal
      open
      onClose={onClose}
      title={`${label}: all versions`}
      description="Newest first. The current one is what your reviewer checks."
      size="lg"
      footer={
        <div className="flex w-full justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 font-sans">
        {error ? <p className="text-[13px] text-red-300">{error}</p> : null}
        {loading ? (
          <div className="py-10">
            <LoadingState variant="inline" label="Loading versions..." />
          </div>
        ) : history.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-white/50">No versions yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06] rounded-[2px] border border-white/[0.08]">
            {history.map((v) => (
              <li key={v.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-white/70">v{v.version}</span>
                    {v.isCurrent ? (
                      <span className="rounded-[2px] border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-white/80">Current</span>
                    ) : null}
                    <span className="min-w-0 truncate text-sm text-white" title={v.fileName}>
                      {v.fileName}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-white/45">
                    {when(v.uploadedAt)} · {v.statisticianName}
                    {size(v.fileSize) ? ` · ${size(v.fileSize)}` : ""}
                  </p>
                  {v.notes ? <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{v.notes}</p> : null}
                </div>
                <Button variant="outline" size="sm" onClick={() => download(v.id, v.fileName)} loading={busyId === v.id} className="shrink-0 gap-1.5 active:scale-[0.97]">
                  {busyId === v.id ? null : <DownloadSimple size={13} weight="fill" />}
                  Download
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};
