import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import SiteShell from "../components/layout/SiteShell";
import LegalPage from "../components/sections/LegalPage";
import { TERMS } from "../content/legal";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "How pricing, payment, delivery, revisions, refunds, and DefenseLab sessions work at JAXIS StatLab.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <SiteShell>
      <LegalPage doc={TERMS} other={{ href: "/privacy", label: "Read the Privacy Policy" }} />
    </SiteShell>
  );
}
