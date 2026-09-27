"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button, Badge, LoadingState } from "@repo/ui";
import {
  IconHistory,
  IconDownload,
  IconClock,
  IconUser,
  IconFileDescription,
} from "@tabler/icons-react";
import { getAnalysisFileVersionHistory, getAnalysisFileDownloadUrl } from "../actions";
import { ANALYSIS_CATEGORY_METADATA } from "@/lib/analysis-rules";
import type { AnalysisFileDTO } from "../schemas";
import { AnalysisFileCategory } from "@prisma/client";

interface VersionHistoryModalProps {
  projectId: string;
  fileCategory: AnalysisFileCategory | null;
  onClose: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  projectId,
  fileCategory,
  onClose,
}) => {
  const [history, setHistory] = useState<AnalysisFileDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!fileCategory) return;
    setIsLoading(true);
    getAnalysisFileVersionHistory(projectId, fileCategory)
      .then((res) => {
        if (res.success && res.data) {
          setHistory(res.data);
        }
      })
      .finally(() => setIsLoading(false));
  }, [projectId, fileCategory]);

  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloadingId(fileId);
    try {
      const res = await getAnalysisFileDownloadUrl(fileId);
      if (res.success && res.data) {
        const link = document.createElement("a");
        link.href = res.data;
        link.download = fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  if (!fileCategory) return null;

  const categoryMeta = ANALYSIS_CATEGORY_METADATA[fileCategory];

  return (
    <Modal
      open={Boolean(fileCategory)}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <IconHistory size={20} stroke={2} className="text-[#38BDF8]" />
          <span>Version Lineage History</span>
        </div>
      }
      description={`${categoryMeta?.label || fileCategory} • Permanent Version Ledger`}
      size="lg"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="secondary" size="sm" onClick={onClose} className="rounded-[2px] text-xs">
            Close History
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-sm font-sans">
        {isLoading ? (
          <div className="py-12">
            <LoadingState variant="inline" label="Loading version history..." />
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-white/50 text-xs border border-white/10 rounded-[2px] bg-[#0A0A18]">
            No version history recorded for this category.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((ver) => (
              <div
                key={ver.id}
                className={`p-4 rounded-[2px] border transition-colors flex flex-col gap-2.5 ${
                  ver.isCurrent
                    ? "bg-[#0F0F1D] border-emerald-500/40"
                    : "bg-[#0A0A18] border-white/10 opacity-85 hover:opacity-100"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Badge
                      variant={ver.isCurrent ? "emerald" : "default"}
                      className="font-mono text-xs font-bold px-2 py-0.5"
                    >
                      v{ver.version} {ver.isCurrent && "• CURRENT"}
                    </Badge>
                    <span className="font-semibold text-white truncate text-xs sm:text-sm">
                      {ver.fileName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {ver.fileSize && (
                      <span className="text-xs font-mono text-white/50">
                        {(ver.fileSize / 1024).toFixed(1)} KB
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(ver.id, ver.fileName)}
                      loading={downloadingId === ver.id}
                      className="rounded-[2px] text-xs px-2.5 py-1 gap-1.5 cursor-pointer"
                    >
                      <IconDownload size={13} stroke={2} />
                      <span>Download</span>
                    </Button>
                  </div>
                </div>

                {ver.notes && (
                  <div className="flex items-start gap-2 text-xs text-slate-300 bg-black/20 p-2.5 rounded-[2px] border border-white/5">
                    <IconFileDescription size={14} stroke={1.5} className="text-white/40 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{ver.notes}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 text-[0.688rem] text-white/40 font-mono pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <IconUser size={12} stroke={1.5} />
                    <span>Uploaded by {ver.statisticianName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IconClock size={12} stroke={1.5} />
                    <span>
                      {new Date(ver.uploadedAt).toLocaleString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
