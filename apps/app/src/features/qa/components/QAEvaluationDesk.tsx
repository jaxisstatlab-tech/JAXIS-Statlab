"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Badge,
  Modal,
  Toast,
} from "@repo/ui";
import {
  IconShieldCheck,
  IconAlertTriangle,
  IconCheck,
  IconDownload,
  IconFileText,
  IconFiles,
  IconClock,
  IconHistory,
  IconAlertOctagon,
  } from "@tabler/icons-react";
import { submitQaReview } from "../actions";
import { getAnalysisFileDownloadUrl } from "@/features/analysis/actions";
import { formatFileCategory, resolveStoredFileUrl } from "@/lib/file-utils";
import {
  ERROR_CLASSIFICATION_METADATA,
  QA_DECISION_METADATA,
  isTier2Package,
} from "@/lib/qa-rules";
import type { QaInspectionDeskDTO } from "../schemas";
import { QADecision, ErrorClassification } from "@prisma/client";
import { StudySection } from "@/features/projects/components/StudySection";

interface QAEvaluationDeskProps {
  data: QaInspectionDeskDTO;
}

const QA_FEEDBACK_TEMPLATES = [
  {
    label: "Approved — Dual-Blind Recalculation Passed",
    decision: QADecision.QA_APPROVED,
    error: undefined,
    comment:
      "All empirical statistical models, p-values, and effect sizes have been independently recalculated and verified against the raw dataset. APA 7th formatting complies with publication standards.",
  },
  {
    label: "Revision — APA 7th Table Formatting Required",
    decision: QADecision.QA_REJECTED,
    error: ErrorClassification.MINOR,
    comment:
      "Please update regression tables to strictly follow APA 7th edition guidelines (italicize statistical symbols like p, t, F, and remove vertical borders).",
  },
  {
    label: "Revision — Model Assumption Diagnostics Missing",
    decision: QADecision.QA_REJECTED,
    error: ErrorClassification.MAJOR,
    comment:
      "Normality, multicollinearity (VIF), and homoscedasticity diagnostic plots are missing from the workbook. Please compute and append these diagnostic outputs.",
  },
  {
    label: "Revision — Calculation Discrepancy Found",
    decision: QADecision.QA_REJECTED,
    error: ErrorClassification.CRITICAL,
    comment:
      "Independent recalculation of the moderator interaction term yielded a discrepancy with the submitted table. Please re-check data filtering and sample exclusion criteria.",
  },
  {
    label: "Ethical Escalation — Data Fabrication / Manipulation",
    decision: QADecision.ESCALATED_TO_CEO,
    error: ErrorClassification.ETHICAL_BREACH,
    comment:
      "RULE_ETH_01 Violation: Observed statistical distribution exhibits artificial uniform clustering inconsistent with authentic survey data. Immediate CEO intervention required.",
  },
];

export function QAEvaluationDesk({ data }: QAEvaluationDeskProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Evaluation Form State
  const [selectedDecision, setSelectedDecision] = useState<QADecision>(QADecision.QA_APPROVED);
  const [selectedError, setSelectedError] = useState<ErrorClassification | undefined>(undefined);
  const [comments, setComments] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Downloading file state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const isTier2 = isTier2Package(data.project.packageName);

  // Handle Download
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
      } else {
        setToastMessage({
          message: "Download Failed",
          description: !res.success ? res.error?.message : "Could not generate secure download URL.",
          variant: "danger",
        });
      }
    } catch (err) {
      console.error("Download error:", err);
      setToastMessage({
        message: "Download Failed",
        description: "An unexpected error occurred during download.",
        variant: "danger",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Template select
  const handleApplyTemplate = (tmpl: typeof QA_FEEDBACK_TEMPLATES[0]) => {
    setSelectedDecision(tmpl.decision);
    setSelectedError(tmpl.error);
    setComments(tmpl.comment);
    setFormError(null);
  };

  // Pre-validate before confirm modal
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments || comments.trim().length < 10) {
      setFormError("Please provide detailed evaluation comments (at least 10 characters).");
      return;
    }
    if (selectedDecision !== QADecision.QA_APPROVED && !selectedError) {
      setFormError("Please select an error classification for this rejection/escalation.");
      return;
    }
    if (selectedDecision === QADecision.ESCALATED_TO_CEO && selectedError !== ErrorClassification.ETHICAL_BREACH) {
      setFormError("Ethical escalations must be classified as 'ETHICAL_BREACH'.");
      return;
    }
    setFormError(null);
    setIsConfirmModalOpen(true);
  };

  // Execute Review Submission
  const handleConfirmSubmit = () => {
    startTransition(async () => {
      const res = await submitQaReview({
        projectId: data.project.id,
        decision: selectedDecision,
        errorClassification: selectedDecision !== QADecision.QA_APPROVED ? selectedError : undefined,
        comments: comments.trim(),
      });

      if (res.success) {
        setIsConfirmModalOpen(false);
        setToastMessage({
          message:
            selectedDecision === QADecision.QA_APPROVED
              ? "Study Approved"
              : selectedDecision === QADecision.QA_REJECTED
              ? "Revisions Requested"
              : "Ethical Breach Escalated to CEO",
          description:
            selectedDecision === QADecision.QA_APPROVED
              ? "Statistical outputs verified and cleared for deliverable release."
              : selectedDecision === QADecision.QA_REJECTED
              ? "Lead Statistical Analyst notified with a 24-hour revision deadline."
              : "Project locked immediately. Chief Executive Officer alerted.",
          variant:
            selectedDecision === QADecision.QA_APPROVED
              ? "success"
              : selectedDecision === QADecision.QA_REJECTED
              ? "warning"
              : "danger",
        });
        router.refresh();
      } else {
        setFormError(!res.success ? res.error?.message : "Failed to submit QA review.");
        setIsConfirmModalOpen(false);
      }
    });
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {/* Canonical Page Header */}
      <StudySection
          title="Review"
          description="Check the statistical analyst's files, then approve them or send them back with notes."
        />

      {/* Ethical Breach Lockout Banner */}
      {data.project.isLocked && data.project.masterStatus === "ETHICAL_BREACH" && (
        <div className="p-4 sm:p-5 rounded-[2px] bg-red-950/50 border border-red-500/50 flex items-start gap-4 animate-content-fade">
          <IconAlertOctagon size={24} stroke={2} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-red-300 block text-sm">
              Study Locked: Active Ethical Breach Escalation (RULE_ETH_01)
            </span>
            <p className="text-white/80 text-xs mt-1 leading-relaxed">
              This research study is strictly locked due to a flagged data manipulation or academic integrity violation.
              All file modifications and client communications are paused until executive clearance from the CEO.
            </p>
          </div>
        </div>
      )}

      {/* Active Revision Alert Banner */}
      {data.project.masterStatus === "QA_REVISION" && data.activeRevision && (
        <div className="p-4 sm:p-5 rounded-[2px] bg-amber-950/40 border border-amber-500/40 flex items-start justify-between gap-4 animate-content-fade">
          <div className="flex items-start gap-3">
            <IconAlertTriangle size={22} stroke={2} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300 block text-sm">
                  Revisions Active: Lead Statistical Analyst Correcting Models
                </span>
                <Badge variant="amber" className="text-[0.625rem] font-mono">
                  {data.activeRevision.errorClassificationLabel || "REVISION_REQUIRED"}
                </Badge>
              </div>
              <p className="text-white/80 text-xs mt-1 leading-relaxed">
                Feedback: &ldquo;{data.activeRevision.comments}&rdquo;
              </p>
              {data.activeRevision.qaRevisionDueAt && (
                <span className="text-[0.688rem] font-mono text-white/50 block mt-2">
                  24-Hour Revision Deadline:{" "}
                  {new Date(data.activeRevision.qaRevisionDueAt).toLocaleString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Status & SLA Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-1">
          <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Lead Statistical Analyst</span>
          <span className="text-sm font-semibold text-white truncate">
            {data.assignment?.statisticianName || "Unassigned"}
          </span>
          <span className="text-[0.688rem] text-white/50">{data.assignment?.statisticianEmail || "analyst@jaxis.dev"}</span>
        </div>

        <div className="p-4 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-1">
          <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Senior QA Lead</span>
          <span className="text-sm font-semibold text-sky-400 truncate">
            {data.assignment?.qaLeadName || "Senior QA Officer"}
          </span>
          <span className="text-[0.688rem] text-white/50">{data.assignment?.qaLeadEmail || "qa@jaxis.dev"}</span>
        </div>

        <div className="p-4 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-1">
          <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Contract Package</span>
          <span className="text-sm font-semibold text-[#CC6600]">
            {data.project.packageName || "Standard Empirical Analysis"}
          </span>
          <span className="text-[0.688rem] text-white/50 font-mono">
            {isTier2 ? "Tier 2 (Mandatory QA Clearance)" : "Standard Tier"}
          </span>
        </div>

        <div className="p-4 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-1">
          <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Contractual SLA</span>
          <span
            className={`text-sm font-mono font-bold ${
              data.assignment?.isOverdue
                ? "text-red-400"
                : (data.assignment?.slaDueDays ?? 99) <= 1
                ? "text-amber-400"
                : "text-emerald-400"
            }`}
          >
            {data.assignment?.isOverdue
              ? "OVERDUE"
              : data.assignment?.slaDueDays !== undefined
              ? `${data.assignment.slaDueDays} Days Remaining`
              : "Active"}
          </span>
          <span className="text-[0.688rem] font-mono text-white/50">
            Due:{" "}
            {data.assignment?.slaDueAt
              ? new Date(data.assignment.slaDueAt).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "N/A"}
          </span>
        </div>
      </div>

      {/* Main 2-Column Desk Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Scope of Work, Client Datasets, Review Linage (1 col) */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* SOW & Deliverable Scope Reference */}
          <Card className="p-6 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <IconFileText size={18} stroke={2} className="text-[#38BDF8]" />
              <h2 className="text-sm font-bold text-white">SOW Deliverables Reference</h2>
            </div>

            {data.sow ? (
              <div className="space-y-3 text-xs text-white/80">
                {data.sow.deliverables.length > 0 && (
                  <div>
                    <span className="text-[0.625rem] font-mono uppercase text-white/40 block mb-1.5 font-semibold">
                      Required Deliverables:
                    </span>
                    <ul className="space-y-1.5 pl-3 list-disc text-slate-300">
                      {data.sow.deliverables.map((deliv, idx) => (
                        <li key={idx}>{deliv}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.sow.scopeOfWork && (
                  <div>
                    <span className="text-[0.625rem] font-mono uppercase text-white/40 block mb-1 font-semibold">
                      Scope Summary:
                    </span>
                    <p className="text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-1">
                      {data.sow.scopeOfWork}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-white/40 text-xs border border-dashed border-white/10 rounded-[2px]">
                No active signed SOW document found.
              </div>
            )}
          </Card>

          {/* Client Uploaded Files (Inputs) */}
          <Card className="p-6 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconFiles size={18} stroke={2} className="text-[#38BDF8]" />
                <h2 className="text-sm font-bold text-white">Client Uploaded Files ({data.clientFiles.length})</h2>
              </div>
            </div>

            {data.clientFiles.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-xs border border-white/5 rounded-[2px]">
                No client study files uploaded.
              </div>
            ) : (
              <div className="space-y-2">
                {data.clientFiles.map((file) => {
                  const catMeta = formatFileCategory(file.fileCategory);
                  return (
                    <div
                      key={file.id}
                      className="p-3 bg-black/20 border border-white/5 rounded-[2px] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex flex-col gap-1">
                        <span className="font-medium text-white block truncate">{file.fileName}</span>
                        <div>
                          <span
                            className={`text-[0.625rem] font-mono font-medium px-1.5 py-0.5 rounded-[2px] border inline-block ${catMeta.badgeClass}`}
                          >
                            {catMeta.label}
                          </span>
                        </div>
                      </div>
                      <a
                        href={resolveStoredFileUrl(file.filePath) ?? file.filePath}
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

          {/* QA Review Lineage & Scorecards */}
          <Card className="p-6 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconHistory size={18} stroke={2} className="text-white/60" />
                <h2 className="text-sm font-bold text-white">Evaluation Scorecards ({data.reviewHistory.length})</h2>
              </div>
              {data.rejectionCount > 0 && (
                <Badge variant={data.rejectionCount >= 2 ? "danger" : "amber"} className="font-mono text-[0.625rem]">
                  {data.rejectionCount} {data.rejectionCount === 1 ? "Rejection" : "Rejections"}
                </Badge>
              )}
            </div>

            {data.reviewHistory.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-xs border border-white/5 rounded-[2px]">
                No evaluations recorded yet. This is the initial submission.
              </div>
            ) : (
              <div className="space-y-3">
                {data.reviewHistory.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 bg-black/25 border border-white/5 rounded-[2px] flex flex-col gap-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={
                          rev.decision === QADecision.QA_APPROVED
                            ? "emerald"
                            : rev.decision === QADecision.QA_REJECTED
                            ? "warning"
                            : "danger"
                        }
                        className="font-mono text-[0.625rem] px-2 py-0.5"
                      >
                        {rev.decisionLabel}
                      </Badge>
                      <span className="text-[0.625rem] font-mono text-white/40">
                        {new Date(rev.reviewedAt).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {rev.errorClassificationLabel && (
                      <span className="text-[0.688rem] font-mono text-amber-300/80">
                        Classification: {rev.errorClassificationLabel}
                      </span>
                    )}

                    <p className="text-slate-300 leading-relaxed text-xs">{rev.comments}</p>

                    <span className="text-[0.625rem] font-mono text-white/40 pt-1 border-t border-white/5">
                      Evaluated by: {rev.reviewerName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Submitted Working Files & Interactive Scoring Desk (2 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Submitted Statistical Output Files */}
          <Card className="p-6 sm:p-8 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <IconShieldCheck size={20} stroke={2} className="text-[#10B981]" />
                <div>
                  <h2 className="text-base font-bold text-white">Statistical Output Assets for Verification</h2>
                  <p className="text-xs text-white/50">
                    Download and re-execute scripts to verify calculations, effect sizes, and APA 7th formatting
                  </p>
                </div>
              </div>
              <span className="text-[0.688rem] font-mono text-white/40">
                {data.analysisFiles.filter((f) => f.isCurrent).length} Current Assets
              </span>
            </div>

            {data.analysisFiles.length === 0 ? (
              <div className="p-12 text-center text-white/40 text-xs border border-dashed border-white/10 rounded-[2px] flex flex-col items-center gap-2">
                <IconFileText size={28} stroke={1.5} className="text-white/20" />
                <span>No statistical analysis files uploaded for this study.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {data.analysisFiles
                  .filter((f) => f.isCurrent)
                  .map((file) => (
                    <div
                      key={file.id}
                      className="p-4 rounded-[2px] bg-[#0F0F1D] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
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

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleDownload(file.id, file.fileName)}
                          loading={downloadingId === file.id}
                          className="rounded-[2px] text-xs font-semibold px-4 py-1.5 gap-1.5 cursor-pointer shrink-0"
                        >
                          <IconDownload size={14} stroke={2} />
                          <span>Download for Recalculation</span>
                        </Button>
                      </div>

                      {file.notes && (
                        <div className="p-2.5 bg-black/25 rounded-[2px] border border-white/5 text-xs text-slate-200 leading-relaxed">
                          <span className="text-[0.625rem] font-mono uppercase text-white/40 block mb-0.5">
                            Statistical Analyst Notes:
                          </span>
                          <p>{file.notes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[0.688rem] text-white/40 font-mono pt-1.5 border-t border-white/5">
                        <span>Uploaded by: {file.statisticianName}</span>
                        <span>
                          {new Date(file.uploadedAt).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          {/* QA Evaluation & Scoring Form */}
          <Card className="p-6 sm:p-8 bg-[#0A0A18] border border-white/10 rounded-[2px] flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Quality Assurance Scorecard Decision</h2>
                <p className="text-xs text-white/50 mt-0.5">
                  Issue an official verification verdict for statistical clearance or revision requirements
                </p>
              </div>
              <Badge variant="sky" className="font-mono text-xs">
                SENIOR QA DESK
              </Badge>
            </div>

            {formError && (
              <div className="p-3.5 bg-red-950/50 border border-red-500/40 rounded-[2px] text-xs text-red-200">
                {formError}
              </div>
            )}

            {data.canReview ? (
              <form onSubmit={handlePreSubmit} className="flex flex-col gap-5 text-xs font-sans">
                {/* Decision Selector */}
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-white/90">
                    Evaluation Verdict: <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Approve */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDecision(QADecision.QA_APPROVED);
                        setSelectedError(undefined);
                        setFormError(null);
                      }}
                      className={`p-3.5 rounded-[2px] border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        selectedDecision === QADecision.QA_APPROVED
                          ? "bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40"
                          : "bg-[#0F0F1D] border-white/10 hover:border-white/20 text-white/70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-emerald-300">Approve Study</span>
                        <IconCheck size={16} stroke={2.5} className="text-emerald-400" />
                      </div>
                      <span className="text-[0.688rem] text-white/60 leading-relaxed">
                        Calculations verified. Clear study for deliverable packaging.
                      </span>
                    </button>

                    {/* Reject / Revision */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDecision(QADecision.QA_REJECTED);
                        if (!selectedError) setSelectedError(ErrorClassification.MINOR);
                        setFormError(null);
                      }}
                      className={`p-3.5 rounded-[2px] border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        selectedDecision === QADecision.QA_REJECTED
                          ? "bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/40"
                          : "bg-[#0F0F1D] border-white/10 hover:border-white/20 text-white/70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-amber-300">Require Revisions</span>
                        <IconClock size={16} stroke={2} className="text-amber-400" />
                      </div>
                      <span className="text-[0.688rem] text-white/60 leading-relaxed">
                        Requires corrections within a 24-hour turnaround window.
                      </span>
                    </button>

                    {/* Escalate */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDecision(QADecision.ESCALATED_TO_CEO);
                        setSelectedError(ErrorClassification.ETHICAL_BREACH);
                        setFormError(null);
                      }}
                      className={`p-3.5 rounded-[2px] border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        selectedDecision === QADecision.ESCALATED_TO_CEO
                          ? "bg-red-950/40 border-red-500/60 ring-1 ring-red-500/40"
                          : "bg-[#0F0F1D] border-white/10 hover:border-white/20 text-white/70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-red-400">Ethical Breach</span>
                        <IconAlertOctagon size={16} stroke={2} className="text-red-400" />
                      </div>
                      <span className="text-[0.688rem] text-white/60 leading-relaxed">
                        RULE_ETH_01: Immediate lock and executive CEO escalation.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Error Classification (If Rejected or Escalated) */}
                {selectedDecision !== QADecision.QA_APPROVED && (
                  <div className="flex flex-col gap-1.5 p-3.5 bg-black/25 border border-white/10 rounded-[2px]">
                    <label className="font-semibold text-white/90">
                      Error Classification: <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {Object.entries(ERROR_CLASSIFICATION_METADATA)
                        .filter(([key]) => {
                          if (selectedDecision === QADecision.ESCALATED_TO_CEO) {
                            return key === "ETHICAL_BREACH";
                          }
                          return key !== "ETHICAL_BREACH";
                        })
                        .map(([key, meta]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedError(key as ErrorClassification)}
                            className={`p-2.5 rounded-[2px] border text-left transition-colors cursor-pointer flex flex-col gap-0.5 ${
                              selectedError === key
                                ? "bg-[#CC6600]/20 border-[#CC6600] text-white"
                                : "bg-[#0F0F1D] border-white/10 hover:border-white/20 text-white/70"
                            }`}
                          >
                            <span className="font-bold text-xs text-white">{meta.label}</span>
                            <span className="text-[0.688rem] text-white/50 leading-relaxed">
                              {meta.description}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Quick Feedback Templates */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">
                    Quick Verification Templates:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QA_FEEDBACK_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="px-2.5 py-1 rounded-[2px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[0.688rem] font-mono transition-colors cursor-pointer text-left"
                      >
                        {tmpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detailed Comments */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-white/90">
                      Scorecard Comments &amp; Correction Requirements: <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[0.688rem] font-mono text-white/40">{comments.length}/3000 chars</span>
                  </div>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={4}
                    maxLength={3000}
                    placeholder="Document exact dual-blind recalculated values, discrepancies, and specific table/model adjustments..."
                    className="p-3 bg-[#0F0F1D] border border-white/15 rounded-[2px] text-xs text-white placeholder:text-white/30 focus:border-[#CC6600] focus:outline-none transition-colors font-sans leading-relaxed resize-none"
                  />
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-[0.688rem] text-white/40 font-mono">
                    All decisions are timestamped in the audit lineage.
                  </span>

                  <Button
                    type="submit"
                    variant={
                      selectedDecision === QADecision.QA_APPROVED
                        ? "primary"
                        : selectedDecision === QADecision.QA_REJECTED
                        ? "secondary"
                        : "outline"
                    }
                    size="md"
                    className="rounded-[2px] text-xs font-semibold px-6 py-2.5 cursor-pointer"
                  >
                    <span>Proceed to Confirm Verdict &rarr;</span>
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-[2px] bg-[#0A0A18] border border-white/10 text-xs text-white/60 flex items-center gap-3">
                <IconAlertTriangle size={18} stroke={1.5} className="text-amber-400 shrink-0" />
                <span>
                  {data.reviewDisabledReason || "QA evaluation is currently locked for this research study."}
                </span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <Modal
          open={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title={`Confirm QA Verdict: ${QA_DECISION_METADATA[selectedDecision]?.label || selectedDecision}`}
          description={`Research Study: ${data.project.intakeId}`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isPending}
                className="font-sans text-xs rounded-[2px]"
              >
                Cancel
              </Button>
              <Button
                variant={
                  selectedDecision === QADecision.QA_APPROVED
                    ? "primary"
                    : selectedDecision === QADecision.QA_REJECTED
                    ? "secondary"
                    : "outline"
                }
                size="sm"
                onClick={handleConfirmSubmit}
                loading={isPending}
                className="font-sans text-xs font-semibold rounded-[2px] px-5"
              >
                <span>Confirm &amp; Issue Verdict</span>
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-xs font-sans text-white/80">
            <div className="p-3.5 bg-[#0F0F1D] border border-white/10 rounded-[2px] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Decision</span>
                <Badge
                  variant={
                    selectedDecision === QADecision.QA_APPROVED
                      ? "emerald"
                      : selectedDecision === QADecision.QA_REJECTED
                      ? "warning"
                      : "danger"
                  }
                  className="font-mono text-xs font-bold"
                >
                  {QA_DECISION_METADATA[selectedDecision]?.label || selectedDecision}
                </Badge>
              </div>

              {selectedError && (
                <div className="flex items-center justify-between">
                  <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Classification</span>
                  <span className="text-amber-300 font-semibold">
                    {ERROR_CLASSIFICATION_METADATA[selectedError]?.label}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-black/30 border border-white/5 rounded-[2px]">
              <span className="text-[0.625rem] font-mono uppercase text-white/40 block mb-1">
                Scorecard Comments:
              </span>
              <p className="text-white/90 text-xs leading-relaxed">{comments}</p>
            </div>

            {selectedDecision === QADecision.QA_REJECTED && (
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-[2px] text-amber-200 text-xs flex items-start gap-2">
                <IconClock size={16} stroke={2} className="text-amber-400 shrink-0 mt-0.5" />
                <span>
                  The Lead Statistical Analyst will receive an immediate revision notice and a 24-hour turnaround timer.
                </span>
              </div>
            )}

            {selectedDecision === QADecision.ESCALATED_TO_CEO && (
              <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-[2px] text-red-200 text-xs flex items-start gap-2">
                <IconAlertOctagon size={16} stroke={2} className="text-red-400 shrink-0 mt-0.5" />
                <span>
                  This study will be locked immediately and the Chief Executive Officer will receive an emergency briefing.
                </span>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
