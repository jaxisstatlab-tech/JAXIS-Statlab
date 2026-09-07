import React, { Suspense } from "react";
import { getAdminDisputesAction } from "@/features/disputes/actions";
import { FinanceDisputesClient } from "./FinanceDisputesClient";
import { LoadingState } from "@repo/ui";

export default async function FinanceDisputesPage() {
  const res = await getAdminDisputesAction({
    status: "ALL",
    search: "",
  });

  const initialData = res.success && res.data ? res.data : null;

  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
          <LoadingState variant="page" label="Loading refunds and disputes..." />
        </div>
      }
    >
      <FinanceDisputesClient initialData={initialData} />
    </Suspense>
  );
}
