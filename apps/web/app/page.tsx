import SiteShell from "./components/layout/SiteShell";
import Hero from "./components/sections/Hero";
import Services from "./components/sections/Services";
import HowItWorks from "./components/sections/HowItWorks";
import PipelineBand from "./components/sections/PipelineBand";
import Testimonials from "./components/sections/Testimonials";
import PricingPreview from "./components/sections/PricingPreview";
import FinalCTA from "./components/sections/FinalCTA";

export default function Home() {
  return (
    <SiteShell>
      <Hero />
      <Services />
      <HowItWorks />
      <PipelineBand />
      <Testimonials />
      <PricingPreview />
      <FinalCTA />
    </SiteShell>
  );
}
