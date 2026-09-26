import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import MobileCTA from "./components/layout/MobileCTA";
import GradualBlur from "./components/ui/GradualBlur";
import ScrollFx from "./components/layout/ScrollFx";
import Hero from "./components/sections/Hero";
import Services from "./components/sections/Services";
import HowItWorks from "./components/sections/HowItWorks";
import PipelineBand from "./components/sections/PipelineBand";
import SampleOutput from "./components/sections/SampleOutput";
import Quality from "./components/sections/Quality";
import Testimonials from "./components/sections/Testimonials";
import Pricing from "./components/sections/Pricing";
import FAQ from "./components/sections/FAQ";
import FinalCTA from "./components/sections/FinalCTA";
import { FAQS } from "./content/site";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Navbar />
      <main>
        <Hero />
        <Services />
        <HowItWorks />
        <PipelineBand />
        <Quality />
        <SampleOutput />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <ScrollFx />
      <GradualBlur />
      <MobileCTA />
    </>
  );
}
