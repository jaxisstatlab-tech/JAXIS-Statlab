"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { db, withDbTimeout } from "@/lib/db";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache-tags";
import {
  assertCanManageQuotation,
  calculateQuotationTotals,
  validatePackageBasePrice,
  computeQuotationExpiry,
  isQuotationExpired,
  UPFRONT_PACKAGES,
  PACKAGES_CATALOG,
  ADDONS_CATALOG,
  type CommercialCatalogData,
} from "@/lib/pricing-rules";
import { assertValidStatusTransition } from "@/lib/project-rules";
import {
  sendQuotationIssuedNotification,
  sendQuotationAcceptedNotification,
  sendQuotationDeclinedNotification,
} from "./notifications";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import {
  CreateQuotationSchema,
  UpdateQuotationSchema,
  IssueQuotationSchema,
  RespondQuotationSchema,
  type QuotationDetailItem,
  type ActionResponse,
} from "./schemas";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import { type QuotationStatus, type LineItemType, type ProjectStatus, type AddOnName, Prisma } from "@prisma/client";

const DEV_QUOTATIONS_FILE = path.join(process.cwd(), ".dev-quotations.json");
const DEV_PROJECTS_FILE = path.join(process.cwd(), ".dev-projects.json");
const DEV_CATALOG_FILE = path.join(process.cwd(), ".dev-catalog.json");

export async function getCommercialCatalog(): Promise<CommercialCatalogData> {
  try {
    if (fs.existsSync(DEV_CATALOG_FILE)) {
      const data = fs.readFileSync(DEV_CATALOG_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // Fall back to defaults
  }
  return {
    packages: PACKAGES_CATALOG,
    addOns: ADDONS_CATALOG,
  };
}

export async function saveCommercialCatalog(
  data: CommercialCatalogData
): Promise<ActionResponse<CommercialCatalogData>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in as Admin or CEO." },
    };
  }

  try {
    assertCanManageQuotation(session.user.role || "CLIENT");
  } catch (err: unknown) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: (err as Error).message },
    };
  }

  try {
    fs.writeFileSync(DEV_CATALOG_FILE, JSON.stringify(data, null, 2), "utf-8");
    revalidatePath("/dashboard/admin/quotations");
    return {
      success: true,
      data,
    };
  } catch {
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to persist commercial catalog changes." },
    };
  }
}

export async function resetCommercialCatalog(): Promise<ActionResponse<CommercialCatalogData>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in." },
    };
  }

  try {
    assertCanManageQuotation(session.user.role || "CLIENT");
  } catch (err: unknown) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: (err as Error).message },
    };
  }

  try {
    if (fs.existsSync(DEV_CATALOG_FILE)) {
      fs.unlinkSync(DEV_CATALOG_FILE);
    }
    const defaultData: CommercialCatalogData = {
      packages: PACKAGES_CATALOG,
      addOns: ADDONS_CATALOG,
    };
    revalidatePath("/dashboard/admin/quotations");
    return {
      success: true,
      data: defaultData,
    };
  } catch {
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to reset catalog." },
    };
  }
}

function readPersistedDevQuotations(): QuotationDetailItem[] {
  try {
    if (fs.existsSync(DEV_QUOTATIONS_FILE)) {
      const data = fs.readFileSync(DEV_QUOTATIONS_FILE, "utf-8");
      const quotes: QuotationDetailItem[] = JSON.parse(data);
      const projects = readPersistedDevProjectsList();

      return quotes.map((q) => {
        const proj = projects.find((p) => p.id === q.projectId);
        return {
          ...q,
          projectIntakeId: q.projectIntakeId || proj?.intakeId || "JAXIS-202608-1533",
          projectTitle: q.projectTitle || proj?.researchTitle || "Research Study",
          clientName: q.clientName || proj?.client?.fullName || "Lead Researcher",
          clientEmail: q.clientEmail || proj?.client?.email || "client@jaxis.dev",
        };
      });
    }
  } catch {
    // Ignore read errors
  }
  return [];
}

function writePersistedDevQuotations(quotes: QuotationDetailItem[]): void {
  try {
    fs.writeFileSync(DEV_QUOTATIONS_FILE, JSON.stringify(quotes, null, 2), "utf-8");
  } catch {
    // Ignore write errors
  }
}

function readPersistedDevProjectsList(): ProjectDetailItem[] {
  try {
    if (fs.existsSync(DEV_PROJECTS_FILE)) {
      const data = fs.readFileSync(DEV_PROJECTS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // Ignore read errors
  }
  return [];
}

function writePersistedDevProjectsList(projects: ProjectDetailItem[]): void {
  try {
    fs.writeFileSync(DEV_PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf-8");
  } catch {
    // Ignore write errors
  }
}

/**
 * 1. Create a commercial draft proposal for a project under evaluation (Admin / CEO).
 */
export async function createQuotation(
  input: unknown
): Promise<ActionResponse<QuotationDetailItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in to create quotations." },
    };
  }

  try {
    assertCanManageQuotation(session.user.role || "CLIENT");
  } catch (err: unknown) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: (err as Error).message },
    };
  }

  const parsed = CreateQuotationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please correct the invalid fields in your proposal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { projectId, packageName, basePrice, addOns, customDownpayment, notes, expiresInDays } =
    parsed.data;

  // Validate package base price
  const priceValidation = validatePackageBasePrice(packageName, basePrice);
  if (!priceValidation.valid) {
    return {
      success: false,
      error: {
        code: "INVALID_PRICE",
        message: priceValidation.error || "Invalid base price for package.",
      },
    };
  }

  // Calculate pricing breakdown & downpayment rules (RULE_QUO_02)
  const breakdown = calculateQuotationTotals({
    packageName,
    basePrice,
    addOns,
    customDownpayment,
  });

  const expiresAtDate = computeQuotationExpiry(expiresInDays);

  try {
    const createdQuote = await withDbTimeout(
      db.$transaction(async (tx) => {
        // Mark any existing DRAFT quotes for this project as SUPERSEDED
        await tx.quotation.updateMany({
          where: {
            projectId,
            status: "DRAFT",
          },
          data: {
            status: "SUPERSEDED",
          },
        });

        // Create the new Quotation
        const quote = await tx.quotation.create({
          data: {
            projectId,
            packageName,
            basePrice: breakdown.basePrice,
            totalAmount: breakdown.totalAmount,
            downpaymentRequired: breakdown.downpaymentRequired,
            expiresAt: expiresAtDate,
            status: "DRAFT",
            notes: notes || null,
            createdBy: session.user.id,
            lineItems: {
              create: [
                {
                  itemType: "PACKAGE" as LineItemType,
                  itemName: packageName,
                  description: breakdown.packageDef.tagline,
                  amount: breakdown.basePrice,
                },
                ...breakdown.addOnsBreakdown.map((addon) => ({
                  itemType: "ADDON" as LineItemType,
                  itemName: addon.name,
                  description: addon.description || addon.definition?.tagline || null,
                  amount: addon.amount,
                })),
              ],
            },
          },
          include: {
            lineItems: true,
            project: {
              select: {
                intakeId: true,
                researchTitle: true,
                client: {
                  select: {
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        return quote;
      })
    );

    const result: QuotationDetailItem = {
      id: createdQuote.id,
      projectId: createdQuote.projectId,
      projectIntakeId: createdQuote.project.intakeId,
      projectTitle: createdQuote.project.researchTitle,
      clientName: createdQuote.project.client.fullName,
      clientEmail: createdQuote.project.client.email,
      packageName: createdQuote.packageName,
      basePrice: Number(createdQuote.basePrice),
      totalAmount: Number(createdQuote.totalAmount),
      downpaymentRequired: Number(createdQuote.downpaymentRequired),
      releaseBalance: Math.max(
        0,
        Number(createdQuote.totalAmount) - Number(createdQuote.downpaymentRequired)
      ),
      downpaymentPercentage: Math.round(
        (Number(createdQuote.downpaymentRequired) / Number(createdQuote.totalAmount)) * 100
      ),
      isUpfrontEnforced: UPFRONT_PACKAGES.includes(createdQuote.packageName),
      expiresAt: createdQuote.expiresAt.toISOString(),
      isExpired: isQuotationExpired(createdQuote.expiresAt),
      status: createdQuote.status,
      notes: createdQuote.notes,
      createdBy: createdQuote.createdBy,
      respondedAt: createdQuote.respondedAt ? createdQuote.respondedAt.toISOString() : null,
      declineReason: createdQuote.declineReason,
      createdAt: createdQuote.createdAt.toISOString(),
      updatedAt: createdQuote.updatedAt.toISOString(),
      lineItems: createdQuote.lineItems.map((li) => ({
        id: li.id,
        quotationId: li.quotationId,
        itemType: li.itemType,
        itemName: li.itemName,
        description: li.description,
        amount: Number(li.amount),
      })),
    };

    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/admin/quotations`);
    revalidatePath(`/dashboard/client/projects/${projectId}`);
    invalidateCacheTags(CACHE_TAGS.QUOTATIONS, CACHE_TAGS.PROJECTS);

    return { success: true, data: result };
  } catch (dbError: unknown) {
    console.warn("[Quotation] Database query failed, using persisted dev store fallback:", dbError);

    const devQuotes = readPersistedDevQuotations();
    const newDevQuote: QuotationDetailItem = {
      id: `quote_${Date.now()}`,
      projectId,
      packageName,
      basePrice: breakdown.basePrice,
      totalAmount: breakdown.totalAmount,
      downpaymentRequired: breakdown.downpaymentRequired,
      releaseBalance: breakdown.releaseBalance,
      downpaymentPercentage: breakdown.downpaymentPercentage,
      isUpfrontEnforced: breakdown.isUpfrontEnforced,
      expiresAt: expiresAtDate.toISOString(),
      isExpired: false,
      status: "DRAFT",
      notes: notes || null,
      createdBy: session.user.id,
      createdByName: session.user.name || "System Admin",
      respondedAt: null,
      declineReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lineItems: [
        {
          id: `li_pkg_${Date.now()}`,
          quotationId: `quote_${Date.now()}`,
          itemType: "PACKAGE" as LineItemType,
          itemName: packageName,
          description: breakdown.packageDef.tagline,
          amount: breakdown.basePrice,
        },
        ...breakdown.addOnsBreakdown.map((a, idx) => ({
          id: `li_addon_${Date.now()}_${idx}`,
          quotationId: `quote_${Date.now()}`,
          itemType: "ADDON" as LineItemType,
          itemName: a.name,
          description: a.description || a.definition?.tagline || null,
          amount: a.amount,
        })),
      ],
    };

    // Supersede other drafts
    const updatedDevQuotes = devQuotes
      .map((q) => (q.projectId === projectId && q.status === "DRAFT" ? { ...q, status: "SUPERSEDED" as QuotationStatus } : q))
      .concat(newDevQuote);

    writePersistedDevQuotations(updatedDevQuotes);

    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/admin/quotations`);

    return { success: true, data: newDevQuote };
  }
}

/**
 * 2. Update a DRAFT proposal prior to issuance (Admin / CEO).
 */
export async function updateQuotation(
  input: unknown
): Promise<ActionResponse<QuotationDetailItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in to update quotations." },
    };
  }

  try {
    assertCanManageQuotation(session.user.role || "CLIENT");
  } catch (err: unknown) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: (err as Error).message },
    };
  }

  const parsed = UpdateQuotationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please correct the invalid fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { quotationId, packageName, basePrice, addOns, customDownpayment, notes, expiresInDays } =
    parsed.data;

  // Validate price guardrails
  const priceValidation = validatePackageBasePrice(packageName, basePrice);
  if (!priceValidation.valid) {
    return {
      success: false,
      error: { code: "INVALID_PRICE", message: priceValidation.error || "Invalid base price." },
    };
  }

  const breakdown = calculateQuotationTotals({
    packageName,
    basePrice,
    addOns,
    customDownpayment,
  });

  const expiresAtDate = computeQuotationExpiry(expiresInDays);

  try {
    const updated = await withDbTimeout(
      db.$transaction(async (tx) => {
        const existing = await tx.quotation.findUnique({
          where: { id: quotationId },
        });

        if (!existing) {
          throw new Error("Quotation not found.");
        }

        if (existing.status !== "DRAFT") {
          throw new Error("Only draft quotations may be edited. Please create a revised proposal.");
        }

        // Delete old line items
        await tx.quotationLineItem.deleteMany({
          where: { quotationId },
        });

        // Update quote and create fresh line items
        const quote = await tx.quotation.update({
          where: { id: quotationId },
          data: {
            packageName,
            basePrice: breakdown.basePrice,
            totalAmount: breakdown.totalAmount,
            downpaymentRequired: breakdown.downpaymentRequired,
            expiresAt: expiresAtDate,
            notes: notes || null,
            lineItems: {
              create: [
                {
                  itemType: "PACKAGE" as LineItemType,
                  itemName: packageName,
                  description: breakdown.packageDef.tagline,
                  amount: breakdown.basePrice,
                },
                ...breakdown.addOnsBreakdown.map((addon) => ({
                  itemType: "ADDON" as LineItemType,
                  itemName: addon.name,
                  description: addon.description || addon.definition?.tagline || null,
                  amount: addon.amount,
                })),
              ],
            },
          },
          include: {
            lineItems: true,
            project: {
              select: {
                intakeId: true,
                researchTitle: true,
                client: {
                  select: { fullName: true, email: true },
                },
              },
            },
          },
        });

        return quote;
      })
    );

    const result: QuotationDetailItem = {
      id: updated.id,
      projectId: updated.projectId,
      projectIntakeId: updated.project.intakeId,
      projectTitle: updated.project.researchTitle,
      clientName: updated.project.client.fullName,
      clientEmail: updated.project.client.email,
      packageName: updated.packageName,
      basePrice: Number(updated.basePrice),
      totalAmount: Number(updated.totalAmount),
      downpaymentRequired: Number(updated.downpaymentRequired),
      releaseBalance: Math.max(0, Number(updated.totalAmount) - Number(updated.downpaymentRequired)),
      downpaymentPercentage: Math.round(
        (Number(updated.downpaymentRequired) / Number(updated.totalAmount)) * 100
      ),
      isUpfrontEnforced: UPFRONT_PACKAGES.includes(updated.packageName),
      expiresAt: updated.expiresAt.toISOString(),
      isExpired: isQuotationExpired(updated.expiresAt),
      status: updated.status,
      notes: updated.notes,
      createdBy: updated.createdBy,
      respondedAt: updated.respondedAt ? updated.respondedAt.toISOString() : null,
      declineReason: updated.declineReason,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lineItems: updated.lineItems.map((li) => ({
        id: li.id,
        quotationId: li.quotationId,
        itemType: li.itemType,
        itemName: li.itemName,
        description: li.description,
        amount: Number(li.amount),
      })),
    };

    revalidatePath(`/dashboard/admin/projects/${updated.projectId}`);
    revalidatePath(`/dashboard/admin/quotations`);
    invalidateCacheTags(CACHE_TAGS.QUOTATIONS, CACHE_TAGS.PROJECTS);
    return { success: true, data: result };
  } catch (err: unknown) {
    console.warn("[Quotation] [updateQuotation] DB error, using dev store fallback:", err);
    const devQuotes = readPersistedDevQuotations();
    const existing = devQuotes.find((q) => q.id === quotationId);
    if (existing) {
      const updatedDevQuote: QuotationDetailItem = {
        id: existing.id,
        projectId: existing.projectId,
        projectIntakeId: existing.projectIntakeId,
        projectTitle: existing.projectTitle,
        clientName: existing.clientName,
        clientEmail: existing.clientEmail,
        packageName,
        basePrice: breakdown.basePrice,
        totalAmount: breakdown.totalAmount,
        downpaymentRequired: breakdown.downpaymentRequired,
        releaseBalance: breakdown.releaseBalance,
        downpaymentPercentage: breakdown.downpaymentPercentage,
        isUpfrontEnforced: breakdown.isUpfrontEnforced,
        notes: notes !== undefined ? notes : existing.notes,
        expiresAt: computeQuotationExpiry(expiresInDays).toISOString(),
        isExpired: false,
        status: existing.status,
        createdBy: existing.createdBy,
        createdByName: existing.createdByName,
        respondedAt: existing.respondedAt,
        declineReason: existing.declineReason,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
        lineItems: [
          {
            id: `li_pkg_${Date.now()}`,
            quotationId: existing.id,
            itemType: "PACKAGE",
            itemName: packageName,
            description: `${PACKAGES_CATALOG[packageName].name} base scope`,
            amount: breakdown.basePrice,
          },
          ...addOns.map((a, i) => ({
            id: `li_add_${Date.now()}_${i}`,
            quotationId: existing.id,
            itemType: "ADDON" as LineItemType,
            itemName: a.name,
            description: ADDONS_CATALOG[a.name].name,
            amount: a.amount ?? ADDONS_CATALOG[a.name].defaultPrice,
          })),
        ],
      };
      const existingIdx = devQuotes.findIndex((q) => q.id === quotationId);
      devQuotes[existingIdx] = updatedDevQuote;
      writePersistedDevQuotations(devQuotes);

      revalidatePath(`/dashboard/admin/projects/${existing.projectId}`);
      revalidatePath(`/dashboard/admin/quotations`);
      return { success: true, data: updatedDevQuote };
    }

    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: (err as Error).message || "Failed to update quotation." },
    };
  }
}

/**
 * 3. Issue Commercial Proposal to Client -> transitions quote & project to QUOTE_SENT (Admin / CEO).
 */
export async function issueQuotation(
  input: unknown
): Promise<ActionResponse<QuotationDetailItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in to issue quotations." },
    };
  }

  try {
    assertCanManageQuotation(session.user.role || "CLIENT");
  } catch (err: unknown) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: (err as Error).message },
    };
  }

  const parsed = IssueQuotationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid issuance parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { quotationId, expiresInDays, notes } = parsed.data;
  const newExpiry = computeQuotationExpiry(expiresInDays);

  try {
    const updated = await withDbTimeout(
      db.$transaction(async (tx) => {
        const quote = await tx.quotation.findUnique({
          where: { id: quotationId },
          include: { project: true },
        });

        if (!quote) {
          throw new Error("Quotation not found.");
        }

        // Enforce valid project state transition to QUOTE_SENT
        assertValidStatusTransition(quote.project.masterStatus, "QUOTE_SENT");

        // Update Project
        await tx.project.update({
          where: { id: quote.projectId },
          data: {
            masterStatus: "QUOTE_SENT" as ProjectStatus,
            packageName: quote.packageName,
          },
        });

        // Update Quotation
        const issuedQuote = await tx.quotation.update({
          where: { id: quotationId },
          data: {
            status: "QUOTE_SENT" as QuotationStatus,
            expiresAt: newExpiry,
            notes: notes !== undefined ? notes : quote.notes,
          },
          include: {
            lineItems: true,
            project: {
              select: {
                intakeId: true,
                researchTitle: true,
                client: { select: { fullName: true, email: true } },
              },
            },
          },
        });

        return issuedQuote;
      })
    );

    const result: QuotationDetailItem = {
      id: updated.id,
      projectId: updated.projectId,
      projectIntakeId: updated.project.intakeId,
      projectTitle: updated.project.researchTitle,
      clientName: updated.project.client.fullName,
      clientEmail: updated.project.client.email,
      packageName: updated.packageName,
      basePrice: Number(updated.basePrice),
      totalAmount: Number(updated.totalAmount),
      downpaymentRequired: Number(updated.downpaymentRequired),
      releaseBalance: Math.max(0, Number(updated.totalAmount) - Number(updated.downpaymentRequired)),
      downpaymentPercentage: Math.round(
        (Number(updated.downpaymentRequired) / Number(updated.totalAmount)) * 100
      ),
      isUpfrontEnforced: UPFRONT_PACKAGES.includes(updated.packageName),
      expiresAt: updated.expiresAt.toISOString(),
      isExpired: isQuotationExpired(updated.expiresAt),
      status: updated.status,
      notes: updated.notes,
      createdBy: updated.createdBy,
      respondedAt: updated.respondedAt ? updated.respondedAt.toISOString() : null,
      declineReason: updated.declineReason,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lineItems: updated.lineItems.map((li) => ({
        id: li.id,
        quotationId: li.quotationId,
        itemType: li.itemType,
        itemName: li.itemName,
        description: li.description,
        amount: Number(li.amount),
      })),
    };

    revalidatePath(`/dashboard/admin/projects/${updated.projectId}`);
    revalidatePath(`/dashboard/admin/quotations`);
    revalidatePath(`/dashboard/client/projects/${updated.projectId}`);
    revalidatePath(`/dashboard/client/projects/${updated.projectId}/quote`);
    invalidateCacheTags(CACHE_TAGS.QUOTATIONS, CACHE_TAGS.PROJECTS);

    // Dispatch email notification to client
    await sendQuotationIssuedNotification({
      quotationId: result.id,
      intakeId: result.projectIntakeId || "Study",
      projectTitle: result.projectTitle || "Research Study",
      clientEmail: result.clientEmail || "client@jaxis.dev",
      clientName: result.clientName || "Lead Researcher",
      packageName: result.packageName,
      totalAmount: result.totalAmount,
      downpaymentRequired: result.downpaymentRequired,
      expiresAt: result.expiresAt,
    });

    try {
      await dispatchRealtimeNotification({
        eventType: "COMMERCIAL_UPDATE",
        projectId: result.projectId,
        intakeId: result.projectIntakeId || undefined,
        title: "Quotation Issued",
        message: `Commercial quotation issued for ${result.projectTitle || "study"} (${result.packageName}). Total: ₱${result.totalAmount.toLocaleString()}.`,
        targetRoles: ["ADMIN"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[issueQuotation] Realtime dispatch warning:", e);
    }

    return { success: true, data: result };
  } catch (err: unknown) {
    console.warn("[Quotation] [issueQuotation] DB error, using dev store fallback:", err);
    const devQuotes = readPersistedDevQuotations();
    const existing = devQuotes.find((q) => q.id === quotationId);
    if (existing) {
      const issuedDevQuote: QuotationDetailItem = {
        id: existing.id,
        projectId: existing.projectId,
        projectIntakeId: existing.projectIntakeId,
        projectTitle: existing.projectTitle,
        clientName: existing.clientName,
        clientEmail: existing.clientEmail,
        packageName: existing.packageName,
        basePrice: existing.basePrice,
        totalAmount: existing.totalAmount,
        downpaymentRequired: existing.downpaymentRequired,
        releaseBalance: existing.releaseBalance,
        downpaymentPercentage: existing.downpaymentPercentage,
        isUpfrontEnforced: existing.isUpfrontEnforced,
        status: "QUOTE_SENT",
        expiresAt: newExpiry.toISOString(),
        isExpired: false,
        notes: notes !== undefined ? notes : existing.notes,
        createdBy: existing.createdBy,
        createdByName: existing.createdByName,
        respondedAt: null,
        declineReason: null,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
        lineItems: existing.lineItems,
      };
      const existingIdx = devQuotes.findIndex((q) => q.id === quotationId);
      devQuotes[existingIdx] = issuedDevQuote;
      writePersistedDevQuotations(devQuotes);

      // Update project in dev store
      const devProjects = readPersistedDevProjectsList();
      const projIdx = devProjects.findIndex((p) => p.id === existing.projectId);
      if (projIdx >= 0 && devProjects[projIdx]) {
        const p = devProjects[projIdx];
        if (p) {
          p.masterStatus = "QUOTE_SENT";
          p.packageName = existing.packageName;
          writePersistedDevProjectsList(devProjects);
        }
      }

      revalidatePath(`/dashboard/admin/projects/${existing.projectId}`);
      revalidatePath(`/dashboard/admin/quotations`);
      revalidatePath(`/dashboard/client/projects/${existing.projectId}`);
      revalidatePath(`/dashboard/client/projects/${existing.projectId}/quote`);

      // Dispatch notification stub in dev fallback
      await sendQuotationIssuedNotification({
        quotationId: issuedDevQuote.id,
        intakeId: issuedDevQuote.projectIntakeId || "Study",
        projectTitle: issuedDevQuote.projectTitle || "Research Study",
        clientEmail: issuedDevQuote.clientEmail || "client@jaxis.dev",
        clientName: issuedDevQuote.clientName || "Lead Researcher",
        packageName: issuedDevQuote.packageName,
        totalAmount: issuedDevQuote.totalAmount,
        downpaymentRequired: issuedDevQuote.downpaymentRequired,
        expiresAt: issuedDevQuote.expiresAt,
      });

      try {
        await dispatchRealtimeNotification({
          eventType: "COMMERCIAL_UPDATE",
          projectId: issuedDevQuote.projectId,
          intakeId: issuedDevQuote.projectIntakeId || undefined,
          title: "Quotation Issued",
          message: `Commercial quotation issued for ${issuedDevQuote.projectTitle || "study"} (${issuedDevQuote.packageName}). Total: ₱${issuedDevQuote.totalAmount.toLocaleString()}.`,
          targetRoles: ["ADMIN"],
          includeProjectParties: true,
        });
      } catch {
        // Ignore in dev
      }

      return { success: true, data: issuedDevQuote };
    }

    return {
      success: false,
      error: { code: "ISSUANCE_FAILED", message: (err as Error).message || "Failed to issue quote." },
    };
  }
}

/**
 * 4. Respond to Commercial Proposal (Client accepts or declines).
 * - Accept: transitions quote to CLIENT_APPROVED and project to SOW_PENDING
 * - Decline: transitions quote to QUOTE_DECLINED and project to QUOTE_DECLINED
 */
export async function respondQuotation(
  input: unknown
): Promise<ActionResponse<QuotationDetailItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in to respond to a quotation." },
    };
  }

  const parsed = RespondQuotationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid response format.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { quotationId, decision, declineReason, selectedAddOnCodes } = parsed.data;

  try {
    const updated = await withDbTimeout(
      db.$transaction(
        async (tx) => {
          const quote = await tx.quotation.findUnique({
            where: { id: quotationId },
            include: { project: true },
          });

          if (!quote) {
            throw new Error("Quotation not found.");
          }

          // Role check: Only the project owner or Admin can accept/decline
          const isOwner = quote.project.clientId === session.user.id;
          const isAdmin = session.user.role === "ADMIN" || session.user.role === "CEO";
          if (!isOwner && !isAdmin) {
            throw new Error("Unauthorized: You can only respond to quotations for your own studies.");
          }

          if (quote.status !== "QUOTE_SENT") {
            throw new Error(`This quotation is not open for response (Current status: ${quote.status}).`);
          }

          if (isQuotationExpired(quote.expiresAt)) {
            await tx.quotation.update({
              where: { id: quotationId },
              data: { status: "QUOTE_EXPIRED" },
            });
            throw new Error("This quotation has expired. Please request a revised proposal from JAXIS.");
          }

          const now = new Date();

          if (decision === "ACCEPT") {
            // Verify status transition from QUOTE_SENT -> CLIENT_APPROVED
            assertValidStatusTransition(quote.project.masterStatus, "CLIENT_APPROVED");

            let finalTotal = quote.totalAmount;
            let finalDownpayment = quote.downpaymentRequired;

            // If client customized add-on selection, recalculate totals and update line items
            if (selectedAddOnCodes !== undefined) {
              const addOnsList = selectedAddOnCodes.map((code) => {
                const def = ADDONS_CATALOG[code as AddOnName];
                return {
                  name: code as AddOnName,
                  amount: def ? def.defaultPrice : 0,
                  description: def ? def.tagline : undefined,
                };
              });

              const breakdown = calculateQuotationTotals({
                packageName: quote.packageName,
                basePrice: Number(quote.basePrice),
                addOns: addOnsList,
              });

              finalTotal = new Prisma.Decimal(breakdown.totalAmount);
              finalDownpayment = new Prisma.Decimal(breakdown.downpaymentRequired);

              // Delete prior ADDON line items
              await tx.quotationLineItem.deleteMany({
                where: {
                  quotationId,
                  itemType: "ADDON",
                },
              });

              // Insert updated client-selected ADDON line items
              if (addOnsList.length > 0) {
                await tx.quotationLineItem.createMany({
                  data: addOnsList.map((a) => ({
                    quotationId,
                    itemType: "ADDON" as LineItemType,
                    itemName: a.name,
                    description: a.description || ADDONS_CATALOG[a.name]?.name,
                    amount: a.amount,
                  })),
                });
              }
            }

            // Update Project
            await tx.project.update({
              where: { id: quote.projectId },
              data: {
                masterStatus: "CLIENT_APPROVED" as ProjectStatus,
              },
            });

            // Update Quotation
            const approvedQuote = await tx.quotation.update({
              where: { id: quotationId },
              data: {
                status: "CLIENT_APPROVED" as QuotationStatus,
                totalAmount: finalTotal,
                downpaymentRequired: finalDownpayment,
                respondedAt: now,
              },
              include: {
                lineItems: true,
                project: {
                  select: {
                    intakeId: true,
                    researchTitle: true,
                    client: { select: { fullName: true, email: true } },
                  },
                },
              },
            });

            return approvedQuote;
          } else {
            // Decline path: transition project back to UNDER_EVALUATION for Admin review/revision
            assertValidStatusTransition(quote.project.masterStatus, "UNDER_EVALUATION");

            await tx.project.update({
              where: { id: quote.projectId },
              data: {
                masterStatus: "UNDER_EVALUATION" as ProjectStatus,
              },
            });

            const declinedQuote = await tx.quotation.update({
              where: { id: quotationId },
              data: {
                status: "QUOTE_DECLINED" as QuotationStatus,
                respondedAt: now,
                declineReason: declineReason || "Declined by researcher.",
              },
              include: {
                lineItems: true,
                project: {
                  select: {
                    intakeId: true,
                    researchTitle: true,
                    client: { select: { fullName: true, email: true } },
                  },
                },
              },
            });

            return declinedQuote;
          }
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      ),
      35000
    );

    const result: QuotationDetailItem = {
      id: updated.id,
      projectId: updated.projectId,
      projectIntakeId: updated.project.intakeId,
      projectTitle: updated.project.researchTitle,
      clientName: updated.project.client.fullName,
      clientEmail: updated.project.client.email,
      packageName: updated.packageName,
      basePrice: Number(updated.basePrice),
      totalAmount: Number(updated.totalAmount),
      downpaymentRequired: Number(updated.downpaymentRequired),
      releaseBalance: Math.max(0, Number(updated.totalAmount) - Number(updated.downpaymentRequired)),
      downpaymentPercentage: Math.round(
        (Number(updated.downpaymentRequired) / Number(updated.totalAmount)) * 100
      ),
      isUpfrontEnforced: UPFRONT_PACKAGES.includes(updated.packageName),
      expiresAt: updated.expiresAt.toISOString(),
      isExpired: isQuotationExpired(updated.expiresAt),
      status: updated.status,
      notes: updated.notes,
      createdBy: updated.createdBy,
      respondedAt: updated.respondedAt ? updated.respondedAt.toISOString() : null,
      declineReason: updated.declineReason,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lineItems: updated.lineItems.map((li) => ({
        id: li.id,
        quotationId: li.quotationId,
        itemType: li.itemType,
        itemName: li.itemName,
        description: li.description,
        amount: Number(li.amount),
      })),
    };

    revalidatePath(`/dashboard/admin/projects/${updated.projectId}`);
    revalidatePath(`/dashboard/admin/quotations`);
    revalidatePath(`/dashboard/client/projects/${updated.projectId}`);
    revalidatePath(`/dashboard/client/projects/${updated.projectId}/quote`);
    invalidateCacheTags(CACHE_TAGS.QUOTATIONS, CACHE_TAGS.PROJECTS);

    // Note: SOW is intentionally drafted and compiled by Operations Admin (Module 06)
    if (decision === "ACCEPT") {
      await sendQuotationAcceptedNotification({
        quotationId: result.id,
        intakeId: result.projectIntakeId || "Study",
        projectTitle: result.projectTitle || "Research Study",
        clientEmail: result.clientEmail || "client@jaxis.dev",
        clientName: result.clientName || "Lead Researcher",
        totalAmount: result.totalAmount,
      });
    } else {
      await sendQuotationDeclinedNotification({
        quotationId: result.id,
        intakeId: result.projectIntakeId || "Study",
        projectTitle: result.projectTitle || "Research Study",
        clientEmail: result.clientEmail || "client@jaxis.dev",
        clientName: result.clientName || "Lead Researcher",
        reason: declineReason,
      });
    }

    try {
      const isAccepted = decision === "ACCEPT";
      await dispatchRealtimeNotification({
        eventType: "COMMERCIAL_UPDATE",
        projectId: result.projectId,
        intakeId: result.projectIntakeId || undefined,
        title: isAccepted ? "Quotation Accepted" : "Quotation Declined",
        message: isAccepted
          ? `Lead Researcher accepted proposal for ${result.projectTitle || "study"}. SOW is now ready.`
          : `Lead Researcher requested proposal revision: ${declineReason || "No specific feedback"}`,
        targetRoles: ["ADMIN", "FINANCE_OFFICER"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[respondQuotation] Realtime dispatch warning:", e);
    }

    return { success: true, data: result };
  } catch (err: unknown) {
    console.warn("[Quotation] [respondQuotation] DB error, using dev store fallback:", err);
    const devQuotes = readPersistedDevQuotations();
    const existing = devQuotes.find((q) => q.id === quotationId);
    if (existing) {
      const now = new Date();
      const isAccept = decision === "ACCEPT";

      let devTotal = existing.totalAmount;
      let devDownpayment = existing.downpaymentRequired;
      let devLineItems = existing.lineItems;

      if (isAccept && selectedAddOnCodes !== undefined) {
        const baseItems = existing.lineItems.filter((li) => li.itemType === "PACKAGE");
        const addOnsList = selectedAddOnCodes.map((code) => {
          const def = ADDONS_CATALOG[code as AddOnName];
          return {
            name: code as AddOnName,
            amount: def ? def.defaultPrice : 0,
            description: def ? def.tagline : undefined,
          };
        });
        const breakdown = calculateQuotationTotals({
          packageName: existing.packageName,
          basePrice: existing.basePrice,
          addOns: addOnsList,
        });
        devTotal = breakdown.totalAmount;
        devDownpayment = breakdown.downpaymentRequired;
        const newAddonLineItems = addOnsList.map((a, idx) => ({
          id: `li-addon-${Date.now()}-${idx}`,
          quotationId: existing.id,
          itemType: "ADDON" as const,
          itemName: a.name,
          description: a.description || ADDONS_CATALOG[a.name]?.name,
          amount: a.amount,
        }));
        devLineItems = [...baseItems, ...newAddonLineItems];
      }

      const respondedQuote: QuotationDetailItem = {
        id: existing.id,
        projectId: existing.projectId,
        projectIntakeId: existing.projectIntakeId,
        projectTitle: existing.projectTitle,
        clientName: existing.clientName,
        clientEmail: existing.clientEmail,
        packageName: existing.packageName,
        basePrice: existing.basePrice,
        totalAmount: devTotal,
        downpaymentRequired: devDownpayment,
        releaseBalance: Math.max(0, devTotal - devDownpayment),
        downpaymentPercentage: devTotal > 0 ? Math.round((devDownpayment / devTotal) * 100) : 50,
        isUpfrontEnforced: existing.isUpfrontEnforced,
        expiresAt: existing.expiresAt,
        isExpired: existing.isExpired,
        status: isAccept ? "CLIENT_APPROVED" : "QUOTE_DECLINED",
        notes: existing.notes,
        createdBy: existing.createdBy,
        createdByName: existing.createdByName,
        respondedAt: now.toISOString(),
        declineReason: !isAccept ? (declineReason || "Declined by researcher.") : null,
        createdAt: existing.createdAt,
        updatedAt: now.toISOString(),
        lineItems: devLineItems,
      };
      const existingIdx = devQuotes.findIndex((q) => q.id === quotationId);
      devQuotes[existingIdx] = respondedQuote;
      writePersistedDevQuotations(devQuotes);

      // Update project in dev store
      const devProjects = readPersistedDevProjectsList();
      const projIdx = devProjects.findIndex((p) => p.id === existing.projectId);
      if (projIdx >= 0 && devProjects[projIdx]) {
        const p = devProjects[projIdx];
        if (p) {
          p.masterStatus = isAccept ? "CLIENT_APPROVED" : "UNDER_EVALUATION";
          writePersistedDevProjectsList(devProjects);
        }
      }

      // Note: SOW is intentionally compiled by Operations Admin (Module 06)
      revalidatePath(`/dashboard/admin/projects/${existing.projectId}`);
      revalidatePath(`/dashboard/admin/quotations`);
      revalidatePath(`/dashboard/client/projects/${existing.projectId}`);
      revalidatePath(`/dashboard/client/projects/${existing.projectId}/quote`);

      // Dispatch decision notification in dev fallback
      if (isAccept) {
        await sendQuotationAcceptedNotification({
          quotationId: respondedQuote.id,
          intakeId: respondedQuote.projectIntakeId || "Study",
          projectTitle: respondedQuote.projectTitle || "Research Study",
          clientEmail: respondedQuote.clientEmail || "client@jaxis.dev",
          clientName: respondedQuote.clientName || "Lead Researcher",
          totalAmount: respondedQuote.totalAmount,
        });
      } else {
        await sendQuotationDeclinedNotification({
          quotationId: respondedQuote.id,
          intakeId: respondedQuote.projectIntakeId || "Study",
          projectTitle: respondedQuote.projectTitle || "Research Study",
          clientEmail: respondedQuote.clientEmail || "client@jaxis.dev",
          clientName: respondedQuote.clientName || "Lead Researcher",
          reason: declineReason,
        });
      }

      try {
        await dispatchRealtimeNotification({
          eventType: "COMMERCIAL_UPDATE",
          projectId: respondedQuote.projectId,
          intakeId: respondedQuote.projectIntakeId || undefined,
          title: isAccept ? "Quotation Accepted" : "Quotation Declined",
          message: isAccept
            ? `Lead Researcher accepted proposal for ${respondedQuote.projectTitle || "study"}. SOW is now ready.`
            : `Lead Researcher requested proposal revision: ${declineReason || "No specific feedback"}`,
          targetRoles: ["ADMIN", "FINANCE_OFFICER"],
          includeProjectParties: true,
        });
      } catch {
        // Ignore
      }

      return { success: true, data: respondedQuote };
    }

    return {
      success: false,
      error: { code: "RESPONSE_FAILED", message: (err as Error).message || "Failed to process decision." },
    };
  }
}

/**
 * 5. Fetch active or latest quotation for a project (Client & Admin with selective projections).
 */
export async function getQuotationByProject(
  projectId: string
): Promise<QuotationDetailItem | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  try {
    const quote = await withDbTimeout(
      db.quotation.findFirst({
        where: {
          projectId,
          status: { in: ["QUOTE_SENT", "CLIENT_APPROVED", "DRAFT", "QUOTE_DECLINED", "QUOTE_EXPIRED"] },
        },
        orderBy: { createdAt: "desc" },
        include: {
          lineItems: true,
          project: {
            select: {
              intakeId: true,
              researchTitle: true,
              clientId: true,
              client: { select: { fullName: true, email: true } },
            },
          },
        },
      })
    );

    if (!quote) {
      // Check dev store
      const devQuotes = readPersistedDevQuotations();
      const match = devQuotes.find((q) => q.projectId === projectId);
      return match || null;
    }

    // Role security check
    const isOwner = quote.project.clientId === session.user.id;
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "CEO";
    if (!isOwner && !isAdmin) {
      return null;
    }

    return {
      id: quote.id,
      projectId: quote.projectId,
      projectIntakeId: quote.project.intakeId,
      projectTitle: quote.project.researchTitle,
      clientName: quote.project.client.fullName,
      clientEmail: quote.project.client.email,
      packageName: quote.packageName,
      basePrice: Number(quote.basePrice),
      totalAmount: Number(quote.totalAmount),
      downpaymentRequired: Number(quote.downpaymentRequired),
      releaseBalance: Math.max(0, Number(quote.totalAmount) - Number(quote.downpaymentRequired)),
      downpaymentPercentage: Math.round(
        (Number(quote.downpaymentRequired) / Number(quote.totalAmount)) * 100
      ),
      isUpfrontEnforced: UPFRONT_PACKAGES.includes(quote.packageName),
      expiresAt: quote.expiresAt.toISOString(),
      isExpired: isQuotationExpired(quote.expiresAt),
      status: quote.status,
      notes: quote.notes,
      createdBy: quote.createdBy,
      respondedAt: quote.respondedAt ? quote.respondedAt.toISOString() : null,
      declineReason: quote.declineReason,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
      lineItems: quote.lineItems.map((li) => ({
        id: li.id,
        quotationId: li.quotationId,
        itemType: li.itemType,
        itemName: li.itemName,
        description: li.description,
        amount: Number(li.amount),
      })),
    };
  } catch (err: unknown) {
    console.warn("[Quotation] getQuotationByProject db error, using dev store fallback:", err);
    const devQuotes = readPersistedDevQuotations();
    const match = devQuotes.find((q) => q.projectId === projectId);
    return match || null;
  }
}

/**
 * 6. Fetch Admin Quotations Roster across all active studies.
 */
const fetchCachedQuotationsRoster = unstable_cache(
  async () => {
    return withDbTimeout(
      db.quotation.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          lineItems: true,
          project: {
            select: {
              intakeId: true,
              researchTitle: true,
              client: { select: { fullName: true, email: true } },
            },
          },
        },
      })
    );
  },
  ["cached-quotations-roster"],
  { revalidate: 30, tags: [CACHE_TAGS.QUOTATIONS] }
);

export async function getQuotationsRoster(): Promise<QuotationDetailItem[]> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "CEO")) {
    return [];
  }

  try {
    const quotes = await fetchCachedQuotationsRoster();

    return quotes.map((quote) => ({
      id: quote.id,
      projectId: quote.projectId,
      projectIntakeId: quote.project.intakeId,
      projectTitle: quote.project.researchTitle,
      clientName: quote.project.client.fullName,
      clientEmail: quote.project.client.email,
      packageName: quote.packageName,
      basePrice: Number(quote.basePrice),
      totalAmount: Number(quote.totalAmount),
      downpaymentRequired: Number(quote.downpaymentRequired),
      releaseBalance: Math.max(0, Number(quote.totalAmount) - Number(quote.downpaymentRequired)),
      downpaymentPercentage: Math.round(
        (Number(quote.downpaymentRequired) / Number(quote.totalAmount)) * 100
      ),
      isUpfrontEnforced: UPFRONT_PACKAGES.includes(quote.packageName),
      expiresAt: quote.expiresAt.toISOString(),
      isExpired: isQuotationExpired(quote.expiresAt),
      status: quote.status,
      notes: quote.notes,
      createdBy: quote.createdBy,
      respondedAt: quote.respondedAt ? quote.respondedAt.toISOString() : null,
      declineReason: quote.declineReason,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
      lineItems: quote.lineItems.map((li) => ({
        id: li.id,
        quotationId: li.quotationId,
        itemType: li.itemType,
        itemName: li.itemName,
        description: li.description,
        amount: Number(li.amount),
      })),
    }));
  } catch (err: unknown) {
    console.warn("[Quotation] getQuotationsRoster db error, using dev store fallback:", err);
    return readPersistedDevQuotations();
  }
}

export async function getQuotationsDirectory() {
  return getQuotationsRoster();
}
