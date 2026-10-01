import { getReportDataAction, getStorageRetentionConfigAction } from "@/features/reporting/actions";
import { CeoReportsClient } from "./CeoReportsClient";

export const dynamic = "force-dynamic";

// The default report (Revenue Summary, all dates) and the retention settings are loaded here, side by side,
// so the page arrives with its data. If a load fails, the page loads it in the browser instead, as before.
export default async function CeoReportsPage() {
  const [report, retention] = await Promise.all([
    getReportDataAction({ reportType: "revenue-summary" }).catch(() => null),
    getStorageRetentionConfigAction().catch(() => null),
  ]);
  return (
    <CeoReportsClient
      initialReport={report?.success && report.data ? report.data : null}
      initialRetention={retention?.success && retention.data ? retention.data : null}
    />
  );
}
