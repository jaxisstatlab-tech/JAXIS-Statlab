import { getFinancePaymentsQueue } from "@/features/payments/actions";
import { FinancePaymentsQueueClient } from "./FinancePaymentsQueueClient";

// Payments to Check, loaded on the server (the folder's loading.tsx covers the wait).
export default async function FinancePaymentsQueuePage() {
  const res = await getFinancePaymentsQueue({ status: "ALL" });
  return <FinancePaymentsQueueClient payments={res.success && res.data ? res.data : []} failed={!res.success} />;
}
