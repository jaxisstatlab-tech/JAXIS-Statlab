import { getSpecialistPayoutHistoryAction } from "@/features/finance/actions";
import { QaPayoutsClient } from "./QaPayoutsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QA Audit Earnings | JAXIS StatLab",
  description: "Track verified QA audit fee disbursements, pending review escrow balances, and fee rates.",
};

export default async function QaPayoutsPage() {
  const res = await getSpecialistPayoutHistoryAction();
  const initialData = res.success && res.data ? res.data : {
    payouts: [],
    verifiedEarnings: 0,
    inProgressEscrow: 0,
  };

  return <QaPayoutsClient initialData={initialData} />;
}
