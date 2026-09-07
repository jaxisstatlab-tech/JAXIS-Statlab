"use server";

import { db, withDbTimeout } from "@/lib/db";
import { auth } from "@/lib/auth";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import {
  assertDisputeWindowOpen,
  computeSLABreachRefund,
} from "@/lib/dispute-rules";
import {
  SubmitDisputeSchema,
  ReviewDisputeSchema,
  TriggerChargebackSchema,
  ResolveDisputeSchema,
  DisputeFilterSchema,
  type SubmitDisputeInput,
  type ReviewDisputeInput,
  type TriggerChargebackInput,
  type ResolveDisputeInput,
  type DisputeFilterInput,
  type DisputeDTO,
  type DisputeSummaryDTO,
  type ClientDisputeEligibilityDTO,
  type DisputeGrounds,
  type DisputeStatus,
  type DisputeResolutionType,
} from "./schemas";
import { revalidatePath } from "next/cache";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getClientEligibleDisputesAction(): Promise<{
  success: boolean;
  data?: {
    eligibleProjects: ClientDisputeEligibilityDTO[];
    clientDisputes: DisputeDTO[];
  };
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    const projects = await withDbTimeout(
      db.project.findMany({
        where: {
          clientId: user.id,
          deliveredAt: { not: null },
        },
        include: {
          quotations: {
            where: { status: "CLIENT_APPROVED" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          disputes: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { deliveredAt: "desc" },
      })
    );

    const now = new Date();
    const eligibleProjects: ClientDisputeEligibilityDTO[] = projects.map((p) => {
      const deliveredAt = p.deliveredAt;
      let windowExpiresAt: Date | null = null;
      let isEligible = false;
      let remainingDays = 0;
      let remainingMs = 0;
      let reason: string | undefined;

      if (deliveredAt) {
        windowExpiresAt = new Date(deliveredAt.getTime() + SEVEN_DAYS_MS);
        remainingMs = windowExpiresAt.getTime() - now.getTime();
        if (remainingMs > 0) {
          isEligible = true;
          remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        } else {
          reason = "7-day post-delivery dispute window expired";
        }
      } else {
        reason = "Project has not been marked delivered";
      }

      const existingDisputeRaw = p.disputes[0];
      let existingDispute: DisputeDTO | null = null;
      if (existingDisputeRaw) {
        existingDispute = {
          id: existingDisputeRaw.id,
          projectId: p.id,
          projectIntakeId: p.intakeId,
          projectTitle: p.researchTitle,
          packageName: p.packageName || p.quotations[0]?.packageName || "STANDARD",
          grossAmount: p.quotations[0] ? Number(p.quotations[0].totalAmount) : 0,
          clientName: user.name || "Client",
          clientEmail: user.email || "",
          grounds: existingDisputeRaw.grounds as DisputeGrounds,
          description: existingDisputeRaw.description,
          evidenceFilePaths: existingDisputeRaw.evidenceFilePaths,
          status: existingDisputeRaw.status as DisputeStatus,
          resolutionType: (existingDisputeRaw.resolutionType as DisputeResolutionType) || null,
          resolutionNotes: existingDisputeRaw.resolutionNotes,
          resolvedBy: existingDisputeRaw.resolvedBy,
          resolvedAt: existingDisputeRaw.resolvedAt ? existingDisputeRaw.resolvedAt.toISOString() : null,
          chargebackTriggeredBy: existingDisputeRaw.chargebackTriggeredBy,
          chargebackAt: existingDisputeRaw.chargebackAt ? existingDisputeRaw.chargebackAt.toISOString() : null,
          disputeWindowExpiresAt: existingDisputeRaw.disputeWindowExpiresAt.toISOString(),
          createdAt: existingDisputeRaw.createdAt.toISOString(),
          updatedAt: existingDisputeRaw.updatedAt.toISOString(),
          deliveredAt: p.deliveredAt ? p.deliveredAt.toISOString() : null,
        };
      }

      return {
        projectId: p.id,
        intakeId: p.intakeId,
        researchTitle: p.researchTitle,
        deliveredAt: deliveredAt ? deliveredAt.toISOString() : null,
        windowExpiresAt: windowExpiresAt ? windowExpiresAt.toISOString() : null,
        isEligible,
        remainingDays,
        remainingMs,
        reason,
        existingDispute,
      };
    });

    // Also get all disputes submitted by this client
    const disputesRaw = await withDbTimeout(
      db.dispute.findMany({
        where: { clientId: user.id },
        include: {
          project: {
            include: {
              quotations: {
                where: { status: "CLIENT_APPROVED" },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    );

    const clientDisputes: DisputeDTO[] = disputesRaw.map((d) => ({
      id: d.id,
      projectId: d.projectId,
      projectIntakeId: d.project.intakeId,
      projectTitle: d.project.researchTitle,
      packageName: d.project.packageName || d.project.quotations[0]?.packageName || "STANDARD",
      grossAmount: d.project.quotations[0] ? Number(d.project.quotations[0].totalAmount) : 0,
      clientName: user.name || "Client",
      clientEmail: user.email || "",
      grounds: d.grounds as DisputeGrounds,
      description: d.description,
      evidenceFilePaths: d.evidenceFilePaths,
      status: d.status as DisputeStatus,
      resolutionType: (d.resolutionType as DisputeResolutionType) || null,
      resolutionNotes: d.resolutionNotes,
      resolvedBy: d.resolvedBy,
      resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
      chargebackTriggeredBy: d.chargebackTriggeredBy,
      chargebackAt: d.chargebackAt ? d.chargebackAt.toISOString() : null,
      disputeWindowExpiresAt: d.disputeWindowExpiresAt.toISOString(),
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      deliveredAt: d.project.deliveredAt ? d.project.deliveredAt.toISOString() : null,
    }));

    return {
      success: true,
      data: {
        eligibleProjects,
        clientDisputes,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load dispute eligibility.";
    console.error("getClientEligibleDisputesAction error:", err);
    return { success: false, error: { message: msg } };
  }
}

export async function submitDisputeAction(rawInput: SubmitDisputeInput): Promise<{
  success: boolean;
  data?: { disputeId: string };
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    const parsed = SubmitDisputeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: { message: parsed.error.issues[0]?.message || "Invalid dispute details." } };
    }

    const { projectId, grounds, description, evidenceFilePaths } = parsed.data;

    // Verify ownership
    const project = await withDbTimeout(
      db.project.findUnique({
        where: { id: projectId },
        select: { id: true, clientId: true, hasActiveDispute: true },
      })
    );

    if (!project) {
      return { success: false, error: { message: "Project not found." } };
    }

    if (project.clientId !== user.id && user.role !== "ADMIN" && user.role !== "CEO") {
      return { success: false, error: { message: "Unauthorized to dispute this project." } };
    }

    if (project.hasActiveDispute) {
      return { success: false, error: { message: "An active dispute is already filed for this study." } };
    }

    // 7-Day Window Enforcement
    const windowCheck = await assertDisputeWindowOpen(projectId);

    // Create dispute and update project in transaction
    const dispute = await withDbTimeout(
      db.$transaction(async (tx) => {
        const newDispute = await tx.dispute.create({
          data: {
            projectId,
            clientId: user.id,
            grounds,
            description,
            evidenceFilePaths,
            status: "OPEN",
            disputeWindowExpiresAt: windowCheck.windowExpiresAt!,
          },
        });

        await tx.project.update({
          where: { id: projectId },
          data: {
            hasActiveDispute: true,
            masterStatus: "DISPUTED",
          },
        });

        return newDispute;
      })
    );

    revalidatePath("/dashboard/client/disputes");
    revalidatePath("/dashboard/admin/disputes");
    revalidatePath("/dashboard/ceo/disputes");
    revalidatePath("/dashboard/finance/payouts");

    try {
      const proj = await db.project.findUnique({
        where: { id: projectId },
        select: { intakeId: true, researchTitle: true },
      });

      await dispatchRealtimeNotification({
        eventType: "DISPUTE",
        projectId,
        intakeId: proj?.intakeId || undefined,
        title: "Dispute Submitted",
        message: `Client submitted an academic dispute on study ${proj?.intakeId || ""} (${grounds.replace(/_/g, " ")}): "${description.slice(0, 100)}"`,
        targetRoles: ["ADMIN", "FINANCE_OFFICER", "CEO"],
        includeProjectParties: true,
        excludeUserId: user.id,
      });
    } catch (notifyErr) {
      console.warn("[submitDisputeAction] Realtime notification warning:", notifyErr);
    }

    return { success: true, data: { disputeId: dispute.id } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit dispute.";
    console.error("submitDisputeAction error:", err);
    return { success: false, error: { message: msg } };
  }
}

export async function getAdminDisputesAction(rawInput?: DisputeFilterInput): Promise<{
  success: boolean;
  data?: {
    disputes: DisputeDTO[];
    summary: DisputeSummaryDTO;
  };
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    const hasAccess = ["ADMIN", "FINANCE_OFFICER", "CEO"].includes(user.role);
    if (!hasAccess) {
      return { success: false, error: { message: "Access restricted to administrators and executives." } };
    }

    const parsed = DisputeFilterSchema.safeParse(rawInput || {});
    const search = parsed.success && parsed.data.search ? parsed.data.search.trim().toLowerCase() : "";
    const statusFilter = parsed.success && parsed.data.status ? parsed.data.status : "ALL";

    const disputesRaw = await withDbTimeout(
      db.dispute.findMany({
        include: {
          project: {
            include: {
              quotations: {
                where: { status: "CLIENT_APPROVED" },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
          client: {
            select: { id: true, fullName: true, email: true },
          },
          resolver: {
            select: { id: true, fullName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    );

    // Compute SLA breach potential refund for any SLA_BREACH dispute
    const allDisputeDTOs: DisputeDTO[] = await Promise.all(
      disputesRaw.map(async (d) => {
        let slaAddonRefundAmount = 0;
        if (d.grounds === "SLA_BREACH") {
          slaAddonRefundAmount = await computeSLABreachRefund(d.projectId);
        }

        return {
          id: d.id,
          projectId: d.projectId,
          projectIntakeId: d.project.intakeId,
          projectTitle: d.project.researchTitle,
          packageName: d.project.packageName || d.project.quotations[0]?.packageName || "STANDARD",
          grossAmount: d.project.quotations[0] ? Number(d.project.quotations[0].totalAmount) : 0,
          clientName: d.client.fullName,
          clientEmail: d.client.email,
          grounds: d.grounds as DisputeGrounds,
          description: d.description,
          evidenceFilePaths: d.evidenceFilePaths,
          status: d.status as DisputeStatus,
          resolutionType: (d.resolutionType as DisputeResolutionType) || null,
          resolutionNotes: d.resolutionNotes,
          resolvedBy: d.resolvedBy,
          resolvedByName: d.resolver?.fullName || null,
          resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
          chargebackTriggeredBy: d.chargebackTriggeredBy,
          chargebackAt: d.chargebackAt ? d.chargebackAt.toISOString() : null,
          disputeWindowExpiresAt: d.disputeWindowExpiresAt.toISOString(),
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
          deliveredAt: d.project.deliveredAt ? d.project.deliveredAt.toISOString() : null,
          slaAddonRefundAmount,
        };
      })
    );

    const summary: DisputeSummaryDTO = {
      totalDisputes: allDisputeDTOs.length,
      openDisputes: allDisputeDTOs.filter((d) => d.status === "OPEN").length,
      underReviewDisputes: allDisputeDTOs.filter((d) => d.status === "UNDER_REVIEW").length,
      resolvedRefunds: allDisputeDTOs.filter((d) => d.status === "RESOLVED_REFUND").length,
      resolvedNoRefunds: allDisputeDTOs.filter((d) => d.status === "RESOLVED_NO_REFUND").length,
      chargebacks: allDisputeDTOs.filter((d) => d.status === "CHARGEBACK").length,
      totalRefundsGranted: allDisputeDTOs
        .filter((d) => d.status === "RESOLVED_REFUND")
        .reduce((sum, d) => {
          if (d.resolutionType === "TURNAROUND_UPGRADE_REFUND_ONLY") {
            return sum + (d.slaAddonRefundAmount || 0);
          }
          return sum + d.grossAmount;
        }, 0),
    };

    const filtered = allDisputeDTOs.filter((d) => {
      if (statusFilter !== "ALL" && d.status !== statusFilter) {
        return false;
      }
      if (search) {
        const matchesIntake = d.projectIntakeId.toLowerCase().includes(search);
        const matchesTitle = d.projectTitle.toLowerCase().includes(search);
        const matchesClient = d.clientName.toLowerCase().includes(search) || d.clientEmail.toLowerCase().includes(search);
        return matchesIntake || matchesTitle || matchesClient;
      }
      return true;
    });

    return {
      success: true,
      data: {
        disputes: filtered,
        summary,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load disputes.";
    console.error("getAdminDisputesAction error:", err);
    return { success: false, error: { message: msg } };
  }
}

export async function reviewDisputeAction(rawInput: ReviewDisputeInput): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    const hasAccess = ["ADMIN", "CEO"].includes(user.role);
    if (!hasAccess) {
      return { success: false, error: { message: "Access restricted to administrators and executives." } };
    }

    const parsed = ReviewDisputeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: { message: "Invalid dispute reference." } };
    }

    const { disputeId } = parsed.data;

    const dispute = await withDbTimeout(
      db.dispute.findUnique({
        where: { id: disputeId },
      })
    );

    if (!dispute) {
      return { success: false, error: { message: "Dispute not found." } };
    }

    if (dispute.status !== "OPEN") {
      return { success: false, error: { message: `Cannot move dispute in status ${dispute.status} to under review.` } };
    }

    await withDbTimeout(
      db.dispute.update({
        where: { id: disputeId },
        data: {
          status: "UNDER_REVIEW",
        },
      })
    );

    revalidatePath("/dashboard/admin/disputes");
    revalidatePath("/dashboard/ceo/disputes");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update review status.";
    console.error("reviewDisputeAction error:", err);
    return { success: false, error: { message: msg } };
  }
}

export async function triggerChargebackAction(rawInput: TriggerChargebackInput): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    const hasAccess = ["ADMIN", "CEO"].includes(user.role);
    if (!hasAccess) {
      return { success: false, error: { message: "Access restricted to administrators and executives." } };
    }

    const parsed = TriggerChargebackSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: { message: parsed.error.issues[0]?.message || "Invalid chargeback parameters." } };
    }

    const { disputeId, reason } = parsed.data;

    const dispute = await withDbTimeout(
      db.dispute.findUnique({
        where: { id: disputeId },
        select: { id: true, projectId: true },
      })
    );

    if (!dispute) {
      return { success: false, error: { message: "Dispute not found." } };
    }

    await withDbTimeout(
      db.$transaction(async (tx) => {
        await tx.dispute.update({
          where: { id: disputeId },
          data: {
            status: "CHARGEBACK",
            resolutionType: "CHARGEBACK",
            resolutionNotes: reason,
            chargebackTriggeredBy: user.id,
            chargebackAt: new Date(),
          },
        });

        await tx.project.update({
          where: { id: dispute.projectId },
          data: {
            masterStatus: "HALTED",
            hasActiveDispute: true,
            hasPendingRefund: true,
          },
        });
      })
    );

    revalidatePath("/dashboard/admin/disputes");
    revalidatePath("/dashboard/ceo/disputes");
    revalidatePath("/dashboard/finance/payouts");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to trigger chargeback.";
    console.error("triggerChargebackAction error:", err);
    return { success: false, error: { message: msg } };
  }
}

export async function resolveDisputeAction(rawInput: ResolveDisputeInput): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: { message: "Authentication required." } };
    }

    // RULE_ROL_01: CEO exclusive authority
    if (user.role !== "CEO") {
      return {
        success: false,
        error: { message: "Exclusive Executive Authority (RULE_ROL_01): Only the CEO can issue formal dispute and refund rulings." },
      };
    }

    const parsed = ResolveDisputeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: { message: parsed.error.issues[0]?.message || "Invalid resolution parameters." } };
    }

    const { disputeId, resolutionType, resolutionNotes } = parsed.data;

    const dispute = await withDbTimeout(
      db.dispute.findUnique({
        where: { id: disputeId },
        select: { id: true, projectId: true, grounds: true },
      })
    );

    if (!dispute) {
      return { success: false, error: { message: "Dispute not found." } };
    }

    await withDbTimeout(
      db.$transaction(async (tx) => {
        let finalDisputeStatus: "RESOLVED_REFUND" | "RESOLVED_NO_REFUND" | "CHARGEBACK" = "RESOLVED_NO_REFUND";

        if (resolutionType === "FULL_REFUND" || resolutionType === "TURNAROUND_UPGRADE_REFUND_ONLY") {
          finalDisputeStatus = "RESOLVED_REFUND";
        } else if (resolutionType === "CHARGEBACK") {
          finalDisputeStatus = "CHARGEBACK";
        } else {
          finalDisputeStatus = "RESOLVED_NO_REFUND";
        }

        // Update Dispute
        await tx.dispute.update({
          where: { id: disputeId },
          data: {
            status: finalDisputeStatus,
            resolutionType,
            resolutionNotes,
            resolvedBy: user.id,
            resolvedAt: new Date(),
          },
        });

        // Project Status & Escrow Updates based on Ruling
        if (resolutionType === "FULL_REFUND") {
          await tx.project.update({
            where: { id: dispute.projectId },
            data: {
              hasActiveDispute: false,
              hasPendingRefund: true,
              masterStatus: "CLOSED",
            },
          });
        } else if (resolutionType === "TURNAROUND_UPGRADE_REFUND_ONLY") {
          await tx.project.update({
            where: { id: dispute.projectId },
            data: {
              hasActiveDispute: false,
              hasPendingRefund: false,
              masterStatus: "CLOSED",
            },
          });
        } else if (resolutionType === "NO_REFUND") {
          // Study output upheld -> unblock payouts and close study
          await tx.project.update({
            where: { id: dispute.projectId },
            data: {
              masterStatus: "CLOSED",
              hasActiveDispute: false,
              hasPendingRefund: false,
            },
          });
        } else if (resolutionType === "CHARGEBACK") {
          await tx.project.update({
            where: { id: dispute.projectId },
            data: {
              masterStatus: "HALTED",
              hasActiveDispute: true,
              hasPendingRefund: true,
            },
          });
        }
      })
    );

    revalidatePath("/dashboard/admin/disputes");
    revalidatePath("/dashboard/ceo/disputes");
    revalidatePath("/dashboard/finance/payouts");
    revalidatePath("/dashboard/client/disputes");

    try {
      const proj = await db.project.findUnique({
        where: { id: dispute.projectId },
        select: { intakeId: true, researchTitle: true },
      });

      await dispatchRealtimeNotification({
        eventType: "DISPUTE",
        projectId: dispute.projectId,
        intakeId: proj?.intakeId || undefined,
        title: "Dispute Ruling Issued",
        message: `Executive ruling issued on study ${proj?.intakeId || ""}: ${resolutionType.replace(/_/g, " ")}. "${resolutionNotes?.slice(0, 100) || ""}"`,
        targetRoles: ["ADMIN", "FINANCE_OFFICER"],
        includeProjectParties: true,
        excludeUserId: user.id,
      });
    } catch (notifyErr) {
      console.warn("[resolveDisputeAction] Realtime notification warning:", notifyErr);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to resolve dispute.";
    console.error("resolveDisputeAction error:", err);
    return { success: false, error: { message: msg } };
  }
}
