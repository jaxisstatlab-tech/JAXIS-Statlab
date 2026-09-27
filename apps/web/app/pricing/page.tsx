import type { Metadata } from "next";
import SiteShell from "../components/layout/SiteShell";
import Pricing from "../components/sections/Pricing";
import FAQ from "../components/sections/FAQ";
import FinalCTA from "../components/sections/FinalCTA";
import { FAQS } from "../content/site";

export const metadata: Metadata = {
  title: "Pricing · JAXIS StatLab",
  description:
    "Typical price ranges for thesis statistics, from ₱500. Send your study, we recommend the right package, and you get a fixed written price before you pay. GCash or bank transfer.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <SiteShell>
      <Pricing />
      <FAQ
        layout="split"
        items={FAQS.filter((f) => f.pricing)}
        title="Questions about pricing"
        description="Delivery speed, changes, payment, and getting your written price."
      />
      <FinalCTA />
    </SiteShell>
  );
}
