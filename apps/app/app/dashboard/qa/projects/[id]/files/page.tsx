import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getAnalysisWorkbenchData } from "@/features/analysis/actions";
import { Card, Button, Badge } from "@repo/ui";
import {
  IconDownload,
  IconFiles,
  IconUser,
  IconClock,
  IconShieldCheck,
  IconCheck,
  IconArrowRight,
} from "@tabler/icons-react";
import { formatFileCategory } from "@/lib/file-utils";
import { StudySection } from "@/features/projects/components/StudySection";

interface QAProjectFilesPageProps {
  params: Promise<{ id: string }>;
}

export default async function QAProjectFilesPage({ params }: QAProjectFilesPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const res = await getAnalysisWorkbenchData(id);

  if (!res.success) {
    if (res.error.code === "PROJECT_NOT_FOUND") {
      notFound();
    }
    redirect("/dashboard/qa");
  }

  const { project, assignment, analysisFiles, clientFiles } = res.data;
  const currentFiles = analysisFiles.filter((f) => f.isCurrent);
  const isReadyForQa = project.masterStatus === "FOR_QA";
  const isDelivered = project.masterStatus === "DELIVERED";

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      <StudySection
          title="Working files"
          description="Every file the statistical analyst uploaded for this study."
          actions={
            <>
              {isReadyForQa && (
              <Link href={`/dashboard/qa/projects/${project.id}/review`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-[2px] text-xs gap-1.5 cursor-pointer bg-[#CC6600] hover:bg-[#CC6600]/90 text-white font-semibold shadow-sm"
                >
                  <IconShieldCheck size={14} stroke={2} />
                  <span>Open Review</span>
                  <IconArrowRight size={12} stroke={2} />
                </Button>
              </Link>
            )}
            </>
          }
        />

      {/* Lifecycle Status Guidance Banner */}
      {project.masterStatus === "IN_PROGRESS" && (
        <div className="p-4 rounded-[2px] bg-[#0A0A18] border border-amber-500/30 flex items-start gap-3 text-xs animate-content-fade">
          <IconClock size={18} stroke={2} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-amber-300">Study Still In Progress (Draft Mode)</span>
            <p className="text-white/70 leading-relaxed">
              The Lead Statistical Analyst is currently drafting statistical outputs. Once they finish and click{" "}
              <strong className="text-white font-semibold">&ldquo;Submit for QA Review&rdquo;</strong> on their workbench,
              this study will advance to <span className="font-mono text-emerald-400 font-semibold">FOR_QA</span> and unlock the Evaluation Desk for your formal review and approval.
            </p>
          </div>
        </div>
      )}

      {isReadyForQa && (
        <div className="p-4 rounded-[2px] bg-[#0A0A18] border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs animate-content-fade">
          <div className="flex items-start gap-3">
            <IconShieldCheck size={18} stroke={2} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-emerald-300">Ready for Formal QA Evaluation</span>
              <p className="text-white/70 leading-relaxed">
                The Lead Statistical Analyst has submitted these outputs. You can now open the QA Evaluation Desk to recalculate empirical models, verify APA 7th tables, and approve or request revisions.
              </p>
            </div>
          </div>
          <Link href={`/dashboard/qa/projects/${project.id}/review`} className="shrink-0">
            <Button
              variant="primary"
              size="sm"
              className="rounded-[2px] text-xs gap-1.5 cursor-pointer bg-[#CC6600] hover:bg-[#CC6600]/90 text-white font-semibold"
            >
              <span>Open Evaluation Desk</span>
              <IconArrowRight size={13} stroke={2} />
            </Button>
          </Link>
        </div>
      )}

      {isDelivered && (
        <div className="p-4 rounded-[2px] bg-[#0A0A18] border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs animate-content-fade">
          <div className="flex items-start gap-3">
            <IconCheck size={18} stroke={2} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-emerald-300">Outputs Approved</span>
              <p className="text-white/70 leading-relaxed">
                This study has been formally evaluated, verified, and approved for release.
              </p>
            </div>
          </div>
          <Link href={`/dashboard/qa/projects/${project.id}/review`} className="shrink-0">
            <Button variant="outline" size="sm" className="rounded-[2px] text-xs cursor-pointer">
              <span>View Evaluation Audit</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Meta Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-1">
          <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Lead Statistical Analyst</span>
          <span className="text-sm font-semibold text-white truncate">
            {assignment?.statisticianName || "Assigned Statistical Analyst"}
          </span>
          <span className="text-[0.688rem] text-white/50">{assignment?.statisticianEmail || "stat@jaxis.dev"}</span>
        </div>

        <div className="p-4 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-1">
          <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Package Tier</span>
          <span className="text-sm font-semibold text-[#CC6600]">
            {project.packageName || "Standard Empirical"}
          </span>
          <span className="text-[0.688rem] text-white/50">Contractual Level</span>
        </div>

        <div className="p-4 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-1">
          <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Current Output Files</span>
          <span className="text-sm font-mono font-bold text-emerald-400">
            {currentFiles.length} File{currentFiles.length !== 1 ? "s" : ""} Available
          </span>
          <span className="text-[0.688rem] text-white/50">Ready for Methodological Audit</span>
        </div>
      </div>

      {/* Files Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Verified Client Uploaded Files */}
        <Card className="p-6 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-4 lg:col-span-1">
          <div className="flex items-center gap-2">
            <IconFiles size={18} stroke={2} className="text-[#38BDF8]" />
            <h2 className="text-sm font-bold text-white">Client Uploaded Files ({clientFiles.length})</h2>
          </div>

          {clientFiles.length === 0 ? (
            <div className="p-6 text-center text-white/40 text-xs border border-white/5 rounded-[2px]">
              No client files found.
            </div>
          ) : (
            <div className="space-y-2.5">
              {clientFiles.map((f) => {
                const catMeta = formatFileCategory(f.fileCategory);
                return (
                  <div
                    key={f.id}
                    className="p-3 bg-black/20 border border-white/5 rounded-[2px] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex flex-col gap-1">
                      <span className="font-medium text-white block truncate">{f.fileName}</span>
                      <div>
                        <span
                          className={`text-[0.625rem] font-mono font-medium px-1.5 py-0.5 rounded-[2px] border inline-block ${catMeta.badgeClass}`}
                        >
                          {catMeta.label}
                        </span>
                      </div>
                    </div>
                    <a
                      href={f.filePath}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-[2px] transition-colors shrink-0"
                      title="Download Study File"
                    >
                      <IconDownload size={15} stroke={2} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Statistical Analysis Outputs */}
        <Card className="p-6 sm:p-8 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Statistical Outputs &amp; Scripts</h2>
              <p className="text-xs text-white/50 mt-0.5">
                Current version analysis working files submitted by the Lead Statistical Analyst
              </p>
            </div>
            <Badge variant="emerald" className="font-mono text-xs">
              READ-ONLY AUDIT
            </Badge>
          </div>

          {currentFiles.length === 0 ? (
            <div className="p-12 text-center text-white/40 text-xs border border-dashed border-white/10 rounded-[2px]">
              No statistical analysis files uploaded for this study yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {currentFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-4 sm:p-5 rounded-[2px] bg-[#0F0F1D] border border-white/10 flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="emerald" className="font-mono text-xs font-bold px-2 py-0.5 shrink-0">
                        v{file.version} • CURRENT
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
                      href={file.filePath}
                      download={file.fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#CC6600] hover:bg-[#e67300] text-white text-xs font-semibold rounded-[2px] transition-colors"
                    >
                      <IconDownload size={14} stroke={2} />
                      <span>Download Output</span>
                    </a>
                  </div>

                  {file.notes && (
                    <div className="p-3 bg-black/25 rounded-[2px] border border-white/5 text-xs text-slate-200 leading-relaxed">
                      <span className="text-[0.625rem] font-mono uppercase text-white/40 block mb-0.5">
                        Statistical Analyst Notes:
                      </span>
                      <p>{file.notes}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 text-[0.688rem] text-white/40 font-mono pt-2 border-t border-white/5">
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
    </div>
  );
}
