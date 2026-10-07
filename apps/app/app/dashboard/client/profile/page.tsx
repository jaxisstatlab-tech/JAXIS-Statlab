import { auth } from "@/lib/auth";
import { getClientProfileOnce } from "@/features/client-profile/profile-cache";
import { ClientProfileClient } from "./ClientProfileClient";
import { getMyAccount } from "@/features/account/actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile | JAXIS StatLab",
  description: "Your name, photo, school, contact details and password.",
};

export default async function ClientProfilePage() {
  const [session, profile, account] = await Promise.all([auth(), getClientProfileOnce(), getMyAccount()]);

  return (
    <ClientProfileClient
      initialProfile={profile}
      account={account.success ? account.data : null}
      sessionUser={{
        id: session?.user?.id || "",
        fullName: (session?.user as { fullName?: string } | undefined)?.fullName || session?.user?.name || "",
        email: session?.user?.email || "",
      }}
    />
  );
}
