import React from "react";
import type { Metadata } from "next";
import { getFinanceReceivablesSummary, getPaymentChannels } from "@/features/payments/actions";
import { FinanceDashboardClient } from "./FinanceDashboardClient";

export const metadata: Metadata = {
  title: "Finance Overview | JAXIS StatLab",
  description: "Client payments, what's still owed, and the accounts clients send money to.",
};

export const dynamic = "force-dynamic";

// Totals and the payment accounts are read on the server, side by side, so the page arrives complete.
export default async function FinanceDashboardPage() {
  const [summary, channels] = await Promise.all([
    getFinanceReceivablesSummary().catch(() => null),
    getPaymentChannels().catch(() => null),
  ]);

  return (
    <FinanceDashboardClient
      initialData={summary?.success ? summary.data : null}
      initialChannels={channels?.success ? channels.data : null}
    />
  );
}
