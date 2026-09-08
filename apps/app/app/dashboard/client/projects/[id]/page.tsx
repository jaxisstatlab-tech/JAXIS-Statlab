"use client";

import React, { useState, useEffect, useTransition, use } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  StatusBadge,
  Button,
  Alert,
  Modal,
  Toast,
  ConfirmDialog,
  CopyButton,
  LoadingState,
  Peso,
} from "@repo/ui";
import {
  Check,
  UploadSimple,
  CloudArrowUp,
  FileText,
  Database,
  ClipboardText,
  Receipt,
  Clock,
  ShieldCheck,
  Certificate,
  ChatCenteredText,
  DownloadSimple,
} from "@phosphor-icons/react";
import { getProjectById, deleteProjectFile, resolveMissingInfo, addProjectFile } from "@/features/projects/actions";
import { uploadFileToR2 } from "@/lib/storage-client";
import { ProjectFilesCard } from "@/features/projects/components/ProjectFilesCard";
import { getProjectDisplayStatus } from "@/lib/project-rules";
import type { ProjectDetailItem, ProjectFileItem } from "@/features/projects/schemas";
import type { FileCategory } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const CATEGORY_OPTIONS: {
  id: string;
  label: string;
  value: FileCategory;
  desc: string;
  accept: string;
  formatLabel: string;
}[] = [
  {
    id: "PROPOSAL",
    label: "Research Proposal",
    value: "RESEARCH_DOCUMENT",
    desc: "Chapters 1-3 manuscript (.pdf, .docx)",
    accept: ".pdf,.docx,.doc",
    formatLabel: "PDF, DOCX (Max 15MB)",
  },
  {
    id: "DATASET",
    label: "Raw Dataset",
    value: "DATASET",
    desc: "Excel (.xlsx), CSV, or SPSS data file",
    accept: ".xlsx,.xls,.csv,.sav,.dta",
    formatLabel: "XLSX, CSV, SPSS (.SAV) (Max 15MB)",
  },
  {
    id: "QUESTIONNAIRE",
    label: "Survey Questionnaire",
    value: "QUESTIONNAIRE",
    desc: "Survey instruments or interview guides",
    accept: ".pdf,.docx,.doc,.xlsx,.csv",
    formatLabel: "PDF, DOCX, XLSX (Max 15MB)",
  },
  {
    id: "SUPPLEMENTARY",
    label: "Supplementary Materials",
    value: "RESEARCH_DOCUMENT",
    desc: "Adviser notes, ethics approvals, or reference papers",
    accept: ".pdf,.docx,.doc,.xlsx,.csv,.zip",
    formatLabel: "PDF, DOCX, XLSX, ZIP (Max 15MB)",
  },
];

const PIPELINE_STAGES = [
  { id: "proposal", title: "1. Proposal & Quote", desc: "Pricing & scope" },
  { id: "sow", title: "2. Contract (SOW)", desc: "Signed agreement" },
  { id: "deposit", title: "3. Downpayment", desc: "Deposit to start" },
  { id: "analysis", title: "4. Analysis & QA", desc: "Statistical compute" },
  { id: "deliverables", title: "5. Deliverables", desc: "Final defense package" },
];

function getPipelineStageIndex(status: string): number {
  switch (status) {
    case "NEW_REQUEST":
    case "AWAITING_INFORMATION":
    case "UNDER_EVALUATION":
    case "QUOTE_SENT":
      return 0;
    case "CLIENT_APPROVED":
    case "SOW_PENDING":
      return 1;
    case "SOW_SIGNED":
    case "AWAITING_PAYMENT":
      return 2;
    case "ACTIVE":
    case "EXPERT_ASSIGNED":
    case "IN_PROGRESS":
    case "SLA_PAUSED":
    case "SCOPE_CREEP_HALTED":
    case "REASSIGNMENT_NEEDED":
    case "REVISION_REQUESTED":
    case "FOR_QA":
    case "QA_REVISION":
      return 3;
    case "DELIVERED":
    case "CLOSED":
      return 4;
    default:
      return 0;
  }
}

function formatRegion(regionCode?: string | null): string {
  if (!regionCode) return "Not Specified";
  const map: Record<string, string> = {
    NCR: "National Capital Region (NCR)",
    CAR: "Cordillera Administrative Region (CAR)",
    REGION_1: "Region I – Ilocos Region",
    REGION_2: "Region II – Cagayan Valley",
    REGION_3: "Region III – Central Luzon",
    REGION_4A: "Region IV-A – CALABARZON",
    REGION_4B: "Region IV-B – MIMAROPA",
    REGION_5: "Region V – Bicol Region",
    REGION_6: "Region VI – Western Visayas",
    REGION_7: "Region VII – Central Visayas",
    REGION_8: "Region VIII – Eastern Visayas",
    REGION_9: "Region IX – Zamboanga Peninsula",
    REGION_10: "Region X – Northern Mindanao",
    REGION_11: "Region XI – Davao Region",
    REGION_12: "Region XII – SOCCSKSARGEN",
    REGION_13: "Region XIII – Caraga",
    BARMM: "BARMM – Bangsamoro",
  };
  return map[regionCode] || regionCode.replace(/_/g, " ");
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "DATASET":
      return {
        icon: <Database size={16} weight="fill" className="text-white/70" />,
        tagLabel: "RAW DATASET",
      };
    case "QUESTIONNAIRE":
      return {
        icon: <ClipboardText size={16} weight="fill" className="text-white/70" />,
        tagLabel: "SURVEY INSTRUMENT",
      };
    default:
      return {
        icon: <FileText size={16} weight="fill" className="text-white/70" />,
        tagLabel: "RESEARCH DOCUMENT",
      };
  }
}



export default function ClientProjectDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<ProjectDetailItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "success" | "danger" | "info";
  } | null>(null);

  // File deletion & resolution state
  const [fileToDelete, setFileToDelete] = useState<ProjectFileItem | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isResolving, startResolveTransition] = useTransition();

  // File Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("PROPOSAL");
  const [uploadCategory, setUploadCategory] = useState<FileCategory>("RESEARCH_DOCUMENT");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, startUploadTransition] = useTransition();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProject() {
      setIsLoading(true);
      setError(null);
      const res = await getProjectById(projectId);
      if (res.success) {
        setProject(res.data);
      } else {
        setError(res.error.message);
      }
      setIsLoading(false);
    }
    loadProject();
  }, [projectId]);

  const handleDeleteFile = () => {
    if (!fileToDelete || !project) return;

    startDeleteTransition(async () => {
      const res = await deleteProjectFile(project.id, fileToDelete.id);
      if (res.success) {
        setProject((prev) =>
          prev
            ? {
                ...prev,
                files: prev.files.filter((f) => f.id !== fileToDelete.id),
              }
            : null
        );
        setToastMessage({
          message: "File Removed",
          description: `"${fileToDelete.fileName}" was removed from your study.`,
          variant: "success",
        });
        setFileToDelete(null);
      } else {
        setToastMessage({
          message: "Failed to Remove File",
          description: res.error.message,
          variant: "danger",
        });
        setFileToDelete(null);
      }
    });
  };



  const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB Storage Defense Limit

  const validateUploadedFile = (
    file: File,
    categoryId: string
  ): { valid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size exceeds the 15MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please compress your file.`,
      };
    }

    const category = CATEGORY_OPTIONS.find((c) => c.id === categoryId);
    if (!category) return { valid: true };

    const allowedExtensions = category.accept
      .split(",")
      .map((ext) => ext.trim().toLowerCase());
    const fileName = file.name.toLowerCase();
    const lastDotIndex = fileName.lastIndexOf(".");
    const fileExt = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : "";

    const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isAllowed) {
      return {
        valid: false,
        error: `Invalid file format "${fileExt || "unknown"}". The "${category.label}" category requires: ${category.formatLabel.split(" (Max")[0]}.`,
      };
    }

    return { valid: true };
  };

  const handleCategorySelect = (optId: string, optValue: FileCategory) => {
    setSelectedCategoryId(optId);
    setUploadCategory(optValue);
    if (selectedUploadFile) {
      const validation = validateUploadedFile(selectedUploadFile, optId);
      if (!validation.valid) {
        setSelectedUploadFile(null);
        setUploadError(validation.error || null);
        setToastMessage({
          message: "File Format Incompatible",
          description: validation.error || "Please select a compatible file format.",
          variant: "danger",
        });
      } else {
        setUploadError(null);
      }
    } else {
      setUploadError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validation = validateUploadedFile(file, selectedCategoryId);
      if (!validation.valid) {
        setUploadError(validation.error || "Invalid file format.");
        setSelectedUploadFile(null);
        setToastMessage({
          message: "Upload Rejected",
          description: validation.error || "Selected file type is not supported.",
          variant: "danger",
        });
        return;
      }
      setSelectedUploadFile(file);
      setUploadError(null);
    }
  };

  const handleUploadFile = () => {
    if (!selectedUploadFile || !project) {
      setUploadError("Please select a file to upload.");
      return;
    }

    if (selectedUploadFile.size > MAX_FILE_SIZE_BYTES) {
      setUploadError("File exceeds maximum allowed limit of 15MB. Please compress or optimize your dataset/document.");
      return;
    }

    setUploadError(null);
    startUploadTransition(async () => {
      // 1. Upload the physical binary directly to Cloudflare R2
      const uploadRes = await uploadFileToR2(selectedUploadFile, uploadCategory, project.intakeId);
      if (!uploadRes.success || !uploadRes.data) {
        setUploadError(uploadRes.error?.message || "Failed to upload file to Cloudflare storage.");
        return;
      }

      // 2. Attach record into Supabase with the permanent Cloudflare storage URL
      const res = await addProjectFile(project.id, {
        fileName: selectedUploadFile.name,
        filePath: uploadRes.data.publicUrl,
        fileType: selectedUploadFile.type || "application/octet-stream",
        fileCategory: uploadCategory,
      });

      if (res.success) {
        setProject((prev) =>
          prev
            ? {
                ...prev,
                files: [...prev.files, res.data],
              }
            : null
        );
        setToastMessage({
          message: "File Uploaded",
          description: `"${selectedUploadFile.name}" has been added to your study.`,
          variant: "success",
        });
        setSelectedUploadFile(null);
        setIsUploadModalOpen(false);
      } else {
        setUploadError(res.error.message);
      }
    });
  };

  const handleResolveMissingInfo = () => {
    if (!project) return;
    setError(null);
    startResolveTransition(async () => {
      const res = await resolveMissingInfo(project.id);
      if (res.success) {
        setProject(res.data);
        setToastMessage({
          message: "Information Submitted",
          description: "Your files have been sent to the research team for review.",
          variant: "success",
        });
      } else {
        setError(res.error.message);
        setToastMessage({
          message: "Submission Failed",
          description: res.error.message,
          variant: "danger",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading Study Inspection Desk..."
          description="Retrieving analytical scope, datasets, and milestone progress."
        />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20 w-full animate-content-fade">
        <div className="flex items-center gap-2 text-xs font-mono text-white/40">
          <Link href="/dashboard/client/projects" className="hover:text-white transition-colors">← Back to My Studies</Link>
        </div>
        <Card className="p-8 text-center flex flex-col items-center gap-4 bg-[#01142B]/90 border-white/[0.08]">
          <p className="text-sm text-red-400 font-mono">
            {error || "The requested research project could not be found or you lack permission to view it."}
          </p>
          <Link href="/dashboard/client/projects">
            <Button variant="secondary" size="md">
              ← Return to Projects Registry
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isPreSow =
    project.masterStatus === "NEW_REQUEST" ||
    project.masterStatus === "AWAITING_INFORMATION" ||
    project.masterStatus === "UNDER_EVALUATION" ||
    project.masterStatus === "QUOTE_SENT" ||
    project.masterStatus === "CLIENT_APPROVED" ||
    project.masterStatus === "SOW_PENDING";

  return (
    <div
      data-portal="client"
      className="flex flex-col gap-8 max-w-7xl mx-auto pb-20 w-full animate-content-fade"
    >
      <PageHeader
        title={project.researchTitle}
        description={`Study ID: ${project.intakeId} · Primary Client: ${project.client.fullName} · Submitted ${new Date(
          project.createdAt
        ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at ${new Date(
          project.createdAt
        ).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`}
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Client Portal", href: "/dashboard/client" },
          { label: "Projects", href: "/dashboard/client/projects" },
          { label: project.intakeId },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/client/projects/${project.id}/messages`}>
              <Button
                variant="primary"
                size="sm"
                className="cursor-pointer text-xs font-semibold rounded-[2px] active:scale-[0.97] transition-transform bg-[#CC6600] hover:bg-[#E67300] text-white shadow-sm"
              >
                <ChatCenteredText size={15} weight="fill" className="mr-1.5" />
                <span>Messages & Chat</span>
              </Button>
            </Link>
            <Link href="/dashboard/client/projects">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-[2px] active:scale-[0.97] transition-transform text-xs font-sans"
              >
                ← Back to My Studies
              </Button>
            </Link>
          </div>
        }
      />

      {error && <Alert variant="danger">{error}</Alert>}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* ── Status Action Bar with 5-Stage Study Pipeline ── */}
      {(() => {
        const currentPipelineStage = getPipelineStageIndex(project.masterStatus);

        return (
          <Card
            className="overflow-hidden border border-white/10 bg-[#01142B] rounded-[2px] shadow-lg flex flex-col gap-4 p-5 sm:p-6 animate-card-reveal stagger-1"
          >
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-sans text-white/60 font-semibold tracking-wider uppercase">
                    Status:
                  </span>
                  {(() => {
                    const displayStatus = getProjectDisplayStatus(project);
                    return (
                      <StatusBadge
                        status={displayStatus.status}
                        label={displayStatus.label}
                        pulse={displayStatus.pulse}
                      />
                    );
                  })()}
                  <CopyButton
                    variant="badge"
                    value={project.intakeId}
                    label={project.intakeId}
                    onCopy={() =>
                      setToastMessage({
                        message: "Copied to Clipboard",
                        description: `Study ID "${project.intakeId}" has been copied to your clipboard.`,
                        variant: "info",
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {project.masterStatus === "QUOTE_SENT" && (
                  <Link href={`/dashboard/client/projects/${project.id}/quote`}>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs font-sans font-semibold whitespace-nowrap flex items-center gap-1.5 bg-[#CC6600] text-white hover:bg-[#E67300] rounded-[2px] active:scale-[0.97] transition-transform shadow-md"
                    >
                      <Receipt size={14} weight="fill" />
                      <span>Review Quote →</span>
                    </Button>
                  </Link>
                )}

                {project.masterStatus === "CLIENT_APPROVED" && (
                  <Link href={`/dashboard/client/projects/${project.id}/quote`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs font-sans whitespace-nowrap flex items-center gap-1.5 rounded-[2px] active:scale-[0.97] transition-transform"
                    >
                      <FileText size={14} weight="fill" />
                      <span>View Quote</span>
                    </Button>
                  </Link>
                )}

                {project.masterStatus === "SOW_PENDING" && (
                  <Link href={`/dashboard/client/projects/${project.id}/sow`}>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs font-sans font-semibold whitespace-nowrap flex items-center gap-1.5 bg-[#CC6600] text-white hover:bg-[#E67300] rounded-[2px] active:scale-[0.97] transition-transform shadow-md"
                    >
                      <FileText size={14} weight="fill" />
                      <span>Review &amp; Sign Contract →</span>
                    </Button>
                  </Link>
                )}

                {(project.masterStatus === "SOW_SIGNED" ||
                  project.masterStatus === "AWAITING_PAYMENT" ||
                  project.masterStatus === "ACTIVE" ||
                  project.masterStatus === "EXPERT_ASSIGNED" ||
                  project.masterStatus === "IN_PROGRESS") && (
                  <Link href={`/dashboard/client/projects/${project.id}/sow`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs font-sans whitespace-nowrap flex items-center gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 rounded-[2px] active:scale-[0.97] transition-transform"
                    >
                      <ShieldCheck size={14} weight="fill" />
                      <span>View Signed Contract</span>
                    </Button>
                  </Link>
                )}

                {(project.masterStatus === "SOW_SIGNED" ||
                  project.masterStatus === "AWAITING_PAYMENT") && (
                  <Link href={`/dashboard/client/projects/${project.id}/payment`}>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs font-sans font-semibold whitespace-nowrap flex items-center gap-1.5 bg-[#CC6600] text-white hover:bg-[#E67300] rounded-[2px] active:scale-[0.97] transition-transform shadow-md"
                    >
                      <Receipt size={14} weight="fill" />
                      <span>Proceed to Payment →</span>
                    </Button>
                  </Link>
                )}

                {(project.masterStatus === "ACTIVE" ||
                  project.masterStatus === "EXPERT_ASSIGNED" ||
                  project.masterStatus === "IN_PROGRESS") && (
                  <Link href={`/dashboard/client/projects/${project.id}/payment`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs font-sans whitespace-nowrap flex items-center gap-1.5 rounded-[2px] active:scale-[0.97] transition-transform"
                    >
                      <Receipt size={14} weight="fill" />
                      <span>Payment History</span>
                    </Button>
                  </Link>
                )}

                {isPreSow && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUploadFile(null);
                      setUploadError(null);
                      setIsUploadModalOpen(true);
                    }}
                    className="text-xs font-sans whitespace-nowrap flex items-center gap-1.5 rounded-[2px] active:scale-[0.97] transition-transform"
                  >
                    <UploadSimple size={14} weight="bold" />
                    <span>Attach File</span>
                  </Button>
                )}
              </div>
            </div>

            {/* ── 5-Stage Visual Study Pipeline Stepper ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-white/[0.06]">
              {PIPELINE_STAGES.map((stg, i) => {
                const isCompleted = i < currentPipelineStage;
                const isCurrent = i === currentPipelineStage;

                return (
                  <div
                    key={stg.id}
                    className={`p-3 rounded-[2px] border transition-all flex flex-col justify-between gap-1.5 ${
                      isCurrent
                        ? "bg-[#011C38] border-[#CC6600]/80 shadow-md ring-1 ring-[#CC6600]/40"
                        : isCompleted
                        ? "bg-emerald-500/[0.04] border-emerald-500/25 text-white/80"
                        : "bg-white/[0.01] border-white/[0.06] text-white/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                          isCurrent
                            ? "bg-[#CC6600] text-white"
                            : isCompleted
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : "bg-white/[0.05] text-white/40 border border-white/10"
                        }`}
                      >
                        {isCompleted ? <Check size={12} weight="bold" /> : i + 1}
                      </span>

                      <span className="text-[9px] font-mono tracking-wider uppercase font-semibold">
                        {isCompleted ? (
                          <span className="text-emerald-400">Done</span>
                        ) : isCurrent ? (
                          <span className="text-[#FFA040] animate-pulse">Active</span>
                        ) : (
                          <span className="text-white/30">Next</span>
                        )}
                      </span>
                    </div>

                    <div>
                      <h4
                        className={`text-xs font-sans font-semibold leading-snug ${
                          isCurrent ? "text-white" : isCompleted ? "text-white/90" : "text-white/40"
                        }`}
                      >
                        {stg.title}
                      </h4>
                      <p className="text-[10px] font-sans text-white/50 mt-0.5 line-clamp-1">
                        {stg.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* ── SOW Pending Execution Banner (if SOW_PENDING) ── */}
      {project.masterStatus === "SOW_PENDING" && (
        <Card className="p-6 sm:p-7 bg-[#01142B] border border-amber-500/30 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-xl animate-card-reveal stagger-2">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-[2px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Certificate size={20} weight="fill" className="text-amber-400" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-sans text-amber-400 font-semibold uppercase tracking-wider block">
                Action Required · Statement of Work Ready for Signature
              </span>
              <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                Your formal Statement of Work contract has been prepared. Review the research objectives, turnaround days, and payment milestones to digitally sign.
              </p>
            </div>
          </div>
          <Link href={`/dashboard/client/projects/${project.id}/sow`}>
            <Button
              variant="primary"
              size="md"
              className="font-sans font-semibold text-xs min-h-[38px] bg-[#CC6600] hover:bg-[#E67300] text-white whitespace-nowrap px-5 py-2 rounded-[2px] active:scale-[0.97] transition-transform shadow-md"
            >
              Review &amp; Sign Contract →
            </Button>
          </Link>
        </Card>
      )}

      {/* ── Awaiting Payment Deposit Banner (if SOW_SIGNED or AWAITING_PAYMENT) ── */}
      {(project.masterStatus === "SOW_SIGNED" || project.masterStatus === "AWAITING_PAYMENT") && (
        project.hasPendingPaymentVerification || project.latestPaymentStatus === "PROOF_SUBMITTED" ? (
          <Card className="p-6 sm:p-7 bg-[#01142B] border border-sky-500/40 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-xl animate-card-reveal stagger-2">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-[2px] bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                <Clock size={20} weight="fill" className="text-sky-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-sans text-sky-400 font-semibold uppercase tracking-wider block">
                  Deposit Proof Submitted · Awaiting Verification
                </span>
                <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                  Your payment receipt has been submitted and is currently being verified by our finance team. Once confirmed, research assignment will activate automatically.
                </p>
              </div>
            </div>
            <Link href={`/dashboard/client/projects/${project.id}/payment`}>
              <Button
                variant="secondary"
                size="md"
                className="font-sans font-semibold text-xs min-h-[38px] whitespace-nowrap px-5 py-2 rounded-[2px] active:scale-[0.97] transition-transform"
              >
                Inspect Payment Desk →
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="p-6 sm:p-7 bg-[#01142B] border border-[#CC6600]/40 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-xl animate-card-reveal stagger-2">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center shrink-0">
                <Receipt size={20} weight="fill" className="text-[#FFA040]" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-sans text-[#FFA040] font-semibold uppercase tracking-wider block">
                  Deposit Required · Downpayment Verification
                </span>
                <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                  Your Statement of Work is signed. Transfer your agreed downpayment via GCash or Bank Deposit and submit the receipt to begin data analysis.
                </p>
              </div>
            </div>
            <Link href={`/dashboard/client/projects/${project.id}/payment`}>
              <Button
                variant="primary"
                size="md"
                className="font-sans font-semibold text-xs min-h-[38px] bg-[#CC6600] hover:bg-[#FFA040] text-white whitespace-nowrap px-5 py-2 rounded-[2px] active:scale-[0.97] transition-transform shadow-md"
              >
                Proceed to Payment →
              </Button>
            </Link>
          </Card>
        )
      )}

      {/* ── Pending Assignment Banner (if ACTIVE) ── */}
      {project.masterStatus === "ACTIVE" && (
        <Card className="p-6 sm:p-7 bg-[#01142B] border border-sky-500/40 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-[2px] bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Clock size={20} weight="fill" className="text-sky-400" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-sans text-sky-400 font-semibold uppercase tracking-wider block">
                Payment Confirmed · Assigning Lead Statistician &amp; QA Lead
              </span>
              <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                Your downpayment has been confirmed. Our team is assigning your Lead Statistician and Senior QA Lead to begin research analysis.
              </p>
            </div>
          </div>
          <Link href={`/dashboard/client/projects/${project.id}/payment`}>
            <Button
              variant="secondary"
              size="md"
              className="font-sans font-semibold text-xs min-h-[38px] whitespace-nowrap px-5 py-2 rounded-[2px] active:scale-[0.97] transition-transform"
            >
              View Payment History →
            </Button>
          </Link>
        </Card>
      )}

      {/* ── Deliverables Released or Payment Locked Banner (if DELIVERED or REVISION_REQUESTED) ── */}
      {(project.masterStatus === "DELIVERED" || project.masterStatus === "REVISION_REQUESTED") && (
        project.financialSummary && !project.financialSummary.isFullyPaid && project.financialSummary.remainingBalance > 0 ? (
          <Card className="p-6 sm:p-7 bg-[#01142B] border border-amber-500/40 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-xl animate-content-fade">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-[2px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Receipt size={20} weight="fill" className="text-amber-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-sans text-amber-400 font-semibold uppercase tracking-wider block">
                  Outputs Verified by QA · Final Payment Required to Unlock Deliverables
                </span>
                <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                  Your statistical findings and official reports have been verified by our Senior QA Lead. Settle your remaining balance of <span className="font-mono font-bold text-white"><Peso />{project.financialSummary.remainingBalance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span> to immediately unlock your download links.
                </p>
              </div>
            </div>
            <Link href={`/dashboard/client/projects/${project.id}/payment`}>
              <Button
                variant="primary"
                size="md"
                className="font-sans font-semibold text-xs min-h-[38px] bg-[#CC6600] hover:bg-[#E67300] text-white whitespace-nowrap px-5 py-2 rounded-[2px] active:scale-[0.97] transition-transform cursor-pointer shadow-md"
              >
                <Receipt size={15} weight="fill" className="mr-1.5" />
                <span>Proceed to Payment →</span>
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="p-6 sm:p-7 bg-[#01142B] border border-emerald-500/40 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-xl animate-content-fade">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-[2px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} weight="fill" className="text-emerald-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-sans text-emerald-400 font-semibold uppercase tracking-wider block">
                  Research Study Complete · Final Deliverables Available
                </span>
                <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                  Your statistical findings, cleaned datasets, and official reports have been verified and released. Access your downloads and the 3-day revision window.
                </p>
              </div>
            </div>
            <Link href={`/dashboard/client/projects/${project.id}/deliverables`}>
              <Button
                variant="primary"
                size="md"
                className="font-sans font-semibold text-xs min-h-[38px] bg-[#CC6600] hover:bg-[#E67300] text-white whitespace-nowrap px-5 py-2 rounded-[2px] active:scale-[0.97] transition-transform cursor-pointer shadow-md"
              >
                <DownloadSimple size={15} weight="bold" className="mr-1.5" />
                <span>Download Deliverables →</span>
              </Button>
            </Link>
          </Card>
        )
      )}

      {/* ── Missing Information Banner (if AWAITING_INFORMATION) ── */}
      {project.masterStatus === "AWAITING_INFORMATION" && (
        <Card className="p-5 bg-amber-500/[0.04] border-l-4 border-l-amber-500 rounded-[2px] flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span className="text-xs font-mono text-amber-400 font-bold uppercase">
              Action Needed · Missing Information:
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleResolveMissingInfo}
              loading={isResolving}
              className="text-xs font-sans font-semibold rounded-[2px] active:scale-[0.97] transition-transform bg-[#CC6600] hover:bg-[#E67300] text-white shadow-sm"
            >
              Submit Files &amp; Continue →
            </Button>
          </div>
          <p className="text-xs text-white/90 leading-relaxed font-sans bg-black/30 p-4 rounded-[2px] border border-white/[0.08]">
            &ldquo;{project.missingInfoReason || "Please review and attach the requested dataset or questionnaire."}&rdquo;
          </p>
        </Card>
      )}

      {/* ── Main Inspection Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-card-reveal stagger-3">
        {/* Left 2 Cols: Research Content, Quote & Scope, & Datasets */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Price Quote & Scope Card */}
          {(project.masterStatus === "QUOTE_SENT" || project.masterStatus === "CLIENT_APPROVED") && (
            <Card className="p-6 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Receipt size={18} weight="fill" className="text-[#CC6600]" />
                  <h3 className="text-sm font-bold text-white font-sans">
                    Price Quote &amp; Scope
                  </h3>
                </div>
                <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded-[2px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                  {project.masterStatus === "CLIENT_APPROVED" ? "Accepted" : "Ready for Review"}
                </span>
              </div>
              <p className="text-xs text-white/75 font-sans leading-relaxed">
                {project.masterStatus === "CLIENT_APPROVED"
                  ? "Your quote has been accepted. You will be notified when your formal Statement of Work contract is ready for digital signature."
                  : "Our team has prepared your customized analytical scope and schedule. Review and accept your quote to assign your dedicated statistician."}
              </p>
              <div className="pt-1">
                <Link href={`/dashboard/client/projects/${project.id}/quote`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-sans text-xs font-semibold bg-[#CC6600] hover:bg-[#E67300] text-white rounded-[2px] active:scale-[0.97] transition-transform shadow-md"
                  >
                    {project.masterStatus === "CLIENT_APPROVED" ? "View Quote Details →" : "Review & Accept Quote →"}
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Research Problem & Analytical Scope */}
          <Card className="p-6 md:p-8 flex flex-col gap-6">
            <div className="border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white font-sans">
                Research Problem &amp; Analytical Scope
              </h3>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono uppercase text-white/40 font-bold">
                Statement of the Problem / Key Questions
              </span>
              <div
                className="p-4 rounded-[2px] bg-[#011C38] border border-white/[0.08] text-xs text-white/90 whitespace-pre-line leading-relaxed font-sans"
                style={{ padding: "1rem" }}
              >
                {project.researchQuestions || (
                  <span className="italic text-white/40">No specific research questions provided yet.</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono uppercase text-white/40 font-bold">
                Core Research Objectives
              </span>
              <div
                className="p-4 rounded-[2px] bg-[#011C38] border border-white/[0.08] text-xs text-white/90 whitespace-pre-line leading-relaxed font-sans"
                style={{ padding: "1rem" }}
              >
                {project.researchObjectives || (
                  <span className="italic text-white/40">No specific research objectives provided yet.</span>
                )}
              </div>
            </div>

            {project.hypotheses && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-mono uppercase text-white/40 font-bold">
                  Theoretical Hypotheses
                </span>
                <div
                  className="p-4 rounded-[2px] bg-[#011C38] border border-white/[0.08] text-xs text-white/90 whitespace-pre-line leading-relaxed font-sans"
                  style={{ padding: "1rem" }}
                >
                  {project.hypotheses}
                </div>
              </div>
            )}
          </Card>

          {/* Attached Research Documents & Datasets */}
          <ProjectFilesCard
            files={project.files}
            studyId={project.intakeId}
            canDelete={isPreSow}
            onDeleteFile={(file) => setFileToDelete(file)}
          />
        </div>

        {/* Right Col: Client Institutional Identity & Audit Telemetry */}
        <div className="flex flex-col gap-6">
          <Card className="p-6 flex flex-col gap-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-sky-400 font-bold border-b border-white/[0.08] pb-2">
              Client &amp; Academic Profile
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <span className="text-white/40 block">Full Name</span>
                <span className="text-white font-semibold font-sans">{project.client.fullName}</span>
              </div>

              <div>
                <span className="text-white/40 block">Email Address</span>
                <span className="text-white font-mono">{project.client.email}</span>
              </div>

              {project.client.clientProfile ? (
                <>
                  <div>
                    <span className="text-white/40 block">University / School</span>
                    <span className="text-white font-semibold font-sans">
                      {project.client.clientProfile.institutionSchool}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Academic Degree / Program</span>
                    <span className="text-white font-semibold font-sans">
                      {project.client.clientProfile.academicProgram}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Contact Number</span>
                    <span className="text-white font-mono">
                      {project.client.clientProfile.contactNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Philippine Region</span>
                    <span className="text-white font-semibold font-sans">
                      {formatRegion(project.client.clientProfile.region)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[2px] text-amber-300 text-xs font-sans">
                  Academic profile details not registered yet.
                </div>
              )}
            </div>
          </Card>

          {/* Study Information Summary */}
          <Card className="p-6 flex flex-col gap-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-white/50 font-bold border-b border-white/[0.08] pb-2">
              Study Information
            </h3>
            <div className="flex flex-col gap-2.5 text-xs font-mono text-white/60">
              <div className="flex justify-between items-center gap-2">
                <span>Created:</span>
                <span className="text-white text-right">
                  {new Date(project.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })},{" "}
                  {new Date(project.createdAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span>Last Modified:</span>
                <span className="text-white text-right">
                  {new Date(project.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })},{" "}
                  {new Date(project.updatedAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span>Target Deadline:</span>
                <span className="text-amber-400 font-mono font-medium text-right">
                  {new Date(project.deadlineRequested).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Dispute Flag:</span>
                <span className={project.hasActiveDispute ? "text-red-400" : "text-emerald-400"}>
                  {project.hasActiveDispute ? "Active Dispute" : "Clean"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <ConfirmDialog
          open={Boolean(fileToDelete)}
          onCancel={() => setFileToDelete(null)}
          title="Remove Attached Document"
          description={`Are you sure you want to remove "${fileToDelete.fileName}" from this study?`}
          confirmLabel="Remove File"
          confirmVariant="destructive"
          loading={isDeleting}
          onConfirm={handleDeleteFile}
        />
      )}

      {/* File Upload Modal */}
      {isUploadModalOpen && (
        <Modal
          open={isUploadModalOpen}
          onClose={() => {
            if (!isUploading) {
              setIsUploadModalOpen(false);
              setSelectedUploadFile(null);
              setUploadError(null);
            }
          }}
          title="Upload Research Document or Dataset"
          description="Attach manuscripts, questionnaires, or raw datasets to your study."
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isUploading}
                className="font-sans text-xs rounded-[2px] active:scale-[0.97] transition-all"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUploadFile}
                loading={isUploading}
                disabled={!selectedUploadFile || isUploading}
                className="font-sans text-xs font-semibold rounded-[2px] active:scale-[0.97] transition-all bg-[#CC6600] hover:bg-[#E67300] text-white shadow-md"
              >
                Upload &amp; Attach File →
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-6 text-xs font-sans">
            {uploadError && <Alert variant="danger">{uploadError}</Alert>}

            {/* Step 1: Category Selector */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-[2px] bg-white/[0.08] text-white font-mono text-[0.625rem] font-semibold">
                    1
                  </span>
                  <label className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                    Document Type
                  </label>
                </div>
                <span className="text-[0.625rem] font-mono uppercase text-white/40 font-medium">Required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORY_OPTIONS.map((opt) => {
                  const isSelected = selectedCategoryId === opt.id;
                  const categoryMeta = getCategoryIcon(opt.value);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleCategorySelect(opt.id, opt.value)}
                      className={`p-3.5 sm:p-4 rounded-[2px] border text-left transition-all flex items-start gap-3.5 cursor-pointer group active:scale-[0.98] ${
                        isSelected
                          ? "bg-[#CC6600]/15 border-[#CC6600] text-white shadow-sm ring-1 ring-[#CC6600]/50"
                          : "bg-white/[0.02] border-white/[0.08] text-white/70 hover:bg-white/[0.05] hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <div
                        className={`h-9 w-9 rounded-[2px] flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? "bg-[#CC6600]/25 text-[#FFA040]"
                            : "bg-white/[0.04] text-white/50 group-hover:text-white group-hover:bg-white/[0.08]"
                        }`}
                      >
                        {categoryMeta.icon}
                      </div>

                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-xs font-bold leading-snug">
                            {opt.label}
                          </span>
                          {isSelected && (
                            <Check size={15} weight="bold" className="text-emerald-400 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-[0.688rem] text-white/50 font-sans leading-relaxed">
                          {opt.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: File Selector */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-[2px] bg-white/[0.08] text-white font-mono text-[0.625rem] font-semibold">
                    2
                  </span>
                  <label className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                    Choose File
                  </label>
                </div>
                <span className="text-[0.625rem] font-mono uppercase text-white/40 font-medium">Max 15MB</span>
              </div>

              {selectedUploadFile ? (
                /* Staged File Progress Card */
                <div className="p-4 sm:p-5 rounded-[2px] bg-[#01142B] border border-[#CC6600]/80 flex flex-col justify-between min-h-[140px] shadow-lg relative overflow-hidden group">
                  {/* Top Row: File Icon + Name + 100% Badge */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#FFA040] flex-shrink-0">
                        <FileText size={16} weight="fill" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono text-xs font-bold text-white truncate" title={selectedUploadFile.name}>
                          {selectedUploadFile.name}
                        </span>
                        <span className="text-[0.625rem] font-mono text-white/50">
                          {selectedUploadFile.size < 1024
                            ? `${selectedUploadFile.size} Bytes`
                            : selectedUploadFile.size < 1024 * 1024
                            ? `${(selectedUploadFile.size / 1024).toFixed(1)} KB`
                            : `${(selectedUploadFile.size / (1024 * 1024)).toFixed(2)} MB`}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/35 text-[#FFA040] font-mono text-xs font-bold tracking-wider flex-shrink-0">
                      100%
                    </span>
                  </div>

                  {/* Bottom Group: Progress Bar + Status Footer */}
                  <div className="flex flex-col gap-2.5 mt-auto pt-4">
                    <div className="w-full bg-[#000D1A] h-2 rounded-[1px] overflow-hidden border border-white/10 p-[1px] flex items-center">
                      <div
                        className="bg-[#CC6600] h-full rounded-[1px] transition-all duration-300 w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="font-semibold text-emerald-300 text-[0.6875rem]">
                          {isUploading ? "Uploading..." : "Ready to upload"}
                        </span>
                      </div>
                      {!isUploading && (
                        <button
                          type="button"
                          onClick={() => setSelectedUploadFile(null)}
                          className="px-2.5 py-0.5 rounded-[2px] text-[0.6875rem] font-sans font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer active:scale-[0.97]"
                        >
                          Change
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Interactive Drag & Drop Box */
                <div
                  onDragEnter={handleDragOver}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed transition-all py-12 sm:py-14 px-6 min-h-[200px] rounded-[2px] flex flex-col items-center justify-center gap-4 cursor-pointer text-center group select-none active:scale-[0.99] ${
                    isDragging
                      ? "border-[#CC6600] bg-[#CC6600]/10 ring-2 ring-[#CC6600]/40 scale-[1.01]"
                      : "border-white/20 hover:border-white/40 bg-white/[0.01] hover:bg-white/[0.03]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={
                      CATEGORY_OPTIONS.find((c) => c.id === selectedCategoryId)?.accept ||
                      ".pdf,.doc,.docx,.xls,.xlsx,.csv,.sav"
                    }
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const validation = validateUploadedFile(file, selectedCategoryId);
                        if (!validation.valid) {
                          setUploadError(validation.error || "Invalid file format.");
                          setSelectedUploadFile(null);
                          setToastMessage({
                            message: "Upload Rejected",
                            description: validation.error || "Selected file type is not supported.",
                            variant: "danger",
                          });
                          e.target.value = "";
                          return;
                        }
                        setSelectedUploadFile(file);
                        setUploadError(null);
                      }
                    }}
                  />

                  {/* Circular Cloud Icon */}
                  <div
                    className={`h-12 w-12 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
                      isDragging
                        ? "bg-[#CC6600]/20 border-[#CC6600] text-[#FFA040]"
                        : "bg-white/[0.05] border-white/[0.10] group-hover:border-white/20 text-white/60 group-hover:text-white"
                    }`}
                  >
                    <CloudArrowUp size={22} weight="fill" />
                  </div>

                  {/* Heading & Subtitle */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={`font-sans text-sm sm:text-base font-semibold tracking-wide transition-colors ${
                        isDragging ? "text-[#FFA040]" : "text-white"
                      }`}
                    >
                      {isDragging ? "Drop file to attach" : "Click to choose file or drag and drop"}
                    </span>
                    <span className="font-mono text-xs text-white/50">
                      {CATEGORY_OPTIONS.find((c) => c.id === selectedCategoryId)?.formatLabel ||
                        "PDF, DOCX, XLSX, CSV, SPSS (Max 15MB)"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
