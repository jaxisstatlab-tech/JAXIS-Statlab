import { getClientProfile } from "@/features/client-profile/actions";
import { ClientProfileClient } from "./ClientProfileClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "School & Academic Profile | JAXIS StatLab",
  description: "Complete your university and contact details in the Philippines to submit research study requests.",
};

export default async function ClientProfilePage() {
  const profile = await getClientProfile();
  return <ClientProfileClient initialProfile={profile} />;
}
