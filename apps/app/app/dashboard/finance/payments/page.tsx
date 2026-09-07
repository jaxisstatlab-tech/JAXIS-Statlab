import React, { Suspense } from "react";
import { getFinancePaymentsQueue } from "@/features/payments/actions";
import { FinancePaymentsQueueClient } from "./FinancePaymentsQueueClient";
import { LoadingState } from "@repo/ui";

export default async function FinancePaymentsQueuePage() {
  const res = await getFinancePaymentsQueue({ status: "ALL" });
  const initialPayments = res.success && res.data ? res.data : [];

  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
          <LoadingState variant="page" label="Loading deposit queue..." />
        </div>
      }
    >
      <FinancePaymentsQueueClient initialPayments={initialPayments} />
    </Suspense>
  );
}
