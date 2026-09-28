import { auth } from "@/lib/auth";
import { getClientProfileOnce } from "@/features/client-profile/profile-cache";
import { ClientProfileClient } from "./ClientProfileClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your profile | JAXIS StatLab",
  description: "Your school, contact details and password.",
};

export default async function ClientProfilePage() {
  const session = await auth();
  const profile = await getClientProfileOnce();

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
