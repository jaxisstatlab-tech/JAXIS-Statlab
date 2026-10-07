"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import {
  assertReleaseEligibility,
  computePurgeDeadline,
  computeRevisionWindowExpiry,
  DELIVERABLE_CATEGORY_METADATA,
  getRevisionWindowCountdown,
  isRevisionWindowActive,
  REVISION_CLASSIFICATION_METADATA,
} from "@/lib/delivery-rules";
import { getR2DownloadUrl } from "@/lib/storage";
import {
  ClassifyRevisionSchema,
  ReleaseDeliverablesSchema,
  SubmitRevisionRequestSchema,
  UploadDeliverableSchema,
  type AdminDeliverablesDeskDTO,
  type ClassifyRevisionInput,
  type ClientDeliverablesDTO,
  type DeliverableDTO,
  type QaCertificateDTO,
  type ReleaseDeliverablesInput,
  type RevisionRequestDTO,
  type SubmitRevisionRequestInput,
  type UploadDeliverableInput,
} from "./schemas";
import { Deliverable, RevisionRequest, RoleName, DeliverableCategory, type ProjectStatus } from "@prisma/client";
import { assertStudyAccess } from "@/lib/access-control";
import { clientGetsFile } from "@/lib/file-types";
import { emailClient } from "@/lib/email/notify";
import { clientFilesUnlocked } from "@/lib/delivery-rules";
import { clientPackageName } from "@/features/projects/client-packages";
import { devStudyDataEnabled, devAdminDeliverables, devClientDeliverables, devDeliverableDownload, devSubmitRevision } from "@/features/projects/dev-study-store";

/**
 * Maps Deliverable Prisma record to DeliverableDTO
 */
function toDeliverableDTO(
  d: Deliverable & {
    uploader?: { id: string; fullName: string } | null;
    releaser?: { id: string; fullName: string } | null;
  }
): DeliverableDTO {
  const meta = DELIVERABLE_CATEGORY_METADATA[d.category];
  return {
    id: d.id,
    projectId: d.projectId,
    category: d.category,
    categoryLabel: meta ? meta.label : d.category,
    fileName: d.fileName,
    filePath: d.filePath,
    fileSize: d.fileSize,
    fileType: d.fileType,
    uploadedBy: d.uploadedBy,
    uploaderName: d.uploader?.fullName || "Staff Member",
    isFinalReleased: d.isFinalReleased,
    releasedAt: d.releasedAt ? d.releasedAt.toISOString() : null,
    releasedBy: d.releasedBy,
    releaserName: d.releaser?.fullName || null,
    downloadCount: d.downloadCount,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/**
 * Maps RevisionRequest Prisma record to RevisionRequestDTO
 */
function toRevisionRequestDTO(
  r: RevisionRequest & {
    project?: { id: string; intakeId: string; researchTitle: string } | null;
    client?: { id: string; fullName: string; email: string } | null;
    classifier?: { id: string; fullName: string } | null;
  }
): RevisionRequestDTO {
  const classMeta = r.classification ? REVISION_CLASSIFICATION_METADATA[r.classification] : null;
  return {
    id: r.id,
    projectId: r.projectId,
    projectTitle: r.project?.researchTitle || "Research Study",
    intakeId: r.project?.intakeId || "JAXIS-STUDY",
    clientId: r.clientId,
    clientName: r.client?.fullName || "Client",
    clientEmail: r.client?.email || "",
    description: r.description,
    requestedSections: r.requestedSections,
    status: r.status,
    classification: r.classification,
    classificationLabel: classMeta ? classMeta.label : null,
    classificationNotes: r.classificationNotes,
    classifiedBy: r.classifiedBy,
    classifierName: r.classifier?.fullName || null,
    classifiedAt: r.classifiedAt ? r.classifiedAt.toISOString() : null,
    supplementalQuotationId: r.supplementalQuotationId,
    supplementalSowId: r.supplementalSowId,
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/**
 * Retrieves Admin Deliverables Packaging & Release Desk bundle
 */
export async function getAdminDeliverablesDesk(projectId: string): Promise<AdminDeliverablesDeskDTO> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required.");
  }

  if (session.user.role === "CLIENT") {
    throw new Error("Unauthorized: Clients cannot access the administrative deliverables desk.");
  }

  const access = await assertStudyAccess(projectId, session.user);
  if (!access.hasAccess) {
    throw new Error(access.error?.message || "Unauthorized: You do not have permission to view this deliverables desk.");
  }

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          select: { id: true, fullName: true, email: true },
        },
        assignment: {
          include: {
            statistician: { select: { id: true, fullName: true } },
            qaLead: { select: { id: true, fullName: true } },
          },
        },
        deliverables: {
          include: {
            uploader: { select: { id: true, fullName: true } },
            releaser: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        revisionRequests: {
          include: {
            client: { select: { id: true, fullName: true, email: true } },
            classifier: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found.`);
    }

    const gateEligibility = await assertReleaseEligibility(projectId);

    return {
      project: {
        id: project.id,
        intakeId: project.intakeId,
        researchTitle: project.researchTitle,
        masterStatus: project.masterStatus,
        packageName: project.packageName,
        qaApproved: project.qaApproved,
        deliveredAt: project.deliveredAt ? project.deliveredAt.toISOString() : null,
        filesPurgeAt: project.filesPurgeAt ? project.filesPurgeAt.toISOString() : null,
        revisionWindowExpiresAt: project.revisionWindowExpiresAt
          ? project.revisionWindowExpiresAt.toISOString()
          : null,
        client: project.client,
        assignedStatistician: project.assignment?.statistician || null,
        assignedQaLead: project.assignment?.qaLead || null,
      },
      gateEligibility,
      deliverables: project.deliverables.map(toDeliverableDTO),
      revisions: project.revisionRequests.map((r) =>
        toRevisionRequestDTO({
          ...r,
          project: { id: project.id, intakeId: project.intakeId, researchTitle: project.researchTitle },
        })
      ),
    };
  } catch (err) {
    if (devStudyDataEnabled()) return devAdminDeliverables(projectId, session.user);
    throw err;
  }
}

/**
 * Uploads a packaged deliverable file record
 */
export async function uploadDeliverable(rawInput: UploadDeliverableInput): Promise<DeliverableDTO> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required.");
  }

  const input = UploadDeliverableSchema.parse(rawInput);
  // Only a file that was really uploaded for this study (the old form saved a made-up path, so the client's
  // download failed with "file wasn't available").
  const folder = `deliverables/${input.projectId.replace(/[^a-zA-Z0-9_-]/g, "_")}/`;
  if (!input.filePath.startsWith(folder) || input.filePath.includes("..")) {
    throw new Error("That file wasn't uploaded for this study. Please upload it again.");
  }

  const access = await assertStudyAccess(input.projectId, session.user);
  if (!access.hasAccess || (!access.isManager && !access.isAssignedStatistician)) {
    throw new Error("Unauthorized: Only administrators and assigned statistical analysts can upload deliverables.");
  }

  const deliverable = await db.deliverable.create({
    data: {
      projectId: input.projectId,
      category: input.category,
      fileName: input.fileName,
      filePath: input.filePath,
      fileSize: input.fileSize,
      fileType: input.fileType,
      uploadedBy: session.user.id,
      isFinalReleased: false,
    },
    include: {
      uploader: { select: { id: true, fullName: true } },
    },
  });

  revalidatePath(`/dashboard/admin/projects/${input.projectId}/deliverables`);
  revalidatePath(`/dashboard/client/projects/${input.projectId}/deliverables`);

  try {
    const project = await db.project.findUnique({
      where: { id: input.projectId },
      select: { intakeId: true, researchTitle: true },
    });

    await dispatchRealtimeNotification({
      eventType: "DELIVERABLE_UPDATE",
      projectId: input.projectId,
      intakeId: project?.intakeId || undefined,
      title: "Deliverable Uploaded",
      message: `${deliverable.uploader?.fullName || "A staff member"} uploaded deliverable "${deliverable.fileName}" to study ${project?.intakeId || ""}.`,
      targetRoles: ["ADMIN", "SENIOR_QA_LEAD"],
      includeProjectParties: true,
      excludeUserId: session.user.id,
    });
  } catch (notifyErr) {
    console.warn("[uploadDeliverable] Realtime notification warning:", notifyErr);
  }

  return toDeliverableDTO(deliverable);
}

/**
 * Deletes an unreleased deliverable
 */
export async function deleteDeliverable(deliverableId: string): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required.");
  }

  const deliverable = await db.deliverable.findUnique({
    where: { id: deliverableId },
  });

  if (!deliverable) {
    throw new Error("Deliverable not found.");
  }

  const access = await assertStudyAccess(deliverable.projectId, session.user);
  if (!access.hasAccess || (!access.isManager && !access.isAssignedStatistician)) {
    throw new Error("Unauthorized: Only administrators and assigned statistical analysts can remove deliverables.");
  }

  if (deliverable.isFinalReleased) {
    throw new Error("Cannot delete a deliverable that has already been released to the client.");
  }

  await db.deliverable.delete({
    where: { id: deliverableId },
  });

  revalidatePath(`/dashboard/admin/projects/${deliverable.projectId}/deliverables`);
  return { success: true };
}

/**
 * Triggers Final Release of Deliverables to Client
 * Enforces Dual Gates: RULE_REL_01 (Financial) + RULE_REL_02 (QA Clearance)
 */
export async function releaseDeliverables(rawInput: ReleaseDeliverablesInput): Promise<{
  success: boolean;
  deliveredAt: string;
  filesPurgeAt: string;
  revisionWindowExpiresAt: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required.");
  }

  const allowedRoles: RoleName[] = ["ADMIN", "CEO"];
  const userRole = (session.user as { role?: RoleName })?.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error("Unauthorized: Only Administrators and the CEO can authorize the final release of deliverables.");
  }

  const input = ReleaseDeliverablesSchema.parse(rawInput);
  const eligibility = await assertReleaseEligibility(input.projectId);

  if (!eligibility.eligible) {
    throw new Error(
      `Cannot release deliverables due to active release gate restrictions:\n${eligibility.reasons.join("\n")}`
    );
  }

  // The reviewer's approval delivers the study. Releasing here is only for files added after that: on a delivered
  // study (dates kept) or after a client's change request (delivered again, new change window). It used to work
  // at any stage, so a Start or Data Check study could be delivered without review, and every release reset the
  // delivery date.
  const current = await db.project.findUnique({
    where: { id: input.projectId },
    select: { masterStatus: true, qaApproved: true, deliveredAt: true, filesPurgeAt: true, revisionWindowExpiresAt: true },
  });
  if (!current) throw new Error("Study not found.");
  if (!current.qaApproved || (current.masterStatus !== "DELIVERED" && current.masterStatus !== "REVISION_REQUESTED")) {
    throw new Error("Files are released when the reviewer approves the work. This study hasn't been approved yet.");
  }
  const redeliver = current.masterStatus === "REVISION_REQUESTED";

  const now = new Date();
  const purgeDeadline = redeliver || !current.filesPurgeAt ? computePurgeDeadline(now, 90) : current.filesPurgeAt;
  const revisionExpiry = redeliver || !current.revisionWindowExpiresAt ? await computeRevisionWindowExpiry(now, 3) : current.revisionWindowExpiresAt;
  const deliveredAt = redeliver || !current.deliveredAt ? now : current.deliveredAt;

  await db.$transaction(async (tx) => {
    // Only files not released yet (released ones keep their date and who released them).
    await tx.deliverable.updateMany({
      where: { projectId: input.projectId, isFinalReleased: false },
      data: { isFinalReleased: true, releasedAt: now, releasedBy: session.user.id },
    });
    const moved = await tx.project.updateMany({
      where: { id: input.projectId, masterStatus: current.masterStatus },
      data: { masterStatus: "DELIVERED", deliveredAt, filesPurgeAt: purgeDeadline, revisionWindowExpiresAt: revisionExpiry },
    });
    if (moved.count === 0) throw new Error("The study changed while you were looking. Reload the page and try again.");
  });

  revalidatePath(`/dashboard/admin/projects/${input.projectId}/deliverables`);
  revalidatePath(`/dashboard/client/projects/${input.projectId}/deliverables`);
  revalidatePath(`/dashboard/client/projects/${input.projectId}`);
  revalidatePath(`/dashboard/client/projects`);
  revalidatePath(`/dashboard/admin/projects`);

  try {
    const project = await db.project.findUnique({
      where: { id: input.projectId },
      select: { intakeId: true, researchTitle: true },
    });

    await dispatchRealtimeNotification({
      eventType: "DELIVERABLE_UPDATE",
      projectId: input.projectId,
      intakeId: project?.intakeId || undefined,
      title: "Files released",
      message: `The final files for ${project?.intakeId || "the study"} are ready to download.`,
      targetRoles: ["FINANCE_OFFICER", "ADMIN"],
      includeProjectParties: true,
      excludeUserId: session.user.id,
    });

    if (redeliver || !current.deliveredAt) await dispatchRealtimeNotification({
      eventType: "PAYMENT_UPDATE",
      projectId: input.projectId,
      intakeId: project?.intakeId || undefined,
      title: "Study delivered",
      message: `${project?.intakeId || "A study"} was delivered. Its study pay can go on the next payslip.`,
      targetRoles: ["FINANCE_OFFICER"],
      excludeUserId: session.user.id,
    });
  } catch (notifyErr) {
    console.warn("[releaseDeliverables] Realtime notification warning:", notifyErr);
  }
  // Once per study (QA approval may have sent it already).
  emailClient(input.projectId, "ProjectDelivered", {}, { once: true });

  return {
    success: true,
    deliveredAt: deliveredAt.toISOString(),
    filesPurgeAt: purgeDeadline.toISOString(),
    revisionWindowExpiresAt: revisionExpiry.toISOString(),
  };
}

/**
 * What a client may see of their files. This loader is a server action anyone can call from the browser, so
 * until the files are released (paid and checked) the client gets no file list or certificate details at all,
 * not just hidden buttons. Storage paths are never sent to clients (downloads go by file ID and are checked).
 */
function forClient(data: ClientDeliverablesDTO): ClientDeliverablesDTO {
  if (!data.isReleased) return { ...data, deliverables: [], qaCertificate: null };
  // Only the written results (PDF or Word); code, data and output files stay with staff.
  return {
    ...data,
    deliverables: data.deliverables.filter((d) => clientGetsFile(d.fileName)).map((d) => ({ ...d, filePath: "" })),
  };
}

/**
 * Retrieves Client Deliverables Portal bundle
 */
export async function getClientDeliverables(projectId: string): Promise<ClientDeliverablesDTO> {
  const data = await loadClientDeliverables(projectId);
  const role = (await auth())?.user?.role;
  return role === "CLIENT" ? forClient(data) : data;
}

async function loadClientDeliverables(projectId: string): Promise<ClientDeliverablesDTO> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required.");
  }

  const userRole = (session.user as { role?: RoleName })?.role;
  const isClient = userRole === "CLIENT";

  try {
    // Staff see a study's files only if they work on it (clients are checked against the study's owner below).
    if (!isClient) {
      const access = await assertStudyAccess(projectId, session.user);
      if (!access.hasAccess) {
        throw new Error(access.error?.message || "Unauthorized: You do not have access to this study's files.");
      }
    }

    let project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          include: {
            clientProfile: true,
          },
        },
        assignment: {
          include: {
            statistician: {
              include: {
                staffProfile: true,
              },
            },
            qaLead: {
              include: {
                staffProfile: true,
              },
            },
          },
        },
        qaReviews: {
          where: { decision: "QA_APPROVED" },
          include: {
            reviewer: {
              include: {
                staffProfile: true,
              },
            },
          },
          orderBy: { reviewedAt: "desc" },
          take: 1,
        },
        deliverables: {
          where: isClient ? { isFinalReleased: true } : undefined,
          include: {
            uploader: { select: { id: true, fullName: true } },
            releaser: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        analysisFiles: {
          where: { isCurrent: true },
          include: {
            statistician: {
              include: {
                staffProfile: true,
              },
            },
          },
        },
        revisionRequests: {
          where: isClient ? { clientId: session.user.id } : undefined,
          include: {
            client: { select: { id: true, fullName: true, email: true } },
            classifier: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found.`);
    }

    if (isClient && project.clientId !== session.user.id) {
      throw new Error("Unauthorized: You do not have access to this study's deliverables.");
    }

    // Check Dual Release Gates (RULE_REL_01 financial & RULE_REL_02 QA clearance)
    const gateEligibility = await assertReleaseEligibility(projectId);
    const isFinancialLocked = !gateEligibility.financialGatePassed && gateEligibility.remainingBalance > 0;

    // If study is DELIVERED and financial gate passed, ensure analysis files are packaged as deliverables
    if (project.masterStatus === "DELIVERED" && !isFinancialLocked) {
      const now = new Date();
      const purgeDeadline = computePurgeDeadline(now, 90);
      const revisionExpiry = await computeRevisionWindowExpiry(now, 3);

      if (project.deliverables.length === 0 && project.analysisFiles.length > 0) {
        for (const af of project.analysisFiles) {
          // Prevent duplicate creation
          const existing = await db.deliverable.findFirst({
            where: { projectId: project.id, filePath: af.filePath },
          });
          if (existing) continue;

          let cat: DeliverableCategory = "STATISTICAL_OUTPUT";
          if (af.fileCategory === "PDF_REPORT") cat = "PDF_REPORT";
          else if (af.fileCategory === "RAW_DATASET") cat = "RAW_DATA_CLEANED";
          else if (af.fileCategory === "OTHER") cat = "OTHER";

          await db.deliverable.create({
            data: {
              projectId: project.id,
              category: cat,
              fileName: af.fileName,
              filePath: af.filePath,
              fileSize: af.fileSize || 1024,
              fileType: af.fileType || "application/octet-stream",
              uploadedBy: af.statisticianId || session.user.id,
              isFinalReleased: true,
              releasedAt: now,
              releasedBy: session.user.id,
            },
          });
        }

        await db.project.update({
          where: { id: project.id },
          data: {
            deliveredAt: project.deliveredAt || now,
            filesPurgeAt: project.filesPurgeAt || purgeDeadline,
            revisionWindowExpiresAt: project.revisionWindowExpiresAt || revisionExpiry,
          },
        });

        // Refetch project with newly created deliverables
        const refreshed = await db.project.findUnique({
          where: { id: projectId },
          include: {
            client: {
              include: {
                clientProfile: true,
              },
            },
            assignment: {
              include: {
                statistician: {
                  include: {
                    staffProfile: true,
                  },
                },
                qaLead: {
                  include: {
                    staffProfile: true,
                  },
                },
              },
            },
            qaReviews: {
              where: { decision: "QA_APPROVED" },
              include: {
                reviewer: {
                  include: {
                    staffProfile: true,
                  },
                },
              },
              orderBy: { reviewedAt: "desc" },
              take: 1,
            },
            deliverables: {
              where: isClient ? { isFinalReleased: true } : undefined,
              include: {
                uploader: { select: { id: true, fullName: true } },
                releaser: { select: { id: true, fullName: true } },
              },
              orderBy: { createdAt: "desc" },
            },
            analysisFiles: {
              where: { isCurrent: true },
              include: {
                statistician: {
                  include: {
                    staffProfile: true,
                  },
                },
              },
            },
            revisionRequests: {
              where: isClient ? { clientId: session.user.id } : undefined,
              include: {
                client: { select: { id: true, fullName: true, email: true } },
                classifier: { select: { id: true, fullName: true } },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        });
        if (refreshed) {
          project = refreshed;
        }
      } else if (!project.revisionWindowExpiresAt) {
        await db.project.update({
          where: { id: project.id },
          data: {
            deliveredAt: project.deliveredAt || now,
            filesPurgeAt: project.filesPurgeAt || purgeDeadline,
            revisionWindowExpiresAt: revisionExpiry,
          },
        });
        project.deliveredAt = project.deliveredAt || now;
        project.filesPurgeAt = project.filesPurgeAt || purgeDeadline;
        project.revisionWindowExpiresAt = revisionExpiry;
      }
    }

    const isReleased =
      !isFinancialLocked &&
      (project.masterStatus === "DELIVERED" || Boolean(project.deliveredAt)) &&
      project.deliverables.length > 0;
    const countdown = getRevisionWindowCountdown(project.revisionWindowExpiresAt);

    const pendingRevision = project.revisionRequests.some(
      (r) => r.status === "PENDING_REVIEW" || r.status === "INCLUDED"
    );

    // Format package tier label
    const formatTierExecuted = (pkg?: string | null): string => {
      if (!pkg) return "JX-04 Advanced Analysis (Econometrics Specialty)";
      if (pkg.includes("04") || pkg.includes("ADVANCED")) {
        return "JX-04 Advanced Analysis (Econometrics Specialty)";
      }
      if (pkg.includes("03") || pkg.includes("CORE")) {
        return "JX-03 Core Analytical Processing (Multivariate Modeling)";
      }
      if (pkg.includes("02") || pkg.includes("START")) {
        return "JX-02 Start (Foundational Statistical Package)";
      }
      if (pkg.includes("01") || pkg.includes("DATACHECK")) {
        return "JX-01 DataCheck (Exploratory Data Diagnostics)";
      }
      return pkg;
    };

    // Resolve assigned statistician and QA signatory details
    const assignedStatistician =
      project.assignment?.statistician ||
      project.analysisFiles?.find((f) => f.statistician)?.statistician;

    const statisticianName =
      assignedStatistician?.fullName || "Lead Statistical Analyst";
    // A plain job title (a profile bio is a paragraph, not a title).
    const statisticianTitle = "Statistical Analyst";
    const statisticianSignatureUrl =
      assignedStatistician?.staffProfile?.signatureUrl || null;

    const approvedReview = project.qaReviews?.[0];
    const qaUser = approvedReview?.reviewer || project.assignment?.qaLead;
    const qaLeadName = qaUser?.fullName || "JAXIS StatLab review team";
    const qaLeadTitle = "Reviewing Statistical Analyst";
    const qaSignatureUrl = qaUser?.staffProfile?.signatureUrl || null;

    const cleanIntakeNum = project.intakeId.replace(/^JAXIS-?/i, "");
    const certificateId = `JAXIS-AUDIT-2026-${cleanIntakeNum}`;

    const completionDate = (project.deliveredAt || approvedReview?.reviewedAt || new Date()).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const qaCertificate: QaCertificateDTO = {
      certificateId,
      researchTitle: project.researchTitle,
      clientName: project.client?.fullName || "",
      clientEmail: project.client?.email || "",
      // Left empty when missing (the certificate hides empty rows) instead of placeholder text.
      institution: project.client?.clientProfile?.institutionSchool || "",
      program: project.client?.clientProfile?.academicProgram || "",
      tierExecuted: clientPackageName(project.packageName) || formatTierExecuted(project.packageName),
      completionDate,
      statisticianName,
      statisticianTitle,
      statisticianSignatureUrl,
      qaLeadName,
      qaLeadTitle,
      qaSignatureUrl,
    };

    return {
      project: {
        id: project.id,
        intakeId: project.intakeId,
        researchTitle: project.researchTitle,
        masterStatus: project.masterStatus,
        packageName: project.packageName,
        deliveredAt: project.deliveredAt ? project.deliveredAt.toISOString() : null,
        filesPurgeAt: project.filesPurgeAt ? project.filesPurgeAt.toISOString() : null,
        revisionWindowExpiresAt: project.revisionWindowExpiresAt
          ? project.revisionWindowExpiresAt.toISOString()
          : null,
      },
      isReleased,
      paymentLock: isFinancialLocked
        ? {
            isLocked: true,
            remainingBalance: gateEligibility.remainingBalance,
            totalAmount: gateEligibility.totalAmount,
            totalPaid: gateEligibility.totalPaid,
          }
        : null,
      revisionWindow: {
        ...countdown,
        expiresAtFormatted: project.revisionWindowExpiresAt
          ? new Date(project.revisionWindowExpiresAt).toLocaleString("en-PH", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : null,
      },
      deliverables: project.deliverables.map(toDeliverableDTO),
      revisions: project.revisionRequests.map((r) =>
        toRevisionRequestDTO({
          ...r,
          project: { id: project.id, intakeId: project.intakeId, researchTitle: project.researchTitle },
        })
      ),
      hasPendingRevision: pendingRevision,
      qaCertificate: (isReleased || project.qaApproved || project.masterStatus === "DELIVERED") ? qaCertificate : null,
    };
  } catch (err) {
    if (devStudyDataEnabled()) return devClientDeliverables(projectId, session.user);
    throw err;
  }
}

/**
 * Generates secure pre-signed download URL for a deliverable
 */
export async function getDeliverableDownloadUrl(
  deliverableId: string
): Promise<{ url: string; fileName: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required.");
  }
  const isClient = session.user.role === "CLIENT";
  // Offline dev only: sample files have no real storage, so hand back a small placeholder.
  if (devStudyDataEnabled()) {
    const dev = devDeliverableDownload(deliverableId, session.user);
    if (isClient && !clientGetsFile(dev.fileName)) throw new Error("This file isn't available to you.");
    return dev;
  }

  const deliverable = await db.deliverable.findUnique({
    where: { id: deliverableId },
    include: {
      project: true,
    },
  });

  if (!deliverable) {
    throw new Error("Deliverable file not found.");
  }

  const access = await assertStudyAccess(deliverable.projectId, session.user);
  if (!access.hasAccess) {
    throw new Error(access.error?.message || "Unauthorized: You do not have access to this deliverable.");
  }

  if (isClient) {
    if (!deliverable.isFinalReleased) {
      throw new Error("This file isn't ready for you yet.");
    }
    // Code, data and output files stay with staff (see clientGetsFile).
    if (!clientGetsFile(deliverable.fileName)) {
      throw new Error("This file isn't available to you.");
    }
    // Checked here too, not only on the page: a released file still waits for the last payment.
    const { unlocked } = await clientFilesUnlocked(deliverable.projectId);
    if (!unlocked) {
      console.warn("[files] Blocked a client download: balance still due", {
        projectId: deliverable.projectId,
        deliverableId,
        userId: session.user.id,
      });
      throw new Error("Pay the rest of your balance to download your files.");
    }
  }

  // Increment download counter
  await db.deliverable.update({
    where: { id: deliverableId },
    data: { downloadCount: { increment: 1 } },
  });

  const url = await getR2DownloadUrl(
    deliverable.filePath,
    deliverable.fileName,
    deliverable.fileType
  );
  return { url, fileName: deliverable.fileName };
}

/**
 * Submits Client Revision Request within the 3-day active window
 */
export async function submitClientRevision(rawInput: SubmitRevisionRequestInput): Promise<RevisionRequestDTO> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required.");
  }

  const input = SubmitRevisionRequestSchema.parse(rawInput);
  // Offline dev only: saved to .dev-revisions.json with the same rules.
  if (devStudyDataEnabled()) return devSubmitRevision(input, session.user);

  const project = await db.project.findUnique({
    where: { id: input.projectId },
    include: {
      revisionRequests: {
        where: { status: { in: ["PENDING_REVIEW", "INCLUDED"] } },
      },
    },
  });

  if (!project) {
    throw new Error(`Project ${input.projectId} not found.`);
  }

  if (project.clientId !== session.user.id) {
    throw new Error("Unauthorized: Only the client who submitted this study can file revision requests.");
  }

  if (!isRevisionWindowActive(project.revisionWindowExpiresAt)) {
    throw new Error("The 3-day revision window for this study has expired.");
  }

  // Changes are asked about files the client has received, so the balance must be paid first.
  if (!(await clientFilesUnlocked(project.id)).unlocked) {
    throw new Error("Pay the rest of your balance first. You can ask for changes once you have your files.");
  }

  if (project.revisionRequests.length > 0) {
    throw new Error("You already have an active revision request pending review.");
  }

  const [revision] = await db.$transaction([
    db.revisionRequest.create({
      data: {
        projectId: input.projectId,
        clientId: session.user.id,
        description: input.description,
        requestedSections: input.requestedSections || null,
        status: "PENDING_REVIEW",
      },
      include: {
        client: { select: { id: true, fullName: true, email: true } },
      },
    }),
    db.project.update({
      where: { id: input.projectId },
      data: { masterStatus: "REVISION_REQUESTED" },
    }),
  ]);

  revalidatePath(`/dashboard/client/projects/${input.projectId}/deliverables`);
  revalidatePath(`/dashboard/client/projects/${input.projectId}`);
  revalidatePath(`/dashboard/admin/revisions`);

  try {
    await dispatchRealtimeNotification({
      eventType: "REVISION_REQUEST",
      projectId: input.projectId,
      intakeId: project.intakeId,
      title: "Revision Requested",
      message: `Client ${session.user.name || "Client"} requested revisions on study ${project.intakeId}: "${input.description.slice(0, 100)}"`,
      targetRoles: ["ADMIN"],
      includeProjectParties: true,
      excludeUserId: session.user.id,
    });
  } catch (notifyErr) {
    console.warn("[submitClientRevision] Realtime notification warning:", notifyErr);
  }

  return toRevisionRequestDTO({
    ...revision,
    project: { id: project.id, intakeId: project.intakeId, researchTitle: project.researchTitle },
  });
}

/**
 * Retrieves all Revision Requests across all projects for Admin Triage
 */
export async function getAdminRevisionQueue(): Promise<RevisionRequestDTO[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required.");
  }

  const allowedRoles: RoleName[] = ["ADMIN", "CEO"];
  const userRole = (session.user as { role?: RoleName })?.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error("Unauthorized: Only Administrators and the CEO can view the revision queue.");
  }

  const revisions = await db.revisionRequest.findMany({
    include: {
      project: { select: { id: true, intakeId: true, researchTitle: true } },
      client: { select: { id: true, fullName: true, email: true } },
      classifier: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return revisions.map(toRevisionRequestDTO);
}

/**
 * Admin Classifies Revision Request:
 * - INCLUDED: Routes to Lead Statistician (maintains REVISION_REQUESTED / IN_PROGRESS)
 * - METHODOLOGY_CHANGE: Prompts supplemental SOW
 * - NEW_PAID_WORK: Prompts supplemental quotation
 */
export async function classifyRevision(rawInput: ClassifyRevisionInput): Promise<RevisionRequestDTO> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required.");
  }

  const allowedRoles: RoleName[] = ["ADMIN", "CEO"];
  const userRole = (session.user as { role?: RoleName })?.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error("Unauthorized: Only Administrators and the CEO can classify revision requests.");
  }

  const input = ClassifyRevisionSchema.parse(rawInput);

  const existing = await db.revisionRequest.findUnique({
    where: { id: input.revisionRequestId },
    include: { project: true },
  });

  if (!existing) {
    throw new Error("Revision request not found.");
  }
  // Once only, while the client's request is still waiting (it used to be re-classifiable at any time).
  if (existing.status !== "PENDING_REVIEW" || existing.project.masterStatus !== "REVISION_REQUESTED") {
    throw new Error("This change request was already handled. Reload the page.");
  }

  const now = new Date();

  // Status mapping based on classification
  let targetProjectStatus: ProjectStatus = existing.project.masterStatus;
  let revisionStatus: "INCLUDED" | "METHODOLOGY_CHANGE" | "NEW_PAID_WORK" = "INCLUDED";

  if (input.classification === "INCLUDED") {
    revisionStatus = "INCLUDED";
    targetProjectStatus = "REVISION_REQUESTED";
  } else if (input.classification === "METHODOLOGY_CHANGE") {
    revisionStatus = "METHODOLOGY_CHANGE";
    targetProjectStatus = "SCOPE_CREEP_HALTED";
  } else if (input.classification === "NEW_PAID_WORK") {
    revisionStatus = "NEW_PAID_WORK";
    targetProjectStatus = "SCOPE_CREEP_HALTED";
  }

  const [updatedRevision] = await db.$transaction([
    db.revisionRequest.update({
      where: { id: input.revisionRequestId },
      data: {
        status: revisionStatus,
        classification: input.classification,
        classificationNotes: input.notes,
        classifiedBy: session.user.id,
        classifiedAt: now,
        supplementalQuotationId: input.supplementalQuotationId || null,
        supplementalSowId: input.supplementalSowId || null,
      },
      include: {
        project: { select: { id: true, intakeId: true, researchTitle: true } },
        client: { select: { id: true, fullName: true, email: true } },
        classifier: { select: { id: true, fullName: true } },
      },
    }),
    db.project.update({
      where: { id: existing.projectId },
      data: { masterStatus: targetProjectStatus },
    }),
  ]);

  revalidatePath(`/dashboard/admin/revisions`);
  revalidatePath(`/dashboard/admin/projects/${existing.projectId}/deliverables`);
  revalidatePath(`/dashboard/client/projects/${existing.projectId}/deliverables`);
  revalidatePath(`/dashboard/client/projects/${existing.projectId}`);

  try {
    const isIncluded = input.classification === "INCLUDED";
    await dispatchRealtimeNotification({
      eventType: "REVISION_REQUEST",
      projectId: existing.projectId,
      intakeId: existing.project.intakeId,
      title: isIncluded ? "Change request accepted" : "Change request needs a new price",
      message: isIncluded
        ? `The client's change request on ${existing.project.intakeId} is covered by the original price.`
        : `The client's change request on ${existing.project.intakeId} is extra work. It's on hold until it's priced.`,
      targetRoles: ["ADMIN"],
      includeProjectParties: true,
      excludeUserId: session.user.id,
    });
  } catch (notifyErr) {
    console.warn("[classifyRevision] Realtime notification warning:", notifyErr);
  }

  return toRevisionRequestDTO(updatedRevision);
}
