import React from "react";
import type { Metadata } from "next";
import { getCeoOverview } from "@/features/ceo/overview";
import { CEODashboardClient } from "./CEODashboardClient";

export const metadata: Metadata = {
  title: "CEO Overview | JAXIS StatLab",
  description: "Money collected, studies in progress, and what needs the CEO's attention.",
};

export const dynamic = "force-dynamic";

// Everything is read on the server so the page arrives complete. If the read fails, the page says so.
export default async function CEODashboardPage() {
  const overview = await getCeoOverview().catch((err) => {
    console.error("[CEO Overview] Couldn't load the overview:", err);
    return null;
  });
  return <CEODashboardClient overview={overview} />;
}
