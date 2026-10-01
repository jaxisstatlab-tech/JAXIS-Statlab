import { getAuditLogsAction } from "@/features/reporting/actions";
import { AdminAuditLogClient } from "./AdminAuditLogClient";

export const dynamic = "force-dynamic";

// The first view (no filters) is loaded here so the page arrives with its data. If this load fails, the page
// loads it in the browser instead, as before.
export default async function AdminAuditLogPage() {
  const res = await getAuditLogsAction({ search: "", action: "ALL" }).catch(() => null);
  return <AdminAuditLogClient initialLogs={res?.success && res.data ? res.data : null} />;
}
