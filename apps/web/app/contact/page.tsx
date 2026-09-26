import type { Metadata } from "next";
import SiteShell from "../components/layout/SiteShell";
import Contact from "../components/sections/Contact";
import StartBand from "../components/sections/StartBand";
import FAQ from "../components/sections/FAQ";
import FinalCTA from "../components/sections/FinalCTA";
import { FAQS } from "../content/site";

export const metadata: Metadata = {
  title: "Contact · JAXIS StatLab",
  description:
    "Questions about your study, pricing, or DefenseLab? Message a JAXIS StatLab statistician, or search answers to common questions.",
  alternates: { canonical: "/contact" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function ContactPage() {
  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Contact />
      <StartBand />
      <FAQ searchable />
      <FinalCTA />
    </SiteShell>
  );
}
