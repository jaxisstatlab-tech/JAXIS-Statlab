import SiteShell from "./components/layout/SiteShell";
import Hero from "./components/sections/Hero";
import Services from "./components/sections/Services";
import HowItWorks from "./components/sections/HowItWorks";
import PipelineBand from "./components/sections/PipelineBand";
import SampleOutput from "./components/sections/SampleOutput";
import Testimonials from "./components/sections/Testimonials";
import PricingPreview from "./components/sections/PricingPreview";
import FAQ from "./components/sections/FAQ";
import FinalCTA from "./components/sections/FinalCTA";
import { FAQS } from "./content/site";
import { faqJsonLd } from "@/lib/seo";

// The objections students raise before sending anything; the full list lives on /contact.
const HOME_QUESTIONS = [
  "Is working with JAXIS allowed by my school?",
  "Do you write Chapter 4 for me?",
  "What if my results are not significant?",
  "Is my data kept private?",
];
const HOME_FAQS = HOME_QUESTIONS.map((q) => FAQS.find((f) => f.q === q)).filter((f) => f !== undefined);

export default function Home() {
  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(HOME_FAQS, "")) }} />
      <Hero />
      <Services />
      <HowItWorks />
      <PipelineBand />
      <SampleOutput />
      <Testimonials />
      <PricingPreview />
      <FAQ
        layout="split"
        items={HOME_FAQS}
        defaultOpen={0}
        title="Questions students ask first"
        description="Straight answers before you send anything."
        moreHref="/contact#faq"
      />
      <FinalCTA />
    </SiteShell>
  );
}
