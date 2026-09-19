import { z } from "zod";

export const ReportTypeEnum = z.enum([
  "revenue-summary",
  "expert-performance",
  "project-volume",
  "turnaround-analytics",
  "dispute-refund",
  "client-acquisition",
  "ledger-export",
  "payout-report",
]);
export type ReportType = z.infer<typeof ReportTypeEnum>;

export const ReportQuerySchema = z.object({
  reportType: ReportTypeEnum,
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  packageName: z.string().optional(),
});
export type ReportQueryInput = z.infer<typeof ReportQuerySchema>;

export const ArchiveProjectSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
});
export type ArchiveProjectInput = z.infer<typeof ArchiveProjectSchema>;

export const ArchiveFilterSchema = z.object({
  search: z.string().optional(),
  packageName: z.string().optional(),
});
export type ArchiveFilterInput = z.infer<typeof ArchiveFilterSchema>;

export const DataDeletionRequestSchema = z.object({
  notes: z.string().optional(),
});
export type DataDeletionRequestInput = z.infer<typeof DataDeletionRequestSchema>;

export const ProcessDeletionSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  status: z.enum(["PROCESSED", "REJECTED"]),
  notes: z.string().optional(),
});
export type ProcessDeletionInput = z.infer<typeof ProcessDeletionSchema>;

export const AuditLogFilterSchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  actorRole: z.string().optional(),
});
export type AuditLogFilterInput = z.infer<typeof AuditLogFilterSchema>;

export interface ArchivedProjectDTO {
  id: string;
  projectId: string;
  intakeId: string;
  clientName: string;
  packageName: string;
  snapshot: unknown;
  archivedAt: string;
  archivedBy: string;
  filesPurged: boolean;
  filesPurgedAt: string | null;
}

export interface AuditLogDTO {
  id: string;
  projectId: string | null;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  metadata: unknown;
  createdAt: string;
}

export const StorageRetentionConfigSchema = z.object({
  retentionPeriodDays: z.number().int().min(1).max(3650),
  purgeInactiveDays: z.number().int().min(1).max(3650),
  autoPurgeEnabled: z.boolean(),
  keepDatasets: z.boolean(),
  keepResearchDocs: z.boolean(),
  keepQuestionnaires: z.boolean(),
  keepReceiptPhotos: z.boolean(),
  keepChatHistory: z.boolean(),
  keepDeliverables: z.boolean(),
});
export type StorageRetentionConfigInput = z.infer<typeof StorageRetentionConfigSchema>;

export interface StorageRetentionConfigDTO {
  retentionPeriodDays: number;
  purgeInactiveDays: number;
  autoPurgeEnabled: boolean;
  keepDatasets: boolean;
  keepResearchDocs: boolean;
  keepQuestionnaires: boolean;
  keepReceiptPhotos: boolean;
  keepChatHistory: boolean;
  keepDeliverables: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export interface DataDeletionRequestDTO {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  requestedAt: string;
  processedAt: string | null;
  deletedFields: string[];
  retainedFields: string[];
  status: "PENDING" | "PROCESSED" | "REJECTED";
  processedBy: string | null;
}

export interface InfrastructureHealthDTO {
  supabase: {
    status: "HEALTHY" | "WARNING" | "CRITICAL";
    databaseSizeMB: number;
    databaseLimitMB: number;
    percentageUsed: number;
    totalRows: number;
    latencyMs: number;
    connectionPoolStatus: string;
    tableBreakdown?: {
      projects: number;
      users: number;
      deliverables: number;
      messages: number;
      auditLogs: number;
      notificationLogs: number;
    };
  };
  cloudflare: {
    status: "HEALTHY" | "WARNING" | "CRITICAL";
    totalFiles: number;
    storageUsedMB: number;
    storageLimitMB: number;
    percentageUsed: number;
    purgedFilesCount: number;
    purgedSavingsMB: number;
    bucketName?: string;
    region?: string;
  };
  resend: {
    status: "HEALTHY" | "WARNING" | "CRITICAL";
    sentToday: number;
    dailyLimit: number;
    sentThisMonth: number;
    monthlyLimit: number;
    dailyPercentageUsed: number;
    monthlyPercentageUsed: number;
    deliverySuccessRate: number;
    failedCount: number;
    mode: "PRODUCTION_API" | "LOCAL_SIMULATION";
  };
  triggerDev: {
    status: "HEALTHY" | "WARNING" | "CRITICAL";
    runsThisMonth: number;
    monthlyLimit: number;
    percentageUsed: number;
    activeJobsCount: number;
    queuedJobsCount: number;
    failedRunsCount: number;
    successRate: number;
    mode: "PRODUCTION_CLOUD" | "LOCAL_DEV_ENGINE";
    endpointUrl: string;
    registeredJobs: Array<{
      id: string;
      name: string;
      schedule: string;
      lastRunStatus: "SUCCESS" | "RUNNING" | "QUEUED" | "FAILED";
    }>;
  };
  overallStatus: "HEALTHY" | "WARNING" | "CRITICAL";
  hasActiveWarning: boolean;
  warningDetails: string[];
  lastCheckedAt: string;
}

// ─── Fresh Database Reset (Selective Categories) ─────────────────────────────

export const FreshDatabaseResetSchema = z.object({
  ceoPassword: z.string().min(1, "CEO password is required"),
  confirmationPhrase: z.string().refine(
    (val) => val === "RESET" || val === "RESET JAXIS DATABASE",
    { message: 'Type "RESET" to confirm' }
  ),
  // CEO-selectable data domains — each toggleable independently
  purgeStudies: z.boolean().default(true),
  purgeFinance: z.boolean().default(true),
  purgeUsers: z.boolean().default(true),
  purgeAttendance: z.boolean().default(true),
  purgeMessages: z.boolean().default(true),
  purgeQA: z.boolean().default(true),
  purgeNotifications: z.boolean().default(true),
  purgeAuditLogs: z.boolean().default(false), // default OFF for compliance
});
export type FreshDatabaseResetInput = z.infer<typeof FreshDatabaseResetSchema>;

export interface FreshDatabaseResetResultDTO {
  categoriesPurged: string[];
  purgedStudiesCount: number;
  purgedUsersCount: number;
  purgedR2FilesCount: number;
  purgedFinanceCount: number;
  purgedMessagesCount: number;
  purgedAttendanceCount: number;
  purgedQACount: number;
  purgedNotificationsCount: number;
  purgedAuditLogsCount: number;
  freedMB: number;
  preservedCeoEmail: string;
}

export interface DatabaseResetPreviewDTO {
  studies: number;
  finance: number;
  users: number;
  attendance: number;
  messages: number;
  qa: number;
  notifications: number;
  auditLogs: number;
  r2FileCount: number;
  r2StorageMB: number;
}



