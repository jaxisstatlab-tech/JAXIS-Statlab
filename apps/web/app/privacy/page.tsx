import type { Metadata } from "next";
import SiteShell from "../components/layout/SiteShell";
import LegalPage from "../components/sections/LegalPage";
import { PRIVACY } from "../content/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · JAXIS StatLab",
  description: "What JAXIS StatLab collects, how your study data is protected, how long it is kept, and your rights under the Data Privacy Act.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <SiteShell>
      <LegalPage doc={PRIVACY} other={{ href: "/terms", label: "Read the Terms of Service" }} />
    </SiteShell>
  );
}
