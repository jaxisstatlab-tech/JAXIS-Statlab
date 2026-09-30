import { CORE_TEAM, EXPERT_TEAM, VALUES } from "@/app/content/about";
import { ADDONS, INCLUDED, PLANS, SPEEDS, peso } from "@/app/content/pricing";
import { DELIVERABLES, FAQS, HOW_STEPS, TESTIMONIALS } from "@/app/content/site";
import { CONTACT_EMAIL, FACEBOOK_URL } from "@/lib/config";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo";

// llms.txt (https://llmstxt.org) and its long form, built from the same content the site renders so AI assistants
// quote current prices, steps, and policies instead of a hand-written copy that drifts.

const range = (p: (typeof PLANS)[number]) =>
  p.max === null ? `₱${peso(p.min)} and up` : `₱${peso(p.min)} to ₱${peso(p.max)}`;

const SERVICES = [
  ["Data cleaning", "Answers that don't fit are flagged, the data's shape (normality) is checked, and survey reliability (Cronbach's alpha) is confirmed before any test runs. Data is never changed to get a better result."],
  ["Hypothesis testing", "The right test for the research question (t-test, ANOVA, regression, correlation, and others), with assumptions checked first and effect sizes reported, not just p-values."],
  ["APA tables and findings", "Every table in APA 7th edition, ready for Word, each with a plain-English note on what the result means."],
  ["Respondent profiles", "Frequency tables, charts, and cross-tabs describing who answered the survey."],
  ["Advanced models", "Structural equation models (SEM), path analysis, multilevel models (HLM), and survival analysis for dissertations and complex designs, checked by a senior methodologist."],
  ["Checked by two analysts", "A second statistical analyst reruns every analysis from scratch. When the numbers match, the client receives a signed Certificate of Statistical Audit."],
  ["Defense prep", "A plain-English guide to the questions thesis panels ask most, plus optional live DefenseLab mock-panel practice."],
] as const;

const PAGES = [
  ["Home", "", "Services, how it works, sample deliverables, testimonials, price ranges, and common questions"],
  ["Pricing", "/pricing", "Typical price ranges for each package, delivery speeds, and add-ons"],
  ["About", "/about", "Mission, values, quality checks, and the team"],
  ["Contact and FAQ", "/contact", "Ways to reach the team and the full list of frequently asked questions"],
  ["Privacy Policy", "/privacy", "How study data is protected and kept under the Philippine Data Privacy Act"],
  ["Terms of Service", "/terms", "Pricing, payment, delivery, revisions, refunds, and DefenseLab sessions"],
] as const;

const facts = () => [
  `- Website: ${SITE_URL}`,
  `- What it is: a statistical consulting service for thesis, survey, dissertation, and research data`,
  `- Based in: Maramag, Bukidnon, Northern Mindanao, Philippines; works online with clients across the Philippines`,
  `- Price: typical ranges from ₱${peso(Math.min(...PLANS.map((p) => p.min)))}; every study gets a fixed written price within 24 hours before any payment`,
  `- Payment: GCash or bank transfer`,
  `- Standard delivery: 3 to 7 working days for most theses; 2 to 3 weeks for advanced models`,
  `- Quality: every study is checked by two statistical analysts and comes with a signed Certificate of Statistical Audit`,
  `- Not a thesis-writing service: JAXIS runs and explains the statistics; the researcher writes their own chapters`,
  `- Contact: ${CONTACT_EMAIL}${FACEBOOK_URL ? ` · ${FACEBOOK_URL}` : ""} · ${SITE_URL}/contact`,
];

export function llmsTxt() {
  return [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    ...facts(),
    "",
    "## Pages",
    "",
    ...PAGES.map(([name, path, about]) => `- [${name}](${SITE_URL}${path}): ${about}`),
    "",
    "## Packages",
    "",
    ...PLANS.map((p) => `- ${p.name}: ${range(p)}, ready in ${p.standard}. Best for: ${p.bestFor.toLowerCase()}.`),
    "",
    "## Optional",
    "",
    `- [Full reference](${SITE_URL}/llms-full.txt): services, every package feature, add-ons, the five-step process, deliverables, team, client messages, and all FAQs`,
    "",
  ].join("\n");
}

export function llmsFullTxt() {
  const team = [...CORE_TEAM, ...EXPERT_TEAM];
  return [
    `# ${SITE_NAME}: complete reference`,
    "",
    `> ${SITE_TAGLINE}. ${SITE_DESCRIPTION}`,
    "",
    "Generated from the website's own content; if anything here differs from the website, the website is correct.",
    "",
    "## Key facts",
    "",
    ...facts(),
    "",
    "## Services",
    "",
    ...SERVICES.map(([name, body]) => `- **${name}:** ${body}`),
    "",
    "## How it works",
    "",
    ...HOW_STEPS.map((s, i) => `${i + 1}. **${s.title}** (${s.time}): ${s.body}`),
    "",
    "## What every study includes",
    "",
    ...DELIVERABLES.map((d) => `- **${d.name}** (${d.format}): ${d.body}`),
    ...INCLUDED.map((i) => `- ${i}`),
    "",
    "## Packages and typical price ranges",
    "",
    "Clients don't pick a package. After reading the study, the team recommends one and sends a fixed written price; that price is final.",
    "",
    ...PLANS.flatMap((p) => [
      `### ${p.name}${p.featured ? " (most common)" : ""}`,
      "",
      `- Typical price: ${range(p)}`,
      `- Standard delivery: ${p.standard}`,
      `- Best for: ${p.bestFor}`,
      ...p.features.map((f) => `- ${f}`),
      "",
    ]),
    "## Delivery speeds and add-ons",
    "",
    ...SPEEDS.filter((s) => s.time).map((s) => `- ${s.label}: ready in ${s.time}, +₱${peso(s.fee)}`),
    ...ADDONS.filter((a) => a.group === "Practice").map((a) => `- ${a.name}: +₱${peso(a.fee)}${a.unit ? ` ${a.unit}` : ""}. ${a.detail}`),
    "",
    "## Values",
    "",
    ...VALUES.map((v) => `- **${v.title}:** ${v.body}`),
    "",
    "## Team",
    "",
    ...team.map((m) => `- ${m.name}, ${m.role}${m.bio ? `: ${m.bio}` : ""}`),
    "",
    "## What clients say",
    "",
    ...TESTIMONIALS.map(
      (t) =>
        `- "${t.quote}"${t.translation ? ` (In English: "${t.translation}")` : ""} ${t.name ? `${t.name}, ${[t.program, t.school].filter(Boolean).join(", ")}` : "Anonymous thesis group"}${t.defended ? " (defended)" : ""}`,
    ),
    "",
    "## Frequently asked questions",
    "",
    ...FAQS.flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
    "## Pages",
    "",
    ...PAGES.map(([name, path, about]) => `- [${name}](${SITE_URL}${path}): ${about}`),
    "",
  ].join("\n");
}
