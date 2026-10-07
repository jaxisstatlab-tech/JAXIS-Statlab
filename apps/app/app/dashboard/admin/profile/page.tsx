import type { Metadata } from "next";
import { getOwnProfile } from "@/features/staff/actions";
import { getMyAccount } from "@/features/account/actions";
import { StaffProfileClient } from "@/features/account/components/StaffProfileClient";

export const metadata: Metadata = {
  title: "My Profile | JAXIS StatLab",
  description: "Your name, photo, skills and password.",
};

export const dynamic = "force-dynamic";

// Loaded on the server; the same page for every staff role (set up per role in StaffProfileClient).
export default async function MyProfilePage() {
  const [profile, account] = await Promise.all([getOwnProfile(), getMyAccount()]);
  return (
    <StaffProfileClient
      role="ADMIN"
      profile={profile.success ? profile.data : null}
      account={account.success ? account.data : null}
    />
  );
}
