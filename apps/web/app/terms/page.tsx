import type { Metadata } from "next";
import SiteShell from "../components/layout/SiteShell";
import LegalPage from "../components/sections/LegalPage";
import { TERMS } from "../content/legal";

export const metadata: Metadata = {
  title: "Terms of Service · JAXIS StatLab",
  description: "How pricing, payment, delivery, revisions, refunds, and DefenseLab sessions work at JAXIS StatLab.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <SiteShell>
      <LegalPage doc={TERMS} other={{ href: "/privacy", label: "Read the Privacy Policy" }} />
    </SiteShell>
  );
}
