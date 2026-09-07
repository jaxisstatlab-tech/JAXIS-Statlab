import { getSpecialistPayoutHistoryAction } from "@/features/finance/actions";
import { StatisticianPayoutsClient } from "./StatisticianPayoutsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Milestone Payouts & Earnings | JAXIS StatLab",
  description: "Track verified milestone fee disbursements, in-progress escrow balances, and package commission rates.",
};

export default async function StatisticianPayoutsPage() {
  const res = await getSpecialistPayoutHistoryAction();
  const initialData = res.success && res.data ? res.data : {
    payouts: [],
    verifiedEarnings: 0,
    inProgressEscrow: 0,
  };

  return <StatisticianPayoutsClient initialData={initialData} />;
}
