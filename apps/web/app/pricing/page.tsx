import type { Metadata } from "next";
import { faqJsonLd, pageMetadata } from "@/lib/seo";
import SiteShell from "../components/layout/SiteShell";
import Pricing from "../components/sections/Pricing";
import FAQ from "../components/sections/FAQ";
import FinalCTA from "../components/sections/FinalCTA";
import { FAQS } from "../content/site";

export const metadata: Metadata = pageMetadata({
  title: "Pricing: Thesis Statistics Packages from ₱500",
  description:
    "Typical price ranges for thesis statistics, from ₱500. Send your study, we recommend the right package, and you get a fixed written price before you pay. GCash or bank transfer.",
  path: "/pricing",
});

const PRICING_FAQS = FAQS.filter((f) => f.pricing);

export default function PricingPage() {
  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(PRICING_FAQS, "/pricing")) }}
      />
      <Pricing />
      <FAQ
        layout="split"
        items={PRICING_FAQS}
        title="Questions about pricing"
        description="Delivery speed, changes, payment, and getting your written price."
      />
      <FinalCTA />
    </SiteShell>
  );
}
