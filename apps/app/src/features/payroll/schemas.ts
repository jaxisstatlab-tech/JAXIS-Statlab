import { z } from "zod";
import type { RoleName } from "@prisma/client";

export const CompensationTypeEnum = z.enum([
  "TIER_DELIVERABLE",
  "PERCENTAGE_PER_STUDY",
  "FIXED_SALARY",
  "HOURLY_DUTY",
  "HYBRID",
]);

export type CompensationType = z.infer<typeof CompensationTypeEnum>;

/**
 * The time clock is only for people paid by the hour ("Hourly Duty Wage"). For every other pay model (per study,
 * monthly salary, salary plus study pay) clock-in hours never count toward pay, so the clock is switched off for
 * them: the Clock In button is greyed out and the server refuses clock-ins.
 */
export function usesTimeClock(payModel?: CompensationType | null): boolean {
  return payModel === "HOURLY_DUTY";
}

/**
 * Whether a pay model includes pay for each delivered study (Per Study, a percentage per study, or Salary + Per
 * Study). Monthly Salary and Hourly Wage don't: studies never add to that pay.
 */
export function paysPerStudy(payModel?: CompensationType | null): boolean {
  return payModel === "TIER_DELIVERABLE" || payModel === "PERCENTAGE_PER_STUDY" || payModel === "HYBRID";
}

/** Where one study's pay stands for the analyst or reviewer on it ("My Earnings"). */
export type StudyEarningState =
  | "paid" // on a payslip that was paid
  | "onPayslip" // on a payslip that isn't paid yet
  | "next" // delivered and fully paid by the client: goes on the next payslip
  | "waitingPayment" // delivered, but the client still owes part of the price
  | "onHold" // a claim or refund is open
  | "notDelivered" // still being worked on (the amount is an estimate)
  | "stopped"; // cancelled or stopped: no pay

export interface StudyEarningItem {
  projectId: string;
  intakeId: string;
  title: string;
  packageName: string | null;
  role: "analyst" | "reviewer";
  /** The price the client agreed to (null when there isn't one yet). */
  gross: number | null;
  /** Share of the price (0 for a flat amount). */
  percent: number;
  /** The extra amount per study from pay settings. */
  bonus: number;
  /** What this study pays (from the payslip when it's on one, otherwise worked out with today's settings). */
  amount: number | null;
  state: StudyEarningState;
  payslip: { id: string; number: string; status: string; period: string } | null;
  deliveredAt: string | null;
}

export interface MyStudyEarningsDTO {
  payModel: CompensationType;
  /** One plain sentence of how this person is paid (from Payroll Settings). */
  payText: string;
  paysPerStudy: boolean;
  studies: StudyEarningItem[];
  totals: { paid: number; onPayslip: number; next: number; later: number };
}

/** The pay models the CEO picks from, in plain words, with whether each one uses the time clock. */
export const PAY_MODEL_OPTIONS: Array<{ id: CompensationType; title: string; subtitle: string }> = [
  { id: "TIER_DELIVERABLE", title: "Per Study", subtitle: "A share of each delivered study. No clock-in." },
  { id: "FIXED_SALARY", title: "Monthly Salary", subtitle: "The same pay every month. No clock-in." },
  { id: "HOURLY_DUTY", title: "Hourly Wage", subtitle: "Paid for clocked-in hours. Uses the time clock." },
  { id: "HYBRID", title: "Salary + Per Study", subtitle: "A monthly salary plus study pay. No clock-in." },
];

/** One plain sentence: how someone on this setting gets paid. Also saved as the role's note. */
export function payModelSummary(c: { compensationType: CompensationType;
  baseSalaryMonthly: number;
  commissionPercentagePerStudy: number;
  hourlyDutyRate: number;
  fixedPerStudyBonus: number;
  allowancesMonthly: number;
}): string {
  const money = (n: number) => Math.round(n).toLocaleString("en-PH");
  const parts: string[] = [];
  if (c.compensationType === "TIER_DELIVERABLE") parts.push("A share of each delivered study, at the package rates on Money & Pay Rates");
  if (c.compensationType === "PERCENTAGE_PER_STUDY") parts.push(`${c.commissionPercentagePerStudy}% of each delivered study`);
  if (c.compensationType === "FIXED_SALARY") parts.push(`₱${money(c.baseSalaryMonthly)} a month`);
  if (c.compensationType === "HOURLY_DUTY") parts.push(`₱${money(c.hourlyDutyRate)} for each clocked-in hour`);
  if (c.compensationType === "HYBRID")
    parts.push(`₱${money(c.baseSalaryMonthly)} a month plus ${c.commissionPercentagePerStudy > 0 ? `${c.commissionPercentagePerStudy}%` : "the package rate"} of each delivered study`);
  if (c.fixedPerStudyBonus > 0) parts.push(`plus ₱${money(c.fixedPerStudyBonus)} per study`);
  if (c.allowancesMonthly > 0) parts.push(`plus a ₱${money(c.allowancesMonthly)} monthly allowance`);
  return parts.join(", ") + ".";
}

/** Whether the signed-in person uses the time clock, and why not when they don't (plain words, shown to them). */
export interface TimeClockAccess {
  enabled: boolean;
  payModel: CompensationType | null;
  reason: string | null;
}

export const PayrollFrequencyEnum = z.enum([
  "SEMI_MONTHLY", // Twice Monthly / 15-Day Cut-Off
  "MONTHLY",      // Full Calendar Month
  "BI_WEEKLY",    // Every 14 Days
]);
export type PayrollFrequency = z.infer<typeof PayrollFrequencyEnum>;

export const CutOffCycleEnum = z.enum([
  "FIRST_HALF",   // Days 1 to 15 (First Half-Month Cycle)
  "SECOND_HALF",  // Days 16 to End of Month (Second Half-Month Cycle)
  "FULL_MONTH",   // Full Calendar Month
  "CUSTOM",       // Custom date range
]);
export type CutOffCycle = z.infer<typeof CutOffCycleEnum>;

export const CorporatePayrollScheduleConfigSchema = z.object({
  frequency: PayrollFrequencyEnum.default("SEMI_MONTHLY"),
  firstCutoffDay: z.number().min(1).max(31).default(15),
  secondCutoffDay: z.number().min(1).max(31).default(31),
  prorateMonthlyBase: z.boolean().default(true),
  disbursementGraceDays: z.number().min(0).max(15).default(3),
  notes: z.string().optional().default(""),
});

export type CorporatePayrollScheduleConfigDTO = z.infer<typeof CorporatePayrollScheduleConfigSchema> & {
  updatedAt?: string;
  updatedBy?: string | null;
};

export const RoleCompensationConfigSchema = z.object({
  roleName: z.enum(["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN"]),
  compensationType: CompensationTypeEnum,
  baseSalaryMonthly: z.number().min(0, "Base salary must be non-negative."),
  commissionPercentagePerStudy: z.number().min(0).max(100, "Percentage must be between 0 and 100."),
  hourlyDutyRate: z.number().min(0, "Hourly duty rate must be non-negative."),
  fixedPerStudyBonus: z.number().min(0, "Fixed study bonus must be non-negative."),
  allowancesMonthly: z.number().min(0, "Allowances must be non-negative."),
  isActive: z.boolean().default(true),
  notes: z.string().optional().default(""),
});

export type RoleCompensationConfigDTO = z.infer<typeof RoleCompensationConfigSchema> & {
  updatedAt?: string;
  updatedBy?: string | null;
};

export const StaffCompensationOverrideSchema = z.object({
  userId: z.string().min(1, "Staff member ID is required."),
  staffName: z.string().min(1),
  staffEmail: z.string().email(),
  roleName: z.enum(["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN"]),
  compensationType: CompensationTypeEnum,
  baseSalaryMonthly: z.number().min(0),
  commissionPercentagePerStudy: z.number().min(0).max(100),
  hourlyDutyRate: z.number().min(0),
  fixedPerStudyBonus: z.number().min(0),
  allowancesMonthly: z.number().min(0),
  notes: z.string().optional().default(""),
});

export type StaffCompensationOverrideDTO = z.infer<typeof StaffCompensationOverrideSchema> & {
  updatedAt?: string;
  updatedBy?: string | null;
};

export const PayslipStatusEnum = z.enum(["DRAFT", "APPROVED", "DISBURSED"]);
export type PayslipStatus = z.infer<typeof PayslipStatusEnum>;

export const DisbursementMethodEnum = z.enum(["GCASH", "MAYA", "BANK_TRANSFER", "CASH"]);
export type DisbursementMethod = z.infer<typeof DisbursementMethodEnum>;

export const PayoutChannelEnum = z.enum(["GCASH", "MAYA", "BANK_TRANSFER", "CASH"]);
export type PayoutChannel = z.infer<typeof PayoutChannelEnum>;

export const StaffPayoutDetailsSchema = z.object({
  userId: z.string().min(1, "Staff member ID is required."),
  payoutChannel: PayoutChannelEnum.default("GCASH"),
  accountNumber: z.string().trim().min(3, "Account or Mobile number is required.").max(60),
  accountName: z.string().trim().min(2, "Account holder name is required.").max(100),
  bankName: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  updatedAt: z.string().optional(),
});

export type StaffPayoutDetailsDTO = z.infer<typeof StaffPayoutDetailsSchema>;

export interface PayslipItemizedStudy {
  projectId: string;
  intakeId: string;
  researchTitle: string;
  grossAmount: number;
  commissionPercentage: number;
  commissionEarned: number;
  status: string;
}

export interface StaffPayslipDTO {
  id: string;
  payslipNumber: string;
  userId: string;
  staffName: string;
  staffEmail: string;
  staffRole: RoleName;
  payPeriodMonth: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  cutOffCycle?: CutOffCycle | null;
  compensationType: CompensationType;
  baseSalary: number;
  verifiedDutyHours: number;
  hourlyRate: number;
  hourlyDutyEarnings: number;
  completedStudiesCount: number;
  completedStudiesGrossValue: number;
  commissionPercentage: number;
  commissionEarnings: number;
  tierRates?: Record<string, number>;
  itemizedStudies: PayslipItemizedStudy[];
  overtimeHours: number;
  overtimeEarnings: number;
  allowances: number;
  grossEarnings: number;
  withholdingTax: number;
  otherDeductions: number;
  netPay: number;
  status: PayslipStatus;
  disbursementMethod?: DisbursementMethod | null;
  disbursementReference?: string | null;
  disbursedAt?: string | null;
  disbursedBy?: string | null;
  disbursedByName?: string | null;
  employerName?: string | null;
  approvedByName?: string | null;
  preparedByName?: string | null;
  payoutDetails?: StaffPayoutDetailsDTO | null;
  generatedBy: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const GeneratePayrollBatchSchema = z.object({
  payPeriodMonth: z.string().min(1, "Pay period month is required (e.g. August 2026)."),
  payPeriodStart: z.string().min(1, "Pay period start date is required."),
  payPeriodEnd: z.string().min(1, "Pay period end date is required."),
  cutOffCycle: CutOffCycleEnum.optional().default("FIRST_HALF"),
});

export type GeneratePayrollBatchInput = z.infer<typeof GeneratePayrollBatchSchema>;

export const DisbursePayslipSchema = z.object({
  payslipId: z.string().min(1, "Payslip ID is required."),
  disbursementMethod: DisbursementMethodEnum,
  disbursementReference: z
    .string()
    .trim()
    .min(3, "Transaction / disbursement reference number is required (min 3 characters).")
    .max(100),
  notes: z.string().optional(),
});

export type DisbursePayslipInput = z.infer<typeof DisbursePayslipSchema>;

export interface PayrollKpiSummary {
  totalInstitutionalPayroll: number;
  totalDisbursed: number;
  pendingDisbursementsCount: number;
  totalDutyHoursCompensated: number;
  totalStudiesRewarded: number;
  activeStaffCount: number;
}
