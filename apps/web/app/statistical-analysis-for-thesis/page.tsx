import type { Metadata } from "next";
import { faqJsonLd, landingJsonLd, pageMetadata } from "@/lib/seo";
import SiteShell from "../components/layout/SiteShell";
import FAQ from "../components/sections/FAQ";
import FinalCTA from "../components/sections/FinalCTA";
import { LandingCards, LandingFiles, LandingHero, LandingLinks, LandingPrices, LandingSteps, LandingTestimonials } from "../components/sections/Landing";
import { FAQS, TESTIMONIALS, type Faq } from "../content/site";

// Landing page for people searching for thesis statistics help ("statistician for thesis", "thesis stat service",
// "statistical analysis for thesis Philippines").

const PATH = "/statistical-analysis-for-thesis";
const TITLE = "Statistical Analysis for Thesis and Research in the Philippines";
const DESCRIPTION =
  "Thesis statistician for college, master's and doctoral students in the Philippines. We run your t-tests, ANOVA, regression or SEM, a second analyst checks every number, and you get APA 7th edition tables with plain-English explanations. Fixed price in 24 hours, from ₱500.";

export const metadata: Metadata = pageMetadata({
  title: "Statistical Analysis for Thesis: Philippines Thesis Statistician",
  description: DESCRIPTION,
  path: PATH,
});

const TESTS = [
  { meta: "Describe", title: "Who answered your survey", body: "Frequencies, percentages, means and cross-tabulations of your respondents, in APA tables." },
  { meta: "Compare", title: "Differences between groups", body: "t-tests and ANOVA, with assumption checks and effect sizes, so you know if a difference is real." },
  { meta: "Relate", title: "Relationships and predictors", body: "Correlation and regression analysis to show what is linked to what, and how strongly." },
  { meta: "Check", title: "Your data and instrument", body: "Data cleaning, normality checks and reliability (Cronbach's alpha) before any test is run." },
  { meta: "Advanced", title: "Complex models", body: "Structural equation modeling, path analysis, multilevel and survival models for dissertations." },
  { meta: "Software", title: "SPSS, R, Jamovi, SmartPLS", body: "We use the software your adviser expects and give you the cleaned dataset (.sav or .csv)." },
];

const PAGE_FAQS: Faq[] = [
  {
    q: "Can you do the statistical analysis for my thesis?",
    a: "Yes. Send your research questions, survey and data through a free account. A statistical analyst runs the right tests, a second analyst audits every number, and you get APA 7th edition tables with a plain-English explanation of each result.",
  },
  {
    q: "How much does a thesis statistician cost in the Philippines?",
    a: "Our packages start at ₱500 for a data check, and most college and master's theses fall in the Core Thesis Package range. You get a fixed written price for your exact study within 24 hours, before you pay anything.",
  },
  ...FAQS.filter((f) => /Chapter 4|allowed by my school|not significant|How fast/.test(f.q)),
];

export default function ThesisStatisticsPage() {
  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            landingJsonLd({ path: PATH, name: TITLE, description: DESCRIPTION, areaServed: ["Philippines", "Northern Mindanao", "Bukidnon"] })
          ),
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(PAGE_FAQS, PATH)) }} />
      <LandingHero
        kicker="Thesis statistics · Philippines"
        title="Statistical analysis for your thesis, checked by two analysts"
        intro="Stuck on Chapter 4? Send us your data and research questions. A statistical analyst runs the right tests, a second analyst audits every number, and you get APA tables and plain-English explanations you can defend in front of your panel."
        facts={["Fixed price in 24 hours", "From ₱500", "College, master's and doctoral", "GCash or bank transfer"]}
      />
      <LandingCards
        kicker="What we run"
        title="The statistics your study needs"
        description="We pick the tests that answer your research questions, and explain why in plain English."
        items={TESTS}
      />
      <LandingSteps />
      <LandingFiles />
      <LandingPrices />
      <LandingTestimonials
        title="Thesis groups who defended with our results"
        items={TESTIMONIALS.filter((t) => t.defended || t.school).slice(0, 4)}
      />
      <FAQ layout="split" items={PAGE_FAQS} title="Questions about thesis statistics" description="Cost, your school's rules, Chapter 4, and timing." />
      <LandingLinks
        links={[
          { href: "/statistician-bukidnon", label: "Thesis statistician in Bukidnon" },
          { href: "/pricing", label: "Prices" },
          { href: "/about", label: "About our team" },
        ]}
      />
      <FinalCTA />
    </SiteShell>
  );
}
