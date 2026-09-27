import type { PackageName } from "@prisma/client";

// What clients see for each package: the same names, standard timelines, "best for" lines and
// feature lists as the public website (apps/web/app/content/pricing.ts). The price catalog in
// src/lib/pricing-rules.ts keeps its staff names ("JX-03 Core (Inferential)") for internal screens;
// client pages use these instead. Keep this file and the website's PLANS in sync.

export interface ClientPackage {
  name: string;
  standard: string;
  bestFor: string;
  features: string[];
}

export const CLIENT_PACKAGES: Record<PackageName, ClientPackage> = {
  JX_01_DATACHECK: {
    name: "DataCheck",
    standard: "3–7 working days",
    bestFor: "Checking your data before you run tests",
    features: [
      "Survey data formatting and outlier cleanup",
      "Normality and distribution checks",
      "Reliability test (Cronbach's alpha)",
      "Data health sheet for your adviser",
    ],
  },
  JX_02_START: {
    name: "Start Package",
    standard: "3–7 working days",
    bestFor: "Describing who answered your survey",
    features: [
      "Demographic frequencies and percentages",
      "Cross-tabulations and chi-square",
      "Ready-to-paste APA 7th edition tables",
      "Plain-English findings for Chapter 4",
    ],
  },
  JX_03_CORE: {
    name: "Core Thesis Package",
    standard: "3–7 working days",
    bestFor: "Most college and master's theses",
    features: [
      "Hypothesis tests (t-tests, ANOVA, regression)",
      "Assumption checks and effect sizes",
      "Full plain-English Chapter 4 write-up",
      "Analysis scripts (.R, .py, .sps) included",
    ],
  },
  JX_04_ADVANCED: {
    name: "Advanced Package",
    standard: "2–3 weeks",
    bestFor: "Dissertations and complex models",
    features: [
      "SEM, path analysis, HLM, and survival models",
      "Custom method plan for your defense",
      "Checked by a senior methodologist",
      "Full panel defense question guide",
    ],
  },
};

export function clientPackage(pkg?: string | null): ClientPackage | null {
  return pkg ? (CLIENT_PACKAGES[pkg as PackageName] ?? null) : null;
}

/** Client-facing package name, e.g. "Core Thesis Package". Falls back to a readable version of the code. */
export function clientPackageName(pkg?: string | null): string | null {
  if (!pkg) return null;
  const known = CLIENT_PACKAGES[pkg as PackageName]?.name;
  if (known) return known;
  const words = pkg.replace(/^JX_\d+_/, "").replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Standard delivery time for a package, e.g. "3–7 working days". */
export function clientStandardTime(pkg?: string | null): string {
  return CLIENT_PACKAGES[pkg as PackageName]?.standard ?? "3–7 working days";
}
