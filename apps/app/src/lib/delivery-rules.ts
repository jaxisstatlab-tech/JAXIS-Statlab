import { db } from "@/lib/db";
import { calculateProjectBalance } from "@/lib/payment-rules";
import { DeliverableCategory, RevisionClassification } from "@prisma/client";

/**
 * Deliverable Category Metadata and UI Labels
 */
export const DELIVERABLE_CATEGORY_METADATA: Record<
  DeliverableCategory,
  { label: string; description: string; badgeVariant: "sky" | "emerald" | "amber" | "default" }
> = {
  STATISTICAL_OUTPUT: {
    label: "Statistical Output & Datasets",
    description: "Final computed data tables, regression matrices, and software output files (.xlsx, .sav, .rdata).",
    badgeVariant: "sky",
  },
  PDF_REPORT: {
    label: "Official Research Report",
    description: "Comprehensive statistical report with method explanations, interpretations, and APA formatting.",
    badgeVariant: "emerald",
  },
  RAW_DATA_CLEANED: {
    label: "Curated Cleaned Dataset",
    description: "Anonymized, screened, and formatted dataset used for final statistical analysis.",
    badgeVariant: "sky",
  },
  APPENDIX: {
    label: "Supplementary Appendix",
    description: "Supplementary tables, code syntax scripts, diagnostic plots, and data dictionaries.",
    badgeVariant: "amber",
  },
  OTHER: {
    label: "Additional Document",
    description: "Miscellaneous research materials, guidelines, and verification certificates.",
    badgeVariant: "default",
  },
};

/**
 * Revision Classification Metadata and Rules
 */
export const REVISION_CLASSIFICATION_METADATA: Record<
  RevisionClassification,
  {
    label: string;
    description: string;
    actionLabel: string;
    isFree: boolean;
    requiresNewSow: boolean;
    requiresNewQuote: boolean;
  }
> = {
  INCLUDED: {
    label: "Included Revision",
    description:
      "Minor corrections, clarifications, formatting adjustments, or re-running tests strictly within original SOW scope.",
    actionLabel: "Route to Lead Statistical Analyst",
    isFree: true,
    requiresNewSow: false,
    requiresNewQuote: false,
  },
  METHODOLOGY_CHANGE: {
    label: "Methodology Change",
    description:
      "Changes to original statistical framework, swapping major model types, or revising core hypotheses requiring updated SOW terms.",
    actionLabel: "Issue Supplemental SOW",
    isFree: false,
    requiresNewSow: true,
    requiresNewQuote: false,
  },
  NEW_PAID_WORK: {
    label: "New Paid Scope",
    description:
      "Brand new research questions, additional data collections, or extensive post-hoc expansions beyond original agreement.",
    actionLabel: "Issue Supplemental Quotation",
    isFree: false,
    requiresNewSow: true,
    requiresNewQuote: true,
  },
};

export interface ReleaseEligibilityResult {
  eligible: boolean;
  financialGatePassed: boolean;
  qaGatePassed: boolean;
  packageName?: string | null;
  totalAmount: number;
  totalPaid: number;
  remainingBalance: number;
  isTier2Package: boolean;
  qaApproved: boolean;
  deliverablesCount: number;
  reasons: string[];
}

/**
 * Validates Dual Release Gates (RULE_REL_01 & RULE_REL_02):
 * - RULE_REL_01: Project must be 100% fully paid (remainingBalance <= 0)
 * - RULE_REL_02: Tier 2 packages (JX_03_CORE, JX_04_ADVANCED) require QA Approval (qaApproved = true)
 */
export async function assertReleaseEligibility(projectId: string): Promise<ReleaseEligibilityResult> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      quotations: {
        orderBy: { expiresAt: "desc" },
        take: 1,
      },
      payments: true,
      deliverables: true,
    },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found.`);
  }

  const latestQuote = project.quotations[0];
  const totalAmount = latestQuote ? Number(latestQuote.totalAmount) : 0;
  const downpaymentRequired = latestQuote ? Number(latestQuote.downpaymentRequired) : 0;

  const paymentSummary = calculateProjectBalance(
    project.payments.map((p) => ({
      amountSubmitted: Number(p.amountSubmitted),
      paymentStatus: p.paymentStatus,
    })),
    totalAmount,
    downpaymentRequired
  );

  // RULE_REL_01: Financial Gate
  const financialGatePassed =
    totalAmount === 0 || paymentSummary.isFullyPaid || paymentSummary.remainingBalance <= 0;

  // RULE_REL_02: QA Gate for Tier 2 packages
  const packageName = project.packageName || latestQuote?.packageName || null;
  const isTier2Package = packageName === "JX_03_CORE" || packageName === "JX_04_ADVANCED";
  const qaGatePassed = !isTier2Package || project.qaApproved === true;

  const deliverablesCount = project.deliverables.length;
  const reasons: string[] = [];

  if (!financialGatePassed) {
    reasons.push(
      `Financial Clearance Gate (RULE_REL_01): Project has an outstanding balance of ₱${paymentSummary.remainingBalance.toLocaleString(
        "en-PH",
        { minimumFractionDigits: 2 }
      )}. Final files cannot be released until fully settled.`
    );
  }

  if (!qaGatePassed) {
    reasons.push(
      `Quality Assurance Gate (RULE_REL_02): Tier 2 package (${packageName}) requires Senior QA Lead sign-off before client release.`
    );
  }

  if (deliverablesCount === 0) {
    reasons.push("Deliverable Packaging Gate: At least 1 deliverable file must be uploaded before triggering release.");
  }

  const eligible = financialGatePassed && qaGatePassed && deliverablesCount > 0;

  return {
    eligible,
    financialGatePassed,
    qaGatePassed,
    packageName,
    totalAmount,
    totalPaid: paymentSummary.verifiedPaid,
    remainingBalance: paymentSummary.remainingBalance,
    isTier2Package,
    qaApproved: project.qaApproved,
    deliverablesCount,
    reasons,
  };
}

/**
 * Normalizes a date to YYYY-MM-DD string for comparison against holiday records
 */
function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Computes the 3 Philippine business days revision window from the moment of release.
 * Skips weekends (Saturday, Sunday) and official Philippine statutory holidays.
 */
export async function computeRevisionWindowExpiry(deliveredAt: Date, businessDays = 3): Promise<Date> {
  const holidays = await db.philippineHoliday.findMany({
    where: { date: { gte: deliveredAt } },
    select: { date: true },
  });

  const holidayDates = new Set(holidays.map((h) => toDateKey(h.date)));

  let daysAdded = 0;
  const current = new Date(deliveredAt);

  while (daysAdded < businessDays) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateKey = toDateKey(current);

    if (!isWeekend && !holidayDates.has(dateKey)) {
      daysAdded++;
    }
  }

  // End of business day: 23:59:59 PST
  current.setHours(23, 59, 59, 999);
  return current;
}

/**
 * Computes 90-day archive purge timestamp from deliveredAt
 */
export function computePurgeDeadline(deliveredAt: Date, days = 90): Date {
  const purgeDate = new Date(deliveredAt);
  purgeDate.setDate(purgeDate.getDate() + days);
  return purgeDate;
}

/**
 * Checks if revision window is still active
 */
export function isRevisionWindowActive(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  const exp = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return Date.now() <= exp.getTime();
}

/**
 * Returns formatted countdown and status info for revision window
 */
export function getRevisionWindowCountdown(expiresAt: Date | string | null | undefined): {
  isActive: boolean;
  isExpired: boolean;
  remainingDays: number;
  remainingHours: number;
  remainingFormatted: string;
} {
  if (!expiresAt) {
    return {
      isActive: false,
      isExpired: true,
      remainingDays: 0,
      remainingHours: 0,
      remainingFormatted: "No active revision window",
    };
  }

  const exp = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const diffMs = exp.getTime() - Date.now();

  if (diffMs <= 0) {
    return {
      isActive: false,
      isExpired: true,
      remainingDays: 0,
      remainingHours: 0,
      remainingFormatted: "Revision window closed",
    };
  }

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const remainingDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  let remainingFormatted = "";
  if (remainingDays > 0) {
    remainingFormatted = `${remainingDays}d ${remainingHours}h remaining`;
  } else {
    remainingFormatted = `${totalHours}h remaining`;
  }

  return {
    isActive: true,
    isExpired: false,
    remainingDays,
    remainingHours,
    remainingFormatted,
  };
}
