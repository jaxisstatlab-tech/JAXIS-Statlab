import { getClientProfileOnce } from "@/features/client-profile/profile-cache";
import { NewProjectIntakeClient } from "./NewProjectIntakeClient";

export default async function NewProjectIntakePage() {
  const profile = await getClientProfileOnce();
  return <NewProjectIntakeClient initialProfile={profile} />;
}



