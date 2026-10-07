import { resolvePackagePayoutRule } from "@/lib/payout-rules";
import type { CompensationType } from "./schemas";

/**
 * What one delivered study pays its analyst or reviewer. Used by the payslip (generateBatchPayslips) and by
 * "My Earnings", so both always agree.
 *
 * - Flat-amount packages (Money & Pay Rates "Flat amount"): the analyst's or reviewer's flat amount.
 * - Otherwise a share of the price: the person's own percentage if the CEO set one, else the role's percentage
 *   (when the role is on "percentage per study"), else the package rate for their role.
 * - Plus the "extra per study" amount from pay settings.
 */
export async function studyPayFor(args: {
  isAnalyst: boolean;
  grossAmount: number;
  packageName: string | null;
  config: { compensationType: CompensationType; commissionPercentagePerStudy: number; fixedPerStudyBonus?: number };
  personalPercent?: number | null;
}): Promise<{ percent: number; bonus: number; amount: number }> {
  const { isAnalyst, grossAmount, packageName, config, personalPercent } = args;
  const rule = await resolvePackagePayoutRule(packageName || "JX_03_CORE");
  const bonus = config.fixedPerStudyBonus || 0;
  if (rule.mode === "FIXED") {
    const amount = (isAnalyst ? rule.fixedAmount : rule.fixedQaAmount) + bonus;
    return { percent: 0, bonus, amount: Math.round(amount * 100) / 100 };
  }
  const role =
    config.compensationType === "PERCENTAGE_PER_STUDY" && config.commissionPercentagePerStudy > 0 ? config.commissionPercentagePerStudy : 0;
  const percent = personalPercent && personalPercent > 0 ? personalPercent : role > 0 ? role : isAnalyst ? rule.ratePercent : rule.qaRatePercent;
  return { percent, bonus, amount: Math.round(((grossAmount * percent) / 100 + bonus) * 100) / 100 };
}
