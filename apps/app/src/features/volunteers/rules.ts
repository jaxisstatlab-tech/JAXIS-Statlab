import { analysisGoalsFor } from "@/features/projects/analysis-goals";

/**
 * Which of an analyst's specializations fit a study's analysis goals: a specialization matches when it (or one of
 * its longer words) appears in a goal's title or usual tests, ignoring case. "Regression" fits "Predict outcomes"
 * (linear regression), "ANOVA" fits "Compare groups".
 */
export function specializationMatches(specializations: string[], goalCodes: readonly string[] | null | undefined): string[] {
  const goals = analysisGoalsFor(goalCodes);
  if (goals.length === 0) return [];
  const haystacks = goals.map((g) => `${g.title} ${g.typicalTests}`.toLowerCase());
  return specializations.filter((spec) => {
    const s = spec.trim().toLowerCase();
    if (s.length < 3) return false;
    return haystacks.some((h) => h.includes(s) || s.split(/[\s/,&-]+/).some((w) => w.length >= 4 && h.includes(w)));
  });
}

/** Studies that count as "working on" for an analyst or reviewer (assigned and not finished). */
export const WORKING_STATUSES = [
  "EXPERT_ASSIGNED",
  "IN_PROGRESS",
  "SLA_PAUSED",
  "SCOPE_CREEP_HALTED",
  "FOR_QA",
  "QA_REVISION",
  "REVISION_REQUESTED",
  "REASSIGNMENT_NEEDED",
] as const;

/**
 * The owner's criteria for several volunteers, in order: (a) first to offer, (b) no current study, (c) a
 * specialization that fits the study's goals. The first active volunteer is Suggested; (b) and (c) only decide
 * between offers made at the same moment. The admin can always pick someone else.
 */
export function rankVolunteers<T extends { order: number; openStudies: number; matches: string[]; status: string; volunteeredAt: string }>(rows: T[]) {
  const sorted = [...rows].sort(
    (a, b) =>
      a.volunteeredAt.localeCompare(b.volunteeredAt) ||
      Number(a.openStudies > 0) - Number(b.openStudies > 0) ||
      b.matches.length - a.matches.length
  );
  const best = sorted.find((r) => r.status === "ACTIVE");
  return rows.map((r) => ({ ...r, suggested: !!best && r === best }));
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}
