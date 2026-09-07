import React, { Suspense } from "react";
import { getFinancePayoutQueue } from "@/features/finance/actions";
import { FinancePayoutsClient } from "./FinancePayoutsClient";
import { LoadingState } from "@repo/ui";

export default async function FinancePayoutsPage() {
  const res = await getFinancePayoutQueue({
    status: "ALL",
    search: "",
  });

  const initialData = res.success && res.data ? res.data : null;

  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
          <LoadingState variant="page" label="Loading milestone payouts..." />
        </div>
      }
    >
      <FinancePayoutsClient initialData={initialData} />
    </Suspense>
  );
}
