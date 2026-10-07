import type { Metadata } from "next";
import { getMyStudyEarnings } from "@/features/payroll/actions";
import { StudyEarningsClient } from "@/features/payroll/components/StudyEarningsClient";

export const metadata: Metadata = {
  title: "My Earnings | JAXIS StatLab",
  description: "What you earn for each study, worked out the same way as your payslip.",
};

export const dynamic = "force-dynamic";

// Study pay comes from Payroll Settings and Money & Pay Rates, the same as the payslip (it used to list per-study
// payout records that payroll never used).
export default async function MyEarningsPage() {
  const res = await getMyStudyEarnings();
  return <StudyEarningsClient data={res.success ? res.data : null} failed={res.success ? undefined : res.error.message} role="reviewer" />;
}
