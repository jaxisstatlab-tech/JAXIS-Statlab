// Copy for /about. Everything here restates how JAXIS already works (site copy and apps/app/docs);
// no made-up milestones. TEAM holds placeholder profiles until real names, bios, and photos are ready.

export const NUMBERS: {
  to: number;
  prefix?: string;
  suffix?: string;
  label: string;
}[] = [
  { to: 2, label: "Statisticians check every study" },
  { to: 6, label: "Quality checks before delivery" },
  { to: 24, prefix: "< ", suffix: "h", label: "To your fixed written price" },
  { to: 7, suffix: " days", label: "To raise any issue after delivery" },
];

export type Value = {
  icon: "honest" | "twice" | "plain" | "private" | "fair" | "time";
  title: string;
  body: string;
};

export const VALUES: Value[] = [
  {
    icon: "honest",
    title: "Honest numbers",
    body: "We never make up or change data to get a better p-value. A result that isn't significant is still a real result, and we help you explain it.",
  },
  {
    icon: "twice",
    title: "Two sets of eyes",
    body: "One statistician runs your tests. A second reruns everything from scratch before anything reaches you.",
  },
  {
    icon: "plain",
    title: "Plain English first",
    body: "Every table comes with a written explanation you can read aloud to your panel, not just numbers to paste.",
  },
  {
    icon: "private",
    title: "Your data stays private",
    body: "Respondent names, emails, and student IDs are removed before work starts. Every statistician signs a non-disclosure agreement.",
  },
  {
    icon: "fair",
    title: "Fair with your money",
    body: "You get a fixed written price before paying. Your deposit is held until your study passes our quality review.",
  },
  {
    icon: "time",
    title: "Room to do it right",
    body: "Each statistician works on only a few studies at a time, so yours gets real attention instead of a rushed template.",
  },
];

export const SPECIALTIES = [
  "Regression",
  "ANOVA",
  "Structural equation models",
  "Factor analysis",
  "Instrument validation",
  "Time series",
];

// `photo` is a path under /public, e.g. "/team/jane-dela-cruz.jpg" (square, at least 160x160).
// Cards without a photo show a neutral person icon.
export type TeamMember = {
  name: string;
  role: string;
  bio: string;
  photo?: string;
};

// PLACEHOLDERS: swap in real names, bios, and photos (with each person's permission) before launch.
const PLACEHOLDER_BIO =
  "Short bio goes here: background, degree, and the kinds of analysis they know best.";
export const TEAM: TeamMember[] = [
  { name: "Full name", role: "Founder & CEO", bio: PLACEHOLDER_BIO },
  { name: "Full name", role: "Study coordinator", bio: PLACEHOLDER_BIO },
  { name: "Full name", role: "Senior reviewer", bio: PLACEHOLDER_BIO },
  { name: "Full name", role: "Senior statistician", bio: PLACEHOLDER_BIO },
  { name: "Full name", role: "Statistician", bio: PLACEHOLDER_BIO },
  { name: "Full name", role: "Finance", bio: PLACEHOLDER_BIO },
];

export type Milestone = { year: string; title: string; body: string };
// Add real milestones here (oldest first). The story timeline stays hidden while this list is empty.
export const STORY: Milestone[] = [];
