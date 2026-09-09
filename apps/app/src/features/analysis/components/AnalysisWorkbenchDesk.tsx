"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Toast,
} from "@repo/ui";
import {
  FileText,
  CloudArrowUp,
  ClockCounterClockwise,
  DownloadSimple,
  WarningCircle,
  ShieldCheck,
  ChatCircleText,
  Files,
  Check,
  Clock,
  User,
  CaretDown,
  CaretUp,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { ANALYSIS_CATEGORY_METADATA } from "@/lib/analysis-rules";
import { uploadAnalysisFile, getAnalysisFileDownloadUrl } from "../actions";
import { formatFileCategory } from "@/lib/file-utils";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { ScopeCreepModal } from "./ScopeCreepModal";
import { SubmitForQAModal } from "./SubmitForQAModal";
import type { WorkbenchDataDTO } from "../schemas";
import { AnalysisFileCategory } from "@prisma/client";

const MAX_UPLOAD_SLOTS = 4;

interface UploadSlot {
  id: string;
  category: AnalysisFileCategory;
  file: File | null;
}

interface AnalysisWorkbenchDeskProps {
  initialData: WorkbenchDataDTO;
}

export const AnalysisWorkbenchDesk: React.FC<AnalysisWorkbenchDeskProps> = ({ initialData }) => {
  const [data, setData] = useState<WorkbenchDataDTO>(initialData);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("ALL");
  const [isSowExpanded, setIsSowExpanded] = useState<boolean>(true);

  // Multi-Slot Upload Form State (Supports Issue #2: Results document + Script file)
  const [uploadSlots, setUploadSlots] = useState<UploadSlot[]>([
    { id: "slot-1", category: AnalysisFileCategory.PDF_REPORT, file: null },
    { id: "slot-2", category: AnalysisFileCategory.R_OUTPUT, file: null },
  ]);
  const [slotInputKeys, setSlotInputKeys] = useState<Record<string, number>>({
    "slot-1": 1,
    "slot-2": 2,
  });
  const [uploadNotes, setUploadNotes] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modals
  const [historyCategory, setHistoryCategory] = useState<AnalysisFileCategory | null>(null);
  const [isScopeCreepOpen, setIsScopeCreepOpen] = useState<boolean>(false);
  const [isSubmitQAOpen, setIsSubmitQAOpen] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const handleAddSlot = () => {
    if (uploadSlots.length >= MAX_UPLOAD_SLOTS) return;
    const newId = `slot-${Date.now()}`;
    const existingCats = new Set(uploadSlots.map((s) => s.category));
    
    // Pick the next available category that is not already chosen in another slot
    const allCategories = Object.keys(ANALYSIS_CATEGORY_METADATA) as AnalysisFileCategory[];
    const nextCat =
      allCategories.find((cat) => !existingCats.has(cat)) || AnalysisFileCategory.OTHER;

    setUploadSlots((prev) => [...prev, { id: newId, category: nextCat, file: null }]);
    setSlotInputKeys((prev) => ({ ...prev, [newId]: Date.now() }));
  };

  const handleRemoveSlot = (id: string) => {
    if (uploadSlots.length <= 1) return;
    setUploadSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSlotCategoryChange = (id: string, category: AnalysisFileCategory) => {
    const newMeta = ANALYSIS_CATEGORY_METADATA[category];
    setUploadSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        // Verify if currently selected file matches the newly selected category
        if (s.file) {
          const ext = s.file.name.slice(s.file.name.lastIndexOf(".")).toLowerCase();
          if (!newMeta.allowedExtensions.includes(ext)) {
            // File does not match new category; clear file and notify user
            setSlotInputKeys((keys) => ({ ...keys, [id]: Date.now() }));
            setToastMessage({
              message: "File Mismatch Removed",
              description: `"${s.file.name}" was removed because it does not match "${newMeta.label}" (${newMeta.hint}).`,
              variant: "warning",
            });
            return { ...s, category, file: null };
          }
        }
        return { ...s, category };
      })
    );
  };

  const handleSlotFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const slot = uploadSlots.find((s) => s.id === id);
    if (!slot) return;
    const catMeta = ANALYSIS_CATEGORY_METADATA[slot.category];

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // 1. File size check (15MB limit)
      if (file.size > 15 * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds the 15MB file size limit.`);
        setSlotInputKeys((prev) => ({ ...prev, [id]: Date.now() }));
        setUploadSlots((prev) => prev.map((s) => (s.id === id ? { ...s, file: null } : s)));
        return;
      }

      // 2. Strict file extension matching against the selected category
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!catMeta.allowedExtensions.includes(ext)) {
        setUploadError(
          `Invalid file for "${catMeta.label}": "${file.name}" (${ext || "no extension"}) is not allowed. Expected: ${catMeta.hint}`
        );
        // Clear file input immediately so invalid file is never attached
        setSlotInputKeys((prev) => ({ ...prev, [id]: Date.now() }));
        setUploadSlots((prev) => prev.map((s) => (s.id === id ? { ...s, file: null } : s)));
        return;
      }

      setUploadError(null);
      setUploadSlots((prev) => prev.map((s) => (s.id === id ? { ...s, file } : s)));
    } else {
      setUploadSlots((prev) => prev.map((s) => (s.id === id ? { ...s, file: null } : s)));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const readySlots = uploadSlots.filter((s): s is UploadSlot & { file: File } => s.file !== null);

    if (readySlots.length === 0 || isUploading) {
      setUploadError("Please choose at least one file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadedResults: Array<WorkbenchDataDTO["analysisFiles"][number]> = [];

      let count = 0;
      for (const slot of readySlots) {
        count++;
        setUploadProgress(
          readySlots.length > 1
            ? `Uploading ${count} of ${readySlots.length}: ${slot.file.name}...`
            : `Uploading ${slot.file.name}...`
        );

        const storageKey = `analysis/${data.project.id}/${Date.now()}_${count}_${slot.file.name.replace(/\s+/g, "_")}`;

        const res = await uploadAnalysisFile({
          projectId: data.project.id,
          fileName: slot.file.name,
          filePath: storageKey,
          fileType: slot.file.type || "application/octet-stream",
          fileSize: slot.file.size,
          fileCategory: slot.category,
          notes: uploadNotes.trim() || undefined,
        });

        if (res.success && res.data) {
          uploadedResults.push(res.data);
        } else if (!res.success) {
          throw new Error(res.error?.message || `Failed to upload "${slot.file.name}".`);
        }
      }

      // Update local file state with all uploaded files
      setData((prev) => {
        let updatedFiles = [...prev.analysisFiles];
        for (const uploaded of uploadedResults) {
          updatedFiles = updatedFiles.map((f) =>
            f.fileCategory === uploaded.fileCategory ? { ...f, isCurrent: false } : f
          );
          updatedFiles = [uploaded, ...updatedFiles];
        }
        return {
          ...prev,
          project: {
            ...prev.project,
            masterStatus:
              prev.project.masterStatus === "EXPERT_ASSIGNED" ||
              prev.project.masterStatus === "ACTIVE" ||
              prev.project.masterStatus === "QA_REVISION"
                ? "IN_PROGRESS"
                : prev.project.masterStatus,
          },
          analysisFiles: updatedFiles,
        };
      });

      const firstResult = uploadedResults[0];
      setToastMessage({
        message:
          uploadedResults.length > 1
            ? `Uploaded ${uploadedResults.length} Files Successfully`
            : firstResult
            ? `Uploaded ${firstResult.fileName} (v${firstResult.version})`
            : "Files Uploaded Successfully",
        description: "Analysis files saved as current version for Senior QA evaluation.",
        variant: "success",
      });

      // Reset form slots & file inputs
      setUploadSlots([
        { id: "slot-1", category: AnalysisFileCategory.PDF_REPORT, file: null },
        { id: "slot-2", category: AnalysisFileCategory.R_OUTPUT, file: null },
      ]);
      setSlotInputKeys({
        "slot-1": Date.now(),
        "slot-2": Date.now() + 1,
      });
      setUploadNotes("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while uploading.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

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
      } else if (!res.success) {
        setToastMessage({
          message: "Download Failed",
          description: res.error.message || "Could not retrieve file download link.",
          variant: "danger",
        });
      }
    } catch {
      setToastMessage({
        message: "Download Error",
        description: "An unexpected error occurred while downloading the file.",
        variant: "danger",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleScopeCreepSuccess = () => {
    setToastMessage({
      message: "Work Halted for Scope Expansion",
      description: "Admin has been notified to prepare a supplemental quotation.",
      variant: "warning",
    });
    setData((prev) => ({
      ...prev,
      project: { ...prev.project, masterStatus: "SCOPE_CREEP_HALTED" },
      canUpload: false,
      uploadDisabledReason: "Work is currently halted due to an active scope creep flag.",
    }));
  };

  const handleSubmitQASuccess = () => {
    setToastMessage({
      message: "Submitted for QA Evaluation",
      description: "Senior QA Lead has received the analytical bundle.",
      variant: "success",
    });
    setData((prev) => ({
      ...prev,
      project: { ...prev.project, masterStatus: "FOR_QA" },
      canUpload: false,
      uploadDisabledReason: "This study is currently submitted for QA evaluation. File uploads are locked.",
    }));
  };

  // Filter current vs filtered files
  const currentFiles = data.analysisFiles.filter((f) => f.isCurrent);
  const displayedFiles = currentFiles.filter((f) => {
    if (selectedCategoryTab === "ALL") return true;
    return f.fileCategory === selectedCategoryTab;
  });

  const isScopeCreepHalted = data.project.masterStatus === "SCOPE_CREEP_HALTED";
  const isForQA = data.project.masterStatus === "FOR_QA";

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "STATISTICIAN", href: "/dashboard/statistician" },
          { label: "WORKBENCH", href: `/dashboard/statistician/projects/${data.project.id}/workbench` },
          { label: data.project.intakeId },
        ]}
        title="Statistical Analysis Workbench"
        badge={
          <Badge
            variant={
              isScopeCreepHalted
                ? "danger"
                : isForQA
                ? "sky"
                : data.project.masterStatus === "IN_PROGRESS"
                ? "emerald"
                : "default"
            }
            className="font-mono text-xs px-2.5 py-0.5"
          >
            {data.project.masterStatus}
          </Badge>
        }
        description={data.project.researchTitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/dashboard/statistician/projects/${data.project.id}/messages`}>
              <Button variant="outline" size="sm" className="rounded-[2px] text-xs gap-1.5 cursor-pointer text-white/80 hover:text-white">
                <ChatCircleText size={15} weight="fill" className="text-[#38BDF8]" />
                <span>Consultation Thread</span>
              </Button>
            </Link>

            {data.isAssignedStatistician && !isScopeCreepHalted && !isForQA && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsScopeCreepOpen(true)}
                  className="rounded-[2px] text-xs text-amber-300 border-amber-500/30 hover:bg-amber-500/10 gap-1.5 cursor-pointer"
                >
                  <WarningCircle size={15} weight="fill" />
                  <span>Flag Scope Creep</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsSubmitQAOpen(true)}
                  disabled={currentFiles.length === 0}
                  className="rounded-[2px] text-xs font-semibold px-4 gap-1.5 cursor-pointer"
                >
                  <ShieldCheck size={15} weight="fill" />
                  <span>Submit for QA Review</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* QA Revision Alert Banner (if QA requested corrections) */}
      {data.project.masterStatus === "QA_REVISION" && (
        <div className="p-4 sm:p-5 rounded-[2px] bg-amber-950/25 border border-amber-500/35 flex flex-col gap-3 animate-content-fade">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <WarningCircle size={20} weight="fill" className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-amber-300 text-sm">
                    QA Revisions Required: 24-Hour Turnaround Cycle Active
                  </span>
                  <Badge variant="amber" className="text-[0.625rem] font-mono">
                    CORRECTIONS_REQUIRED
                  </Badge>
                  {data.activeRevision?.errorClassificationLabel && (
                    <Badge variant="danger" className="text-[0.625rem] font-mono">
                      {data.activeRevision.errorClassificationLabel}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/60 font-sans">
                  <span>
                    Evaluated by Senior QA Lead:{" "}
                    <strong className="text-white font-medium">
                      {data.activeRevision?.reviewerName || data.assignment?.qaLeadName || "Senior QA Lead"}
                    </strong>
                  </span>
                  {data.activeRevision?.reviewedAt && (
                    <span className="text-white/40">
                      on{" "}
                      {new Date(data.activeRevision.reviewedAt).toLocaleString("en-PH", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {data.activeRevision?.qaRevisionDueAt && (
                    <span className="text-amber-300 font-mono">
                      • Turnaround Due:{" "}
                      <strong className="font-bold">
                        {new Date(data.activeRevision.qaRevisionDueAt).toLocaleString("en-PH", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Direct Scorecard Feedback */}
          <div className="p-3.5 bg-[#010D1F] border border-amber-500/25 rounded-[2px] text-xs font-sans text-amber-100/95 leading-relaxed whitespace-pre-wrap select-text">
            {data.activeRevision?.comments ||
              "The Senior QA Lead has requested analytical or formatting adjustments. Please inspect the scorecard notes, update your scripts/workbooks, upload the new corrected versions below, and re-submit for QA Review."}
          </div>
        </div>
      )}

      {/* Scope Creep Alert Banner (if halted) */}
      {isScopeCreepHalted && (
        <div className="p-4 rounded-[2px] bg-amber-950/30 border border-amber-500/40 flex items-start gap-3 animate-content-fade">
          <WarningCircle size={20} weight="fill" className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-bold text-amber-300 block text-sm">
              Statistical Work Halted: Scope Expansion Active
            </span>
            <p className="text-white/80 text-xs leading-relaxed font-sans">
              {data.activeScopeCreep?.flagReason ||
                "Out-of-scope analysis requirements have been flagged. Administration is currently evaluating a supplemental quotation. Workbench file uploads are locked until resolved."}
            </p>
            {data.activeScopeCreep?.flaggedAt && (
              <span className="text-[0.625rem] font-mono text-white/50 block mt-1">
                Flagged on {new Date(data.activeScopeCreep.flaggedAt).toLocaleString("en-PH")} by{" "}
                {data.activeScopeCreep.flaggerName}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Top Status & SLA Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-1">
          <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Client Name</span>
          <span className="text-sm font-semibold text-white truncate">{data.project.clientName}</span>
          <span className="text-[0.688rem] text-white/50">{data.project.clientSchool || "Academic Research"}</span>
        </div>

        <div className="p-4 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-1">
          <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Assigned QA Lead</span>
          <span className="text-sm font-semibold text-sky-400 truncate">
            {data.assignment?.qaLeadName || "Unassigned"}
          </span>
          <span className="text-[0.688rem] text-white/50">{data.assignment?.qaLeadEmail || "qa@jaxis.dev"}</span>
        </div>

        <div className="p-4 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-1">
          <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Analysis Package</span>
          <span className="text-sm font-semibold text-[#CC6600]">
            {data.project.packageName || "Standard Empirical Analysis"}
          </span>
          <span className="text-[0.688rem] text-white/50">Contract Package Tier</span>
        </div>

        <div className="p-4 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-1">
          <span className="text-[0.688rem] font-mono uppercase text-white/40 font-semibold">Contractual SLA</span>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-mono font-bold ${
                data.assignment?.isOverdue
                  ? "text-red-400"
                  : data.assignment?.isUrgent
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {data.assignment?.slaLabel || "Active"}
            </span>
          </div>
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
        {/* Left Column: Scope of Work Reference & Verified Datasets (1 col) */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Research Objectives & SOW Card */}
          <Card className="p-5 sm:p-6 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} weight="fill" className="text-[#38BDF8]" />
                <h2 className="text-sm font-bold text-white">Research Scope &amp; SOW</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSowExpanded(!isSowExpanded)}
                className="text-white/40 hover:text-white transition-colors cursor-pointer"
                aria-label="Toggle SOW scope"
              >
                {isSowExpanded ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
              </button>
            </div>

            {isSowExpanded && (
              <div className="flex flex-col divide-y divide-white/5 text-xs">
                <div className="pb-2.5">
                  <span className="text-[0.625rem] font-mono uppercase text-white/40 font-semibold tracking-wider block mb-1">
                    Research Questions
                  </span>
                  <p className="text-white/90 font-sans leading-relaxed whitespace-pre-wrap">
                    {data.project.researchQuestions}
                  </p>
                </div>

                {data.project.hypotheses && (
                  <div className="py-2.5">
                    <span className="text-[0.625rem] font-mono uppercase text-white/40 font-semibold tracking-wider block mb-1">
                      Stated Hypotheses
                    </span>
                    <p className="text-white/90 font-sans leading-relaxed whitespace-pre-wrap">
                      {data.project.hypotheses}
                    </p>
                  </div>
                )}

                <div className="pt-2.5">
                  <span className="text-[0.625rem] font-mono uppercase text-white/40 font-semibold tracking-wider block mb-1">
                    Analytical Objectives
                  </span>
                  <p className="text-white/90 font-sans leading-relaxed whitespace-pre-wrap">
                    {data.project.researchObjectives}
                  </p>
                </div>

                {data.sow?.deliverables && data.sow.deliverables.length > 0 && (
                  <div className="pt-2.5">
                    <span className="text-[0.625rem] font-mono uppercase text-white/40 font-semibold tracking-wider block mb-1.5">
                      Agreed SOW Deliverables
                    </span>
                    <ul className="space-y-1 font-sans">
                      {data.sow.deliverables.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-white/80">
                          <Check size={13} weight="bold" className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Verified Client Uploaded Files */}
          <Card className="p-5 sm:p-6 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <Files size={16} weight="fill" className="text-[#38BDF8]" />
              <h2 className="text-sm font-bold text-white">Client Uploaded Files ({data.clientFiles.length})</h2>
            </div>

            {data.clientFiles.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-xs border border-white/5 rounded-[2px]">
                No client files attached to this study.
              </div>
            ) : (
              <div className="space-y-2">
                {data.clientFiles.map((file) => {
                  const catMeta = formatFileCategory(file.fileCategory);
                  return (
                    <div
                      key={file.id}
                      className="p-2.5 bg-black/20 hover:bg-black/30 border border-white/5 rounded-[2px] flex items-center justify-between gap-2.5 text-xs transition-colors"
                    >
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <span className="font-medium text-white block truncate">{file.fileName}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[0.563rem] font-mono font-medium px-1.5 py-0.5 rounded-[2px] border inline-block ${catMeta.badgeClass}`}
                          >
                            {catMeta.label}
                          </span>
                          <span className="text-[0.625rem] font-mono text-white/40">
                            {new Date(file.uploadedAt).toLocaleDateString("en-PH")}
                          </span>
                        </div>
                      </div>
                      <a
                        href={file.filePath}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-[2px] transition-colors shrink-0"
                        title="Download Study File"
                      >
                        <DownloadSimple size={14} weight="fill" />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Output File Uploads & Versioned Assets Desk (2 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* File Upload Zone (if allowed) */}
          {data.canUpload ? (
            <Card className="p-5 sm:p-6 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CloudArrowUp size={18} weight="fill" className="text-[#CC6600]" />
                  <h2 className="text-sm font-bold text-white">Upload Statistical Output Files</h2>
                </div>
                <span className="text-[0.688rem] font-mono text-white/40">
                  Max 15MB each
                </span>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-[2px] text-xs text-red-200">
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="flex flex-col gap-3 text-xs font-sans">
                {/* Upload Slots List */}
                <div className="flex flex-col gap-2">
                  {uploadSlots.map((slot, idx) => {
                    const catMeta = ANALYSIS_CATEGORY_METADATA[slot.category];
                    const otherSlotCategories = new Set(
                      uploadSlots.filter((s) => s.id !== slot.id).map((s) => s.category)
                    );

                    return (
                      <div
                        key={slot.id}
                        className="p-2.5 bg-[#011B38]/60 border border-white/10 hover:border-white/20 rounded-[2px] flex flex-col sm:flex-row sm:items-center gap-2.5 transition-colors"
                      >
                        {/* Slot Number & Category Dropdown */}
                        <div className="flex items-center gap-2 sm:w-56 shrink-0">
                          <span className="h-5 w-5 rounded-[2px] bg-white/10 text-white font-mono text-[0.625rem] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <select
                            value={slot.category}
                            onChange={(e) => handleSlotCategoryChange(slot.id, e.target.value as AnalysisFileCategory)}
                            disabled={isUploading}
                            className="w-full py-1.5 px-2 bg-[#01142B] border border-white/15 rounded-[2px] text-xs text-white focus:border-[#CC6600] focus:outline-none transition-colors"
                          >
                            {Object.entries(ANALYSIS_CATEGORY_METADATA).map(([key, meta]) => {
                              const isTaken = otherSlotCategories.has(key as AnalysisFileCategory);
                              return (
                                <option
                                  key={key}
                                  value={key}
                                  disabled={isTaken}
                                  className="bg-[#01142B] text-white disabled:text-white/30"
                                >
                                  {meta.label} {isTaken ? "(chosen)" : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* File Picker with Category-Matching accept and hint */}
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <input
                            key={slotInputKeys[slot.id] || slot.id}
                            type="file"
                            accept={catMeta.accept}
                            onChange={(e) => handleSlotFileChange(slot.id, e)}
                            disabled={isUploading}
                            className="w-full text-xs text-white/70 file:mr-2 file:py-1 file:px-2.5 file:rounded-[2px] file:border-0 file:text-[0.688rem] file:font-semibold file:bg-[#CC6600] file:text-white hover:file:bg-[#e67300] file:cursor-pointer cursor-pointer"
                          />
                          <span className="text-[0.625rem] font-mono text-white/40 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-[2px] shrink-0 hidden md:inline-block">
                            {catMeta.hint}
                          </span>
                          {slot.file && (
                            <span className="text-[0.625rem] font-mono text-emerald-400 font-semibold shrink-0">
                              {slot.file.size > 1024 * 1024
                                ? `${(slot.file.size / (1024 * 1024)).toFixed(1)}MB`
                                : `${(slot.file.size / 1024).toFixed(0)}KB`}
                            </span>
                          )}
                        </div>

                        {/* Remove Slot */}
                        {uploadSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(slot.id)}
                            disabled={isUploading}
                            className="p-1 text-white/40 hover:text-red-400 hover:bg-white/5 rounded-[2px] transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                            title="Remove slot"
                          >
                            <Trash size={14} weight="fill" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Leveled Bottom Action Strip: Add slot + Notes + Upload Button */}
                <div className="flex flex-col gap-2.5 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddSlot}
                        disabled={isUploading || uploadSlots.length >= MAX_UPLOAD_SLOTS}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus size={12} weight="bold" />
                        <span>Add File Slot</span>
                      </button>

                      <span className="text-[0.625rem] font-mono text-white/40">
                        {uploadSlots.length >= MAX_UPLOAD_SLOTS
                          ? `Limit reached (${MAX_UPLOAD_SLOTS}/${MAX_UPLOAD_SLOTS})`
                          : `(${uploadSlots.length}/${MAX_UPLOAD_SLOTS} slots)`}
                      </span>
                    </div>

                    <span className="text-[0.625rem] font-mono text-white/40">
                      {uploadSlots.filter((s) => s.file !== null).length} of {uploadSlots.length} queued
                    </span>
                  </div>

                  {/* Leveled input & CTA */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                      placeholder="Version notes (optional, e.g. Added interaction term, resolved outlier #42)..."
                      maxLength={1000}
                      disabled={isUploading}
                      className="flex-1 p-2 bg-[#01142B] border border-white/15 rounded-[2px] text-xs text-white placeholder:text-white/30 focus:border-[#CC6600] focus:outline-none transition-colors font-sans"
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={isUploading}
                      disabled={uploadSlots.every((s) => s.file === null) || isUploading}
                      className="rounded-[2px] text-xs font-semibold px-4 py-2 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <CloudArrowUp size={14} weight="fill" className="mr-1.5 shrink-0" />
                      <span>
                        {isUploading
                          ? uploadProgress || "Uploading..."
                          : uploadSlots.filter((s) => s.file !== null).length > 1
                          ? `Upload ${uploadSlots.filter((s) => s.file !== null).length} Files`
                          : "Upload Files"}
                      </span>
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          ) : (
            <div className="p-4 rounded-[2px] bg-[#01142B] border border-white/10 text-xs text-white/60 flex items-center gap-2.5">
              <WarningCircle size={16} weight="fill" className="text-amber-400 shrink-0" />
              <span>{data.uploadDisabledReason || "Uploads are currently locked for this study."}</span>
            </div>
          )}

          {/* Current Versioned Analysis Files Desk */}
          <Card className="p-5 sm:p-6 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">Current Analysis Working Files</h2>
                <p className="text-[0.688rem] text-white/50 mt-0.5">
                  Permanent version-controlled assets for Senior QA evaluation
                </p>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryTab("ALL")}
                  className={`px-2.5 py-1 rounded-[2px] text-xs font-mono font-medium transition-colors cursor-pointer ${
                    selectedCategoryTab === "ALL"
                      ? "bg-[#CC6600] text-white"
                      : "bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  ALL ({currentFiles.length})
                </button>
                {Object.keys(ANALYSIS_CATEGORY_METADATA).map((cat) => {
                  const count = currentFiles.filter((f) => f.fileCategory === cat).length;
                  if (count === 0 && selectedCategoryTab !== cat) return null;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryTab(cat)}
                      className={`px-2.5 py-1 rounded-[2px] text-xs font-mono font-medium transition-colors cursor-pointer ${
                        selectedCategoryTab === cat
                          ? "bg-[#CC6600] text-white"
                          : "bg-white/5 text-white/60 hover:text-white"
                      }`}
                    >
                      {cat.replace("_OUTPUT", "").replace("_WORKBOOK", "")} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QA 2-File Compliance Indicator */}
            {currentFiles.length >= 2 ? (
              <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-[2px] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Check size={14} weight="bold" className="shrink-0 text-emerald-400" />
                  <span>
                    <strong>{currentFiles.length} files attached</strong> — QA review requirements met (Results &amp; Discussion + Script).
                  </span>
                </div>
                <span className="text-[0.625rem] font-mono text-emerald-400/90 bg-emerald-900/40 px-1.5 py-0.5 rounded-[2px]">
                  READY FOR QA
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-[2px] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-amber-300">
                  <WarningCircle size={14} weight="fill" className="shrink-0 text-amber-400" />
                  <span>
                    <strong>{currentFiles.length} of 2 required deliverables attached:</strong> QA requires Results &amp; Discussion document and Script file.
                  </span>
                </div>
                <span className="text-[0.625rem] font-mono text-amber-400/90 bg-amber-900/40 px-1.5 py-0.5 rounded-[2px]">
                  {2 - currentFiles.length} MORE NEEDED
                </span>
              </div>
            )}

            {/* File List */}
            {displayedFiles.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-xs border border-dashed border-white/10 rounded-[2px] flex flex-col items-center gap-2">
                <CloudArrowUp size={24} weight="fill" className="text-white/20" />
                <span>No statistical analysis files uploaded in this category yet.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {displayedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 sm:p-4 rounded-[2px] bg-[#011B38]/70 border border-white/10 hover:border-white/20 transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Badge variant="emerald" className="font-mono text-[0.625rem] font-bold px-1.5 py-0.5 shrink-0">
                          v{file.version} • CURRENT
                        </Badge>
                        <div className="min-w-0">
                          <span className="font-semibold text-white text-xs block truncate">{file.fileName}</span>
                          <span className="text-[0.625rem] font-mono text-white/50">
                            {file.categoryLabel} &bull;{" "}
                            {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : "File"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {file.versionCount && file.versionCount > 1 ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setHistoryCategory(file.fileCategory)}
                            className="rounded-[2px] text-xs px-2.5 py-1 gap-1 cursor-pointer text-sky-300 border-sky-500/30 hover:bg-sky-500/10"
                          >
                            <ClockCounterClockwise size={13} weight="fill" />
                            <span>{file.versionCount} Versions</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistoryCategory(file.fileCategory)}
                            className="rounded-[2px] text-xs px-2 py-1 gap-1 text-white/50 hover:text-white cursor-pointer"
                          >
                            <ClockCounterClockwise size={13} weight="fill" />
                            <span>History</span>
                          </Button>
                        )}

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleDownload(file.id, file.fileName)}
                          loading={downloadingId === file.id}
                          className="rounded-[2px] text-xs font-semibold px-3 py-1 gap-1 cursor-pointer"
                        >
                          <DownloadSimple size={13} weight="fill" />
                          <span>Download</span>
                        </Button>
                      </div>
                    </div>

                    {file.notes && (
                      <div className="p-2.5 bg-black/25 rounded-[2px] border border-white/5 text-xs text-slate-200 leading-relaxed font-sans">
                        <span className="text-[0.625rem] font-mono uppercase text-white/40 block mb-0.5">
                          Version Notes:
                        </span>
                        <p>{file.notes}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[0.625rem] text-white/40 font-mono pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1">
                        <User size={11} weight="fill" />
                        <span>Lead Statistician: {file.statisticianName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={11} weight="fill" />
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

      {/* QA Review Lineage & Scorecards (Lower Audit Bento) */}
      {Boolean(data.qaReviews && data.qaReviews.length > 0) && (
        <Card className="p-5 sm:p-6 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-4 animate-content-fade">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClockCounterClockwise size={16} weight="fill" className="text-white/60" />
              <h2 className="text-sm font-bold text-white">
                QA Scorecards &amp; Evaluation Lineage ({data.qaReviews?.length || 0})
              </h2>
            </div>
            <span className="text-[0.625rem] font-mono text-white/40">
              Audit history of Senior QA evaluations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.qaReviews?.map((rev) => (
              <div
                key={rev.id}
                className="p-4 bg-[#011B38]/60 border border-white/10 hover:border-white/20 rounded-[2px] flex flex-col justify-between gap-3 transition-colors"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        rev.decision === "QA_APPROVED"
                          ? "emerald"
                          : rev.decision === "QA_REJECTED"
                          ? "warning"
                          : "danger"
                      }
                      className="font-mono text-[0.625rem] px-1.5 py-0.5"
                    >
                      {rev.decisionLabel}
                    </Badge>
                    <span className="text-[0.625rem] font-mono text-white/40">
                      {new Date(rev.reviewedAt).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {rev.errorClassificationLabel && (
                    <span className="text-[0.688rem] font-mono text-amber-300/90 font-medium">
                      Classification: {rev.errorClassificationLabel}
                    </span>
                  )}

                  <p className="text-slate-300 leading-relaxed text-xs whitespace-pre-wrap select-text font-sans">
                    {rev.comments}
                  </p>
                </div>

                <div className="text-[0.625rem] font-mono text-white/40 pt-2 border-t border-white/5 flex items-center justify-between">
                  <span>Evaluated by: {rev.reviewerName}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Version History Modal */}
      <VersionHistoryModal
        projectId={data.project.id}
        fileCategory={historyCategory}
        onClose={() => setHistoryCategory(null)}
      />

      {/* Scope Creep Flag Modal */}
      <ScopeCreepModal
        projectId={data.project.id}
        projectTitle={data.project.researchTitle}
        isOpen={isScopeCreepOpen}
        onClose={() => setIsScopeCreepOpen(false)}
        onSuccess={handleScopeCreepSuccess}
      />

      {/* Submit for QA Modal */}
      <SubmitForQAModal
        projectId={data.project.id}
        projectTitle={data.project.researchTitle}
        filesCount={currentFiles.length}
        isOpen={isSubmitQAOpen}
        onClose={() => setIsSubmitQAOpen(false)}
        onSuccess={handleSubmitQASuccess}
      />
    </div>
  );
};
