import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import SiteShell from "../components/layout/SiteShell";
import { AboutHero, AboutMission, AboutNumbers, AboutStory, AboutTeam, AboutValues } from "../components/sections/About";
import FinalCTA from "../components/sections/FinalCTA";

export const metadata: Metadata = pageMetadata({
  title: "About: The Statisticians Behind Every Study",
  description:
    "JAXIS StatLab is a statistical consulting team in Maramag, Bukidnon. Every study is checked by two statistical analysts, explained in plain English, and kept private.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <SiteShell>
      <AboutHero />
      <AboutMission />
      <AboutTeam />
      <AboutNumbers />
      <AboutValues />
      <AboutStory />
      <FinalCTA />
    </SiteShell>
  );
}
