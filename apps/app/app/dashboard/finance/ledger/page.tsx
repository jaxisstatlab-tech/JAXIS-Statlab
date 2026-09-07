import { getFinancialLedgerAction } from "@/features/finance/actions";
import { FinanceLedgerClient } from "./FinanceLedgerClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Financial Ledger | JAXIS StatLab",
  description: "Per-project itemized revenue ledger tracking gross client receipts, specialist commissions, and net company margins.",
};

export default async function FinanceLedgerPage() {
  const res = await getFinancialLedgerAction({});
  const initialData = res.success && res.data ? res.data : {
    ledgers: [],
    summary: {
      totalGross: 0,
      totalPayouts: 0,
      totalMargin: 0,
      avgMarginPercent: 0,
    },
  };

  return <FinanceLedgerClient initialData={initialData} />;
}
