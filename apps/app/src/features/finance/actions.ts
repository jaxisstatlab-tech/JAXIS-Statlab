"use server";

import { revalidatePath } from "next/cache";
import { auth, requireRole } from "@/lib/auth";
import { getDb, withDbTimeout } from "@/lib/db";
import {
  DisbursePayoutSchema,
  VoidPayoutSchema,
  UpdatePayoutRateSchema,
  PayoutFilterSchema,
  LedgerFilterSchema,
  type PayoutDTO,
  type FinancialLedgerDTO,
  type CeoFinancialOverviewDTO,
  type SpecialistPayoutDTO,
  type PayoutRateConfigDTO,
} from "./schemas";
import {
  assertPayoutEligible,
  computePayoutEligibility,
  calculateAndSyncProjectPayouts,
  DEFAULT_PAYOUT_RATES,
  DEFAULT_QA_PAYOUT_RATES,
  readPackageRates,
  writePackageRates,
} from "@/lib/payout-rules";

export interface FinanceActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

/**
 * 1. Get Finance Milestone Payout Queue with RULE_PAY_01 Checklist
 */
export async function getFinancePayoutQueue(
  filters?: unknown
): Promise<FinanceActionResult<{ payouts: PayoutDTO[]; summary: { pendingCount: number; readyCount: number; disbursedYtd: number; blockedCount: number } }>> {
  await requireRole("FINANCE_OFFICER", "ADMIN", "CEO");
  const client = getDb();

  const parsedFilters = PayoutFilterSchema.safeParse(filters || {});
  const statusFilter = parsedFilters.success ? parsedFilters.data.status : "ALL";
  const searchFilter = parsedFilters.success ? parsedFilters.data.search?.toLowerCase().trim() : "";

  try {
    const payoutDelegate = (client as any).payout;
    if (!payoutDelegate) {
      return {
        success: true,
        data: {
          payouts: [],
          summary: { pendingCount: 0, readyCount: 0, disbursedYtd: 0, blockedCount: 0 },
        },
      };
    }

    // Parallel fetch: payouts with project relations, registered payout accounts, and user names
    const [rawPayouts, staffPayoutAccounts, allUsers] = await Promise.all([
      withDbTimeout<any[]>(
        payoutDelegate.findMany({
          include: {
            project: {
              include: {
                client: true,
                payments: { orderBy: { createdAt: "desc" }, take: 1 },
                quotations: { where: { status: "CLIENT_APPROVED" }, take: 1 },
              },
            },
            recipient: true,
          },
          orderBy: { createdAt: "desc" },
        })
      ),
      withDbTimeout<any[]>(
        (client as any).staffPayoutAccount?.findMany() || Promise.resolve([])
      ),
      withDbTimeout<any[]>(
        client.user.findMany({ select: { id: true, fullName: true } })
      ),
    ]);

    const accountMap = new Map<string, any>();
    for (const acc of staffPayoutAccounts || []) {
      accountMap.set(acc.userId, acc);
    }

    const userMap = new Map<string, string>();
    for (const u of allUsers || []) {
      userMap.set(u.id, u.fullName);
    }

    let pendingCount = 0;
    let readyCount = 0;
    let disbursedYtd = 0;
    let blockedCount = 0;

    const mappedPayouts: PayoutDTO[] = [];

    for (const p of (rawPayouts || []) as any[]) {
      // In-memory instant eligibility evaluation (0ms database round-trips)
      const eligibility = computePayoutEligibility(p.project);
      const isEligible = eligibility.eligible;

      const registeredAcc = accountMap.get(p.recipientId);

      if (p.payoutStatus === "DISBURSED") {
        disbursedYtd += Number(p.payoutAmount);
      } else if (p.payoutStatus !== "VOIDED") {
        if (isEligible) {
          readyCount++;
        } else {
          blockedCount++;
          pendingCount++;
        }
      }

      // Filter by status if requested
      if (statusFilter !== "ALL") {
        if (statusFilter === "APPROVED" && (!isEligible || p.payoutStatus === "DISBURSED" || p.payoutStatus === "VOIDED")) {
          // skip
        } else if (p.payoutStatus !== statusFilter) {
          continue;
        }
      }

      // Filter by search query
      if (searchFilter) {
        const titleMatch = p.project.researchTitle?.toLowerCase().includes(searchFilter);
        const idMatch = p.project.intakeId?.toLowerCase().includes(searchFilter);
        const recipientMatch = p.recipient.fullName?.toLowerCase().includes(searchFilter);
        if (!titleMatch && !idMatch && !recipientMatch) {
          continue;
        }
      }

      mappedPayouts.push({
        id: p.id,
        projectId: p.projectId,
        projectIntakeId: p.project.intakeId,
        projectTitle: p.project.researchTitle,
        masterStatus: p.project.masterStatus,
        packageName: p.project.packageName || p.project.quotations[0]?.packageName || "JX_03_CORE",
        clientName: p.project.client.fullName,
        recipientId: p.recipientId,
        recipientName: p.recipient.fullName,
        recipientEmail: p.recipient.email,
        recipientRole: p.recipientRole,
        grossProjectAmount: Number(p.grossProjectAmount),
        payoutRateApplied: Number(p.payoutRateApplied),
        payoutAmount: Number(p.payoutAmount),
        payoutStatus: p.payoutStatus,
        isEligible,
        eligibilityReasons: eligibility.violations,
        registeredAccount: registeredAcc
          ? {
              payoutMethod: registeredAcc.payoutMethod,
              accountName: registeredAcc.accountName,
              accountNumber: registeredAcc.accountNumber,
              bankName: registeredAcc.bankName || null,
              isVerified: registeredAcc.isVerified,
            }
          : null,
        voidReason: p.voidReason,
        disbursedAt: p.disbursedAt ? p.disbursedAt.toISOString() : null,
        disbursedBy: p.disbursedBy,
        disbursedByName: p.disbursedBy ? userMap.get(p.disbursedBy) || null : null,
        approvedBy: p.approvedBy,
        disbursementMethod: p.disbursementMethod,
        disbursementRef: p.disbursementRef,
        disbursementProofUrl: p.disbursementProofUrl,
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      });
    }

    return {
      success: true,
      data: {
        payouts: mappedPayouts,
        summary: {
          pendingCount,
          readyCount,
          disbursedYtd,
          blockedCount,
        },
      },
    };
  } catch (err: any) {
    console.error("[getFinancePayoutQueue] Error:", err);
    return {
      success: false,
      error: { code: "QUEUE_FETCH_FAILED", message: err.message || "Failed to load payout queue." },
    };
  }
}

/**
 * 2. Calculate and Synchronize Project Payout
 */
export async function calculateProjectPayoutAction(
  projectId: string
): Promise<FinanceActionResult<{ statisticianShare: number; qaLeadShare: number; netMargin: number }>> {
  await requireRole("FINANCE_OFFICER", "ADMIN", "CEO");

  try {
    const result = await calculateAndSyncProjectPayouts(projectId);
    revalidatePath("/dashboard/finance/payouts");
    revalidatePath("/dashboard/finance/ledger");
    revalidatePath("/dashboard/ceo/finance");

    return {
      success: true,
      data: {
        statisticianShare: result.statisticianPayoutAmount,
        qaLeadShare: result.qaLeadPayoutAmount,
        netMargin: result.netMargin,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: "CALCULATION_FAILED", message: err.message || "Failed to compute payout amounts." },
    };
  }
}

/**
 * 3. Approve Payout (Gated by RULE_PAY_01)
 */
export async function approvePayoutAction(
  payoutId: string
): Promise<FinanceActionResult<{ id: string; status: string }>> {
  const session = await requireRole("FINANCE_OFFICER", "ADMIN", "CEO");
  const client = getDb();

  try {
    const payout = await withDbTimeout<any>((client as any).payout.findUnique({ where: { id: payoutId } }));
    if (!payout) {
      return { success: false, error: { code: "NOT_FOUND", message: "Payout record not found." } };
    }

    const eligibility = await assertPayoutEligible(payout.projectId);
    if (!eligibility.eligible) {
      return {
        success: false,
        error: {
          code: "PAYOUT_NOT_ELIGIBLE",
          message: eligibility.reason || "Project does not meet RULE_PAY_01 requirements for payout release.",
        },
      };
    }

    const updated = await withDbTimeout<any>(
      (client as any).payout.update({
        where: { id: payoutId },
        data: {
          payoutStatus: "APPROVED",
          approvedBy: session.user.id,
        },
      })
    );

    revalidatePath("/dashboard/finance/payouts");
    revalidatePath("/dashboard/finance/ledger");
    revalidatePath("/dashboard/ceo/finance");

    return {
      success: true,
      data: { id: updated?.id || payoutId, status: updated?.payoutStatus || "APPROVED" },
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: "APPROVAL_FAILED", message: err.message || "Failed to approve payout." },
    };
  }
}

/**
 * 4. Disburse Payout (Enforces RULE_PAY_01 & Records Transaction Particulars)
 */
export async function disbursePayoutAction(
  input: unknown
): Promise<FinanceActionResult<{ id: string; status: string; disbursedAt: string }>> {
  const session = await requireRole("FINANCE_OFFICER", "ADMIN", "CEO");
  const client = getDb();

  const parsed = DisbursePayoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please provide valid transaction disbursement details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { payoutId, disbursementMethod, disbursementRef, disbursementProofUrl, notes } = parsed.data;

  try {
    const payout = await withDbTimeout<any>((client as any).payout.findUnique({ where: { id: payoutId } }));
    if (!payout) {
      return { success: false, error: { code: "NOT_FOUND", message: "Payout record not found." } };
    }

    if (payout.payoutStatus === "DISBURSED") {
      return { success: false, error: { code: "ALREADY_DISBURSED", message: "This payout has already been marked disbursed." } };
    }

    if (payout.payoutStatus === "VOIDED") {
      return { success: false, error: { code: "PAYOUT_VOIDED", message: "Cannot disburse a voided payout." } };
    }

    // Strict Enforcement of RULE_PAY_01
    const eligibility = await assertPayoutEligible(payout.projectId);
    if (!eligibility.eligible) {
      return {
        success: false,
        error: {
          code: "PAYOUT_NOT_ELIGIBLE",
          message: eligibility.reason || "Project is not eligible for disbursement under RULE_PAY_01.",
        },
      };
    }

    const now = new Date();
    const updated = await withDbTimeout<any>(
      (client as any).payout.update({
        where: { id: payoutId },
        data: {
          payoutStatus: "DISBURSED",
          disbursedAt: now,
          disbursedBy: session.user.id,
          disbursementMethod,
          disbursementRef: disbursementRef.trim(),
          disbursementProofUrl: disbursementProofUrl?.trim() || null,
          notes: notes?.trim() || null,
        },
      })
    );

    revalidatePath("/dashboard/finance/payouts");
    revalidatePath("/dashboard/finance/ledger");
    revalidatePath("/dashboard/ceo/finance");
    revalidatePath("/dashboard/statistician/payouts");
    revalidatePath("/dashboard/qa/payouts");

    return {
      success: true,
      data: {
        id: updated?.id || payoutId,
        status: updated?.payoutStatus || "DISBURSED",
        disbursedAt: now.toISOString(),
      },
    };
  } catch (err: any) {
    console.error("[disbursePayoutAction] Error:", err);
    return {
      success: false,
      error: { code: "DISBURSE_FAILED", message: err.message || "Failed to complete milestone disbursement." },
    };
  }
}

/**
 * 5. Void Payout with Documented Reason
 */
export async function voidPayoutAction(
  input: unknown
): Promise<FinanceActionResult<{ id: string; status: string }>> {
  await requireRole("ADMIN", "CEO");
  const client = getDb();

  const parsed = VoidPayoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please state a valid reason for voiding this payout.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { payoutId, voidReason } = parsed.data;

  try {
    const payout = await withDbTimeout<any>((client as any).payout.findUnique({ where: { id: payoutId } }));
    if (!payout) {
      return { success: false, error: { code: "NOT_FOUND", message: "Payout record not found." } };
    }

    if (payout.payoutStatus === "DISBURSED") {
      return {
        success: false,
        error: { code: "INVALID_STATE", message: "Cannot void a payout that has already been disbursed." },
      };
    }

    const updated = await withDbTimeout<any>(
      (client as any).payout.update({
        where: { id: payoutId },
        data: {
          payoutStatus: "VOIDED",
          voidReason: voidReason.trim(),
        },
      })
    );

    revalidatePath("/dashboard/finance/payouts");
    revalidatePath("/dashboard/finance/ledger");
    revalidatePath("/dashboard/ceo/finance");

    return {
      success: true,
      data: { id: updated?.id || payoutId, status: updated?.payoutStatus || "VOIDED" },
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: "VOID_FAILED", message: err.message || "Failed to void payout." },
    };
  }
}

/**
 * 6. Get Itemized Project Financial Ledger
 */
export async function getFinancialLedgerAction(
  filters?: unknown
): Promise<FinanceActionResult<{ ledgers: FinancialLedgerDTO[]; summary: { totalGross: number; totalPayouts: number; totalMargin: number; avgMarginPercent: number } }>> {
  await requireRole("FINANCE_OFFICER", "ADMIN", "CEO");
  const client = getDb();

  const parsed = LedgerFilterSchema.safeParse(filters || {});
  const packageFilter = parsed.success ? parsed.data.packageName : undefined;
  const searchFilter = parsed.success ? parsed.data.search?.toLowerCase().trim() : "";

  try {
    const rawLedgers = await withDbTimeout<any[]>(
      (client as any).financialLedger.findMany({
        include: {
          project: {
            include: {
              client: true,
              quotations: { where: { status: "CLIENT_APPROVED" }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    );

    let totalGross = 0;
    let totalPayouts = 0;
    let totalMargin = 0;

    const mapped: FinancialLedgerDTO[] = [];

    for (const l of (rawLedgers || []) as any[]) {
      const grossRevenue = Number(l.grossRevenue);
      const statisticianShare = Number(l.statisticianShare);
      const qaLeadShare = Number(l.qaLeadShare);
      const netMargin = Number(l.netMargin);
      const marginPercent = grossRevenue > 0 ? Math.round((netMargin / grossRevenue) * 1000) / 10 : 0;
      const packageName = l.project.packageName || l.project.quotations[0]?.packageName || "JX_03_CORE";

      if (packageFilter && packageName !== packageFilter) {
        continue;
      }

      if (searchFilter) {
        const titleMatch = l.project.researchTitle?.toLowerCase().includes(searchFilter);
        const intakeMatch = l.project.intakeId?.toLowerCase().includes(searchFilter);
        const clientMatch = l.project.client.fullName?.toLowerCase().includes(searchFilter);
        if (!titleMatch && !intakeMatch && !clientMatch) {
          continue;
        }
      }

      totalGross += grossRevenue;
      totalPayouts += (statisticianShare + qaLeadShare);
      totalMargin += netMargin;

      mapped.push({
        id: l.id,
        projectId: l.projectId,
        projectIntakeId: l.project.intakeId,
        projectTitle: l.project.researchTitle,
        clientName: l.project.client.fullName,
        packageName,
        masterStatus: l.project.masterStatus,
        grossRevenue,
        platformFee: Number(l.platformFee),
        statisticianShare,
        qaLeadShare,
        netMargin,
        marginPercent,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      });
    }

    const avgMarginPercent = totalGross > 0 ? Math.round((totalMargin / totalGross) * 1000) / 10 : 0;

    return {
      success: true,
      data: {
        ledgers: mapped,
        summary: {
          totalGross,
          totalPayouts,
          totalMargin,
          avgMarginPercent,
        },
      },
    };
  } catch (err: any) {
    console.error("[getFinancialLedgerAction] Error:", err);
    return {
      success: false,
      error: { code: "LEDGER_FETCH_FAILED", message: err.message || "Failed to load financial ledger." },
    };
  }
}

/**
 * 7. Get CEO Financial Overview & Package Profitability
 */
export async function getCeoFinancialOverviewAction(): Promise<FinanceActionResult<CeoFinancialOverviewDTO>> {
  await requireRole("CEO", "ADMIN");
  const client = getDb();

  try {
    // 1. Fetch all rate configs (or seed defaults if empty)
    let rateConfigs: any[] = await withDbTimeout<any[]>(
      (client as any).payoutRateConfig.findMany({ orderBy: { packageName: "asc" } })
    ) || [];

    if (rateConfigs.length === 0) {
      for (const [pkg, rate] of Object.entries(DEFAULT_PAYOUT_RATES)) {
        await withDbTimeout(
          (client as any).payoutRateConfig.upsert({
            where: { packageName: pkg },
            create: { packageName: pkg, ratePercent: rate },
            update: {},
          })
        );
      }
      rateConfigs = await withDbTimeout<any[]>((client as any).payoutRateConfig.findMany({ orderBy: { packageName: "asc" } })) || [];
    }

    const allUsers = await withDbTimeout(client.user.findMany({ select: { id: true, fullName: true } }));
    const userMap = new Map<string, string>();
    for (const u of allUsers) userMap.set(u.id, u.fullName);

    const customRates = readPackageRates();
    const mappedConfigs: PayoutRateConfigDTO[] = rateConfigs.map((c) => {
      const custom = customRates[c.packageName];
      return {
        id: c.id,
        packageName: c.packageName,
        ratePercent: custom?.ratePercent ?? Number(c.ratePercent),
        qaRatePercent: custom?.qaRatePercent ?? (DEFAULT_QA_PAYOUT_RATES[c.packageName] || 10.0),
        effectiveFrom: c.effectiveFrom.toISOString(),
        approvedBy: c.approvedBy,
        approvedByName: c.approvedBy ? userMap.get(c.approvedBy) || null : null,
      };
    });

    const configMap = new Map<string, PayoutRateConfigDTO>();
    for (const c of mappedConfigs) configMap.set(c.packageName, c);

    // 2. Fetch Ledgers & Payouts for High-Level Aggregation
    const ledgers = await withDbTimeout<any[]>(
      (client as any).financialLedger.findMany({
        include: {
          project: {
            include: {
              quotations: { where: { status: "CLIENT_APPROVED" }, take: 1 },
              payments: true,
            },
          },
        },
      })
    ) || [];

    const payouts = await withDbTimeout<any[]>((client as any).payout.findMany()) || [];

    let grossRealizedRevenue = 0;
    let totalDisbursed = 0;
    let pendingDisbursements = 0;
    let netRealizedMargin = 0;

    const packageBuckets: Record<string, { projectCount: number; grossRevenue: number; totalPayouts: number; netMargin: number }> = {
      JX_01_DATACHECK: { projectCount: 0, grossRevenue: 0, totalPayouts: 0, netMargin: 0 },
      JX_02_START: { projectCount: 0, grossRevenue: 0, totalPayouts: 0, netMargin: 0 },
      JX_03_CORE: { projectCount: 0, grossRevenue: 0, totalPayouts: 0, netMargin: 0 },
      JX_04_ADVANCED: { projectCount: 0, grossRevenue: 0, totalPayouts: 0, netMargin: 0 },
      DEFENSELAB: { projectCount: 0, grossRevenue: 0, totalPayouts: 0, netMargin: 0 },
    };

    for (const l of ledgers) {
      const gross = Number(l.grossRevenue);
      const statShare = Number(l.statisticianShare);
      const qaShare = Number(l.qaLeadShare);
      const margin = Number(l.netMargin);
      const pkg = l.project.packageName || l.project.quotations[0]?.packageName || "JX_03_CORE";

      grossRealizedRevenue += gross;
      netRealizedMargin += margin;

      if (!packageBuckets[pkg]) {
        packageBuckets[pkg] = { projectCount: 0, grossRevenue: 0, totalPayouts: 0, netMargin: 0 };
      }
      packageBuckets[pkg].projectCount++;
      packageBuckets[pkg].grossRevenue += gross;
      packageBuckets[pkg].totalPayouts += (statShare + qaShare);
      packageBuckets[pkg].netMargin += margin;
    }

    for (const p of payouts) {
      const amt = Number(p.payoutAmount);
      if (p.payoutStatus === "DISBURSED") {
        totalDisbursed += amt;
      } else if (p.payoutStatus !== "VOIDED") {
        pendingDisbursements += amt;
      }
    }

    // Escrow balance = Total verified payments minus total disbursed
    const escrowBalance = Math.max(0, grossRealizedRevenue - totalDisbursed);
    const averageMarginPercent = grossRealizedRevenue > 0 ? Math.round((netRealizedMargin / grossRealizedRevenue) * 1000) / 10 : 0;

    const packageProfitability = Object.entries(packageBuckets).map(([pkgName, data]) => {
      const marginPercent = data.grossRevenue > 0 ? Math.round((data.netMargin / data.grossRevenue) * 1000) / 10 : 0;
      const cfg = configMap.get(pkgName);
      return {
        packageName: pkgName,
        projectCount: data.projectCount,
        grossRevenue: data.grossRevenue,
        totalPayouts: data.totalPayouts,
        netMargin: data.netMargin,
        marginPercent,
        currentRatePercent: cfg?.ratePercent ?? DEFAULT_PAYOUT_RATES[pkgName] ?? 60,
        currentQaRatePercent: cfg?.qaRatePercent ?? DEFAULT_QA_PAYOUT_RATES[pkgName] ?? 10,
      };
    });

    return {
      success: true,
      data: {
        escrowBalance,
        grossRealizedRevenue,
        totalDisbursed,
        pendingDisbursements,
        netRealizedMargin,
        averageMarginPercent,
        packageProfitability,
        rateConfigs: mappedConfigs,
      },
    };
  } catch (err: any) {
    console.error("[getCeoFinancialOverviewAction] Error:", err);
    return {
      success: false,
      error: { code: "OVERVIEW_FETCH_FAILED", message: err.message || "Failed to load CEO financial overview." },
    };
  }
}

/**
 * 8. Update Package Payout Rate (CEO Executive Authority)
 */
export async function updatePayoutRateConfigAction(
  input: unknown
): Promise<FinanceActionResult<{ packageName: string; ratePercent: number; qaRatePercent: number }>> {
  const session = await requireRole("CEO");
  const client = getDb();

  const parsed = UpdatePayoutRateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please specify valid package commission rates (0–100%).",
      },
    };
  }

  const { packageName, ratePercent, qaRatePercent } = parsed.data;
  const customRates = readPackageRates();
  const effectiveQaRate =
    qaRatePercent !== undefined
      ? qaRatePercent
      : (customRates[packageName]?.qaRatePercent ?? DEFAULT_QA_PAYOUT_RATES[packageName] ?? 10.0);

  customRates[packageName] = {
    packageName,
    ratePercent,
    qaRatePercent: effectiveQaRate,
    updatedAt: new Date().toISOString(),
    approvedBy: session.user.id,
  };
  writePackageRates(customRates);

  try {
    await withDbTimeout(
      (client as any).payoutRateConfig.upsert({
        where: { packageName },
        create: {
          packageName,
          ratePercent,
          approvedBy: session.user.id,
          effectiveFrom: new Date(),
        },
        update: {
          ratePercent,
          approvedBy: session.user.id,
          effectiveFrom: new Date(),
        },
      })
    );
  } catch (err: any) {
    console.warn("[updatePayoutRateConfigAction] DB upsert warning:", err.message);
  }

  revalidatePath("/dashboard/ceo/finance");
  revalidatePath("/dashboard/finance/payouts");
  revalidatePath("/dashboard/finance/ledger");

  return {
    success: true,
    data: { packageName, ratePercent, qaRatePercent: effectiveQaRate },
  };
}

/**
 * 9. Get Individual Specialist Milestone Payout History
 */
export async function getSpecialistPayoutHistoryAction(): Promise<FinanceActionResult<{ payouts: SpecialistPayoutDTO[]; verifiedEarnings: number; inProgressEscrow: number }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please log in to view payout earnings." } };
  }

  const client = getDb();

  try {
    const rawPayouts = await withDbTimeout<any[]>(
      (client as any).payout.findMany({
        where: { recipientId: session.user.id },
        include: {
          project: {
            include: { quotations: { where: { status: "CLIENT_APPROVED" }, take: 1 } },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    ) || [];

    let verifiedEarnings = 0;
    let inProgressEscrow = 0;

    const mapped: SpecialistPayoutDTO[] = rawPayouts.map((p: any) => {
      const amt = Number(p.payoutAmount);
      if (p.payoutStatus === "DISBURSED") {
        verifiedEarnings += amt;
      } else if (p.payoutStatus !== "VOIDED") {
        inProgressEscrow += amt;
      }

      return {
        id: p.id,
        projectId: p.projectId,
        projectIntakeId: p.project.intakeId,
        projectTitle: p.project.researchTitle,
        packageName: p.project.packageName || p.project.quotations[0]?.packageName || "JX_03_CORE",
        role: p.recipientRole,
        grossProjectAmount: Number(p.grossProjectAmount),
        payoutRateApplied: Number(p.payoutRateApplied),
        payoutAmount: amt,
        payoutStatus: p.payoutStatus,
        disbursedAt: p.disbursedAt ? p.disbursedAt.toISOString() : null,
        disbursementMethod: p.disbursementMethod,
        disbursementRef: p.disbursementRef,
        createdAt: p.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        payouts: mapped,
        verifiedEarnings,
        inProgressEscrow,
      },
    };
  } catch (err: any) {
    console.error("[getSpecialistPayoutHistoryAction] Error:", err);
    return {
      success: false,
      error: { code: "HISTORY_FETCH_FAILED", message: err.message || "Failed to load specialist payout history." },
    };
  }
}
