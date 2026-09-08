import { getClientProfile } from "@/features/client-profile/actions";
import { NewProjectIntakeClient } from "./NewProjectIntakeClient";

export default async function NewProjectIntakePage() {
  const profile = await getClientProfile();
  return <NewProjectIntakeClient initialProfile={profile} />;
}



