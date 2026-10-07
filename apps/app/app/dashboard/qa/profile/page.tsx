import type { Metadata } from "next";
import { getOwnProfile } from "@/features/staff/actions";
import { QaProfileClient } from "./QaProfileClient";

export const metadata: Metadata = {
  title: "My Profile | JAXIS StatLab",
  description: "Your signature, review skills and password.",
};

export const dynamic = "force-dynamic";

// Loaded on the server (it used to load in the browser after the page appeared).
export default async function QAProfilePage() {
  const res = await getOwnProfile();
  return <QaProfileClient profile={res.success ? res.data : null} />;
}
