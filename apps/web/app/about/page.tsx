import type { Metadata } from "next";
import SiteShell from "../components/layout/SiteShell";
import { AboutHero, AboutMission, AboutNumbers, AboutStory, AboutTeam, AboutValues } from "../components/sections/About";
import FinalCTA from "../components/sections/FinalCTA";

export const metadata: Metadata = {
  title: "About · JAXIS StatLab",
  description:
    "JAXIS StatLab is a statistical consulting team in Maramag, Bukidnon. Every study is checked by two statisticians, explained in plain English, and kept private.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <SiteShell>
      <AboutHero />
      <AboutMission />
      <AboutNumbers />
      <AboutStory />
      <AboutValues />
      <AboutTeam />
      <FinalCTA />
    </SiteShell>
  );
}
