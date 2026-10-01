import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAnalysisWorkbenchData } from "@/features/analysis/actions";
import { Card, Badge } from "@repo/ui";
import {
  IconDownload,
  IconClock,
  IconUser,
  IconAlertTriangle,
} from "@tabler/icons-react";
import type { RoleName } from "@prisma/client";
import { StudySection } from "@/features/projects/components/StudySection";
import { resolveStoredFileUrl } from "@/lib/file-utils";

interface AdminAnalysisPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminAnalysisPage({ params }: AdminAnalysisPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const callerRole = (session.user as { role?: RoleName }).role || "CLIENT";
  if (callerRole !== "ADMIN" && callerRole !== "CEO") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const res = await getAnalysisWorkbenchData(id);

  if (!res.success) {
    if (res.error.code === "PROJECT_NOT_FOUND") {
      notFound();
    }
    redirect(`/dashboard/admin/projects/${id}`);
  }

  const { analysisFiles, activeScopeCreep } = res.data;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      <StudySection
          title="Analysis files"
          description="Every version the statistical analyst uploaded, oldest first. Nothing here can be changed."
        />

      {/* Scope Creep Audit Log (if present) */}
      {activeScopeCreep && (
        <Card className="p-6 bg-amber-950/30 border border-amber-500/40 rounded-[2px] flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <IconAlertTriangle size={18} stroke={2} />
            <span>Active Scope Creep Flag</span>
          </div>
          <p className="text-xs text-white/90 leading-relaxed bg-black/25 p-3 rounded-[2px] border border-white/5">
            {activeScopeCreep.flagReason}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[0.688rem] font-mono text-white/50 pt-2 border-t border-white/5">
            <span>Flagged by {activeScopeCreep.flaggerName}</span>
            <span>{new Date(activeScopeCreep.flaggedAt).toLocaleString("en-PH")}</span>
          </div>
        </Card>
      )}

      {/* All Versions Ledger Table */}
      <Card className="p-6 sm:p-8 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Full Version Lineage Ledger ({analysisFiles.length})</h2>
            <p className="text-xs text-white/50 mt-0.5">
              Comprehensive audit trail of all historical statistical working files and scripts
            </p>
          </div>
        </div>

        {analysisFiles.length === 0 ? (
          <div className="p-12 text-center text-white/40 text-xs border border-dashed border-white/10 rounded-[2px]">
            No analysis working files recorded for this project yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {analysisFiles.map((file) => (
              <div
                key={file.id}
                className={`p-4 rounded-[2px] border transition-colors flex flex-col gap-2.5 ${
                  file.isCurrent
                    ? "bg-[#0F0F1D] border-emerald-500/40"
                    : "bg-[#0A0A18] border-white/10 opacity-75 hover:opacity-100"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      variant={file.isCurrent ? "emerald" : "default"}
                      className="font-mono text-xs font-bold px-2 py-0.5"
                    >
                      v{file.version} {file.isCurrent && "• CURRENT"}
                    </Badge>
                    <div className="min-w-0">
                      <span className="font-bold text-white text-sm block truncate">{file.fileName}</span>
                      <span className="text-[0.688rem] font-mono text-white/50">
                        {file.categoryLabel} &bull;{" "}
                        {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : "File"}
                      </span>
                    </div>
                  </div>

                  <a
                    href={resolveStoredFileUrl(file.filePath) ?? file.filePath}
                    download={file.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-[2px] transition-colors"
                  >
                    <IconDownload size={14} stroke={2} />
                    <span>Download</span>
                  </a>
                </div>

                {file.notes && (
                  <p className="text-xs text-slate-300 bg-black/20 p-2.5 rounded-[2px] border border-white/5 leading-relaxed">
                    {file.notes}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 text-[0.688rem] text-white/40 font-mono pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <IconUser size={12} stroke={1.5} />
                    <span>Uploaded by {file.statisticianName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IconClock size={12} stroke={1.5} />
                    <span>
                      {new Date(file.uploadedAt).toLocaleString("en-PH", {
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
      </Card>
    </div>
  );
}
