import React, { Suspense } from "react";
import { getBlockedMessages } from "@/features/messaging/actions";
import { AdminFirewallMessagesClient } from "./AdminFirewallMessagesClient";
import { LoadingState } from "@repo/ui";

export default async function AdminFirewallMessagesPage() {
  const res = await getBlockedMessages({
    search: "",
    category: "ALL",
    reviewedStatus: "ALL",
    page: 1,
    pageSize: 10,
  });

  const initialData = res.success && res.data ? res.data : null;

  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
          <LoadingState variant="page" label="Loading communications firewall..." />
        </div>
      }
    >
      <AdminFirewallMessagesClient initialData={initialData} />
    </Suspense>
  );
}
