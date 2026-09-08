"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db, withDbTimeout } from "@/lib/db";
import {
  assertQaLeadAssigned,
  assertCanSubmitQaReview,
  computeQaRevisionDeadline,
  ERROR_CLASSIFICATION_METADATA,
  QA_DECISION_METADATA,
} from "@/lib/qa-rules";
import { ANALYSIS_CATEGORY_METADATA } from "@/lib/analysis-rules";
import {
  SubmitQAReviewSchema,
  type QaQueueItemDTO,
  type QaReviewDTO,
  type QaInspectionDeskDTO,
  type CeoEscalationItemDTO,
  type AdminQaRejectionWarningDTO,
} from "./schemas";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import { computePurgeDeadline, computeRevisionWindowExpiry } from "@/lib/delivery-rules";
import type { RoleName, DeliverableCategory } from "@prisma/client";

export type QaActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

/**
 * 1. Retrieve the QA Lead review queue (Projects in FOR_QA or QA_REVISION).
 */
export async function getQaQueue(): Promise<QaActionResult<QaQueueItemDTO[]>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in to view the QA queue." },
    };
  }

  const callerRole = (session.user as { role?: RoleName }).role || "CLIENT";
  if (callerRole !== "SENIOR_QA_LEAD" && callerRole !== "ADMIN" && callerRole !== "CEO") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only Senior QA Leads and administrators can view this queue." },
    };
  }

  try {
    let user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user && session.user.email) {
      user = await db.user.findUnique({ where: { email: session.user.email } });
    }

    const isSeniorQaLead = callerRole === "SENIOR_QA_LEAD";

    const projects = await withDbTimeout(
      db.project.findMany({
        where: {
          masterStatus: {
            in: ["FOR_QA", "QA_REVISION"],
          },
          ...(isSeniorQaLead && user
            ? {
                assignment: {
                  qaLeadId: user.id,
                  isActive: true,
                },
              }
            : {}),
        },
        include: {
          assignment: {
            include: {
              statistician: { select: { id: true, fullName: true, email: true } },
              qaLead: { select: { id: true, fullName: true, email: true } },
            },
          },
          analysisFiles: {
            where: { isCurrent: true },
            orderBy: { uploadedAt: "desc" },
          },
          qaRejectionCounts: true,
        },
        orderBy: { updatedAt: "desc" },
      })
    );

    const now = new Date();
    const queueItems: QaQueueItemDTO[] = projects.map((p) => {
      let slaDueAt: string | null = null;
      let slaDueDays: number | null = null;
      let isSlaOverdue = false;

      if (p.assignment?.slaDueAt) {
        const slaDate = new Date(p.assignment.slaDueAt);
        slaDueAt = slaDate.toISOString();
        const diffMs = slaDate.getTime() - now.getTime();
        slaDueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isSlaOverdue = diffMs < 0;
      }

      // Rejection count for assigned statistician
      const statId = p.assignment?.statisticianId;
      const rejLog = statId ? p.qaRejectionCounts.find((r) => r.statisticianId === statId) : null;
      const rejectionCount = rejLog?.count || 0;

      // Latest current file timestamp as proxy for submission time
      const latestFile = p.analysisFiles[0];
      const submittedForQaAt = latestFile ? latestFile.uploadedAt.toISOString() : p.updatedAt.toISOString();

      return {
        id: p.id,
        intakeId: p.intakeId,
        researchTitle: p.researchTitle,
        packageName: p.packageName,
        masterStatus: p.masterStatus,
        statisticianId: p.assignment?.statistician.id || "",
        statisticianName: p.assignment?.statistician.fullName || "Unassigned",
        statisticianEmail: p.assignment?.statistician.email || "",
        filesCount: p.analysisFiles.length,
        submittedForQaAt,
        slaDueAt,
        slaDueDays,
        isSlaOverdue,
        rejectionCount,
      };
    });

    return { success: true, data: queueItems };
  } catch (error) {
    console.error("[getQaQueue] Error:", error);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to retrieve QA review queue." },
    };
  }
}

/**
 * 2. Retrieve complete inspection desk data for a research study.
 */
export async function getQaInspectionDesk(
  projectId: string
): Promise<QaActionResult<QaInspectionDeskDTO>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in to inspect this study." },
    };
  }

  const callerRole = (session.user as { role?: RoleName }).role || "CLIENT";

  try {
    let user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user && session.user.email) {
      user = await db.user.findUnique({ where: { email: session.user.email } });
    }

    const project = await withDbTimeout(
      db.project.findFirst({
        where: { OR: [{ id: projectId }, { intakeId: projectId }] },
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
            orderBy: [{ fileCategory: "asc" }, { version: "desc" }],
            include: {
              statistician: { select: { fullName: true } },
            },
          },
          qaReviews: {
            orderBy: { reviewedAt: "desc" },
            include: {
              reviewer: { select: { fullName: true } },
            },
          },
          qaRejectionCounts: true,
        },
      })
    );

    if (!project) {
      return {
        success: false,
        error: { code: "PROJECT_NOT_FOUND", message: "Research study record not found." },
      };
    }

    const isAssignedQaLead = Boolean(user && project.assignment?.qaLeadId === user.id);
    const isAssignedStatistician = Boolean(user && project.assignment?.statisticianId === user.id);
    const isManagement = callerRole === "ADMIN" || callerRole === "CEO";

    if (!isAssignedQaLead && !isAssignedStatistician && !isManagement) {
      return {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You are not authorized to access this Quality Assurance desk.",
        },
      };
    }

    // Parse SOW snapshot
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

    // SLA Calculation
    let slaInfo = null;
    if (project.assignment) {
      const now = new Date();
      const slaDate = new Date(project.assignment.slaDueAt);
      const diffMs = slaDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isPaused = Boolean(project.assignment.slaPausedAt && !project.assignment.slaResumedAt);

      slaInfo = {
        statisticianId: project.assignment.statistician.id,
        statisticianName: project.assignment.statistician.fullName,
        statisticianEmail: project.assignment.statistician.email,
        qaLeadId: project.assignment.qaLead.id,
        qaLeadName: project.assignment.qaLead.fullName,
        qaLeadEmail: project.assignment.qaLead.email,
        slaDueAt: project.assignment.slaDueAt.toISOString(),
        slaDueDays: diffDays,
        isOverdue: !isPaused && diffMs < 0,
        isPaused,
      };
    }

    // Review history formatting
    const reviewHistory: QaReviewDTO[] = project.qaReviews.map((r) => ({
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
    }));

    const activeRevision = reviewHistory.find((r) => r.decision === "QA_REJECTED") || null;

    // Rejection count
    const statId = project.assignment?.statisticianId;
    const rejLog = statId ? project.qaRejectionCounts.find((r) => r.statisticianId === statId) : null;
    const rejectionCount = rejLog?.count || 0;

    // Review permission check
    const statusCheck = assertCanSubmitQaReview(project.masterStatus);
    const canReview = (isAssignedQaLead || isManagement) && statusCheck.allowed;
    const reviewDisabledReason = !(isAssignedQaLead || isManagement)
      ? "Only the assigned Senior QA Lead or administrator can submit a QA review."
      : statusCheck.reason || null;

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
          clientSchool: project.client.clientProfile?.institutionSchool || null,
          createdAt: project.createdAt.toISOString(),
          qaApproved: project.qaApproved,
          isLocked: project.isLocked,
        },
        assignment: slaInfo,
        sow: activeSow
          ? {
              id: activeSow.id,
              scopeOfWork: sowScopeText,
              deliverables: sowDeliverables,
              turnaroundDays: activeSow.turnaroundDays,
              signedAt: activeSow.signedAt ? activeSow.signedAt.toISOString() : null,
            }
          : null,
        analysisFiles: project.analysisFiles.map((f) => ({
          id: f.id,
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
          statisticianName: f.statistician.fullName,
        })),
        clientFiles: project.files.map((cf) => ({
          id: cf.id,
          fileName: cf.fileName,
          filePath: cf.filePath,
          fileType: cf.fileType,
          fileCategory: cf.fileCategory,
          uploadedAt: cf.uploadedAt.toISOString(),
        })),
        reviewHistory,
        rejectionCount,
        activeRevision,
        canReview,
        reviewDisabledReason,
      },
    };
  } catch (error) {
    console.error("[getQaInspectionDesk] Error:", error);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to retrieve QA inspection desk data." },
    };
  }
}

/**
 * 3. Submit a Senior QA Lead Evaluation Decision.
 */
export async function submitQaReview(
  input: unknown
): Promise<QaActionResult<QaReviewDTO>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in to submit a review." },
    };
  }

  const callerRole = (session.user as { role?: RoleName }).role || "CLIENT";
  if (callerRole !== "SENIOR_QA_LEAD" && callerRole !== "ADMIN" && callerRole !== "CEO") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only Senior QA Leads and administrators can submit reviews." },
    };
  }

  const parsed = SubmitQAReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Invalid review payload.",
      },
    };
  }

  const { projectId, decision, errorClassification, comments } = parsed.data;

  try {
    let user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user && session.user.email) {
      user = await db.user.findUnique({ where: { email: session.user.email } });
    }

    if (!user) {
      return {
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User account not found." },
      };
    }

    const project = await db.project.findFirst({
      where: { OR: [{ id: projectId }, { intakeId: projectId }] },
      include: {
        assignment: true,
        analysisFiles: {
          where: { isCurrent: true },
        },
      },
    });

    if (!project) {
      return {
        success: false,
        error: { code: "PROJECT_NOT_FOUND", message: "Research study record not found." },
      };
    }

    await assertQaLeadAssigned(project.id, user.id, callerRole);

    const statusCheck = assertCanSubmitQaReview(project.masterStatus);
    if (!statusCheck.allowed) {
      return {
        success: false,
        error: {
          code: "INVALID_STATUS",
          message: statusCheck.reason || "This study cannot undergo QA review at this time.",
        },
      };
    }

    const now = new Date();

    // Pre-calculate deadlines outside the transaction to prevent DB pool contention
    const qaRevisionDueAt = decision === "QA_REJECTED" ? computeQaRevisionDeadline(now) : null;
    const deliveredAt = decision === "QA_APPROVED" ? now : undefined;
    const filesPurgeAt = decision === "QA_APPROVED" ? computePurgeDeadline(now, 90) : undefined;
    const revisionWindowExpiresAt =
      decision === "QA_APPROVED" ? await computeRevisionWindowExpiry(now, 3) : undefined;

    const reviewResult = await withDbTimeout(
      db.$transaction(
        async (tx) => {
          let newProjectStatus = project.masterStatus;
          let qaApproved = project.qaApproved;
          let isLocked = project.isLocked;

          if (decision === "QA_APPROVED") {
            newProjectStatus = "DELIVERED";
            qaApproved = true;
          } else if (decision === "QA_REJECTED") {
            newProjectStatus = "QA_REVISION";

            // Increment repeated rejection count
            if (project.assignment?.statisticianId) {
              await tx.qARejectionCount.upsert({
                where: {
                  projectId_statisticianId: {
                    projectId: project.id,
                    statisticianId: project.assignment.statisticianId,
                  },
                },
                create: {
                  projectId: project.id,
                  statisticianId: project.assignment.statisticianId,
                  count: 1,
                  lastRejectedAt: now,
                },
                update: {
                  count: { increment: 1 },
                  lastRejectedAt: now,
                },
              });
            }
          } else if (decision === "ESCALATED_TO_CEO") {
            // RULE_ETH_01: Immediate lock on ethical breach
            newProjectStatus = "ETHICAL_BREACH";
            isLocked = true;
          }

          if (decision === "QA_APPROVED" && project.analysisFiles.length > 0) {
            // Auto-promote approved analysis files in a fast single batch instead of N sequential awaits
            const filePaths = project.analysisFiles.map((af) => af.filePath);
            const existingDeliverables = await tx.deliverable.findMany({
              where: {
                projectId: project.id,
                filePath: { in: filePaths },
              },
              select: { filePath: true },
            });
            const existingSet = new Set(existingDeliverables.map((d) => d.filePath));
            const toCreate = project.analysisFiles.filter((af) => !existingSet.has(af.filePath));

            if (toCreate.length > 0) {
              await tx.deliverable.createMany({
                data: toCreate.map((af) => {
                  let cat: DeliverableCategory = "STATISTICAL_OUTPUT";
                  if (af.fileCategory === "PDF_REPORT") cat = "PDF_REPORT";
                  else if (af.fileCategory === "RAW_DATASET") cat = "RAW_DATA_CLEANED";
                  else if (af.fileCategory === "OTHER") cat = "OTHER";

                  return {
                    projectId: project.id,
                    category: cat,
                    fileName: af.fileName,
                    filePath: af.filePath,
                    fileSize: af.fileSize || 1024,
                    fileType: af.fileType || "application/octet-stream",
                    uploadedBy: af.statisticianId || user.id,
                    isFinalReleased: true,
                    releasedAt: now,
                    releasedBy: user.id,
                  };
                }),
              });
            }
          }

          // Update Project master status and delivery timestamps
          await tx.project.update({
            where: { id: project.id },
            data: {
              masterStatus: newProjectStatus,
              qaApproved,
              isLocked,
              ...(deliveredAt ? { deliveredAt, filesPurgeAt, revisionWindowExpiresAt } : {}),
            },
          });

          // Create QAReview scorecard
          const review = await tx.qAReview.create({
            data: {
              projectId: project.id,
              reviewerId: user.id,
              decision,
              errorClassification: errorClassification || null,
              comments: comments.trim(),
              qaRevisionDueAt,
              reviewedAt: now,
            },
            include: {
              reviewer: { select: { fullName: true } },
            },
          });

          return review;
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      ),
      35000
    );

    // Dispatch real-time notifications to relevant roles
    try {
      const decisionTitle =
        decision === "QA_APPROVED"
          ? "QA Review Passed (Delivered)"
          : decision === "QA_REJECTED"
          ? "QA Revision Required"
          : "Ethical Violation Escalated to CEO";

      const decisionMsg =
        decision === "QA_APPROVED"
          ? `Study ${project.intakeId} passed QA inspection and is now delivered to the researcher.`
          : decision === "QA_REJECTED"
          ? `Study ${project.intakeId} rejected: ${comments.slice(0, 120)}`
          : `Study ${project.intakeId} halted for ethical breach: ${comments.slice(0, 120)}`;

      await dispatchRealtimeNotification({
        eventType: "QA_DECISION",
        projectId: project.id,
        intakeId: project.intakeId,
        title: decisionTitle,
        message: decisionMsg,
        targetRoles: decision === "ESCALATED_TO_CEO" ? ["ADMIN", "CEO"] : ["ADMIN"],
        includeProjectParties: true,
      });
    } catch (notifyErr) {
      console.warn("[submitQaReview] Realtime notification warning:", notifyErr);
    }

    // Revalidate paths
    revalidatePath(`/dashboard/qa`);
    revalidatePath(`/dashboard/qa/queue`);
    revalidatePath(`/dashboard/qa/projects/${project.id}/review`);
    revalidatePath(`/dashboard/statistician/projects/${project.id}/workbench`);
    revalidatePath(`/dashboard/admin/projects/${project.id}`);
    revalidatePath(`/dashboard/ceo/escalations`);

    return {
      success: true,
      data: {
        id: reviewResult.id,
        projectId: reviewResult.projectId,
        reviewerId: reviewResult.reviewerId,
        reviewerName: reviewResult.reviewer.fullName,
        decision: reviewResult.decision,
        decisionLabel: QA_DECISION_METADATA[reviewResult.decision]?.label || reviewResult.decision,
        errorClassification: reviewResult.errorClassification,
        errorClassificationLabel: reviewResult.errorClassification
          ? ERROR_CLASSIFICATION_METADATA[reviewResult.errorClassification]?.label || reviewResult.errorClassification
          : null,
        comments: reviewResult.comments,
        qaRevisionDueAt: reviewResult.qaRevisionDueAt ? reviewResult.qaRevisionDueAt.toISOString() : null,
        reviewedAt: reviewResult.reviewedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[submitQaReview] Error:", error);
    return {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: (error as Error).message || "An unexpected error occurred while saving the QA review.",
      },
    };
  }
}

/**
 * 4. Retrieve historical QA scorecards for a project.
 */
export async function getQaReviewHistory(
  projectId: string
): Promise<QaActionResult<QaReviewDTO[]>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in to view review history." },
    };
  }

  try {
    const reviews = await withDbTimeout(
      db.qAReview.findMany({
        where: {
          OR: [{ projectId }, { project: { intakeId: projectId } }],
        },
        include: {
          reviewer: { select: { fullName: true } },
        },
        orderBy: { reviewedAt: "desc" },
      })
    );

    const formatted: QaReviewDTO[] = reviews.map((r) => ({
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
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("[getQaReviewHistory] Error:", error);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to retrieve QA review history." },
    };
  }
}

/**
 * 5. Retrieve all studies currently locked in ETHICAL_BREACH for the CEO desk.
 */
export async function getCeoEscalations(): Promise<QaActionResult<CeoEscalationItemDTO[]>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in to view CEO escalations." },
    };
  }

  const callerRole = (session.user as { role?: RoleName }).role;
  if (callerRole !== "CEO" && callerRole !== "ADMIN") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only the Chief Executive Officer and Admin can access this desk." },
    };
  }

  try {
    const breaches = await withDbTimeout(
      db.project.findMany({
        where: { masterStatus: "ETHICAL_BREACH" },
        include: {
          assignment: {
            include: {
              statistician: { select: { fullName: true, email: true } },
              qaLead: { select: { fullName: true, email: true } },
            },
          },
          qaReviews: {
            where: { decision: "ESCALATED_TO_CEO" },
            orderBy: { reviewedAt: "desc" },
            take: 1,
            include: {
              reviewer: { select: { fullName: true, email: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      })
    );

    const items: CeoEscalationItemDTO[] = breaches.map((p) => {
      const latestEscalation = p.qaReviews[0];
      return {
        id: p.id,
        projectId: p.id,
        intakeId: p.intakeId,
        researchTitle: p.researchTitle,
        packageName: p.packageName,
        qaLeadName: latestEscalation?.reviewer.fullName || p.assignment?.qaLead.fullName || "Senior QA Lead",
        qaLeadEmail: latestEscalation?.reviewer.email || p.assignment?.qaLead.email || "",
        statisticianName: p.assignment?.statistician.fullName || "Assigned Statistician",
        statisticianEmail: p.assignment?.statistician.email || "",
        comments: latestEscalation?.comments || "Ethical breach flagged during analytical quality inspection.",
        escalatedAt: latestEscalation?.reviewedAt.toISOString() || p.updatedAt.toISOString(),
        isLocked: p.isLocked,
      };
    });

    return { success: true, data: items };
  } catch (error) {
    console.error("[getCeoEscalations] Error:", error);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to load CEO ethical breach escalations." },
    };
  }
}

/**
 * 6. Retrieve projects with 2 or more QA rejections for the Admin alert badge.
 */
export async function getAdminQaRejectionWarnings(): Promise<
  QaActionResult<AdminQaRejectionWarningDTO[]>
> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in to view rejection warnings." },
    };
  }

  const callerRole = (session.user as { role?: RoleName }).role;
  if (callerRole !== "ADMIN" && callerRole !== "CEO") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only administrators can view specialist performance warnings." },
    };
  }

  try {
    const warnings = await withDbTimeout(
      db.qARejectionCount.findMany({
        where: { count: { gte: 2 } },
        include: {
          project: { select: { intakeId: true, researchTitle: true } },
          statistician: { select: { fullName: true, email: true } },
        },
        orderBy: { lastRejectedAt: "desc" },
      })
    );

    const items: AdminQaRejectionWarningDTO[] = warnings.map((w) => ({
      projectId: w.projectId,
      intakeId: w.project.intakeId,
      researchTitle: w.project.researchTitle,
      statisticianName: w.statistician.fullName,
      statisticianEmail: w.statistician.email,
      rejectionCount: w.count,
      lastRejectedAt: w.lastRejectedAt.toISOString(),
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error("[getAdminQaRejectionWarnings] Error:", error);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to retrieve QA rejection warnings." },
    };
  }
}
