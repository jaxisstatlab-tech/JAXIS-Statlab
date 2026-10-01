import { getAdminDisputesAction } from "@/features/disputes/actions";
import { AdminDisputesClient } from "./AdminDisputesClient";

export const dynamic = "force-dynamic";

// The first view (all statuses, no search) is loaded here so the page arrives with its data. If this load
// fails, the page loads it in the browser instead, as before.
export default async function AdminDisputesPage() {
  const res = await getAdminDisputesAction({ status: "ALL", search: "" }).catch(() => null);
  return <AdminDisputesClient initialData={res?.success && res.data ? res.data : null} />;
}
