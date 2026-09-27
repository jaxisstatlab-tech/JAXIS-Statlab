import fs from "fs";
import path from "path";
import type { RoleName, AnalysisFileCategory, DeliverableCategory } from "@prisma/client";
import { getDevUserByEmail } from "@/lib/mock-data/users.data";
import { ANALYSIS_CATEGORY_METADATA, assertCanUploadAnalysis } from "@/lib/analysis-rules";
import { QA_DECISION_METADATA, ERROR_CLASSIFICATION_METADATA, assertCanSubmitQaReview } from "@/lib/qa-rules";
import { DELIVERABLE_CATEGORY_METADATA, getRevisionWindowCountdown } from "@/lib/delivery-rules";
import type { WorkbenchDataDTO } from "@/features/analysis/schemas";
import type { QaInspectionDeskDTO, QaReviewDTO } from "@/features/qa/schemas";
import type { AdminDeliverablesDeskDTO, ClientDeliverablesDTO, DeliverableDTO } from "@/features/deliverables/schemas";

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
  client?: { id?: string; fullName?: string; email?: string; clientProfile?: { institutionSchool?: string; academicProgram?: string } };
  assignment?: {
    statisticianId?: string | null;
    qaLeadId?: string | null;
    statistician?: { fullName?: string } | null;
    qaLead?: { fullName?: string } | null;
  } | null;
  financialSummary?: { totalAmount?: number } | null;
  files?: Array<{ id: string; fileName: string; filePath: string; fileType?: string; fileCategory?: string; uploadedAt?: string }>;
};

export type DevAnalysisFile = {
  id: string;
  projectId: string;
  statisticianId: string;
  statisticianName: string;
  fileName: string;
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
  decision: "QA_APPROVED" | "QA_REJECTED";
  errorClassification: string | null;
  comments: string;
  reviewedAt: string;
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
  const due = new Date(p.deadlineRequested ?? Date.now() + 7 * 864e5);
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
  qaRevisionDueAt: null,
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
            statisticianName: p.assignment?.statistician?.fullName ?? "Statistician",
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
        filePath: `dev/${f.projectId}/${f.fileName}`,
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
      activeScopeCreep: null,
      canUpload: w.isStatistician && upload.allowed,
      uploadDisabledReason: w.isStatistician ? upload.reason : "Only the assigned statistician can upload analysis files.",
      isAssignedStatistician: w.isStatistician,
      isAssignedQaLead: w.isQaLead,
      isManagement: w.isManagement,
      qaReviews: reviews,
      activeRevision: reviews.find((r) => r.decision === "QA_REJECTED") ?? null,
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
        isLocked: false,
      },
      assignment: s
        ? {
            statisticianId: p.assignment?.statisticianId ?? "",
            statisticianName: p.assignment?.statistician?.fullName ?? "Statistician",
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
          filePath: `dev/${f.projectId}/${f.fileName}`,
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
      activeRevision: reviews.find((r) => r.decision === "QA_REJECTED") ?? null,
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
        ? { id: d.project.assignment.statisticianId, fullName: d.project.assignment.statistician?.fullName ?? "Statistician" }
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
    revisions: [],
    hasPendingRevision: false,
    qaCertificate:
      isReleased || qaApproved || p.masterStatus === "DELIVERED"
        ? {
            certificateId: `JAXIS-AUDIT-2026-${p.intakeId.replace(/^JAXIS-?/i, "")}`,
            researchTitle: p.researchTitle,
            clientName: p.client?.fullName ?? "Client",
            clientEmail: p.client?.email ?? "",
            institution: p.client?.clientProfile?.institutionSchool ?? "",
            program: p.client?.clientProfile?.academicProgram ?? "",
            tierExecuted: p.packageName ?? "",
            completionDate: new Date(p.deliveredAt ?? approved?.reviewedAt ?? Date.now()).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            statisticianName: p.assignment?.statistician?.fullName ?? "Statistician",
            statisticianTitle: "Lead Statistician",
            statisticianSignatureUrl: null,
            qaLeadName: approved?.reviewerName ?? p.assignment?.qaLead?.fullName ?? "Reviewer",
            qaLeadTitle: "Reviewer",
            qaSignatureUrl: null,
          }
        : null,
  };
}
