"use server";

import { auth } from "@/lib/auth";
import { db, withDbTimeout } from "@/lib/db";
import { revalidatePath, unstable_cache } from "next/cache";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache-tags";
import {
  SubmitPaymentProofSchema,
  VerifyPaymentSchema,
  RejectPaymentSchema,
  UpdatePaymentChannelsSchema,
  type PaymentItem,
  type ProjectPaymentsData,
  type StudyReceivableItem,
  type FinanceOverviewData,
  type ActionResponse,
} from "./schemas";
import {
  assertCanVerifyPayment,
  calculateProjectBalance,
  type PaymentChannelDetails,
  OFFICIAL_PAYMENT_CHANNELS,
} from "@/lib/payment-rules";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import type { PaymentStatus, PackageName, ProjectStatus } from "@prisma/client";
import { assertStudyAccess } from "@/lib/access-control";
import fs from "fs";
import path from "path";

// ─── Local Dev Persistence Fallback ──────────────────────────────────────────

const DEV_DATA_DIR = path.join(process.cwd(), "dev_data");
const DEV_PAYMENTS_FILE = path.join(DEV_DATA_DIR, "payments.json");
const DEV_PROJECTS_FILE = path.join(process.cwd(), ".dev-projects.json");
const DEV_PAYMENT_CHANNELS_FILE = path.join(DEV_DATA_DIR, "payment_channels.json");

function ensureDevDataDir() {
  if (!fs.existsSync(DEV_DATA_DIR)) {
    fs.mkdirSync(DEV_DATA_DIR, { recursive: true });
  }
}

function readPersistedPaymentChannels(): PaymentChannelDetails[] {
  try {
    ensureDevDataDir();
    if (fs.existsSync(DEV_PAYMENT_CHANNELS_FILE)) {
      const data = fs.readFileSync(DEV_PAYMENT_CHANNELS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  return OFFICIAL_PAYMENT_CHANNELS;
}

function writePersistedPaymentChannels(channels: PaymentChannelDetails[]): void {
  try {
    ensureDevDataDir();
    fs.writeFileSync(DEV_PAYMENT_CHANNELS_FILE, JSON.stringify(channels, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

function readPersistedDevPayments(): PaymentItem[] {
  try {
    ensureDevDataDir();
    if (fs.existsSync(DEV_PAYMENTS_FILE)) {
      const data = fs.readFileSync(DEV_PAYMENTS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  return [];
}

function writePersistedDevPayments(payments: PaymentItem[]) {
  try {
    ensureDevDataDir();
    fs.writeFileSync(DEV_PAYMENTS_FILE, JSON.stringify(payments, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

// ─── 1. Submit Payment Proof (Client Action) ─────────────────────────────────

export async function submitPaymentProof(
  input: unknown
): Promise<ActionResponse<PaymentItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required to submit payment proof." },
    };
  }

  const parsed = SubmitPaymentProofSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid payment proof submission parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const {
    projectId,
    quotationId,
    paymentType,
    paymentMethod,
    amountSubmitted,
    referenceNumber,
    receiptFilePath,
    receiptFileName,
    receiptFileSize,
  } = parsed.data;

  try {
    const result = await withDbTimeout(
      db.$transaction(async (tx) => {
        // Verify project and ownership
        const project = await tx.project.findUnique({
          where: { id: projectId },
          include: { client: true },
        });

        if (!project) {
          throw new Error("Project record not found.");
        }

        const isOwner = project.clientId === session.user.id;
        const isAdmin = session.user.role === "ADMIN" || session.user.role === "CEO";
        if (!isOwner && !isAdmin) {
          throw new Error("Unauthorized: Only the project owner can submit payment proofs.");
        }

        // Resolve valid quotation in DB
        let resolvedQuotationId = quotationId;
        const existingQuote = await tx.quotation.findFirst({
          where: {
            projectId,
            ...(quotationId && quotationId !== projectId ? { id: quotationId } : {}),
          },
          orderBy: { createdAt: "desc" },
        });

        if (existingQuote) {
          resolvedQuotationId = existingQuote.id;
        } else {
          // Provision fallback quotation in DB so foreign key constraint passes
          const fallbackQuote = await tx.quotation.create({
            data: {
              projectId,
              createdBy: project.clientId || session.user.id,
              packageName: (project.packageName as PackageName) || "JX_03_CORE",
              basePrice: amountSubmitted * 2,
              totalAmount: amountSubmitted * 2,
              downpaymentRequired: amountSubmitted,
              status: "CLIENT_APPROVED",
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
          resolvedQuotationId = fallbackQuote.id;
        }

        // Create Payment record
        const payment = await tx.payment.create({
          data: {
            projectId,
            quotationId: resolvedQuotationId,
            paymentType,
            paymentMethod,
            amountSubmitted,
            balancePaidTotal: 0,
            referenceNumber,
            paymentStatus: "PROOF_SUBMITTED",
            proofs: {
              create: {
                filePath: receiptFilePath,
                fileName: receiptFileName,
                fileSize: receiptFileSize,
              },
            },
          },
          include: {
            proofs: true,
          },
        });

        // If project is still in SOW_SIGNED, transition to AWAITING_PAYMENT
        if (project.masterStatus === "SOW_SIGNED") {
          await tx.project.update({
            where: { id: projectId },
            data: { masterStatus: "AWAITING_PAYMENT" },
          });
        }

        return payment;
      })
    );

    // Mirror to dev payments cache for instant hydration
    try {
      const devPayments = readPersistedDevPayments();
      if (!devPayments.some((p) => p.id === result.id || (p.referenceNumber && p.referenceNumber === result.referenceNumber))) {
        devPayments.unshift({
          id: result.id,
          projectId: result.projectId,
          quotationId: result.quotationId,
          paymentType: result.paymentType,
          paymentMethod: result.paymentMethod,
          amountSubmitted: Number(result.amountSubmitted),
          balancePaidTotal: Number(result.balancePaidTotal),
          referenceNumber: result.referenceNumber,
          paymentStatus: result.paymentStatus,
          rejectionReason: result.rejectionReason,
          verifiedBy: result.verifiedBy,
          verifiedAt: result.verifiedAt?.toISOString() || null,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
          proofs: result.proofs.map((p) => ({
            id: p.id,
            paymentId: p.paymentId,
            filePath: p.filePath,
            fileName: p.fileName,
            fileSize: p.fileSize,
            uploadedAt: p.uploadedAt.toISOString(),
          })),
        });
        writePersistedDevPayments(devPayments);
      }
    } catch {
      // ignore
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/client");
    revalidatePath("/dashboard/client/projects");
    revalidatePath(`/dashboard/client/projects/${projectId}`);
    revalidatePath(`/dashboard/client/projects/${projectId}/payment`);
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/intake");
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/admin/projects/${projectId}/payment`);
    revalidatePath("/dashboard/finance/payments");
    revalidatePath("/dashboard/finance");
    invalidateCacheTags(CACHE_TAGS.PAYMENTS, CACHE_TAGS.PROJECTS);

    try {
      await dispatchRealtimeNotification({
        eventType: "PAYMENT_UPDATE",
        projectId: result.projectId,
        title: "Payment Proof Submitted",
        message: `Client submitted payment proof of ₱${Number(result.amountSubmitted).toLocaleString()} (Ref: ${result.referenceNumber}). Verification required.`,
        targetRoles: ["FINANCE_OFFICER", "ADMIN"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[submitPaymentProof] Realtime notification warning:", e);
    }

    return {
      success: true,
      data: {
        id: result.id,
        projectId: result.projectId,
        quotationId: result.quotationId,
        paymentType: result.paymentType,
        paymentMethod: result.paymentMethod,
        amountSubmitted: Number(result.amountSubmitted),
        balancePaidTotal: Number(result.balancePaidTotal),
        referenceNumber: result.referenceNumber,
        paymentStatus: result.paymentStatus,
        rejectionReason: result.rejectionReason,
        verifiedBy: result.verifiedBy,
        verifiedAt: result.verifiedAt?.toISOString() || null,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        proofs: result.proofs.map((p) => ({
          id: p.id,
          paymentId: p.paymentId,
          filePath: p.filePath,
          fileName: p.fileName,
          fileSize: p.fileSize,
          uploadedAt: p.uploadedAt.toISOString(),
        })),
      },
    };
  } catch (err) {
    // Fallback for dev mode
    console.warn("Using dev fallback for submitPaymentProof:", err);
    const devPayments = readPersistedDevPayments();
    const newPayment: PaymentItem = {
      id: `pay_dev_${Date.now()}`,
      projectId,
      quotationId,
      paymentType,
      paymentMethod,
      amountSubmitted,
      balancePaidTotal: 0,
      referenceNumber,
      paymentStatus: "PROOF_SUBMITTED",
      rejectionReason: null,
      verifiedBy: null,
      verifiedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      proofs: [
        {
          id: `proof_dev_${Date.now()}`,
          paymentId: `pay_dev_${Date.now()}`,
          filePath: receiptFilePath,
          fileName: receiptFileName,
          fileSize: receiptFileSize,
          uploadedAt: new Date().toISOString(),
        },
      ],
    };

    devPayments.push(newPayment);
    writePersistedDevPayments(devPayments);

    // Update dev projects status if SOW_SIGNED
    try {
      if (fs.existsSync(DEV_PROJECTS_FILE)) {
        const raw = fs.readFileSync(DEV_PROJECTS_FILE, "utf-8");
        const devProjects = JSON.parse(raw);
        const p = devProjects.find((x: { id: string }) => x.id === projectId);
        if (p && p.masterStatus === "SOW_SIGNED") {
          p.masterStatus = "AWAITING_PAYMENT";
          fs.writeFileSync(DEV_PROJECTS_FILE, JSON.stringify(devProjects, null, 2), "utf-8");
        }
      }
    } catch {
      // ignore
    }

    try {
      await dispatchRealtimeNotification({
        eventType: "PAYMENT_UPDATE",
        projectId: newPayment.projectId,
        title: "Payment Proof Submitted",
        message: `Client submitted payment proof of ₱${Number(newPayment.amountSubmitted).toLocaleString()} (Ref: ${newPayment.referenceNumber}). Verification required.`,
        targetRoles: ["FINANCE_OFFICER", "ADMIN"],
        includeProjectParties: true,
      });
    } catch {
      // Ignore in dev
    }

    return { success: true, data: newPayment };
  }
}

// ─── 2. Verify Payment (Finance / Admin Action) ──────────────────────────────

export async function verifyPayment(
  input: unknown
): Promise<ActionResponse<PaymentItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required to verify payment." },
    };
  }

  // RULE_ROL_02: Only Finance Officer, Admin, or CEO
  try {
    assertCanVerifyPayment(session.user.role);
  } catch (err) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: (err as Error).message },
    };
  }

  const parsed = VerifyPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Payment ID is required." },
    };
  }

  const { paymentId } = parsed.data;

  try {
    const result = await withDbTimeout(
      db.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: {
            proofs: true,
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
        });

        if (!payment) {
          throw new Error("Payment record not found.");
        }

        // Sum previous verified payments for this project
        const existingVerifiedPayments = await tx.payment.findMany({
          where: {
            projectId: payment.projectId,
            paymentStatus: { in: ["VERIFIED", "FULLY_PAID"] },
            id: { not: paymentId },
          },
          select: { amountSubmitted: true },
        });

        const prevVerifiedTotal = existingVerifiedPayments.reduce(
          (sum, p) => sum + Number(p.amountSubmitted),
          0
        );

        const newBalancePaidTotal = prevVerifiedTotal + Number(payment.amountSubmitted);

        // Fetch quotation amounts (or fallback to quote attached to payment)
        const quote =
          payment.project.quotations[0] ||
          (await tx.quotation.findUnique({ where: { id: payment.quotationId } }));

        const totalAmount = quote ? Math.max(Number(quote.totalAmount), Number(quote.basePrice)) : 0;
        const downpaymentRequired = quote ? Number(quote.downpaymentRequired) : 0;

        const isFullyPaid = totalAmount > 0 && newBalancePaidTotal >= totalAmount;
        const isActivatable = downpaymentRequired > 0 && newBalancePaidTotal >= downpaymentRequired;

        const updatedPaymentStatus: PaymentStatus = isFullyPaid ? "FULLY_PAID" : "VERIFIED";

        // Update Payment record
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            paymentStatus: updatedPaymentStatus,
            balancePaidTotal: newBalancePaidTotal,
            verifiedBy: session.user.id,
            verifiedAt: new Date(),
            rejectionReason: null,
          },
          include: { proofs: true },
        });

        // Activate project if downpayment cleared and current status is AWAITING_PAYMENT
        if (
          isActivatable &&
          (payment.project.masterStatus === "AWAITING_PAYMENT" ||
            payment.project.masterStatus === "SOW_SIGNED")
        ) {
          await tx.project.update({
            where: { id: payment.projectId },
            data: { masterStatus: "ACTIVE" },
          });
        }

        return updatedPayment;
      })
    );

    // Sync dev payments cache
    try {
      const devPayments = readPersistedDevPayments();
      const idx = devPayments.findIndex(
        (p) => p.id === result.id || (p.referenceNumber && p.referenceNumber === result.referenceNumber)
      );
      if (idx !== -1 && devPayments[idx]) {
        devPayments[idx].paymentStatus = result.paymentStatus;
        devPayments[idx].balancePaidTotal = Number(result.balancePaidTotal);
        devPayments[idx].verifiedBy = result.verifiedBy;
        devPayments[idx].verifiedAt = result.verifiedAt?.toISOString() || null;
        devPayments[idx].updatedAt = result.updatedAt.toISOString();
        writePersistedDevPayments(devPayments);
      }
    } catch {
      // ignore
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/client");
    revalidatePath("/dashboard/client/projects");
    revalidatePath(`/dashboard/client/projects/${result.projectId}`);
    revalidatePath(`/dashboard/client/projects/${result.projectId}/payment`);
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/intake");
    revalidatePath("/dashboard/admin/projects");
    revalidatePath(`/dashboard/admin/projects/${result.projectId}`);
    revalidatePath(`/dashboard/admin/projects/${result.projectId}/payment`);
    revalidatePath("/dashboard/finance/payments");
    revalidatePath("/dashboard/finance");
    invalidateCacheTags(CACHE_TAGS.PAYMENTS, CACHE_TAGS.PROJECTS);

    try {
      const isFullyPaid = result.paymentStatus === "FULLY_PAID";
      await dispatchRealtimeNotification({
        eventType: "PAYMENT_UPDATE",
        projectId: result.projectId,
        title: isFullyPaid ? "Payment Completed" : "Payment Verified & Cleared",
        message: `Payment of ₱${Number(result.amountSubmitted).toLocaleString()} has been verified. Study is active and ready for specialist assignment.`,
        targetRoles: ["CLIENT", "ADMIN", "FINANCE_OFFICER"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[verifyPayment] Realtime notification warning:", e);
    }

    return {
      success: true,
      data: {
        id: result.id,
        projectId: result.projectId,
        quotationId: result.quotationId,
        paymentType: result.paymentType,
        paymentMethod: result.paymentMethod,
        amountSubmitted: Number(result.amountSubmitted),
        balancePaidTotal: Number(result.balancePaidTotal),
        referenceNumber: result.referenceNumber,
        paymentStatus: result.paymentStatus,
        rejectionReason: result.rejectionReason,
        verifiedBy: result.verifiedBy,
        verifiedAt: result.verifiedAt?.toISOString() || null,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        proofs: result.proofs.map((p) => ({
          id: p.id,
          paymentId: p.paymentId,
          filePath: p.filePath,
          fileName: p.fileName,
          fileSize: p.fileSize,
          uploadedAt: p.uploadedAt.toISOString(),
        })),
      },
    };
  } catch (err) {
    // Dev fallback
    console.warn("Using dev fallback for verifyPayment:", err);
    const devPayments = readPersistedDevPayments();
    const idx = devPayments.findIndex((p) => p.id === paymentId);

    const current = devPayments[idx];
    if (idx === -1 || !current) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Payment record not found in persistence store." },
      };
    }

    const newBal = current.balancePaidTotal + current.amountSubmitted;

    current.paymentStatus = "VERIFIED";
    current.balancePaidTotal = newBal;
    current.verifiedBy = session.user.id;
    current.verifiedAt = new Date().toISOString();
    current.rejectionReason = null;
    current.updatedAt = new Date().toISOString();

    devPayments[idx] = current;
    writePersistedDevPayments(devPayments);

    // Also update dev project status to ACTIVE
    try {
      if (fs.existsSync(DEV_PROJECTS_FILE)) {
        const raw = fs.readFileSync(DEV_PROJECTS_FILE, "utf-8");
        const devProjects = JSON.parse(raw);
        const p = devProjects.find((x: { id: string }) => x.id === current.projectId);
        if (p && (p.masterStatus === "AWAITING_PAYMENT" || p.masterStatus === "SOW_SIGNED")) {
          p.masterStatus = "ACTIVE";
          fs.writeFileSync(DEV_PROJECTS_FILE, JSON.stringify(devProjects, null, 2), "utf-8");
        }
      }
    } catch {
      // ignore
    }

    try {
      await dispatchRealtimeNotification({
        eventType: "PAYMENT_UPDATE",
        projectId: current.projectId,
        title: "Payment Verified & Cleared",
        message: `Payment of ₱${Number(current.amountSubmitted).toLocaleString()} has been verified. Study is active and ready for specialist assignment.`,
        targetRoles: ["CLIENT", "ADMIN", "FINANCE_OFFICER"],
        includeProjectParties: true,
      });
    } catch {
      // Ignore in dev
    }

    return { success: true, data: current };
  }
}

// ─── 3. Reject Payment (Finance / Admin Action) ──────────────────────────────

export async function rejectPayment(
  input: unknown
): Promise<ActionResponse<PaymentItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required to reject payment." },
    };
  }

  // RULE_ROL_02: Only Finance Officer, Admin, or CEO
  try {
    assertCanVerifyPayment(session.user.role);
  } catch (err) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: (err as Error).message },
    };
  }

  const parsed = RejectPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please provide a valid rejection reason.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { paymentId, rejectionReason } = parsed.data;

  try {
    const updated = await withDbTimeout(
      db.payment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: "REJECTED",
          rejectionReason,
          verifiedBy: session.user.id,
          verifiedAt: new Date(),
        },
        include: { proofs: true },
      })
    );

    // Sync dev payments cache
    try {
      const devPayments = readPersistedDevPayments();
      const idx = devPayments.findIndex(
        (p) => p.id === updated.id || (p.referenceNumber && p.referenceNumber === updated.referenceNumber)
      );
      if (idx !== -1 && devPayments[idx]) {
        devPayments[idx].paymentStatus = "REJECTED";
        devPayments[idx].rejectionReason = rejectionReason;
        devPayments[idx].verifiedBy = session.user.id;
        devPayments[idx].verifiedAt = new Date().toISOString();
        devPayments[idx].updatedAt = new Date().toISOString();
        writePersistedDevPayments(devPayments);
      }
    } catch {
      // ignore
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/client");
    revalidatePath("/dashboard/client/projects");
    revalidatePath(`/dashboard/client/projects/${updated.projectId}`);
    revalidatePath(`/dashboard/client/projects/${updated.projectId}/payment`);
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/intake");
    revalidatePath("/dashboard/admin/projects");
    revalidatePath(`/dashboard/admin/projects/${updated.projectId}`);
    revalidatePath(`/dashboard/admin/projects/${updated.projectId}/payment`);
    revalidatePath("/dashboard/finance/payments");
    revalidatePath("/dashboard/finance");
    invalidateCacheTags(CACHE_TAGS.PAYMENTS, CACHE_TAGS.PROJECTS);

    try {
      await dispatchRealtimeNotification({
        eventType: "PAYMENT_UPDATE",
        projectId: updated.projectId,
        title: "Payment Proof Declined",
        message: `Payment proof of ₱${Number(updated.amountSubmitted).toLocaleString()} was declined: "${rejectionReason}". Please review and upload a valid receipt.`,
        targetRoles: ["CLIENT", "ADMIN"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[rejectPayment] Realtime notification warning:", e);
    }

    return {
      success: true,
      data: {
        id: updated.id,
        projectId: updated.projectId,
        quotationId: updated.quotationId,
        paymentType: updated.paymentType,
        paymentMethod: updated.paymentMethod,
        amountSubmitted: Number(updated.amountSubmitted),
        balancePaidTotal: Number(updated.balancePaidTotal),
        referenceNumber: updated.referenceNumber,
        paymentStatus: updated.paymentStatus,
        rejectionReason: updated.rejectionReason,
        verifiedBy: updated.verifiedBy,
        verifiedAt: updated.verifiedAt?.toISOString() || null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        proofs: updated.proofs.map((p) => ({
          id: p.id,
          paymentId: p.paymentId,
          filePath: p.filePath,
          fileName: p.fileName,
          fileSize: p.fileSize,
          uploadedAt: p.uploadedAt.toISOString(),
        })),
      },
    };
  } catch (err) {
    // Dev fallback
    console.warn("Using dev fallback for rejectPayment:", err);
    const devPayments = readPersistedDevPayments();
    const idx = devPayments.findIndex((p) => p.id === paymentId);
    const current = devPayments[idx];

    if (idx === -1 || !current) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Payment record not found." },
      };
    }

    current.paymentStatus = "REJECTED";
    current.rejectionReason = rejectionReason;
    current.verifiedBy = session.user.id;
    current.verifiedAt = new Date().toISOString();
    current.updatedAt = new Date().toISOString();

    devPayments[idx] = current;
    writePersistedDevPayments(devPayments);

    try {
      await dispatchRealtimeNotification({
        eventType: "PAYMENT_UPDATE",
        projectId: current.projectId,
        title: "Payment Proof Declined",
        message: `Payment proof of ₱${Number(current.amountSubmitted).toLocaleString()} was declined: "${rejectionReason}". Please review and upload a valid receipt.`,
        targetRoles: ["CLIENT", "ADMIN"],
        includeProjectParties: true,
      });
    } catch {
      // Ignore in dev
    }

    return { success: true, data: current };
  }
}

// ─── 4. Get Payments by Project ──────────────────────────────────────────────

export async function getPaymentsByProject(
  projectId: string
): Promise<ActionResponse<ProjectPaymentsData>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    };
  }

  // Statisticians and QA Leads are strictly forbidden from viewing client commercial payments
  if (session.user.role === "STATISTICIAN" || session.user.role === "SENIOR_QA_LEAD") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "You do not have permission to view study payments." },
    };
  }

  const access = await assertStudyAccess(projectId, session.user);
  if (!access.hasAccess) {
    return {
      success: false,
      error: access.error || { code: "FORBIDDEN", message: "You don't have access to this study's payments." },
    };
  }

  try {
    const project = await withDbTimeout(
      db.project.findUnique({
        where: { id: projectId },
        include: {
          quotations: {
            where: { status: { in: ["CLIENT_APPROVED", "DRAFT", "QUOTE_SENT"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          payments: {
            include: { proofs: true },
            orderBy: { createdAt: "desc" },
          },
        },
      })
    );

    if (!project) {
      throw new Error("Project not found.");
    }

    const activeQuote = project.quotations[0];
    const totalAmount = activeQuote ? Number(activeQuote.totalAmount) : 0;
    const downpaymentRequired = activeQuote ? Number(activeQuote.downpaymentRequired) : 0;

    const formattedPayments: PaymentItem[] = project.payments.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      quotationId: p.quotationId,
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      amountSubmitted: Number(p.amountSubmitted),
      balancePaidTotal: Number(p.balancePaidTotal),
      referenceNumber: p.referenceNumber,
      paymentStatus: p.paymentStatus,
      rejectionReason: p.rejectionReason,
      verifiedBy: p.verifiedBy,
      verifiedAt: p.verifiedAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      proofs: p.proofs.map((proof) => ({
        id: proof.id,
        paymentId: proof.paymentId,
        filePath: proof.filePath,
        fileName: proof.fileName,
        fileSize: proof.fileSize,
        uploadedAt: proof.uploadedAt.toISOString(),
      })),
    }));

    // Merge DB payments with any dev-persisted payments for this project
    const devPayments = readPersistedDevPayments().filter((p) => p.projectId === projectId);
    const combinedPayments = [...formattedPayments];
    for (const dp of devPayments) {
      if (
        !combinedPayments.some(
          (p) => p.id === dp.id || (p.referenceNumber && p.referenceNumber === dp.referenceNumber)
        )
      ) {
        combinedPayments.unshift(dp);
      }
    }

    const summary = calculateProjectBalance(
      combinedPayments.map((p) => ({
        amountSubmitted: p.amountSubmitted,
        paymentStatus: p.paymentStatus,
      })),
      totalAmount,
      downpaymentRequired
    );

    return {
      success: true,
      data: {
        payments: combinedPayments,
        summary,
        quotationId: activeQuote ? activeQuote.id : null,
      },
    };
  } catch (err) {
    // Dev fallback
    console.warn("Using dev fallback for getPaymentsByProject:", err);
    const devPayments = readPersistedDevPayments().filter((p) => p.projectId === projectId);

    let totalAmount = 2750;
    let downpaymentRequired = 1375;
    let quotationId: string | null = null;

    try {
      if (fs.existsSync(DEV_PROJECTS_FILE)) {
        const raw = fs.readFileSync(DEV_PROJECTS_FILE, "utf-8");
        const devProjects = JSON.parse(raw);
        const p = devProjects.find((x: { id: string }) => x.id === projectId);
        if (p) {
          if (
            session.user.role === "CLIENT" &&
            p.clientId !== session.user.id &&
            p.client?.email?.toLowerCase() !== session.user.email?.toLowerCase()
          ) {
            return {
              success: false,
              error: { code: "FORBIDDEN", message: "You do not have access to this study's payments." },
            };
          }
          if (p.quotation) {
            totalAmount = Number(p.quotation.totalAmount) || totalAmount;
            downpaymentRequired = Number(p.quotation.downpaymentRequired) || downpaymentRequired;
            quotationId = p.quotation.id || null;
          }
        }
      }
    } catch {
      // ignore
    }

    const summary = calculateProjectBalance(
      devPayments.map((p) => ({
        amountSubmitted: p.amountSubmitted,
        paymentStatus: p.paymentStatus,
      })),
      totalAmount,
      downpaymentRequired
    );

    return {
      success: true,
      data: {
        payments: devPayments,
        summary,
        quotationId,
      },
    };
  }
}

// ─── 5. Get Pending Payments Queue (Finance Desk) ────────────────────────────

const fetchCachedFinancePaymentsQueueRaw = unstable_cache(
  async (status: string) => {
    const whereClause: { paymentStatus?: PaymentStatus | { in: PaymentStatus[] } } = {};
    if (status === "PENDING") {
      whereClause.paymentStatus = "PROOF_SUBMITTED";
    } else if (status === "VERIFIED") {
      whereClause.paymentStatus = { in: ["VERIFIED", "FULLY_PAID"] };
    } else if (status === "REJECTED") {
      whereClause.paymentStatus = "REJECTED";
    }

    return withDbTimeout(
      db.payment.findMany({
        where: whereClause,
        include: {
          proofs: true,
          project: {
            include: {
              client: {
                include: { clientProfile: true },
              },
            },
          },
          quotation: true,
        },
        orderBy: status === "PENDING" ? { createdAt: "asc" } : { updatedAt: "desc" },
      })
    );
  },
  ["cached-finance-payments-queue"],
  { revalidate: 30, tags: [CACHE_TAGS.PAYMENTS] }
);

export async function getFinancePaymentsQueue(
  filter: { status?: "PENDING" | "VERIFIED" | "REJECTED" | "ALL" } = {}
): Promise<ActionResponse<PaymentItem[]>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    };
  }

  try {
    assertCanVerifyPayment(session.user.role);
  } catch (err) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: (err as Error).message },
    };
  }

  const { status = "ALL" } = filter;

  try {
    const payments = await fetchCachedFinancePaymentsQueueRaw(status);

    const formatted: PaymentItem[] = payments.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      quotationId: p.quotationId,
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      amountSubmitted: Number(p.amountSubmitted),
      balancePaidTotal: Number(p.balancePaidTotal),
      referenceNumber: p.referenceNumber,
      paymentStatus: p.paymentStatus,
      rejectionReason: p.rejectionReason,
      verifiedBy: p.verifiedBy,
      verifiedAt: p.verifiedAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      proofs: p.proofs.map((proof) => ({
        id: proof.id,
        paymentId: proof.paymentId,
        filePath: proof.filePath,
        fileName: proof.fileName,
        fileSize: proof.fileSize,
        uploadedAt: proof.uploadedAt.toISOString(),
      })),
      project: p.project
        ? {
            id: p.project.id,
            intakeId: p.project.intakeId,
            researchTitle: p.project.researchTitle,
            masterStatus: p.project.masterStatus,
            client: {
              fullName: p.project.client.fullName,
              email: p.project.client.email,
              clientProfile: p.project.client.clientProfile
                ? { institutionSchool: p.project.client.clientProfile.institutionSchool }
                : null,
            },
          }
        : undefined,
      quotation: p.quotation
        ? {
            id: p.quotation.id,
            packageName: p.quotation.packageName,
            totalAmount: Number(p.quotation.totalAmount),
            downpaymentRequired: Number(p.quotation.downpaymentRequired),
          }
        : undefined,
    }));

    const devPayments = readPersistedDevPayments().filter((p) => {
      if (status === "PENDING") return p.paymentStatus === "PROOF_SUBMITTED";
      if (status === "VERIFIED") return p.paymentStatus === "VERIFIED" || p.paymentStatus === "FULLY_PAID";
      if (status === "REJECTED") return p.paymentStatus === "REJECTED";
      return true;
    });

    const combined = [...formatted];
    for (const dp of devPayments) {
      if (!combined.some((p) => p.id === dp.id || (p.referenceNumber && p.referenceNumber === dp.referenceNumber))) {
        if (status === "PENDING") {
          combined.unshift(dp);
        } else {
          combined.unshift(dp);
        }
      }
    }

    return { success: true, data: combined };
  } catch (err) {
    // Dev fallback
    console.warn("Using dev fallback for getFinancePaymentsQueue:", err);
    const devPayments = readPersistedDevPayments().filter((p) => {
      if (status === "PENDING") return p.paymentStatus === "PROOF_SUBMITTED";
      if (status === "VERIFIED") return p.paymentStatus === "VERIFIED" || p.paymentStatus === "FULLY_PAID";
      if (status === "REJECTED") return p.paymentStatus === "REJECTED";
      return true;
    });
    return { success: true, data: devPayments };
  }
}

export async function getPendingPaymentsQueue(): Promise<ActionResponse<PaymentItem[]>> {
  return getFinancePaymentsQueue({ status: "PENDING" });
}

// ─── 6. Get Finance Receivables Summary (Executive Desk) ──────────────────────

interface DevProjectRecord {
  id: string;
  intakeId?: string;
  researchTitle?: string;
  title?: string;
  client?: string | { fullName?: string };
  university?: string;
  masterStatus?: ProjectStatus;
  quotation?: { id?: string; totalAmount?: number; downpaymentRequired?: number };
}

export async function getFinanceReceivablesSummary(): Promise<ActionResponse<FinanceOverviewData>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    };
  }

  try {
    assertCanVerifyPayment(session.user.role);
  } catch (err) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: (err as Error).message },
    };
  }

  try {
    const projects = await withDbTimeout(
      db.project.findMany({
        include: {
          client: {
            include: { clientProfile: true },
          },
          quotations: {
            where: { status: "CLIENT_APPROVED" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          payments: {
            where: { paymentStatus: { in: ["VERIFIED", "FULLY_PAID"] } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      })
    );

    const devPayments = readPersistedDevPayments();
    let devProjects: DevProjectRecord[] = [];
    try {
      if (fs.existsSync(DEV_PROJECTS_FILE)) {
        devProjects = JSON.parse(fs.readFileSync(DEV_PROJECTS_FILE, "utf-8"));
      }
    } catch {
      // ignore
    }

    const receivables: StudyReceivableItem[] = [];
    let totalVaultCleared = 0;
    let totalOutstandingReceivables = 0;
    let totalContractVolume = 0;
    let completedStudiesCount = 0;

    // Process DB projects
    for (const p of projects) {
      const quote = p.quotations[0];
      const totalContract = quote ? Math.max(Number(quote.totalAmount), Number(quote.basePrice)) : 4650;
      const downpaymentReq = quote ? Number(quote.downpaymentRequired) : totalContract * 0.5;

      const verifiedDbTotal = p.payments.reduce((sum, pay) => sum + Number(pay.amountSubmitted), 0);
      const verifiedDevTotal = devPayments
        .filter((dp) => dp.projectId === p.id && (dp.paymentStatus === "VERIFIED" || dp.paymentStatus === "FULLY_PAID"))
        .filter((dp) => !p.payments.some((pay) => pay.id === dp.id || (pay.referenceNumber && pay.referenceNumber === dp.referenceNumber)))
        .reduce((sum, dp) => sum + dp.amountSubmitted, 0);

      const totalPaid = verifiedDbTotal + verifiedDevTotal;
      const remainingBalance = Math.max(0, totalContract - totalPaid);
      const isOverpaid = totalContract > 0 && totalPaid > totalContract;
      const overpaidAmount = isOverpaid ? totalPaid - totalContract : 0;
      const isDownpaymentCleared = totalPaid >= downpaymentReq && downpaymentReq > 0;
      const isFullyPaid = totalContract > 0 ? (totalPaid >= totalContract && !isOverpaid) : false;

      totalVaultCleared += totalPaid;
      totalOutstandingReceivables += remainingBalance;
      totalContractVolume += totalContract;
      if (isFullyPaid || p.masterStatus === "CLOSED" || p.masterStatus === "DELIVERED") {
        completedStudiesCount++;
      }

      receivables.push({
        id: p.id,
        intakeId: p.intakeId,
        researchTitle: p.researchTitle,
        clientName: p.client.fullName,
        university: p.client.clientProfile?.institutionSchool || "State University",
        masterStatus: p.masterStatus,
        totalContractAmount: totalContract,
        totalPaidAmount: totalPaid,
        remainingBalance,
        downpaymentRequired: downpaymentReq,
        isDownpaymentCleared,
        isFullyPaid,
        isOverpaid,
        overpaidAmount,
        paymentCount: p.payments.length + devPayments.filter((dp) => dp.projectId === p.id).length,
        lastPaymentAt: p.payments[0]?.createdAt.toISOString() || devPayments.find((dp) => dp.projectId === p.id)?.createdAt || null,
      });
    }

    // Include dev-only mock projects if not in DB
    for (const dp of devProjects) {
      if (!receivables.some((r) => r.id === dp.id || r.intakeId === dp.intakeId)) {
        const totalContract = Number(dp.quotation?.totalAmount) || 4650;
        const downpaymentReq = Number(dp.quotation?.downpaymentRequired) || totalContract * 0.5;
        const projDevPayments = devPayments.filter(
          (p) => p.projectId === dp.id && (p.paymentStatus === "VERIFIED" || p.paymentStatus === "FULLY_PAID")
        );
        const totalPaid = projDevPayments.reduce((sum, p) => sum + p.amountSubmitted, 0);
        const remainingBalance = Math.max(0, totalContract - totalPaid);
        const isDownpaymentCleared = totalPaid >= downpaymentReq;
        const isFullyPaid = totalContract > 0 ? totalPaid >= totalContract : false;

        totalVaultCleared += totalPaid;
        totalOutstandingReceivables += remainingBalance;
        totalContractVolume += totalContract;

        const clientName = typeof dp.client === "object" ? dp.client.fullName || "Client Lead Researcher" : dp.client || "Client Lead Researcher";

        receivables.push({
          id: dp.id,
          intakeId: dp.intakeId || dp.id,
          researchTitle: dp.researchTitle || dp.title || "Academic Statistical Consultation",
          clientName,
          university: dp.university || "Central Mindanao University",
          masterStatus: dp.masterStatus || "ACTIVE",
          totalContractAmount: totalContract,
          totalPaidAmount: totalPaid,
          remainingBalance,
          downpaymentRequired: downpaymentReq,
          isDownpaymentCleared,
          isFullyPaid,
          paymentCount: projDevPayments.length,
          lastPaymentAt: projDevPayments[0]?.createdAt || null,
        });
      }
    }

    const pendingClearancesCount =
      (await db.payment.count({ where: { paymentStatus: "PROOF_SUBMITTED" } })) +
      devPayments.filter((p) => p.paymentStatus === "PROOF_SUBMITTED").length;

    return {
      success: true,
      data: {
        kpis: {
          totalVaultCleared,
          totalOutstandingReceivables,
          totalContractVolume,
          pendingClearancesCount,
          completedStudiesCount,
        },
        receivables,
      },
    };
  } catch (err) {
    console.warn("Using dev fallback for getFinanceReceivablesSummary:", err);
    const devPayments = readPersistedDevPayments();
    let devProjects: DevProjectRecord[] = [];
    try {
      if (fs.existsSync(DEV_PROJECTS_FILE)) {
        devProjects = JSON.parse(fs.readFileSync(DEV_PROJECTS_FILE, "utf-8"));
      }
    } catch {
      // ignore
    }

    let totalVaultCleared = 0;
    let totalOutstandingReceivables = 0;
    let totalContractVolume = 0;
    let completedStudiesCount = 0;

    const receivables: StudyReceivableItem[] = devProjects.map((dp: DevProjectRecord) => {
      const totalContract = Number(dp.quotation?.totalAmount) || 4650;
      const downpaymentReq = Number(dp.quotation?.downpaymentRequired) || totalContract * 0.5;
      const projDevPayments = devPayments.filter(
        (p) => p.projectId === dp.id && (p.paymentStatus === "VERIFIED" || p.paymentStatus === "FULLY_PAID")
      );
      const totalPaid = projDevPayments.reduce((sum, p) => sum + p.amountSubmitted, 0);
      const remainingBalance = Math.max(0, totalContract - totalPaid);
      const isOverpaid = totalContract > 0 && totalPaid > totalContract;
      const overpaidAmount = isOverpaid ? totalPaid - totalContract : 0;
      const isDownpaymentCleared = totalPaid >= downpaymentReq;
      const isFullyPaid = totalContract > 0 ? (totalPaid >= totalContract && !isOverpaid) : false;

      totalVaultCleared += totalPaid;
      totalOutstandingReceivables += remainingBalance;
      totalContractVolume += totalContract;
      if (isFullyPaid) completedStudiesCount++;

      const clientName = typeof dp.client === "object" ? dp.client.fullName || "Client Lead Researcher" : dp.client || "Client Lead Researcher";

      return {
        id: dp.id,
        intakeId: dp.intakeId || dp.id,
        researchTitle: dp.researchTitle || dp.title || "Academic Statistical Consultation",
        clientName,
        university: dp.university || "Central Mindanao University",
        masterStatus: dp.masterStatus || "ACTIVE",
        totalContractAmount: totalContract,
        totalPaidAmount: totalPaid,
        remainingBalance,
        downpaymentRequired: downpaymentReq,
        isDownpaymentCleared,
        isFullyPaid,
        isOverpaid,
        overpaidAmount,
        paymentCount: projDevPayments.length,
        lastPaymentAt: projDevPayments[0]?.createdAt || null,
      };
    });

    const pendingClearancesCount = devPayments.filter((p) => p.paymentStatus === "PROOF_SUBMITTED").length;

    return {
      success: true,
      data: {
        kpis: {
          totalVaultCleared,
          totalOutstandingReceivables,
          totalContractVolume,
          pendingClearancesCount,
          completedStudiesCount,
        },
        receivables,
      },
    };
  }
}

// ─── 6. Get Payment Channels & QR Settings ──────────────────────────────────

export async function getPaymentChannels(): Promise<ActionResponse<PaymentChannelDetails[]>> {
  try {
    const channels = readPersistedPaymentChannels();
    return {
      success: true,
      data: channels,
    };
  } catch (err) {
    return {
      success: false,
      error: { code: "FETCH_ERROR", message: (err as Error).message },
    };
  }
}

// ─── 7. Update Payment Channels & QR Settings (CEO / Admin / Finance) ───────

export async function updatePaymentChannels(
  input: unknown
): Promise<ActionResponse<PaymentChannelDetails[]>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    };
  }

  // RULE_ROL_02: Only Finance Officer, Admin, or CEO
  try {
    assertCanVerifyPayment(session.user.role);
  } catch (err) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: (err as Error).message },
    };
  }

  const parsed = UpdatePaymentChannelsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid payment channel parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  try {
    const updatedChannels = parsed.data.channels as PaymentChannelDetails[];
    writePersistedPaymentChannels(updatedChannels);

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/payments");
    revalidatePath("/dashboard/client");

    return {
      success: true,
      data: updatedChannels,
    };
  } catch (err) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: (err as Error).message },
    };
  }
}
