import fs from "fs";
import path from "path";
import type { RoleName, AnalysisFileCategory, DeliverableCategory } from "@prisma/client";
import { getDevUserByEmail, getDevUsers } from "@/lib/mock-data/users.data";
import { clientPackageName } from "@/features/projects/client-packages";
import { ANALYSIS_CATEGORY_METADATA, assertCanUploadAnalysis, missingForReview, validateAnalysisFileFormat } from "@/lib/analysis-rules";
import { QA_DECISION_METADATA, ERROR_CLASSIFICATION_METADATA, assertCanSubmitQaReview } from "@/lib/qa-rules";
import { DELIVERABLE_CATEGORY_METADATA, REVISION_CLASSIFICATION_METADATA, getRevisionWindowCountdown, isRevisionWindowActive } from "@/lib/delivery-rules";
import type { AnalysisFileDTO, ScopeCreepLogDTO, WorkbenchDataDTO } from "@/features/analysis/schemas";
import type { QaInspectionDeskDTO, QaReviewDTO } from "@/features/qa/schemas";
import type { AdminDeliverablesDeskDTO, ClientDeliverablesDTO, DeliverableDTO, RevisionRequestDTO } from "@/features/deliverables/schemas";

/**
 * Offline dev only (`npm run dev:offline`): the statistician workbench, QA review and files desks
 * built from the local sample files (.dev-projects.json, .dev-sows.json, dev_data/payments.json,
 * .dev-analysis.json, .dev-deliverables.json). Never used in production or with the real database.
 */
export const devStudyDataEnabled = () =>
  process.env.NODE_ENV !== "production" && process.env.JAXIS_OFFLINE === "1";

type User = { id?: string | null; email?: string | null; role?: RoleName | string };
type Json = Record<string, unknown>;

type DevProject = {
  id: string;
  intakeId: string;
  clientId: string;
  researchTitle: string;
  researchQuestions?: string | null;
  researchObjectives?: string | null;
  hypotheses?: string | null;
  chapters13?: string | null;
  questionnaire?: string | null;
  masterStatus: string;
  packageName?: string | null;
  createdAt: string;
  deadlineRequested?: string | null;
  deliveredAt?: string | null;
  filesPurgeAt?: string | null;
  qaApproved?: boolean;
  isLocked?: boolean;
  client?: { id?: string; fullName?: string; email?: string; clientProfile?: { institutionSchool?: string; academicProgram?: string } };
  assignment?: {
    statisticianId?: string | null;
    qaLeadId?: string | null;
    statistician?: { fullName?: string; email?: string } | null;
    qaLead?: { fullName?: string; email?: string } | null;
    assignedAt?: string | null;
    slaDueAt?: string | null;
    slaPausedAt?: string | null;
    slaPauseReason?: string | null;
    slaPausedBy?: string | null;
  } | null;
  financialSummary?: { totalAmount?: number; isFullyPaid?: boolean } | null;
  hasActiveDispute?: boolean;
  hasPendingRefund?: boolean;
  /** Offline "Flag Extra Work": the open flag, if any. */
  scopeCreep?: { flagReason: string; flaggedAt: string; flaggedBy: string; flaggerName: string } | null;
  files?: Array<{ id: string; fileName: string; filePath: string; fileType?: string; fileCategory?: string; uploadedAt?: string }>;
};

export type DevAnalysisFile = {
  id: string;
  projectId: string;
  statisticianId: string;
  statisticianName: string;
  fileName: string;
  /** Set for files uploaded offline (kept in .dev-uploads under this key); sample files have none. */
  filePath?: string;
  fileType: string;
  fileSize: number;
  fileCategory: AnalysisFileCategory;
  version: number;
  isCurrent: boolean;
  notes: string | null;
  uploadedAt: string;
};
export type DevQaReview = {
  id: string;
  projectId: string;
  reviewerId: string;
  reviewerName: string;
  decision: "QA_APPROVED" | "QA_REJECTED" | "ESCALATED_TO_CEO";
  errorClassification: string | null;
  comments: string;
  reviewedAt: string;
  /** Set when the reviewer sends the work back: the analyst's fix-by time. */
  qaRevisionDueAt?: string | null;
};
export type DevDeliverable = {
  id: string;
  projectId: string;
  category: DeliverableCategory;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploaderName: string;
  isFinalReleased: boolean;
  releasedAt: string | null;
  createdAt: string;
};

// Fixed file paths (not built from a variable) so the build doesn't trace the whole project.
const FILES = {
  projects: path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-projects.json"),
  analysis: path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-analysis.json"),
  deliverables: path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-deliverables.json"),
  sows: path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-sows.json"),
  payments: path.join(/*turbopackIgnore: true*/ process.cwd(), "dev_data", "payments.json"),
  revisions: path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-revisions.json"),
};
function readJson<T>(full: string): T[] {
  try {
    return fs.existsSync(full) ? (JSON.parse(fs.readFileSync(full, "utf-8")) as T[]) : [];
  } catch {
    return [];
  }
}

function load(projectId: string) {
  const project = readJson<DevProject>(FILES.projects).find((p) => p.id === projectId || p.intakeId === projectId);
  if (!project) return null;
  const analysis = readJson<{ files?: DevAnalysisFile[]; reviews?: DevQaReview[] } & Json>(FILES.analysis);
  const files = analysis.flatMap((a) => (a.projectId === project.id ? (a.files ?? []) : []));
  const reviews = analysis.flatMap((a) => (a.projectId === project.id ? (a.reviews ?? []) : []));
  const deliverables = readJson<DevDeliverable>(FILES.deliverables).filter((d) => d.projectId === project.id);
  const sow = readJson<Json>(FILES.sows)
    .filter((s) => s.projectId === project.id && s.signedAt)
    .sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)))[0];
  const payments = readJson<{ projectId: string; paymentStatus: string; amountSubmitted?: number }>(FILES.payments).filter((p) => p.projectId === project.id);
  return { project, files, reviews, deliverables, sow, payments };
}

function who(user: User, p: DevProject) {
  const ids = new Set<string>();
  if (user.id) ids.add(user.id);
  const dev = user.email ? getDevUserByEmail(user.email) : undefined;
  if (dev?.id) ids.add(dev.id);
  const role = (user.role as RoleName) || "CLIENT";
  return {
    isStatistician: !!p.assignment?.statisticianId && ids.has(p.assignment.statisticianId),
    isQaLead: !!p.assignment?.qaLeadId && ids.has(p.assignment.qaLeadId),
    isClient: ids.has(p.clientId) || (!!user.email && p.client?.email?.toLowerCase() === user.email.toLowerCase()),
    isManagement: role === "ADMIN" || role === "CEO",
  };
}

function sowInfo(sow: Json | undefined) {
  if (!sow) return null;
  const snap = (sow.contentSnapshot ?? {}) as Json;
  const scope = typeof snap.scopeOfWork === "string" ? snap.scopeOfWork : "";
  const deliverables = Array.isArray(snap.deliverables)
    ? snap.deliverables.map(String)
    : scope.split("\n").map((s) => s.replace(/^[-*•\d.]+\s*/, "").trim()).filter(Boolean);
  return { id: String(sow.id), scopeOfWork: scope, deliverables, days: Number(sow.turnaroundDays ?? 7), signedAt: sow.signedAt ? String(sow.signedAt) : null };
}

function sla(p: DevProject) {
  if (!p.assignment?.statisticianId) return null;
  const due = new Date(p.assignment.slaDueAt ?? p.deadlineRequested ?? Date.now() + 7 * 864e5);
  const diffMs = due.getTime() - Date.now();
  const days = Math.ceil(diffMs / 864e5);
  return { due, diffMs, days };
}

const reviewDTO = (r: DevQaReview): QaReviewDTO => ({
  id: r.id,
  projectId: r.projectId,
  reviewerId: r.reviewerId,
  reviewerName: r.reviewerName,
  decision: r.decision,
  decisionLabel: QA_DECISION_METADATA[r.decision]?.label || r.decision,
  errorClassification: r.errorClassification as QaReviewDTO["errorClassification"],
  errorClassificationLabel: r.errorClassification
    ? ERROR_CLASSIFICATION_METADATA[r.errorClassification as keyof typeof ERROR_CLASSIFICATION_METADATA]?.label || r.errorClassification
    : null,
  comments: r.comments,
  qaRevisionDueAt: r.qaRevisionDueAt ?? null,
  reviewedAt: r.reviewedAt,
});

const clientFiles = (p: DevProject) =>
  (p.files ?? []).map((f) => ({
    id: f.id,
    fileName: f.fileName,
    filePath: f.filePath,
    fileType: f.fileType ?? "application/octet-stream",
    fileCategory: f.fileCategory ?? "OTHER",
    uploadedAt: f.uploadedAt ?? p.createdAt,
  }));

type Result<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

export function devWorkbench(projectId: string, user: User): Result<WorkbenchDataDTO> {
  const d = load(projectId);
  if (!d) return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  const { project: p } = d;
  const w = who(user, p);
  if (!w.isStatistician && !w.isQaLead && !w.isManagement) {
    return { success: false, error: { code: "FORBIDDEN", message: "You do not have access to this study's workbench." } };
  }
  const s = sla(p);
  const sowI = sowInfo(d.sow);
  const counts = new Map<string, number>();
  d.files.forEach((f) => counts.set(f.fileCategory, (counts.get(f.fileCategory) ?? 0) + 1));
  const upload = assertCanUploadAnalysis(p.masterStatus as never);
  const reviews = d.reviews.map(reviewDTO);
  return {
    success: true,
    data: {
      project: {
        id: p.id,
        intakeId: p.intakeId,
        researchTitle: p.researchTitle,
        researchQuestions: p.researchQuestions ?? "",
        researchObjectives: p.researchObjectives ?? "",
        hypotheses: p.hypotheses ?? null,
        chapters13: p.chapters13 ?? null,
        questionnaire: p.questionnaire ?? null,
        masterStatus: p.masterStatus,
        packageName: p.packageName ?? null,
        clientName: p.client?.fullName ?? "Client",
        clientEmail: p.client?.email ?? "",
        clientSchool: p.client?.clientProfile?.institutionSchool ?? null,
        createdAt: p.createdAt,
        deliveredAt: p.deliveredAt ?? null,
      },
      assignment: s
        ? {
            id: `dev_assign_${p.id}`,
            statisticianId: p.assignment?.statisticianId ?? "",
            statisticianName: p.assignment?.statistician?.fullName ?? "Statistical Analyst",
            statisticianEmail: "stat@jaxis.dev",
            qaLeadId: p.assignment?.qaLeadId ?? "",
            qaLeadName: p.assignment?.qaLead?.fullName ?? "Reviewer",
            qaLeadEmail: "qa@jaxis.dev",
            slaStartAt: p.createdAt,
            slaDueAt: s.due.toISOString(),
            slaDueDays: s.days,
            slaLabel: s.diffMs < 0 ? `${Math.abs(s.days)}d Overdue` : s.days === 1 ? "1 day remaining" : `${s.days} days remaining`,
            isPaused: false,
            isOverdue: s.diffMs < 0,
            isUrgent: s.diffMs >= 0 && s.days <= 2,
          }
        : null,
      sow: sowI
        ? { id: sowI.id, scopeOfWork: sowI.scopeOfWork, deliverables: sowI.deliverables, timelineDays: sowI.days, signedAt: sowI.signedAt }
        : null,
      clientFiles: clientFiles(p),
      analysisFiles: d.files.map((f) => ({
        id: f.id,
        projectId: f.projectId,
        statisticianId: f.statisticianId,
        statisticianName: f.statisticianName,
        fileName: f.fileName,
        filePath: f.filePath ?? `dev/${f.projectId}/${f.fileName}`,
        fileType: f.fileType,
        fileSize: f.fileSize,
        fileCategory: f.fileCategory,
        categoryLabel: ANALYSIS_CATEGORY_METADATA[f.fileCategory]?.label || f.fileCategory,
        version: f.version,
        isCurrent: f.isCurrent,
        notes: f.notes,
        uploadedAt: f.uploadedAt,
        versionCount: counts.get(f.fileCategory) ?? 1,
      })),
      activeScopeCreep: p.scopeCreep ? scopeCreepDTO(p) : null,
      canUpload: w.isStatistician && upload.allowed,
      uploadDisabledReason: w.isStatistician ? upload.reason : "Only the assigned statistical analyst can upload analysis files.",
      isAssignedStatistician: w.isStatistician,
      isAssignedQaLead: w.isQaLead,
      isManagement: w.isManagement,
      qaReviews: reviews,
      activeRevision: [...reviews].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt)).find((r) => r.decision === "QA_REJECTED") ?? null,
    },
  };
}

export function devQaDesk(projectId: string, user: User): Result<QaInspectionDeskDTO> {
  const d = load(projectId);
  if (!d) return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "Research study record not found." } };
  const { project: p } = d;
  const w = who(user, p);
  if (!w.isQaLead && !w.isStatistician && !w.isManagement) {
    return { success: false, error: { code: "FORBIDDEN", message: "You are not assigned to review this study." } };
  }
  const s = sla(p);
  const sowI = sowInfo(d.sow);
  const reviews = d.reviews.map(reviewDTO);
  const status = assertCanSubmitQaReview(p.masterStatus as never);
  const qaApproved = p.qaApproved ?? d.reviews.some((r) => r.decision === "QA_APPROVED");
  return {
    success: true,
    data: {
      project: {
        id: p.id,
        intakeId: p.intakeId,
        researchTitle: p.researchTitle,
        researchQuestions: p.researchQuestions ?? "",
        researchObjectives: p.researchObjectives ?? "",
        hypotheses: p.hypotheses ?? null,
        chapters13: p.chapters13 ?? null,
        questionnaire: p.questionnaire ?? null,
        masterStatus: p.masterStatus,
        packageName: p.packageName ?? null,
        clientName: p.client?.fullName ?? "Client",
        clientSchool: p.client?.clientProfile?.institutionSchool ?? null,
        createdAt: p.createdAt,
        qaApproved,
        isLocked: p.isLocked ?? false,
      },
      assignment: s
        ? {
            statisticianId: p.assignment?.statisticianId ?? "",
            statisticianName: p.assignment?.statistician?.fullName ?? "Statistical Analyst",
            statisticianEmail: "stat@jaxis.dev",
            qaLeadId: p.assignment?.qaLeadId ?? "",
            qaLeadName: p.assignment?.qaLead?.fullName ?? "Reviewer",
            qaLeadEmail: "qa@jaxis.dev",
            slaDueAt: s.due.toISOString(),
            slaDueDays: s.days,
            isOverdue: s.diffMs < 0,
            isPaused: false,
          }
        : null,
      sow: sowI
        ? { id: sowI.id, scopeOfWork: sowI.scopeOfWork, deliverables: sowI.deliverables, turnaroundDays: sowI.days, signedAt: sowI.signedAt }
        : null,
      analysisFiles: [...d.files]
        .sort((a, b) => a.fileCategory.localeCompare(b.fileCategory) || b.version - a.version)
        .map((f) => ({
          id: f.id,
          fileName: f.fileName,
          filePath: f.filePath ?? `dev/${f.projectId}/${f.fileName}`,
          fileType: f.fileType,
          fileSize: f.fileSize,
          fileCategory: f.fileCategory,
          categoryLabel: ANALYSIS_CATEGORY_METADATA[f.fileCategory]?.label || f.fileCategory,
          version: f.version,
          isCurrent: f.isCurrent,
          notes: f.notes,
          uploadedAt: f.uploadedAt,
          statisticianName: f.statisticianName,
        })),
      clientFiles: clientFiles(p),
      reviewHistory: reviews,
      rejectionCount: d.reviews.filter((r) => r.decision === "QA_REJECTED").length,
      activeRevision: [...reviews].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt)).find((r) => r.decision === "QA_REJECTED") ?? null,
      canReview: (w.isQaLead || w.isManagement) && status.allowed,
      reviewDisabledReason: !(w.isQaLead || w.isManagement)
        ? "Only the assigned reviewer or an admin can submit a review."
        : status.reason || null,
    },
  };
}

function deliverableDTO(x: DevDeliverable): DeliverableDTO {
  return {
    id: x.id,
    projectId: x.projectId,
    category: x.category,
    categoryLabel: DELIVERABLE_CATEGORY_METADATA[x.category]?.label ?? x.category,
    fileName: x.fileName,
    filePath: `dev/${x.projectId}/${x.fileName}`,
    fileSize: x.fileSize,
    fileType: x.fileType,
    uploadedBy: x.uploadedBy,
    uploaderName: x.uploaderName,
    isFinalReleased: x.isFinalReleased,
    releasedAt: x.releasedAt,
    releasedBy: x.isFinalReleased ? "cmt5plrh90000lrrkrk76bb0b" : null,
    releaserName: x.isFinalReleased ? "Operations Manager" : null,
    downloadCount: 0,
    createdAt: x.createdAt,
    updatedAt: x.releasedAt ?? x.createdAt,
  };
}

/** A staff member's saved signature (offline sample users), or null. Never someone else's. */
function staffSignature(userId?: string | null): string | null {
  if (!userId) return null;
  const u = Object.values(getDevUsers()).find((x) => x.id === userId);
  return u?.staffProfile?.signatureUrl || null;
}

function money(d: NonNullable<ReturnType<typeof load>>) {
  const totalAmount = Number(d.project.financialSummary?.totalAmount ?? 0);
  const totalPaid = d.payments
    .filter((p) => ["VERIFIED", "FULLY_PAID"].includes(p.paymentStatus))
    .reduce((sum, p) => sum + Number(p.amountSubmitted ?? 0), 0);
  return { totalAmount, totalPaid, remainingBalance: Math.max(0, totalAmount - totalPaid) };
}

/** Revision window: 3 days after delivery (offline sample; the real one skips weekends and holidays). */
const revisionExpiry = (p: DevProject) =>
  p.deliveredAt ? new Date(new Date(p.deliveredAt).getTime() + 3 * 864e5).toISOString() : null;

export function devAdminDeliverables(projectId: string, user: User): AdminDeliverablesDeskDTO {
  const d = load(projectId);
  if (!d) throw new Error(`Project ${projectId} not found.`);
  const w = who(user, d.project);
  if (!w.isManagement && !w.isStatistician && !w.isQaLead) throw new Error("Unauthorized.");
  const m = money(d);
  const qaApproved = d.project.qaApproved ?? d.reviews.some((r) => r.decision === "QA_APPROVED");
  const financialGatePassed = m.remainingBalance <= 0;
  const reasons = [
    ...(financialGatePassed ? [] : [`Balance of ${m.remainingBalance} is still unpaid.`]),
    ...(qaApproved ? [] : ["The reviewer hasn't approved the files yet."]),
    ...(d.deliverables.length ? [] : ["No files have been added yet."]),
  ];
  return {
    project: {
      id: d.project.id,
      intakeId: d.project.intakeId,
      researchTitle: d.project.researchTitle,
      masterStatus: d.project.masterStatus,
      packageName: d.project.packageName ?? null,
      qaApproved,
      deliveredAt: d.project.deliveredAt ?? null,
      filesPurgeAt: d.project.filesPurgeAt ?? null,
      revisionWindowExpiresAt: revisionExpiry(d.project),
      client: { id: d.project.clientId, fullName: d.project.client?.fullName ?? "Client", email: d.project.client?.email ?? "" },
      assignedStatistician: d.project.assignment?.statisticianId
        ? { id: d.project.assignment.statisticianId, fullName: d.project.assignment.statistician?.fullName ?? "Statistical Analyst" }
        : null,
      assignedQaLead: d.project.assignment?.qaLeadId
        ? { id: d.project.assignment.qaLeadId, fullName: d.project.assignment.qaLead?.fullName ?? "Reviewer" }
        : null,
    },
    gateEligibility: {
      eligible: reasons.length === 0,
      financialGatePassed,
      qaGatePassed: qaApproved,
      ...m,
      isTier2Package: false,
      qaApproved,
      deliverablesCount: d.deliverables.length,
      reasons,
    },
    deliverables: d.deliverables.map(deliverableDTO),
    revisions: [],
  };
}

export function devClientDeliverables(projectId: string, user: User): ClientDeliverablesDTO {
  const d = load(projectId);
  if (!d) throw new Error(`Project ${projectId} not found.`);
  const p = d.project;
  const w = who(user, p);
  const isClient = (user.role ?? "CLIENT") === "CLIENT";
  if (isClient && !w.isClient) throw new Error("Unauthorized.");
  const m = money(d);
  const locked = m.remainingBalance > 0;
  const shown = d.deliverables.filter((x) => !isClient || x.isFinalReleased);
  const isReleased = !locked && (p.masterStatus === "DELIVERED" || Boolean(p.deliveredAt)) && shown.length > 0;
  const expires = revisionExpiry(p);
  const qaApproved = p.qaApproved ?? d.reviews.some((r) => r.decision === "QA_APPROVED");
  const approved = d.reviews.find((r) => r.decision === "QA_APPROVED");
  const revisions = readRevisions(p.id);
  return {
    project: {
      id: p.id,
      intakeId: p.intakeId,
      researchTitle: p.researchTitle,
      masterStatus: p.masterStatus,
      packageName: p.packageName ?? null,
      deliveredAt: p.deliveredAt ?? null,
      filesPurgeAt: p.filesPurgeAt ?? null,
      revisionWindowExpiresAt: expires,
    },
    isReleased,
    paymentLock: locked ? { isLocked: true, ...m } : null,
    revisionWindow: {
      ...getRevisionWindowCountdown(expires),
      expiresAtFormatted: expires
        ? new Date(expires).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })
        : null,
    },
    deliverables: shown.map(deliverableDTO),
    revisions: revisions.map((r) => revisionDTO(r, p)),
    hasPendingRevision: revisions.some((r) => r.status === "PENDING_REVIEW" || r.status === "INCLUDED"),
    qaCertificate:
      isReleased || qaApproved || p.masterStatus === "DELIVERED"
        ? {
            certificateId: `JAXIS-AUDIT-2026-${p.intakeId.replace(/^JAXIS-?/i, "")}`,
            researchTitle: p.researchTitle,
            clientName: p.client?.fullName ?? "Client",
            clientEmail: p.client?.email ?? "",
            institution: p.client?.clientProfile?.institutionSchool ?? "",
            program: p.client?.clientProfile?.academicProgram ?? "",
            tierExecuted: clientPackageName(p.packageName) ?? "",
            completionDate: new Date(p.deliveredAt ?? approved?.reviewedAt ?? Date.now()).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            statisticianName: p.assignment?.statistician?.fullName ?? "Statistical Analyst",
            statisticianTitle: "Statistical Analyst",
            statisticianSignatureUrl: staffSignature(p.assignment?.statisticianId),
            qaLeadName: approved?.reviewerName ?? p.assignment?.qaLead?.fullName ?? "JAXIS StatLab review team",
            qaLeadTitle: "Reviewing Statistical Analyst",
            // The approver's own signature from their profile (saved in .dev-users.json offline).
            qaSignatureUrl: staffSignature(approved?.reviewerId ?? p.assignment?.qaLeadId),
          }
        : null,
  };
}

/** Offline stand-in for a file download: a small placeholder (sample files have no real storage). */
export function devDeliverableDownload(deliverableId: string, user: User): { url: string; fileName: string } {
  const item = readJson<DevDeliverable>(FILES.deliverables).find((x) => x.id === deliverableId);
  if (!item) throw new Error("File not found.");
  const d = load(item.projectId);
  if (!d) throw new Error("File not found.");
  const isClient = (user.role ?? "CLIENT") === "CLIENT";
  if (isClient && (!who(user, d.project).isClient || !item.isFinalReleased)) throw new Error("This file isn't available to you yet.");
  if (isClient && money(d).remainingBalance > 0) throw new Error("Pay the rest of your balance to download your files.");
  const text = `Offline sample file: ${item.fileName}\nReal files are only available in the live app.\n`;
  return { url: `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`, fileName: item.fileName };
}

// ── Change requests (offline) ────────────────────────────────────────────────

type DevRevision = {
  id: string;
  projectId: string;
  clientId: string;
  description: string;
  requestedSections?: string | null;
  status: RevisionRequestDTO["status"];
  classification?: RevisionRequestDTO["classification"];
  classificationNotes?: string | null;
  classifiedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

const readRevisions = (projectId: string) =>
  readJson<DevRevision>(FILES.revisions)
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

function revisionDTO(r: DevRevision, p: DevProject): RevisionRequestDTO {
  return {
    id: r.id,
    projectId: r.projectId,
    projectTitle: p.researchTitle,
    intakeId: p.intakeId,
    clientId: r.clientId,
    clientName: p.client?.fullName ?? "Client",
    clientEmail: p.client?.email ?? "",
    description: r.description,
    requestedSections: r.requestedSections ?? null,
    status: r.status,
    classification: r.classification ?? null,
    classificationLabel: r.classification ? REVISION_CLASSIFICATION_METADATA[r.classification]?.label ?? null : null,
    classificationNotes: r.classificationNotes ?? null,
    classifiedBy: null,
    classifierName: null,
    classifiedAt: r.classifiedAt ?? null,
    supplementalQuotationId: null,
    supplementalSowId: null,
    resolvedAt: r.resolvedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Offline stand-in for submitClientRevision: same rules (owner, open window, one active request). */
export function devSubmitRevision(
  input: { projectId: string; description: string; requestedSections?: string },
  user: User
): RevisionRequestDTO {
  const d = load(input.projectId);
  if (!d) throw new Error("Study not found.");
  const p = d.project;
  if (!who(user, p).isClient) throw new Error("Only the client who sent this study can ask for changes.");
  if (!isRevisionWindowActive(revisionExpiry(p))) throw new Error("The free-change window for this study has closed.");
  if (money(d).remainingBalance > 0) {
    throw new Error("Pay the rest of your balance first. You can ask for changes once you have your files.");
  }
  const all = readJson<DevRevision>(FILES.revisions);
  if (all.some((r) => r.projectId === p.id && (r.status === "PENDING_REVIEW" || r.status === "INCLUDED"))) {
    throw new Error("You already sent a change request for this study.");
  }
  const now = new Date().toISOString();
  const rev: DevRevision = {
    id: `dev_rev_${Date.now()}`,
    projectId: p.id,
    clientId: p.clientId,
    description: input.description,
    requestedSections: input.requestedSections || null,
    status: "PENDING_REVIEW",
    classification: null,
    createdAt: now,
    updatedAt: now,
  };
  fs.writeFileSync(FILES.revisions, JSON.stringify([rev, ...all], null, 2), "utf-8");
  // Same as the real action: the study moves to "making your changes".
  const projects = readJson<DevProject>(FILES.projects);
  const i = projects.findIndex((x) => x.id === p.id);
  if (i >= 0) {
    projects[i] = { ...projects[i]!, masterStatus: "REVISION_REQUESTED" };
    fs.writeFileSync(FILES.projects, JSON.stringify(projects, null, 2), "utf-8");
  }
  return revisionDTO(rev, p);
}

/** One study on an analyst's or reviewer's list, in the same shape the database query returns. */
export type DevWorkloadRow = {
  id: string;
  projectId: string;
  assignedAt: Date;
  slaStartAt: Date;
  slaDueAt: Date;
  slaPausedAt: Date | null;
  slaPauseReason: string | null;
  slaPausedBy: string | null;
  project: {
    intakeId: string;
    researchTitle: string;
    packageName: string | null;
    masterStatus: string;
    deliveredAt: Date | null;
    researchObjectives: string | null;
    researchQuestions: string | null;
    hypotheses: string | null;
    client: { clientProfile: { academicProgram: string | null } | null } | null;
    files: Array<{ id: string; fileName: string; fileType: string; fileCategory: string }>;
  };
  statistician: { id: string; fullName: string; email: string };
  qaLead: { id: string; fullName: string; email: string };
};

/** The sample studies assigned to this analyst or reviewer (My Studies, QA Review Desk). */
export function devWorkload(user: User, as: "STATISTICIAN" | "SENIOR_QA_LEAD"): DevWorkloadRow[] {
  const users = getDevUsers();
  const person = (id: string, fallback?: { fullName?: string; email?: string } | null) => {
    const u = Object.values(users).find((x) => x.id === id);
    return { id, fullName: u?.fullName ?? fallback?.fullName ?? "Team member", email: u?.email ?? fallback?.email ?? "" };
  };
  return readJson<DevProject>(FILES.projects)
    .filter((p) => {
      if (!p.assignment?.statisticianId || !p.assignment.qaLeadId) return false;
      const w = who(user, p);
      return as === "STATISTICIAN" ? w.isStatistician : w.isQaLead;
    })
    .map((p) => {
      const a = p.assignment!;
      const assignedAt = new Date(a.assignedAt ?? p.createdAt);
      return {
        id: `dev_asg_${p.id}`,
        projectId: p.id,
        assignedAt,
        slaStartAt: assignedAt,
        slaDueAt: new Date(a.slaDueAt ?? p.deadlineRequested ?? Date.now() + 7 * 864e5),
        slaPausedAt: a.slaPausedAt ? new Date(a.slaPausedAt) : null,
        slaPauseReason: a.slaPauseReason ?? null,
        slaPausedBy: a.slaPausedBy ?? null,
        project: {
          intakeId: p.intakeId,
          researchTitle: p.researchTitle,
          packageName: p.packageName ?? null,
          masterStatus: p.masterStatus,
          deliveredAt: p.deliveredAt ? new Date(p.deliveredAt) : null,
          researchObjectives: p.researchObjectives ?? null,
          researchQuestions: p.researchQuestions ?? null,
          hypotheses: p.hypotheses ?? null,
          client: { clientProfile: { academicProgram: p.client?.clientProfile?.academicProgram ?? null } },
          files: (p.files ?? []).map((f) => ({
            id: f.id,
            fileName: f.fileName,
            fileType: f.fileType ?? "application/octet-stream",
            fileCategory: f.fileCategory ?? "OTHER",
          })),
        },
        statistician: person(a.statisticianId!, a.statistician),
        qaLead: person(a.qaLeadId!, a.qaLead),
      };
    })
    .sort((x, y) => x.slaDueAt.getTime() - y.slaDueAt.getTime());
}

/** Offline "Ask to pause the deadline": same rules as the database version, saved in .dev-projects.json. */
export function devRequestPause(projectId: string, user: User, reason: string): Result<{ message: string }> {
  const projects = readJson<DevProject>(FILES.projects);
  const p = projects.find((x) => x.id === projectId || x.intakeId === projectId);
  if (!p?.assignment) return { success: false, error: { code: "NOT_FOUND", message: "Assignment not found." } };
  const w = who(user, p);
  if (!w.isStatistician && !w.isQaLead && !w.isManagement) {
    return { success: false, error: { code: "FORBIDDEN", message: "You can only request deadline pauses for your assigned studies." } };
  }
  if (["DELIVERED", "CLOSED", "DISPUTED", "CANCELLED", "EXPIRED", "HALTED", "ETHICAL_BREACH"].includes(p.masterStatus)) {
    return { success: false, error: { code: "INVALID_STATE", message: "This study is finished, so its deadline can't be paused." } };
  }
  if (p.assignment.slaPausedAt) return { success: false, error: { code: "ALREADY_PAUSED", message: "The deadline is already paused." } };
  if (p.assignment.slaPauseReason) {
    return { success: false, error: { code: "ALREADY_REQUESTED", message: "You already asked to pause this deadline. An admin will answer it." } };
  }
  p.assignment.slaPauseReason = reason;
  p.assignment.slaPausedBy = user.id ?? null;
  fs.writeFileSync(FILES.projects, JSON.stringify(projects, null, 2), "utf-8");
  return { success: true, data: { message: "Pause request submitted for admin review." } };
}

// ── Offline workbench actions (upload, version history, download, send for review, flag extra work) ──

const scopeCreepDTO = (p: DevProject): ScopeCreepLogDTO => ({
  id: `dev_scope_${p.id}`,
  projectId: p.id,
  flaggedBy: p.scopeCreep!.flaggedBy,
  flaggerName: p.scopeCreep!.flaggerName,
  flagReason: p.scopeCreep!.flagReason,
  flaggedAt: p.scopeCreep!.flaggedAt,
  resolvedAt: null,
  resolvedBy: null,
  resolverName: null,
  resolutionNotes: null,
  supplementalQuotationId: null,
  isResolved: false,
});

const analysisDTO = (f: DevAnalysisFile, versionCount?: number): AnalysisFileDTO => ({
  id: f.id,
  projectId: f.projectId,
  statisticianId: f.statisticianId,
  statisticianName: f.statisticianName,
  fileName: f.fileName,
  filePath: f.filePath ?? `dev/${f.projectId}/${f.fileName}`,
  fileType: f.fileType,
  fileSize: f.fileSize,
  fileCategory: f.fileCategory,
  categoryLabel: ANALYSIS_CATEGORY_METADATA[f.fileCategory]?.label || f.fileCategory,
  version: f.version,
  isCurrent: f.isCurrent,
  notes: f.notes,
  uploadedAt: f.uploadedAt,
  versionCount,
});

function saveProjects(projects: DevProject[]) {
  fs.writeFileSync(FILES.projects, JSON.stringify(projects, null, 2), "utf-8");
}

function personName(user: User): string {
  const dev = user.email ? getDevUserByEmail(user.email) : undefined;
  return dev?.fullName ?? "Statistical Analyst";
}

/** The workbench folder a study's uploads go to (same key format as generateR2StorageKey). */
const workbenchFolder = (projectId: string) => `studies/${projectId.replace(/[^a-zA-Z0-9_-]/g, "_")}/workbench/`;

export function devUploadAnalysis(
  input: { projectId: string; fileName: string; filePath: string; fileType: string; fileSize?: number; fileCategory: AnalysisFileCategory; notes?: string },
  user: User
): Result<AnalysisFileDTO> {
  const projects = readJson<DevProject>(FILES.projects);
  const p = projects.find((x) => x.id === input.projectId);
  if (!p) return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  if (!who(user, p).isStatistician) {
    return { success: false, error: { code: "FORBIDDEN", message: "Only the assigned analyst can upload files." } };
  }
  const allowed = assertCanUploadAnalysis(p.masterStatus as never);
  if (!allowed.allowed) return { success: false, error: { code: "UPLOAD_BLOCKED", message: allowed.reason || "Uploads are locked." } };
  const format = validateAnalysisFileFormat(input.fileName, input.fileType, input.fileSize, input.fileCategory);
  if (!format.valid) return { success: false, error: { code: "INVALID_FILE_FORMAT", message: format.error || "Unsupported file." } };
  if (!input.filePath.startsWith(workbenchFolder(p.id))) {
    return { success: false, error: { code: "INVALID_FILE_PATH", message: "That file wasn't uploaded for this study. Please upload it again." } };
  }

  const all = readJson<{ id: string; projectId: string; files?: DevAnalysisFile[]; reviews?: DevQaReview[] }>(FILES.analysis);
  let entry = all.find((a) => a.projectId === p.id);
  if (!entry) {
    entry = { id: `dev_analysis_${p.id}`, projectId: p.id, files: [], reviews: [] };
    all.push(entry);
  }
  const files = entry.files ?? [];
  const sameKind = files.filter((f) => f.fileCategory === input.fileCategory);
  sameKind.forEach((f) => (f.isCurrent = false));
  const row: DevAnalysisFile = {
    id: `dev_af_${Date.now().toString(36)}`,
    projectId: p.id,
    statisticianId: p.assignment?.statisticianId ?? user.id ?? "",
    statisticianName: personName(user),
    fileName: input.fileName,
    filePath: input.filePath,
    fileType: input.fileType,
    fileSize: input.fileSize ?? 0,
    fileCategory: input.fileCategory,
    version: Math.max(0, ...sameKind.map((f) => f.version)) + 1,
    isCurrent: true,
    notes: input.notes?.trim() || null,
    uploadedAt: new Date().toISOString(),
  };
  entry.files = [row, ...files];
  fs.writeFileSync(FILES.analysis, JSON.stringify(all, null, 2), "utf-8");

  if (["EXPERT_ASSIGNED", "ACTIVE", "QA_REVISION"].includes(p.masterStatus)) {
    p.masterStatus = "IN_PROGRESS";
    saveProjects(projects);
  }
  return { success: true, data: analysisDTO(row, sameKind.length + 1) };
}

export function devAnalysisHistory(projectId: string, category: AnalysisFileCategory, user: User): Result<AnalysisFileDTO[]> {
  const d = load(projectId);
  if (!d) return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  const w = who(user, d.project);
  if (!w.isStatistician && !w.isQaLead && !w.isManagement) {
    return { success: false, error: { code: "FORBIDDEN", message: "You can't see this study's files." } };
  }
  const rows = d.files.filter((f) => f.fileCategory === category).sort((a, b) => b.version - a.version);
  return { success: true, data: rows.map((f) => analysisDTO(f, rows.length)) };
}

export function devAnalysisDownload(fileId: string, user: User): Result<string> {
  const analysis = readJson<{ projectId: string; files?: DevAnalysisFile[] }>(FILES.analysis);
  const file = analysis.flatMap((a) => a.files ?? []).find((f) => f.id === fileId);
  if (!file) return { success: false, error: { code: "FILE_NOT_FOUND", message: "File not found." } };
  const d = load(file.projectId);
  const w = d ? who(user, d.project) : null;
  if (!w || (!w.isStatistician && !w.isQaLead && !w.isManagement)) {
    return { success: false, error: { code: "FORBIDDEN", message: "You can't download this file." } };
  }
  if (!file.filePath) {
    return { success: false, error: { code: "SAMPLE_FILE", message: "This is a sample file with nothing inside (offline mode). Files you upload offline can be downloaded." } };
  }
  return { success: true, data: `/api/files/preview?url=${encodeURIComponent(file.filePath)}` };
}

export function devSubmitForQA(projectId: string, user: User): Result<void> {
  const projects = readJson<DevProject>(FILES.projects);
  const p = projects.find((x) => x.id === projectId);
  if (!p) return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  if (!who(user, p).isStatistician) {
    return { success: false, error: { code: "FORBIDDEN", message: "Only the assigned analyst can send the work for review." } };
  }
  if (p.masterStatus === "SCOPE_CREEP_HALTED") {
    return { success: false, error: { code: "SCOPE_CREEP_HALTED", message: "Work is on hold for the extra work you flagged." } };
  }
  const allowed = assertCanUploadAnalysis(p.masterStatus as never);
  if (!allowed.allowed) return { success: false, error: { code: "INVALID_STATE", message: allowed.reason || "This study can't be sent for review now." } };
  if (p.masterStatus === "QA_REVISION") {
    return { success: false, error: { code: "FIX_NOT_UPLOADED", message: "Upload the fixed files before sending it for review again." } };
  }
  const current = load(projectId)!.files.filter((f) => f.isCurrent).map((f) => f.fileCategory);
  const missing = missingForReview(current);
  if (missing.length > 0) {
    return { success: false, error: { code: "FILES_MISSING", message: `Add ${missing.join(" and ")} before sending it for review.` } };
  }
  p.masterStatus = "FOR_QA";
  saveProjects(projects);
  return { success: true, data: undefined };
}

export function devFlagScopeCreep(projectId: string, user: User, flagReason: string): Result<ScopeCreepLogDTO> {
  const projects = readJson<DevProject>(FILES.projects);
  const p = projects.find((x) => x.id === projectId);
  if (!p) return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  if (!who(user, p).isStatistician) {
    return { success: false, error: { code: "FORBIDDEN", message: "Only the assigned analyst can flag extra work." } };
  }
  if (p.masterStatus === "SCOPE_CREEP_HALTED") {
    return { success: false, error: { code: "ALREADY_FLAGGED", message: "Extra work is already flagged for this study." } };
  }
  p.masterStatus = "SCOPE_CREEP_HALTED";
  p.scopeCreep = { flagReason, flaggedAt: new Date().toISOString(), flaggedBy: user.id ?? "", flaggerName: personName(user) };
  saveProjects(projects);
  return { success: true, data: scopeCreepDTO(p) };
}

/** File viewer, offline: files in a study's workbench folder open for its analyst, reviewer, admins and the CEO. */
export function devCanOpenStudyFile(storageKey: string, user: User): boolean {
  const m = /^studies\/([^/]+)\/workbench\//.exec(storageKey);
  if (!m) return false;
  const p = readJson<DevProject>(FILES.projects).find((x) => workbenchFolder(x.id) === `studies/${m[1]}/workbench/`);
  if (!p) return false;
  const w = who(user, p);
  return w.isStatistician || w.isQaLead || w.isManagement;
}

/** Offline QA decision: same rules as submitQaReview, saved in the sample files. */
export function devSubmitQaReview(
  input: { projectId: string; decision: "QA_APPROVED" | "QA_REJECTED" | "ESCALATED_TO_CEO"; errorClassification?: string; comments: string },
  user: User
): Result<QaReviewDTO> {
  const projects = readJson<DevProject>(FILES.projects);
  const p = projects.find((x) => x.id === input.projectId || x.intakeId === input.projectId);
  if (!p) return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "Research study record not found." } };
  const w = who(user, p);
  if (!w.isQaLead && !w.isManagement) {
    return { success: false, error: { code: "FORBIDDEN", message: "Only the assigned reviewer or an admin can submit a review." } };
  }
  const allowed = assertCanSubmitQaReview(p.masterStatus as never);
  if (!allowed.allowed) return { success: false, error: { code: "INVALID_STATUS", message: allowed.reason || "This study can't be reviewed now." } };
  const signer = user.email ? getDevUserByEmail(user.email) : undefined;
  if (input.decision === "QA_APPROVED" && !signer?.staffProfile?.signatureUrl) {
    return {
      success: false,
      error: { code: "SIGNATURE_REQUIRED", message: "Add your signature in My Profile before approving. It goes on the client's certificate." },
    };
  }

  const now = new Date();
  const review: DevQaReview = {
    id: `dev_qa_${now.getTime().toString(36)}`,
    projectId: p.id,
    reviewerId: user.id ?? "",
    reviewerName: personName(user),
    decision: input.decision,
    errorClassification: input.decision === "QA_APPROVED" ? null : input.errorClassification ?? null,
    comments: input.comments.trim(),
    reviewedAt: now.toISOString(),
    qaRevisionDueAt: input.decision === "QA_REJECTED" ? new Date(now.getTime() + 24 * 3_600_000).toISOString() : null,
  };
  const all = readJson<{ id: string; projectId: string; files?: DevAnalysisFile[]; reviews?: DevQaReview[] }>(FILES.analysis);
  let entry = all.find((a) => a.projectId === p.id);
  if (!entry) {
    entry = { id: `dev_analysis_${p.id}`, projectId: p.id, files: [], reviews: [] };
    all.push(entry);
  }
  entry.reviews = [...(entry.reviews ?? []), review];
  fs.writeFileSync(FILES.analysis, JSON.stringify(all, null, 2), "utf-8");

  if (input.decision === "QA_APPROVED") {
    p.masterStatus = "DELIVERED";
    p.qaApproved = true;
    p.deliveredAt = now.toISOString();
  } else if (input.decision === "QA_REJECTED") {
    p.masterStatus = "QA_REVISION";
  } else {
    p.masterStatus = "ETHICAL_BREACH";
    p.isLocked = true;
  }
  saveProjects(projects);
  return { success: true, data: reviewDTO(review) };
}

/** Offline "My Earnings": the sample studies this analyst or reviewer is on, in the payroll's shape. */
export function devEarningStudies(user: User, as: "STATISTICIAN" | "SENIOR_QA_LEAD") {
  return readJson<DevProject>(FILES.projects)
    .filter((p) => {
      if (!p.assignment) return false;
      const w = who(user, p);
      return as === "STATISTICIAN" ? w.isStatistician : w.isQaLead;
    })
    .map((p) => ({
      projectId: p.id,
      intakeId: p.intakeId,
      title: p.researchTitle,
      packageName: p.packageName ?? null,
      status: p.masterStatus,
      deliveredAt: p.deliveredAt ?? null,
      gross: typeof p.financialSummary?.totalAmount === "number" ? p.financialSummary.totalAmount : null,
      fullyPaid: Boolean(p.financialSummary?.isFullyPaid),
      onHold: Boolean(p.hasActiveDispute || p.hasPendingRefund),
    }));
}
