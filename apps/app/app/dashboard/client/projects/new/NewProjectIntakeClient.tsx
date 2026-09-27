"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, FormInput, FormTextarea, Button, Toast, LoadingState } from "@repo/ui";
import { ArrowLeft, ArrowRight, Check, CloudArrowUp, Database, FileText, GraduationCap, ListChecks } from "@phosphor-icons/react";
import { createProject } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { QuickProfileModal } from "@/features/client-profile/components/QuickProfileModal";
import { uploadFileToR2 } from "@/lib/storage-client";
import { Panel } from "@/components/dashboard/Panel";
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

type Step = 1 | 2 | 3;
const STEPS: Array<{ n: Step; label: string }> = [
  { n: 1, label: "About your study" },
  { n: 2, label: "Your files" },
  { n: 3, label: "Check and send" },
];

// The three file slots. Chapters 1–3 and the data file are required; the questionnaire is optional.
const SLOTS: Array<{
  category: FileCategory;
  title: string;
  body: string;
  required: boolean;
  extensions: string[];
  formats: string;
  icon: React.ReactNode;
}> = [
  {
    category: "RESEARCH_DOCUMENT",
    title: "Chapters 1–3",
    body: "Your proposal or draft chapters, so we know your research questions and methods.",
    required: true,
    extensions: [".pdf", ".docx", ".doc"],
    formats: "PDF or Word",
    icon: <FileText size={18} weight="fill" />,
  },
  {
    category: "DATASET",
    title: "Data file",
    body: "Your survey answers or data table. Messy data is fine; cleaning it is included.",
    required: true,
    extensions: [".xlsx", ".xls", ".csv", ".sav", ".dta", ".tsv"],
    formats: "Excel, CSV, SPSS or Stata",
    icon: <Database size={18} weight="fill" />,
  },
  {
    category: "QUESTIONNAIRE",
    title: "Questionnaire",
    body: "Your survey form, interview guide or rating scale, if you have one.",
    required: false,
    extensions: [".pdf", ".docx", ".doc", ".xlsx", ".csv"],
    formats: "PDF, Word, Excel or CSV",
    icon: <ListChecks size={18} weight="fill" />,
  },
];
const MAX_BYTES = 15 * 1024 * 1024;

export function NewProjectIntakeClient({ initialProfile = null }: NewProjectIntakeClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  // Furthest step reached with valid details, so the step bar can't skip ahead.
  const [maxStep, setMaxStep] = useState<Step>(1);

  const [profile, setProfile] = useState<{
    institutionSchool: string;
    academicProgram: string;
    contactNumber: string;
    region: string;
  } | null>(() =>
    initialProfile
      ? {
          institutionSchool: initialProfile.institutionSchool || "",
          academicProgram: initialProfile.academicProgram || "",
          contactNumber: initialProfile.contactNumber || "",
          region: initialProfile.region || "",
        }
      : null
  );
  const [isProfileLoaded, setIsProfileLoaded] = useState(Boolean(initialProfile !== undefined));

  const [researchTitle, setResearchTitle] = useState("");
  const [researchQuestions, setResearchQuestions] = useState("");
  const [researchObjectives, setResearchObjectives] = useState("");
  const [hypotheses, setHypotheses] = useState("");
  const [deadlineRequested, setDeadlineRequested] = useState("");

  const [filesList, setFilesList] = useState<UploadedFileItem[]>([]);
  const [uploadingState, setUploadingState] = useState<Partial<Record<FileCategory, UploadProgressState | null>>>({});
  const [dragActiveCategory, setDragActiveCategory] = useState<FileCategory | null>(null);

  const [integrityAgreed, setIntegrityAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [toast, setToast] = useState<{
    variant: "success" | "danger" | "warning" | "info";
    message: string;
    description?: string;
  } | null>(null);
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);

  // Load the profile if the server didn't pass it.
  useEffect(() => {
    if (initialProfile === undefined) {
      (async () => {
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
      })();
    }
  }, [initialProfile]);

  const isProfileComplete = Boolean(profile && profile.institutionSchool && profile.contactNumber);

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
    setToast({ variant: "success", message: "School saved", description: "You can now send your study." });
  };

  const goTo = (step: Step) => {
    setCurrentStep(step);
    setMaxStep((m) => (step > m ? step : m));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Files ────────────────────────────────────────────────────────────────────
  const processFile = (file: File, category: FileCategory) => {
    const slot = SLOTS.find((s) => s.category === category);
    if (!slot) return;
    const lower = file.name.toLowerCase();
    const dot = lower.lastIndexOf(".");
    const ext = dot !== -1 ? lower.substring(dot) : "";
    if (!slot.extensions.some((e) => lower.endsWith(e))) {
      setToast({
        variant: "danger",
        message: "That file type isn't accepted here",
        description: `"${ext || "unknown"}" files can't be added as ${slot.title}. Use ${slot.formats}.`,
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      setToast({
        variant: "danger",
        message: "File is too large",
        description: `"${file.name}" is ${formatBytes(file.size)}. The limit is 15 MB; try compressing it.`,
      });
      return;
    }

    setUploadingState((prev) => ({
      ...prev,
      [category]: { fileName: file.name, category, progress: 30, formattedSize: formatBytes(file.size) },
    }));

    (async () => {
      try {
        const uploadRes = await uploadFileToR2(file, category, "intake");
        if (!uploadRes.success || !uploadRes.data) {
          setUploadingState((prev) => ({ ...prev, [category]: null }));
          setToast({
            variant: "danger",
            message: "Upload didn't finish",
            description: uploadRes.error?.message || "Please try again.",
          });
          return;
        }
        const storageUrl = uploadRes.data.publicUrl;
        setUploadingState((prev) => ({
          ...prev,
          [category]: { fileName: file.name, category, progress: 100, formattedSize: formatBytes(file.size) },
        }));
        setTimeout(() => {
          setFilesList((prev) => [
            ...prev.filter((f) => f.category !== category),
            {
              name: file.name,
              size: file.size,
              type: file.type || "application/octet-stream",
              category,
              formattedSize: formatBytes(file.size),
              storageUrl,
            },
          ]);
          setUploadingState((prev) => ({ ...prev, [category]: null }));
          setToast({ variant: "success", message: "File added", description: `"${file.name}" is attached to your study.` });
        }, 250);
      } catch (err) {
        setUploadingState((prev) => ({ ...prev, [category]: null }));
        setToast({
          variant: "danger",
          message: "Upload didn't finish",
          description: (err as Error).message || "Please check your connection and try again.",
        });
      }
    })();
  };

  const removeFile = (category: FileCategory) => {
    const f = filesList.find((x) => x.category === category);
    setFilesList((prev) => prev.filter((x) => x.category !== category));
    if (f) setToast({ variant: "info", message: "File removed", description: `"${f.name}" was removed.` });
  };

  // ── Steps ────────────────────────────────────────────────────────────────────
  const handleProceedToStep2 = (e?: React.FormEvent) => {
    e?.preventDefault();
    setFieldErrors({});
    const errors: Record<string, string[]> = {};
    if (!researchTitle.trim() || researchTitle.trim().length < 3) errors.researchTitle = ["Add a title (at least 3 characters)."];
    if (!researchQuestions.trim() || researchQuestions.trim().length < 5) errors.researchQuestions = ["Add your research questions."];
    if (!researchObjectives.trim() || researchObjectives.trim().length < 5) errors.researchObjectives = ["Add your research objectives."];
    if (!deadlineRequested) {
      errors.deadlineRequested = ["Pick the date you need it by."];
    } else {
      const selected = new Date(deadlineRequested);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected <= today) errors.deadlineRequested = ["Pick a date after today."];
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setToast({ variant: "danger", message: "Some details are missing", description: "Check the highlighted fields." });
      return;
    }
    goTo(2);
  };

  const handleProceedToStep3 = () => {
    const missing = SLOTS.filter((s) => s.required && !filesList.some((f) => f.category === s.category));
    if (missing.length > 0) {
      setToast({
        variant: "warning",
        message: `Add your ${missing.map((m) => m.title).join(" and ")}`,
        description: "We need these to price your study.",
      });
      return;
    }
    goTo(3);
  };

  const handleFinalSubmit = () => {
    if (isPending) return;
    if (!integrityAgreed) {
      setToast({ variant: "warning", message: "Please tick the confirmation", description: "It's just above the Send button." });
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
        if (res.error.fieldErrors) setFieldErrors(res.error.fieldErrors);
        setToast({
          variant: "danger",
          message: "Your study wasn't sent",
          description: res.error.message || "Please check your details and try again.",
        });
        return;
      }
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("jaxis:study-updated"));
      router.push(`/dashboard/client?created=true&intakeId=${encodeURIComponent(res.data.intakeId)}`);
    });
  };

  const header = (
    <PageHeader
      breadcrumbs={[
        { label: "WORKSPACE", href: "/dashboard" },
        { label: "My Studies", href: "/dashboard/client" },
        { label: "Send a study" },
      ]}
      title="Send a new study"
      description="Tell us about your study and add your files. We'll send you a fixed price, usually within 24 hours."
    />
  );

  if (!isProfileLoaded) {
    return (
      <div data-portal="client" className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-24 animate-content-fade">
        {header}
        <LoadingState variant="card" label="Loading..." />
      </div>
    );
  }

  if (!isProfileComplete) {
    return (
      <div data-portal="client" className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-24 animate-content-fade">
        {toast ? <Toast variant={toast.variant} message={toast.message} description={toast.description} onClose={() => setToast(null)} /> : null}
        {header}
        <Panel as="div">
          <div className="flex flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <GraduationCap size={22} weight="fill" className="mt-0.5 shrink-0 text-[#CC6600]" />
              <div>
                <p className="text-base font-semibold text-white">First, tell us about your school</p>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/60">
                  We format your tables the way your school asks, and we need a contact number in case something about
                  your files is unclear. It takes about 30 seconds.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Button variant="primary" size="sm" onClick={() => setIsQuickModalOpen(true)}>
                Add Your School
              </Button>
              <Link href="/dashboard/client/profile" className="text-sm text-white/60 underline-offset-4 hover:text-white hover:underline">
                Open full profile
              </Link>
            </div>
          </div>
        </Panel>
        <QuickProfileModal
          isOpen={isQuickModalOpen}
          onClose={() => setIsQuickModalOpen(false)}
          onSuccess={handleProfileSuccess}
          initialData={profile || undefined}
        />
      </div>
    );
  }

  const deadlineLabel = deadlineRequested
    ? new Date(`${deadlineRequested}T00:00:00`).toLocaleDateString("en-PH", { weekday: "short", month: "long", day: "numeric", year: "numeric" })
    : "";

  return (
    <div data-portal="client" className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-24 animate-content-fade">
      {header}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Step bar: go back freely; forward only through the Next buttons */}
          <ol className="grid grid-cols-3 gap-2" aria-label="Steps">
            {STEPS.map((s) => {
              const current = s.n === currentStep;
              const done = s.n < currentStep || (s.n <= maxStep && s.n !== currentStep);
              const reachable = s.n <= maxStep && !current;
              return (
                <li key={s.n}>
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => reachable && setCurrentStep(s.n)}
                    aria-current={current ? "step" : undefined}
                    className="flex w-full flex-col gap-2 text-left disabled:cursor-default"
                  >
                    <span className={`h-1 rounded-[1px] ${current ? "bg-[#CC6600]" : done ? "bg-white/45" : "bg-white/[0.08]"}`} />
                    <span
                      className={`flex items-center gap-1.5 text-xs sm:text-sm ${
                        current ? "font-semibold text-white" : done ? "text-white/70 hover:text-white" : "text-white/35"
                      }`}
                    >
                      {done ? <Check size={12} weight="bold" className="hidden shrink-0 sm:block" /> : null}
                      <span className="truncate">{s.label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Step 1 */}
          {currentStep === 1 ? (
            <Panel as="div">
              <form onSubmit={handleProceedToStep2} className="flex flex-col gap-6 px-5 py-6 sm:px-6" noValidate>
                <div>
                  <h2 className="text-base font-semibold text-white">About your study</h2>
                  <p className="mt-1 text-[13px] text-white/55">Copy these from your Chapter 1 if you have it.</p>
                </div>
                <FormInput
                  label="Study title"
                  required
                  placeholder="e.g. Social media use and academic performance of Grade 12 students"
                  value={researchTitle}
                  onChange={(e) => setResearchTitle(e.target.value)}
                  error={fieldErrors.researchTitle?.[0]}
                />
                <FormTextarea
                  label="Research questions"
                  required
                  rows={4}
                  placeholder={"1. What is the profile of the respondents?\n2. Is there a significant relationship between study habits and exam scores?"}
                  value={researchQuestions}
                  onChange={(e) => setResearchQuestions(e.target.value)}
                  error={fieldErrors.researchQuestions?.[0]}
                />
                <FormTextarea
                  label="Research objectives"
                  required
                  rows={3}
                  placeholder="What do you want to find out?"
                  value={researchObjectives}
                  onChange={(e) => setResearchObjectives(e.target.value)}
                  error={fieldErrors.researchObjectives?.[0]}
                />
                <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
                  <FormTextarea
                    label="Hypotheses (optional)"
                    rows={3}
                    placeholder="e.g. There is no significant relationship between study habits and exam scores."
                    value={hypotheses}
                    onChange={(e) => setHypotheses(e.target.value)}
                  />
                  <div className="flex flex-col gap-2">
                    <FormInput
                      label="When do you need it?"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      required
                      value={deadlineRequested}
                      onChange={(e) => setDeadlineRequested(e.target.value)}
                      error={fieldErrors.deadlineRequested?.[0]}
                    />
                    <p className="text-xs leading-relaxed text-white/45">
                      Your defense or submission date, so we can plan your analysis to finish on time.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end border-t border-white/[0.07] pt-5">
                  <Button type="submit" variant="primary" size="sm" className="w-full gap-1.5 sm:w-auto">
                    Next: Your Files <ArrowRight size={14} weight="fill" />
                  </Button>
                </div>
              </form>
            </Panel>
          ) : null}

          {/* Step 2 */}
          {currentStep === 2 ? (
            <Panel as="div">
              <div className="flex flex-col gap-5 px-5 py-6 sm:px-6">
                <div>
                  <h2 className="text-base font-semibold text-white">Your files</h2>
                  <p className="mt-1 text-[13px] text-white/55">Up to 15 MB each. Only our team working on your study can open them.</p>
                </div>
                {SLOTS.map((slot) => (
                  <FileSlot
                    key={slot.category}
                    slot={slot}
                    file={filesList.find((f) => f.category === slot.category) ?? null}
                    uploading={uploadingState[slot.category] ?? null}
                    dragActive={dragActiveCategory === slot.category}
                    onDrag={(on) => setDragActiveCategory(on ? slot.category : null)}
                    onPick={(f) => processFile(f, slot.category)}
                    onRemove={() => removeFile(slot.category)}
                  />
                ))}
                <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-between">
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)} className="w-full gap-1.5 sm:w-auto">
                    <ArrowLeft size={14} weight="fill" /> Back
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleProceedToStep3} className="w-full gap-1.5 sm:w-auto">
                    Next: Check and Send <ArrowRight size={14} weight="fill" />
                  </Button>
                </div>
              </div>
            </Panel>
          ) : null}

          {/* Step 3 */}
          {currentStep === 3 ? (
            <Panel as="div">
              <div className="flex flex-col gap-5 px-5 py-6 sm:px-6">
                <div>
                  <h2 className="text-base font-semibold text-white">Check and send</h2>
                  <p className="mt-1 text-[13px] text-white/55">Make sure everything looks right. You can go back and change anything.</p>
                </div>

                <dl className="divide-y divide-white/[0.07] rounded-[2px] border border-white/[0.08]">
                  <Summary label="Study title" onEdit={() => setCurrentStep(1)}>
                    <span className="font-semibold text-white">{researchTitle}</span>
                  </Summary>
                  <Summary label="Needed by" onEdit={() => setCurrentStep(1)}>
                    {deadlineLabel}
                  </Summary>
                  <Summary label="Research questions" onEdit={() => setCurrentStep(1)}>
                    <span className="whitespace-pre-wrap">{researchQuestions}</span>
                  </Summary>
                  <Summary label="Research objectives" onEdit={() => setCurrentStep(1)}>
                    <span className="whitespace-pre-wrap">{researchObjectives}</span>
                  </Summary>
                  {hypotheses ? (
                    <Summary label="Hypotheses" onEdit={() => setCurrentStep(1)}>
                      <span className="whitespace-pre-wrap">{hypotheses}</span>
                    </Summary>
                  ) : null}
                  <Summary label="Files" onEdit={() => setCurrentStep(2)}>
                    <ul className="flex flex-col gap-1">
                      {SLOTS.map((s) => {
                        const f = filesList.find((x) => x.category === s.category);
                        return (
                          <li key={s.category} className="flex flex-wrap gap-x-2">
                            <span className="text-white/50">{s.title}:</span>
                            <span className={f ? "text-white/85" : "text-white/35"}>{f ? f.name : "Not added"}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </Summary>
                </dl>

                <label
                  className={`flex cursor-pointer gap-3 rounded-[2px] border p-4 transition-colors ${
                    integrityAgreed ? "border-[#CC6600]/50 bg-[#CC6600]/[0.06]" : "border-white/12 hover:border-white/25"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={integrityAgreed}
                    onChange={(e) => setIntegrityAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#CC6600]"
                  />
                  <span className="text-[13px] leading-relaxed text-white/80">
                    I confirm these files are from my own thesis or research project, and I understand JAXIS StatLab keeps them
                    confidential.
                  </span>
                </label>

                <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-between">
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)} disabled={isPending} className="w-full gap-1.5 sm:w-auto">
                    <ArrowLeft size={14} weight="fill" /> Back
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleFinalSubmit}
                    loading={isPending}
                    disabled={!integrityAgreed || isPending}
                    className="w-full gap-1.5 sm:w-auto"
                  >
                    {isPending ? "Sending..." : "Send My Study"}
                  </Button>
                </div>
              </div>
            </Panel>
          ) : null}
        </div>

        {/* Side: what happens next + school */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
          <Panel as="div">
            <div className="px-5 py-5">
              <p className="text-sm font-semibold text-white">What happens next</p>
              <ol className="mt-3 flex flex-col gap-3 text-[13px] leading-relaxed text-white/60">
                <li className="flex gap-2.5">
                  <span className="font-mono text-xs text-white/40">1</span>
                  We read your study and files.
                </li>
                <li className="flex gap-2.5">
                  <span className="font-mono text-xs text-white/40">2</span>
                  You get a fixed written price, usually within 24 hours.
                </li>
                <li className="flex gap-2.5">
                  <span className="font-mono text-xs text-white/40">3</span>
                  Nothing to pay until you accept the price and sign your agreement.
                </li>
              </ol>
            </div>
          </Panel>
          {profile ? (
            <Panel as="div">
              <div className="px-5 py-5">
                <p className="flex items-center justify-between gap-2 text-sm font-semibold text-white">
                  Your school
                  <Link href="/dashboard/client/profile" className="text-xs font-normal text-white/55 underline-offset-4 hover:text-white hover:underline">
                    Edit
                  </Link>
                </p>
                <p className="mt-2 text-[13px] text-white/80">{profile.institutionSchool}</p>
                {profile.academicProgram ? <p className="text-[13px] text-white/55">{profile.academicProgram}</p> : null}
              </div>
            </Panel>
          ) : null}
        </aside>
      </div>

      {toast ? <Toast variant={toast.variant} message={toast.message} description={toast.description} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

// ─── Pieces ─────────────────────────────────────────────────────────────────────

function Summary({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
      <dt className="w-36 shrink-0 text-xs font-medium text-white/45 sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 flex-1 text-[13px] leading-relaxed text-white/75">{children}</dd>
      <button type="button" onClick={onEdit} className="self-start text-xs text-white/55 underline-offset-4 hover:text-white hover:underline">
        Edit
      </button>
    </div>
  );
}

function FileSlot({
  slot,
  file,
  uploading,
  dragActive,
  onDrag,
  onPick,
  onRemove,
}: {
  slot: (typeof SLOTS)[number];
  file: UploadedFileItem | null;
  uploading: UploadProgressState | null;
  dragActive: boolean;
  onDrag: (on: boolean) => void;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const accept = slot.extensions.join(",");
  const pickFromInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPick(f);
    e.target.value = "";
  };
  return (
    <section
      aria-label={slot.title}
      onDragEnter={(e) => {
        e.preventDefault();
        onDrag(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragActive) onDrag(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onPick(f);
      }}
      className={`rounded-[2px] border p-4 transition-colors ${
        dragActive ? "border-[#CC6600] bg-[#CC6600]/[0.05]" : "border-white/[0.08]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-white/45">{slot.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
            {slot.title}
            <span className="rounded-[2px] border border-white/10 px-1.5 py-px text-[10px] font-medium text-white/50">
              {slot.required ? "Required" : "Optional"}
            </span>
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-white/55">{slot.body}</p>
        </div>
      </div>

      <div className="mt-3 pl-0 sm:pl-[30px]">
        {uploading ? (
          <div className="rounded-[2px] border border-white/10 bg-white/[0.02] p-3">
            <p className="flex items-center justify-between gap-3 text-[13px]">
              <span className="truncate text-white/85">{uploading.fileName}</span>
              <span className="shrink-0 font-mono text-xs text-white/50">{uploading.progress}%</span>
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-[1px] bg-white/[0.08]">
              <div className="h-full bg-[#CC6600] transition-[width] duration-200" style={{ width: `${uploading.progress}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-white/45">Uploading...</p>
          </div>
        ) : file ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-white/10 bg-white/[0.02] p-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <Check size={15} weight="bold" className="shrink-0 text-[#CC6600]" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-white" title={file.name}>
                  {file.name}
                </span>
                <span className="text-xs text-white/45">{file.formattedSize}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3 text-xs">
              <label className="cursor-pointer text-white/70 underline-offset-4 hover:text-white hover:underline">
                Replace
                <input type="file" accept={accept} className="hidden" onChange={pickFromInput} />
              </label>
              <button type="button" onClick={onRemove} className="text-white/55 underline-offset-4 hover:text-white hover:underline">
                Remove
              </button>
            </span>
          </div>
        ) : (
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[2px] border border-dashed px-4 py-5 text-center transition-colors ${
              dragActive ? "border-[#CC6600] bg-[#CC6600]/[0.06]" : "border-white/15 hover:border-white/35 hover:bg-white/[0.02]"
            }`}
          >
            <input type="file" accept={accept} className="hidden" onChange={pickFromInput} aria-label={`Choose your ${slot.title}`} />
            <CloudArrowUp size={20} weight="fill" className="text-white/40" />
            <span className="text-[13px] text-white/80">
              <span className="font-medium text-white underline underline-offset-4">Choose a file</span> or drop it here
            </span>
            <span className="text-xs text-white/40">{slot.formats}</span>
          </label>
        )}
      </div>
    </section>
  );
}
