import React from "react";
import { getClientQuotationsData } from "@/features/quotations/actions";
import { ClientQuotationsClient } from "./ClientQuotationsClient";

export default async function ClientQuotationsPage() {
  const initialEntries = await getClientQuotationsData();
  return <ClientQuotationsClient initialEntries={initialEntries} />;
}
