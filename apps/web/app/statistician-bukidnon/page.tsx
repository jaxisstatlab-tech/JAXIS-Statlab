import type { Metadata } from "next";
import { faqJsonLd, landingJsonLd, pageMetadata } from "@/lib/seo";
import SiteShell from "../components/layout/SiteShell";
import FAQ from "../components/sections/FAQ";
import FinalCTA from "../components/sections/FinalCTA";
import { LandingCards, LandingHero, LandingLinks, LandingPrices, LandingSteps, LandingTestimonials } from "../components/sections/Landing";
import { FAQS, TESTIMONIALS, type Faq } from "../content/site";

// Landing page for local searches ("statistician Maramag", "statistical service Bukidnon", "CMU thesis
// statistician"). JAXIS is based in Maramag; everything is done online, so it serves all of Bukidnon.

const PATH = "/statistician-bukidnon";
const TITLE = "Thesis Statistician in Maramag, Bukidnon";
const TOWNS = ["Maramag", "Valencia City", "Malaybalay City", "Quezon", "Don Carlos", "Kalilangan", "Pangantucan", "Musuan"];
const DESCRIPTION =
  "Statistical analysis service based in Maramag, Bukidnon, for thesis groups from Central Mindanao University and schools across Bukidnon. Two analysts check every number. Online, in English, Filipino or Cebuano. Fixed price in 24 hours, from ₱500.";

export const metadata: Metadata = pageMetadata({
  title: "Thesis Statistician in Maramag, Bukidnon | Statistical Analysis Service",
  description: DESCRIPTION,
  path: PATH,
});

const PAGE_FAQS: Faq[] = [
  {
    q: "Is there a thesis statistician near Maramag or Valencia?",
    a: "Yes. JAXIS StatLab is based in Maramag, Bukidnon. We work with thesis groups from Central Mindanao University and schools across Bukidnon, including Valencia City and Malaybalay City.",
  },
  {
    q: "Do we need to meet in person?",
    a: "No. Everything is done online: you send your files through your free account, message your statistical analyst there, and pay by GCash or bank transfer. You can also book a live DefenseLab practice session before your defense.",
  },
  {
    q: "Can we talk in Cebuano or Filipino?",
    a: "Yes. You can message us in English, Filipino or Cebuano, and we can explain your results in whichever is easiest for your group.",
  },
  ...FAQS.filter((f) => /allowed by my school|Chapter 4|How do I pay/.test(f.q)),
];

// Testimonials from Bukidnon groups: Central Mindanao University, or written in Cebuano.
const LOCAL = TESTIMONIALS.filter((t) => /Central Mindanao University/.test(t.school) || Boolean(t.translation));

export default function BukidnonPage() {
  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            landingJsonLd({ path: PATH, name: TITLE, description: DESCRIPTION, areaServed: ["Bukidnon", ...TOWNS, "Northern Mindanao"] })
          ),
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(PAGE_FAQS, PATH)) }} />
      <LandingHero
        kicker="Maramag · Bukidnon"
        title="Your thesis statistician in Maramag, Bukidnon"
        intro="JAXIS StatLab is a statistical consulting team based in Maramag. We run, check and explain the statistics for thesis groups from Central Mindanao University and schools across Bukidnon, all online, so you don't need to travel. Message us in English, Filipino or Cebuano."
        facts={["Based in Maramag", "CMU thesis groups", "English, Filipino, Cebuano", "Fixed price in 24 hours"]}
      />
      <LandingCards
        kicker="Who we help"
        title="Thesis groups across Bukidnon"
        description={`Students in ${TOWNS.slice(0, -1).join(", ")} and ${TOWNS[TOWNS.length - 1]}, and anywhere in the Philippines online.`}
        items={[
          { title: "College thesis groups", body: "Survey studies, descriptive tables, t-tests, ANOVA and correlation, explained so your whole group can defend it." },
          { title: "Master's and doctoral students", body: "Regression, structural equation modeling and path analysis for graduate research." },
          { title: "Advisers and researchers", body: "A second analyst audits every number, and you get a signed Certificate of Statistical Audit." },
        ]}
      />
      <LandingTestimonials title="What thesis groups in Bukidnon say" items={LOCAL} />
      <LandingSteps />
      <LandingPrices />
      <FAQ layout="split" items={PAGE_FAQS} title="Questions from Bukidnon students" description="Meeting, language, your school's rules and payment." />
      <LandingLinks
        links={[
          { href: "/statistical-analysis-for-thesis", label: "Statistical analysis for your thesis" },
          { href: "/pricing", label: "Prices" },
          { href: "/contact", label: "Contact us" },
        ]}
      />
      <FinalCTA />
    </SiteShell>
  );
}
