"use server";

import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { db, withDbTimeout } from "@/lib/db";
import { assertValidStatusTransition } from "@/lib/project-rules";
import {
  assertSOWUnlocked,
  validateSignatoryName,
  buildSOWSnapshot,
  type SOWContentSnapshot,
} from "@/lib/sow-rules";
import { PACKAGES_CATALOG } from "@/lib/pricing-rules";
import {
  GenerateSOWSchema,
  SignSOWSchema,
  GenerateSupplementalSOWSchema,
  type SOWDetailItem,
  type ActionResponse,
} from "./schemas";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import type { ProjectStatus } from "@prisma/client";
import { assertStudyAccess } from "@/lib/access-control";

const DEV_SOWS_FILE = path.join(process.cwd(), ".dev-sows.json");
const DEV_PROJECTS_FILE = path.join(process.cwd(), ".dev-projects.json");
const DEV_QUOTATIONS_FILE = path.join(process.cwd(), ".dev-quotations.json");

function readPersistedDevSows(): SOWDetailItem[] {
  try {
    if (fs.existsSync(DEV_SOWS_FILE)) {
      const data = fs.readFileSync(DEV_SOWS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading dev sows:", err);
  }
  return [];
}

function writePersistedDevSows(sows: SOWDetailItem[]): void {
  try {
    fs.writeFileSync(DEV_SOWS_FILE, JSON.stringify(sows, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing dev sows:", err);
  }
}

/**
/**
 * Core internal Statement of Work generator.
 * Used during automatic generation on quotation approval and manual compile by Admin/CEO.
 */
export async function createOrUpdateSOWInternal({
  projectId,
  quotationId,
  generatedBy,
  customTerms,
}: {
  projectId: string;
  quotationId?: string;
  generatedBy: string;
  customTerms?: string;
}): Promise<ActionResponse<SOWDetailItem>> {
  try {
    const result = await withDbTimeout(
      db.$transaction(async (tx) => {
        // 1. Fetch project with client info
        const project = await tx.project.findUnique({
          where: { id: projectId },
          include: {
            client: {
              include: {
                clientProfile: true,
              },
            },
          },
        });

        if (!project) {
          throw new Error("Project record not found.");
        }

        // 2. Fetch quotation (by ID or latest accepted/sent quote for project)
        let quote;
        if (quotationId) {
          quote = await tx.quotation.findUnique({
            where: { id: quotationId },
            include: {
              lineItems: true,
            },
          });
        } else {
          quote = await tx.quotation.findFirst({
            where: {
              projectId,
              status: { in: ["CLIENT_APPROVED", "QUOTE_SENT"] },
            },
            include: {
              lineItems: true,
            },
            orderBy: { createdAt: "desc" },
          });
        }

        if (!quote || quote.projectId !== projectId) {
          throw new Error("Quotation not found or does not belong to this project.");
        }

        // 3. Check for existing SOW
        const existingSow = await tx.sOW.findFirst({
          where: { projectId, sowType: "PRIMARY" },
        });

        if (existingSow) {
          assertSOWUnlocked(existingSow.isLocked);
        }

        // 4. Build immutable content snapshot
        const addOnsList = quote.lineItems
          .filter((li) => li.itemType === "ADDON")
          .map((li) => li.itemName);

        const packageTurnaround: Record<string, number> = {
          JX_01_DATACHECK: 3,
          JX_02_START: 3,
          JX_03_CORE: 5,
          JX_04_ADVANCED: 7,
        };
        const packageDef = PACKAGES_CATALOG[quote.packageName as keyof typeof PACKAGES_CATALOG];
        const turnaroundDays = packageTurnaround[quote.packageName] || 5;

        const snapshot: SOWContentSnapshot = buildSOWSnapshot({
          client: {
            fullName: project.client.fullName,
            email: project.client.email,
            institution: project.client.clientProfile?.institutionSchool || "Independent Researcher",
            academicProgram: project.client.clientProfile?.academicProgram || "Graduate Research",
            phone: project.client.phone,
          },
          project: {
            intakeId: project.intakeId,
            researchTitle: project.researchTitle,
            researchObjectives: project.researchObjectives,
            researchQuestions: project.researchQuestions,
            hypotheses: project.hypotheses,
          },
          commercial: {
            packageName: quote.packageName,
            packageLabel: packageDef?.name || quote.packageName,
            addOns: addOnsList,
            basePrice: Number(quote.basePrice),
            totalAmount: Number(quote.totalAmount),
            downpaymentRequired: Number(quote.downpaymentRequired),
          },
          delivery: {
            turnaroundDays,
          },
          customTerms,
        });

        // 5. Create or update SOW record
        let sowRecord;
        if (existingSow) {
          sowRecord = await tx.sOW.update({
            where: { id: existingSow.id },
            data: {
              contentSnapshot: snapshot,
              packageName: quote.packageName,
              totalAmount: quote.totalAmount,
              downpaymentRequired: quote.downpaymentRequired,
              turnaroundDays,
              addOns: addOnsList,
              generatedBy,
              generatedAt: new Date(),
            },
          });
        } else {
          sowRecord = await tx.sOW.create({
            data: {
              projectId,
              sowType: "PRIMARY",
              contentSnapshot: snapshot,
              packageName: quote.packageName,
              totalAmount: quote.totalAmount,
              downpaymentRequired: quote.downpaymentRequired,
              turnaroundDays,
              addOns: addOnsList,
              generatedBy,
              isLocked: false,
            },
          });
        }

        // 6. Transition project status to SOW_PENDING if not already
        if (project.masterStatus !== "SOW_PENDING" && project.masterStatus !== "SOW_SIGNED") {
          assertValidStatusTransition(project.masterStatus, "SOW_PENDING");
          await tx.project.update({
            where: { id: projectId },
            data: { masterStatus: "SOW_PENDING" as ProjectStatus },
          });
        }

        return {
          id: sowRecord.id,
          projectId: sowRecord.projectId,
          projectIntakeId: project.intakeId,
          sowType: sowRecord.sowType as "PRIMARY" | "SUPPLEMENTAL",
          parentSowId: sowRecord.parentSowId,
          contentSnapshot: sowRecord.contentSnapshot as SOWContentSnapshot,
          packageName: sowRecord.packageName,
          totalAmount: Number(sowRecord.totalAmount),
          downpaymentRequired: Number(sowRecord.downpaymentRequired),
          turnaroundDays: sowRecord.turnaroundDays,
          addOns: sowRecord.addOns,
          isLocked: sowRecord.isLocked,
          signedByName: sowRecord.signedByName,
          signedAt: sowRecord.signedAt?.toISOString() || null,
          signedByUserId: sowRecord.signedByUserId,
          generatedBy: sowRecord.generatedBy,
          generatedAt: sowRecord.generatedAt.toISOString(),
          pdfPath: sowRecord.pdfPath,
        };
      })
    );

    revalidatePath(`/dashboard/client/projects/${projectId}`);
    revalidatePath(`/dashboard/client/projects/${projectId}/sow`);
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/admin/projects/${projectId}/sow`);
    revalidatePath(`/dashboard/admin/projects`);
    revalidatePath(`/dashboard/admin/intake`);
    revalidatePath(`/dashboard/client/projects`);

    return { success: true, data: result };
  } catch (err: unknown) {
    console.warn("Database SOW generation fallback to dev store:", (err as Error).message);

    // Development File Store Fallback
    try {
      const devProjects = fs.existsSync(DEV_PROJECTS_FILE)
        ? JSON.parse(fs.readFileSync(DEV_PROJECTS_FILE, "utf-8"))
        : [];
      const devQuotes = fs.existsSync(DEV_QUOTATIONS_FILE)
        ? JSON.parse(fs.readFileSync(DEV_QUOTATIONS_FILE, "utf-8"))
        : [];

      const proj = devProjects.find((p: { id: string }) => p.id === projectId);
      const quote = quotationId
        ? devQuotes.find((q: { id: string }) => q.id === quotationId)
        : devQuotes.find(
            (q: { projectId: string; status: string }) =>
              q.projectId === projectId &&
              (q.status === "CLIENT_APPROVED" || q.status === "QUOTE_SENT")
          );

      if (!proj) {
        return {
          success: false,
          error: { code: "NOT_FOUND", message: "Project not found in system." },
        };
      }

      if (!quote) {
        return {
          success: false,
          error: { code: "NOT_FOUND", message: "Quotation not found for this study." },
        };
      }

      const devSows = readPersistedDevSows();
      const existingIdx = devSows.findIndex(
        (s) => s.projectId === projectId && s.sowType === "PRIMARY"
      );
      const existingSow = existingIdx !== -1 ? devSows[existingIdx] : undefined;

      if (existingSow && existingSow.isLocked) {
        return {
          success: false,
          error: {
            code: "SOW_LOCKED",
            message: "This Statement of Work has already been signed.",
          },
        };
      }

      const addOnsList = Array.isArray(quote?.lineItems)
        ? quote.lineItems
            .filter((li: { itemType: string; itemName: string }) => li.itemType === "ADDON")
            .map((li: { itemType: string; itemName: string }) => li.itemName)
        : Array.isArray(quote?.addOns)
          ? quote.addOns
          : [];

      const packageKey = (quote?.packageName as keyof typeof PACKAGES_CATALOG) || "JX_03_CORE";
      const packageDef = PACKAGES_CATALOG[packageKey] || PACKAGES_CATALOG.JX_03_CORE;
      const packageTurnaround: Record<string, number> = {
        JX_01_DATACHECK: 3,
        JX_02_START: 3,
        JX_03_CORE: 5,
        JX_04_ADVANCED: 7,
      };
      const turnaroundDays = packageTurnaround[quote?.packageName || "JX_03_CORE"] || 5;

      const snapshot: SOWContentSnapshot = buildSOWSnapshot({
        client: {
          fullName: proj.client?.fullName || "Lead Researcher",
          email: proj.client?.email || "client@jaxis.dev",
          institution: proj.client?.clientProfile?.institutionSchool || "University of the Philippines",
          academicProgram: proj.client?.clientProfile?.academicProgram || "Doctor of Philosophy",
          phone: proj.client?.phone,
        },
        project: {
          intakeId: proj.intakeId,
          researchTitle: proj.researchTitle,
          researchObjectives: proj.researchObjectives,
          researchQuestions: proj.researchQuestions || "Primary empirical questions.",
          hypotheses: proj.hypotheses,
        },
        commercial: {
          packageName: quote?.packageName || "JX_03_CORE",
          packageLabel: packageDef?.name || "JX-03 Core",
          addOns: addOnsList,
          basePrice: Number(quote?.basePrice || 2500),
          totalAmount: Number(quote?.totalAmount || 2750),
          downpaymentRequired: Number(quote?.downpaymentRequired || 1375),
        },
        delivery: {
          turnaroundDays,
        },
        customTerms,
      });

      const sowItem: SOWDetailItem = {
        id: existingSow ? existingSow.id : `sow_dev_${Date.now()}`,
        projectId,
        projectIntakeId: proj.intakeId,
        sowType: "PRIMARY",
        contentSnapshot: snapshot,
        packageName: quote?.packageName || "JX_03_CORE",
        totalAmount: Number(quote?.totalAmount || 2750),
        downpaymentRequired: Number(quote?.downpaymentRequired || 1375),
        turnaroundDays,
        addOns: addOnsList,
        isLocked: false,
        generatedBy,
        generatedAt: new Date().toISOString(),
      };

      if (existingIdx !== -1) {
        devSows[existingIdx] = sowItem;
      } else {
        devSows.push(sowItem);
      }
      writePersistedDevSows(devSows);

      // Update dev project status
      proj.masterStatus = "SOW_PENDING";
      fs.writeFileSync(DEV_PROJECTS_FILE, JSON.stringify(devProjects, null, 2), "utf-8");

      revalidatePath(`/dashboard/client/projects/${projectId}`);
      revalidatePath(`/dashboard/client/projects/${projectId}/sow`);
      revalidatePath(`/dashboard/admin/projects/${projectId}`);
      revalidatePath(`/dashboard/admin/projects/${projectId}/sow`);
      revalidatePath(`/dashboard/admin/projects`);
      revalidatePath(`/dashboard/admin/intake`);
      revalidatePath(`/dashboard/client/projects`);

      return { success: true, data: sowItem };
    } catch {
      return {
        success: false,
        error: { code: "SERVER_ERROR", message: (err as Error).message || "Failed to generate SOW." },
      };
    }
  }
}

/**
 * Generate a formal Statement of Work from an accepted quotation.
 * Allowed roles: ADMIN, CEO.
 */
export async function generateSOW(
  input: unknown
): Promise<ActionResponse<SOWDetailItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    };
  }

  const role = session.user.role || "CLIENT";
  if (role !== "ADMIN" && role !== "CEO") {
    return {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Only administrators or CEO can generate Statements of Work.",
      },
    };
  }

  const parsed = GenerateSOWSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid SOW generation parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { projectId, quotationId, customTerms } = parsed.data;

  return createOrUpdateSOWInternal({
    projectId,
    quotationId,
    generatedBy: session.user.id,
    customTerms,
  });
}

/**
 * Retrieve the active Statement of Work for a project.
 */
export async function getSOWByProject(
  projectId: string
): Promise<ActionResponse<SOWDetailItem | null>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    };
  }

  const access = await assertStudyAccess(projectId, session.user);
  if (!access.hasAccess) {
    return {
      success: false,
      error: access.error || { code: "FORBIDDEN", message: "Access to this Statement of Work is restricted." },
    };
  }

  try {
    const sow = await withDbTimeout(
      db.sOW.findFirst({
        where: { projectId, sowType: "PRIMARY" },
        include: {
          project: {
            select: {
              id: true,
              intakeId: true,
              clientId: true,
            },
          },
        },
      })
    );

    if (!sow) {
      // Check dev store
      const devSows = readPersistedDevSows();
      const devSow = devSows.find((s) => s.projectId === projectId && s.sowType === "PRIMARY");
      return { success: true, data: devSow || null };
    }

    return {
      success: true,
      data: {
        id: sow.id,
        projectId: sow.projectId,
        projectIntakeId: sow.project.intakeId,
        sowType: sow.sowType as "PRIMARY" | "SUPPLEMENTAL",
        parentSowId: sow.parentSowId,
        contentSnapshot: sow.contentSnapshot as SOWContentSnapshot,
        packageName: sow.packageName,
        totalAmount: Number(sow.totalAmount),
        downpaymentRequired: Number(sow.downpaymentRequired),
        turnaroundDays: sow.turnaroundDays,
        addOns: sow.addOns,
        isLocked: sow.isLocked,
        signedByName: sow.signedByName,
        signedAt: sow.signedAt?.toISOString() || null,
        signedByUserId: sow.signedByUserId,
        generatedBy: sow.generatedBy,
        generatedAt: sow.generatedAt.toISOString(),
        pdfPath: sow.pdfPath,
      },
    };
  } catch {
    // Fallback to dev store
    const devSows = readPersistedDevSows();
    const devSow = devSows.find((s) => s.projectId === projectId && s.sowType === "PRIMARY");
    return { success: true, data: devSow || null };
  }
}

/**
 * Digitally sign the Statement of Work via typed full name.
 * Permanently locks the SOW (isLocked = true).
 */
export async function signSOW(
  input: unknown
): Promise<ActionResponse<SOWDetailItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required to sign SOW." },
    };
  }

  const parsed = SignSOWSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please provide a valid typed name and agree to terms.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { sowId, typedFullName } = parsed.data;

  try {
    const updatedSow = await withDbTimeout(
      db.$transaction(async (tx) => {
        const sow = await tx.sOW.findUnique({
          where: { id: sowId },
          include: {
            project: {
              include: {
                client: true,
              },
            },
          },
        });

        if (!sow) {
          throw new Error("Statement of Work record not found.");
        }

        // Authorization check: Only project owner or Admin can sign
        const isOwner = sow.project.clientId === session.user.id;
        const isAdmin = session.user.role === "ADMIN" || session.user.role === "CEO";
        if (!isOwner && !isAdmin) {
          throw new Error("Unauthorized: Only the Lead Researcher can execute this contract.");
        }

        // Locking check
        assertSOWUnlocked(sow.isLocked);

        // Signatory name validation against registered client name
        const registeredName = sow.project.client.fullName;
        if (!validateSignatoryName(typedFullName, registeredName)) {
          throw new Error(
            `NAME_MISMATCH: The typed signature ("${typedFullName}") does not match the registered client account name ("${registeredName}"). Please type your registered full name exactly.`
          );
        }

        const now = new Date();

        // 1. Lock the SOW record permanently
        const lockedSow = await tx.sOW.update({
          where: { id: sowId },
          data: {
            isLocked: true,
            signedByName: typedFullName.trim(),
            signedAt: now,
            signedByUserId: session.user.id,
          },
        });

        // 2. Transition Project status from SOW_PENDING to SOW_SIGNED
        assertValidStatusTransition(sow.project.masterStatus, "SOW_SIGNED");
        await tx.project.update({
          where: { id: sow.projectId },
          data: {
            masterStatus: "SOW_SIGNED" as ProjectStatus,
          },
        });

        return {
          id: lockedSow.id,
          projectId: lockedSow.projectId,
          projectIntakeId: sow.project.intakeId,
          sowType: lockedSow.sowType as "PRIMARY" | "SUPPLEMENTAL",
          parentSowId: lockedSow.parentSowId,
          contentSnapshot: lockedSow.contentSnapshot as SOWContentSnapshot,
          packageName: lockedSow.packageName,
          totalAmount: Number(lockedSow.totalAmount),
          downpaymentRequired: Number(lockedSow.downpaymentRequired),
          turnaroundDays: lockedSow.turnaroundDays,
          addOns: lockedSow.addOns,
          isLocked: lockedSow.isLocked,
          signedByName: lockedSow.signedByName,
          signedAt: lockedSow.signedAt?.toISOString() || null,
          signedByUserId: lockedSow.signedByUserId,
          generatedBy: lockedSow.generatedBy,
          generatedAt: lockedSow.generatedAt.toISOString(),
          pdfPath: lockedSow.pdfPath,
        };
      })
    );

    revalidatePath(`/dashboard/client/projects/${updatedSow.projectId}`);
    revalidatePath(`/dashboard/client/projects/${updatedSow.projectId}/sow`);
    revalidatePath(`/dashboard/admin/projects/${updatedSow.projectId}`);

    try {
      await dispatchRealtimeNotification({
        eventType: "COMMERCIAL_UPDATE",
        projectId: updatedSow.projectId,
        intakeId: updatedSow.projectIntakeId,
        title: "Contract Signed (SOW)",
        message: `Statement of Work signed by ${updatedSow.signedByName}. Project is ready for payment verification.`,
        targetRoles: ["ADMIN", "FINANCE_OFFICER"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[signSOW] Realtime notification warning:", e);
    }

    return { success: true, data: updatedSow };
  } catch (err: unknown) {
    const errorMsg = (err as Error).message;
    if (errorMsg.startsWith("NAME_MISMATCH") || errorMsg.startsWith("SOW_LOCKED")) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: errorMsg },
      };
    }

    // Dev Store Fallback
    try {
      const devSows = readPersistedDevSows();
      const sowIdx = devSows.findIndex((s) => s.id === sowId);
      const targetSow = sowIdx !== -1 ? devSows[sowIdx] : undefined;
      if (!targetSow) {
        return {
          success: false,
          error: { code: "NOT_FOUND", message: "Statement of Work not found." },
        };
      }

      if (targetSow.isLocked) {
        return {
          success: false,
          error: { code: "SOW_LOCKED", message: "Statement of Work is already locked." },
        };
      }

      const clientName = targetSow.contentSnapshot.client.fullName;
      if (!validateSignatoryName(typedFullName, clientName)) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `The typed signature ("${typedFullName}") does not match the registered client account name ("${clientName}").`,
          },
        };
      }

      targetSow.isLocked = true;
      targetSow.signedByName = typedFullName.trim();
      targetSow.signedAt = new Date().toISOString();
      targetSow.signedByUserId = session.user.id;
      writePersistedDevSows(devSows);

      // Update dev project
      const devProjects = fs.existsSync(DEV_PROJECTS_FILE)
        ? JSON.parse(fs.readFileSync(DEV_PROJECTS_FILE, "utf-8"))
        : [];
      const pIdx = devProjects.findIndex(
        (p: { id: string }) => p.id === targetSow.projectId
      );
      if (pIdx !== -1 && devProjects[pIdx]) {
        devProjects[pIdx].masterStatus = "SOW_SIGNED";
        fs.writeFileSync(DEV_PROJECTS_FILE, JSON.stringify(devProjects, null, 2), "utf-8");
      }

      try {
        await dispatchRealtimeNotification({
          eventType: "COMMERCIAL_UPDATE",
          projectId: targetSow.projectId,
          intakeId: targetSow.projectIntakeId,
          title: "Contract Signed (SOW)",
          message: `Statement of Work signed by ${targetSow.signedByName}. Project is ready for payment verification.`,
          targetRoles: ["ADMIN", "FINANCE_OFFICER"],
          includeProjectParties: true,
        });
      } catch {
        // Ignore in dev
      }

      return { success: true, data: targetSow };
    } catch {
      return {
        success: false,
        error: { code: "SERVER_ERROR", message: errorMsg || "Failed to sign SOW." },
      };
    }
  }
}

/**
 * Generate a Supplemental Statement of Work for scope expansions.
 */
export async function generateSupplementalSOW(
  input: unknown
): Promise<ActionResponse<SOWDetailItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    };
  }

  const role = session.user.role || "CLIENT";
  if (role !== "ADMIN" && role !== "CEO") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only administrators can issue supplemental SOWs." },
    };
  }

  const parsed = GenerateSupplementalSOWSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid supplemental SOW parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { projectId, quotationId, scopeChangeReason, customTerms } = parsed.data;

  // Implementation follows the same snapshot pattern with sowType: SUPPLEMENTAL
  return generateSOW({
    projectId,
    quotationId,
    customTerms: `[SUPPLEMENTAL SCOPE - REASON: ${scopeChangeReason}] ${customTerms || ""}`.trim(),
  });
}
