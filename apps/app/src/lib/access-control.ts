import fs from "fs";
import path from "path";
import type { RoleName } from "@prisma/client";
import { db, withDbTimeout } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface StudyAccessResult {
  hasAccess: boolean;
  isOwner: boolean;
  isAssignedStatistician: boolean;
  isAssignedQaLead: boolean;
  isManager: boolean;
  isFinance: boolean;
  role: RoleName | string;
  project?: {
    id: string;
    intakeId: string;
    clientId: string;
    clientEmail?: string | null;
    assignment?: {
      statisticianId: string;
      qaLeadId: string;
      isActive: boolean;
    } | null;
  };
  error?: {
    code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND";
    message: string;
  };
}

export interface ProjectParticipantResult {
  isParticipant: boolean;
  role: RoleName | string;
  error?: {
    code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND";
    message: string;
  };
}

/**
 * Asserts study access for a given user session.
 * Handles Clients, Assigned Statisticians, Assigned QA Leads, Finance Officers, and Admin/CEO.
 */
export async function assertStudyAccess(
  projectIdOrIntakeId: string,
  user?: { id: string; role?: RoleName | string; email?: string | null }
): Promise<StudyAccessResult> {
  if (!user?.id) {
    return {
      hasAccess: false,
      isOwner: false,
      isAssignedStatistician: false,
      isAssignedQaLead: false,
      isManager: false,
      isFinance: false,
      role: "CLIENT",
      error: { code: "UNAUTHORIZED", message: "You must be logged in." },
    };
  }

  const role = (user.role as RoleName) || "CLIENT";
  const isManager = role === "ADMIN" || role === "CEO";
  const isFinance = role === "FINANCE_OFFICER";

  let project: StudyAccessRecord | null;
  try {
    project = await withDbTimeout(
      db.project.findFirst({
        where: {
          OR: [{ id: projectIdOrIntakeId }, { intakeId: projectIdOrIntakeId }],
        },
        select: {
          id: true,
          intakeId: true,
          clientId: true,
          client: {
            select: {
              email: true,
            },
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
  } catch (error) {
    console.error("[assertStudyAccess] Database error:", error);
    // Local dev only: when the DB is unreachable, check access against the offline study store.
    const devProject = findDevStudyForAccess(projectIdOrIntakeId);
    if (!devProject) {
      return {
        hasAccess: false,
        isOwner: false,
        isAssignedStatistician: false,
        isAssignedQaLead: false,
        isManager,
        isFinance,
        role,
        error: { code: "NOT_FOUND", message: "Study verification unavailable." },
      };
    }
    project = devProject;
  }

  if (!project) {
    return {
      hasAccess: false,
      isOwner: false,
      isAssignedStatistician: false,
      isAssignedQaLead: false,
      isManager,
      isFinance,
      role,
      error: { code: "NOT_FOUND", message: "Research study not found." },
    };
  }

  const clientEmail = project.client?.email?.toLowerCase().trim() || null;
  const userEmail = user.email?.toLowerCase().trim() || null;

  const isOwner =
    project.clientId === user.id ||
    (userEmail !== null && clientEmail !== null && userEmail === clientEmail);

  const isAssignedStatistician =
    project.assignment?.statisticianId === user.id &&
    project.assignment?.isActive !== false;

  const isAssignedQaLead =
    project.assignment?.qaLeadId === user.id &&
    project.assignment?.isActive !== false;

  const projectData = {
    id: project.id,
    intakeId: project.intakeId,
    clientId: project.clientId,
    clientEmail,
    assignment: project.assignment,
  };

  if (isManager) {
    return {
      hasAccess: true,
      isOwner,
      isAssignedStatistician,
      isAssignedQaLead,
      isManager: true,
      isFinance,
      role,
      project: projectData,
    };
  }

  if (role === "CLIENT") {
    if (!isOwner) {
      return {
        hasAccess: false,
        isOwner: false,
        isAssignedStatistician: false,
        isAssignedQaLead: false,
        isManager: false,
        isFinance: false,
        role,
        project: projectData,
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this research study.",
        },
      };
    }
    return {
      hasAccess: true,
      isOwner: true,
      isAssignedStatistician: false,
      isAssignedQaLead: false,
      isManager: false,
      isFinance: false,
      role,
      project: projectData,
    };
  }

  if (role === "STATISTICIAN") {
    if (!isAssignedStatistician) {
      return {
        hasAccess: false,
        isOwner: false,
        isAssignedStatistician: false,
        isAssignedQaLead: false,
        isManager: false,
        isFinance: false,
        role,
        project: projectData,
        error: {
          code: "FORBIDDEN",
          message: "You are not assigned to this research study.",
        },
      };
    }
    return {
      hasAccess: true,
      isOwner: false,
      isAssignedStatistician: true,
      isAssignedQaLead: false,
      isManager: false,
      isFinance: false,
      role,
      project: projectData,
    };
  }

  if (role === "SENIOR_QA_LEAD") {
    if (!isAssignedQaLead) {
      return {
        hasAccess: false,
        isOwner: false,
        isAssignedStatistician: false,
        isAssignedQaLead: false,
        isManager: false,
        isFinance: false,
        role,
        project: projectData,
        error: {
          code: "FORBIDDEN",
          message: "You are not assigned to review this research study.",
        },
      };
    }
    return {
      hasAccess: true,
      isOwner: false,
      isAssignedStatistician: false,
      isAssignedQaLead: true,
      isManager: false,
      isFinance: false,
      role,
      project: projectData,
    };
  }

  if (isFinance) {
    return {
      hasAccess: true,
      isOwner: false,
      isAssignedStatistician: false,
      isAssignedQaLead: false,
      isManager: false,
      isFinance: true,
      role,
      project: projectData,
    };
  }

  return {
    hasAccess: false,
    isOwner: false,
    isAssignedStatistician: false,
    isAssignedQaLead: false,
    isManager: false,
    isFinance: false,
    role,
    project: projectData,
    error: { code: "FORBIDDEN", message: "You do not have permission to access this study." },
  };
}

interface StudyAccessRecord {
  id: string;
  intakeId: string;
  clientId: string;
  client: { email: string } | null;
  assignment: { statisticianId: string; qaLeadId: string; isActive: boolean } | null;
}

/** Reads .dev-projects.json (local offline dev store). Never used in production. */
function findDevStudyForAccess(projectIdOrIntakeId: string): StudyAccessRecord | null {
  if (process.env.NODE_ENV === "production") return null;
  try {
    const file = path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-projects.json");
    if (!fs.existsSync(file)) return null;
    const rows = JSON.parse(fs.readFileSync(file, "utf-8")) as Array<Partial<StudyAccessRecord>>;
    const row = rows.find((p) => p.id === projectIdOrIntakeId || p.intakeId === projectIdOrIntakeId);
    if (!row?.id || !row.intakeId || !row.clientId) return null;
    return {
      id: row.id,
      intakeId: row.intakeId,
      clientId: row.clientId,
      client: row.client?.email ? { email: row.client.email } : null,
      assignment: row.assignment ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Asserts that a user is an active participant in a research study's consultation thread.
 * Allowed: Owning Client, Assigned Statistician, Assigned Senior QA Lead, Admin/CEO.
 * Forbidden: Unassigned staff, Finance Officers (consultation chat is strictly empirical).
 */
export async function assertProjectParticipant(
  projectIdOrIntakeId: string,
  user?: { id: string; role?: RoleName | string; email?: string | null }
): Promise<ProjectParticipantResult> {
  const access = await assertStudyAccess(projectIdOrIntakeId, user);
  if (!access.hasAccess) {
    return {
      isParticipant: false,
      role: access.role,
      error: access.error || { code: "FORBIDDEN", message: "You do not have access to this conversation." },
    };
  }

  // Finance officers cannot view consultation chats
  if (access.role === "FINANCE_OFFICER") {
    return {
      isParticipant: false,
      role: access.role,
      error: {
        code: "FORBIDDEN",
        message: "Finance officers do not participate in research consultation threads.",
      },
    };
  }

  if (access.isManager || access.isOwner || access.isAssignedStatistician || access.isAssignedQaLead) {
    return {
      isParticipant: true,
      role: access.role,
    };
  }

  return {
    isParticipant: false,
    role: access.role,
    error: { code: "FORBIDDEN", message: "You are not a participant in this conversation." },
  };
}

/**
 * Builds the canonical Prisma where clause for project filtering based on user session role.
 */
export function buildProjectRoleWhereClause(sessionUser: {
  id: string;
  role?: RoleName | string;
  email?: string | null;
}): Prisma.ProjectWhereInput {
  const role = (sessionUser.role as RoleName) || "CLIENT";
  const email = sessionUser.email?.toLowerCase().trim();

  switch (role) {
    case "CLIENT":
      return {
        OR: [
          { clientId: sessionUser.id },
          ...(email ? [{ client: { email } }] : []),
        ],
      };
    case "STATISTICIAN":
      return {
        assignment: {
          statisticianId: sessionUser.id,
          isActive: true,
        },
      };
    case "SENIOR_QA_LEAD":
      return {
        assignment: {
          qaLeadId: sessionUser.id,
          isActive: true,
        },
      };
    case "FINANCE_OFFICER":
    case "ADMIN":
    case "CEO":
    default:
      return {};
  }
}

/**
 * Redacts financial and commercial details from a project object for specialists.
 * Statisticians and Senior QA Leads only receive empirical, research, and methodological metadata.
 */
export function sanitizeProjectForSpecialist<
  T extends {
    financialSummary?: unknown;
    payments?: unknown;
    quotations?: unknown;
  },
>(project: T, role?: RoleName | string): T {
  if (role !== "STATISTICIAN" && role !== "SENIOR_QA_LEAD") {
    return project;
  }

  return {
    ...project,
    financialSummary: null,
    payments: undefined,
    quotations: undefined,
  };
}
