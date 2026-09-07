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
  type ReleaseDeliverablesInput,
  type RevisionRequestDTO,
  type SubmitRevisionRequestInput,
  type UploadDeliverableInput,
} from "./schemas";
import { Deliverable, RevisionRequest, RoleName, DeliverableCategory } from "@prisma/client";

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

  const allowedRoles: RoleName[] = ["ADMIN", "CEO", "FINANCE_OFFICER", "STATISTICIAN", "SENIOR_QA_LEAD"];
  const userRole = (session.user as { role?: RoleName })?.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error("Unauthorized: You do not have permission to view this deliverables desk.");
  }

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
}

/**
 * Uploads a packaged deliverable file record
 */
export async function uploadDeliverable(rawInput: UploadDeliverableInput): Promise<DeliverableDTO> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required.");
  }

  const allowedRoles: RoleName[] = ["ADMIN", "CEO", "STATISTICIAN"];
  const userRole = (session.user as { role?: RoleName })?.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error("Unauthorized: Only administrators and assigned statisticians can upload deliverables.");
  }

  const input = UploadDeliverableSchema.parse(rawInput);

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

  const allowedRoles: RoleName[] = ["ADMIN", "CEO", "STATISTICIAN"];
  const userRole = (session.user as { role?: RoleName })?.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error("Unauthorized: Only administrators and assigned statisticians can remove deliverables.");
  }

  const deliverable = await db.deliverable.findUnique({
    where: { id: deliverableId },
  });

  if (!deliverable) {
    throw new Error("Deliverable not found.");
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

  const now = new Date();
  const purgeDeadline = computePurgeDeadline(now, 90);
  const revisionExpiry = await computeRevisionWindowExpiry(now, 3);

  await db.$transaction([
    // 1. Mark all deliverables as released
    db.deliverable.updateMany({
      where: { projectId: input.projectId },
      data: {
        isFinalReleased: true,
        releasedAt: now,
        releasedBy: session.user.id,
      },
    }),
    // 2. Advance project status to DELIVERED with required audit timestamps
    db.project.update({
      where: { id: input.projectId },
      data: {
        masterStatus: "DELIVERED",
        deliveredAt: now,
        filesPurgeAt: purgeDeadline,
        revisionWindowExpiresAt: revisionExpiry,
      },
    }),
  ]);

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
      title: "Deliverables Released",
      message: `Final deliverables for study ${project?.intakeId || ""} ("${project?.researchTitle || "Research Study"}") have been officially released and are ready for download.`,
      targetRoles: ["FINANCE_OFFICER", "ADMIN"],
      includeProjectParties: true,
      excludeUserId: session.user.id,
    });
  } catch (notifyErr) {
    console.warn("[releaseDeliverables] Realtime notification warning:", notifyErr);
  }

  return {
    success: true,
    deliveredAt: now.toISOString(),
    filesPurgeAt: purgeDeadline.toISOString(),
    revisionWindowExpiresAt: revisionExpiry.toISOString(),
  };
}

/**
 * Retrieves Client Deliverables Portal bundle
 */
export async function getClientDeliverables(projectId: string): Promise<ClientDeliverablesDTO> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required.");
  }

  const userRole = (session.user as { role?: RoleName })?.role;
  const isClient = userRole === "CLIENT";

  let project = await db.project.findUnique({
    where: { id: projectId },
    include: {
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
  };
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

  const userRole = (session.user as { role?: RoleName })?.role;
  const isClient = userRole === "CLIENT";

  const deliverable = await db.deliverable.findUnique({
    where: { id: deliverableId },
    include: {
      project: true,
    },
  });

  if (!deliverable) {
    throw new Error("Deliverable file not found.");
  }

  if (isClient) {
    if (deliverable.project.clientId !== session.user.id) {
      throw new Error("Unauthorized: You do not own this research study.");
    }
    if (!deliverable.isFinalReleased) {
      throw new Error("This file has not been released by the administration yet.");
    }
  }

  // Increment download counter
  await db.deliverable.update({
    where: { id: deliverableId },
    data: { downloadCount: { increment: 1 } },
  });

  const url = await getR2DownloadUrl(deliverable.filePath);
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

  const now = new Date();

  // Status mapping based on classification
  let targetProjectStatus = existing.project.masterStatus;
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
      title: isIncluded ? "Revision Approved" : "Supplemental Scope Required",
      message: isIncluded
        ? `Revision request for study ${existing.project.intakeId} was approved under warranty and is now in progress.`
        : `Revision request for study ${existing.project.intakeId} classified as ${input.classification.replace(/_/g, " ")}. Further review or supplemental terms required.`,
      targetRoles: ["ADMIN"],
      includeProjectParties: true,
      excludeUserId: session.user.id,
    });
  } catch (notifyErr) {
    console.warn("[classifyRevision] Realtime notification warning:", notifyErr);
  }

  return toRevisionRequestDTO(updatedRevision);
}
