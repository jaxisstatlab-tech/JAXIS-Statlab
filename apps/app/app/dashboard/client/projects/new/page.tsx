import { getClientProfileOnce } from "@/features/client-profile/profile-cache";
import { getCommercialCatalog } from "@/features/quotations/actions";
import { deliveryConfigFrom } from "@/lib/delivery-speed";
import { NewProjectIntakeClient } from "./NewProjectIntakeClient";

export default async function NewProjectIntakePage() {
  const [profile, catalog] = await Promise.all([getClientProfileOnce(), getCommercialCatalog()]);
  // Delivery times, what's switched on and the public prices (as on the website); nothing else from the price list.
  return <NewProjectIntakeClient initialProfile={profile} delivery={deliveryConfigFrom(catalog)} />;
}



