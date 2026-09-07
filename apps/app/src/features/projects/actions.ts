"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { db, withDbTimeout } from "@/lib/db";
import { invalidateCacheTags, CACHE_TAGS } from "@/lib/cache-tags";
import { sendEmail } from "@/lib/email";
import { assertValidStatusTransition, generateIntakeId } from "@/lib/project-rules";
import { calculateProjectBalance } from "@/lib/payment-rules";
import { getClientProfile } from "@/features/client-profile/actions";
import {
  CreateProjectSchema,
  UpdateProjectStatusSchema,
  RequestMissingInfoSchema,
  ProjectFilterSchema,
  type ProjectDetailItem,
  type ProjectFileItem,
  type ActionResponse,
} from "./schemas";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import type { AuditTelemetryEvent } from "@/types/project";
import type { ProjectStatus, FileCategory, Prisma } from "@prisma/client";

const DEV_PROJECTS_FILE = path.join(process.cwd(), ".dev-projects.json");
const DEV_PAYMENTS_FILE = path.join(process.cwd(), "dev_data", "payments.json");

interface PersistedDevPaymentRecord {
  id: string;
  projectId: string;
  paymentStatus: string;
  createdAt: string;
}

function readPersistedDevPayments(): PersistedDevPaymentRecord[] {
  try {
    if (fs.existsSync(DEV_PAYMENTS_FILE)) {
      const data = fs.readFileSync(DEV_PAYMENTS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // Ignore read errors
  }
  return [];
}

function readPersistedDevProjects(): ProjectDetailItem[] {
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

function writePersistedDevProjects(projects: ProjectDetailItem[]): void {
  try {
    fs.writeFileSync(DEV_PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf-8");
  } catch {
    // Ignore write errors
  }
}

/**
 * Unified project cache invalidation & path revalidation.
 * Evicts in-memory server cache tags and triggers Next.js path updates.
 */
function revalidateProjectCaches(projectId?: string): void {
  invalidateCacheTags(CACHE_TAGS.PROJECTS);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/client");
  revalidatePath("/dashboard/client/projects");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/intake");
  revalidatePath("/dashboard/admin/quotations");
  if (projectId) {
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/client/projects/${projectId}`);
  }
}

/**
 * Canonical Project Detail Select projection.
 * Eliminates duplication and ensures consistent retrieval of relations.
 */
const PROJECT_DETAIL_SELECT = {
  id: true,
  intakeId: true,
  clientId: true,
  researchTitle: true,
  researchQuestions: true,
  researchObjectives: true,
  hypotheses: true,
  deadlineRequested: true,
  chapters13: true,
  questionnaire: true,
  masterStatus: true,
  packageName: true,
  missingInfoReason: true,
  deliveredAt: true,
  filesPurgeAt: true,
  filesPurged: true,
  hasActiveDispute: true,
  hasPendingRefund: true,
  createdAt: true,
  updatedAt: true,
  client: {
    select: {
      id: true,
      fullName: true,
      email: true,
      clientProfile: {
        select: {
          institutionSchool: true,
          academicProgram: true,
          contactNumber: true,
          region: true,
        },
      },
    },
  },
  files: {
    select: {
      id: true,
      projectId: true,
      fileName: true,
      filePath: true,
      fileType: true,
      fileCategory: true,
      uploadedAt: true,
    },
  },
} as const satisfies Prisma.ProjectSelect;

/**
 * 1. Create a new research project intake submission.
 * Enforces client profile completion gate (INT-F04 / CLT-F01).
 */
export async function createProject(
  input: unknown
): Promise<ActionResponse<ProjectDetailItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in to submit a project." },
    };
  }

  // 1. Concurrently fetch client profile gate and resolve DB user
  const [profile, userInDb] = await Promise.all([
    getClientProfile(),
    withDbTimeout(
      db.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      })
    ).catch((userResolveErr) => {
      console.warn("[createProject] User ID resolution warning:", userResolveErr);
      return null;
    }),
  ]);

  // Enforce server-side profile gate
  if (!profile || !profile.institutionSchool || !profile.contactNumber) {
    return {
      success: false,
      error: {
        code: "PROFILE_INCOMPLETE",
        message: "You must complete your institutional profile before submitting project intake requests.",
      },
    };
  }

  // Resolve valid user in DB (heal if session has mismatched or dev ID)
  let resolvedUserId = session.user.id;
  if (!userInDb && session.user.email) {
    try {
      const userByEmail = await withDbTimeout(
        db.user.findUnique({
          where: { email: session.user.email.toLowerCase().trim() },
          select: { id: true },
        })
      );
      if (userByEmail) {
        resolvedUserId = userByEmail.id;
      }
    } catch (userResolveErr) {
      console.warn("[createProject] User email resolution warning:", userResolveErr);
    }
  }

  // Ensure client profile is safely stored in PostgreSQL if it was only mirrored in cookies
  try {
    const existingDbProfile = await withDbTimeout(
      db.clientProfile.findUnique({
        where: { userId: resolvedUserId },
      })
    );
    if (!existingDbProfile && profile.institutionSchool && profile.contactNumber) {
      await withDbTimeout(
        db.clientProfile.upsert({
          where: { userId: resolvedUserId },
          update: {
            institutionSchool: profile.institutionSchool,
            academicProgram: profile.academicProgram || "General Program",
            contactNumber: profile.contactNumber,
            region: profile.region || "National Capital Region (NCR)",
          },
          create: {
            userId: resolvedUserId,
            institutionSchool: profile.institutionSchool,
            academicProgram: profile.academicProgram || "General Program",
            contactNumber: profile.contactNumber,
            region: profile.region || "National Capital Region (NCR)",
          },
        })
      );
    }
  } catch (syncErr) {
    console.warn("[createProject] Profile persistence sync warning:", syncErr);
  }

  const parsed = CreateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please correct the invalid fields in your submission.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const {
    researchTitle,
    researchQuestions,
    researchObjectives,
    hypotheses,
    deadlineRequested,
    chapters13,
    questionnaire,
    files,
  } = parsed.data;

  const intakeId = generateIntakeId();
  const deadlineDate = new Date(deadlineRequested);

  // Idempotency: prevent rapid duplicate submissions (within 15 seconds for same client and title)
  try {
    const recentDuplicate = await withDbTimeout(
      db.project.findFirst({
        where: {
          clientId: resolvedUserId,
          researchTitle: researchTitle.trim(),
          createdAt: { gte: new Date(Date.now() - 15000) },
        },
        select: PROJECT_DETAIL_SELECT,
      })
    );
    if (recentDuplicate) {
      return {
        success: true,
        data: recentDuplicate as unknown as ProjectDetailItem,
      };
    }
  } catch (dupCheckErr) {
    console.warn("[createProject] Idempotency duplicate check warning:", dupCheckErr);
  }

  let project;
  try {
    project = await withDbTimeout(
      db.project.create({
        data: {
          intakeId,
          clientId: resolvedUserId,
          researchTitle: researchTitle.trim(),
          researchQuestions: researchQuestions.trim(),
          researchObjectives: researchObjectives.trim(),
          hypotheses: hypotheses?.trim() || null,
          deadlineRequested: deadlineDate,
          chapters13: chapters13?.trim() || null,
          questionnaire: questionnaire?.trim() || null,
          masterStatus: "NEW_REQUEST",
          files: files?.length
            ? {
                create: files.map((f) => ({
                  fileName: f.fileName,
                  filePath: f.filePath,
                  fileType: f.fileType,
                  fileCategory: f.fileCategory,
                })),
              }
            : undefined,
        },
        select: PROJECT_DETAIL_SELECT,
      })
    );
  } catch (dbError) {
    console.error("[createProject] Database project creation error:", dbError);
    return {
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message:
          (dbError as Error)?.message ||
          "Could not save research study to database. Please check your connection and try again.",
      },
    };
  }

  // ── 1. Record Permanent Audit Log ──
  try {
    await db.auditLog.create({
      data: {
        projectId: project.id,
        actorId: session.user.id,
        actorRole: "CLIENT",
        action: "INTAKE_SUBMITTED",
        newValue: "NEW_REQUEST",
        reason: "Client submitted new research study specifications",
        metadata: {
          intakeId: project.intakeId,
          researchTitle: project.researchTitle,
          deadlineRequested: deadlineDate.toISOString(),
          fileCount: files?.length || 0,
        },
      },
    });
  } catch (auditErr) {
    console.warn("[createProject] Could not record audit log:", auditErr);
  }

  // ── 3. Dispatch Email Notification to Admin Operations ──
  try {
    const adminUsers = await db.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: "ADMIN",
            },
          },
        },
      },
      select: { id: true, email: true, fullName: true },
    });

    const targets = adminUsers.length > 0
      ? adminUsers
      : [{ id: "admin_fallback", email: "admin@jaxis.dev", fullName: "Admin Operations" }];

    // Non-blocking fire-and-forget email dispatch so response stays snappy (<400ms)
    Promise.allSettled(
      targets.map((admin) =>
        sendEmail({
          to: admin.email,
          recipientId: admin.id,
          template: "NewIntake",
          projectId: project.id,
          data: {
            intakeId: project.intakeId,
            researchTitle: project.researchTitle,
            clientName: session.user.name || "Lead Researcher",
            clientEmail: session.user.email || "client@jaxis.dev",
            deadlineRequested: deadlineDate.toISOString(),
          },
        })
      )
    ).catch((e) => console.warn("[createProject] sendEmail background error:", e));
  } catch (emailErr) {
    console.warn("[createProject] Failed to dispatch admin email:", emailErr);
  }

  // ── 4. Dispatch Real-time in-app alert via SSE ──
  try {
    await dispatchRealtimeNotification({
      eventType: "NEW_INTAKE",
      projectId: project.id,
      intakeId: project.intakeId,
      title: "New Research Study Submitted",
      message: `New study intake received: ${project.intakeId} — "${project.researchTitle}"`,
      linkUrl: `/dashboard/admin/projects/${project.id}`,
      targetRoles: ["ADMIN", "CEO"],
      includeProjectParties: true,
    });
  } catch (e) {
    console.warn("[createProject] Realtime dispatch warning:", e);
  }

  // ── 5. Invalidate Cache Tags and Revalidate Paths ──
  revalidateProjectCaches(project.id);

  return {
    success: true,
    data: project as unknown as ProjectDetailItem,
  };
}

/**
 * 2. Get role-scoped list of projects.
/**
 * In-memory cached project list fetcher.
 * Revalidates every 30 seconds or immediately when CACHE_TAGS.PROJECTS is invalidated.
 */
const fetchCachedProjectsDb = unstable_cache(
  async (whereClauseJson: string, take?: number, skip?: number) => {
    const whereClause: Prisma.ProjectWhereInput = JSON.parse(whereClauseJson);
    return withDbTimeout(
      db.project.findMany({
        where: whereClause,
        ...(take ? { take } : {}),
        ...(skip ? { skip } : {}),
        select: {
          id: true,
          intakeId: true,
          clientId: true,
          researchTitle: true,
          researchQuestions: true,
          researchObjectives: true,
          hypotheses: true,
          deadlineRequested: true,
          chapters13: true,
          questionnaire: true,
          masterStatus: true,
          packageName: true,
          missingInfoReason: true,
          deliveredAt: true,
          filesPurgeAt: true,
          filesPurged: true,
          hasActiveDispute: true,
          hasPendingRefund: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              clientProfile: {
                select: {
                  institutionSchool: true,
                  academicProgram: true,
                  contactNumber: true,
                  region: true,
                },
              },
            },
          },
          files: {
            select: {
              id: true,
              projectId: true,
              fileName: true,
              filePath: true,
              fileType: true,
              fileCategory: true,
              uploadedAt: true,
            },
          },
          payments: {
            select: {
              id: true,
              paymentStatus: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      })
    );
  },
  ["cached-projects-feed"],
  { revalidate: 30, tags: [CACHE_TAGS.PROJECTS] }
);

/**
 * 2. Get role-scoped list of projects.
 * - CLIENT: sees only their own projects (using indexed clientId lookup).
 * - ADMIN / CEO: sees all projects.
 * - STATISTICIAN / QA: sees assigned (or all active in dev).
 */
export async function getProjects(
  filters?: unknown
): Promise<ActionResponse<ProjectDetailItem[]>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in." },
    };
  }

  const userRole = session.user.role as string;
  const isClient = userRole === "CLIENT";

  const parsed = ProjectFilterSchema.safeParse(filters || {});
  const { status, search, page, pageSize } = parsed.success
    ? parsed.data
    : { status: undefined, search: undefined, page: undefined, pageSize: undefined };

  try {
    const whereClause: Prisma.ProjectWhereInput = {
      ...(isClient
        ? {
            clientId: session.user.id,
          }
        : {}),
      ...(status && status !== "ALL" ? { masterStatus: status as ProjectStatus } : {}),
      ...(search?.trim()
        ? {
            OR: [
              { researchTitle: { contains: search.trim(), mode: "insensitive" as const } },
              { intakeId: { contains: search.trim(), mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const take = pageSize && pageSize > 0 ? Math.min(pageSize, 100) : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;

    const whereClauseJson = JSON.stringify(whereClause);
    const projects = await fetchCachedProjectsDb(whereClauseJson, take, skip);

    const mappedProjects = (projects as unknown as Array<ProjectDetailItem & { payments?: Array<{ paymentStatus: string }> }>).map((p) => {
      const latestPay = p.payments?.[0];
      return {
        ...p,
        latestPaymentStatus: latestPay?.paymentStatus || null,
        hasPendingPaymentVerification: latestPay?.paymentStatus === "PROOF_SUBMITTED",
      };
    });

    return {
      success: true,
      data: mappedProjects as unknown as ProjectDetailItem[],
    };
  } catch (dbError) {
    console.warn("[getProjects] DB offline, reading from dev projects cache.", dbError);

    let devProjects = readPersistedDevProjects();


    const devPayments = readPersistedDevPayments();
    devProjects = devProjects.map((p) => {
      const projPayments = devPayments.filter((pay) => pay.projectId === p.id);
      const latestPay = projPayments.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      return {
        ...p,
        latestPaymentStatus: latestPay?.paymentStatus || null,
        hasPendingPaymentVerification: latestPay?.paymentStatus === "PROOF_SUBMITTED",
      };
    });

    if (userRole === "CLIENT") {
      devProjects = devProjects.filter(
        (p) =>
          p.clientId === session.user.id ||
          p.client.email === session.user?.email ||
          p.client.email === "client@jaxis.dev" ||
          p.clientId === "usr_dev_client_001"
      );
    }

    if (status && status !== "ALL") {
      devProjects = devProjects.filter((p) => p.masterStatus === status);
    }

    if (search?.trim()) {
      const q = search.toLowerCase().trim();
      devProjects = devProjects.filter(
        (p) =>
          p.researchTitle.toLowerCase().includes(q) ||
          p.intakeId.toLowerCase().includes(q)
      );
    }

    if (page && pageSize && pageSize > 0) {
      const startIndex = (page - 1) * pageSize;
      devProjects = devProjects.slice(startIndex, startIndex + pageSize);
    }

    return {
      success: true,
      data: devProjects,
    };
  }
}

/**
 * 3. Retrieve single project detail by ID or intakeId.
 */
export async function getProjectById(
  id: string
): Promise<ActionResponse<ProjectDetailItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in." },
    };
  }

  try {
    const project = await withDbTimeout(
      db.project.findFirst({
        where: {
          OR: [{ id }, { intakeId: id }],
        },
        select: {
          id: true,
          intakeId: true,
          clientId: true,
          researchTitle: true,
          researchQuestions: true,
          researchObjectives: true,
          hypotheses: true,
          deadlineRequested: true,
          chapters13: true,
          questionnaire: true,
          masterStatus: true,
          packageName: true,
          missingInfoReason: true,
          deliveredAt: true,
          filesPurgeAt: true,
          filesPurged: true,
          hasActiveDispute: true,
          hasPendingRefund: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              clientProfile: {
                select: {
                  institutionSchool: true,
                  academicProgram: true,
                  contactNumber: true,
                  region: true,
                },
              },
            },
          },
          files: {
            select: {
              id: true,
              projectId: true,
              fileName: true,
              filePath: true,
              fileType: true,
              fileCategory: true,
              uploadedAt: true,
            },
          },
          payments: {
            select: {
              id: true,
              amountSubmitted: true,
              paymentStatus: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          quotations: {
            select: {
              id: true,
              totalAmount: true,
              downpaymentRequired: true,
              status: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      })
    );

    if (!project) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found." },
      };
    }

    // Role-based authorization
    if (session.user.role === "CLIENT" && project.clientId !== session.user.id) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "You do not have access to this study." },
      };
    }

    const latestPay = project.payments?.[0];
    const latestQuote = project.quotations?.[0];
    const totalAmount = latestQuote ? Number(latestQuote.totalAmount) : 0;
    const downpaymentRequired = latestQuote ? Number(latestQuote.downpaymentRequired) : 0;
    const balanceSummary = calculateProjectBalance(
      project.payments.map((p) => ({
        amountSubmitted: Number(p.amountSubmitted),
        paymentStatus: p.paymentStatus,
      })),
      totalAmount,
      downpaymentRequired
    );

    const mapped = {
      ...project,
      payments: undefined,
      quotations: undefined,
      latestPaymentStatus: latestPay?.paymentStatus || null,
      hasPendingPaymentVerification: latestPay?.paymentStatus === "PROOF_SUBMITTED",
      financialSummary: {
        totalAmount: balanceSummary.totalAmount,
        downpaymentRequired: balanceSummary.downpaymentRequired,
        verifiedPaid: balanceSummary.verifiedPaid,
        remainingBalance: balanceSummary.remainingBalance,
        isDownpaymentCleared: balanceSummary.isDownpaymentCleared,
        isFullyPaid: balanceSummary.isFullyPaid,
      },
    };

    return {
      success: true,
      data: mapped as unknown as ProjectDetailItem,
    };
  } catch (dbError) {
    console.warn("[getProjectById] DB offline, reading from dev projects cache.", dbError);

    const devProjects = readPersistedDevProjects();
    const project = devProjects.find((p) => p.id === id || p.intakeId === id);

    if (!project) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found in dev cache." },
      };
    }

    if (session.user.role === "CLIENT" && project.clientId !== session.user.id && project.client.email !== session.user.email) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "You do not have access to this study." },
      };
    }

    const devPayments = readPersistedDevPayments();
    const projPayments = devPayments.filter((pay) => pay.projectId === project.id);
    const latestPay = projPayments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    return {
      success: true,
      data: {
        ...project,
        latestPaymentStatus: latestPay?.paymentStatus || null,
        hasPendingPaymentVerification: latestPay?.paymentStatus === "PROOF_SUBMITTED",
      },
    };
  }
}

/**
 * 4. Update project masterStatus, strictly validating state machine transitions.
 * Accessible only to ADMIN and CEO.
 */
export async function updateProjectStatus(
  input: unknown
): Promise<ActionResponse<ProjectDetailItem>> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "CEO")) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only Administrators and Executives can transition project statuses." },
    };
  }

  const parsed = UpdateProjectStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid status transition payload." },
    };
  }

  const { projectId, status: targetStatus } = parsed.data;

  try {
    const existing = await db.project.findFirst({
      where: {
        OR: [{ id: projectId }, { intakeId: projectId }],
      },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found." },
      };
    }

    // Assert state machine legality
    assertValidStatusTransition(existing.masterStatus, targetStatus);

    const updated = await db.project.update({
      where: { id: existing.id },
      data: { masterStatus: targetStatus },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            clientProfile: true,
          },
        },
        files: true,
      },
    });

    // Real-time multi-role notification dispatch
    try {
      await dispatchRealtimeNotification({
        eventType: "STATUS_UPDATE",
        projectId: existing.id,
        intakeId: existing.intakeId,
        title: "Study Status Updated",
        message: `Study "${existing.researchTitle}" transitioned to ${targetStatus.replace(/_/g, " ")}.`,
        targetRoles: ["ADMIN", "CEO"],
        includeProjectParties: true,
      });
    } catch (notifyErr) {
      console.warn("[updateProjectStatus] Realtime notification dispatch failed:", notifyErr);
    }

    revalidateProjectCaches(projectId);

    return {
      success: true,
      data: updated as ProjectDetailItem,
    };
  } catch (dbError) {
    if (dbError instanceof Error && dbError.message.includes("INVALID_STATUS_TRANSITION")) {
      return {
        success: false,
        error: { code: "INVALID_STATUS_TRANSITION", message: dbError.message },
      };
    }

    console.warn("[updateProjectStatus] DB offline, updating in dev cache.", dbError);

    const devProjects = readPersistedDevProjects();
    const index = devProjects.findIndex((p) => p.id === projectId || p.intakeId === projectId);

    if (index === -1) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found in dev cache." },
      };
    }

    const currentStatus = devProjects[index]!.masterStatus;
    try {
      assertValidStatusTransition(currentStatus, targetStatus);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid status transition";
      return {
        success: false,
        error: { code: "INVALID_STATUS_TRANSITION", message: msg },
      };
    }

    devProjects[index]!.masterStatus = targetStatus;
    devProjects[index]!.updatedAt = new Date().toISOString();
    writePersistedDevProjects(devProjects);

    try {
      await dispatchRealtimeNotification({
        eventType: "STATUS_UPDATE",
        projectId: devProjects[index]!.id,
        intakeId: devProjects[index]!.intakeId,
        title: "Study Status Updated",
        message: `Study "${devProjects[index]!.researchTitle}" transitioned to ${targetStatus.replace(/_/g, " ")}.`,
        targetRoles: ["ADMIN", "CEO"],
        includeProjectParties: true,
      });
    } catch {
      // Ignore
    }

    revalidatePath("/dashboard/admin/intake");
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/client/projects/${projectId}`);

    return {
      success: true,
      data: devProjects[index]!,
    };
  }
}

/**
 * 5. Admin requests missing information from client.
 * Transitions project to AWAITING_INFORMATION and records reason.
 */
export async function requestMissingInfo(
  input: unknown
): Promise<ActionResponse<ProjectDetailItem>> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "CEO")) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only Administrators can request missing information." },
    };
  }

  const parsed = RequestMissingInfoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please provide a valid explanation for the missing information.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { projectId, reason } = parsed.data;

  try {
    const existing = await db.project.findFirst({
      where: {
        OR: [{ id: projectId }, { intakeId: projectId }],
      },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found." },
      };
    }

    assertValidStatusTransition(existing.masterStatus, "AWAITING_INFORMATION");

    const updated = await db.project.update({
      where: { id: existing.id },
      data: {
        masterStatus: "AWAITING_INFORMATION",
        missingInfoReason: reason.trim(),
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            clientProfile: true,
          },
        },
        files: true,
      },
    });

    try {
      await dispatchRealtimeNotification({
        eventType: "INPUT_UPDATE",
        projectId: existing.id,
        intakeId: existing.intakeId,
        title: "Information Requested",
        message: `Details requested for study ${existing.intakeId}: "${reason}"`,
        targetRoles: ["ADMIN"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[requestMissingInfo] Realtime notification warning:", e);
    }

    revalidateProjectCaches(projectId);

    return {
      success: true,
      data: updated as ProjectDetailItem,
    };
  } catch (dbError) {
    if (dbError instanceof Error && dbError.message.includes("INVALID_STATUS_TRANSITION")) {
      return {
        success: false,
        error: { code: "INVALID_STATUS_TRANSITION", message: dbError.message },
      };
    }

    console.warn("[requestMissingInfo] DB offline, updating in dev cache.", dbError);

    const devProjects = readPersistedDevProjects();
    const index = devProjects.findIndex((p) => p.id === projectId || p.intakeId === projectId);

    if (index === -1) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found in dev cache." },
      };
    }

    devProjects[index]!.masterStatus = "AWAITING_INFORMATION";
    devProjects[index]!.missingInfoReason = reason.trim();
    devProjects[index]!.updatedAt = new Date().toISOString();
    writePersistedDevProjects(devProjects);

    try {
      await dispatchRealtimeNotification({
        eventType: "INPUT_UPDATE",
        projectId: devProjects[index]!.id,
        intakeId: devProjects[index]!.intakeId,
        title: "Information Requested",
        message: `Details requested for study ${devProjects[index]!.intakeId}: "${reason}"`,
        targetRoles: ["ADMIN"],
        includeProjectParties: true,
      });
    } catch {
      // Ignore
    }

    revalidateProjectCaches(projectId);

    return {
      success: true,
      data: devProjects[index]!,
    };
  }
}

/**
 * 6. Admin marks intake complete, transitioning project to UNDER_EVALUATION.
 */
export async function markIntakeComplete(
  projectId: string
): Promise<ActionResponse<ProjectDetailItem>> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "CEO")) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only Administrators can approve intake completeness." },
    };
  }

  try {
    const existing = await db.project.findFirst({
      where: {
        OR: [{ id: projectId }, { intakeId: projectId }],
      },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found." },
      };
    }

    assertValidStatusTransition(existing.masterStatus, "UNDER_EVALUATION");

    const updated = await db.project.update({
      where: { id: existing.id },
      data: {
        masterStatus: "UNDER_EVALUATION",
        missingInfoReason: null,
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            clientProfile: true,
          },
        },
        files: true,
      },
    });

    try {
      await dispatchRealtimeNotification({
        eventType: "STATUS_UPDATE",
        projectId: existing.id,
        intakeId: existing.intakeId,
        title: "Intake Evaluation Begun",
        message: `Study ${existing.intakeId} has been verified and is under evaluation.`,
        targetRoles: ["ADMIN", "CEO"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[markIntakeComplete] Realtime notification warning:", e);
    }

    revalidateProjectCaches(projectId);

    return {
      success: true,
      data: updated as ProjectDetailItem,
    };
  } catch (dbError) {
    if (dbError instanceof Error && dbError.message.includes("INVALID_STATUS_TRANSITION")) {
      return {
        success: false,
        error: { code: "INVALID_STATUS_TRANSITION", message: dbError.message },
      };
    }

    console.warn("[markIntakeComplete] DB offline, updating in dev cache.", dbError);

    const devProjects = readPersistedDevProjects();
    const index = devProjects.findIndex((p) => p.id === projectId || p.intakeId === projectId);

    if (index === -1) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found in dev cache." },
      };
    }

    devProjects[index]!.masterStatus = "UNDER_EVALUATION";
    devProjects[index]!.missingInfoReason = null;
    devProjects[index]!.updatedAt = new Date().toISOString();
    writePersistedDevProjects(devProjects);

    try {
      await dispatchRealtimeNotification({
        eventType: "STATUS_UPDATE",
        projectId: devProjects[index]!.id,
        intakeId: devProjects[index]!.intakeId,
        title: "Intake Evaluation Begun",
        message: `Study ${devProjects[index]!.intakeId} has been verified and is under evaluation.`,
        targetRoles: ["ADMIN", "CEO"],
        includeProjectParties: true,
      });
    } catch {
      // Ignore
    }

    revalidatePath("/dashboard/admin/intake");
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/client/projects/${projectId}`);

    return {
      success: true,
      data: devProjects[index]!,
    };
  }
}

/**
 * 7. Remove an uploaded project file (Allowed pre-SOW signing only).
 */
export async function deleteProjectFile(
  projectId: string,
  fileId: string
): Promise<ActionResponse<{ deletedFileId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in." },
    };
  }

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { files: true },
    });

    if (!project) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found." },
      };
    }

    if (
      project.masterStatus === "SOW_SIGNED" ||
      project.masterStatus === "ACTIVE" ||
      project.masterStatus === "IN_PROGRESS" ||
      project.masterStatus === "DELIVERED"
    ) {
      return {
        success: false,
        error: {
          code: "IMMUTABLE_PRE_SOW",
          message: "Files cannot be removed after SOW has been signed and commissioned.",
        },
      };
    }

    await db.projectFile.delete({
      where: { id: fileId },
    });

    revalidatePath(`/dashboard/client/projects/${projectId}`);
    revalidatePath(`/dashboard/admin/projects/${projectId}`);

    return {
      success: true,
      data: { deletedFileId: fileId },
    };
  } catch (dbError) {
    console.warn("[deleteProjectFile] DB offline, deleting from dev cache.", dbError);

    const devProjects = readPersistedDevProjects();
    const pIndex = devProjects.findIndex((p) => p.id === projectId || p.intakeId === projectId);

    if (pIndex !== -1) {
      devProjects[pIndex]!.files = devProjects[pIndex]!.files.filter((f) => f.id !== fileId);
      writePersistedDevProjects(devProjects);
    }

    return {
      success: true,
      data: { deletedFileId: fileId },
    };
  }
}

/**
 * 7b. Upload/Attach a new project file (Allowed pre-SOW signing only).
 */
export async function addProjectFile(
  projectId: string,
  fileData: {
    fileName: string;
    filePath: string;
    fileType: string;
    fileCategory: FileCategory;
  }
): Promise<ActionResponse<ProjectFileItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in to upload files." },
    };
  }

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found." },
      };
    }

    if (
      project.masterStatus === "SOW_SIGNED" ||
      project.masterStatus === "ACTIVE" ||
      project.masterStatus === "IN_PROGRESS" ||
      project.masterStatus === "DELIVERED"
    ) {
      return {
        success: false,
        error: {
          code: "IMMUTABLE_PRE_SOW",
          message: "Files cannot be added after SOW has been signed and commissioned.",
        },
      };
    }

    const ALLOWED_CATEGORY_EXTENSIONS: Partial<Record<FileCategory, string[]>> = {
      RESEARCH_DOCUMENT: [".pdf", ".docx", ".doc", ".zip"],
      DATASET: [".xlsx", ".xls", ".csv", ".sav", ".dta", ".tsv"],
      QUESTIONNAIRE: [".pdf", ".docx", ".doc", ".xlsx", ".csv"],
      PAYMENT_PROOF: [".pdf", ".png", ".jpg", ".jpeg"],
      ANALYSIS_OUTPUT: [".pdf", ".docx", ".xlsx", ".csv", ".zip", ".sav"],
      DELIVERABLE: [".pdf", ".docx", ".xlsx", ".csv", ".zip"],
      DISPUTE_EVIDENCE: [".pdf", ".docx", ".png", ".jpg", ".jpeg", ".zip"],
    };

    const fileNameLower = fileData.fileName.toLowerCase();
    const allowed = ALLOWED_CATEGORY_EXTENSIONS[fileData.fileCategory] || [".pdf", ".docx", ".xlsx", ".csv", ".sav"];
    const hasValidExtension = allowed.some((ext) => fileNameLower.endsWith(ext));

    if (!hasValidExtension) {
      return {
        success: false,
        error: {
          code: "INVALID_FILE_TYPE",
          message: `The file "${fileData.fileName}" is not an accepted format for the selected category (${allowed.join(", ")}).`,
        },
      };
    }

    const created = await db.projectFile.create({
      data: {
        projectId,
        fileName: fileData.fileName,
        filePath: fileData.filePath,
        fileType: fileData.fileType,
        fileCategory: fileData.fileCategory,
      },
    });

    try {
      await dispatchRealtimeNotification({
        eventType: "INPUT_UPDATE",
        projectId: project.id,
        intakeId: project.intakeId,
        title: "Study File Uploaded",
        message: `File "${fileData.fileName}" (${fileData.fileCategory.replace(/_/g, " ")}) uploaded to study ${project.intakeId}.`,
        targetRoles: ["ADMIN"],
        includeProjectParties: true,
        excludeUserId: session.user.id,
      });
    } catch (e) {
      console.warn("[addProjectFile] Realtime notification warning:", e);
    }

    revalidatePath(`/dashboard/client/projects/${projectId}`);
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/admin/intake`);
    revalidatePath(`/dashboard/client`);
    revalidatePath(`/dashboard/client/projects`);

    return {
      success: true,
      data: created as unknown as ProjectFileItem,
    };
  } catch (dbError) {
    console.warn("[addProjectFile] DB offline, saving to dev cache.", dbError);

    const devProjects = readPersistedDevProjects();
    const pIndex = devProjects.findIndex((p) => p.id === projectId || p.intakeId === projectId);

    if (pIndex === -1) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found in dev cache." },
      };
    }

    const newFile: ProjectFileItem = {
      id: `file_${Date.now()}`,
      projectId: devProjects[pIndex]!.id,
      fileName: fileData.fileName,
      filePath: fileData.filePath,
      fileType: fileData.fileType,
      fileCategory: fileData.fileCategory,
      uploadedAt: new Date().toISOString(),
    };

    devProjects[pIndex]!.files.push(newFile);
    writePersistedDevProjects(devProjects);

    try {
      await dispatchRealtimeNotification({
        eventType: "INPUT_UPDATE",
        projectId: devProjects[pIndex]!.id,
        intakeId: devProjects[pIndex]!.intakeId,
        title: "Study File Uploaded",
        message: `File "${fileData.fileName}" (${fileData.fileCategory.replace(/_/g, " ")}) uploaded to study ${devProjects[pIndex]!.intakeId}.`,
        targetRoles: ["ADMIN"],
        includeProjectParties: true,
        excludeUserId: session.user.id,
      });
    } catch {
      // Ignore
    }

    revalidatePath(`/dashboard/client/projects/${projectId}`);
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/admin/intake`);
    revalidatePath(`/dashboard/client`);
    revalidatePath(`/dashboard/client/projects`);

    return {
      success: true,
      data: newFile,
    };
  }
}

/**
 * 8. Client resolves missing information request, transitioning project back to UNDER_EVALUATION.
 */
export async function resolveMissingInfo(
  projectId: string
): Promise<ActionResponse<ProjectDetailItem>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in to update this study." },
    };
  }

  try {
    const existing = await db.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            clientProfile: true,
          },
        },
        files: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found." },
      };
    }

    // Ensure state transition legality (AWAITING_INFORMATION -> UNDER_EVALUATION)
    assertValidStatusTransition(existing.masterStatus, "UNDER_EVALUATION");

    const updated = await db.project.update({
      where: { id: projectId },
      data: {
        masterStatus: "UNDER_EVALUATION",
        missingInfoReason: null,
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            clientProfile: true,
          },
        },
        files: true,
      },
    });

    // Notify admin & parties that missing information has been submitted
    try {
      await dispatchRealtimeNotification({
        eventType: "INPUT_UPDATE",
        projectId: updated.id,
        intakeId: updated.intakeId,
        title: "Information Provided",
        message: `Client provided requested information for ${updated.intakeId}. Ready for quote builder.`,
        targetRoles: ["ADMIN"],
        includeProjectParties: true,
      });
    } catch (e) {
      console.warn("[resolveMissingInfo] Realtime notification error:", e);
    }

    revalidateProjectCaches(projectId);

    return {
      success: true,
      data: updated as ProjectDetailItem,
    };
  } catch (dbError) {
    console.warn("[resolveMissingInfo] DB offline, updating in dev cache.", dbError);

    const devProjects = readPersistedDevProjects();
    const index = devProjects.findIndex((p) => p.id === projectId || p.intakeId === projectId);

    if (index === -1) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found in dev cache." },
      };
    }

    devProjects[index]!.masterStatus = "UNDER_EVALUATION";
    devProjects[index]!.missingInfoReason = null;
    devProjects[index]!.updatedAt = new Date().toISOString();
    writePersistedDevProjects(devProjects);

    try {
      await dispatchRealtimeNotification({
        eventType: "INPUT_UPDATE",
        projectId: devProjects[index]!.id,
        intakeId: devProjects[index]!.intakeId,
        title: "Information Provided",
        message: `Client provided requested information for ${devProjects[index]!.intakeId}. Ready for quote builder.`,
        targetRoles: ["ADMIN"],
        includeProjectParties: true,
      });
    } catch {
      // Ignore
    }

    revalidatePath("/dashboard/client");
    revalidatePath("/dashboard/client/projects");
    revalidatePath(`/dashboard/client/projects/${projectId}`);
    revalidatePath("/dashboard/admin/intake");
    revalidatePath(`/dashboard/admin/projects/${projectId}`);

    return {
      success: true,
      data: devProjects[index]!,
    };
  }
}

/**
 * 8. Retrieve complete audit stream and verification trail for a specific study.
 */
export async function getProjectAuditTrail(
  id: string
): Promise<ActionResponse<AuditTelemetryEvent[]>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "You must be logged in." },
    };
  }

  try {
    const project = await withDbTimeout(
      db.project.findFirst({
        where: {
          OR: [{ id }, { intakeId: id }],
        },
        select: {
          id: true,
          intakeId: true,
          researchTitle: true,
          createdAt: true,
          client: {
            select: {
              fullName: true,
            },
          },
          files: {
            select: {
              id: true,
              fileName: true,
              fileCategory: true,
              uploadedAt: true,
            },
            orderBy: { uploadedAt: "asc" },
          },
          quotations: {
            select: {
              id: true,
              packageName: true,
              totalAmount: true,
              status: true,
              respondedAt: true,
              declineReason: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
          sows: {
            select: {
              id: true,
              turnaroundDays: true,
              isLocked: true,
              signedAt: true,
              signedByName: true,
              generatedAt: true,
            },
            orderBy: { generatedAt: "asc" },
          },
          payments: {
            select: {
              id: true,
              paymentType: true,
              amountSubmitted: true,
              paymentMethod: true,
              referenceNumber: true,
              paymentStatus: true,
              verifiedAt: true,
              updatedAt: true,
              rejectionReason: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      })
    );

    if (!project) {
      return { success: false, error: { code: "NOT_FOUND", message: "Project not found." } };
    }

    const events: AuditTelemetryEvent[] = [];

    // 1. Project Intake creation
    events.push({
      id: `intake-${project.id}`,
      timestamp: new Date(project.createdAt).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      rawDate: project.createdAt,
      actor: project.client.fullName || "Lead Researcher",
      actorRole: "CLIENT",
      action: "Study Intake Registered",
      targetId: project.intakeId,
      detail: `Study intake submitted: "${project.researchTitle}"`,
      badgeText: "Intake",
      badgeType: "info",
    });

    // 2. Uploaded files
    for (const f of project.files) {
      events.push({
        id: `file-${f.id}`,
        timestamp: new Date(f.uploadedAt).toLocaleString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        rawDate: f.uploadedAt,
        actor: project.client.fullName || "Lead Researcher",
        actorRole: "CLIENT",
        action: "Document Uploaded",
        targetId: project.intakeId,
        detail: `${f.fileName} (${f.fileCategory.replace(/_/g, " ")})`,
        badgeText: "Upload",
        badgeType: "info",
      });
    }

    // 3. Quotation milestones
    for (const q of project.quotations) {
      events.push({
        id: `quote-create-${q.id}`,
        timestamp: new Date(q.createdAt).toLocaleString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        rawDate: q.createdAt,
        actor: "Admin Desk",
        actorRole: "ADMIN",
        action: "Quotation Generated",
        targetId: project.intakeId,
        detail: `Package ${q.packageName.replace(/_/g, " ")} valued at ₱${Number(q.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
        badgeText: "Quote",
        badgeType: "info",
      });

      if (q.status === "CLIENT_APPROVED" && q.respondedAt) {
        events.push({
          id: `quote-approved-${q.id}`,
          timestamp: new Date(q.respondedAt).toLocaleString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          rawDate: q.respondedAt,
          actor: project.client.fullName || "Lead Researcher",
          actorRole: "CLIENT",
          action: "Quotation Approved",
          targetId: project.intakeId,
          detail: `Approved ₱${Number(q.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })} quotation terms.`,
          badgeText: "Approved",
          badgeType: "success",
        });
      } else if (q.status === "QUOTE_DECLINED" && q.respondedAt) {
        events.push({
          id: `quote-declined-${q.id}`,
          timestamp: new Date(q.respondedAt).toLocaleString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          rawDate: q.respondedAt,
          actor: project.client.fullName || "Lead Researcher",
          actorRole: "CLIENT",
          action: "Quotation Declined",
          targetId: project.intakeId,
          detail: q.declineReason || "Client requested revision to quotation.",
          badgeText: "Declined",
          badgeType: "warning",
        });
      }
    }

    // 4. SOW milestones
    for (const s of project.sows) {
      events.push({
        id: `sow-gen-${s.id}`,
        timestamp: new Date(s.generatedAt).toLocaleString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        rawDate: s.generatedAt,
        actor: "Admin Desk",
        actorRole: "ADMIN",
        action: "Scope of Work Drafted",
        targetId: project.intakeId,
        detail: `SOW prepared with ${s.turnaroundDays} business days turnaround.`,
        badgeText: "SOW",
        badgeType: "info",
      });

      if (s.isLocked && s.signedAt) {
        events.push({
          id: `sow-signed-${s.id}`,
          timestamp: new Date(s.signedAt).toLocaleString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          rawDate: s.signedAt,
          actor: s.signedByName || project.client.fullName,
          actorRole: "CLIENT",
          action: "Scope of Work Executed",
          targetId: project.intakeId,
          detail: `Digitally signed by ${s.signedByName || "Client"}.`,
          badgeText: "Executed",
          badgeType: "success",
        });
      }
    }

    // 5. Payment milestones
    for (const p of project.payments) {
      events.push({
        id: `pay-submit-${p.id}`,
        timestamp: new Date(p.createdAt).toLocaleString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        rawDate: p.createdAt,
        actor: project.client.fullName || "Lead Researcher",
        actorRole: "CLIENT",
        action: "Payment Deposit Submitted",
        targetId: project.intakeId,
        detail: `${p.paymentType.replace(/_/g, " ")} of ₱${Number(p.amountSubmitted).toLocaleString("en-PH", { minimumFractionDigits: 2 })} via ${p.paymentMethod || "Electronic Deposit"}${p.referenceNumber ? ` (Ref: ${p.referenceNumber})` : ""}.`,
        badgeText: "Deposit",
        badgeType: "info",
      });

      if (p.paymentStatus === "VERIFIED" || p.paymentStatus === "FULLY_PAID") {
        events.push({
          id: `pay-verified-${p.id}`,
          timestamp: new Date(p.verifiedAt || p.updatedAt).toLocaleString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          rawDate: p.verifiedAt || p.updatedAt,
          actor: "Finance Officer",
          actorRole: "FINANCE_OFFICER",
          action: p.paymentStatus === "FULLY_PAID" ? "Full Settlement Cleared" : "Downpayment Cleared",
          targetId: project.intakeId,
          detail: `Cleared ₱${Number(p.amountSubmitted).toLocaleString("en-PH", { minimumFractionDigits: 2 })} into verified project escrow.`,
          badgeText: "Cleared",
          badgeType: "success",
        });
      } else if (p.paymentStatus === "REJECTED") {
        events.push({
          id: `pay-rejected-${p.id}`,
          timestamp: new Date(p.updatedAt).toLocaleString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          rawDate: p.updatedAt,
          actor: "Finance Officer",
          actorRole: "FINANCE_OFFICER",
          action: "Payment Proof Rejected",
          targetId: project.intakeId,
          detail: p.rejectionReason || "Receipt did not meet verification criteria.",
          badgeText: "Rejected",
          badgeType: "danger",
        });
      }
    }

    // Sort chronologically descending (newest first)
    events.sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());

    return {
      success: true,
      data: events,
    };
  } catch (err) {
    console.warn("[getProjectAuditTrail] Error fetching database trail:", err);
    return {
      success: true,
      data: [],
    };
  }
}

