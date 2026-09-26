// Copy for /about. Everything here restates how JAXIS already works (site copy and apps/app/docs);
// no made-up milestones. CORE_TEAM and EXPERT_TEAM are the real team, in the order they appear.

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

// `photo` is a path under /public (square headshot). Cards without a photo show a neutral person icon.
export type TeamMember = {
  name: string;
  role: string;
  bio?: string;
  photo?: string;
};

export const CORE_TEAM: TeamMember[] = [
  {
    name: "Jerome P. Gallego",
    role: "Chief Executive Officer & Founder",
    bio: "BS Mathematics graduate with a minor in Statistics, currently pursuing a Master of Science in Mathematics.",
    photo: "/team/Jerome.jpg",
  },
  {
    name: "Barth Bryan D. Sercena",
    role: "Chief Technological Officer & Co-founder",
    bio: "Leads technology and product at JAXIS StatLab, overseeing platform architecture, data security, and the systems that support every study from request to delivery.",
    photo: "/team/Barth.jpg",
  },
];

export const EXPERT_TEAM: TeamMember[] = [
  {
    name: "Jobelle S. Sorino-Simblante",
    role: "Statistical Review Editor",
    bio: "BS Statistics and MS Statistics graduate, currently pursuing a doctoral degree in Statistics.",
    photo: "/team/Jobelle.jpg",
  },
  {
    name: "Kim Lenard Ric T. Claro",
    role: "Fellow Statistical Analyst",
    bio: "BS Mathematics graduate with a minor in Statistics.",
    photo: "/team/Kim.jpg",
  },
  {
    name: "Negie C. Sudario",
    role: "Fellow Statistical Analyst",
    bio: "BS Mathematics graduate with a minor in Statistics, currently pursuing a Master of Science in Mathematics.",
    photo: "/team/Negie.jpg",
  },
  {
    name: "Bienuel Esmeralda",
    role: "Fellow Statistical Analyst",
    bio: "BS Mathematics graduate with a minor in Statistics.",
    photo: "/team/Bienuel.jpg",
  },
  {
    name: "Karla Giselle R. Santos",
    role: "Associate Statistical Analyst",
    bio: "BS Mathematics graduate with a minor in Statistics.",
    photo: "/team/Karla.jpg",
  },
  {
    name: "Aigen Fe Torres",
    role: "Associate Statistical Analyst",
    bio: "BS Mathematics graduate with a minor in Statistics.",
    photo: "/team/Aigen.jpg",
  },
  {
    name: "Akeem V. Eviota",
    role: "Affiliate Statistical Analyst",
    bio: "Currently pursuing BS Mathematics with a minor in Statistics.",
    photo: "/team/Akeem.jpg",
  },
  {
    name: "Axel D. Laurie",
    role: "Affiliate Statistical Analyst",
    bio: "Currently pursuing BS Mathematics with a minor in Statistics.",
    photo: "/team/Axel.jpg",
  },
  {
    name: "Antonia B. Ytang",
    role: "Affiliate Statistical Analyst",
    bio: "Currently pursuing BS Mathematics with a minor in Statistics.",
    photo: "/team/Antonia.jpg",
  },
];

export type Milestone = { year: string; title: string; body: string };
// Add real milestones here (oldest first). The story timeline stays hidden while this list is empty.
export const STORY: Milestone[] = [];
