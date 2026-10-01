import { getNotificationLogsAction } from "@/features/notifications/actions";
import { AdminNotificationsClient } from "./AdminNotificationsClient";

export const dynamic = "force-dynamic";

// The first view (all statuses, no search) is loaded here so the page arrives with its data. If this load
// fails, the page loads it in the browser instead, as before.
export default async function AdminNotificationsPage() {
  const res = await getNotificationLogsAction({ status: "ALL", search: "" }).catch(() => null);
  return <AdminNotificationsClient initialData={res?.success && res.data ? res.data : null} />;
}
