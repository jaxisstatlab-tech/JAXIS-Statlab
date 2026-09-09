"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import fs from "fs";
import path from "path";
import { db, withDbTimeout } from "@/lib/db";
import { requireRole, auth } from "@/lib/auth";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache-tags";
import type { RoleName } from "@prisma/client";
import {
  RoleCompensationConfigSchema,
  StaffCompensationOverrideSchema,
  CorporatePayrollScheduleConfigSchema,
  GeneratePayrollBatchSchema,
  DisbursePayslipSchema,
  StaffPayoutDetailsSchema,
  type RoleCompensationConfigDTO,
  type StaffCompensationOverrideDTO,
  type CorporatePayrollScheduleConfigDTO,
  type StaffPayslipDTO,
  type StaffPayoutDetailsDTO,
  type PayrollKpiSummary,
  type PayslipItemizedStudy,
} from "./schemas";
import { getDevUsers } from "@/lib/mock-data/users.data";

const DEV_DATA_DIR = path.join(process.cwd(), "dev_data");
const CONFIGS_FILE = path.join(DEV_DATA_DIR, "payroll_configs.json");
const PAYSLIPS_FILE = path.join(DEV_DATA_DIR, "payslips.json");
const PAYOUT_DETAILS_FILE = path.join(DEV_DATA_DIR, "payout_details.json");

function ensureDevDataDir() {
  if (!fs.existsSync(DEV_DATA_DIR)) {
    fs.mkdirSync(DEV_DATA_DIR, { recursive: true });
  }
}

const DEFAULT_SCHEDULE_CONFIG: CorporatePayrollScheduleConfigDTO = {
  frequency: "SEMI_MONTHLY",
  firstCutoffDay: 15,
  secondCutoffDay: 31,
  prorateMonthlyBase: true,
  disbursementGraceDays: 3,
  notes: "Standard Semi-Monthly Corporate Settlement Schedule (Days 1–15 & Days 16–End)",
  updatedAt: new Date().toISOString(),
  updatedBy: "Executive CEO Office",
};

interface PayrollStorage {
  roleConfigs: Record<string, RoleCompensationConfigDTO>;
  staffOverrides: Record<string, StaffCompensationOverrideDTO>;
  scheduleConfig?: CorporatePayrollScheduleConfigDTO;
}

const DEFAULT_ROLE_CONFIGS: Record<string, RoleCompensationConfigDTO> = {
  STATISTICIAN: {
    roleName: "STATISTICIAN",
    compensationType: "PERCENTAGE_PER_STUDY",
    baseSalaryMonthly: 0,
    commissionPercentagePerStudy: 50.0,
    hourlyDutyRate: 450.0,
    fixedPerStudyBonus: 1000.0,
    allowancesMonthly: 2500.0,
    isActive: true,
    notes: "50% commission of total research study contract value + ₱450/hr compute duty + ₱1,000 completion bonus.",
    updatedAt: new Date().toISOString(),
    updatedBy: "CEO Owner",
  },
  SENIOR_QA_LEAD: {
    roleName: "SENIOR_QA_LEAD",
    compensationType: "HYBRID",
    baseSalaryMonthly: 12000.0,
    commissionPercentagePerStudy: 10.0,
    hourlyDutyRate: 450.0,
    fixedPerStudyBonus: 500.0,
    allowancesMonthly: 2500.0,
    isActive: true,
    notes: "₱12,000 monthly retainer + 10% review commission per audited study + ₱450/hr attendance duty.",
    updatedAt: new Date().toISOString(),
    updatedBy: "CEO Owner",
  },
  FINANCE_OFFICER: {
    roleName: "FINANCE_OFFICER",
    compensationType: "FIXED_SALARY",
    baseSalaryMonthly: 35000.0,
    commissionPercentagePerStudy: 0,
    hourlyDutyRate: 0,
    fixedPerStudyBonus: 0,
    allowancesMonthly: 3000.0,
    isActive: true,
    notes: "Institutional monthly base salary with treasury compliance allowances.",
    updatedAt: new Date().toISOString(),
    updatedBy: "CEO Owner",
  },
  ADMIN: {
    roleName: "ADMIN",
    compensationType: "FIXED_SALARY",
    baseSalaryMonthly: 40000.0,
    commissionPercentagePerStudy: 0,
    hourlyDutyRate: 0,
    fixedPerStudyBonus: 0,
    allowancesMonthly: 3000.0,
    isActive: true,
    notes: "Operational administrative management fixed salary.",
    updatedAt: new Date().toISOString(),
    updatedBy: "CEO Owner",
  },
};

function readPayrollStorage(): PayrollStorage {
  ensureDevDataDir();
  try {
    if (fs.existsSync(CONFIGS_FILE)) {
      const data = fs.readFileSync(CONFIGS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("[readPayrollStorage] Failed to read configs file, using defaults", err);
  }
  const initial = {
    roleConfigs: DEFAULT_ROLE_CONFIGS,
    staffOverrides: {},
  };
  writePayrollStorage(initial);
  return initial;
}

function writePayrollStorage(data: PayrollStorage): void {
  ensureDevDataDir();
  try {
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[writePayrollStorage] Failed to write payroll configs", err);
  }
}

function readPayslipsStorage(): StaffPayslipDTO[] {
  ensureDevDataDir();
  try {
    if (fs.existsSync(PAYSLIPS_FILE)) {
      const data = fs.readFileSync(PAYSLIPS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("[readPayslipsStorage] Failed to read payslips file", err);
  }
  return [];
}

function writePayslipsStorage(data: StaffPayslipDTO[]): void {
  ensureDevDataDir();
  try {
    fs.writeFileSync(PAYSLIPS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[writePayslipsStorage] Failed to write payslips", err);
  }
}

function readPayoutDetailsStorage(): Record<string, StaffPayoutDetailsDTO> {
  ensureDevDataDir();
  try {
    if (fs.existsSync(PAYOUT_DETAILS_FILE)) {
      const data = fs.readFileSync(PAYOUT_DETAILS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("[readPayoutDetailsStorage] Failed to read payout details file", err);
  }
  return {};
}

function writePayoutDetailsStorage(data: Record<string, StaffPayoutDetailsDTO>): void {
  ensureDevDataDir();
  try {
    fs.writeFileSync(PAYOUT_DETAILS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[writePayoutDetailsStorage] Failed to write payout details", err);
  }
}

function findPayoutDetailsForStaff(
  storage: Record<string, StaffPayoutDetailsDTO>,
  userId: string,
  staffName?: string
): StaffPayoutDetailsDTO | null {
  if (storage[userId]) return storage[userId]!;
  const all = Object.values(storage);
  const byUser = all.find((d) => d.userId === userId);
  if (byUser) return byUser;
  if (staffName) {
    const sNameLower = staffName.toLowerCase();
    const byName = all.find(
      (d) =>
        d.accountName.toLowerCase().includes(sNameLower) ||
        sNameLower.includes(d.accountName.toLowerCase())
    );
    if (byName) return byName;
  }
  return null;
}

/**
 * Cached DB queries for signatories and staff directory.
 * Invalidation tag: staff-directory
 */
const fetchCachedSignatoriesDb = unstable_cache(
  async () => {
    try {
      return await withDbTimeout(
        db.user.findMany({
          where: {
            userRoles: {
              some: {
                role: {
                  name: { in: ["CEO", "FINANCE_OFFICER", "ADMIN"] },
                },
              },
            },
          },
          select: {
            fullName: true,
            userRoles: {
              select: {
                role: {
                  select: { name: true },
                },
              },
            },
          },
        }),
        1500
      );
    } catch {
      return [];
    }
  },
  ["payroll-signatories-db"],
  { revalidate: 60, tags: [CACHE_TAGS.STAFF_DIRECTORY] }
);

const fetchCachedStaffMembersDb = unstable_cache(
  async () => {
    const targetRoles: RoleName[] = ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN"];
    try {
      return await withDbTimeout(
        db.user.findMany({
          where: {
            userRoles: {
              some: {
                role: {
                  name: { in: targetRoles },
                },
              },
            },
          },
          include: {
            userRoles: { include: { role: true } },
          },
        }),
        3000
      );
    } catch {
      return [];
    }
  },
  ["payroll-staff-members-db"],
  { revalidate: 60, tags: [CACHE_TAGS.STAFF_DIRECTORY] }
);

export async function getSignatoryDetails(): Promise<{ ceoName: string; financeName: string; adminName: string }> {
  let ceoName = "CEO Owner";
  let financeName = "Finance Officer";
  let adminName = "Prof. Sofia Benitez";

  const payoutStorage = readPayoutDetailsStorage();
  for (const entry of Object.values(payoutStorage)) {
    if (entry.userId === "cmt5pluuu0001lrrk1qu1ul1t" || entry.accountName.toLowerCase().includes("ceo")) {
      ceoName = entry.accountName;
    }
    if (
      entry.userId === "cmt5plt6q0002lrrkr5jnsghs" ||
      entry.userId === "cmt5pluuu0005lrrk6qu6ul2t" ||
      entry.accountName.toLowerCase().includes("finance")
    ) {
      financeName = entry.accountName;
    }
    if (
      entry.userId === "usr_dev_admin_001" ||
      entry.userId === "cmt5plsb20001lrrk0w684oz0" ||
      entry.notes?.toLowerCase().includes("admin") ||
      entry.accountName.includes("Sofia")
    ) {
      adminName = entry.accountName;
    }
  }

  const users = await fetchCachedSignatoriesDb();

  if (users.length > 0) {
    for (const u of users) {
      const roleNames = u.userRoles.map((ur) => ur.role.name);
      if (roleNames.includes("CEO") && u.fullName) ceoName = u.fullName;
      if (roleNames.includes("FINANCE_OFFICER") && u.fullName) financeName = u.fullName;
      if (roleNames.includes("ADMIN") && u.fullName) adminName = u.fullName;
    }
  } else {
    const devUsers = getDevUsers();
    const ceoDev = Object.values(devUsers).find((u) => u.role === "CEO");
    if (ceoDev) ceoName = ceoDev.fullName;
    const finDev = Object.values(devUsers).find((u) => u.role === "FINANCE_OFFICER");
    if (finDev) financeName = finDev.fullName;
    const admDev = Object.values(devUsers).find((u) => u.role === "ADMIN");
    if (admDev) adminName = admDev.fullName;
  }
  return { ceoName, financeName, adminName };
}

export interface InternalStaffMember {
  id: string;
  fullName: string;
  email: string;
  role: RoleName;
  status: string;
  overrideConfig?: StaffCompensationOverrideDTO | null;
  effectiveConfig: RoleCompensationConfigDTO | StaffCompensationOverrideDTO;
  payoutDetails?: StaffPayoutDetailsDTO | null;
}

/**
 * 1. Fetch all payroll configuration models (role defaults + specialist overrides + internal staff directory).
 * Accessible to CEO, FINANCE_OFFICER, and ADMIN.
 */
export async function getPayrollConfigurations(): Promise<{
  roleConfigs: RoleCompensationConfigDTO[];
  staffOverrides: StaffCompensationOverrideDTO[];
  staffMembers: InternalStaffMember[];
  scheduleConfig: CorporatePayrollScheduleConfigDTO;
}> {
  await requireRole("CEO", "FINANCE_OFFICER", "ADMIN");
  const storage = readPayrollStorage();
  const payoutStorage = readPayoutDetailsStorage();

  // Load internal staff users
  const staffMembers: InternalStaffMember[] = [];
  const targetRoles: RoleName[] = ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN"];

  // 1. Check DB users
  const dbUsers = await fetchCachedStaffMembersDb();

  const registeredEmails = new Set<string>();

  for (const u of dbUsers) {
    registeredEmails.add(u.email.toLowerCase());
    const role = (u.userRoles[0]?.role.name as RoleName) || "STATISTICIAN";
    const override = storage.staffOverrides[u.id] || null;
    const roleConfig = storage.roleConfigs[role] || DEFAULT_ROLE_CONFIGS[role]!;
    staffMembers.push({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role,
      status: u.status,
      overrideConfig: override,
      effectiveConfig: override || roleConfig,
      payoutDetails: findPayoutDetailsForStaff(payoutStorage, u.id, u.fullName),
    });
  }

  // 2. Include dev users fallback
  const devUsers = getDevUsers();
  for (const du of Object.values(devUsers)) {
    if (!registeredEmails.has(du.email.toLowerCase()) && targetRoles.includes(du.role)) {
      registeredEmails.add(du.email.toLowerCase());
      const override = storage.staffOverrides[du.id] || null;
      const roleConfig = storage.roleConfigs[du.role] || DEFAULT_ROLE_CONFIGS[du.role]!;
      staffMembers.push({
        id: du.id,
        fullName: du.fullName,
        email: du.email,
        role: du.role,
        status: du.status,
        overrideConfig: override,
        effectiveConfig: override || roleConfig,
        payoutDetails: findPayoutDetailsForStaff(payoutStorage, du.id, du.fullName),
      });
    }
  }

  return {
    roleConfigs: Object.values(storage.roleConfigs),
    staffOverrides: Object.values(storage.staffOverrides),
    staffMembers,
    scheduleConfig: storage.scheduleConfig || DEFAULT_SCHEDULE_CONFIG,
  };
}

/**
 * Save Corporate Payroll Schedule (CEO-only).
 * Configures settlement frequency (Semi-Monthly / Monthly / Bi-Weekly), cutoff boundaries, and proration.
 */
export async function saveCompanyPayrollSchedule(
  input: unknown
): Promise<{ success: boolean; config?: CorporatePayrollScheduleConfigDTO; error?: { message: string } }> {
  const session = await requireRole("CEO");
  const parsed = CorporatePayrollScheduleConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { message: parsed.error.issues[0]?.message || "Invalid schedule parameters." },
    };
  }

  const storage = readPayrollStorage();
  const dto: CorporatePayrollScheduleConfigDTO = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
    updatedBy: session.user?.name || "CEO Executive Office",
  };
  storage.scheduleConfig = dto;
  writePayrollStorage(storage);

  revalidatePath("/dashboard/ceo/payroll");
  revalidatePath("/dashboard/finance/payroll");
  revalidatePath("/dashboard/staff/hr");
  invalidateCacheTags(CACHE_TAGS.PAYROLL, CACHE_TAGS.STAFF_DIRECTORY);

  return { success: true, config: dto };
}

/**
 * 2. CEO-Only: Save or update role compensation model and numeric parameters.
 */
export async function saveRoleCompensationConfig(
  input: unknown
): Promise<{ success: boolean; data?: RoleCompensationConfigDTO; error?: { message: string } }> {
  const session = await requireRole("CEO");
  const parsed = RoleCompensationConfigSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: { message: parsed.error.issues[0]?.message || "Invalid compensation parameters." },
    };
  }

  const storage = readPayrollStorage();
  const updatedDTO: RoleCompensationConfigDTO = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
    updatedBy: session.user.fullName || "CEO Owner",
  };

  storage.roleConfigs[parsed.data.roleName] = updatedDTO;
  writePayrollStorage(storage);

  revalidatePath("/dashboard/ceo/payroll");
  revalidatePath("/dashboard/finance/payroll");
  revalidatePath("/dashboard/staff/hr");
  invalidateCacheTags(CACHE_TAGS.PAYROLL, CACHE_TAGS.STAFF_DIRECTORY);

  return { success: true, data: updatedDTO };
}

/**
 * 3. CEO-Only: Save or update individual specialist compensation override.
 */
export async function saveStaffCompensationOverride(
  input: unknown
): Promise<{ success: boolean; data?: StaffCompensationOverrideDTO; error?: { message: string } }> {
  const session = await requireRole("CEO");
  const parsed = StaffCompensationOverrideSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: { message: parsed.error.issues[0]?.message || "Invalid override parameters." },
    };
  }

  const storage = readPayrollStorage();
  const overrideDTO: StaffCompensationOverrideDTO = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
    updatedBy: session.user.fullName || "CEO Owner",
  };

  storage.staffOverrides[parsed.data.userId] = overrideDTO;
  writePayrollStorage(storage);

  revalidatePath("/dashboard/ceo/payroll");
  revalidatePath("/dashboard/finance/payroll");
  revalidatePath("/dashboard/staff/hr");
  invalidateCacheTags(CACHE_TAGS.PAYROLL, CACHE_TAGS.STAFF_DIRECTORY);

  return { success: true, data: overrideDTO };
}

/**
 * 4. CEO-Only: Remove custom override for a specialist, reverting to role default.
 */
export async function deleteStaffCompensationOverride(
  userId: string
): Promise<{ success: boolean }> {
  await requireRole("CEO");
  const storage = readPayrollStorage();
  delete storage.staffOverrides[userId];
  writePayrollStorage(storage);

  revalidatePath("/dashboard/ceo/payroll");
  revalidatePath("/dashboard/finance/payroll");
  revalidatePath("/dashboard/staff/hr");
  invalidateCacheTags(CACHE_TAGS.PAYROLL, CACHE_TAGS.STAFF_DIRECTORY);

  return { success: true };
}

/**
 * 5. Batch Payroll Generator (Accessible to Finance Officer & CEO).
 * Computes official itemized payslips for all active internal staff for the specified cut-off.
 */
export async function generateBatchPayslips(
  input: unknown
): Promise<{ success: boolean; count?: number; error?: { message: string } }> {
  const session = await requireRole("FINANCE_OFFICER", "CEO");
  const parsed = GeneratePayrollBatchSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: { message: parsed.error.issues[0]?.message || "Invalid pay period parameters." },
    };
  }

  const { payPeriodMonth, payPeriodStart, payPeriodEnd, cutOffCycle = "FIRST_HALF" } = parsed.data;
  const { staffMembers } = await getPayrollConfigurations();
  const startDate = new Date(payPeriodStart);
  const endDate = new Date(payPeriodEnd);

  const isHalfMonth = cutOffCycle === "FIRST_HALF" || cutOffCycle === "SECOND_HALF";
  const prorationMultiplier = isHalfMonth ? 0.5 : 1.0;

  // Format formal cycle label for payslip
  let formalPeriodLabel = payPeriodMonth;
  if (cutOffCycle === "FIRST_HALF") {
    formalPeriodLabel = `${payPeriodMonth} (First Half-Month Cycle: Days 1–15)`;
  } else if (cutOffCycle === "SECOND_HALF") {
    formalPeriodLabel = `${payPeriodMonth} (Second Half-Month Cycle: Days 16–End)`;
  } else if (cutOffCycle === "FULL_MONTH") {
    formalPeriodLabel = `${payPeriodMonth} (Full Month Cycle)`;
  }

  // Load existing payslips
  const existingPayslips = readPayslipsStorage();
  const { ceoName } = await getSignatoryDetails();

  // Load attendance logs and assignments concurrently
  let attendanceLogs: { userId: string; totalMinutes: number | null; status: string; clockInAt: Date }[] = [];
  let assignments: {
    projectId: string;
    statisticianId: string;
    qaLeadId: string;
    project: { id: string; intakeId: string; researchTitle: string; masterStatus: string; packageName: string | null };
  }[] = [];

  try {
    const [attRes, assignRes] = await Promise.all([
      withDbTimeout(
        db.staffAttendanceLog.findMany({
          where: {
            clockInAt: { gte: startDate, lte: endDate },
            status: { in: ["COMPLETED", "ADJUSTED", "AUTO_CLOSED"] },
          },
          select: { userId: true, totalMinutes: true, status: true, clockInAt: true },
        }),
        3000
      ),
      withDbTimeout(
        db.assignment.findMany({
          include: {
            project: {
              select: { id: true, intakeId: true, researchTitle: true, masterStatus: true, packageName: true },
            },
          },
        }),
        3000
      ),
    ]);
    attendanceLogs = attRes;
    assignments = assignRes;
  } catch {
    // fallback
  }

  // Also check dev-projects.json if assignments is empty
  if (assignments.length === 0) {
    try {
      const devProjPath = path.join(process.cwd(), ".dev-projects.json");
      if (fs.existsSync(devProjPath)) {
        const rawProjs = JSON.parse(fs.readFileSync(devProjPath, "utf-8"));
        // Create mock assignment links for active studies
        for (const p of rawProjs) {
          assignments.push({
            projectId: p.id,
            statisticianId: "usr_dev_stat_001",
            qaLeadId: "usr_dev_qa_001",
            project: {
              id: p.id,
              intakeId: p.intakeId || "JAXIS-202608-0001",
              researchTitle: p.researchTitle || "Multivariate Empirical Analysis",
              masterStatus: p.masterStatus || "DELIVERED",
              packageName: p.packageName || "JX_03_CORE",
            },
          });
        }
      }
    } catch {
      // ignore
    }
  }

  const PACKAGE_ESTIMATED_VALUE: Record<string, number> = {
    JX_01_DATACHECK: 8500.0,
    JX_02_START: 16500.0,
    JX_03_CORE: 28500.0,
    JX_04_ADVANCED: 48000.0,
    DEFENSELAB: 15000.0,
  };

  const nowStr = new Date().toISOString();

  let counter = existingPayslips.length + 1;

  for (const staff of staffMembers) {
    const config = staff.effectiveConfig;

    // 1. Calculate verified duty hours
    const staffLogs = attendanceLogs.filter((l) => l.userId === staff.id);
    const totalMinutes = staffLogs.reduce((sum, l) => sum + (l.totalMinutes || 0), 0);
    // If 0 logs in DB for dev demo, supply realistic baseline prorated for half-month
    const defaultBaseline = staff.role === "STATISTICIAN" ? 42.5 : staff.role === "SENIOR_QA_LEAD" ? 36.0 : 80.0;
    const verifiedDutyHours = totalMinutes > 0
      ? Math.round((totalMinutes / 60) * 10) / 10
      : Math.round(defaultBaseline * prorationMultiplier * 10) / 10;
    const overtimeHours = staffLogs.filter((l) => (l.totalMinutes || 0) > 510).length * 1.5;

    // 2. Calculate studies completed
    const itemizedStudies: PayslipItemizedStudy[] = [];
    if (staff.role === "STATISTICIAN") {
      const assigned = assignments.filter((a) => a.statisticianId === staff.id);
      // Fallback if none specifically linked
      const studiesToCount = assigned.length > 0 ? assigned : assignments.slice(0, 2);
      for (const a of studiesToCount) {
        const grossAmount = PACKAGE_ESTIMATED_VALUE[a.project.packageName || "JX_03_CORE"] || 28500.0;
        const commPct = config.commissionPercentagePerStudy || 50.0;
        const commEarned = (grossAmount * commPct) / 100 + (config.fixedPerStudyBonus || 0);
        itemizedStudies.push({
          projectId: a.projectId,
          intakeId: a.project.intakeId,
          researchTitle: a.project.researchTitle,
          grossAmount,
          commissionPercentage: commPct,
          commissionEarned: Math.round(commEarned * 100) / 100,
          status: a.project.masterStatus,
        });
      }
    } else if (staff.role === "SENIOR_QA_LEAD") {
      const assigned = assignments.filter((a) => a.qaLeadId === staff.id);
      const studiesToCount = assigned.length > 0 ? assigned : assignments.slice(0, 3);
      for (const a of studiesToCount) {
        const grossAmount = PACKAGE_ESTIMATED_VALUE[a.project.packageName || "JX_03_CORE"] || 28500.0;
        const commPct = config.commissionPercentagePerStudy || 10.0;
        const commEarned = (grossAmount * commPct) / 100 + (config.fixedPerStudyBonus || 0);
        itemizedStudies.push({
          projectId: a.projectId,
          intakeId: a.project.intakeId,
          researchTitle: a.project.researchTitle,
          grossAmount,
          commissionPercentage: commPct,
          commissionEarned: Math.round(commEarned * 100) / 100,
          status: a.project.masterStatus,
        });
      }
    } else if (staff.role === "ADMIN" || staff.role === "FINANCE_OFFICER") {
      if (config.compensationType === "PERCENTAGE_PER_STUDY" || config.compensationType === "HYBRID") {
        const studiesToCount = assignments.slice(0, 3);
        const commPct = config.commissionPercentagePerStudy || (staff.role === "ADMIN" ? 5.0 : 3.0);
        for (const a of studiesToCount) {
          const grossAmount = PACKAGE_ESTIMATED_VALUE[a.project.packageName || "JX_03_CORE"] || 28500.0;
          const commEarned = (grossAmount * commPct) / 100 + (config.fixedPerStudyBonus || 0);
          itemizedStudies.push({
            projectId: a.projectId,
            intakeId: a.project.intakeId,
            researchTitle: a.project.researchTitle,
            grossAmount,
            commissionPercentage: commPct,
            commissionEarned: Math.round(commEarned * 100) / 100,
            status: a.project.masterStatus,
          });
        }
      }
    }

    const completedStudiesGrossValue = itemizedStudies.reduce((sum, s) => sum + s.grossAmount, 0);
    const commissionEarnings = itemizedStudies.reduce((sum, s) => sum + s.commissionEarned, 0);

    // 3. Compensation Math (with Semi-Monthly 50% Proration for Fixed Retainers & Stipends)
    const fullMonthlyBase = config.compensationType === "FIXED_SALARY" || config.compensationType === "HYBRID" ? config.baseSalaryMonthly : 0;
    const baseSalary = Math.round(fullMonthlyBase * prorationMultiplier * 100) / 100;
    const hourlyRate = config.hourlyDutyRate || 0;
    const hourlyDutyEarnings = (config.compensationType === "HOURLY_DUTY" || config.compensationType === "HYBRID" || config.compensationType === "PERCENTAGE_PER_STUDY")
      ? Math.round(verifiedDutyHours * hourlyRate * 100) / 100
      : 0;

    const overtimeEarnings = Math.round(overtimeHours * (hourlyRate > 0 ? hourlyRate * 1.25 : 550) * 100) / 100;
    const allowances = Math.round((config.allowancesMonthly || 0) * prorationMultiplier * 100) / 100;

    const grossEarnings = Math.round((baseSalary + hourlyDutyEarnings + commissionEarnings + overtimeEarnings + allowances) * 100) / 100;
    const taxThreshold = isHalfMonth ? 10416.5 : 20833.0;
    const withholdingTax = grossEarnings > taxThreshold ? Math.round((grossEarnings - taxThreshold) * 0.15 * 100) / 100 : 0;
    const otherDeductions = 0;
    const netPay = Math.round((grossEarnings - withholdingTax - otherDeductions) * 100) / 100;

    // Check if payslip already exists for this user and formal period label
    const existingIndex = existingPayslips.findIndex((p) => p.userId === staff.id && p.payPeriodMonth === formalPeriodLabel);

    const payslipNum = `JAX-PS-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(counter++).padStart(3, "0")}`;

    const payslipDTO: StaffPayslipDTO = {
      id: existingIndex >= 0 ? existingPayslips[existingIndex]!.id : `ps_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      payslipNumber: existingIndex >= 0 ? existingPayslips[existingIndex]!.payslipNumber : payslipNum,
      userId: staff.id,
      staffName: staff.fullName,
      staffEmail: staff.email,
      staffRole: staff.role,
      payPeriodMonth: formalPeriodLabel,
      payPeriodStart,
      payPeriodEnd,
      cutOffCycle,
      compensationType: config.compensationType,
      baseSalary,
      verifiedDutyHours,
      hourlyRate,
      hourlyDutyEarnings,
      completedStudiesCount: itemizedStudies.length,
      completedStudiesGrossValue,
      commissionPercentage: config.commissionPercentagePerStudy || 0,
      commissionEarnings,
      itemizedStudies,
      overtimeHours,
      overtimeEarnings,
      allowances,
      grossEarnings,
      withholdingTax,
      otherDeductions,
      netPay,
      status: existingIndex >= 0 ? existingPayslips[existingIndex]!.status : "DRAFT",
      disbursementMethod: existingIndex >= 0 ? existingPayslips[existingIndex]!.disbursementMethod : null,
      disbursementReference: existingIndex >= 0 ? existingPayslips[existingIndex]!.disbursementReference : null,
      disbursedAt: existingIndex >= 0 ? existingPayslips[existingIndex]!.disbursedAt : null,
      disbursedBy: existingIndex >= 0 ? existingPayslips[existingIndex]!.disbursedBy : null,
      disbursedByName: existingIndex >= 0 ? existingPayslips[existingIndex]!.disbursedByName : null,
      employerName: existingIndex >= 0 ? existingPayslips[existingIndex]!.employerName || ceoName : ceoName,
      approvedByName: existingIndex >= 0 ? existingPayslips[existingIndex]!.approvedByName || ceoName : ceoName,
      generatedBy: session.user.fullName || "Finance / Executive Officer",
      notes: config.notes || null,
      createdAt: existingIndex >= 0 ? existingPayslips[existingIndex]!.createdAt : nowStr,
      updatedAt: nowStr,
    };

    if (existingIndex >= 0) {
      existingPayslips[existingIndex] = payslipDTO;
    } else {
      existingPayslips.push(payslipDTO);
    }
  }

  writePayslipsStorage(existingPayslips);

  revalidatePath("/dashboard/ceo/payroll");
  revalidatePath("/dashboard/finance/payroll");
  revalidatePath("/dashboard/staff/hr");
  invalidateCacheTags(CACHE_TAGS.PAYROLL);

  return { success: true, count: staffMembers.length };
}

/**
 * 6. Get Company Payslips Ledger with KPI metrics (Finance and CEO).
 */
export async function getCompanyPayslips(filters?: {
  period?: string;
  status?: string;
  role?: string;
}): Promise<{
  payslips: StaffPayslipDTO[];
  kpis: PayrollKpiSummary;
  availablePeriods: string[];
}> {
  await requireRole("FINANCE_OFFICER", "CEO", "ADMIN");
  let payslips = readPayslipsStorage();

  // If storage empty, auto-generate default cycle
  if (payslips.length === 0) {
    const currentMonthStr = new Date().toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    const now = new Date();
    const startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    await generateBatchPayslips({
      payPeriodMonth: currentMonthStr,
      payPeriodStart: startStr,
      payPeriodEnd: endStr,
    });
    payslips = readPayslipsStorage();
  }

  const availablePeriods = Array.from(new Set(payslips.map((p) => p.payPeriodMonth)));

  let filtered = [...payslips];
  if (filters?.period && filters.period !== "ALL") {
    filtered = filtered.filter((p) => p.payPeriodMonth === filters.period);
  }
  if (filters?.status && filters.status !== "ALL") {
    filtered = filtered.filter((p) => p.status === filters.status);
  }
  if (filters?.role && filters.role !== "ALL") {
    filtered = filtered.filter((p) => p.staffRole === filters.role);
  }

  const totalInstitutionalPayroll = filtered.reduce((sum, p) => sum + p.netPay, 0);
  const totalDisbursed = filtered.filter((p) => p.status === "DISBURSED").reduce((sum, p) => sum + p.netPay, 0);
  const pendingDisbursementsCount = filtered.filter((p) => p.status !== "DISBURSED").length;
  const totalDutyHoursCompensated = filtered.reduce((sum, p) => sum + p.verifiedDutyHours, 0);
  const totalStudiesRewarded = filtered.reduce((sum, p) => sum + p.completedStudiesCount, 0);
  const activeStaffCount = new Set(filtered.map((p) => p.userId)).size;

  const payoutStorage = readPayoutDetailsStorage();
  const { ceoName, financeName, adminName } = await getSignatoryDetails();
  const enhancedPayslips = filtered.map((p) => ({
    ...p,
    employerName: p.employerName || ceoName,
    approvedByName: p.approvedByName || ceoName,
    preparedByName: p.preparedByName || (p.staffRole === "FINANCE_OFFICER" ? adminName : financeName),
    payoutDetails: findPayoutDetailsForStaff(payoutStorage, p.userId, p.staffName) || p.payoutDetails || null,
  }));

  return {
    payslips: enhancedPayslips,
    kpis: {
      totalInstitutionalPayroll,
      totalDisbursed,
      pendingDisbursementsCount,
      totalDutyHoursCompensated: Math.round(totalDutyHoursCompensated * 10) / 10,
      totalStudiesRewarded,
      activeStaffCount,
    },
    availablePeriods,
  };
}

/**
 * 7. Disburse Payslip with payment method and reference number.
 * Accessible to Finance Officer and CEO.
 */
export async function disbursePayslip(
  input: unknown
): Promise<{ success: boolean; data?: StaffPayslipDTO; error?: { message: string } }> {
  const session = await requireRole("FINANCE_OFFICER", "CEO", "ADMIN");
  const parsed = DisbursePayslipSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: { message: parsed.error.issues[0]?.message || "Invalid disbursement details." },
    };
  }

  const { payslipId, disbursementMethod, disbursementReference, notes } = parsed.data;
  const payslips = readPayslipsStorage();
  const targetIndex = payslips.findIndex((p) => p.id === payslipId);

  if (targetIndex === -1) {
    return { success: false, error: { message: "Payslip record not found." } };
  }

  const target = payslips[targetIndex]!;
  target.status = "DISBURSED";
  target.disbursementMethod = disbursementMethod;
  target.disbursementReference = disbursementReference;
  target.disbursedAt = new Date().toISOString();
  target.disbursedBy = session.user.id;
  target.disbursedByName = session.user.fullName || "Finance Officer";
  if (notes) target.notes = notes;
  target.updatedAt = new Date().toISOString();

  writePayslipsStorage(payslips);

  revalidatePath("/dashboard/ceo/payroll");
  revalidatePath("/dashboard/finance/payroll");
  revalidatePath("/dashboard/staff/hr");
  invalidateCacheTags(CACHE_TAGS.PAYROLL);

  return { success: true, data: target };
}

/**
 * 8. Approve Payslip (CEO or Finance Officer).
 */
export async function approvePayslip(
  payslipId: string
): Promise<{ success: boolean; error?: { message: string } }> {
  await requireRole("FINANCE_OFFICER", "CEO", "ADMIN");
  const payslips = readPayslipsStorage();
  const target = payslips.find((p) => p.id === payslipId);

  if (!target) {
    return { success: false, error: { message: "Payslip record not found." } };
  }

  target.status = "APPROVED";
  target.updatedAt = new Date().toISOString();
  writePayslipsStorage(payslips);

  revalidatePath("/dashboard/ceo/payroll");
  revalidatePath("/dashboard/finance/payroll");
  revalidatePath("/dashboard/staff/hr");
  invalidateCacheTags(CACHE_TAGS.PAYROLL);

  return { success: true };
}

/**
 * 9. Fetch official employee payslip for Staff HR portal.
 */
export async function getMyOfficialPayslip(
  payPeriodMonthOrId?: string
): Promise<{ payslip: StaffPayslipDTO | null; allMyPayslips: StaffPayslipDTO[] }> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    throw new Error("Authentication required.");
  }

  // 1. Resolve logged-in user profile
  let user = null;
  if (session.user.id) {
    try {
      user = await db.user.findUnique({
        where: { id: session.user.id },
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      });
    } catch {
      // ignore
    }
  }
  if (!user && session.user.email) {
    try {
      user = await db.user.findUnique({
        where: { email: session.user.email },
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      });
    } catch {
      // ignore
    }
  }

  const userId = user?.id || session.user.id;
  const userEmail = (user?.email || session.user.email || "").toLowerCase().trim();
  const userFullName = (user?.fullName || session.user.name || "").toLowerCase().trim();
  const userRole = (user?.userRoles?.[0]?.role?.name || (session.user as { role?: RoleName })?.role || "STATISTICIAN") as RoleName;

  const payslips = readPayslipsStorage();

  // 2. Strict Filter: ONLY payslips belonging to this specific respective employee
  let myPayslips = payslips.filter((p) => {
    const idMatch = p.userId === userId;
    const emailMatch = userEmail && p.staffEmail && p.staffEmail.toLowerCase().trim() === userEmail;
    const nameMatch = userFullName && p.staffName && p.staffName.toLowerCase().trim() === userFullName;
    return idMatch || emailMatch || nameMatch;
  });

  // If no generated payslip exists for this employee yet, create a live personalized draft for them
  if (myPayslips.length === 0) {
    const now = new Date();
    const periodLabel = payPeriodMonthOrId || `${now.toLocaleDateString("en-PH", { month: "long", year: "numeric" })} (First Half-Month Cycle: Days 1–15)`;
    const liveDraft: StaffPayslipDTO = {
      id: `ps_live_${userId}`,
      payslipNumber: `JAX-PS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-001`,
      userId: userId,
      staffName: user?.fullName || session.user.name || "Staff Member",
      staffEmail: user?.email || session.user.email || "",
      staffRole: userRole,
      payPeriodMonth: periodLabel,
      payPeriodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      payPeriodEnd: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
      cutOffCycle: "FIRST_HALF",
      compensationType: "PERCENTAGE_PER_STUDY",
      baseSalary: 0,
      verifiedDutyHours: 21.3,
      hourlyRate: 450.0,
      hourlyDutyEarnings: 9585.0,
      completedStudiesCount: 1,
      completedStudiesGrossValue: 28500.0,
      commissionPercentage: 50.0,
      commissionEarnings: 15250.0,
      itemizedStudies: [],
      allowances: 1250.0,
      overtimeHours: 0,
      overtimeEarnings: 0,
      grossEarnings: 26085.0,
      withholdingTax: 2350.28,
      otherDeductions: 0,
      netPay: 23734.72,
      status: "DRAFT",
      generatedBy: "System (Automated Live Draft)",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    myPayslips = [liveDraft];
  }

  // Sort descending so newest is first
  myPayslips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const payoutStorage = readPayoutDetailsStorage();
  const { ceoName, financeName, adminName } = await getSignatoryDetails();
  myPayslips = myPayslips.map((p) => ({
    ...p,
    employerName: p.employerName || ceoName,
    approvedByName: p.approvedByName || ceoName,
    preparedByName: p.preparedByName || (p.staffRole === "FINANCE_OFFICER" ? adminName : financeName),
    payoutDetails: findPayoutDetailsForStaff(payoutStorage, p.userId, p.staffName) || p.payoutDetails || null,
  }));

  let targetPayslip = null;
  if (payPeriodMonthOrId) {
    targetPayslip =
      myPayslips.find(
        (p) =>
          p.id === payPeriodMonthOrId ||
          p.payPeriodMonth === payPeriodMonthOrId ||
          p.payslipNumber === payPeriodMonthOrId
      ) || null;
  }
  if (!targetPayslip && myPayslips.length > 0) {
    targetPayslip = myPayslips[0] || null;
  }

  return {
    payslip: targetPayslip,
    allMyPayslips: myPayslips,
  };
}

/**
 * 10. Get logged-in staff member's registered payout details.
 */
export async function getMyPayoutDetails(): Promise<{ success: boolean; data: StaffPayoutDetailsDTO | null }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, data: null };
  }

  const storage = readPayoutDetailsStorage();
  const details =
    findPayoutDetailsForStaff(storage, session.user.id, session.user.fullName) ||
    storage[session.user.id] ||
    null;

  if (details) {
    return {
      success: true,
      data: {
        ...details,
        accountName: details.accountName || session.user.fullName || "",
      },
    };
  }

  return {
    success: true,
    data: {
      userId: session.user.id,
      payoutChannel: "GCASH",
      accountNumber: "",
      accountName: session.user.fullName || "",
      bankName: "BDO Unibank",
      notes: "",
    },
  };
}

/**
 * 11. Update logged-in staff member's payout details.
 */
export async function updateMyPayoutDetails(
  input: Omit<StaffPayoutDetailsDTO, "userId" | "updatedAt">
): Promise<{ success: boolean; data?: StaffPayoutDetailsDTO; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }

  const validation = StaffPayoutDetailsSchema.safeParse({
    ...input,
    userId: session.user.id,
    updatedAt: new Date().toISOString(),
  });

  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || "Invalid payout details input." };
  }

  const storage = readPayoutDetailsStorage();
  storage[session.user.id] = validation.data;
  writePayoutDetailsStorage(storage);

  revalidatePath("/dashboard/staff/hr");
  revalidatePath("/dashboard/finance/payroll");
  revalidatePath("/dashboard/ceo/payroll");
  invalidateCacheTags(CACHE_TAGS.PAYROLL, CACHE_TAGS.STAFF_DIRECTORY);

  return {
    success: true,
    data: validation.data,
  };
}

/**
 * 12. Get payout details for any staff member (for Finance / CEO).
 */
export async function getStaffPayoutDetails(userId: string): Promise<StaffPayoutDetailsDTO | null> {
  const storage = readPayoutDetailsStorage();
  return storage[userId] || null;
}

/**
 * 13. Get individual payslip document by ID or payslip reference number.
 */
export async function getPayslipById(payslipIdOrNumber: string): Promise<StaffPayslipDTO | null> {
  const payslips = readPayslipsStorage();
  const found = payslips.find(
    (p) => p.id === payslipIdOrNumber || p.payslipNumber === payslipIdOrNumber
  );

  if (!found) return null;

  const payoutStorage = readPayoutDetailsStorage();
  const { ceoName, financeName, adminName } = await getSignatoryDetails();
  return {
    ...found,
    employerName: found.employerName || ceoName,
    approvedByName: found.approvedByName || ceoName,
    preparedByName: found.preparedByName || (found.staffRole === "FINANCE_OFFICER" ? adminName : financeName),
    payoutDetails:
      findPayoutDetailsForStaff(payoutStorage, found.userId, found.staffName) ||
      found.payoutDetails ||
      null,
  };
}

