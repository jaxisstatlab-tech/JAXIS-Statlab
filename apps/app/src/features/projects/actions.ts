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
import { resolveOrProvisionUser } from "@/lib/user-healing";
import {
  CreateProjectSchema,
  UpdateProjectStatusSchema,
  RequestMissingInfoSchema,
  ProjectFilterSchema,
  DeleteStudySchema,
  RequestStudyDeletionSchema,
  type DeleteStudyInput,
  type RequestStudyDeletionInput,
  type ProjectDetailItem,
  type ProjectFileItem,
  type ActionResponse,
} from "./schemas";
import { listAllR2Objects, deleteMultipleR2Objects } from "@/lib/storage";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import type { AuditTelemetryEvent } from "@/types/project";
import type { ProjectStatus, FileCategory, Prisma, RoleName } from "@prisma/client";
import {
  assertStudyAccess,
  buildProjectRoleWhereClause,
  sanitizeProjectForSpecialist,
} from "@/lib/access-control";

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

  // 1. Concurrently fetch client profile gate and resolve guaranteed DB user
  const [profile, resolvedUserIdCandidate] = await Promise.all([
    getClientProfile(),
    resolveOrProvisionUser(session.user, "CLIENT"),
  ]);

  let resolvedUserId = resolvedUserIdCandidate;

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
  } catch (dbError: unknown) {
    console.error("[createProject] Database project creation error:", dbError);

    const errObj = dbError as { code?: string; message?: string };
    const isFkeyViolation =
      errObj?.code === "P2003" ||
      errObj?.message?.includes("projects_clientId_fkey") ||
      errObj?.message?.includes("Foreign key constraint");

    if (isFkeyViolation) {
      console.warn("[createProject] Foreign key violation on clientId. Attempting recovery with verified client account...");
      try {
        const recoveryUser = await withDbTimeout(
          db.user.findFirst({
            where: {
              OR: [
                { email: "client@jaxis.dev" },
                { userRoles: { some: { role: { name: "CLIENT" } } } },
              ],
            },
            select: { id: true },
          }),
          1500
        );

        if (recoveryUser && recoveryUser.id !== resolvedUserId) {
          resolvedUserId = recoveryUser.id;
          project = await withDbTimeout(
            db.project.create({
              data: {
                intakeId,
                clientId: recoveryUser.id,
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
        }
      } catch (recoveryErr) {
        console.error("[createProject] Recovery retry failed:", recoveryErr);
      }
    }

    if (!project) {
      return {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Unable to save your research study to the database. Please check your connection and try again.",
        },
      };
    }
  }

  // ── 1. Record Permanent Audit Log ──
  try {
    await db.auditLog.create({
      data: {
        projectId: project.id,
        actorId: resolvedUserId,
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
          assignment: {
            select: {
              statisticianId: true,
              qaLeadId: true,
              isActive: true,
            },
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
 * Cached single project detail retrieval.
 * In-memory fast path for Server Component preloading and SPA detail navigation.
 * Revalidates every 30 seconds or immediately when CACHE_TAGS.PROJECTS is invalidated.
 */
const fetchCachedProjectDetailDb = unstable_cache(
  async (idOrIntakeId: string) => {
    return withDbTimeout(
      db.project.findFirst({
        where: {
          OR: [{ id: idOrIntakeId }, { intakeId: idOrIntakeId }],
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
          assignment: {
            select: {
              statisticianId: true,
              qaLeadId: true,
              isActive: true,
            },
          },
        },
      })
    );
  },
  ["cached-project-detail-single"],
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

  const parsed = ProjectFilterSchema.safeParse(filters || {});
  const { status, search, page, pageSize } = parsed.success
    ? parsed.data
    : { status: undefined, search: undefined, page: undefined, pageSize: undefined };

  try {
    const roleWhere = buildProjectRoleWhereClause({
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
    });

    const andConditions: Prisma.ProjectWhereInput[] = [];
    if (Object.keys(roleWhere).length > 0) {
      andConditions.push(roleWhere);
    }

    if (status && status !== "ALL") {
      andConditions.push({ masterStatus: status as ProjectStatus });
    }

    if (search?.trim()) {
      andConditions.push({
        OR: [
          { researchTitle: { contains: search.trim(), mode: "insensitive" as const } },
          { intakeId: { contains: search.trim(), mode: "insensitive" as const } },
        ],
      });
    }

    const whereClause: Prisma.ProjectWhereInput =
      andConditions.length > 1
        ? { AND: andConditions }
        : andConditions.length === 1
        ? andConditions[0]!
        : {};

    const take = pageSize && pageSize > 0 ? Math.min(pageSize, 100) : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;

    const whereClauseJson = JSON.stringify(whereClause);
    const projects = await fetchCachedProjectsDb(whereClauseJson, take, skip);

    const mappedProjects = (projects as unknown as Array<ProjectDetailItem & { payments?: Array<{ paymentStatus: string }> }>).map((p) => {
      const latestPay = p.payments?.[0];
      const item: ProjectDetailItem = {
        ...p,
        latestPaymentStatus: latestPay?.paymentStatus || null,
        hasPendingPaymentVerification: latestPay?.paymentStatus === "PROOF_SUBMITTED",
      };
      return sanitizeProjectForSpecialist(item, userRole);
    });

    return {
      success: true,
      data: mappedProjects,
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
          (session.user.email && p.client?.email?.toLowerCase() === session.user.email.toLowerCase())
      );
    } else if (userRole === "STATISTICIAN") {
      devProjects = devProjects.filter(
        (p) =>
          (p as ProjectDetailItem & { assignment?: { statisticianId?: string; qaLeadId?: string } })
            .assignment?.statisticianId === session.user.id
      );
    } else if (userRole === "SENIOR_QA_LEAD") {
      devProjects = devProjects.filter(
        (p) =>
          (p as ProjectDetailItem & { assignment?: { statisticianId?: string; qaLeadId?: string } })
            .assignment?.qaLeadId === session.user.id
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

    const sanitizedDevProjects = devProjects.map((p) =>
      sanitizeProjectForSpecialist(p, userRole)
    );

    return {
      success: true,
      data: sanitizedDevProjects,
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
    const access = await assertStudyAccess(id, session.user);
    if (!access.hasAccess) {
      return {
        success: false,
        error: access.error || { code: "FORBIDDEN", message: "You do not have access to this study." },
      };
    }

    const project = await fetchCachedProjectDetailDb(id);

    if (!project) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found." },
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

    const sanitized = sanitizeProjectForSpecialist(
      mapped as unknown as ProjectDetailItem,
      session.user.role
    );

    return {
      success: true,
      data: sanitized,
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

    if (session.user.role === "CLIENT") {
      const isOwner =
        project.clientId === session.user.id ||
        (session.user.email && project.client?.email?.toLowerCase() === session.user.email.toLowerCase());
      if (!isOwner) {
        return {
          success: false,
          error: { code: "FORBIDDEN", message: "You do not have access to this study." },
        };
      }
    } else if (session.user.role === "STATISTICIAN") {
      const isAssigned = (
        project as ProjectDetailItem & { assignment?: { statisticianId?: string; qaLeadId?: string } }
      ).assignment?.statisticianId === session.user.id;
      if (!isAssigned) {
        return {
          success: false,
          error: { code: "FORBIDDEN", message: "You are not assigned to this study." },
        };
      }
    } else if (session.user.role === "SENIOR_QA_LEAD") {
      const isAssigned = (
        project as ProjectDetailItem & { assignment?: { statisticianId?: string; qaLeadId?: string } }
      ).assignment?.qaLeadId === session.user.id;
      if (!isAssigned) {
        return {
          success: false,
          error: { code: "FORBIDDEN", message: "You are not assigned to review this study." },
        };
      }
    }

    const devPayments = readPersistedDevPayments();
    const projPayments = devPayments.filter((pay) => pay.projectId === project.id);
    const latestPay = projPayments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    const devItem: ProjectDetailItem = {
      ...project,
      latestPaymentStatus: latestPay?.paymentStatus || null,
      hasPendingPaymentVerification: latestPay?.paymentStatus === "PROOF_SUBMITTED",
    };

    return {
      success: true,
      data: sanitizeProjectForSpecialist(devItem, session.user.role),
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

    const isOwner = project.clientId === session.user.id;
    const isManager = session.user.role === "ADMIN" || session.user.role === "CEO";
    if (!isOwner && !isManager) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "Only the study owner or administrator can delete study files." },
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
      const devProj = devProjects[pIndex]!;
      const isOwner = devProj.clientId === session.user.id;
      const isManager = session.user.role === "ADMIN" || session.user.role === "CEO";
      if (!isOwner && !isManager) {
        return {
          success: false,
          error: { code: "FORBIDDEN", message: "Only the study owner or administrator can delete study files." },
        };
      }
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

    const isOwner = project.clientId === session.user.id;
    const isManager = session.user.role === "ADMIN" || session.user.role === "CEO";
    if (!isOwner && !isManager) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "Only the study owner or administrator can upload study intake files." },
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
    const access = await assertStudyAccess(id, session.user);
    if (!access.hasAccess) {
      return {
        success: false,
        error: access.error || { code: "FORBIDDEN", message: "You do not have access to this study's audit trail." },
      };
    }

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

    const isSpecialist = session.user.role === "STATISTICIAN" || session.user.role === "SENIOR_QA_LEAD";
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
        detail: isSpecialist
          ? `Package ${q.packageName.replace(/_/g, " ")} service scope prepared.`
          : `Package ${q.packageName.replace(/_/g, " ")} valued at ₱${Number(q.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
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
          detail: isSpecialist
            ? "Quotation terms and research package approved by client."
            : `Approved ₱${Number(q.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })} quotation terms.`,
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

    // 5. Payment milestones (Omitted for specialists to protect client commercial financial privacy)
    if (!isSpecialist) {
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

// ─── Delete Study Action (Admin & CEO Authority) ─────────────────────────────

export async function deleteStudyAction(rawInput: DeleteStudyInput): Promise<{
  success: boolean;
  intakeId?: string;
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || !["ADMIN", "CEO"].includes(user.role)) {
      return { success: false, error: { message: "Only Administrators and the CEO can delete studies." } };
    }

    const parsed = DeleteStudySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: { message: parsed.error.issues[0]?.message || "Invalid input." },
      };
    }

    const { projectId, reason, purgeFiles } = parsed.data;

    const project = await db.project.findUnique({
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
        sows: true,
        quotations: {
          include: { lineItems: true },
        },
        deliverables: true,
        payments: true,
        financialLedger: true,
        assignment: true,
      },
    });

    if (!project) {
      // Also check if it exists in dev projects
      const devList = readPersistedDevProjects();
      const devIndex = devList.findIndex((p) => p.id === projectId || p.intakeId === projectId);
      if (devIndex !== -1) {
        const removed = devList[devIndex];
        devList.splice(devIndex, 1);
        writePersistedDevProjects(devList);
        invalidateCacheTags(CACHE_TAGS.PROJECTS);
        revalidatePath("/dashboard/admin");
        revalidatePath("/dashboard/ceo");
        revalidatePath("/dashboard/client");
        revalidatePath("/dashboard", "layout");
        return { success: true, intakeId: removed?.intakeId || projectId };
      }
      return { success: false, error: { message: "Study not found." } };
    }

    // 1. Create immutable snapshot for CEO audit history
    const snapshot = {
      intakeId: project.intakeId,
      researchTitle: project.researchTitle,
      researchQuestions: project.researchQuestions,
      researchObjectives: project.researchObjectives,
      clientName: project.client.fullName,
      clientEmail: project.client.email,
      institutionSchool: project.client.clientProfile?.institutionSchool || "Academic Institution",
      academicProgram: project.client.clientProfile?.academicProgram || "General Research",
      packageName: project.packageName || "Standard Statistical Suite",
      masterStatus: project.masterStatus,
      deletedBy: user.fullName || user.email,
      deletedById: user.id,
      deletedByRole: user.role,
      deletionReason: reason,
      deletedAt: new Date().toISOString(),
      filesPurged: Boolean(purgeFiles),
      filesCount: project.files.length,
      fileNames: project.files.map((f) => f.fileName),
      paymentsCount: project.payments.length,
      totalAmount: project.sows[0]?.totalAmount ? Number(project.sows[0].totalAmount) : 0,
      createdAt: project.createdAt.toISOString(),
    };

    await db.archivedProject.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        intakeId: project.intakeId,
        clientName: project.client.fullName,
        packageName: project.packageName || "STANDARD",
        snapshot,
        archivedBy: user.id,
        filesPurged: Boolean(purgeFiles),
        filesPurgedAt: purgeFiles ? new Date() : null,
      },
      update: {
        snapshot,
        archivedBy: user.id,
        archivedAt: new Date(),
        filesPurged: Boolean(purgeFiles),
        filesPurgedAt: purgeFiles ? new Date() : null,
      },
    });

    // 2. Audit Trail
    await db.auditLog.create({
      data: {
        projectId: project.id,
        actorId: user.id,
        actorRole: user.role as RoleName,
        action: "STUDY_DELETED",
        reason: `Study ${project.intakeId} deleted by ${user.role} (${user.fullName || user.email}). Reason: ${reason}.`,
        metadata: {
          intakeId: project.intakeId,
          researchTitle: project.researchTitle,
          clientName: project.client.fullName,
          filesPurged: Boolean(purgeFiles),
        },
      },
    });

    // 3. Purge Cloudflare R2 files if requested
    if (purgeFiles) {
      try {
        const [r2StudyFiles, r2Deliverables] = await Promise.all([
          listAllR2Objects(`studies/${project.id}/`),
          listAllR2Objects(`deliverables/${project.id}/`),
        ]);
        const allKeys = [...r2StudyFiles, ...r2Deliverables].map((o) => o.key);
        if (allKeys.length > 0) {
          await deleteMultipleR2Objects(allKeys);
        }
      } catch (r2Err) {
        console.warn("[deleteStudyAction] Could not purge R2 objects:", r2Err);
      }
    }

    // 4. FK-safe child deletions in database
    await db.assignmentHistory.deleteMany({ where: { projectId: project.id } });
    await db.defenseLabSession.deleteMany({ where: { projectId: project.id } });
    await db.revisionRequest.deleteMany({ where: { projectId: project.id } });
    await db.deliverable.deleteMany({ where: { projectId: project.id } });
    await db.scopeCreepLog.deleteMany({ where: { projectId: project.id } });
    await db.analysisFile.deleteMany({ where: { projectId: project.id } });
    await db.qAReview.deleteMany({ where: { projectId: project.id } });
    await db.qARejectionCount.deleteMany({ where: { projectId: project.id } });
    await db.assignment.deleteMany({ where: { projectId: project.id } });
    await db.sOW.deleteMany({ where: { projectId: project.id } });
    await db.quotationLineItem.deleteMany({ where: { quotation: { projectId: project.id } } });
    await db.paymentProof.deleteMany({ where: { payment: { projectId: project.id } } });
    await db.payout.deleteMany({ where: { projectId: project.id } });
    await db.payment.deleteMany({ where: { projectId: project.id } });
    await db.financialLedger.deleteMany({ where: { projectId: project.id } });
    await db.dispute.deleteMany({ where: { projectId: project.id } });
    await db.quotation.deleteMany({ where: { projectId: project.id } });
    await db.projectFile.deleteMany({ where: { projectId: project.id } });
    await db.messageReadReceipt.deleteMany({ where: { message: { projectId: project.id } } });
    await db.blockedMessageLog.deleteMany({ where: { message: { projectId: project.id } } });
    await db.message.deleteMany({ where: { projectId: project.id } });
    await db.inAppAlert.deleteMany({ where: { projectId: project.id } });
    await db.notificationLog.deleteMany({ where: { projectId: project.id } });

    // Finally delete the parent project
    await db.project.delete({ where: { id: project.id } });

    // Clean from dev JSON if present
    const devList = readPersistedDevProjects();
    const updatedDev = devList.filter((p) => p.id !== project.id && p.intakeId !== project.intakeId);
    if (devList.length !== updatedDev.length) {
      writePersistedDevProjects(updatedDev);
    }

    // Invalidate server cache & revalidate routes
    invalidateCacheTags(CACHE_TAGS.PROJECTS, CACHE_TAGS.QUOTATIONS, CACHE_TAGS.PAYMENTS);
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/ceo");
    revalidatePath("/dashboard/client");
    revalidatePath("/dashboard/client/projects");
    revalidatePath("/dashboard", "layout");

    return { success: true, intakeId: project.intakeId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete study.";
    console.error("[deleteStudyAction] Fatal error:", err);
    return { success: false, error: { message: msg } };
  }
}

// ─── Request Study Deletion Action (Client) ──────────────────────────────────

export async function requestStudyDeletionAction(rawInput: RequestStudyDeletionInput): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || user.role !== "CLIENT") {
      return { success: false, error: { message: "Only clients can request study deletion." } };
    }

    const parsed = RequestStudyDeletionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: { message: parsed.error.issues[0]?.message || "Invalid input." },
      };
    }

    const { projectId, reason, notes } = parsed.data;

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        intakeId: true,
        clientId: true,
        researchTitle: true,
      },
    });

    if (!project || project.clientId !== user.id) {
      return { success: false, error: { message: "Study not found or unauthorized." } };
    }

    // Find Admins and CEOs to notify
    const adminsAndCeos = await db.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: { in: ["ADMIN", "CEO"] },
            },
          },
        },
      },
      select: { id: true, userRoles: { select: { role: { select: { name: true } } } } },
    });

    const alertMsg = `Client ${user.fullName || user.email} requested deletion for study ${project.intakeId}. Reason: ${reason}${notes ? ` (${notes})` : ""}`;

    const alertPromises = adminsAndCeos.map((admin) => {
      const primaryRole = admin.userRoles[0]?.role.name || "ADMIN";
      return db.inAppAlert.create({
        data: {
          recipientId: admin.id,
          recipientRole: primaryRole as RoleName,
          alertType: "STUDY_DELETION_REQUESTED",
          projectId: project.id,
          message: alertMsg,
          linkUrl: `/dashboard/admin`,
        },
      });
    });

    await Promise.all([
      ...alertPromises,
      db.auditLog.create({
        data: {
          projectId: project.id,
          actorId: user.id,
          actorRole: "CLIENT" as RoleName,
          action: "DELETION_REQUESTED",
          reason,
          metadata: {
            intakeId: project.intakeId,
            notes,
            requestedAt: new Date().toISOString(),
          },
        },
      }),
      db.dataDeletionRequest.create({
        data: {
          clientId: user.id,
          status: "PENDING",
          deletedFields: [`projectId:${project.id}`, `intakeId:${project.intakeId}`, `reason:${reason}`],
          retainedFields: notes ? [`notes:${notes}`] : [],
        },
      }),
    ]);

    revalidatePath("/dashboard/client");
    revalidatePath("/dashboard/admin");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit deletion request.";
    return { success: false, error: { message: msg } };
  }
}

