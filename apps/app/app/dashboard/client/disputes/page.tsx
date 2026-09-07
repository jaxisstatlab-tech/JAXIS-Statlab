import React from "react";
import { getClientEligibleDisputesAction } from "@/features/disputes/actions";
import { ClientDisputesClient } from "./ClientDisputesClient";

export default async function ClientDisputesPage() {
  const res = await getClientEligibleDisputesAction();
  const initialData = res.success ? res.data : null;

  return <ClientDisputesClient initialData={initialData} />;
}
