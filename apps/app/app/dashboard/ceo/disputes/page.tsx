import { getAdminDisputesAction } from "@/features/disputes/actions";
import { CeoDisputesClient } from "./CeoDisputesClient";

export const dynamic = "force-dynamic";

// The first view (all statuses, no search) is loaded here so the page arrives with its data. If this load
// fails, the page loads it in the browser instead, as before.
export default async function CeoDisputesPage() {
  const res = await getAdminDisputesAction({ status: "ALL", search: "" }).catch(() => null);
  return <CeoDisputesClient initialData={res?.success && res.data ? res.data : null} />;
}
