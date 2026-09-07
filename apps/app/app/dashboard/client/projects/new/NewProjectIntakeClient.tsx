"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  Card,
  FormInput,
  FormTextarea,
  Button,
  FormFooter,
  Stepper,
  Toast,
  LoadingState,
} from "@repo/ui";
import {
  IconCheck,
  IconLock,
  IconFileText,
  IconDatabase,
  IconListCheck,
  IconCloudUpload,
  IconShieldCheck,
  IconArrowRight,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { createProject } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { QuickProfileModal } from "@/features/client-profile/components/QuickProfileModal";
import { uploadFileToR2 } from "@/lib/storage-client";
import type { FileCategory } from "@prisma/client";

interface UploadedFileItem {
  name: string;
  size: number;
  type: string;
  category: FileCategory;
  formattedSize: string;
  storageUrl?: string;
}

interface UploadProgressState {
  fileName: string;
  category: FileCategory;
  progress: number;
  formattedSize: string;
}



function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export interface InitialProfileData {
  institutionSchool?: string | null;
  academicProgram?: string | null;
  contactNumber?: string | null;
  region?: string | null;
}

interface NewProjectIntakeClientProps {
  initialProfile?: InitialProfileData | null;
}

export function NewProjectIntakeClient({ initialProfile = null }: NewProjectIntakeClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Wizard Step (1: Info, 2: Files, 3: Review)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Client Profile state
  const [profile, setProfile] = useState<{
    institutionSchool: string;
    academicProgram: string;
    contactNumber: string;
    region: string;
  } | null>(() => {
    if (initialProfile) {
      return {
        institutionSchool: initialProfile.institutionSchool || "",
        academicProgram: initialProfile.academicProgram || "",
        contactNumber: initialProfile.contactNumber || "",
        region: initialProfile.region || "",
      };
    }
    return null;
  });
  const [isProfileLoaded, setIsProfileLoaded] = useState(Boolean(initialProfile !== undefined));

  // Step 1: Research Information
  const [researchTitle, setResearchTitle] = useState("");
  const [researchQuestions, setResearchQuestions] = useState("");
  const [researchObjectives, setResearchObjectives] = useState("");
  const [hypotheses, setHypotheses] = useState("");
  const [deadlineRequested, setDeadlineRequested] = useState("");

  // Step 2: Uploaded Files & Uploading Progress
  const [filesList, setFilesList] = useState<UploadedFileItem[]>([]);
  const [uploadingState, setUploadingState] = useState<Partial<Record<FileCategory, UploadProgressState | null>>>({});

  // Step 3: Integrity declaration
  const [integrityAgreed, setIntegrityAgreed] = useState(false);

  // General errors & submission feedback
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [toast, setToast] = useState<{
    variant: "success" | "danger" | "warning" | "info";
    message: string;
    description?: string;
  } | null>(null);

  // Load client profile if not provided from server
  useEffect(() => {
    if (initialProfile === undefined) {
      async function loadProfile() {
        const p = await getClientProfile();
        if (p) {
          setProfile({
            institutionSchool: p.institutionSchool || "",
            academicProgram: p.academicProgram || "",
            contactNumber: p.contactNumber || "",
            region: p.region || "",
          });
        }
        setIsProfileLoaded(true);
      }
      loadProfile();
    }
  }, [initialProfile]);

  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);

  const isProfileComplete = Boolean(
    profile && profile.institutionSchool && profile.contactNumber
  );

  const handleProfileSuccess = async () => {
    const p = await getClientProfile();
    if (p) {
      setProfile({
        institutionSchool: p.institutionSchool || "",
        academicProgram: p.academicProgram || "",
        contactNumber: p.contactNumber || "",
        region: p.region || "",
      });
    }
    setToast({
      variant: "success",
      message: "Institutional Affiliation Verified",
      description: "Your academic credentials have been saved. Intake desk unlocked.",
    });
  };

  // Drag & drop active category tracking
  const [dragActiveCategory, setDragActiveCategory] = useState<FileCategory | null>(null);

  const CATEGORY_FILE_CONFIG: Partial<
    Record<
      FileCategory,
      { extensions: string[]; label: string; maxBytes: number }
    >
  > = {
    RESEARCH_DOCUMENT: {
      extensions: [".pdf", ".docx", ".doc"],
      label: "PDF, DOCX (Max 15MB)",
      maxBytes: 15 * 1024 * 1024,
    },
    DATASET: {
      extensions: [".xlsx", ".xls", ".csv", ".sav", ".dta", ".tsv"],
      label: "CSV, XLSX, XLS, SPSS (Max 15MB)",
      maxBytes: 15 * 1024 * 1024,
    },
    QUESTIONNAIRE: {
      extensions: [".pdf", ".docx", ".doc", ".xlsx", ".csv"],
      label: "PDF, DOCX, XLSX, CSV (Max 15MB)",
      maxBytes: 15 * 1024 * 1024,
    },
  };

  // Core File Processing Logic with strict format checker and animated progress bar
  const processFile = (file: File, category: FileCategory) => {
    const config = CATEGORY_FILE_CONFIG[category];
    if (!config) return;

    // Check slot-specific file extension
    const fileNameLower = file.name.toLowerCase();
    const lastDotIndex = fileNameLower.lastIndexOf(".");
    const fileExt = lastDotIndex !== -1 ? fileNameLower.substring(lastDotIndex) : "";

    const isAllowed = config.extensions.some((ext) => fileNameLower.endsWith(ext));

    if (!isAllowed) {
      setToast({
        variant: "danger",
        message: "Upload Rejected",
        description: `Invalid file format "${fileExt || "unknown"}". This slot only accepts: ${config.label.split(" (Max")[0]}.`,
      });
      return;
    }

    // Check file size
    if (file.size > config.maxBytes) {
      setToast({
        variant: "danger",
        message: "File Limit Exceeded",
        description: `File "${file.name}" exceeds the 15MB limit (${formatBytes(file.size)}). Please compress your file.`,
      });
      return;
    }

    // Start upload progress state
    setUploadingState((prev) => ({
      ...prev,
      [category]: {
        fileName: file.name,
        category,
        progress: 30,
        formattedSize: formatBytes(file.size),
      },
    }));

    (async () => {
      try {
        const uploadRes = await uploadFileToR2(file, category, "intake");
        if (!uploadRes.success || !uploadRes.data) {
          setUploadingState((prev) => ({ ...prev, [category]: null }));
          setToast({
            variant: "danger",
            message: "Cloudflare Upload Failed",
            description: uploadRes.error?.message || "Failed to upload file to Cloudflare storage.",
          });
          return;
        }

        const storageUrl = uploadRes.data.publicUrl;

        setUploadingState((prev) => ({
          ...prev,
          [category]: {
            fileName: file.name,
            category,
            progress: 100,
            formattedSize: formatBytes(file.size),
          },
        }));

        setTimeout(() => {
          const newFileItem: UploadedFileItem = {
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            category,
            formattedSize: formatBytes(file.size),
            storageUrl,
          };

          setFilesList((prev) => [
            ...prev.filter((f) => f.category !== category),
            newFileItem,
          ]);

          setUploadingState((prev) => ({
            ...prev,
            [category]: null,
          }));

          setToast({
            variant: "success",
            message: "File Uploaded to Cloudflare R2",
            description: `"${file.name}" is stored in cloud storage and attached.`,
          });
        }, 250);
      } catch (err) {
        setUploadingState((prev) => ({ ...prev, [category]: null }));
        setToast({
          variant: "danger",
          message: "Upload Error",
          description: (err as Error).message || "An unexpected error occurred while uploading.",
        });
      }
    })();
  };

  // File Input Change Handler
  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: FileCategory
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]!, category);
    }
    e.target.value = "";
  };

  // Drag & Drop Event Handlers
  const handleDragEnter = (e: React.DragEvent, category: FileCategory) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveCategory(category);
  };

  const handleDragOver = (e: React.DragEvent, category: FileCategory) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragActiveCategory !== category) {
      setDragActiveCategory(category);
    }
  };

  const handleDragLeave = (e: React.DragEvent, category: FileCategory) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragActiveCategory === category) {
      setDragActiveCategory(null);
    }
  };

  const handleDrop = (e: React.DragEvent, category: FileCategory) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveCategory(null);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]!, category);
    }
  };

  const removeFile = (category: FileCategory) => {
    const fileToRemove = filesList.find((f) => f.category === category);
    setFilesList((prev) => prev.filter((f) => f.category !== category));
    if (fileToRemove) {
      setToast({
        variant: "info",
        message: "File Removed",
        description: `"${fileToRemove.name}" was detached.`,
      });
    }
  };

  // Step 1 Validation
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: Record<string, string[]> = {};
    if (!researchTitle.trim() || researchTitle.trim().length < 3) {
      errors.researchTitle = ["Research title must be at least 3 characters."];
    }
    if (!researchQuestions.trim() || researchQuestions.trim().length < 5) {
      errors.researchQuestions = ["Please specify research questions (min 5 characters)."];
    }
    if (!researchObjectives.trim() || researchObjectives.trim().length < 5) {
      errors.researchObjectives = ["Please specify research objectives (min 5 characters)."];
    }
    if (!deadlineRequested) {
      errors.deadlineRequested = ["Target completion deadline is required."];
    } else {
      const selected = new Date(deadlineRequested);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected <= today) {
        errors.deadlineRequested = ["Target deadline must be in the future."];
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setToast({
        variant: "danger",
        message: "Form Validation Incomplete",
        description: "Please fill out all required research fields before proceeding.",
      });
      return;
    }

    setCurrentStep(2);
  };

  // Step 2 Proceed
  const handleProceedToStep3 = () => {
    const hasResearchDoc = filesList.some((f) => f.category === "RESEARCH_DOCUMENT");
    const hasDataset = filesList.some((f) => f.category === "DATASET");

    if (!hasResearchDoc) {
      setToast({
        variant: "warning",
        message: "Missing Manuscript Draft",
        description: "Please attach your Draft Manuscript (Chapters 1–3) to proceed.",
      });
      return;
    }
    if (!hasDataset) {
      setToast({
        variant: "warning",
        message: "Missing Dataset File",
        description: "Please attach your Data File (Excel / CSV / SPSS) to proceed.",
      });
      return;
    }

    setCurrentStep(3);
  };

  // Step 3 Final Submission
  const handleFinalSubmit = () => {
    if (isPending) return;
    if (!integrityAgreed) {
      const covenantMsg = "You must agree to the academic authorship & confidentiality statement before submitting.";
      setToast({
        variant: "warning",
        message: "Academic Covenant Required",
        description: covenantMsg,
      });
      return;
    }

    startTransition(async () => {
      const payload = {
        researchTitle: researchTitle.trim(),
        researchQuestions: researchQuestions.trim(),
        researchObjectives: researchObjectives.trim(),
        hypotheses: hypotheses.trim() || null,
        deadlineRequested,
        chapters13: filesList.find((f) => f.category === "RESEARCH_DOCUMENT")?.storageUrl || null,
        questionnaire: filesList.find((f) => f.category === "QUESTIONNAIRE")?.storageUrl || null,
        files: filesList.map((f) => ({
          fileName: f.name,
          filePath: f.storageUrl || `intake-uploads/${f.name}`,
          fileType: f.type,
          fileCategory: f.category,
        })),
      };

      const res = await createProject(payload);

      if (!res.success) {
        const errorMsg = res.error.message || "Failed to submit project intake. Please review form entries.";
        if (res.error.fieldErrors) {
          setFieldErrors(res.error.fieldErrors);
        }
        setToast({
          variant: "danger",
          message: "Intake Submission Failed",
          description: errorMsg,
        });
        return;
      }

      const assignedId = res.data.intakeId;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("jaxis:study-updated"));
      }
      router.push(`/dashboard/client?created=true&intakeId=${encodeURIComponent(assignedId)}`);
    });
  };

  // Prevent Flash of Unverified Content while profile verification is resolving
  if (!isProfileLoaded) {
    return (
      <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
        <PageHeader
          title="New Research Project Intake"
          description="Formal submission desk for academic theses and quantitative dissertations."
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "Client Portal", href: "/dashboard/client" },
            { label: "New Project" },
          ]}
        />
        <Card
          className="p-8 border-l-4 border-l-[#CC6600]/60 min-h-[220px] bg-[#011B38]/40 border-white/[0.08]"
          contentClassName="items-center justify-center h-full"
        >
          <LoadingState
            variant="card"
            label="Verifying profile..."
            description="Checking your academic affiliation details"
            className="min-h-0 p-0 h-full justify-center"
          />
        </Card>
      </div>
    );
  }

  if (!isProfileComplete) {
    return (
      <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
        {toast && (
          <Toast
            variant={toast.variant}
            message={toast.message}
            description={toast.description}
            onClose={() => setToast(null)}
          />
        )}

        <PageHeader
          title="New Research Project Intake"
          description="Formal submission desk for academic theses and quantitative dissertations."
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "Client Portal", href: "/dashboard/client" },
            { label: "New Project" },
          ]}
        />

        <Card className="p-8 border-l-4 border-l-[#CC6600] flex flex-col justify-between min-h-[220px] gap-5 bg-[#011B38]/40 border-white/[0.08]">
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-sans">
              Institutional Profile Verification Required
            </h2>
            <p className="text-sm text-white/70 leading-relaxed font-sans max-w-2xl">
              You must complete your institutional affiliation details (university, academic program, contact number, and region) before you can submit research project intake forms.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsQuickModalOpen(true)}
              className="font-mono text-xs font-bold tracking-wider"
            >
              COMPLETE PROFILE →
            </Button>
            <Link
              href="/dashboard/client/profile"
              className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors font-sans py-1.5"
            >
              <span>Full Profile Settings</span>
              <IconArrowRight size={13} stroke={1.5} />
            </Link>
          </div>
        </Card>

        {/* Quick Setup Modal */}
        <QuickProfileModal
          isOpen={isQuickModalOpen}
          onClose={() => setIsQuickModalOpen(false)}
          onSuccess={handleProfileSuccess}
          initialData={profile || undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title="New Research Project Intake"
        description="Submit your thesis or research study for review, statistical planning, and pricing."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Client Portal", href: "/dashboard/client" },
          { label: "New Intake" },
        ]}
      />

      {/* ── Stepper Navigation ── */}
      <Stepper
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step === 1 || step === 2 || step === 3) {
            setCurrentStep(step);
          }
        }}
        steps={[
          {
            id: "scope",
            title: "01. Scope & Details",
            shortTitle: "Scope",
            subtitle: "Study title, research questions, objectives, and target deadline",
          },
          {
            id: "uploads",
            title: "02. Document Uploads",
            shortTitle: "Uploads",
            subtitle: "Draft chapters, raw datasets, and survey questionnaires",
          },
          {
            id: "review",
            title: "03. Review & Submit",
            shortTitle: "Review",
            subtitle: "Summary check and final submission",
          },
        ]}
      />

      {/* ── STEP 1: Research Information ── */}
      {currentStep === 1 && (
        <Card className="p-8 md:p-10" style={{ padding: "2rem", display: "flex", flexDirection: "column" }}>
          <form onSubmit={handleProceedToStep2} className="flex flex-col gap-8">
            <div className="border-b border-white/[0.08] pb-5">
              <h2 className="text-base font-bold text-white font-sans">
                Research Project Specifications
              </h2>
              <p className="text-xs text-white/50 mt-1 font-sans leading-relaxed">
                Provide the basic details about your thesis or research study so we can understand your statistical needs.
              </p>
            </div>

            <div className="flex flex-col gap-7">
              <FormInput
                label="Research Study Title"
                required
                placeholder="e.g. Social Media Use and Academic Performance of Students"
                value={researchTitle}
                onChange={(e) => setResearchTitle(e.target.value)}
                error={fieldErrors.researchTitle?.[0]}
              />

              <FormTextarea
                label="Statement of the Problem / Key Research Questions"
                required
                rows={4}
                placeholder="1. What is the profile of the respondents?&#10;2. Is there a significant relationship between study habits and exam scores?"
                value={researchQuestions}
                onChange={(e) => setResearchQuestions(e.target.value)}
                error={fieldErrors.researchQuestions?.[0]}
              />

              <FormTextarea
                label="Core Research Objectives"
                required
                rows={3}
                placeholder="Briefly describe what you want to achieve or find out in this study..."
                value={researchObjectives}
                onChange={(e) => setResearchObjectives(e.target.value)}
                error={fieldErrors.researchObjectives?.[0]}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-start">
                <FormTextarea
                  label="Theoretical Hypotheses (Optional)"
                  rows={4}
                  placeholder="e.g. There is no significant relationship between study habits and exam scores (optional)..."
                  value={hypotheses}
                  onChange={(e) => setHypotheses(e.target.value)}
                  className="min-h-[110px]"
                />

                <div className="flex flex-col gap-2.5">
                  <FormInput
                    label="Target Completion / Defense Deadline"
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    required
                    value={deadlineRequested}
                    onChange={(e) => setDeadlineRequested(e.target.value)}
                    error={fieldErrors.deadlineRequested?.[0]}
                  />
                  <div className="p-3.5 rounded-[4px] bg-white/[0.03] border border-white/10 text-xs text-white/60 font-sans leading-relaxed flex items-start gap-2.5">
                    <IconCalendarEvent size={16} stroke={1.5} className="text-[#CC6600] shrink-0 mt-0.5" />
                    <span>
                      Helps our team make sure your statistical analysis is completed on time for your defense.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <FormFooter className="mt-8 pt-6">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full sm:w-auto font-bold tracking-wider"
              >
                Proceed to Attachments →
              </Button>
            </FormFooter>
          </form>
        </Card>
      )}

      {/* ── STEP 2: Document Attachments ── */}
      {currentStep === 2 && (
        <Card className="p-8 md:p-10 flex flex-col gap-8" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="border-b border-white/[0.08] pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white font-sans">
                Attach Research Documents & Datasets
              </h2>
              <p className="text-xs text-white/50 mt-1 font-sans leading-relaxed">
                Provide draft chapters, survey instruments, or raw dataset files for statistical evaluation.
              </p>
            </div>

            {/* Confidentiality Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[2px] bg-white/[0.03] border border-white/[0.08] text-white/60 text-xs self-start sm:self-auto flex-shrink-0">
              <IconLock size={14} className="text-[#CC6600]" stroke={2} />
              <span className="font-mono text-[0.688rem] uppercase tracking-wider">NDA Encrypted</span>
            </div>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6"
            style={{
              marginTop: "1.5rem",
              display: "grid",
              gap: "1.5rem",
            }}
          >
            {/* ── Slot 1: Chapters 1-3 ── */}
            <div
              onDragEnter={(e) => handleDragEnter(e, "RESEARCH_DOCUMENT")}
              onDragOver={(e) => handleDragOver(e, "RESEARCH_DOCUMENT")}
              onDragLeave={(e) => handleDragLeave(e, "RESEARCH_DOCUMENT")}
              onDrop={(e) => handleDrop(e, "RESEARCH_DOCUMENT")}
              className={`p-6 rounded-[2px] border bg-[#01142B]/85 flex flex-col justify-between gap-5 transition-all min-h-[300px] ${
                dragActiveCategory === "RESEARCH_DOCUMENT"
                  ? "border-[#CC6600] bg-[#CC6600]/5 ring-1 ring-[#CC6600]/40"
                  : "border-white/[0.09]"
              }`}
              style={{
                padding: "1.5rem",
                borderRadius: "2px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "1.25rem",
                minHeight: "300px",
                boxSizing: "border-box",
              }}
            >
              {/* Header */}
              <div className="flex flex-col gap-3 min-h-[72px]" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minHeight: "72px" }}>
                <div className="flex items-center justify-between" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    className="w-8 h-8 rounded-[2px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-sky-400"
                    style={{ width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "2px" }}
                  >
                    <IconFileText size={18} stroke={1.75} />
                  </div>
                  <span
                    className="text-[0.625rem] font-mono font-bold uppercase px-2 py-0.5 rounded-[2px] bg-sky-500/10 text-sky-300 border border-sky-500/20"
                    style={{ padding: "0.125rem 0.5rem", borderRadius: "2px" }}
                  >
                    Required
                  </span>
                </div>

                <div className="flex flex-col gap-1" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    Draft Manuscript (Chapters 1–3)
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed font-sans" style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
                    Your thesis proposal, introduction, or research methodology paper.
                  </p>
                </div>
              </div>

              {/* Upload Zone / State */}
              {uploadingState.RESEARCH_DOCUMENT ? (
                <div className="p-4 sm:p-5 rounded-[2px] bg-[#01142B] border border-[#CC6600]/80 flex flex-col justify-between min-h-[140px] shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#FFA040] flex-shrink-0 animate-pulse">
                        <IconCloudUpload size={16} stroke={1.75} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono text-xs font-bold text-white truncate">
                          {uploadingState.RESEARCH_DOCUMENT.fileName}
                        </span>
                        <span className="text-[0.625rem] font-mono text-white/50">
                          {uploadingState.RESEARCH_DOCUMENT.formattedSize}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/35 text-[#FFA040] font-mono text-xs font-bold tracking-wider flex-shrink-0">
                      {uploadingState.RESEARCH_DOCUMENT.progress}%
                    </span>
                  </div>

                  {/* Bottom Group: Progress Bar + Status Footer */}
                  <div className="flex flex-col gap-2.5 mt-auto pt-4">
                    <div className="w-full bg-[#000D1A] h-2 rounded-[1px] overflow-hidden border border-white/10 p-[1px] flex items-center">
                      <div
                        className="bg-[#CC6600] h-full rounded-[1px] transition-all duration-150"
                        style={{ width: `${uploadingState.RESEARCH_DOCUMENT.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        <span className="font-medium text-amber-300 text-[0.6875rem]">Uploading file...</span>
                      </div>
                      <span className="text-[0.6875rem] font-mono text-white/40">Please wait</span>
                    </div>
                  </div>
                </div>
              ) : filesList.some((f) => f.category === "RESEARCH_DOCUMENT") ? (
                <div className="p-4 sm:p-5 rounded-[2px] bg-[#01142B] border border-[#CC6600]/80 flex flex-col justify-between min-h-[140px] shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#FFA040] flex-shrink-0">
                        <IconFileText size={16} stroke={1.75} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono text-xs font-bold text-white truncate" title={filesList.find((f) => f.category === "RESEARCH_DOCUMENT")?.name}>
                          {filesList.find((f) => f.category === "RESEARCH_DOCUMENT")?.name}
                        </span>
                        <span className="text-[0.625rem] font-mono text-white/50">
                          {filesList.find((f) => f.category === "RESEARCH_DOCUMENT")?.formattedSize}
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
                      <div className="bg-[#CC6600] h-full rounded-[1px] transition-all duration-300 w-full" />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="font-semibold text-emerald-300 text-[0.6875rem]">Ready for submission</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile("RESEARCH_DOCUMENT")}
                        className="px-2.5 py-0.5 rounded-[2px] text-[0.6875rem] font-mono font-bold text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  className={`group cursor-pointer border border-dashed rounded-[2px] p-6 text-center transition-all flex flex-col items-center justify-center gap-2.5 min-h-[140px] ${
                    dragActiveCategory === "RESEARCH_DOCUMENT"
                      ? "border-[#CC6600] bg-[#CC6600]/10 ring-2 ring-[#CC6600]/40 scale-[1.01]"
                      : "border-white/15 hover:border-white/40 bg-white/[0.01] hover:bg-white/[0.03]"
                  }`}
                >
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => handleFileInputChange(e, "RESEARCH_DOCUMENT")}
                  />
                  <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/40 group-hover:text-[#FFA040] group-hover:border-[#CC6600]/40 transition-colors">
                    <IconCloudUpload size={18} stroke={1.75} />
                  </div>
                  <div className="flex flex-col gap-0.5 text-center">
                    <span className="text-xs font-mono font-semibold text-white/80 group-hover:text-white transition-colors">
                      Click to browse or drop file
                    </span>
                    <span className="text-[0.688rem] text-white/40 font-mono">
                      PDF, DOCX (Max 15MB)
                    </span>
                  </div>
                </label>
              )}
            </div>

            {/* ── Slot 2: Raw Dataset ── */}
            <div
              onDragEnter={(e) => handleDragEnter(e, "DATASET")}
              onDragOver={(e) => handleDragOver(e, "DATASET")}
              onDragLeave={(e) => handleDragLeave(e, "DATASET")}
              onDrop={(e) => handleDrop(e, "DATASET")}
              className={`p-6 rounded-[2px] border bg-[#01142B]/85 flex flex-col justify-between gap-5 transition-all min-h-[300px] ${
                dragActiveCategory === "DATASET"
                  ? "border-[#CC6600] bg-[#CC6600]/5 ring-1 ring-[#CC6600]/40"
                  : "border-white/[0.09]"
              }`}
              style={{
                padding: "1.5rem",
                borderRadius: "2px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "1.25rem",
                minHeight: "300px",
                boxSizing: "border-box",
              }}
            >
              {/* Header */}
              <div className="flex flex-col gap-3 min-h-[72px]" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minHeight: "72px" }}>
                <div className="flex items-center justify-between" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    className="w-8 h-8 rounded-[2px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-emerald-400"
                    style={{ width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "2px" }}
                  >
                    <IconDatabase size={18} stroke={1.75} />
                  </div>
                  <span
                    className="text-[0.625rem] font-mono font-bold uppercase px-2 py-0.5 rounded-[2px] bg-sky-500/10 text-sky-300 border border-sky-500/20"
                    style={{ padding: "0.125rem 0.5rem", borderRadius: "2px" }}
                  >
                    Required
                  </span>
                </div>

                <div className="flex flex-col gap-1" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    Data File (Excel / CSV / SPSS)
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed font-sans" style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
                    Your survey answers spreadsheet, data table, or experiment records.
                  </p>
                </div>
              </div>

              {/* Upload Zone / State */}
              {uploadingState.DATASET ? (
                <div className="p-4 sm:p-5 rounded-[2px] bg-[#01142B] border border-[#CC6600]/80 flex flex-col justify-between min-h-[140px] shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#FFA040] flex-shrink-0 animate-pulse">
                        <IconCloudUpload size={16} stroke={1.75} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono text-xs font-bold text-white truncate">
                          {uploadingState.DATASET.fileName}
                        </span>
                        <span className="text-[0.625rem] font-mono text-white/50">
                          {uploadingState.DATASET.formattedSize}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/35 text-[#FFA040] font-mono text-xs font-bold tracking-wider flex-shrink-0">
                      {uploadingState.DATASET.progress}%
                    </span>
                  </div>

                  {/* Bottom Group: Progress Bar + Status Footer */}
                  <div className="flex flex-col gap-2.5 mt-auto pt-4">
                    <div className="w-full bg-[#000D1A] h-2 rounded-[1px] overflow-hidden border border-white/10 p-[1px] flex items-center">
                      <div
                        className="bg-[#CC6600] h-full rounded-[1px] transition-all duration-150"
                        style={{ width: `${uploadingState.DATASET.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        <span className="font-medium text-amber-300 text-[0.6875rem]">Uploading dataset...</span>
                      </div>
                      <span className="text-[0.6875rem] font-mono text-white/40">Please wait</span>
                    </div>
                  </div>
                </div>
              ) : filesList.some((f) => f.category === "DATASET") ? (
                <div className="p-4 sm:p-5 rounded-[2px] bg-[#01142B] border border-[#CC6600]/80 flex flex-col justify-between min-h-[140px] shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#FFA040] flex-shrink-0">
                        <IconDatabase size={16} stroke={1.75} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono text-xs font-bold text-white truncate" title={filesList.find((f) => f.category === "DATASET")?.name}>
                          {filesList.find((f) => f.category === "DATASET")?.name}
                        </span>
                        <span className="text-[0.625rem] font-mono text-white/50">
                          {filesList.find((f) => f.category === "DATASET")?.formattedSize}
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
                      <div className="bg-[#CC6600] h-full rounded-[1px] transition-all duration-300 w-full" />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="font-semibold text-emerald-300 text-[0.6875rem]">Ready for submission</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile("DATASET")}
                        className="px-2.5 py-0.5 rounded-[2px] text-[0.6875rem] font-mono font-bold text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  className={`group cursor-pointer border border-dashed rounded-[2px] p-6 text-center transition-all flex flex-col items-center justify-center gap-2.5 min-h-[140px] ${
                    dragActiveCategory === "DATASET"
                      ? "border-[#CC6600] bg-[#CC6600]/10 ring-2 ring-[#CC6600]/40 scale-[1.01]"
                      : "border-white/15 hover:border-white/40 bg-white/[0.01] hover:bg-white/[0.03]"
                  }`}
                >
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv,.sav,.dta,.tsv"
                    onChange={(e) => handleFileInputChange(e, "DATASET")}
                  />
                  <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/40 group-hover:text-[#FFA040] group-hover:border-[#CC6600]/40 transition-colors">
                    <IconCloudUpload size={18} stroke={1.75} />
                  </div>
                  <div className="flex flex-col gap-0.5 text-center">
                    <span className="text-xs font-mono font-semibold text-white/80 group-hover:text-white transition-colors">
                      Click to browse or drop file
                    </span>
                    <span className="text-[0.688rem] text-white/40 font-mono">
                      CSV, XLSX, XLS, SPSS (Max 15MB)
                    </span>
                  </div>
                </label>
              )}
            </div>

            {/* ── Slot 3: Survey Questionnaire ── */}
            <div
              onDragEnter={(e) => handleDragEnter(e, "QUESTIONNAIRE")}
              onDragOver={(e) => handleDragOver(e, "QUESTIONNAIRE")}
              onDragLeave={(e) => handleDragLeave(e, "QUESTIONNAIRE")}
              onDrop={(e) => handleDrop(e, "QUESTIONNAIRE")}
              className={`p-6 rounded-[2px] border bg-[#01142B]/85 flex flex-col justify-between gap-5 transition-all min-h-[300px] ${
                dragActiveCategory === "QUESTIONNAIRE"
                  ? "border-[#CC6600] bg-[#CC6600]/5 ring-1 ring-[#CC6600]/40"
                  : "border-white/[0.09]"
              }`}
              style={{
                padding: "1.5rem",
                borderRadius: "2px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "1.25rem",
                minHeight: "300px",
                boxSizing: "border-box",
              }}
            >
              {/* Header */}
              <div className="flex flex-col gap-3 min-h-[72px]" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minHeight: "72px" }}>
                <div className="flex items-center justify-between" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    className="w-8 h-8 rounded-[2px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-amber-400"
                    style={{ width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "2px" }}
                  >
                    <IconListCheck size={18} stroke={1.75} />
                  </div>
                  <span
                    className="text-[0.625rem] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-white/[0.04] text-white/40 border border-white/[0.08]"
                    style={{ padding: "0.125rem 0.5rem", borderRadius: "2px" }}
                  >
                    Optional
                  </span>
                </div>

                <div className="flex flex-col gap-1" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    Survey Questionnaire / Tool (Optional)
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed font-sans" style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
                    Copy of your survey questionnaire, interview guide, or rating scale.
                  </p>
                </div>
              </div>

              {/* Upload Zone / State */}
              {uploadingState.QUESTIONNAIRE ? (
                <div className="p-4 sm:p-5 rounded-[2px] bg-[#01142B] border border-[#CC6600]/80 flex flex-col justify-between min-h-[140px] shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#FFA040] flex-shrink-0 animate-pulse">
                        <IconCloudUpload size={16} stroke={1.75} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono text-xs font-bold text-white truncate">
                          {uploadingState.QUESTIONNAIRE.fileName}
                        </span>
                        <span className="text-[0.625rem] font-mono text-white/50">
                          {uploadingState.QUESTIONNAIRE.formattedSize}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/35 text-[#FFA040] font-mono text-xs font-bold tracking-wider flex-shrink-0">
                      {uploadingState.QUESTIONNAIRE.progress}%
                    </span>
                  </div>

                  {/* Bottom Group: Progress Bar + Status Footer */}
                  <div className="flex flex-col gap-2.5 mt-auto pt-4">
                    <div className="w-full bg-[#000D1A] h-2 rounded-[1px] overflow-hidden border border-white/10 p-[1px] flex items-center">
                      <div
                        className="bg-[#CC6600] h-full rounded-[1px] transition-all duration-150"
                        style={{ width: `${uploadingState.QUESTIONNAIRE.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        <span className="font-medium text-amber-300 text-[0.6875rem]">Uploading tool...</span>
                      </div>
                      <span className="text-[0.6875rem] font-mono text-white/40">Please wait</span>
                    </div>
                  </div>
                </div>
              ) : filesList.some((f) => f.category === "QUESTIONNAIRE") ? (
                <div className="p-4 sm:p-5 rounded-[2px] bg-[#01142B] border border-[#CC6600]/80 flex flex-col justify-between min-h-[140px] shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#FFA040] flex-shrink-0">
                        <IconListCheck size={16} stroke={1.75} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono text-xs font-bold text-white truncate" title={filesList.find((f) => f.category === "QUESTIONNAIRE")?.name}>
                          {filesList.find((f) => f.category === "QUESTIONNAIRE")?.name}
                        </span>
                        <span className="text-[0.625rem] font-mono text-white/50">
                          {filesList.find((f) => f.category === "QUESTIONNAIRE")?.formattedSize}
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
                      <div className="bg-[#CC6600] h-full rounded-[1px] transition-all duration-300 w-full" />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="font-semibold text-emerald-300 text-[0.6875rem]">Ready for submission</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile("QUESTIONNAIRE")}
                        className="px-2.5 py-0.5 rounded-[2px] text-[0.6875rem] font-mono font-bold text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  className={`group cursor-pointer border border-dashed rounded-[2px] p-6 text-center transition-all flex flex-col items-center justify-center gap-2.5 min-h-[140px] ${
                    dragActiveCategory === "QUESTIONNAIRE"
                      ? "border-[#CC6600] bg-[#CC6600]/10 ring-2 ring-[#CC6600]/40 scale-[1.01]"
                      : "border-white/15 hover:border-white/40 bg-white/[0.01] hover:bg-white/[0.03]"
                  }`}
                >
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc,.xlsx,.csv"
                    onChange={(e) => handleFileInputChange(e, "QUESTIONNAIRE")}
                  />
                  <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/40 group-hover:text-[#FFA040] group-hover:border-[#CC6600]/40 transition-colors">
                    <IconCloudUpload size={18} stroke={1.75} />
                  </div>
                  <div className="flex flex-col gap-0.5 text-center">
                    <span className="text-xs font-mono font-semibold text-white/80 group-hover:text-white transition-colors">
                      Click to browse or drop file
                    </span>
                    <span className="text-[0.688rem] text-white/40 font-mono">
                      PDF, DOCX (Max 15MB)
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>

          <FormFooter align="between" className="mt-8 pt-6">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCurrentStep(1)}
              className="w-full sm:w-auto font-bold tracking-wider"
            >
              ← Back to Scope
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleProceedToStep3}
              className="w-full sm:w-auto font-bold tracking-wider"
            >
              Proceed to Review →
            </Button>
          </FormFooter>
        </Card>
      )}

      {/* ── STEP 3: Review & Submit ── */}
      {currentStep === 3 && (
        <Card className="p-8 md:p-10 flex flex-col gap-8" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="border-b border-white/[0.08] pb-5" style={{ paddingBottom: "1.25rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <h2 className="text-base font-bold text-white font-sans">
              Summary Review & Submission
            </h2>
            <p className="text-xs text-white/50 mt-1 font-sans leading-relaxed">
              Inspect your study specifications before sending them to the Admin Triage Queue for statistical pricing.
            </p>
          </div>

          {/* Institutional Affiliation Verification */}
          {profile && (
            <div
              className="p-5 md:p-6 rounded-[3px] bg-[#011C38] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
              style={{ marginTop: "1.5rem", padding: "1.25rem 1.5rem", borderRadius: "2px", boxSizing: "border-box" }}
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono uppercase text-sky-400 font-bold tracking-wider">
                  Verified Institutional Affiliation
                </span>
                <span className="text-sm font-semibold text-white">
                  {profile.institutionSchool} · {profile.academicProgram}
                </span>
                <span className="text-xs text-white/50 font-mono mt-0.5">
                  Region: {profile.region} | Contact: {profile.contactNumber}
                </span>
              </div>
              <Link
                href="/dashboard/client/profile"
                className="text-xs font-mono text-[#CC6600] hover:underline whitespace-nowrap font-medium"
              >
                Edit Profile →
              </Link>
            </div>
          )}

          {/* Research Summary Card */}
          <div
            className="flex flex-col gap-6 border border-white/[0.08] rounded-[2px] p-6 md:p-8 bg-white/[0.015]"
            style={{
              marginTop: "1.5rem",
              padding: "1.75rem",
              borderRadius: "2px",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              boxSizing: "border-box",
            }}
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-mono text-white/40 uppercase tracking-wider font-bold">Research Title</span>
              <span className="text-base font-bold text-white leading-snug">{researchTitle}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/[0.06]">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono text-white/40 uppercase tracking-wider font-bold">Target Deadline</span>
                <span className="text-sm font-mono text-amber-400 font-bold">
                  {new Date(deadlineRequested).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono text-white/40 uppercase tracking-wider font-bold">Attached Files</span>
                <span className="text-sm font-mono text-emerald-400 font-bold">
                  {filesList.length} documents uploaded
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-white/[0.06]">
              <span className="text-xs font-mono text-white/40 uppercase tracking-wider font-bold">Statement of the Problem / Research Questions</span>
              <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                {researchQuestions}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-white/[0.06]">
              <span className="text-xs font-mono text-white/40 uppercase tracking-wider font-bold">Core Research Objectives</span>
              <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                {researchObjectives}
              </p>
            </div>

            {hypotheses && (
              <div className="flex flex-col gap-2 pt-4 border-t border-white/[0.06]">
                <span className="text-xs font-mono text-white/40 uppercase tracking-wider font-bold">Theoretical Hypotheses</span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                  {hypotheses}
                </p>
              </div>
            )}
          </div>

          {/* Academic Integrity Covenant Card */}
          <div
            onClick={() => setIntegrityAgreed(!integrityAgreed)}
            className={`rounded-[2px] transition-all cursor-pointer select-none border ${
              integrityAgreed
                ? "bg-[#CC6600]/10 border-[#CC6600]/50 ring-1 ring-[#CC6600]/30"
                : "bg-[#01142B]/85 border-white/[0.12] hover:border-white/25"
            }`}
            style={{
              marginTop: "1.5rem",
              padding: "1.5rem 1.75rem",
              borderRadius: "2px",
              border: integrityAgreed ? "1px solid rgba(204, 102, 0, 0.5)" : "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "flex-start",
              gap: "1.25rem",
              boxSizing: "border-box",
            }}
          >
            {/* Custom Styled Checkmark Box */}
            <div
              className={`w-5 h-5 rounded-[2px] border flex items-center justify-center transition-all mt-0.5 flex-shrink-0 ${
                integrityAgreed
                  ? "bg-[#CC6600] border-[#CC6600] text-white"
                  : "bg-[#011C38] border-white/30 text-transparent hover:border-[#CC6600]/70"
              }`}
              style={{
                width: "1.375rem",
                height: "1.375rem",
                borderRadius: "2px",
                backgroundColor: integrityAgreed ? "#CC6600" : "#011C38",
                borderColor: integrityAgreed ? "#CC6600" : "rgba(255, 255, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {integrityAgreed && <IconCheck size={15} stroke={3} style={{ color: "#FFFFFF" }} />}
            </div>

            <div
              className="flex flex-col gap-1.5 flex-1 min-w-0"
              style={{ display: "flex", flexDirection: "column", gap: "0.375rem", flex: 1, minWidth: 0 }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[0.625rem] font-mono font-bold uppercase px-2 py-0.5 rounded-[2px] bg-[#CC6600]/20 text-[#CC6600] border border-[#CC6600]/30 tracking-wider"
                  style={{ padding: "0.125rem 0.5rem", borderRadius: "2px" }}
                >
                  Academic Integrity Covenant
                </span>
              </div>
              <h4 className="font-sans text-sm font-bold text-white tracking-wide">
                Statement of Academic Authorship & Confidentiality
              </h4>
              <p
                className="text-xs text-white/75 font-sans leading-relaxed"
                style={{ fontSize: "0.8125rem", lineHeight: 1.55, color: "rgba(255, 255, 255, 0.75)" }}
              >
                I confirm that the submitted questionnaire and dataset belong to my academic thesis or institutional project. I understand JAXIS StatLab operates under strict peer review and non-disclosure standards.
              </p>
              <div
                className="flex items-center gap-1.5 text-[0.688rem] font-mono text-emerald-400/90 pt-1"
                style={{ display: "flex", alignItems: "center", gap: "0.375rem", paddingTop: "0.25rem", color: "#34D399" }}
              >
                <IconShieldCheck size={14} stroke={2} />
                <span>NDA & Non-Disclosure Protected · Peer Review Standard</span>
              </div>
            </div>
          </div>

          <FormFooter
            align="between"
            className="mt-8 pt-6"
            style={{
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCurrentStep(2)}
              disabled={isPending}
              className="w-full sm:w-auto font-bold tracking-wider"
            >
              ← Back to Attachments
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleFinalSubmit}
              loading={isPending}
              disabled={!integrityAgreed || isPending}
              className="w-full sm:w-auto font-bold tracking-wider"
            >
              Submit Study Request →
            </Button>
          </FormFooter>
        </Card>
      )}

      {/* ── Floating Responsive Toast Notification ── */}
      {toast && (
        <Toast
          variant={toast.variant}
          message={toast.message}
          description={toast.description}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
