"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import fs from "fs";
import path from "path";
import { Prisma, type RoleName } from "@prisma/client";
import { db, withDbTimeout } from "@/lib/db";
import { requireRole, auth } from "@/lib/auth";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache-tags";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import { calculateProjectBalance } from "@/lib/payment-rules";
import { getAppSetting, isOfflineDev, setAppSetting } from "@/lib/app-settings";
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
  type PayslipStatus,
  type CompensationType,
  type TimeClockAccess,
  type MyStudyEarningsDTO,
  type StudyEarningItem,
  usesTimeClock,
  paysPerStudy,
  payModelSummary,
} from "./schemas";
import { studyPayFor } from "./study-pay";
import { devEarningStudies } from "@/features/projects/dev-study-store";
import { getDevUsers } from "@/lib/mock-data/users.data";

/**
 * Payroll: pay settings, payslips and staff payout details.
 *
 * Stored in the database (payslips, staff_payout_details, and app_settings "payroll_config"). They used to be
 * saved to files under dev_data/, which can't change on the server, so payslips and settings were lost on the
 * live site. Offline development (npm run dev:offline) has no database and still uses those files.
 */

const DEV_DATA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "dev_data");
const CONFIGS_FILE = path.join(DEV_DATA_DIR, "payroll_configs.json");
const PAYSLIPS_FILE = path.join(DEV_DATA_DIR, "payslips.json");
const PAYOUT_DETAILS_FILE = path.join(DEV_DATA_DIR, "payout_details.json");
const PAYROLL_CONFIG_KEY = "payroll_config";
const MANAGERS: RoleName[] = ["FINANCE_OFFICER", "CEO", "ADMIN"];
const PAYROLL_ROLES: RoleName[] = ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN"];

const DEFAULT_SCHEDULE_CONFIG: CorporatePayrollScheduleConfigDTO = {
  frequency: "SEMI_MONTHLY",
  firstCutoffDay: 15,
  secondCutoffDay: 31,
  prorateMonthlyBase: true,
  disbursementGraceDays: 3,
  notes: "Paid twice a month (days 1–15 and 16–end of month).",
  updatedAt: new Date().toISOString(),
  updatedBy: "CEO",
};

interface PayrollStorage {
  roleConfigs: Record<string, RoleCompensationConfigDTO>;
  staffOverrides: Record<string, StaffCompensationOverrideDTO>;
  scheduleConfig?: CorporatePayrollScheduleConfigDTO;
}

const DEFAULT_ROLE_CONFIGS: Record<string, RoleCompensationConfigDTO> = {
  STATISTICIAN: {
    roleName: "STATISTICIAN",
    compensationType: "TIER_DELIVERABLE",
    baseSalaryMonthly: 0,
    commissionPercentagePerStudy: 0,
    hourlyDutyRate: 450.0,
    fixedPerStudyBonus: 1000.0,
    allowancesMonthly: 2500.0,
    isActive: true,
    notes: "Package pay rate per finished study (set on Money & Pay Rates) + ₱450 per hour worked + ₱1,000 per finished study.",
    updatedAt: new Date().toISOString(),
    updatedBy: "CEO",
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
    notes: "₱12,000 a month + a share of each checked study + ₱450 per hour worked.",
    updatedAt: new Date().toISOString(),
    updatedBy: "CEO",
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
    notes: "Monthly salary and allowance.",
    updatedAt: new Date().toISOString(),
    updatedBy: "CEO",
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
    notes: "Monthly salary and allowance.",
    updatedAt: new Date().toISOString(),
    updatedBy: "CEO",
  },
};

// ─── Offline-only file storage ──────────────────────────────────────────────────

function readJsonFile<T>(file: string): T | null {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch (err) {
    console.warn(`[payroll] Couldn't read ${path.basename(file)}:`, err);
  }
  return null;
}

function writeJsonFile(file: string, data: unknown): void {
  if (!fs.existsSync(DEV_DATA_DIR)) fs.mkdirSync(DEV_DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Pay settings ───────────────────────────────────────────────────────────────

async function readPayrollStorage(): Promise<PayrollStorage> {
  const saved = isOfflineDev()
    ? readJsonFile<PayrollStorage>(CONFIGS_FILE)
    : // The database copy once saved; until then the shipped file (the live site's settings before this change).
      ((await getAppSetting<PayrollStorage>(PAYROLL_CONFIG_KEY)) ?? readJsonFile<PayrollStorage>(CONFIGS_FILE));
  return {
    roleConfigs: { ...DEFAULT_ROLE_CONFIGS, ...(saved?.roleConfigs ?? {}) },
    staffOverrides: saved?.staffOverrides ?? {},
    scheduleConfig: saved?.scheduleConfig,
  };
}

// Read on every page for the clock button, so it's cached; saving pay settings clears it (CACHE_TAGS.PAYROLL).
const cachedPayrollStorage = unstable_cache(readPayrollStorage, ["payroll-storage-v1"], {
  tags: [CACHE_TAGS.PAYROLL],
  revalidate: 300,
});

const PAID_HOW: Record<CompensationType, string> = {
  TIER_DELIVERABLE: "per study",
  PERCENTAGE_PER_STUDY: "per study",
  FIXED_SALARY: "a monthly salary",
  HYBRID: "a monthly salary plus study pay",
  HOURLY_DUTY: "by the hour",
};

/**
 * Whether the signed-in person uses the time clock: their own pay setting if the CEO set one, otherwise their
 * role's. Only "Hourly Duty Wage" uses it (see `usesTimeClock`).
 */
export async function getTimeClockAccess(): Promise<TimeClockAccess> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return { enabled: false, payModel: null, reason: "Sign in to use the time clock." };
  try {
    const storage = await cachedPayrollStorage();
    const role = user.role as RoleName;
    const config = storage.staffOverrides[user.id] || storage.roleConfigs[role] || DEFAULT_ROLE_CONFIGS[role] || null;
    const payModel = (config?.compensationType as CompensationType | undefined) ?? null;
    if (usesTimeClock(payModel)) return { enabled: true, payModel, reason: null };
    return {
      enabled: false,
      payModel,
      reason: payModel
        ? `You're paid ${PAID_HOW[payModel]}, so you don't need to clock in. Hours don't change your pay.`
        : "Your pay doesn't use the time clock, so you don't need to clock in.",
    };
  } catch (err) {
    console.warn("[getTimeClockAccess] Couldn't read pay settings:", err);
    return { enabled: false, payModel: null, reason: "The time clock isn't available right now. Try again in a moment." };
  }
}

/** Throws if it can't be saved, so the page never says "saved" when it wasn't. */
async function writePayrollStorage(data: PayrollStorage, userId: string): Promise<void> {
  if (isOfflineDev()) writeJsonFile(CONFIGS_FILE, data);
  else await setAppSetting(PAYROLL_CONFIG_KEY, data, userId);
}

// ─── Payslips ───────────────────────────────────────────────────────────────────

type PayslipRow = {
  id: string;
  payslipNumber: string;
  userId: string;
  payPeriodMonth: string;
  status: string;
  netPay: Prisma.Decimal;
  data: Prisma.JsonValue;
};

const fromRow = (r: PayslipRow): StaffPayslipDTO => ({
  ...(r.data as unknown as StaffPayslipDTO),
  id: r.id,
  payslipNumber: r.payslipNumber,
  userId: r.userId,
  payPeriodMonth: r.payPeriodMonth,
  status: r.status as PayslipStatus,
  netPay: Number(r.netPay),
});

async function listPayslips(where: Prisma.PayslipWhereInput = {}): Promise<StaffPayslipDTO[]> {
  if (isOfflineDev()) {
    const all = readJsonFile<StaffPayslipDTO[]>(PAYSLIPS_FILE) ?? [];
    return all.filter((p) => !where.userId || p.userId === where.userId);
  }
  const rows = await withDbTimeout(db.payslip.findMany({ where, orderBy: { payPeriodStart: "desc" } }), 8000);
  return rows.map(fromRow);
}

async function findPayslip(idOrNumber: string): Promise<StaffPayslipDTO | null> {
  if (isOfflineDev()) {
    return (readJsonFile<StaffPayslipDTO[]>(PAYSLIPS_FILE) ?? []).find((p) => p.id === idOrNumber || p.payslipNumber === idOrNumber) ?? null;
  }
  const row = await withDbTimeout(
    db.payslip.findFirst({ where: { OR: [{ id: idOrNumber }, { payslipNumber: idOrNumber }] } }),
    5000
  );
  return row ? fromRow(row) : null;
}

/** Saves one payslip (new or changed). Throws if it can't be saved. */
async function savePayslip(p: StaffPayslipDTO): Promise<void> {
  if (isOfflineDev()) {
    const all = readJsonFile<StaffPayslipDTO[]>(PAYSLIPS_FILE) ?? [];
    const i = all.findIndex((x) => x.id === p.id);
    if (i >= 0) all[i] = p;
    else all.push(p);
    writeJsonFile(PAYSLIPS_FILE, all);
    return;
  }
  const data = p as unknown as Prisma.InputJsonValue;
  await withDbTimeout(
    db.payslip.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        payslipNumber: p.payslipNumber,
        userId: p.userId,
        payPeriodMonth: p.payPeriodMonth,
        payPeriodStart: new Date(p.payPeriodStart),
        payPeriodEnd: new Date(p.payPeriodEnd),
        status: p.status,
        netPay: p.netPay,
        data,
      },
      update: { status: p.status, netPay: p.netPay, data },
    }),
    8000
  );
}

// ─── Staff payout details (where staff are paid) ───────────────────────────────

async function readPayoutDetails(userIds?: string[]): Promise<Map<string, StaffPayoutDetailsDTO>> {
  const out = new Map<string, StaffPayoutDetailsDTO>();
  if (isOfflineDev()) {
    for (const d of Object.values(readJsonFile<Record<string, StaffPayoutDetailsDTO>>(PAYOUT_DETAILS_FILE) ?? {})) {
      if (d?.userId && (!userIds || userIds.includes(d.userId))) out.set(d.userId, d);
    }
    return out;
  }
  const rows = await withDbTimeout(
    db.staffPayoutDetail.findMany({ where: userIds ? { userId: { in: userIds } } : undefined }),
    5000
  );
  for (const r of rows) {
    out.set(r.userId, {
      userId: r.userId,
      payoutChannel: r.payoutChannel as StaffPayoutDetailsDTO["payoutChannel"],
      accountNumber: r.accountNumber,
      accountName: r.accountName,
      bankName: r.bankName ?? "",
      notes: r.notes ?? "",
      updatedAt: r.updatedAt.toISOString(),
    });
  }
  return out;
}

async function writePayoutDetails(d: StaffPayoutDetailsDTO): Promise<void> {
  if (isOfflineDev()) {
    const all = readJsonFile<Record<string, StaffPayoutDetailsDTO>>(PAYOUT_DETAILS_FILE) ?? {};
    all[d.userId] = d;
    writeJsonFile(PAYOUT_DETAILS_FILE, all);
    return;
  }
  const data = {
    payoutChannel: d.payoutChannel,
    accountNumber: d.accountNumber,
    accountName: d.accountName,
    bankName: d.bankName || null,
    notes: d.notes || null,
  };
  await withDbTimeout(
    db.staffPayoutDetail.upsert({ where: { userId: d.userId }, create: { userId: d.userId, ...data }, update: data }),
    5000
  );
}

// ─── People ─────────────────────────────────────────────────────────────────────

/**
 * Cached DB queries for signatories and staff directory.
 * Invalidation tag: staff-directory
 */
const fetchCachedSignatoriesDb = unstable_cache(
  async () => {
    try {
      return await withDbTimeout(
        db.user.findMany({
          where: { status: "ACTIVE", userRoles: { some: { role: { name: { in: ["CEO", "FINANCE_OFFICER", "ADMIN"] } } } } },
          select: { fullName: true, userRoles: { select: { role: { select: { name: true } } } } },
        }),
        1500
      );
    } catch {
      return [];
    }
  },
  ["payroll-signatories-db-v2"],
  { revalidate: 60, tags: [CACHE_TAGS.STAFF_DIRECTORY] }
);

const fetchCachedStaffMembersDb = unstable_cache(
  async () => {
    try {
      return await withDbTimeout(
        db.user.findMany({
          where: { userRoles: { some: { role: { name: { in: PAYROLL_ROLES } } } } },
          select: { id: true, fullName: true, email: true, status: true, userRoles: { select: { role: { select: { name: true } } } } },
          orderBy: { fullName: "asc" },
        }),
        3000
      );
    } catch {
      return [];
    }
  },
  ["payroll-staff-members-db-v2"],
  { revalidate: 60, tags: [CACHE_TAGS.STAFF_DIRECTORY] }
);

export async function getSignatoryDetails(): Promise<{ ceoName: string; financeName: string; adminName: string }> {
  let ceoName = "CEO";
  let financeName = "Finance";
  let adminName = "Admin";

  if (isOfflineDev()) {
    const devUsers = Object.values(getDevUsers());
    ceoName = devUsers.find((u) => u.role === "CEO")?.fullName ?? ceoName;
    financeName = devUsers.find((u) => u.role === "FINANCE_OFFICER")?.fullName ?? financeName;
    adminName = devUsers.find((u) => u.role === "ADMIN")?.fullName ?? adminName;
    return { ceoName, financeName, adminName };
  }

  for (const u of await fetchCachedSignatoriesDb()) {
    const roles = u.userRoles.map((ur) => ur.role.name);
    if (roles.includes("CEO") && u.fullName) ceoName = u.fullName;
    if (roles.includes("FINANCE_OFFICER") && u.fullName) financeName = u.fullName;
    if (roles.includes("ADMIN") && u.fullName) adminName = u.fullName;
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

/** Signatures and payout details added to payslips for display and printing. */
async function withDisplayDetails(payslips: StaffPayslipDTO[]): Promise<StaffPayslipDTO[]> {
  if (!payslips.length) return payslips;
  const [{ ceoName, financeName, adminName }, details] = await Promise.all([
    getSignatoryDetails(),
    readPayoutDetails([...new Set(payslips.map((p) => p.userId))]).catch(() => new Map<string, StaffPayoutDetailsDTO>()),
  ]);
  return payslips.map((p) => ({
    ...p,
    employerName: p.employerName || ceoName,
    approvedByName: p.approvedByName || ceoName,
    preparedByName: p.preparedByName || (p.staffRole === "FINANCE_OFFICER" ? adminName : financeName),
    payoutDetails: details.get(p.userId) ?? p.payoutDetails ?? null,
  }));
}

/**
 * 1. Pay settings (role pay + personal pay + schedule) and the staff list. CEO, finance and admins.
 */
export async function getPayrollConfigurations(): Promise<{
  roleConfigs: RoleCompensationConfigDTO[];
  staffOverrides: StaffCompensationOverrideDTO[];
  staffMembers: InternalStaffMember[];
  scheduleConfig: CorporatePayrollScheduleConfigDTO;
}> {
  await requireRole("CEO", "FINANCE_OFFICER", "ADMIN");
  const storage = await readPayrollStorage();

  type Person = { id: string; fullName: string; email: string; role: RoleName; status: string };
  const people: Person[] = isOfflineDev()
    ? Object.values(getDevUsers())
        .filter((u) => PAYROLL_ROLES.includes(u.role))
        .map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role, status: u.status }))
    : (await fetchCachedStaffMembersDb()).map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: (u.userRoles.map((r) => r.role.name).find((r) => PAYROLL_ROLES.includes(r)) ?? "STATISTICIAN") as RoleName,
        status: u.status,
      }));

  const details = await readPayoutDetails(people.map((p) => p.id)).catch(() => new Map<string, StaffPayoutDetailsDTO>());
  const staffMembers: InternalStaffMember[] = people.map((p) => {
    const override = storage.staffOverrides[p.id] || null;
    return {
      ...p,
      overrideConfig: override,
      effectiveConfig: override || storage.roleConfigs[p.role] || DEFAULT_ROLE_CONFIGS[p.role]!,
      payoutDetails: details.get(p.id) ?? null,
    };
  });

  return {
    roleConfigs: Object.values(storage.roleConfigs),
    staffOverrides: Object.values(storage.staffOverrides),
    staffMembers,
    scheduleConfig: storage.scheduleConfig || DEFAULT_SCHEDULE_CONFIG,
  };
}

const refreshPayrollPages = () => {
  revalidatePath("/dashboard/ceo/payroll");
  revalidatePath("/dashboard/finance/payroll");
  revalidatePath("/dashboard/staff/hr");
  invalidateCacheTags(CACHE_TAGS.PAYROLL, CACHE_TAGS.STAFF_DIRECTORY);
};

/**
 * Pay schedule (CEO only): how often staff are paid and the cut-off days.
 */
export async function saveCompanyPayrollSchedule(
  input: unknown
): Promise<{ success: boolean; config?: CorporatePayrollScheduleConfigDTO; error?: { message: string } }> {
  const session = await requireRole("CEO");
  const parsed = CorporatePayrollScheduleConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: parsed.error.issues[0]?.message || "Please check the schedule." } };
  }

  const storage = await readPayrollStorage();
  const dto: CorporatePayrollScheduleConfigDTO = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
    updatedBy: session.user?.name || "CEO",
  };
  storage.scheduleConfig = dto;
  try {
    await writePayrollStorage(storage, session.user.id);
  } catch (err) {
    console.error("[saveCompanyPayrollSchedule] Save failed:", err);
    return { success: false, error: { message: "We couldn't save the schedule. Please try again." } };
  }
  refreshPayrollPages();

  try {
    dispatchRealtimeNotification({
      eventType: "PAYROLL_UPDATE",
      title: "Pay schedule updated",
      message: `Staff are now paid ${dto.frequency.replace(/_/g, "-").toLowerCase()}.`,
      targetRoles: ["FINANCE_OFFICER", "ADMIN"],
      excludeUserId: session.user.id,
    });
  } catch (notifyErr) {
    console.warn("[saveCompanyPayrollSchedule] Realtime notification warning:", notifyErr);
  }

  return { success: true, config: dto };
}

/**
 * 2. Role pay settings (CEO only).
 */
export async function saveRoleCompensationConfig(
  input: unknown
): Promise<{ success: boolean; data?: RoleCompensationConfigDTO; error?: { message: string } }> {
  const session = await requireRole("CEO");
  const parsed = RoleCompensationConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: parsed.error.issues[0]?.message || "Please check the pay settings." } };
  }

  const storage = await readPayrollStorage();
  const updatedDTO: RoleCompensationConfigDTO = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
    updatedBy: session.user.fullName || "CEO",
  };
  storage.roleConfigs[parsed.data.roleName] = updatedDTO;
  try {
    await writePayrollStorage(storage, session.user.id);
  } catch (err) {
    console.error("[saveRoleCompensationConfig] Save failed:", err);
    return { success: false, error: { message: "We couldn't save the pay settings. Please try again." } };
  }
  refreshPayrollPages();

  try {
    dispatchRealtimeNotification({
      eventType: "PAYROLL_UPDATE",
      title: "Pay settings updated",
      message: `Pay settings for ${parsed.data.roleName.replace(/_/g, " ").toLowerCase()} were updated.`,
      targetRoles: ["FINANCE_OFFICER", "ADMIN"],
      excludeUserId: session.user.id,
    });
  } catch (notifyErr) {
    console.warn("[saveRoleCompensationConfig] Realtime notification warning:", notifyErr);
  }

  return { success: true, data: updatedDTO };
}

/**
 * 3. Personal pay for one staff member (CEO only).
 */
export async function saveStaffCompensationOverride(
  input: unknown
): Promise<{ success: boolean; data?: StaffCompensationOverrideDTO; error?: { message: string } }> {
  const session = await requireRole("CEO");
  const parsed = StaffCompensationOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: parsed.error.issues[0]?.message || "Please check the pay settings." } };
  }

  const storage = await readPayrollStorage();
  const overrideDTO: StaffCompensationOverrideDTO = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
    updatedBy: session.user.fullName || "CEO",
  };
  storage.staffOverrides[parsed.data.userId] = overrideDTO;
  try {
    await writePayrollStorage(storage, session.user.id);
  } catch (err) {
    console.error("[saveStaffCompensationOverride] Save failed:", err);
    return { success: false, error: { message: "We couldn't save the personal pay. Please try again." } };
  }
  refreshPayrollPages();

  try {
    dispatchRealtimeNotification({
      eventType: "PAYROLL_UPDATE",
      title: "Your pay was updated",
      message: "Your personal pay settings were updated.",
      targetUserIds: [parsed.data.userId],
      excludeUserId: session.user.id,
    });
  } catch (notifyErr) {
    console.warn("[saveStaffCompensationOverride] Realtime notification warning:", notifyErr);
  }

  return { success: true, data: overrideDTO };
}

/**
 * 4. Remove someone's personal pay so the role pay applies again (CEO only).
 */
export async function deleteStaffCompensationOverride(userId: string): Promise<{ success: boolean }> {
  const session = await requireRole("CEO");
  const storage = await readPayrollStorage();
  delete storage.staffOverrides[userId];
  try {
    await writePayrollStorage(storage, session.user.id);
  } catch (err) {
    console.error("[deleteStaffCompensationOverride] Save failed:", err);
    return { success: false };
  }
  refreshPayrollPages();
  return { success: true };
}

/**
 * A study's pay is earned once it can be paid out: delivered (or closed), paid in full, no open claim and no
 * refund pending. The same rule as per-study payouts (RULE_PAY_01), checked against the accepted price.
 */
function studyIsPayable(project: {
  masterStatus: string;
  hasActiveDispute: boolean;
  hasPendingRefund: boolean;
  quotations: { status: string; totalAmount: Prisma.Decimal; downpaymentRequired: Prisma.Decimal }[];
  payments: { amountSubmitted: Prisma.Decimal; paymentStatus: Parameters<typeof calculateProjectBalance>[0][number]["paymentStatus"] }[];
}): boolean {
  if (!["DELIVERED", "CLOSED"].includes(project.masterStatus)) return false;
  if (project.hasActiveDispute || project.hasPendingRefund) return false;
  const quote = project.quotations.find((q) => q.status === "CLIENT_APPROVED");
  if (!quote) return false;
  const balance = calculateProjectBalance(project.payments, Number(quote.totalAmount), Number(quote.downpaymentRequired));
  return balance.remainingBalance <= 0;
}

/**
 * 5. Make payslips for every active staff member for a pay period (finance and the CEO).
 *
 * - Hours: real clock-ins in the period only (none = 0).
 * - Studies: the person's own studies (as analyst or reviewer) that became payable by the end of the period
 *   and aren't on any earlier payslip of theirs, so each study is paid exactly once.
 * - Admins and finance are paid salary and allowance only (no study commission).
 * - Payslips already approved or paid for this period are left exactly as they are.
 */
export async function generateBatchPayslips(
  input: unknown
): Promise<{ success: boolean; count?: number; skipped?: number; error?: { message: string } }> {
  const session = await requireRole("FINANCE_OFFICER", "CEO");
  const parsed = GeneratePayrollBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: parsed.error.issues[0]?.message || "Please check the pay period." } };
  }

  const { payPeriodMonth, payPeriodStart, payPeriodEnd, cutOffCycle = "FIRST_HALF" } = parsed.data;
  const startDate = new Date(payPeriodStart);
  const endExclusive = new Date(new Date(payPeriodEnd).getTime() + 24 * 60 * 60 * 1000); // include the whole last day
  if (isNaN(startDate.getTime()) || isNaN(endExclusive.getTime()) || endExclusive <= startDate) {
    return { success: false, error: { message: "The pay period dates don't look right." } };
  }

  const { staffMembers } = await getPayrollConfigurations();
  const activeStaff = staffMembers.filter((s) => s.status === "ACTIVE" || s.status === "ON_LEAVE");
  const isHalfMonth = cutOffCycle === "FIRST_HALF" || cutOffCycle === "SECOND_HALF";
  const prorationMultiplier = isHalfMonth ? 0.5 : 1.0;

  let formalPeriodLabel = payPeriodMonth;
  if (cutOffCycle === "FIRST_HALF") formalPeriodLabel = `${payPeriodMonth} (Days 1–15)`;
  else if (cutOffCycle === "SECOND_HALF") formalPeriodLabel = `${payPeriodMonth} (Days 16–end)`;
  else if (cutOffCycle === "FULL_MONTH") formalPeriodLabel = `${payPeriodMonth} (Full month)`;

  type Assignment = {
    projectId: string;
    statisticianId: string;
    qaLeadId: string;
    project: {
      intakeId: string;
      researchTitle: string;
      masterStatus: string;
      packageName: string | null;
      sows: { totalAmount: Prisma.Decimal; isLocked: boolean }[];
      quotations: { status: string; totalAmount: Prisma.Decimal; downpaymentRequired: Prisma.Decimal }[];
    };
  };

  let attendanceLogs: { userId: string; totalMinutes: number | null }[] = [];
  let payable: Assignment[] = [];
  let existing: StaffPayslipDTO[] = [];
  let releasedPayouts: { projectId: string; recipientId: string }[] = [];
  try {
    const [att, assigned, slips, released] = await Promise.all([
      isOfflineDev()
        ? Promise.resolve([])
        : withDbTimeout(
            db.staffAttendanceLog.findMany({
              where: { clockInAt: { gte: startDate, lt: endExclusive }, status: { in: ["COMPLETED", "ADJUSTED", "AUTO_CLOSED"] } },
              select: { userId: true, totalMinutes: true },
            }),
            5000
          ),
      isOfflineDev()
        ? Promise.resolve([])
        : withDbTimeout(
            db.assignment.findMany({
              where: { project: { deliveredAt: { not: null, lt: endExclusive }, masterStatus: { in: ["DELIVERED", "CLOSED"] } } },
              select: {
                projectId: true,
                statisticianId: true,
                qaLeadId: true,
                project: {
                  select: {
                    intakeId: true,
                    researchTitle: true,
                    masterStatus: true,
                    packageName: true,
                    hasActiveDispute: true,
                    hasPendingRefund: true,
                    sows: { select: { totalAmount: true, isLocked: true }, orderBy: { generatedAt: "desc" } },
                    quotations: { select: { status: true, totalAmount: true, downpaymentRequired: true }, orderBy: { createdAt: "desc" } },
                    payments: { select: { amountSubmitted: true, paymentStatus: true } },
                  },
                },
              },
            }),
            8000
          ),
      listPayslips(),
      // Study pay already released one study at a time (Finance → Payouts) isn't paid again on a payslip.
      isOfflineDev()
        ? Promise.resolve([])
        : withDbTimeout(db.payout.findMany({ where: { payoutStatus: "DISBURSED" }, select: { projectId: true, recipientId: true } }), 5000),
    ]);
    attendanceLogs = att;
    payable = assigned.filter((a) => studyIsPayable(a.project));
    existing = slips;
    releasedPayouts = released;
  } catch (err) {
    console.error("[generateBatchPayslips] Couldn't load hours, studies or payslips:", err);
    return { success: false, error: { message: "We couldn't load the hours and studies. Please try again." } };
  }

  /** The price the client agreed to: the signed agreement, else the accepted quote. */
  const contractAmount = (project: Assignment["project"]): number => {
    const signed = project.sows.find((s) => s.isLocked) ?? project.sows[0];
    if (signed) return Number(signed.totalAmount);
    const approved = project.quotations.find((q) => q.status === "CLIENT_APPROVED");
    return approved ? Number(approved.totalAmount) : 0;
  };

  // Payslip numbers continue from the highest one used this month (JAX-PS-YYYYMM-NNN).
  const now = new Date();
  const prefix = `JAX-PS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-`;
  let nextNumber =
    existing
      .map((p) => (p.payslipNumber.startsWith(prefix) ? parseInt(p.payslipNumber.slice(prefix.length), 10) : 0))
      .reduce((max, n) => (Number.isFinite(n) && n > max ? n : max), 0) + 1;

  const nowStr = now.toISOString();
  const { ceoName } = await getSignatoryDetails();
  let made = 0;
  let skipped = 0;

  for (const staff of activeStaff) {
    const current = existing.find((p) => p.userId === staff.id && p.payPeriodMonth === formalPeriodLabel);
    if (current && current.status !== "DRAFT") {
      skipped++; // already approved or paid: never recalculated
      continue;
    }
    const config = staff.effectiveConfig;

    // 1. Hours actually worked (clock-ins in the period). Only people paid by the hour use the time clock;
    // for everyone else hours never count toward pay (no hourly pay and no overtime).
    const paysHourly = usesTimeClock(config.compensationType);
    const staffLogs = paysHourly ? attendanceLogs.filter((l) => l.userId === staff.id) : [];
    const totalMinutes = staffLogs.reduce((sum, l) => sum + (l.totalMinutes || 0), 0);
    const verifiedDutyHours = Math.round((totalMinutes / 60) * 10) / 10;
    const overtimeHours = staffLogs.filter((l) => (l.totalMinutes || 0) > 510).length * 1.5;

    // 2. Studies: their own, payable, not already on another payslip of theirs
    const alreadyPaid = new Set([
      ...existing.filter((p) => p.userId === staff.id && p.id !== current?.id).flatMap((p) => p.itemizedStudies.map((s) => s.projectId)),
      ...releasedPayouts.filter((r) => r.recipientId === staff.id).map((r) => r.projectId),
    ]);
    const isAnalyst = staff.role === "STATISTICIAN";
    const isReviewer = staff.role === "SENIOR_QA_LEAD";
    // Only pay models with study pay (Per Study, percentage per study, Salary + Per Study). Monthly Salary and Hourly
    // Wage used to get study pay on top as well.
    const theirs = paysPerStudy(config.compensationType)
      ? payable.filter(
          (a) => !alreadyPaid.has(a.projectId) && ((isAnalyst && a.statisticianId === staff.id) || (isReviewer && a.qaLeadId === staff.id))
        )
      : [];

    const itemizedStudies: PayslipItemizedStudy[] = [];
    for (const a of theirs) {
      const grossAmount = contractAmount(a.project);
      const pay = await studyPayFor({
        isAnalyst,
        grossAmount,
        packageName: a.project.packageName,
        config,
        personalPercent: staff.overrideConfig?.commissionPercentagePerStudy,
      });
      itemizedStudies.push({
        projectId: a.projectId,
        intakeId: a.project.intakeId,
        researchTitle: a.project.researchTitle,
        grossAmount,
        commissionPercentage: pay.percent,
        commissionEarned: pay.amount,
        status: a.project.masterStatus,
      });
    }

    const completedStudiesGrossValue = itemizedStudies.reduce((sum, s) => sum + s.grossAmount, 0);
    const commissionEarnings = Math.round(itemizedStudies.reduce((sum, s) => sum + s.commissionEarned, 0) * 100) / 100;

    // 3. Salary, hourly pay, overtime, allowance (salary and allowance halved for a half-month)
    const fullMonthlyBase = config.compensationType === "FIXED_SALARY" || config.compensationType === "HYBRID" ? config.baseSalaryMonthly : 0;
    const baseSalary = Math.round(fullMonthlyBase * prorationMultiplier * 100) / 100;
    const hourlyRate = paysHourly ? config.hourlyDutyRate || 0 : 0;
    const hourlyDutyEarnings = Math.round(verifiedDutyHours * hourlyRate * 100) / 100;
    // Overtime at 1.25x their own hourly rate (it used to fall back to ₱550 an hour for anyone, salaried staff included).
    const overtimeEarnings = Math.round(overtimeHours * hourlyRate * 1.25 * 100) / 100;
    const allowances = Math.round((config.allowancesMonthly || 0) * prorationMultiplier * 100) / 100;

    const grossEarnings = Math.round((baseSalary + hourlyDutyEarnings + commissionEarnings + overtimeEarnings + allowances) * 100) / 100;
    const taxThreshold = isHalfMonth ? 10416.5 : 20833.0;
    const withholdingTax = grossEarnings > taxThreshold ? Math.round((grossEarnings - taxThreshold) * 0.15 * 100) / 100 : 0;
    const otherDeductions = 0;
    const netPay = Math.round((grossEarnings - withholdingTax - otherDeductions) * 100) / 100;

    const payslip: StaffPayslipDTO = {
      id: current?.id ?? `ps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      payslipNumber: current?.payslipNumber ?? `${prefix}${String(nextNumber++).padStart(3, "0")}`,
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
      status: "DRAFT",
      disbursementMethod: null,
      disbursementReference: null,
      disbursedAt: null,
      disbursedBy: null,
      disbursedByName: null,
      employerName: current?.employerName || ceoName,
      approvedByName: current?.approvedByName || ceoName,
      generatedBy: session.user.fullName || "Finance",
      notes: config.notes || null,
      createdAt: current?.createdAt ?? nowStr,
      updatedAt: nowStr,
    };

    try {
      await savePayslip(payslip);
      made++;
    } catch (err) {
      console.error("[generateBatchPayslips] Couldn't save a payslip:", err);
      return {
        success: false,
        error: { message: `We saved ${made} payslip${made === 1 ? "" : "s"} but couldn't save the rest. Please try again.` },
      };
    }
  }

  refreshPayrollPages();

  try {
    dispatchRealtimeNotification({
      eventType: "PAYROLL_UPDATE",
      title: "Payslips made",
      message: `${made} payslip${made === 1 ? "" : "s"} made for ${formalPeriodLabel}${skipped ? ` (${skipped} already approved or paid, left as they were)` : ""}.`,
      targetRoles: ["FINANCE_OFFICER", "CEO"],
      excludeUserId: session.user.id,
    });
  } catch (notifyErr) {
    console.warn("[generateBatchPayslips] Realtime notification warning:", notifyErr);
  }

  return { success: true, count: made, skipped };
}

/**
 * 6. All payslips with totals (finance, the CEO and admins).
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
  let payslips: StaffPayslipDTO[] = [];
  try {
    payslips = await listPayslips();
  } catch (err) {
    console.error("[getCompanyPayslips] Couldn't load payslips:", err);
  }
  const availablePeriods = Array.from(new Set(payslips.map((p) => p.payPeriodMonth)));

  let filtered = [...payslips];
  if (filters?.period && filters.period !== "ALL") filtered = filtered.filter((p) => p.payPeriodMonth === filters.period);
  if (filters?.status && filters.status !== "ALL") filtered = filtered.filter((p) => p.status === filters.status);
  if (filters?.role && filters.role !== "ALL") filtered = filtered.filter((p) => p.staffRole === filters.role);

  return {
    payslips: await withDisplayDetails(filtered),
    kpis: {
      totalInstitutionalPayroll: filtered.reduce((sum, p) => sum + p.netPay, 0),
      totalDisbursed: filtered.filter((p) => p.status === "DISBURSED").reduce((sum, p) => sum + p.netPay, 0),
      pendingDisbursementsCount: filtered.filter((p) => p.status !== "DISBURSED").length,
      totalDutyHoursCompensated: Math.round(filtered.reduce((sum, p) => sum + p.verifiedDutyHours, 0) * 10) / 10,
      totalStudiesRewarded: filtered.reduce((sum, p) => sum + p.completedStudiesCount, 0),
      activeStaffCount: new Set(filtered.map((p) => p.userId)).size,
    },
    availablePeriods,
  };
}

/**
 * 7. Mark a payslip as paid, with how and the reference (finance, the CEO and admins).
 */
export async function disbursePayslip(
  input: unknown
): Promise<{ success: boolean; data?: StaffPayslipDTO; error?: { message: string } }> {
  const session = await requireRole("FINANCE_OFFICER", "CEO", "ADMIN");
  const parsed = DisbursePayslipSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: parsed.error.issues[0]?.message || "Please check the payment details." } };
  }

  const { payslipId, disbursementMethod, disbursementReference, notes } = parsed.data;
  const target = await findPayslip(payslipId).catch(() => null);
  if (!target) return { success: false, error: { message: "We couldn't find that payslip." } };
  if (target.status === "DISBURSED") return { success: false, error: { message: "This payslip is already marked as paid." } };

  const updated: StaffPayslipDTO = {
    ...target,
    status: "DISBURSED",
    disbursementMethod,
    disbursementReference,
    disbursedAt: new Date().toISOString(),
    disbursedBy: session.user.id,
    disbursedByName: session.user.fullName || "Finance",
    notes: notes || target.notes,
    updatedAt: new Date().toISOString(),
  };
  try {
    await savePayslip(updated);
  } catch (err) {
    console.error("[disbursePayslip] Save failed:", err);
    return { success: false, error: { message: "We couldn't save the payment. Please try again." } };
  }
  refreshPayrollPages();

  try {
    dispatchRealtimeNotification({
      eventType: "PAYROLL_UPDATE",
      title: "Your pay was sent",
      message: `₱${updated.netPay.toLocaleString()} was sent by ${updated.disbursementMethod || "bank transfer"} (ref ${updated.disbursementReference || "—"}).`,
      targetUserIds: [updated.userId],
      excludeUserId: session.user.id,
    });
    dispatchRealtimeNotification({
      eventType: "PAYROLL_UPDATE",
      title: "Staff pay sent",
      message: `Payslip ${updated.payslipNumber} (₱${updated.netPay.toLocaleString()}) for ${updated.staffName} was marked as paid.`,
      targetRoles: ["CEO"],
      excludeUserId: session.user.id,
    });
  } catch (notifyErr) {
    console.warn("[disbursePayslip] Realtime notification warning:", notifyErr);
  }

  return { success: true, data: updated };
}

/**
 * 8. Approve a payslip (finance, the CEO and admins).
 */
export async function approvePayslip(payslipId: string): Promise<{ success: boolean; error?: { message: string } }> {
  const session = await requireRole("FINANCE_OFFICER", "CEO", "ADMIN");
  const target = await findPayslip(payslipId).catch(() => null);
  if (!target) return { success: false, error: { message: "We couldn't find that payslip." } };
  if (target.status === "DISBURSED") return { success: false, error: { message: "This payslip is already paid." } };

  try {
    await savePayslip({ ...target, status: "APPROVED", updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[approvePayslip] Save failed:", err);
    return { success: false, error: { message: "We couldn't approve the payslip. Please try again." } };
  }
  refreshPayrollPages();

  try {
    dispatchRealtimeNotification({
      eventType: "PAYROLL_UPDATE",
      title: "Payslip approved",
      message: `Your payslip ${target.payslipNumber} for ${target.payPeriodMonth} was approved.`,
      targetUserIds: [target.userId],
      excludeUserId: session.user.id,
    });
  } catch (notifyErr) {
    console.warn("[approvePayslip] Realtime notification warning:", notifyErr);
  }

  return { success: true };
}

/**
 * 9. The signed-in staff member's own payslips. No payslip yet means none is shown (it used to invent one).
 */
export async function getMyOfficialPayslip(
  payPeriodMonthOrId?: string
): Promise<{ payslip: StaffPayslipDTO | null; allMyPayslips: StaffPayslipDTO[] }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Authentication required.");

  let mine: StaffPayslipDTO[] = [];
  try {
    mine = await listPayslips({ userId: session.user.id });
  } catch (err) {
    console.error("[getMyOfficialPayslip] Couldn't load payslips:", err);
  }
  mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  mine = await withDisplayDetails(mine);

  const target =
    (payPeriodMonthOrId &&
      mine.find((p) => p.id === payPeriodMonthOrId || p.payPeriodMonth === payPeriodMonthOrId || p.payslipNumber === payPeriodMonthOrId)) ||
    mine[0] ||
    null;
  return { payslip: target, allMyPayslips: mine };
}

/**
 * 10. The signed-in staff member's payout details (where they're paid).
 */
export async function getMyPayoutDetails(): Promise<{ success: boolean; data: StaffPayoutDetailsDTO | null }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, data: null };

  const details = (await readPayoutDetails([session.user.id]).catch(() => new Map<string, StaffPayoutDetailsDTO>())).get(session.user.id);
  return {
    success: true,
    data: details ?? {
      userId: session.user.id,
      payoutChannel: "GCASH",
      accountNumber: "",
      accountName: session.user.fullName || "",
      bankName: "",
      notes: "",
    },
  };
}

/**
 * 11. Save the signed-in staff member's payout details (staff only).
 */
export async function updateMyPayoutDetails(
  input: Omit<StaffPayoutDetailsDTO, "userId" | "updatedAt">
): Promise<{ success: boolean; data?: StaffPayoutDetailsDTO; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Please log in again." };
  if (!session.user.role || session.user.role === "CLIENT") return { success: false, error: "Only staff can add payout details." };

  const validation = StaffPayoutDetailsSchema.safeParse({ ...input, userId: session.user.id, updatedAt: new Date().toISOString() });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || "Please check your payout details." };
  }

  try {
    await writePayoutDetails(validation.data);
  } catch (err) {
    console.error("[updateMyPayoutDetails] Save failed:", err);
    return { success: false, error: "We couldn't save your payout details. Please try again." };
  }
  refreshPayrollPages();
  return { success: true, data: validation.data };
}

/**
 * 12. One staff member's payout details (finance, the CEO, admins, or the person themselves).
 */
export async function getStaffPayoutDetails(userId: string): Promise<StaffPayoutDetailsDTO | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const allowed = session.user.id === userId || MANAGERS.includes(session.user.role as RoleName);
  if (!allowed) return null;
  return (await readPayoutDetails([userId]).catch(() => new Map<string, StaffPayoutDetailsDTO>())).get(userId) ?? null;
}

/**
 * 13. One payslip by ID or number: its owner, or finance, the CEO and admins. Anyone else gets nothing, the
 * same as for a payslip that doesn't exist (payslip numbers are easy to guess).
 */
export async function getPayslipById(payslipIdOrNumber: string): Promise<StaffPayslipDTO | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const found = await findPayslip(payslipIdOrNumber).catch(() => null);
  if (!found) return null;
  const allowed = found.userId === session.user.id || MANAGERS.includes(session.user.role as RoleName);
  if (!allowed) {
    console.warn("[getPayslipById] Refused a payslip that isn't theirs", { userId: session.user.id, payslip: found.payslipNumber });
    return null;
  }
  return (await withDisplayDetails([found]))[0] ?? null;
}

// ─── My Earnings (analysts and reviewers) ───────────────────────────────────────

/** One assigned study, in the same shape from the database and from the offline sample files. */
type EarningSource = {
  projectId: string;
  intakeId: string;
  title: string;
  packageName: string | null;
  status: string;
  deliveredAt: string | null;
  gross: number | null;
  fullyPaid: boolean;
  onHold: boolean;
};

const DONE = ["DELIVERED", "CLOSED"];
const STOPPED = ["CANCELLED", "EXPIRED", "HALTED", "ETHICAL_BREACH"];

async function loadMyStudies(userId: string, email: string | null | undefined, asAnalyst: boolean): Promise<EarningSource[]> {
  if (isOfflineDev()) return devEarningStudies({ id: userId, email }, asAnalyst ? "STATISTICIAN" : "SENIOR_QA_LEAD");
  const rows = await withDbTimeout(
    db.assignment.findMany({
      where: asAnalyst ? { statisticianId: userId } : { qaLeadId: userId },
      select: {
        projectId: true,
        project: {
          select: {
            intakeId: true,
            researchTitle: true,
            masterStatus: true,
            packageName: true,
            deliveredAt: true,
            hasActiveDispute: true,
            hasPendingRefund: true,
            sows: { select: { totalAmount: true, isLocked: true }, orderBy: { generatedAt: "desc" } },
            quotations: { select: { status: true, totalAmount: true, downpaymentRequired: true }, orderBy: { createdAt: "desc" } },
            payments: { select: { amountSubmitted: true, paymentStatus: true } },
          },
        },
      },
    }),
    8000
  );
  return rows.map((a) => {
    const p = a.project;
    const signed = p.sows.find((x) => x.isLocked) ?? p.sows[0];
    const quote = p.quotations.find((q) => q.status === "CLIENT_APPROVED");
    const gross = signed ? Number(signed.totalAmount) : quote ? Number(quote.totalAmount) : null;
    const balance = quote ? calculateProjectBalance(p.payments, Number(quote.totalAmount), Number(quote.downpaymentRequired)) : null;
    return {
      projectId: a.projectId,
      intakeId: p.intakeId,
      title: p.researchTitle,
      packageName: p.packageName,
      status: p.masterStatus,
      deliveredAt: p.deliveredAt?.toISOString() ?? null,
      gross,
      fullyPaid: Boolean(balance && balance.remainingBalance <= 0),
      onHold: p.hasActiveDispute || p.hasPendingRefund,
    };
  });
}

/**
 * The signed-in analyst's or reviewer's pay per study, worked out exactly like the payslip (studyPayFor with their
 * pay settings): what's been paid, what's on a payslip, what goes on the next payslip, and what comes later.
 */
export async function getMyStudyEarnings(): Promise<{ success: true; data: MyStudyEarningsDTO } | { success: false; error: { message: string } }> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || (user.role !== "STATISTICIAN" && user.role !== "SENIOR_QA_LEAD")) {
    return { success: false, error: { message: "Only analysts and reviewers have study earnings." } };
  }
  try {
    const role = user.role as RoleName;
    const isAnalyst = role === "STATISTICIAN";
    const storage = await cachedPayrollStorage();
    const override = storage.staffOverrides[user.id];
    const config = override || storage.roleConfigs[role] || DEFAULT_ROLE_CONFIGS[role]!;
    const perStudy = paysPerStudy(config.compensationType);

    const [sources, slips] = await Promise.all([loadMyStudies(user.id, user.email, isAnalyst), listPayslips({ userId: user.id })]);

    // Which payslip (if any) each study is on. Newest payslip first.
    const onSlip = new Map<string, { slip: StaffPayslipDTO; item: PayslipItemizedStudy }>();
    for (const slip of slips) for (const item of slip.itemizedStudies ?? []) if (!onSlip.has(item.projectId)) onSlip.set(item.projectId, { slip, item });

    const studies: StudyEarningItem[] = [];
    for (const s of sources) {
      const base = {
        projectId: s.projectId,
        intakeId: s.intakeId,
        title: s.title,
        packageName: s.packageName,
        role: (isAnalyst ? "analyst" : "reviewer") as StudyEarningItem["role"],
        deliveredAt: s.deliveredAt,
      };
      const found = onSlip.get(s.projectId);
      if (found) {
        studies.push({
          ...base,
          gross: found.item.grossAmount,
          percent: found.item.commissionPercentage,
          bonus: config.fixedPerStudyBonus || 0,
          amount: found.item.commissionEarned,
          state: found.slip.status === "DISBURSED" ? "paid" : "onPayslip",
          payslip: { id: found.slip.id, number: found.slip.payslipNumber, status: found.slip.status, period: found.slip.payPeriodMonth },
        });
        continue;
      }
      const state: StudyEarningItem["state"] = STOPPED.includes(s.status)
        ? "stopped"
        : s.status === "DISPUTED" || (DONE.includes(s.status) && s.onHold)
          ? "onHold"
          : DONE.includes(s.status)
            ? s.fullyPaid
              ? "next"
              : "waitingPayment"
            : "notDelivered";
      const pay =
        perStudy && state !== "stopped" && s.gross !== null
          ? await studyPayFor({ isAnalyst, grossAmount: s.gross, packageName: s.packageName, config, personalPercent: override?.commissionPercentagePerStudy })
          : null;
      studies.push({
        ...base,
        gross: s.gross,
        percent: pay?.percent ?? 0,
        bonus: pay?.bonus ?? 0,
        amount: pay?.amount ?? null,
        state,
        payslip: null,
      });
    }

    const sum = (states: StudyEarningItem["state"][]) =>
      Math.round(studies.filter((x) => states.includes(x.state)).reduce((t, x) => t + (x.amount ?? 0), 0) * 100) / 100;
    return {
      success: true,
      data: {
        payModel: config.compensationType,
        payText: payModelSummary(config),
        paysPerStudy: perStudy,
        studies,
        totals: { paid: sum(["paid"]), onPayslip: sum(["onPayslip"]), next: sum(["next"]), later: sum(["waitingPayment", "notDelivered", "onHold"]) },
      },
    };
  } catch (err) {
    console.error("[getMyStudyEarnings] Error:", err);
    return { success: false, error: { message: "Your earnings didn't load. Try again in a moment." } };
  }
}
