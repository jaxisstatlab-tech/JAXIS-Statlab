"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  ANALYSIS_CATEGORY_METADATA,
  assertCanUploadAnalysis,
  assertStatisticianAssigned,
  validateAnalysisFileFormat,
} from "@/lib/analysis-rules";
import {
  UploadAnalysisFileSchema,
  FlagScopeCreepSchema,
  ResolveScopeCreepSchema,
  SubmitForQASchema,
  type UploadAnalysisFileInput,
  type FlagScopeCreepInput,
  type ResolveScopeCreepInput,
  type SubmitForQAInput,
  type AnalysisFileDTO,
  type WorkbenchDataDTO,
  type ScopeCreepLogDTO,
} from "./schemas";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import { Prisma, AnalysisFileCategory, type RoleName } from "@prisma/client";
import { getR2DownloadUrl } from "@/lib/storage";
import {
  QA_DECISION_METADATA,
  ERROR_CLASSIFICATION_METADATA,
} from "@/lib/qa-rules";
import type { QaReviewDTO } from "@/features/qa/schemas";

type ProjectWithWorkbench = Prisma.ProjectGetPayload<{
  include: {
    client: {
      include: {
        clientProfile: true;
      };
    };
    assignment: {
      include: {
        statistician: { select: { id: true; fullName: true; email: true } };
        qaLead: { select: { id: true; fullName: true; email: true } };
      };
    };
    files: {
      orderBy: { uploadedAt: "desc" };
    };
    sows: {
      where: { signedAt: { not: null } };
      orderBy: { generatedAt: "desc" };
      take: 1;
    };
    analysisFiles: {
      orderBy: { uploadedAt: "desc" };
      include: {
        statistician: { select: { id: true; fullName: true } };
      };
    };
    scopeCreepLogs: {
      orderBy: { flaggedAt: "desc" };
      include: {
        flagger: { select: { fullName: true } };
        resolver: { select: { fullName: true } };
      };
    };
    qaReviews: {
      orderBy: { reviewedAt: "desc" };
      include: {
        reviewer: { select: { fullName: true } };
      };
    };
  };
}>;

export type AnalysisActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

/**
 * 1. Retrieve complete Analysis Workbench workspace data bundle.
 */
export async function getAnalysisWorkbenchData(
  projectId: string
): Promise<AnalysisActionResult<WorkbenchDataDTO>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in to view the workbench." },
    };
  }

  const callerRole = (session.user as { role?: RoleName }).role || "CLIENT";

  try {
    let user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user && session.user.email) {
      user = await db.user.findUnique({ where: { email: session.user.email } });
    }

    const project = (await db.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          include: {
            clientProfile: true,
          },
        },
        assignment: {
          include: {
            statistician: { select: { id: true, fullName: true, email: true } },
            qaLead: { select: { id: true, fullName: true, email: true } },
          },
        },
        files: {
          orderBy: { uploadedAt: "desc" },
        },
        sows: {
          where: { signedAt: { not: null } },
          orderBy: { generatedAt: "desc" },
          take: 1,
        },
        analysisFiles: {
          orderBy: { uploadedAt: "desc" },
          include: {
            statistician: { select: { id: true, fullName: true } },
          },
        },
        scopeCreepLogs: {
          orderBy: { flaggedAt: "desc" },
          include: {
            flagger: { select: { fullName: true } },
            resolver: { select: { fullName: true } },
          },
        },
        qaReviews: {
          orderBy: { reviewedAt: "desc" },
          include: {
            reviewer: { select: { fullName: true } },
          },
        },
      },
    })) as ProjectWithWorkbench | null;

    if (!project) {
      return {
        success: false,
        error: { code: "PROJECT_NOT_FOUND", message: "Project not found." },
      };
    }

    const isAssignedStatistician = Boolean(user && project.assignment?.statisticianId === user.id);
    const isAssignedQaLead = Boolean(user && project.assignment?.qaLeadId === user.id);
    const isManagement = callerRole === "ADMIN" || callerRole === "CEO";

    if (!isAssignedStatistician && !isAssignedQaLead && !isManagement) {
      return {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have authorization to access this statistical analysis workbench.",
        },
      };
    }

    // Active scope creep
    const activeScopeCreepLog = project.scopeCreepLogs.find((l) => !l.resolvedAt) || null;
    const activeScopeCreep: ScopeCreepLogDTO | null = activeScopeCreepLog
      ? {
          id: activeScopeCreepLog.id,
          projectId: activeScopeCreepLog.projectId,
          flaggedBy: activeScopeCreepLog.flaggedBy,
          flaggerName: activeScopeCreepLog.flagger.fullName,
          flagReason: activeScopeCreepLog.flagReason,
          flaggedAt: activeScopeCreepLog.flaggedAt.toISOString(),
          resolvedAt: activeScopeCreepLog.resolvedAt ? activeScopeCreepLog.resolvedAt.toISOString() : null,
          resolvedBy: activeScopeCreepLog.resolvedBy,
          resolverName: activeScopeCreepLog.resolver?.fullName || null,
          resolutionNotes: activeScopeCreepLog.resolutionNotes,
          supplementalQuotationId: activeScopeCreepLog.supplementalQuotationId,
          isResolved: Boolean(activeScopeCreepLog.resolvedAt),
        }
      : null;

    // SLA calculations
    let slaInfo = null;
    if (project.assignment) {
      const now = new Date();
      const slaDue = new Date(project.assignment.slaDueAt);
      const diffMs = slaDue.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isPaused = Boolean(project.assignment.slaPausedAt && !project.assignment.slaResumedAt);
      const isOverdue = !isPaused && diffMs < 0;
      const isUrgent = !isPaused && !isOverdue && diffDays <= 2;

      let slaLabel = `${diffDays} days remaining`;
      if (isPaused) slaLabel = "SLA Paused";
      else if (isOverdue) slaLabel = `${Math.abs(diffDays)}d Overdue`;
      else if (diffDays === 0) slaLabel = "Due Today";
      else if (diffDays === 1) slaLabel = "1 day remaining";

      slaInfo = {
        id: project.assignment.id,
        statisticianId: project.assignment.statistician.id,
        statisticianName: project.assignment.statistician.fullName,
        statisticianEmail: project.assignment.statistician.email,
        qaLeadId: project.assignment.qaLead.id,
        qaLeadName: project.assignment.qaLead.fullName,
        qaLeadEmail: project.assignment.qaLead.email,
        slaStartAt: project.assignment.slaStartAt.toISOString(),
        slaDueAt: project.assignment.slaDueAt.toISOString(),
        slaDueDays: diffDays,
        slaLabel,
        isPaused,
        isOverdue,
        isUrgent,
      };
    }

    // SOW information & deliverables snapshot parsing
    const activeSow = project.sows[0] || null;
    let sowDeliverables: string[] = [];
    let sowScopeText = "";
    if (activeSow?.contentSnapshot) {
      const snapshot = activeSow.contentSnapshot as Record<string, unknown>;
      sowScopeText = (snapshot.scopeOfWork as string) || "";
      if (Array.isArray(snapshot.deliverables)) {
        sowDeliverables = snapshot.deliverables.map(String);
      } else if (sowScopeText) {
        sowDeliverables = sowScopeText
          .split("\n")
          .map((s: string) => s.replace(/^[-*•\d.]+\s*/, "").trim())
          .filter(Boolean);
      }
    }

    // Count versions per category
    const versionCountMap = new Map<AnalysisFileCategory, number>();
    for (const f of project.analysisFiles) {
      const count = versionCountMap.get(f.fileCategory) || 0;
      versionCountMap.set(f.fileCategory, count + 1);
    }

    // Transform analysis files
    const analysisFiles: AnalysisFileDTO[] = project.analysisFiles.map((f) => ({
      id: f.id,
      projectId: f.projectId,
      statisticianId: f.statisticianId,
      statisticianName: f.statistician.fullName,
      fileName: f.fileName,
      filePath: f.filePath,
      fileType: f.fileType,
      fileSize: f.fileSize,
      fileCategory: f.fileCategory,
      categoryLabel: ANALYSIS_CATEGORY_METADATA[f.fileCategory as AnalysisFileCategory]?.label || f.fileCategory,
      version: f.version,
      isCurrent: f.isCurrent,
      notes: f.notes,
      uploadedAt: f.uploadedAt.toISOString(),
      versionCount: versionCountMap.get(f.fileCategory) || 1,
    }));

    // Can upload check
    const uploadCheck = assertCanUploadAnalysis(project.masterStatus);
    const canUpload = isAssignedStatistician && uploadCheck.allowed;
    const uploadDisabledReason = !isAssignedStatistician
      ? "Only the assigned Lead Statistician can upload analysis output files."
      : uploadCheck.reason;

    return {
      success: true,
      data: {
        project: {
          id: project.id,
          intakeId: project.intakeId,
          researchTitle: project.researchTitle,
          researchQuestions: project.researchQuestions,
          researchObjectives: project.researchObjectives,
          hypotheses: project.hypotheses,
          chapters13: project.chapters13,
          questionnaire: project.questionnaire,
          masterStatus: project.masterStatus,
          packageName: project.packageName,
          clientName: project.client.fullName,
          clientEmail: project.client.email,
          clientSchool: project.client.clientProfile?.institutionSchool || null,
          createdAt: project.createdAt.toISOString(),
          deliveredAt: project.deliveredAt ? project.deliveredAt.toISOString() : null,
        },
        assignment: slaInfo,
        sow: activeSow
          ? {
              id: activeSow.id,
              scopeOfWork: sowScopeText,
              deliverables: sowDeliverables,
              timelineDays: activeSow.turnaroundDays,
              signedAt: activeSow.signedAt ? activeSow.signedAt.toISOString() : null,
            }
          : null,
        clientFiles: project.files.map((cf) => ({
          id: cf.id,
          fileName: cf.fileName,
          filePath: cf.filePath,
          fileType: cf.fileType,
          fileCategory: cf.fileCategory,
          uploadedAt: cf.uploadedAt.toISOString(),
        })),
        analysisFiles,
        activeScopeCreep,
        canUpload,
        uploadDisabledReason,
        isAssignedStatistician,
        isAssignedQaLead,
        isManagement,
        qaReviews: (project.qaReviews || []).map((r) => ({
          id: r.id,
          projectId: r.projectId,
          reviewerId: r.reviewerId,
          reviewerName: r.reviewer.fullName,
          decision: r.decision,
          decisionLabel: QA_DECISION_METADATA[r.decision]?.label || r.decision,
          errorClassification: r.errorClassification,
          errorClassificationLabel: r.errorClassification
            ? ERROR_CLASSIFICATION_METADATA[r.errorClassification]?.label || r.errorClassification
            : null,
          comments: r.comments,
          qaRevisionDueAt: r.qaRevisionDueAt ? r.qaRevisionDueAt.toISOString() : null,
          reviewedAt: r.reviewedAt.toISOString(),
        })),
        activeRevision: (() => {
          const revs = project.qaReviews || [];
          const rejected = revs.find((r) => r.decision === "QA_REJECTED");
          if (!rejected) return null;
          return {
            id: rejected.id,
            projectId: rejected.projectId,
            reviewerId: rejected.reviewerId,
            reviewerName: rejected.reviewer.fullName,
            decision: rejected.decision,
            decisionLabel: QA_DECISION_METADATA[rejected.decision]?.label || rejected.decision,
            errorClassification: rejected.errorClassification,
            errorClassificationLabel: rejected.errorClassification
              ? ERROR_CLASSIFICATION_METADATA[rejected.errorClassification]?.label || rejected.errorClassification
              : null,
            comments: rejected.comments,
            qaRevisionDueAt: rejected.qaRevisionDueAt ? rejected.qaRevisionDueAt.toISOString() : null,
            reviewedAt: rejected.reviewedAt.toISOString(),
          };
        })(),
      },
    };
  } catch (err) {
    console.error("[getAnalysisWorkbenchData] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}

/**
 * 2. Upload an analysis output file with automated atomic versioning.
 */
export async function uploadAnalysisFile(
  rawInput: UploadAnalysisFileInput
): Promise<AnalysisActionResult<AnalysisFileDTO>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in to upload files." },
    };
  }

  const parsed = UploadAnalysisFileSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input data." },
    };
  }

  const { projectId, fileName, filePath, fileType, fileSize, fileCategory, notes } = parsed.data;

  // Validate format and size with category matching
  const formatValidation = validateAnalysisFileFormat(fileName, fileType, fileSize, fileCategory);
  if (!formatValidation.valid) {
    return {
      success: false,
      error: { code: "INVALID_FILE_FORMAT", message: formatValidation.error || "Unsupported file format." },
    };
  }

  try {
    let user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user && session.user.email) {
      user = await db.user.findUnique({ where: { email: session.user.email } });
    }

    if (!user) {
      return { success: false, error: { code: "USER_NOT_FOUND", message: "User account not found." } };
    }

    // Verify assignment
    await assertStatisticianAssigned(projectId, user.id);

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, masterStatus: true },
    });

    if (!project) {
      return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } };
    }

    // Verify status allows upload
    const statusCheck = assertCanUploadAnalysis(project.masterStatus);
    if (!statusCheck.allowed) {
      return {
        success: false,
        error: { code: "UPLOAD_BLOCKED", message: statusCheck.reason || "Uploads are currently locked." },
      };
    }

    // Atomic versioning transaction
    const result = await db.$transaction(async (tx) => {
      // Find highest existing version for this project + category
      const highestFile = await tx.analysisFile.findFirst({
        where: { projectId, fileCategory },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const nextVersion = (highestFile?.version || 0) + 1;

      // Mark all prior files in this category as not current
      await tx.analysisFile.updateMany({
        where: { projectId, fileCategory, isCurrent: true },
        data: { isCurrent: false },
      });

      // Create new versioned file record
      const newFile = await tx.analysisFile.create({
        data: {
          projectId,
          statisticianId: user.id,
          fileName,
          filePath,
          fileType,
          fileSize: fileSize || null,
          fileCategory,
          version: nextVersion,
          isCurrent: true,
          notes: notes?.trim() || null,
        },
        include: {
          statistician: { select: { fullName: true } },
        },
      });

      // If project was in EXPERT_ASSIGNED, ACTIVE, or QA_REVISION, transition to IN_PROGRESS
      if (
        project.masterStatus === "EXPERT_ASSIGNED" ||
        project.masterStatus === "ACTIVE" ||
        project.masterStatus === "QA_REVISION"
      ) {
        await tx.project.update({
          where: { id: projectId },
          data: { masterStatus: "IN_PROGRESS" },
        });
      }

      return newFile;
    });

    try {
      await dispatchRealtimeNotification({
        eventType: "OUTPUT_UPDATE",
        projectId: result.projectId,
        title: "Analysis Deliverable Uploaded",
        message: `Statistician ${result.statistician.fullName} uploaded "${result.fileName}" (v${result.version}).`,
        targetRoles: ["ADMIN", "SENIOR_QA_LEAD"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[uploadAnalysisFile] Realtime notification warning:", e);
    }

    revalidatePath(`/dashboard/statistician/projects/${projectId}/workbench`);
    revalidatePath(`/dashboard/qa/projects/${projectId}/files`);
    revalidatePath(`/dashboard/admin/projects/${projectId}/analysis`);
    revalidatePath(`/dashboard/statistician`);

    return {
      success: true,
      data: {
        id: result.id,
        projectId: result.projectId,
        statisticianId: result.statisticianId,
        statisticianName: result.statistician.fullName,
        fileName: result.fileName,
        filePath: result.filePath,
        fileType: result.fileType,
        fileSize: result.fileSize,
        fileCategory: result.fileCategory,
        categoryLabel: ANALYSIS_CATEGORY_METADATA[result.fileCategory]?.label || result.fileCategory,
        version: result.version,
        isCurrent: result.isCurrent,
        notes: result.notes,
        uploadedAt: result.uploadedAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("[uploadAnalysisFile] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}

/**
 * 3. Retrieve historical versions of an analysis file for a category.
 */
export async function getAnalysisFileVersionHistory(
  projectId: string,
  fileCategory: AnalysisFileCategory
): Promise<AnalysisActionResult<AnalysisFileDTO[]>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in." },
    };
  }

  try {
    const files = await db.analysisFile.findMany({
      where: { projectId, fileCategory },
      orderBy: { version: "desc" },
      include: {
        statistician: { select: { fullName: true } },
      },
    });

    return {
      success: true,
      data: files.map((f) => ({
        id: f.id,
        projectId: f.projectId,
        statisticianId: f.statisticianId,
        statisticianName: f.statistician.fullName,
        fileName: f.fileName,
        filePath: f.filePath,
        fileType: f.fileType,
        fileSize: f.fileSize,
        fileCategory: f.fileCategory,
        categoryLabel: ANALYSIS_CATEGORY_METADATA[f.fileCategory]?.label || f.fileCategory,
        version: f.version,
        isCurrent: f.isCurrent,
        notes: f.notes,
        uploadedAt: f.uploadedAt.toISOString(),
      })),
    };
  } catch (err) {
    console.error("[getAnalysisFileVersionHistory] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}

/**
 * 4. Flag scope creep on a project, halting work under RULE_QUO_03.
 */
export async function flagScopeCreep(
  rawInput: FlagScopeCreepInput
): Promise<AnalysisActionResult<ScopeCreepLogDTO>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in to flag scope creep." },
    };
  }

  const parsed = FlagScopeCreepSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input." },
    };
  }

  const { projectId, flagReason } = parsed.data;

  try {
    let user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user && session.user.email) {
      user = await db.user.findUnique({ where: { email: session.user.email } });
    }

    if (!user) {
      return { success: false, error: { code: "USER_NOT_FOUND", message: "User account not found." } };
    }

    // Verify caller is assigned statistician
    await assertStatisticianAssigned(projectId, user.id);

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { masterStatus: true },
    });

    if (!project) {
      return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } };
    }

    if (project.masterStatus === "SCOPE_CREEP_HALTED") {
      return {
        success: false,
        error: { code: "ALREADY_HALTED", message: "Work on this study is already halted for scope creep." },
      };
    }

    const result = await db.$transaction(async (tx) => {
      const log = await tx.scopeCreepLog.create({
        data: {
          projectId,
          flaggedBy: user.id,
          flagReason: flagReason.trim(),
        },
        include: {
          flagger: { select: { fullName: true } },
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { masterStatus: "SCOPE_CREEP_HALTED" },
      });

      return log;
    });

    try {
      await dispatchRealtimeNotification({
        eventType: "STATUS_UPDATE",
        projectId: result.projectId,
        title: "Scope Creep Flagged",
        message: `Study halted due to scope creep flagged by ${result.flagger.fullName}: "${result.flagReason}"`,
        targetRoles: ["ADMIN", "CEO"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[flagScopeCreep] Realtime notification warning:", e);
    }

    revalidatePath(`/dashboard/statistician/projects/${projectId}/workbench`);
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/statistician`);

    return {
      success: true,
      data: {
        id: result.id,
        projectId: result.projectId,
        flaggedBy: result.flaggedBy,
        flaggerName: result.flagger.fullName,
        flagReason: result.flagReason,
        flaggedAt: result.flaggedAt.toISOString(),
        resolvedAt: null,
        resolvedBy: null,
        resolverName: null,
        resolutionNotes: null,
        supplementalQuotationId: null,
        isResolved: false,
      },
    };
  } catch (err) {
    console.error("[flagScopeCreep] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}

/**
 * 5. Admin resolves scope creep after supplemental quote agreement, resuming work to IN_PROGRESS.
 */
export async function resolveScopeCreep(
  rawInput: ResolveScopeCreepInput
): Promise<AnalysisActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in." },
    };
  }

  const callerRole = (session.user as { role?: RoleName }).role || "CLIENT";
  if (callerRole !== "ADMIN" && callerRole !== "CEO") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only Administrators or CEO can resolve scope creep." },
    };
  }

  const parsed = ResolveScopeCreepSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input." },
    };
  }

  const { projectId, scopeCreepLogId, resolutionNotes, supplementalQuotationId } = parsed.data;

  try {
    let user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user && session.user.email) {
      user = await db.user.findUnique({ where: { email: session.user.email } });
    }

    if (!user) {
      return { success: false, error: { code: "USER_NOT_FOUND", message: "User not found." } };
    }

    await db.$transaction(async (tx) => {
      await tx.scopeCreepLog.update({
        where: { id: scopeCreepLogId },
        data: {
          resolvedAt: new Date(),
          resolvedBy: user.id,
          resolutionNotes: resolutionNotes.trim(),
          supplementalQuotationId: supplementalQuotationId || null,
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { masterStatus: "IN_PROGRESS" },
      });
    });

    revalidatePath(`/dashboard/statistician/projects/${projectId}/workbench`);
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/statistician`);

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[resolveScopeCreep] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}

/**
 * 6. Submit analytical work for QA evaluation (one-way state transition to FOR_QA).
 */
export async function submitForQA(
  rawInput: SubmitForQAInput
): Promise<AnalysisActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in to submit for QA." },
    };
  }

  const parsed = SubmitForQASchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input." },
    };
  }

  const { projectId } = parsed.data;

  try {
    let user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user && session.user.email) {
      user = await db.user.findUnique({ where: { email: session.user.email } });
    }

    if (!user) {
      return { success: false, error: { code: "USER_NOT_FOUND", message: "User account not found." } };
    }

    // Verify assigned statistician
    await assertStatisticianAssigned(projectId, user.id);

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        analysisFiles: {
          where: { isCurrent: true },
        },
      },
    });

    if (!project) {
      return { success: false, error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } };
    }

    if (project.masterStatus === "SCOPE_CREEP_HALTED") {
      return {
        success: false,
        error: { code: "SCOPE_CREEP_HALTED", message: "Cannot submit for QA while study is halted for scope creep." },
      };
    }

    if (project.analysisFiles.length === 0) {
      return {
        success: false,
        error: {
          code: "NO_FILES_UPLOADED",
          message: "Please upload at least one current analysis output file or report before submitting for QA evaluation.",
        },
      };
    }

    await db.project.update({
      where: { id: projectId },
      data: { masterStatus: "FOR_QA" },
    });

    try {
      await dispatchRealtimeNotification({
        eventType: "QA_DECISION",
        projectId: project.id,
        intakeId: project.intakeId,
        title: "Study Submitted for QA Inspection",
        message: `Study ${project.intakeId} has been submitted for QA verification by the statistician.`,
        targetRoles: ["ADMIN", "SENIOR_QA_LEAD"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[submitForQA] Realtime notification warning:", e);
    }

    revalidatePath(`/dashboard/statistician/projects/${projectId}/workbench`);
    revalidatePath(`/dashboard/qa/projects/${projectId}/files`);
    revalidatePath(`/dashboard/qa`);
    revalidatePath(`/dashboard/statistician`);
    revalidatePath(`/dashboard/admin/projects/${projectId}`);

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[submitForQA] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}

/**
 * 7. Retrieve secure signed download URL for an analysis file.
 * Clients are strictly forbidden (403).
 */
export async function getAnalysisFileDownloadUrl(
  fileId: string
): Promise<AnalysisActionResult<string>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in to download analysis files." },
    };
  }

  const callerRole = (session.user as { role?: RoleName }).role || "CLIENT";
  if (callerRole === "CLIENT") {
    return {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Clients do not have permission to download internal statistical analysis working files.",
      },
    };
  }

  try {
    const file = await db.analysisFile.findUnique({
      where: { id: fileId },
      include: {
        project: {
          include: {
            assignment: true,
          },
        },
      },
    });

    if (!file) {
      return { success: false, error: { code: "FILE_NOT_FOUND", message: "Analysis file not found." } };
    }

    let user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user && session.user.email) {
      user = await db.user.findUnique({ where: { email: session.user.email } });
    }

    const isStatistician = user && file.project.assignment?.statisticianId === user.id;
    const isQaLead = user && file.project.assignment?.qaLeadId === user.id;
    const isManager = callerRole === "ADMIN" || callerRole === "CEO";

    if (!isStatistician && !isQaLead && !isManager) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "You are not authorized to download this file." },
      };
    }

    // Try Cloudflare R2 presigned URL; fallback to direct filePath
    try {
      if (file.filePath && !file.filePath.startsWith("http") && !file.filePath.startsWith("/")) {
        const signedUrl = await getR2DownloadUrl(file.filePath);
        return { success: true, data: signedUrl };
      }
    } catch {
      // Fallback
    }

    return { success: true, data: file.filePath || "#" };
  } catch (err) {
    console.error("[getAnalysisFileDownloadUrl] Error:", err);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: (err as Error).message },
    };
  }
}
