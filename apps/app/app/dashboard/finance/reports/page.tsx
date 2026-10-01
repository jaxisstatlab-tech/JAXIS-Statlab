import { getReportDataAction } from "@/features/reporting/actions";
import { FinanceReportsClient } from "./FinanceReportsClient";

export const dynamic = "force-dynamic";

// The default report (Treasury Ledger, all dates) is loaded here so the page arrives with its data. If this load
// fails, the page loads it in the browser instead, as before.
export default async function FinanceReportsPage() {
  const res = await getReportDataAction({ reportType: "ledger-export" }).catch(() => null);
  return <FinanceReportsClient initialReport={res?.success && res.data ? res.data : null} />;
}
