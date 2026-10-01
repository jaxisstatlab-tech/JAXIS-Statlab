import { getCeoFinancialOverviewAction } from "@/features/finance/actions";
import { getCommercialCatalog } from "@/features/quotations/actions";
import { CeoFinanceClient } from "./CeoFinanceClient";

export const dynamic = "force-dynamic";

// The overview and the price catalog are loaded here, side by side, so the page arrives with its data. If a
// load fails, the page loads it in the browser instead, as before.
export default async function CeoFinancePage() {
  const [overview, catalog] = await Promise.all([
    getCeoFinancialOverviewAction().catch(() => null),
    getCommercialCatalog().catch(() => null),
  ]);
  return (
    <CeoFinanceClient
      initialOverview={overview?.success && overview.data ? overview.data : null}
      initialCatalog={catalog ?? null}
    />
  );
}
