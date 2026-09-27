import { auth } from "@/lib/auth";
import { getClientProfile } from "@/features/client-profile/actions";
import { ClientProfileClient } from "./ClientProfileClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your profile | JAXIS StatLab",
  description: "Your school, contact details and password.",
};

export default async function ClientProfilePage() {
  const session = await auth();
  const profile = await getClientProfile();

  return (
    <ClientProfileClient
      initialProfile={profile}
      sessionUser={{
        id: session?.user?.id || "",
        fullName: (session?.user as { fullName?: string } | undefined)?.fullName || session?.user?.name || "",
        email: session?.user?.email || "",
      }}
    />
  );
}
