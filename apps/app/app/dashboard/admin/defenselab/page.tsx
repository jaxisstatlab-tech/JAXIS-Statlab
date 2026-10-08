import type { Metadata } from "next";
import { getAdminDefenseLabData } from "@/features/defenselab/actions";
import { AdminDefenseLabClient } from "./AdminDefenseLabClient";

export const metadata: Metadata = {
  title: "DefenseLab | JAXIS StatLab",
  description: "Practice defense sessions: meeting links, marking them done, recordings and late-change fees.",
};

export const dynamic = "force-dynamic";

// Loaded on the server (it used to load in the browser behind a full-page spinner).
export default async function AdminDefenseLabPage() {
  const res = await getAdminDefenseLabData().catch(() => null);
  return <AdminDefenseLabClient sessions={res && res.success ? (res.data?.sessions ?? []) : []} failed={!res || !res.success} />;
}
