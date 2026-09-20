import { PackageName, AddOnName, ProjectStatus, RoleName } from "@prisma/client";

/**
 * JAXIS StatLab — Commercial Pricing & Quotation Engine Rules
 * Codifies pricing guardrails, package definitions, downpayment requirements,
 * and role permissions according to 05-quotation.md.
 */

export interface PackageDefinition {
  code: PackageName | string;
  id: string;
  name: string;
  badge: string;
  minPrice: number;
  maxPrice: number | null;
  defaultPrice: number;
  isUpfront: boolean;
  tagline: string;
  deliverables: string[];
  recommendedFor: string;
  isActive?: boolean;
}

export interface AddOnDefinition {
  code: AddOnName | string;
  name: string;
  defaultPrice: number;
  tagline: string;
  badge: string;
  isActive?: boolean;
}

export interface CommercialCatalogData {
  packages: Record<string, PackageDefinition>;
  addOns: Record<string, AddOnDefinition>;
}

/**
 * Commercial Package Master Catalog
 */
export const PACKAGES_CATALOG: Record<PackageName, PackageDefinition> = {
  JX_01_DATACHECK: {
    code: "JX_01_DATACHECK",
    id: "JX-01",
    name: "JX-01 DataCheck & Clean",
    badge: "DATA AUDIT",
    minPrice: 1000,
    maxPrice: 1000,
    defaultPrice: 1000,
    isUpfront: true,
    tagline: "Dataset integrity audit, missing value screening, reverse coding, and variable structure cleaning.",
    deliverables: [
      "Cleaned dataset (.xlsx / .sav) with data dictionary",
      "Data screening & normality verification report",
      "Variable codebook & audit log",
    ],
    recommendedFor: "Undergraduate / Master's students with raw, unformatted survey or experimental data.",
  },
  JX_02_START: {
    code: "JX_02_START",
    id: "JX-02",
    name: "JX-02 Start (Descriptive)",
    badge: "FOUNDATIONAL",
    minPrice: 1500,
    maxPrice: 1800,
    defaultPrice: 1500,
    isUpfront: true,
    tagline: "Univariate descriptive analytics, frequency distributions, mean/SD metrics, and profile tables.",
    deliverables: [
      "APA 7th formatted demographic tables",
      "Mean, Standard Deviation, Skewness/Kurtosis indicators",
      "Narrative statistical write-up for Chapter 4",
    ],
    recommendedFor: "Descriptive research designs, institutional baseline assessments, and pilot feasibility studies.",
  },
  JX_03_CORE: {
    code: "JX_03_CORE",
    id: "JX-03",
    name: "JX-03 Core (Inferential)",
    badge: "STANDARD RESEARCH",
    minPrice: 1800,
    maxPrice: 3000,
    defaultPrice: 2500,
    isUpfront: false,
    tagline: "Parametric & non-parametric hypothesis testing (t-Tests, ANOVA, Pearson r, Multiple Linear Regression).",
    deliverables: [
      "Complete Chapter 4 findings with APA 7th publication tables",
      "Hypothesis testing decision matrices (p-values, effect sizes, Cohen's d)",
      "Reproducible statistical script (.R / SPSS syntax)",
    ],
    recommendedFor: "Undergraduate Theses, Master's Theses, and Correlational/Comparative Research.",
  },
  JX_04_ADVANCED: {
    code: "JX_04_ADVANCED",
    id: "JX-04",
    name: "JX-04 Advanced (Multivariate)",
    badge: "ADVANCED & DOCTORAL",
    minPrice: 3000,
    maxPrice: null,
    defaultPrice: 3500,
    isUpfront: false,
    tagline: "Structural Equation Modeling (SEM/PLS), MANOVA, Factor Analysis (EFA/CFA), Machine Learning & Time Series.",
    deliverables: [
      "Path model diagrams and structural validity matrices",
      "Comprehensive APA 7th Chapter 4 & Methodology defense deck",
      "Peer-reviewed grade statistical code and raw computational logs",
    ],
    recommendedFor: "Doctoral Dissertations, Scopus/WOS Journal Submissions, and Complex Multi-Tier Research.",
  },
};

/**
 * Add-on Catalog
 */
export const ADDONS_CATALOG: Record<AddOnName, AddOnDefinition> = {
  DEFENSELAB: {
    code: "DEFENSELAB",
    name: "DefenseLab 1-on-1 Defense Prep",
    defaultPrice: 250,
    tagline: "1-hour simulated oral defense coaching with a senior statistical consultant.",
    badge: "ORAL COACHING",
  },
  RUSH: {
    code: "RUSH",
    name: "Rush 3-Day Turnaround",
    defaultPrice: 300,
    tagline: "Priority queue delivery within 72 hours of escrow deposit.",
    badge: "72-HR PRIORITY",
  },
  EXPRESS: {
    code: "EXPRESS",
    name: "Express 48-Hour Turnaround",
    defaultPrice: 600,
    tagline: "Dedicated fast-track delivery within 48 hours of escrow deposit.",
    badge: "48-HR PRIORITY",
  },
  EMERGENCY: {
    code: "EMERGENCY",
    name: "Emergency 24-Hour Turnaround",
    defaultPrice: 1000,
    tagline: "Urgent priority delivery within 24 hours with dedicated Senior QA review.",
    badge: "24-HR EMERGENCY",
  },
};

/**
 * 100% Upfront Packages (RULE_QUO_02)
 */
export const UPFRONT_PACKAGES: readonly PackageName[] = [
  "JX_01_DATACHECK",
  "JX_02_START",
];

/**
 * Default quote expiration window in days
 */
export const DEFAULT_QUOTE_EXPIRY_DAYS = 3;

/**
 * Quotation Calculation Input
 */
export interface CalculateQuotationInput {
  packageName: PackageName;
  basePrice: number;
  addOns?: Array<{
    name: AddOnName;
    amount?: number;
    description?: string;
  }>;
  customDownpayment?: number;
}

/**
 * Calculated Quotation Breakdown
 */
export interface CalculatedQuotationBreakdown {
  packageName: PackageName;
  packageDef: PackageDefinition;
  basePrice: number;
  addOnsBreakdown: Array<{
    name: AddOnName;
    definition: AddOnDefinition;
    amount: number;
    description?: string;
  }>;
  addOnsTotal: number;
  totalAmount: number;
  isUpfrontEnforced: boolean;
  downpaymentRequired: number;
  releaseBalance: number;
  downpaymentPercentage: number;
}

/**
 * Core Pricing Calculation Engine (RULE_QUO_02)
 */
export function calculateQuotationTotals(
  input: CalculateQuotationInput
): CalculatedQuotationBreakdown {
  const packageDef = PACKAGES_CATALOG[input.packageName];
  if (!packageDef) {
    throw new Error(`Invalid package selected: ${input.packageName}`);
  }

  const basePrice = Math.max(0, Number(input.basePrice));
  
  const addOnsBreakdown = (input.addOns || []).map((addon) => {
    const def = ADDONS_CATALOG[addon.name];
    const amount = addon.amount !== undefined ? Math.max(0, Number(addon.amount)) : (def ? def.defaultPrice : 0);
    return {
      name: addon.name,
      definition: def,
      amount,
      description: addon.description,
    };
  });

  const addOnsTotal = addOnsBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const totalAmount = basePrice + addOnsTotal;

  const isUpfrontEnforced = UPFRONT_PACKAGES.includes(input.packageName);

  let downpaymentRequired = 0;
  if (isUpfrontEnforced) {
    // RULE_QUO_02: JX-01 and JX-02 require 100% upfront
    downpaymentRequired = totalAmount;
  } else if (input.customDownpayment !== undefined && input.customDownpayment > 0) {
    // Custom specified downpayment bounded by [50%, 100%]
    const minDownpayment = Math.round(totalAmount * 0.5);
    downpaymentRequired = Math.min(totalAmount, Math.max(minDownpayment, input.customDownpayment));
  } else {
    // Standard milestone downpayment: 50% of total amount
    downpaymentRequired = Math.round(totalAmount * 0.5);
  }

  const releaseBalance = Math.max(0, totalAmount - downpaymentRequired);
  const downpaymentPercentage = totalAmount > 0 ? Math.round((downpaymentRequired / totalAmount) * 100) : 100;

  return {
    packageName: input.packageName,
    packageDef,
    basePrice,
    addOnsBreakdown,
    addOnsTotal,
    totalAmount,
    isUpfrontEnforced,
    downpaymentRequired,
    releaseBalance,
    downpaymentPercentage,
  };
}

/**
 * RULE_QUO_01: Enforce that only ADMIN and CEO roles can create, edit, or issue quotes.
 */
export function assertCanManageQuotation(role: RoleName | string): void {
  if (role !== "ADMIN" && role !== "CEO") {
    throw new Error(
      "Unauthorized: Only System Administrators and Executive Directors (CEO) are permitted to create, modify, or issue commercial quotations."
    );
  }
}

/**
 * Validate package base price against configured price range guardrails.
 */
export function validatePackageBasePrice(
  packageName: PackageName,
  price: number
): { valid: boolean; error?: string } {
  const pkg = PACKAGES_CATALOG[packageName];
  if (!pkg) {
    return { valid: false, error: `Unrecognized package: ${packageName}` };
  }

  if (price < pkg.minPrice) {
    return {
      valid: false,
      error: `${pkg.name} base price cannot be less than the minimum baseline of ₱${pkg.minPrice.toLocaleString()}.`,
    };
  }

  if (pkg.maxPrice !== null && price > pkg.maxPrice) {
    return {
      valid: false,
      error: `${pkg.name} base price cannot exceed the maximum bracket of ₱${pkg.maxPrice.toLocaleString()}.`,
    };
  }

  return { valid: true };
}

/**
 * RULE_QUO_13: Restrict add-ons after project execution has already started.
 * Add-ons can only be quoted prior to ACTIVE computation.
 */
export function assertAddOnsAllowed(projectStatus: ProjectStatus | string): void {
  const executionStatuses: string[] = [
    "ACTIVE",
    "EXPERT_ASSIGNED",
    "IN_PROGRESS",
    "SCOPE_CREEP_HALTED",
    "FOR_QA",
    "QA_REVISION",
    "DELIVERED",
    "CLOSED",
  ];

  if (executionStatuses.includes(projectStatus)) {
    throw new Error(
      "Commercial Add-Ons cannot be attached once computational execution has commenced (Status: " +
        projectStatus +
        ")."
    );
  }
}

/**
 * Compute expiration timestamp for issued quotes (Defaults to 3 days).
 */
export function computeQuotationExpiry(days: number = DEFAULT_QUOTE_EXPIRY_DAYS): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

/**
 * Check if a quotation has expired based on its expiration date.
 */
export function isQuotationExpired(expiresAt: Date | string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}
