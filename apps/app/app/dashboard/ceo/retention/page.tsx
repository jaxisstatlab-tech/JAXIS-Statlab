"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  KpiCard,
  Card,
  Button,
  LoadingState,
  Toast,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@repo/ui";
import {
  getStorageRetentionConfigAction,
  updateStorageRetentionConfigAction,
  purgeExpiredFilesAction,
  getInfrastructureHealthAction,
  getDatabaseResetPreviewAction,
  freshDatabaseResetAction,
} from "@/features/reporting/actions";
import type {
  StorageRetentionConfigDTO,
  InfrastructureHealthDTO,
  DatabaseResetPreviewDTO,
} from "@/features/reporting/schemas";
import {
  Database,
  ShieldCheck,
  Trash,
  FloppyDisk,
  Clock,
  FileText,
  ArrowsClockwise,
  Receipt,
  ChatCenteredText,
  Lock,
  CalendarBlank,
  Users,
  CurrencyDollar,
  ClockCountdown,
  ChartBar,
  Bell,
  Scroll,
  ArrowCounterClockwise,
  Lightning,
  Warning,
  Check,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";

function getCutoffInfo(days: number) {
  const target = new Date();
  target.setDate(target.getDate() + Number(days || 0));
  const formattedDate = target.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return {
    date: formattedDate,
    countdown: `in ${days} days`,
  };
}

// ─── Danger Zone Data Domains ────────────────────────────────────────────────

interface ResetCategory {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  defaultOn: boolean;
  autoDeps?: string[];
}

const RESET_CATEGORIES: ResetCategory[] = [
  {
    key: "purgeStudies",
    label: "Studies & Research Files",
    shortLabel: "Studies",
    description: "Requests, drafts, deliverables, SOWs, and R2 files.",
    icon: FileText,
    defaultOn: true,
    autoDeps: ["purgeFinance", "purgeMessages", "purgeQA"],
  },
  {
    key: "purgeFinance",
    label: "Finance & Payments",
    shortLabel: "Finance",
    description: "Transactions, receipts, payouts, ledgers, disputes.",
    icon: CurrencyDollar,
    defaultOn: true,
  },
  {
    key: "purgeUsers",
    label: "User Accounts (non-CEO)",
    shortLabel: "Users",
    description: "Clients, staff, admin accounts. CEO is preserved.",
    icon: Users,
    defaultOn: true,
    autoDeps: [
      "purgeAttendance",
      "purgeMessages",
      "purgeQA",
      "purgeNotifications",
    ],
  },
  {
    key: "purgeAttendance",
    label: "Staff Attendance & Shifts",
    shortLabel: "Attendance",
    description: "Duty clock-ins, shift records, correction logs.",
    icon: ClockCountdown,
    defaultOn: false,
  },
  {
    key: "purgeMessages",
    label: "Messages & Chat History",
    shortLabel: "Messages",
    description: "Client-specialist threads and read receipts.",
    icon: ChatCenteredText,
    defaultOn: true,
  },
  {
    key: "purgeQA",
    label: "QA Reviews & Scorecards",
    shortLabel: "QA",
    description: "Quality evaluations and reviewer notes.",
    icon: ChartBar,
    defaultOn: false,
  },
  {
    key: "purgeNotifications",
    label: "Notifications & Alerts",
    shortLabel: "Alerts",
    description: "System notifications and email event logs.",
    icon: Bell,
    defaultOn: true,
  },
  {
    key: "purgeAuditLogs",
    label: "Audit Trail & System Logs",
    shortLabel: "Audit Logs",
    description: "Compliance audit history and login records.",
    icon: Scroll,
    defaultOn: false,
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CeoStorageRetentionPage() {
  const router = useRouter();
  const [config, setConfig] = useState<StorageRetentionConfigDTO>({
    retentionPeriodDays: 90,
    purgeInactiveDays: 180,
    autoPurgeEnabled: true,
    keepDatasets: true,
    keepResearchDocs: true,
    keepQuestionnaires: true,
    keepReceiptPhotos: true,
    keepChatHistory: true,
    keepDeliverables: true,
    updatedAt: "",
    updatedBy: null,
  });

  const [health, setHealth] = useState<InfrastructureHealthDTO | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);

  // File Purge Dialog & Staged Undo State (Tier 1/2)
  const [isConfirmPurgeOpen, setIsConfirmPurgeOpen] = useState<boolean>(false);
  const [purgeScope, setPurgeScope] = useState<"FINISHED_ONLY" | "ALL_PROJECTS">("FINISHED_ONLY");
  const [deleteTestProjects, setDeleteTestProjects] = useState<boolean>(true);
  const [purgeStage, setPurgeStage] = useState<"idle" | "staged" | "committing">("idle");
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Danger Zone Reset State (Tier 3)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetPreview, setResetPreview] = useState<DatabaseResetPreviewDTO | null>(null);
  const [resetCategories, setResetCategories] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    RESET_CATEGORIES.forEach((c) => {
      defaults[c.key] = c.defaultOn;
    });
    return defaults;
  });
  const [ceoPassword, setCeoPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");

  const [toast, setToast] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [configRes, healthRes] = await Promise.all([
        getStorageRetentionConfigAction(),
        getInfrastructureHealthAction(),
      ]);

      if (configRes.success && configRes.data) {
        setConfig(configRes.data);
      }
      if (healthRes.success && healthRes.data) {
        setHealth(healthRes.data);
      }
    } catch (err) {
      console.error("Failed to load retention settings:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load preview counts on mount so badges are always visible
  useEffect(() => {
    getDatabaseResetPreviewAction().then((res) => {
      if (res.success && res.data) setResetPreview(res.data);
    }).catch(() => {});
  }, []);

  // beforeunload guard during staged purge
  useEffect(() => {
    if (purgeStage === "staged") {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "A file purge is currently staged. Leaving will cancel it.";
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, [purgeStage]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Save Policy ───────────────────────────────────────────────────────────

  const handleSavePolicy = async () => {
    setIsSaving(true);
    try {
      const res = await updateStorageRetentionConfigAction({
        retentionPeriodDays: Number(config.retentionPeriodDays),
        purgeInactiveDays: Number(config.purgeInactiveDays || 180),
        autoPurgeEnabled: Boolean(config.autoPurgeEnabled),
        keepDatasets: Boolean(config.keepDatasets),
        keepResearchDocs: Boolean(config.keepResearchDocs),
        keepQuestionnaires: Boolean(config.keepQuestionnaires),
        keepReceiptPhotos: Boolean(config.keepReceiptPhotos),
        keepChatHistory: Boolean(config.keepChatHistory),
        keepDeliverables: Boolean(config.keepDeliverables),
      });

      if (res.success) {
        setToast({
          variant: "success",
          message: "Policy Saved",
          description: `Retention window set to ${config.retentionPeriodDays} days with protected category rules applied.`,
        });
        loadData();
      } else {
        setToast({
          variant: "danger",
          message: "Save Failed",
          description: res.error?.message || "Could not save policy.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving policy.";
      setToast({ variant: "danger", message: "Error", description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── File Purge (Tier 1/2) with 30s Staged Undo ────────────────────────────

  const handleInitiateStagedPurge = () => {
    setIsConfirmPurgeOpen(false);
    setPurgeStage("staged");
    setSecondsRemaining(30);

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleCommitPurge();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleUndoPurge = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPurgeStage("idle");
    setToast({
      variant: "success",
      message: "Purge Cancelled",
      description: "Deletion cancelled. All files remain completely safe in storage.",
    });
  };

  const handleCommitPurge = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPurgeStage("committing");
    setIsPurging(true);

    try {
      const res = await purgeExpiredFilesAction(undefined, {
        scope: purgeScope,
        deleteTestProjects: deleteTestProjects && purgeScope === "ALL_PROJECTS",
        cleanOrphanedStorage: true,
      });

      if (res.success) {
        const desc =
          res.purgedFilesCount && res.purgedFilesCount > 0
            ? `Deleted ${res.purgedFilesCount} unprotected files and freed ~${res.freedMB} MB from Cloudflare R2.`
            : "Storage clean. All current files are protected by active category rules.";

        setToast({
          variant: "success",
          message: "Purge Completed",
          description: desc,
        });
        await loadData(true);
        router.refresh();
      } else {
        setToast({
          variant: "danger",
          message: "Purge Failed",
          description: res.error?.message || "Could not execute purge.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing purge.";
      setToast({ variant: "danger", message: "Error", description: msg });
    } finally {
      setIsPurging(false);
      setPurgeStage("idle");
    }
  };

  // ─── Danger Zone Reset (Tier 3) ───────────────────────────────────────────

  const handleOpenResetModal = async () => {
    setIsResetModalOpen(true);
    setCeoPassword("");
    setConfirmPhrase("");
    try {
      const res = await getDatabaseResetPreviewAction();
      if (res.success && res.data) setResetPreview(res.data);
    } catch {
      // preview failure handled gracefully
    }
  };

  const handleToggleResetCategory = (key: string, checked: boolean) => {
    setResetCategories((prev) => {
      const updated = { ...prev, [key]: checked };
      if (checked) {
        const cat = RESET_CATEGORIES.find((c) => c.key === key);
        if (cat?.autoDeps) {
          cat.autoDeps.forEach((dep) => {
            updated[dep] = true;
          });
        }
      }
      return updated;
    });
  };

  const selectedResetCount = Object.values(resetCategories).filter(Boolean).length;
  const isPhraseValid =
    confirmPhrase.trim().toUpperCase() === "RESET" ||
    confirmPhrase.trim() === "RESET JAXIS DATABASE";
  const isResetFormValid =
    selectedResetCount > 0 && ceoPassword.length > 0 && isPhraseValid;

  const getCategoryCount = (key: string): number => {
    if (!resetPreview) return 0;
    const map: Record<string, number> = {
      purgeStudies: resetPreview.studies,
      purgeFinance: resetPreview.finance,
      purgeUsers: resetPreview.users,
      purgeAttendance: resetPreview.attendance,
      purgeMessages: resetPreview.messages,
      purgeQA: resetPreview.qa,
      purgeNotifications: resetPreview.notifications,
      purgeAuditLogs: resetPreview.auditLogs,
    };
    return map[key] ?? 0;
  };

  const getTotalResetRecords = () => {
    if (!resetPreview) return 0;
    let total = 0;
    RESET_CATEGORIES.forEach((c) => {
      if (resetCategories[c.key]) {
        total += getCategoryCount(c.key);
      }
    });
    return total;
  };

  const handleExecuteReset = async () => {
    setIsResetting(true);
    try {
      const res = await freshDatabaseResetAction({
        ceoPassword,
        confirmationPhrase: "RESET",
        purgeStudies: resetCategories.purgeStudies ?? true,
        purgeFinance: resetCategories.purgeFinance ?? true,
        purgeUsers: resetCategories.purgeUsers ?? true,
        purgeAttendance: resetCategories.purgeAttendance ?? true,
        purgeMessages: resetCategories.purgeMessages ?? true,
        purgeQA: resetCategories.purgeQA ?? true,
        purgeNotifications: resetCategories.purgeNotifications ?? true,
        purgeAuditLogs: resetCategories.purgeAuditLogs ?? false,
      });

      if (res.success && res.data) {
        setIsResetModalOpen(false);
        setToast({
          variant: "success",
          message: "Database Reset Complete",
          description: `Purged ${res.data.purgedStudiesCount} studies, ${res.data.purgedUsersCount} user accounts, and ${res.data.purgedR2FilesCount} files. Freed ${res.data.freedMB} MB.`,
        });
        await loadData(true);
        router.refresh();
      } else {
        setToast({
          variant: "danger",
          message: "Reset Failed",
          description: res.error?.message || "Could not execute reset.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing reset.";
      setToast({ variant: "danger", message: "Error", description: msg });
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading storage settings..."
          description="Connecting to database and cloud storage"
        />
      </div>
    );
  }

  // Telemetry metrics
  const dbUsed = health?.supabase.databaseSizeMB || 13.94;
  const dbLimit = health?.supabase.databaseLimitMB || 500;
  const dbPercent = health?.supabase.percentageUsed || Math.round((dbUsed / dbLimit) * 100);

  const cfUsed = health?.cloudflare.storageUsedMB ?? 0;
  const cfLimit = health?.cloudflare.storageLimitMB || 10240;
  const cfPercent = health?.cloudflare.percentageUsed ?? Math.round((cfUsed / cfLimit) * 100);

  const PROTECTED_CATEGORIES: {
    key: keyof StorageRetentionConfigDTO;
    label: string;
    desc: string;
    icon: React.ElementType;
  }[] = [
    {
      key: "keepDatasets",
      label: "Research Datasets & Codebooks",
      desc: "Raw CSV, Excel (.xlsx), and SPSS spreadsheets.",
      icon: Database,
    },
    {
      key: "keepResearchDocs",
      label: "Chapters 1-3 & Methodology Drafts",
      desc: "DOCX drafts, theoretical frameworks, literature notes.",
      icon: FileText,
    },
    {
      key: "keepQuestionnaires",
      label: "Questionnaires & Survey Instruments",
      desc: "Survey forms, Likert scales, test instruments.",
      icon: FileText,
    },
    {
      key: "keepReceiptPhotos",
      label: "Payment Receipts & Proof of Deposit",
      desc: "Bank & GCash deposit screenshots for BIR tax defense.",
      icon: Receipt,
    },
    {
      key: "keepChatHistory",
      label: "Consultation Chat & Messages",
      desc: "Researcher-statistician consultation transcripts.",
      icon: ChatCenteredText,
    },
    {
      key: "keepDeliverables",
      label: "Final Released Deliverable Packages",
      desc: "Verified statistical packages and APA tables.",
      icon: ShieldCheck,
    },
  ];

  const protectedCount = PROTECTED_CATEGORIES.filter((c) => Boolean(config[c.key])).length;
  const allProtected = protectedCount === PROTECTED_CATEGORIES.length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {/* ── PageHeader ── */}
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "CEO DESK", href: "/dashboard/ceo" },
          { label: "Storage & Retention" },
        ]}
        title="Data Retention & Storage Management"
        description="Configure automated file retention periods, protect sensitive research files, and selectively purge data domains."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="text-xs h-8 px-3 flex items-center gap-1.5 hover:bg-white/10 rounded-[2px]"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
            >
              <ArrowsClockwise
                size={14}
                weight="fill"
                className={isRefreshing ? "animate-spin text-sky-400" : ""}
              />
              <span>{isRefreshing ? "Checking..." : "Refresh"}</span>
            </Button>
            <Button
              variant="secondary"
              className="text-xs h-8 px-3 flex items-center gap-1.5 text-amber-400 hover:text-amber-300 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 rounded-[2px]"
              onClick={() => setIsConfirmPurgeOpen(true)}
              disabled={isPurging || purgeStage === "staged"}
            >
              <Trash size={14} weight="fill" />
              <span>{isPurging ? "Purging..." : "Run File Purge"}</span>
            </Button>
            <Button
              variant="primary"
              className="text-xs h-8 px-3.5 flex items-center gap-1.5 bg-[#CC6600] hover:bg-[#E67300] text-white rounded-[2px]"
              onClick={handleSavePolicy}
              disabled={isSaving}
            >
              <FloppyDisk size={14} weight="fill" />
              <span>{isSaving ? "Saving..." : "Save Policy"}</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Row: Storage & Infrastructure at a Glance ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          label="RETENTION WINDOW"
          value={`${config.retentionPeriodDays} DAYS`}
          description={`Files purged ${(config.retentionPeriodDays / 30).toFixed(1)} mo post-delivery`}
        />
        <KpiCard
          label="DATABASE STORAGE"
          value={`${dbUsed} MB`}
          unit={`/ ${dbLimit} MB`}
          description={`${dbPercent}% used • PostgreSQL`}
        />
        <KpiCard
          label="OBJECT STORAGE (R2)"
          value={cfUsed > 1024 ? `${(cfUsed / 1024).toFixed(1)} GB` : `${cfUsed} MB`}
          unit="/ 10 GB"
          description={`${cfPercent}% used • ${health?.cloudflare.totalFiles ?? 0} files stored`}
        />
        <KpiCard
          label="AUTOMATED PURGE"
          value={config.autoPurgeEnabled ? "ACTIVE" : "PAUSED"}
          description={config.autoPurgeEnabled ? "Daily at 00:00 UTC" : "Manual trigger only"}
        />
      </div>

      {/* ── Storage Configuration: 2-Column Bento Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: Retention Schedule */}
        <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
              <div className="p-2 rounded-[2px] bg-sky-500/15 text-sky-400">
                <Clock size={20} weight="fill" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Retention Schedule
                </h3>
                <span className="text-xs text-white/50 font-sans">
                  Completed study attachment lifespan in cloud storage
                </span>
              </div>
            </div>

            {/* Days Input + Presets */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-white font-sans">
                Post-Delivery Retention Window:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={config.retentionPeriodDays}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      retentionPeriodDays: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="bg-black/50 border border-white/15 rounded-[2px] px-3.5 py-2 text-sm text-white font-mono w-28 outline-none focus:border-[#CC6600] transition-colors"
                />
                <span className="text-xs text-white/60 font-sans">
                  Days ({(config.retentionPeriodDays / 30).toFixed(1)} Months)
                </span>
              </div>

              {/* Target Cutoff Date Pill */}
              <div className="flex items-center justify-between px-3 py-2 rounded-[2px] bg-black/40 border border-white/10 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarBlank size={14} weight="fill" className="text-sky-400 shrink-0" />
                  <span className="text-white/70 font-sans truncate">
                    Next Cutoff:{" "}
                    <strong className="text-white font-mono">
                      {getCutoffInfo(config.retentionPeriodDays).date}
                    </strong>
                  </span>
                </div>
                <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-[2px] border border-sky-500/20 shrink-0 ml-2">
                  {getCutoffInfo(config.retentionPeriodDays).countdown}
                </span>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: "30 Days", days: 30 },
                  { label: "60 Days", days: 60 },
                  { label: "90 Days", days: 90 },
                  { label: "180 Days", days: 180 },
                  { label: "365 Days", days: 365 },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() =>
                      setConfig({ ...config, retentionPeriodDays: preset.days })
                    }
                    className={`px-2.5 py-1 rounded-[2px] text-xs font-sans transition-all cursor-pointer active:scale-[0.97] ${
                      config.retentionPeriodDays === preset.days
                        ? "bg-[#CC6600] text-white font-semibold shadow-sm"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Auto-Purge Toggle */}
            <div className="flex items-center justify-between p-4 bg-black/30 border border-white/5 rounded-[2px]">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white font-sans">
                  Automated Daily Purge
                </span>
                <span className="text-xs text-white/40 font-sans">
                  Sweeps expired files automatically every night at 00:00 UTC
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig({ ...config, autoPurgeEnabled: !config.autoPurgeEnabled })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  config.autoPurgeEnabled ? "bg-[#CC6600]" : "bg-white/20"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.autoPurgeEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Storage Reclaimed Stat */}
          <div className="p-3.5 bg-black/30 border border-white/10 rounded-[2px] flex items-center justify-between text-xs">
            <span className="text-white/60 font-sans">Storage Reclaimed to Date:</span>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-[2px] border border-emerald-500/20">
              +{health?.cloudflare.purgedSavingsMB || 0} MB
            </span>
          </div>
        </Card>

        {/* Right Column: Protected File Categories */}
        <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            {/* Header + Bulk Toolbar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-[2px] bg-emerald-500/15 text-emerald-400">
                  <ShieldCheck size={20} weight="fill" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Protected File Categories
                  </h3>
                  <span className="text-xs text-white/50 font-sans">
                    Files matching checked categories are never purged
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = !allProtected;
                    setConfig((prev) => ({
                      ...prev,
                      keepDatasets: next,
                      keepResearchDocs: next,
                      keepQuestionnaires: next,
                      keepReceiptPhotos: next,
                      keepChatHistory: next,
                      keepDeliverables: next,
                    }));
                  }}
                  className="text-[11px] font-sans px-2 py-0.5 rounded-[2px] bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors cursor-pointer"
                >
                  {allProtected ? "Clear All" : "Protect All"}
                </button>
              </div>
            </div>

            {/* 6 Category Rows */}
            <div className="flex flex-col gap-2">
              {PROTECTED_CATEGORIES.map((item) => {
                const isChecked = Boolean(config[item.key]);
                const Icon = item.icon;
                return (
                  <label
                    key={item.key}
                    className={`p-2.5 rounded-[2px] border flex items-center gap-3 cursor-pointer transition-all ${
                      isChecked
                        ? "bg-[#011B38] border-white/20 text-white"
                        : "bg-black/20 border-white/5 text-white/40 hover:bg-white/[0.02]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setConfig({ ...config, [item.key]: e.target.checked })
                      }
                      className="accent-[#CC6600] h-4 w-4 rounded-[2px] cursor-pointer shrink-0"
                    />
                    <Icon
                      size={14}
                      weight="fill"
                      className={isChecked ? "text-[#CC6600]" : "text-white/30"}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs text-white font-sans truncate">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-white/40 font-sans truncate">
                        {item.desc}
                      </span>
                    </div>
                    {isChecked && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-[2px] border border-emerald-500/20 shrink-0">
                        PROTECTED
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Legal Compliance Notice */}
          <div className="p-3 bg-[#010D1F] border border-white/10 rounded-[2px] flex items-center gap-2 text-xs text-white/60">
            <Lock size={14} weight="fill" className="text-sky-400 shrink-0" />
            <span>
              Signed SOWs, formal invoices, and tax receipts are permanently preserved by law.
            </span>
          </div>
        </Card>
      </div>

      {/* ── Danger Zone: Selective Database Reset ── */}
      <Card className="p-6 sm:p-8 bg-[#01142B] border border-red-500/20 rounded-[2px] flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-red-500/15">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-red-500/15 text-red-400 shrink-0">
              <Warning size={20} weight="fill" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider font-mono">
                Danger Zone: Selective Database Reset
              </h3>
              <span className="text-xs text-white/50 font-sans">
                Selectively wipe historical or test data domains. Your CEO account is permanently safe.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const updated: Record<string, boolean> = {};
                RESET_CATEGORIES.forEach((c) => {
                  updated[c.key] = true;
                });
                setResetCategories(updated);
              }}
              className="text-xs font-sans px-2.5 py-1 rounded-[2px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => {
                const defaults: Record<string, boolean> = {};
                RESET_CATEGORIES.forEach((c) => {
                  defaults[c.key] = c.defaultOn;
                });
                setResetCategories(defaults);
              }}
              className="text-xs font-sans px-2.5 py-1 rounded-[2px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              Defaults
            </button>
            <button
              type="button"
              onClick={() => {
                const empty: Record<string, boolean> = {};
                RESET_CATEGORIES.forEach((c) => {
                  empty[c.key] = false;
                });
                setResetCategories(empty);
              }}
              className="text-xs font-sans px-2.5 py-1 rounded-[2px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* 8 Category Selection Cards: 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {RESET_CATEGORIES.map((cat) => {
            const isChecked = resetCategories[cat.key] ?? false;
            const count = getCategoryCount(cat.key);
            const CatIcon = cat.icon;
            return (
              <label
                key={cat.key}
                className={`p-3.5 rounded-[2px] border flex flex-col justify-between gap-2.5 cursor-pointer transition-all ${
                  isChecked
                    ? "bg-red-500/[0.06] border-red-500/30 text-white"
                    : "bg-black/30 border-white/5 text-white/40 hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CatIcon
                      size={16}
                      weight="fill"
                      className={isChecked ? "text-red-400" : "text-white/30"}
                    />
                    <span className="font-semibold text-xs font-sans text-white">
                      {cat.shortLabel}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      handleToggleResetCategory(cat.key, e.target.checked)
                    }
                    className="accent-red-500 h-4 w-4 rounded-[2px] cursor-pointer shrink-0"
                  />
                </div>

                <p className="text-[11px] text-white/50 leading-relaxed font-sans line-clamp-2">
                  {cat.description}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] font-mono">
                  <span className="text-white/40">Records:</span>
                  <span
                    className={
                      isChecked ? "text-red-300 font-bold" : "text-white/40"
                    }
                  >
                    {count.toLocaleString()}
                  </span>
                </div>
              </label>
            );
          })}
        </div>

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-red-500/15">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <ShieldCheck size={16} weight="fill" className="text-emerald-400 shrink-0" />
            <span>
              CEO credentials, system settings, pricing tiers, and shift policies are permanently preserved.
            </span>
          </div>

          <Button
            variant="secondary"
            className="text-xs h-9 px-5 bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25 hover:text-red-300 rounded-[2px] font-semibold cursor-pointer active:scale-[0.97] transition-all self-end sm:self-auto shrink-0"
            onClick={handleOpenResetModal}
            disabled={selectedResetCount === 0 || isResetting}
          >
            <Warning size={14} weight="fill" className="mr-1.5" />
            <span>
              Reset Selected Domains ({selectedResetCount})
            </span>
          </Button>
        </div>
      </Card>

      {/* ── Floating Staged Purge Banner (Tier 1/2) ── */}
      {purgeStage === "staged" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-content-fade">
          <div className="max-w-3xl mx-auto px-4 pb-4">
            <div className="p-4 bg-[#01142B] border border-amber-500/40 rounded-[2px] flex flex-col gap-3 shadow-2xl">
              <div className="w-full bg-white/10 h-1 rounded-[1px] overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(secondsRemaining / 30) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-amber-300 font-sans">
                      File Purge Staged for Deletion
                    </span>
                    <span className="text-[11px] text-white/50 font-sans">
                      Permanent deletion executes in{" "}
                      <strong className="text-amber-400 font-mono">
                        {secondsRemaining}s
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="text-xs h-8 px-3 rounded-[2px] text-white bg-white/10 border-white/20 hover:bg-white/20 font-semibold cursor-pointer active:scale-[0.97]"
                    onClick={handleUndoPurge}
                  >
                    <ArrowCounterClockwise size={14} weight="bold" className="mr-1" />
                    Undo Purge
                  </Button>
                  <Button
                    variant="secondary"
                    className="text-xs h-8 px-3 rounded-[2px] text-amber-300 bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/25 font-semibold cursor-pointer active:scale-[0.97]"
                    onClick={handleCommitPurge}
                  >
                    <Lightning size={14} weight="fill" className="mr-1" />
                    Commit Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Redesigned Sleek Purge Confirmation Dialog (Tier 1/2) ── */}
      <AlertDialog open={isConfirmPurgeOpen} onOpenChange={setIsConfirmPurgeOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-[2px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Trash size={20} weight="fill" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-white font-sans">
                  Storage File Cleanup
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-white/50 font-sans mt-0.5">
                  Permanently delete unprotected study attachments in Cloudflare R2.
                </AlertDialogDescription>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-3 text-xs font-sans">
              {/* Scope Selection */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPurgeScope("FINISHED_ONLY")}
                  className={`p-3 rounded-[2px] border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    purgeScope === "FINISHED_ONLY"
                      ? "bg-[#CC6600]/20 border-[#CC6600] text-white"
                      : "bg-[#010D1F] border-white/10 text-white/60 hover:border-white/20"
                  }`}
                >
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    <ShieldCheck size={14} weight="fill" className="text-[#CC6600]" />
                    Completed
                  </span>
                  <span className="text-[11px] text-white/50 leading-tight">
                    Delivered studies past {config.retentionPeriodDays} days.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPurgeScope("ALL_PROJECTS")}
                  className={`p-3 rounded-[2px] border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    purgeScope === "ALL_PROJECTS"
                      ? "bg-amber-500/20 border-amber-500 text-white"
                      : "bg-[#010D1F] border-white/10 text-white/60 hover:border-white/20"
                  }`}
                >
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Warning size={14} weight="fill" className="text-amber-400" />
                    All Studies
                  </span>
                  <span className="text-[11px] text-white/50 leading-tight">
                    Cleans unprotected files across all studies.
                  </span>
                </button>
              </div>

              {purgeScope === "ALL_PROJECTS" && (
                <label className="p-2.5 bg-[#01142B] border border-white/10 rounded-[2px] flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deleteTestProjects}
                    onChange={(e) => setDeleteTestProjects(e.target.checked)}
                    className="accent-[#CC6600] h-4 w-4 rounded-[2px] cursor-pointer"
                  />
                  <span className="text-[11px] text-white/70">
                    Also clear unquoted test submissions from Admin triage
                  </span>
                </label>
              )}

              {/* Grace Period Reassurance */}
              <div className="p-2.5 bg-[#011E38]/80 border border-emerald-500/30 rounded-[2px] flex items-center gap-2 text-[11px] text-emerald-300">
                <ShieldCheck size={15} weight="fill" className="shrink-0" />
                <span>Includes a 30-second grace period with instant Undo.</span>
              </div>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="pt-3 gap-2">
            <AlertDialogCancel className="text-xs h-8 px-3 rounded-[2px] font-sans">
              Cancel
            </AlertDialogCancel>
            <button
              type="button"
              onClick={handleInitiateStagedPurge}
              className="text-xs h-8 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-[2px] font-sans font-semibold cursor-pointer active:scale-[0.97] transition-all"
            >
              Stage File Purge
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Redesigned Sleek Fresh Database Reset Modal (Tier 3) ── */}
      <AlertDialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-[2px] bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Warning size={20} weight="fill" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-white font-sans">
                  Confirm Database Reset
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-white/50 font-sans mt-0.5">
                  Permanent deletion of selected data domains.
                </AlertDialogDescription>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 pt-2 text-xs font-sans">
              {/* Compact Impact Pill Box */}
              <div className="p-3 bg-red-500/[0.05] border border-red-500/20 rounded-[2px] flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-lg font-bold text-red-300">
                    {getTotalResetRecords().toLocaleString()}{" "}
                    <span className="text-xs font-sans text-white/50 font-normal">
                      records to be purged
                    </span>
                  </span>
                  <span className="text-[10px] font-mono text-white/40">
                    {selectedResetCount} of {RESET_CATEGORIES.length} domains
                  </span>
                </div>

                {/* Inline Domain Tag Chips */}
                <div className="flex flex-wrap gap-1">
                  {RESET_CATEGORIES.filter((c) => resetCategories[c.key]).map((c) => (
                    <span
                      key={c.key}
                      className="text-[10px] font-sans bg-red-500/15 text-red-200 border border-red-500/25 px-1.5 py-0.5 rounded-[2px] flex items-center gap-1"
                    >
                      <Check size={10} weight="bold" />
                      {c.shortLabel} ({getCategoryCount(c.key)})
                    </span>
                  ))}
                </div>

                {/* R2 storage impact if files included */}
                {resetPreview &&
                  (resetCategories.purgeStudies || resetCategories.purgeFinance) &&
                  resetPreview.r2FileCount > 0 && (
                    <div className="text-[11px] font-mono text-white/50 pt-1 border-t border-red-500/15 flex items-center justify-between">
                      <span>Cloudflare R2 Files:</span>
                      <span className="text-white/80">
                        {resetPreview.r2FileCount} files (~{resetPreview.r2StorageMB} MB)
                      </span>
                    </div>
                  )}
              </div>

              {/* CEO Password Input with Eye Toggle */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-white font-sans">
                  CEO Account Password:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={ceoPassword}
                    onChange={(e) => setCeoPassword(e.target.value)}
                    placeholder="Enter password"
                    className="bg-black/50 border border-white/15 rounded-[2px] px-3 py-2 text-sm text-white font-sans w-full outline-none focus:border-red-500/50 transition-colors placeholder:text-white/25 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeSlash size={16} weight="fill" />
                    ) : (
                      <Eye size={16} weight="fill" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmation Phrase with Click-to-Fill Badge */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white font-sans">
                    Confirmation:
                  </label>
                  <span className="text-[11px] text-white/40 font-sans">
                    Type{" "}
                    <button
                      type="button"
                      onClick={() => setConfirmPhrase("RESET")}
                      className="font-mono font-bold text-red-400 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 px-1.5 py-0.5 rounded-[2px] cursor-pointer active:scale-95 transition-all"
                      title="Click to auto-fill"
                    >
                      RESET
                    </button>
                  </span>
                </div>
                <input
                  type="text"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder="RESET"
                  className="bg-black/50 border border-white/15 rounded-[2px] px-3 py-2 text-sm text-white font-mono w-full outline-none focus:border-red-500/50 transition-colors placeholder:text-white/25"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="pt-3 gap-2">
            <AlertDialogCancel className="text-xs h-8 px-3 rounded-[2px] font-sans">
              Cancel
            </AlertDialogCancel>
            <button
              type="button"
              onClick={handleExecuteReset}
              disabled={!isResetFormValid || isResetting}
              className={`text-xs h-8 px-4 rounded-[2px] font-sans font-semibold transition-all cursor-pointer active:scale-[0.97] ${
                isResetFormValid && !isResetting
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-sm"
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              }`}
            >
              {isResetting ? "Resetting Database..." : "Commit Permanent Reset"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Toast Notifications ── */}
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
