import { getArchivedProjectsAction, getStorageRetentionConfigAction } from "@/features/reporting/actions";
import { AdminArchiveClient } from "./AdminArchiveClient";

export const dynamic = "force-dynamic";

// The first view (all packages, no search) and the retention settings are loaded here, side by side, so the
// page arrives with its data. If a load fails, the page loads it in the browser instead, as before.
export default async function AdminArchivePage() {
  const [archives, config] = await Promise.all([
    getArchivedProjectsAction({ search: "", packageName: "ALL" }).catch(() => null),
    getStorageRetentionConfigAction().catch(() => null),
  ]);
  return (
    <AdminArchiveClient
      initialArchives={archives?.success && archives.data ? archives.data : null}
      initialRetentionConfig={config?.success && config.data ? config.data : null}
    />
  );
}
