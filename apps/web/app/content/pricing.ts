export type Plan = {
  id: string;
  name: string;
  short: string;
  base: number;
  plus?: boolean;
  standard: string;
  bestFor: string;
  features: string[];
  featured?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "datacheck",
    name: "DataCheck",
    short: "DataCheck",
    base: 1000,
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
    base: 1500,
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
    base: 2400,
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
    base: 3000,
    plus: true,
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

export const INCLUDED = [
  "Checked by 2 statisticians",
  "Fixed written price first",
  "Free fixes within scope",
  "Files your adviser can open",
];

export const peso = (n: number) => n.toLocaleString("en-PH");
