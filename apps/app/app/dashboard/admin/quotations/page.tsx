import React from "react";
import { getQuotationsRoster, getCommercialCatalog } from "@/features/quotations/actions";
import { AdminQuotationsClient } from "./AdminQuotationsClient";

export default async function AdminQuotationsPage() {
  const [initialQuotations, initialCatalog] = await Promise.all([
    getQuotationsRoster(),
    getCommercialCatalog(),
  ]);

  return (
    <AdminQuotationsClient
      initialQuotations={initialQuotations}
      initialCatalog={initialCatalog}
    />
  );
}
