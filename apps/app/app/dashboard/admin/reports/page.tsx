import { getReportDataAction } from "@/features/reporting/actions";
import { AdminReportsClient } from "./AdminReportsClient";

export const dynamic = "force-dynamic";

// The default report (Revenue Summary, all dates) is loaded here so the page arrives with its data. If this load
// fails, the page loads it in the browser instead, as before.
export default async function AdminReportsPage() {
  const res = await getReportDataAction({ reportType: "revenue-summary" }).catch(() => null);
  return <AdminReportsClient initialReport={res?.success && res.data ? res.data : null} />;
}
