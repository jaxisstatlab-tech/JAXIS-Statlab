import { auth } from "@/lib/auth";
import { getClientProfile } from "@/features/client-profile/actions";
import { ClientProfileClient } from "./ClientProfileClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lead Researcher Profile | JAXIS StatLab",
  description: "Configure your university, academic program, and research contact details.",
};

export default async function ClientProfilePage() {
  const session = await auth();
  const profile = await getClientProfile();

  return (
    <ClientProfileClient
      initialProfile={profile}
      sessionUser={{
        id: session?.user?.id || "",
        fullName: session?.user?.name || "Lead Researcher",
        email: session?.user?.email || "client@jaxis.dev",
      }}
    />
  );
}
