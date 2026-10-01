import { getInfrastructureHealthAction, getStorageRetentionConfigAction } from "@/features/reporting/actions";
import { CeoRetentionClient } from "./CeoRetentionClient";

export const dynamic = "force-dynamic";

// The retention settings and the storage health check are loaded here, side by side, so the page arrives with
// its data. If either load fails, the page loads both in the browser instead, as before.
export default async function CeoStorageRetentionPage() {
  const [config, health] = await Promise.all([
    getStorageRetentionConfigAction().catch(() => null),
    getInfrastructureHealthAction().catch(() => null),
  ]);
  return (
    <CeoRetentionClient
      initialConfig={config?.success && config.data ? config.data : null}
      initialHealth={health?.success && health.data ? health.data : null}
    />
  );
}
