// What a client wants their analysis to do, chosen on the intake form ("What is the main goal of your research
// objectives?"). Staff read it to choose the statistical tests and price the study. Stored on the study as
// `analysisGoals` (codes below).

export const ANALYSIS_GOAL_CODES = ["DESCRIBE", "COMPARE", "RELATIONSHIP", "PREDICT", "VALIDATE", "UNSURE"] as const;
export type AnalysisGoalCode = (typeof ANALYSIS_GOAL_CODES)[number];

export interface AnalysisGoal {
  code: AnalysisGoalCode;
  /** Shown to the client. */
  title: string;
  /** Short tag for staff lists. */
  shortTitle: string;
  description: string;
  example: string;
  /** Shown to staff only: the tests this goal usually calls for. */
  typicalTests: string;
}

export const ANALYSIS_GOALS: AnalysisGoal[] = [
  {
    code: "DESCRIBE",
    shortTitle: "Describe",
    title: "Describe and summarize data",
    description: "Show profile distributions, frequencies, averages, or percentage breakdowns.",
    example: "Demographic profiles, mean scores",
    typicalTests: "Frequencies, percentages, mean and standard deviation, weighted mean",
  },
  {
    code: "COMPARE",
    shortTitle: "Compare groups",
    title: "Compare groups",
    description: "See if there is a significant difference between two or more groups.",
    example: "Control vs. experimental, male vs. female, pre-test vs. post-test",
    typicalTests: "t-test (independent or paired), ANOVA, Mann-Whitney U, Kruskal-Wallis, Wilcoxon",
  },
  {
    code: "RELATIONSHIP",
    shortTitle: "Relationships",
    title: "Test relationships",
    description: "Check if two or more variables move together or are correlated.",
    example: "Study hours and exam scores",
    typicalTests: "Pearson r, Spearman rho, chi-square test of independence",
  },
  {
    code: "PREDICT",
    shortTitle: "Predict",
    title: "Predict outcomes",
    description: "See how much one or more factors influence or change an outcome.",
    example: "Leadership style and salary on employee retention",
    typicalTests: "Simple or multiple linear regression, logistic regression, path analysis or SEM",
  },
  {
    code: "VALIDATE",
    shortTitle: "Validate instrument",
    title: "Validate a survey or instrument",
    description: "Test if your questionnaire is reliable and valid.",
    example: "Scale reliability, factor analysis",
    typicalTests: "Cronbach's alpha, item analysis, exploratory or confirmatory factor analysis",
  },
  {
    code: "UNSURE",
    shortTitle: "Not sure yet",
    title: "Not sure yet",
    description: "Let JAXIS recommend the right tests based on your Chapters 1 to 3.",
    example: "We'll read your framework and suggest them",
    typicalTests: "Review Chapters 1–3 and recommend tests before quoting",
  },
];

/** The goals for stored codes, in the standard order; unknown codes are skipped. */
export function analysisGoalsFor(codes: readonly string[] | null | undefined): AnalysisGoal[] {
  if (!codes?.length) return [];
  const chosen = new Set(codes);
  return ANALYSIS_GOALS.filter((g) => chosen.has(g.code));
}
