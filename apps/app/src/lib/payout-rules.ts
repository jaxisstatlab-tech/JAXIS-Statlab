import fs from "fs";
import path from "path";
import { getDb, withDbTimeout } from "@/lib/db";

export const DEFAULT_PAYOUT_RATES: Record<string, number> = {
  JX_01_DATACHECK: 45.0,
  JX_02_START: 47.0,
  JX_03_CORE: 62.0,
  JX_04_ADVANCED: 72.0,
  DEFENSELAB: 80.0,
};

export const DEFAULT_QA_PAYOUT_RATES: Record<string, number> = {
  JX_01_DATACHECK: 5.0,
  JX_02_START: 5.0,
  JX_03_CORE: 10.0,
  JX_04_ADVANCED: 12.0,
  DEFENSELAB: 15.0,
};

export const QA_LEAD_PAYOUT_PERCENT_OF_STAT = 10.0; // QA Lead receives 10% of the Statistician's payout amount fallback

const DEV_DATA_DIR = path.join(process.cwd(), "dev_data");
const PACKAGE_RATES_FILE = path.join(DEV_DATA_DIR, "package_rates.json");

export interface PackageRateRecord {
  packageName: string;
  ratePercent: number;
  qaRatePercent: number;
  updatedAt?: string;
  approvedBy?: string;
}

export function readPackageRates(): Record<string, PackageRateRecord> {
  try {
    if (fs.existsSync(PACKAGE_RATES_FILE)) {
      const content = fs.readFileSync(PACKAGE_RATES_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn("[readPackageRates] Failed to read package rates file", err);
  }
  return {};
}

export function writePackageRates(rates: Record<string, PackageRateRecord>): void {
  try {
    if (!fs.existsSync(DEV_DATA_DIR)) {
      fs.mkdirSync(DEV_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PACKAGE_RATES_FILE, JSON.stringify(rates, null, 2), "utf-8");
  } catch (err) {
    console.error("[writePackageRates] Failed to write package rates file", err);
  }
}

export interface PayoutEligibilityResult {
  eligible: boolean;
  reason?: string;
  violations: string[];
  checks: {
    isDeliveredOrClosed: boolean;
    isFullyPaid: boolean;
    hasNoDispute: boolean;
    hasNoRefund: boolean;
  };
}

/**
 * In-memory validator for the 4 strict requirements of RULE_PAY_01.
 */
export function computePayoutEligibility(project: {
  masterStatus: string;
  hasActiveDispute: boolean;
  hasPendingRefund: boolean;
  payments?: { paymentStatus?: string }[];
}): PayoutEligibilityResult {
  const isDeliveredOrClosed = ["DELIVERED", "CLOSED"].includes(project.masterStatus);
  const latestPayment = project.payments?.[0];
  const isFullyPaid =
    latestPayment?.paymentStatus === "FULLY_PAID" ||
    latestPayment?.paymentStatus === "VERIFIED";
  const hasNoDispute = !project.hasActiveDispute;
  const hasNoRefund = !project.hasPendingRefund;

  const violations: string[] = [];
  if (!isDeliveredOrClosed) {
    violations.push("Project must be in DELIVERED or CLOSED status before releasing escrow payouts.");
  }
  if (!isFullyPaid) {
    violations.push("Project balance must be 100% verified and fully paid by the client.");
  }
  if (!hasNoDispute) {
    violations.push("Payout is locked due to an active commercial or academic dispute.");
  }
  if (!hasNoRefund) {
    violations.push("Payout is locked due to a pending refund clearance.");
  }

  return {
    eligible: violations.length === 0,
    reason: violations[0],
    violations,
    checks: {
      isDeliveredOrClosed,
      isFullyPaid,
      hasNoDispute,
      hasNoRefund,
    },
  };
}

/**
 * Validates the 4 strict requirements of RULE_PAY_01 before a milestone payout can be disbursed.
 */
export async function assertPayoutEligible(projectId: string): Promise<PayoutEligibilityResult> {
  const client = getDb();
  const project = await withDbTimeout(
    client.project.findUnique({
      where: { id: projectId },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
        },
        quotations: {
          where: { status: "CLIENT_APPROVED" },
          include: { lineItems: true },
          take: 1,
        },
      },
    })
  );

  if (!project) {
    return {
      eligible: false,
      reason: "Project not found.",
      violations: ["PROJECT_NOT_FOUND"],
      checks: {
        isDeliveredOrClosed: false,
        isFullyPaid: false,
        hasNoDispute: false,
        hasNoRefund: false,
      },
    };
  }

  return computePayoutEligibility(project);
}

/**
 * Calculates or synchronizes the Statistician and QA Lead payout amounts and per-project financial ledger.
 */
export async function calculateAndSyncProjectPayouts(projectId: string): Promise<{
  statisticianPayoutAmount: number;
  qaLeadPayoutAmount: number;
  grossRevenue: number;
  platformFee: number;
  netMargin: number;
}> {
  const client = getDb();

  const project = await withDbTimeout(
    client.project.findUnique({
      where: { id: projectId },
      include: {
        quotations: {
          where: { status: "CLIENT_APPROVED" },
          include: { lineItems: true },
          take: 1,
        },
        assignment: {
          include: {
            statistician: true,
            qaLead: true,
          },
        },
        payments: true,
      },
    })
  );

  if (!project) {
    throw new Error("Project not found");
  }

  const quote = project.quotations[0];
  const grossRevenue = quote ? Number(quote.totalAmount) : 0;
  const packageName = project.packageName || quote?.packageName || "JX_03_CORE";

  // 1. Fetch PayoutRateConfig for package (Statistician & QA shares)
  const customRates = readPackageRates();
  const customPkg = customRates[packageName];

  let ratePercent = customPkg?.ratePercent ?? (DEFAULT_PAYOUT_RATES[packageName] || 60.0);
  try {
    const configDelegate = (client as any).payoutRateConfig;
    if (configDelegate && customPkg?.ratePercent === undefined) {
      const config = await configDelegate.findUnique({
        where: { packageName },
      });
      if (config) {
        ratePercent = Number(config.ratePercent);
      }
    }
  } catch {
    // fallback to default
  }

  const qaRatePercent = customPkg?.qaRatePercent ?? (DEFAULT_QA_PAYOUT_RATES[packageName] ?? 10.0);

  // 2. Compute Statistician Share
  const statisticianPayoutAmount = Math.round((grossRevenue * (ratePercent / 100)) * 100) / 100;

  // 3. Compute QA Lead Share (from package QA commission rate)
  const hasQa = Boolean(project.assignment?.qaLeadId);
  const qaLeadPayoutAmount = hasQa ? Math.round((grossRevenue * (qaRatePercent / 100)) * 100) / 100 : 0;

  // 4. Net Platform Margin
  const platformFee = Math.round((grossRevenue - statisticianPayoutAmount - qaLeadPayoutAmount) * 100) / 100;
  const netMargin = platformFee;

  const eligibility = await assertPayoutEligible(projectId);
  const initialPayoutStatus = eligibility.eligible ? "APPROVED" : "NOT_ELIGIBLE";

  // 5. Upsert Financial Ledger
  try {
    const ledgerDelegate = (client as any).financialLedger;
    if (ledgerDelegate) {
      await ledgerDelegate.upsert({
        where: { projectId },
        create: {
          projectId,
          grossRevenue,
          platformFee,
          statisticianShare: statisticianPayoutAmount,
          qaLeadShare: qaLeadPayoutAmount,
          netMargin,
        },
        update: {
          grossRevenue,
          platformFee,
          statisticianShare: statisticianPayoutAmount,
          qaLeadShare: qaLeadPayoutAmount,
          netMargin,
        },
      });
    }
  } catch (err) {
    console.error("[PayoutRules] Failed to upsert financial ledger:", err);
  }

  // 6. Upsert Statistician Payout Record
  if (project.assignment?.statisticianId) {
    try {
      const payoutDelegate = (client as any).payout;
      if (payoutDelegate) {
        const existingStatPayout = await payoutDelegate.findFirst({
          where: {
            projectId,
            recipientId: project.assignment.statisticianId,
            recipientRole: "STATISTICIAN",
          },
        });

        if (existingStatPayout) {
          if (existingStatPayout.payoutStatus !== "DISBURSED" && existingStatPayout.payoutStatus !== "VOIDED") {
            await payoutDelegate.update({
              where: { id: existingStatPayout.id },
              data: {
                grossProjectAmount: grossRevenue,
                payoutRateApplied: ratePercent,
                payoutAmount: statisticianPayoutAmount,
                payoutStatus: eligibility.eligible ? "APPROVED" : existingStatPayout.payoutStatus,
              },
            });
          }
        } else {
          await payoutDelegate.create({
            data: {
              projectId,
              recipientId: project.assignment.statisticianId,
              recipientRole: "STATISTICIAN",
              grossProjectAmount: grossRevenue,
              payoutRateApplied: ratePercent,
              payoutAmount: statisticianPayoutAmount,
              payoutStatus: initialPayoutStatus,
            },
          });
        }
      }
    } catch (err) {
      console.error("[PayoutRules] Failed to upsert statistician payout:", err);
    }
  }

  // 7. Upsert QA Lead Payout Record
  if (project.assignment?.qaLeadId && qaLeadPayoutAmount > 0) {
    try {
      const payoutDelegate = (client as any).payout;
      if (payoutDelegate) {
        const existingQaPayout = await payoutDelegate.findFirst({
          where: {
            projectId,
            recipientId: project.assignment.qaLeadId,
            recipientRole: "QA_LEAD",
          },
        });

        if (existingQaPayout) {
          if (existingQaPayout.payoutStatus !== "DISBURSED" && existingQaPayout.payoutStatus !== "VOIDED") {
            await payoutDelegate.update({
              where: { id: existingQaPayout.id },
              data: {
                grossProjectAmount: grossRevenue,
                payoutRateApplied: QA_LEAD_PAYOUT_PERCENT_OF_STAT,
                payoutAmount: qaLeadPayoutAmount,
                payoutStatus: eligibility.eligible ? "APPROVED" : existingQaPayout.payoutStatus,
              },
            });
          }
        } else {
          await payoutDelegate.create({
            data: {
              projectId,
              recipientId: project.assignment.qaLeadId,
              recipientRole: "QA_LEAD",
              grossProjectAmount: grossRevenue,
              payoutRateApplied: QA_LEAD_PAYOUT_PERCENT_OF_STAT,
              payoutAmount: qaLeadPayoutAmount,
              payoutStatus: initialPayoutStatus,
            },
          });
        }
      }
    } catch (err) {
      console.error("[PayoutRules] Failed to upsert QA lead payout:", err);
    }
  }

  return {
    statisticianPayoutAmount,
    qaLeadPayoutAmount,
    grossRevenue,
    platformFee,
    netMargin,
  };
}
