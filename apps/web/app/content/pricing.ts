export type Plan = {
  id: string;
  name: string;
  short: string;
  /** Typical price range from the app's Service Catalog (min / max). `max: null` = no upper limit. */
  min: number;
  max: number | null;
  standard: string;
  bestFor: string;
  features: string[];
  featured?: boolean;
};

// Packages are shown as typical price ranges, not fixed prices: clients don't pick a package, our
// team recommends one after reading their study and sends a fixed written price. The ranges match
// the Min / Max prices in the app's Service Catalog (admin → Pricing & Quotations → Catalog); when
// they change there, change them here too.
export const PLANS: Plan[] = [
  {
    id: "datacheck",
    name: "DataCheck",
    short: "DataCheck",
    min: 500,
    max: 1500,
    standard: "3–7 working days",
    bestFor: "Checking your data before you run tests",
    features: [
      "Survey data formatting and outlier cleanup",
      "Normality and distribution checks",
      "Reliability test (Cronbach's alpha)",
      "Data health sheet for your adviser",
    ],
  },
  {
    id: "start",
    name: "Start Package",
    short: "Start",
    min: 1500,
    max: 1800,
    standard: "3–7 working days",
    bestFor: "Describing who answered your survey",
    features: [
      "Demographic frequencies and percentages",
      "Cross-tabulations and chi-square",
      "Ready-to-paste APA 7th edition tables",
      "Plain-English findings for Chapter 4",
    ],
  },
  {
    id: "core",
    name: "Core Thesis Package",
    short: "Core Thesis",
    min: 1800,
    max: 3000,
    standard: "3–7 working days",
    bestFor: "Most college and master's theses",
    featured: true,
    features: [
      "Hypothesis tests (t-tests, ANOVA, regression)",
      "Assumption checks and effect sizes",
      "Full plain-English Chapter 4 write-up",
      "Analysis scripts (.R, .py, .sps) included",
    ],
  },
  {
    id: "advanced",
    name: "Advanced Package",
    short: "Advanced",
    min: 3500,
    max: null,
    standard: "2–3 weeks",
    bestFor: "Dissertations and complex models",
    features: [
      "SEM, path analysis, HLM, and survival models",
      "Custom method plan for your defense",
      "Checked by a senior methodologist",
      "Full panel defense question guide",
    ],
  },
];

export const SPEEDS = [
  { id: "standard", label: "Standard", fee: 0, time: null },
  { id: "rush", label: "Rush", fee: 300, time: "3 days" },
  { id: "express", label: "Express", fee: 600, time: "48 hours" },
  { id: "emergency", label: "Emergency", fee: 1000, time: "24 hours" },
] as const;

// Optional add-ons, same prices as the app's Service Catalog → Priority Add-Ons. Clients pick them
// when they accept their written price (at most one delivery speed per study).
export type AddOn = {
  id: "defenselab" | "rush" | "express" | "emergency";
  name: string;
  fee: number;
  unit?: string;
  group: "Practice" | "Faster delivery";
  detail: string;
};

export const ADDONS: AddOn[] = [
  {
    id: "defenselab",
    name: "DefenseLab mock panel",
    fee: 250,
    unit: "per hour",
    group: "Practice",
    detail:
      "A 1-on-1 practice defense with a senior statistical analyst who asks the questions panels ask. You get the recording.",
  },
  {
    id: "rush",
    name: "Rush",
    fee: 300,
    group: "Faster delivery",
    detail: "Ready in 3 days after your deposit is confirmed.",
  },
  {
    id: "express",
    name: "Express",
    fee: 600,
    group: "Faster delivery",
    detail: "Ready in 48 hours after your deposit is confirmed.",
  },
  {
    id: "emergency",
    name: "Emergency",
    fee: 1000,
    group: "Faster delivery",
    detail: "Ready in 24 hours, with a senior reviewer on your study.",
  },
];

export const INCLUDED = [
  "Checked by 2 statistical analysts",
  "Fixed written price first",
  "Free fixes within scope",
  "Files your adviser can open",
];

export const peso = (n: number) => n.toLocaleString("en-PH");

/** "1,800 – 3,000" or "3,500 and up" (the ₱ sign is rendered separately so it can be styled). */
export const rangeParts = (plan: Pick<Plan, "min" | "max">) =>
  plan.max === null
    ? { from: peso(plan.min), to: null }
    : { from: peso(plan.min), to: peso(plan.max) };

/** Lowest price across all plans, for "from ₱…" copy. */
export const LOWEST_PRICE = Math.min(...PLANS.map((p) => p.min));
