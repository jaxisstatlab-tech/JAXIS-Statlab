"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, withDbTimeout } from "@/lib/db";
import { requireRole, auth } from "@/lib/auth";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache-tags";
import {
  ProvisionStaffSchema,
  SuspendStaffSchema,
  TerminateStaffSchema,
  UpdateStaffProfileSchema,
  StaffFilterSchema,
  RequestLeaveSchema,
  type StaffListItem,
  type StaffDetailItem,
  type PendingLeaveItem,
  type SpecialistLeaveOverviewData,
  type StaffActionResult,
} from "./schemas";
import {
  getDevUsers,
  getDevUserByEmail,
  registerDevUser,
  type MockUser,
} from "@/lib/mock-data/users.data";
import type { RoleName, UserStatus, ViolationType } from "@prisma/client";

/**
 * 1. Provision a new internal staff member (Statistician, QA Lead, Finance Officer).
 * Accessible only to ADMIN and CEO.
 */
export async function provisionStaff(
  input: unknown
): Promise<StaffActionResult<{ id: string; email: string; fullName: string; role: RoleName; temporaryPassword: string }>> {
  const session = await requireRole("ADMIN", "CEO");

  const parsed = ProvisionStaffSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid staff provisioning parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { firstName, lastName, fullName, email, role, specializations, bio } = parsed.data;

  // Authorization check: Manager (ADMIN) is strictly limited to creating STATISTICIAN and SENIOR_QA_LEAD
  const callerRole = (session.user as { role?: string }).role;
  if (callerRole === "ADMIN") {
    const managerAllowedRoles: string[] = ["STATISTICIAN", "SENIOR_QA_LEAD"];
    if (!managerAllowedRoles.includes(role)) {
      return {
        success: false,
        error: {
          code: "UNAUTHORIZED_ROLE",
          message: "Managers can only create Statistician Expert and Senior QA Lead accounts.",
        },
      };
    }
  }

  const computedFullName = fullName?.trim() || `${firstName?.trim() || ""} ${lastName?.trim() || ""}`.trim();
  const normalizedEmail = email.toLowerCase().trim();

  // Generate secure temporary password: e.g. JAXIS-A1B2C3D4
  const temporaryPassword = `JAXIS-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  try {
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return {
        success: false,
        error: {
          code: "EMAIL_TAKEN",
          message: "An institutional or staff account with this email already exists.",
        },
      };
    }

    const targetRole = await db.role.findUnique({
      where: { name: role },
    });

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        fullName: computedFullName,
        passwordHash,
        status: "ACTIVE",
        userRoles: targetRole
          ? {
              create: {
                roleId: targetRole.id,
                assignedBy: session.user.id,
              },
            }
          : undefined,
        staffProfile: {
          create: {
            bio: bio?.trim() || null,
            specializations,
          },
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    // Mirror to dev store for fast development login fallback
    registerDevUser({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role,
      password: temporaryPassword,
      status: "ACTIVE",
      staffProfile: {
        bio: bio?.trim(),
        specializations,
        joinedAt: new Date().toISOString(),
      },
    });

    revalidatePath("/dashboard/admin/staff");
    invalidateCacheTags(CACHE_TAGS.STAFF_ROSTER, CACHE_TAGS.STAFF_DIRECTORY, CACHE_TAGS.STAFF_CAPACITY);

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role,
        temporaryPassword,
      },
    };
  } catch (dbError) {
    console.warn("[ProvisionStaff] DB unavailable in offline mode. Syncing with dev user store.", dbError);

    const existingDev = getDevUserByEmail(normalizedEmail);
    if (existingDev) {
      return {
        success: false,
        error: {
          code: "EMAIL_TAKEN",
          message: "A dev staff account with this email already exists.",
        },
      };
    }

    const devId = `usr_dev_staff_${Date.now()}`;
    const devUser: MockUser = {
      id: devId,
      email: normalizedEmail,
      fullName: computedFullName,
      role,
      password: temporaryPassword,
      status: "ACTIVE",
      staffProfile: {
        bio: bio?.trim(),
        specializations,
        joinedAt: new Date().toISOString(),
      },
    };

    registerDevUser(devUser);

    return {
      success: true,
      data: {
        id: devId,
        email: normalizedEmail,
        fullName: computedFullName,
        role,
        temporaryPassword,
      },
    };
  }
}

/**
 * 2. Query internal staff roster directory with role, status, and search filters.
 * Accessible to ADMIN and CEO.
 */
const fetchCachedStaffRosterRaw = unstable_cache(
  async (rolesJson: string, status: string, search: string) => {
    const targetRoles = JSON.parse(rolesJson) as RoleName[];
    return withDbTimeout(
      db.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                name: { in: targetRoles },
              },
            },
          },
          ...(status !== "ALL" ? { status: status as UserStatus } : {}),
          ...(search.trim()
            ? {
                OR: [
                  { fullName: { contains: search.trim(), mode: "insensitive" } },
                  { email: { contains: search.trim(), mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          leaveReason: true,
          leaveFrom: true,
          leaveUntil: true,
          createdAt: true,
          userRoles: {
            select: {
              role: {
                select: { name: true },
              },
            },
          },
          staffProfile: {
            select: {
              specializations: true,
              bio: true,
              joinedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    );
  },
  ["cached-staff-roster"],
  { revalidate: 30, tags: [CACHE_TAGS.STAFF_ROSTER, CACHE_TAGS.STAFF_DIRECTORY] }
);

export async function getStaffRoster(
  filters?: unknown
): Promise<StaffActionResult<StaffListItem[]>> {
  await requireRole("ADMIN", "CEO");

  const parsed = StaffFilterSchema.safeParse(filters || {});
  const { role = "ALL", status = "ALL", search = "" } = parsed.success ? parsed.data : { role: "ALL", status: "ALL", search: "" };

  const targetRoles: RoleName[] =
    role === "ALL"
      ? ["ADMIN", "STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER"]
      : [role as RoleName];

  try {
    const users = await fetchCachedStaffRosterRaw(
      JSON.stringify(targetRoles),
      status,
      search
    );

    const roster: StaffListItem[] = users.map((u) => {
      const primaryRole = (u.userRoles[0]?.role.name as RoleName) || "STATISTICIAN";
      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: primaryRole,
        status: u.status,
        specializations: u.staffProfile?.specializations || [],
        bio: u.staffProfile?.bio || null,
        activeProjectsCount: 0, // Computed in Module 08
        joinedAt: u.staffProfile?.joinedAt || u.createdAt,
        leaveReason: u.leaveReason,
        leaveFrom: u.leaveFrom,
        leaveUntil: u.leaveUntil,
      };
    });

    return { success: true, data: roster };
  } catch (dbError) {
    console.warn("[GetStaffRoster] DB unavailable in offline mode. Reading from dev user store.", dbError);

    const devUsers = Object.values(getDevUsers());
    const roster: StaffListItem[] = devUsers
      .filter((u) => targetRoles.includes(u.role))
      .filter((u) => (status === "ALL" ? true : u.status === status))
      .filter((u) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      })
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        status: u.status,
        specializations: u.staffProfile?.specializations || [],
        bio: u.staffProfile?.bio || null,
        activeProjectsCount: 0,
        joinedAt: u.staffProfile?.joinedAt || new Date().toISOString(),
      }));

    return { success: true, data: roster };
  }
}

export async function getStaffDirectory(
  filters?: Parameters<typeof getStaffRoster>[0]
) {
  return getStaffRoster(filters);
}

/**
 * 3. Retrieve detailed staff profile with full suspension audit history.
 * Accessible to ADMIN and CEO.
 */
export async function getStaffDetail(
  id: string
): Promise<StaffActionResult<StaffDetailItem>> {
  await requireRole("ADMIN", "CEO");

  try {
    const user = await withDbTimeout(
      db.user.findUnique({
        where: { id },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            select: {
              role: {
                select: { name: true },
              },
            },
          },
          staffProfile: {
            select: {
              specializations: true,
              bio: true,
              joinedAt: true,
              updatedAt: true,
            },
          },
          suspensionLogs: {
            select: {
              id: true,
              action: true,
              reason: true,
              violationType: true,
              performedBy: true,
              performedAt: true,
              liftedAt: true,
              liftedBy: true,
            },
            orderBy: { performedAt: "desc" },
          },
        },
      })
    );

    if (!user) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Staff member not found." },
      };
    }

    const primaryRole = (user.userRoles[0]?.role.name as RoleName) || "STATISTICIAN";

    const detail: StaffDetailItem = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: primaryRole,
      status: user.status,
      specializations: user.staffProfile?.specializations || [],
      bio: user.staffProfile?.bio || null,
      activeProjectsCount: 0,
      joinedAt: user.staffProfile?.joinedAt || user.createdAt,
      updatedAt: user.staffProfile?.updatedAt || user.updatedAt,
      suspensionLogs: user.suspensionLogs.map((log) => ({
        id: log.id,
        action: log.action,
        reason: log.reason,
        violationType: log.violationType,
        performedBy: log.performedBy,
        performedAt: log.performedAt,
        liftedAt: log.liftedAt,
        liftedBy: log.liftedBy,
      })),
    };

    return { success: true, data: detail };
  } catch (dbError) {
    console.warn("[GetStaffDetail] DB unavailable in offline mode. Reading from dev user store.", dbError);

    const devUsers = Object.values(getDevUsers());
    const devUser = devUsers.find((u) => u.id === id || u.email === id);

    if (!devUser) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Dev staff member not found." },
      };
    }

    const detail: StaffDetailItem = {
      id: devUser.id,
      fullName: devUser.fullName,
      email: devUser.email,
      phone: null,
      role: devUser.role,
      status: devUser.status,
      specializations: devUser.staffProfile?.specializations || [],
      bio: devUser.staffProfile?.bio || null,
      activeProjectsCount: 0,
      joinedAt: devUser.staffProfile?.joinedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      suspensionLogs: [],
    };

    return { success: true, data: detail };
  }
}

/**
 * 4. Temporarily suspend a staff member with mandatory reason logging.
 * Accessible to ADMIN and CEO.
 */
export async function suspendStaff(
  id: string,
  input: unknown
): Promise<StaffActionResult<{ id: string; status: UserStatus }>> {
  const session = await requireRole("ADMIN", "CEO");

  const parsed = SuspendStaffSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid suspension parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { reason, violationType } = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Staff member not found." },
      };
    }

    // Protection rule: Cannot suspend fellow Admins or CEO via standard staff desk
    const roleName = user.userRoles[0]?.role.name;
    if (roleName === "ADMIN" || roleName === "CEO") {
      return {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Administrative and Executive accounts cannot be suspended through staff management.",
        },
      };
    }

    await db.$transaction([
      db.user.update({
        where: { id },
        data: { status: "SUSPENDED" },
      }),
      db.suspensionLog.create({
        data: {
          userId: id,
          action: "SUSPENDED",
          reason: reason.trim(),
          violationType: violationType || null,
          performedBy: session.user.id,
        },
      }),
      db.authAuditLog.create({
        data: {
          userId: id,
          email: user.email,
          event: "ACCOUNT_SUSPENDED_BLOCK",
          metadata: { reason, violationType, suspendedBy: session.user.id },
        },
      }),
    ]);

    // Mirror to dev store
    const devUser = getDevUserByEmail(user.email);
    if (devUser) {
      devUser.status = "SUSPENDED";
      registerDevUser(devUser);
    }

    revalidatePath("/dashboard/admin/staff");
    invalidateCacheTags(CACHE_TAGS.STAFF_ROSTER, CACHE_TAGS.STAFF_DIRECTORY, CACHE_TAGS.STAFF_CAPACITY);

    return { success: true, data: { id, status: "SUSPENDED" } };
  } catch (dbError) {
    console.warn("[SuspendStaff] DB offline fallback.", dbError);

    const devUsers = Object.values(getDevUsers());
    const devUser = devUsers.find((u) => u.id === id);
    if (devUser) {
      devUser.status = "SUSPENDED";
      registerDevUser(devUser);
      return { success: true, data: { id, status: "SUSPENDED" } };
    }

    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Staff member not found in dev store." },
    };
  }
}

/**
 * 5. Lift an active suspension and restore staff account to ACTIVE.
 * Accessible to ADMIN and CEO.
 */
export async function liftSuspension(
  id: string
): Promise<StaffActionResult<{ id: string; status: UserStatus }>> {
  const session = await requireRole("ADMIN", "CEO");

  try {
    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Staff member not found." },
      };
    }

    const latestSuspension = await db.suspensionLog.findFirst({
      where: { userId: id, action: "SUSPENDED", liftedAt: null },
      orderBy: { performedAt: "desc" },
    });

    await db.$transaction([
      db.user.update({
        where: { id },
        data: { status: "ACTIVE" },
      }),
      latestSuspension
        ? db.suspensionLog.update({
            where: { id: latestSuspension.id },
            data: {
              liftedAt: new Date(),
              liftedBy: session.user.id,
            },
          })
        : db.suspensionLog.create({
            data: {
              userId: id,
              action: "SUSPENSION_LIFTED",
              reason: "Suspension lifted by Administrator / Executive.",
              performedBy: session.user.id,
              liftedAt: new Date(),
              liftedBy: session.user.id,
            },
          }),
    ]);

    // Mirror to dev store
    const devUser = getDevUserByEmail(user.email);
    if (devUser) {
      devUser.status = "ACTIVE";
      registerDevUser(devUser);
    }

    revalidatePath("/dashboard/admin/staff");
    invalidateCacheTags(CACHE_TAGS.STAFF_ROSTER, CACHE_TAGS.STAFF_DIRECTORY, CACHE_TAGS.STAFF_CAPACITY);

    return { success: true, data: { id, status: "ACTIVE" } };
  } catch (dbError) {
    console.warn("[LiftSuspension] DB offline fallback.", dbError);

    const devUsers = Object.values(getDevUsers());
    const devUser = devUsers.find((u) => u.id === id);
    if (devUser) {
      devUser.status = "ACTIVE";
      registerDevUser(devUser);
      return { success: true, data: { id, status: "ACTIVE" } };
    }

    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Staff member not found in dev store." },
    };
  }
}

/**
 * 6. Permanently terminate a staff member.
 * STRICT ENFORCEMENT: Accessible ONLY to CEO role (RULE_ROL_01 / STF-F08).
 */
export async function terminateStaff(
  id: string,
  input: unknown
): Promise<StaffActionResult<{ id: string; status: UserStatus; forfeitPayouts: boolean }>> {
  // Hard RBAC gate: Only CEO can terminate accounts permanently
  const session = await requireRole("CEO");

  const parsed = TerminateStaffSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid termination parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { reason, violationType, forfeitPayouts } = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Staff member not found." },
      };
    }

    await db.$transaction([
      db.user.update({
        where: { id },
        data: { status: "TERMINATED" },
      }),
      db.suspensionLog.create({
        data: {
          userId: id,
          action: "TERMINATED",
          reason: `${reason.trim()}${forfeitPayouts ? " [PAYOUT_FORFEITURE_ENFORCED]" : ""}`,
          violationType: violationType as ViolationType,
          performedBy: session.user.id,
        },
      }),
      db.authAuditLog.create({
        data: {
          userId: id,
          email: user.email,
          event: "ACCOUNT_TERMINATED_BLOCK",
          metadata: { reason, violationType, forfeitPayouts, terminatedBy: session.user.id },
        },
      }),
    ]);

    // Mirror to dev store
    const devUser = getDevUserByEmail(user.email);
    if (devUser) {
      devUser.status = "TERMINATED";
      registerDevUser(devUser);
    }

    revalidatePath("/dashboard/admin/staff");
    invalidateCacheTags(CACHE_TAGS.STAFF_ROSTER, CACHE_TAGS.STAFF_DIRECTORY, CACHE_TAGS.STAFF_CAPACITY);

    return {
      success: true,
      data: { id, status: "TERMINATED", forfeitPayouts },
    };
  } catch (dbError) {
    console.warn("[TerminateStaff] DB offline fallback.", dbError);

    const devUsers = Object.values(getDevUsers());
    const devUser = devUsers.find((u) => u.id === id);
    if (devUser) {
      devUser.status = "TERMINATED";
      registerDevUser(devUser);
      return { success: true, data: { id, status: "TERMINATED", forfeitPayouts } };
    }

    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Staff member not found in dev store." },
    };
  }
}

/**
 * 7. Self-edit own professional profile bio and specialization tags.
 * Accessible to any authenticated staff role.
 */
export async function updateOwnProfile(
  input: unknown
): Promise<StaffActionResult<{ bio: string | null; specializations: string[] }>> {
  const session = await requireRole("STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN", "CEO");

  const parsed = UpdateStaffProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid profile data.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { bio, specializations } = parsed.data;
  const userId = session.user.id;

  try {
    const profile = await db.staffProfile.upsert({
      where: { userId },
      update: {
        bio: bio?.trim() || null,
        specializations,
      },
      create: {
        userId,
        bio: bio?.trim() || null,
        specializations,
      },
    });

    // Mirror to dev store
    const devUser = getDevUserByEmail(session.user.email || "");
    if (devUser) {
      devUser.staffProfile = {
        bio: profile.bio || undefined,
        specializations: profile.specializations,
        updatedAt: new Date().toISOString(),
      };
      registerDevUser(devUser);
    }

    return {
      success: true,
      data: {
        bio: profile.bio,
        specializations: profile.specializations,
      },
    };
  } catch (dbError) {
    console.warn("[UpdateOwnProfile] DB offline fallback.", dbError);

    const devUser = getDevUserByEmail(session.user.email || "");
    if (devUser) {
      devUser.staffProfile = {
        bio: bio?.trim(),
        specializations,
        updatedAt: new Date().toISOString(),
      };
      registerDevUser(devUser);
      return {
        success: true,
        data: {
          bio: bio?.trim() || null,
          specializations,
        },
      };
    }

    return {
      success: false,
      error: { code: "NOT_FOUND", message: "User profile not found in dev store." },
    };
  }
}

/**
 * 8. Retrieve own professional profile data for self-profile editor views.
 * Accessible to any authenticated staff role.
 */
export async function getOwnProfile(): Promise<
  StaffActionResult<{
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    role: RoleName;
    status: UserStatus;
    bio: string | null;
    specializations: string[];
    joinedAt: Date | string;
    updatedAt: Date | string;
    leaveReason?: string | null;
    leaveFrom?: string | null;
    leaveUntil?: string | null;
  }>
> {
  const session = await requireRole("STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN", "CEO");

  try {
    let user = await withDbTimeout(
      db.user.findUnique({
        where: { id: session.user.id },
        include: {
          userRoles: { include: { role: true } },
          staffProfile: true,
        },
      })
    );

    if (!user && session.user.email) {
      user = await withDbTimeout(
        db.user.findUnique({
          where: { email: session.user.email },
          include: {
            userRoles: { include: { role: true } },
            staffProfile: true,
          },
        })
      );
    }

    if (user) {
      const primaryRole = (user.userRoles[0]?.role.name as RoleName) || (session.user.role as RoleName);
      return {
        success: true,
        data: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: primaryRole,
          status: user.status,
          bio: user.staffProfile?.bio || null,
          specializations: user.staffProfile?.specializations || [],
          joinedAt: user.staffProfile?.joinedAt || user.createdAt,
          updatedAt: user.staffProfile?.updatedAt || user.updatedAt,
          leaveReason: user.leaveReason,
          leaveFrom: user.leaveFrom?.toISOString() || null,
          leaveUntil: user.leaveUntil?.toISOString() || null,
        },
      };
    }
  } catch (dbError) {
    console.warn("[GetOwnProfile] DB offline fallback.", dbError);
  }

  const devUser = getDevUserByEmail(session.user.email || "");
  if (devUser) {
    return {
      success: true,
      data: {
        id: devUser.id,
        fullName: devUser.fullName,
        email: devUser.email,
        phone: null,
        role: devUser.role,
        status: devUser.status,
        bio: devUser.staffProfile?.bio || null,
        specializations: devUser.staffProfile?.specializations || [],
        joinedAt: devUser.staffProfile?.joinedAt || new Date().toISOString(),
        updatedAt: devUser.staffProfile?.updatedAt || new Date().toISOString(),
      },
    };
  }

  return {
    success: false,
    error: { code: "NOT_FOUND", message: "User profile not found." },
  };
}

/**
 * Consolidated cache invalidation & path revalidation for staff status & leave mutations.
 */
function revalidateStaffCaches(): void {
  invalidateCacheTags(CACHE_TAGS.STAFF_ROSTER, CACHE_TAGS.STAFF_DIRECTORY, CACHE_TAGS.STAFF_CAPACITY);
  revalidatePath("/dashboard/staff/hr");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/finance/leaves");
  revalidatePath("/dashboard/admin/staff");
  revalidatePath("/dashboard/admin/assignments");
  revalidatePath("/dashboard/statistician");
  revalidatePath("/dashboard/qa");
}

export async function getStaffSelfProfile() {
  return getOwnProfile();
}

/**
 * 9. Request or set a specialist on leave.
 * Accessible to the specialist themselves or to ADMIN/CEO.
 */
export async function requestLeave(
  input: unknown
): Promise<StaffActionResult<{ id: string; status: UserStatus; leaveUntil?: string | null }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  const parsed = RequestLeaveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid leave parameters.", fieldErrors: parsed.error.flatten().fieldErrors },
    };
  }

  const { userId, reason, leaveFrom, leaveUntil } = parsed.data;
  const targetUserId = userId || session.user.id;

  // Authorization check: self, or management (ADMIN, CEO, FINANCE_OFFICER / HR)
  const isManager =
    session.user.role === "ADMIN" ||
    session.user.role === "CEO" ||
    session.user.role === "FINANCE_OFFICER";
  if (targetUserId !== session.user.id && !isManager) {
    return { success: false, error: { code: "FORBIDDEN", message: "You cannot manage leave for other staff members." } };
  }

  // Formal 2-Step Flow:
  // - Direct Admin/HR placement on someone else: immediate ON_LEAVE
  // - Specialist requesting leave for themselves: LEAVE_PENDING awaiting HR/Finance acknowledgement
  const isDirectManagerAction = isManager && Boolean(userId && userId !== session.user.id);
  const targetStatus: UserStatus = isDirectManagerAction ? "ON_LEAVE" : "LEAVE_PENDING";

  try {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const fromDate = leaveFrom ? new Date(leaveFrom) : new Date();
    const untilDate = leaveUntil ? new Date(leaveUntil) : null;

    // Prevent past start dates (allow today)
    const fromMidnight = new Date(fromDate);
    fromMidnight.setHours(0, 0, 0, 0);
    if (fromMidnight.getTime() < todayMidnight.getTime()) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Leave start date cannot be in the past." },
      };
    }

    // Prevent return date earlier than start date
    if (untilDate) {
      const untilMidnight = new Date(untilDate);
      untilMidnight.setHours(0, 0, 0, 0);
      if (untilMidnight.getTime() < fromMidnight.getTime()) {
        return {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Expected return date cannot be earlier than leave start date." },
        };
      }
    }

    // Prevent submitting overlapping or duplicate active/pending leaves
    const existing = await withDbTimeout(
      db.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, status: true, leaveFrom: true, leaveUntil: true },
      })
    );

    if (existing && (existing.status === "ON_LEAVE" || existing.status === "LEAVE_PENDING")) {
      const statusLabel = existing.status === "ON_LEAVE" ? "an active scheduled leave" : "a pending leave application";
      return {
        success: false,
        error: {
          code: "CONFLICT",
          message: `You already have ${statusLabel} on file. Please withdraw or conclude it before scheduling a new leave.`,
        },
      };
    }

    const updated = await db.user.update({
      where: { id: targetUserId },
      data: {
        status: targetStatus,
        leaveReason: reason,
        leaveFrom: fromDate,
        leaveUntil: untilDate,
      },
    });

    const devUser = getDevUserByEmail(updated.email);
    if (devUser) {
      devUser.status = targetStatus;
      registerDevUser(devUser);
    }

    revalidateStaffCaches();

    return {
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        leaveUntil: updated.leaveUntil?.toISOString() || null,
      },
    };
  } catch (err: unknown) {
    console.error("[requestLeave] Error:", err);
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}

/**
 * 10. Return a specialist from leave or withdraw a pending leave request back to ACTIVE duty.
 * Accessible to the specialist themselves or to ADMIN/CEO/FINANCE_OFFICER.
 */
export async function returnFromLeave(
  userId?: string
): Promise<StaffActionResult<{ id: string; status: UserStatus }>> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  const targetUserId = userId || session?.user?.id;
  const isManager =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "CEO" ||
    session?.user?.role === "FINANCE_OFFICER";

  if (userId && userId !== session?.user?.id && !isManager) {
    return { success: false, error: { code: "FORBIDDEN", message: "You cannot manage leave for other staff members." } };
  }

  try {
    let user = targetUserId ? await db.user.findUnique({ where: { id: targetUserId } }) : null;
    if (!user && session?.user?.email && !userId) {
      user = await db.user.findUnique({ where: { email: session.user.email } });
    }

    if (user) {
      const updated = await db.user.update({
        where: { id: user.id },
        data: {
          status: "ACTIVE",
          leaveReason: null,
          leaveFrom: null,
          leaveUntil: null,
        },
      });

      // Also sync dev user store if present
      const devUser = getDevUserByEmail(user.email);
      if (devUser) {
        devUser.status = "ACTIVE";
        registerDevUser(devUser);
      }

      revalidateStaffCaches();

      return {
        success: true,
        data: { id: updated.id, status: updated.status },
      };
    }
  } catch (err: unknown) {
    console.warn("[returnFromLeave] DB update error, attempting dev store sync:", err);
  }

  // Fallback for dev / offline mode
  const email = session?.user?.email;
  if (email) {
    const devUser = getDevUserByEmail(email);
    if (devUser) {
      devUser.status = "ACTIVE";
      registerDevUser(devUser);

      revalidateStaffCaches();

      return {
        success: true,
        data: { id: devUser.id, status: "ACTIVE" },
      };
    }
  }

  return { success: false, error: { code: "NOT_FOUND", message: "User account could not be located." } };
}

/**
 * 11. Retrieve all pending leave requests for Finance Officer (HR) and Admin review.
 */
export async function getPendingLeaves(): Promise<StaffActionResult<PendingLeaveItem[]>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  const isManager =
    session.user.role === "ADMIN" ||
    session.user.role === "CEO" ||
    session.user.role === "FINANCE_OFFICER";

  if (!isManager) {
    return { success: false, error: { code: "FORBIDDEN", message: "Only Finance Officer (HR) and Administrators can review pending leaves." } };
  }

  try {
    const pendingUsers = await db.user.findMany({
      where: { status: "LEAVE_PENDING" },
      select: {
        id: true,
        fullName: true,
        email: true,
        leaveReason: true,
        leaveFrom: true,
        leaveUntil: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const items: PendingLeaveItem[] = pendingUsers.map((u) => {
      const role = (u.userRoles[0]?.role.name as RoleName) || "STATISTICIAN";
      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role,
        leaveReason: u.leaveReason,
        leaveFrom: u.leaveFrom,
        leaveUntil: u.leaveUntil,
        updatedAt: u.updatedAt,
      };
    });

    return { success: true, data: items };
  } catch (err: unknown) {
    console.error("[getPendingLeaves] Error:", err);
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}

/**
 * 12. Acknowledge and approve a specialist's pending leave request.
 * Authorized for Finance Officer (HR), Admin, and CEO.
 * Sets status to ON_LEAVE and hides specialist from Module 08 assignment intake.
 */
export async function approveLeave(
  userId: string
): Promise<StaffActionResult<{ id: string; status: UserStatus }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  const isManager =
    session.user.role === "ADMIN" ||
    session.user.role === "CEO" ||
    session.user.role === "FINANCE_OFFICER";

  if (!isManager) {
    return { success: false, error: { code: "FORBIDDEN", message: "Only Finance Officer (HR) and Administrators can approve leaves." } };
  }

  try {
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        status: "ON_LEAVE",
      },
    });

    const devUser = getDevUserByEmail(updated.email);
    if (devUser) {
      devUser.status = "ON_LEAVE";
      registerDevUser(devUser);
    }

    revalidateStaffCaches();

    return {
      success: true,
      data: { id: updated.id, status: updated.status },
    };
  } catch (err: unknown) {
    console.error("[approveLeave] Error:", err);
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}

/**
 * 13. Decline/reject a specialist's pending leave request.
 * Reverts status back to ACTIVE and clears leave attributes.
 */
export async function rejectLeave(
  userId: string
): Promise<StaffActionResult<{ id: string; status: UserStatus }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  const isManager =
    session.user.role === "ADMIN" ||
    session.user.role === "CEO" ||
    session.user.role === "FINANCE_OFFICER";

  if (!isManager) {
    return { success: false, error: { code: "FORBIDDEN", message: "Only Finance Officer (HR) and Administrators can reject leaves." } };
  }

  try {
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        leaveReason: null,
        leaveFrom: null,
        leaveUntil: null,
      },
    });

    const devUser = getDevUserByEmail(updated.email);
    if (devUser) {
      devUser.status = "ACTIVE";
      registerDevUser(devUser);
    }

    revalidateStaffCaches();

    return {
      success: true,
      data: { id: updated.id, status: updated.status },
    };
  } catch (err: unknown) {
    console.error("[rejectLeave] Error:", err);
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}

/**
 * 14. Retrieve comprehensive specialist leave overview data for Finance HR and Operations.
 * Accessible to FINANCE_OFFICER, ADMIN, and CEO.
 */
export async function getSpecialistLeaveOverview(): Promise<StaffActionResult<SpecialistLeaveOverviewData>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in." } };
  }

  const isManager =
    session.user.role === "ADMIN" ||
    session.user.role === "CEO" ||
    session.user.role === "FINANCE_OFFICER";

  if (!isManager) {
    return { success: false, error: { code: "FORBIDDEN", message: "Only Finance Officer (HR) and Administrators can view specialist leave data." } };
  }

  try {
    const specialists = await db.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: { in: ["STATISTICIAN", "SENIOR_QA_LEAD"] },
            },
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        leaveReason: true,
        leaveFrom: true,
        leaveUntil: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: { name: true },
            },
          },
        },
        staffProfile: {
          select: {
            specializations: true,
            bio: true,
            joinedAt: true,
          },
        },
        statisticianAssignments: {
          where: { isActive: true },
          select: { id: true },
        },
        qaAssignments: {
          where: { isActive: true },
          select: { id: true },
        },
      },
      orderBy: [
        { status: "asc" },
        { fullName: "asc" },
      ],
    });

    const pendingLeaves: PendingLeaveItem[] = [];
    const specialistList: StaffListItem[] = [];

    let activeCount = 0;
    let pendingCount = 0;
    let onLeaveCount = 0;

    for (const u of specialists) {
      const role = (u.userRoles[0]?.role.name as RoleName) || "STATISTICIAN";
      const isStat = role === "STATISTICIAN";
      const activeAssignments = isStat ? u.statisticianAssignments.length : u.qaAssignments.length;

      if (u.status === "ACTIVE") activeCount++;
      else if (u.status === "LEAVE_PENDING") pendingCount++;
      else if (u.status === "ON_LEAVE") onLeaveCount++;

      if (u.status === "LEAVE_PENDING") {
        pendingLeaves.push({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role,
          leaveReason: u.leaveReason,
          leaveFrom: u.leaveFrom,
          leaveUntil: u.leaveUntil,
          updatedAt: u.updatedAt,
        });
      }

      specialistList.push({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role,
        status: u.status,
        specializations: u.staffProfile?.specializations || [],
        bio: u.staffProfile?.bio || null,
        activeProjectsCount: activeAssignments,
        joinedAt: u.staffProfile?.joinedAt || u.createdAt,
        leaveReason: u.leaveReason,
        leaveFrom: u.leaveFrom,
        leaveUntil: u.leaveUntil,
      });
    }

    return {
      success: true,
      data: {
        kpis: {
          totalSpecialists: specialists.length,
          activeCount,
          pendingCount,
          onLeaveCount,
        },
        pendingLeaves,
        specialists: specialistList,
      },
    };
  } catch (err: unknown) {
    console.error("[getSpecialistLeaveOverview] Error:", err);
    return { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } };
  }
}
