"use client";

import React from "react";
import Image from "next/image";
import {
  IconPrinter,
  IconShieldCheck,
  IconClock,
  IconSparkles,
} from "@tabler/icons-react";
import type { StaffPayslipDTO } from "../schemas";
import { numberToWordsPesos, normalizePersonName, formatSignatureName } from "@/lib/formatters";

/** Format raw SCREAMING_SNAKE_CASE enum values into Title Case labels. */
function formatEnumLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface OfficialPayslipDocumentProps {
  payslip: StaffPayslipDTO;
  className?: string;
  showPrintToolbar?: boolean;
  employerName?: string;
  preparedByName?: string;
  employerSignature?: string;
  preparerSignature?: string;
  employeeSignature?: string;
}

export function OfficialPayslipDocument({
  payslip,
  className = "",
  showPrintToolbar = true,
  employerName: propEmployerName,
  preparedByName: propPreparedByName,
  employerSignature: propEmployerSignature,
  preparerSignature: propPreparerSignature,
  employeeSignature: propEmployeeSignature,
}: OfficialPayslipDocumentProps) {
  const handlePrint = () => {
    window.print();
  };

  const cycleText =
    payslip.cutOffCycle === "FIRST_HALF"
      ? "First Half-Month Cycle (Days 1–15)"
      : payslip.cutOffCycle === "SECOND_HALF"
      ? "Second Half-Month Cycle (Days 16–End)"
      : "Full Calendar Month";

  const displayPeriod =
    payslip.payPeriodMonth.includes("Cycle") ||
    payslip.payPeriodMonth.includes("Days") ||
    payslip.payPeriodMonth.includes(cycleText)
      ? payslip.payPeriodMonth
      : `${payslip.payPeriodMonth} · ${cycleText}`;

  const isDisbursed = payslip.status === "DISBURSED";

  // 1. Dynamic Employer (CEO / Approver) resolution
  const employerName =
    propEmployerName?.trim() ||
    payslip.employerName?.trim() ||
    payslip.approvedByName?.trim() ||
    "CEO Owner";

  const employerSignature =
    propEmployerSignature?.trim() ||
    formatSignatureName(employerName);

  // 2. Dynamic Preparer (HR Administrator for Finance Officer; Finance Officer for all others)
  const isEmployeeFinanceOfficer =
    payslip.staffRole === "FINANCE_OFFICER" ||
    payslip.staffName.toLowerCase().includes("finance");

  const defaultPreparerName = isEmployeeFinanceOfficer ? "Operations Manager" : "Finance Officer";

  const preparedByName =
    propPreparedByName?.trim() ||
    payslip.preparedByName?.trim() ||
    (isEmployeeFinanceOfficer
      ? payslip.generatedBy &&
        payslip.generatedBy !== payslip.staffName &&
        payslip.generatedBy !== employerName &&
        !payslip.generatedBy.toLowerCase().includes("officer")
        ? payslip.generatedBy
        : defaultPreparerName
      : payslip.generatedBy && payslip.generatedBy !== employerName
      ? payslip.generatedBy
      : payslip.disbursedByName && payslip.disbursedByName !== employerName
      ? payslip.disbursedByName
      : defaultPreparerName);

  const preparerSignature =
    propPreparerSignature?.trim() ||
    formatSignatureName(preparedByName);

  const preparerTitle = isEmployeeFinanceOfficer
    ? "Operations Manager"
    : "Finance & Payroll Officer";

  // 3. Dynamic Employee (Recipient) resolution from KYC account name or staff profile
  const employeeName =
    payslip.payoutDetails?.accountName?.trim() ||
    payslip.staffName?.trim() ||
    "Staff Specialist";

  const employeeSignature =
    propEmployeeSignature?.trim() ||
    formatSignatureName(employeeName);

  return (
    <div className={`flex flex-col gap-6 w-full max-w-4xl mx-auto print:max-w-none print:w-full print:m-0 print:p-0 ${className}`}>
      {/* ── Document Actions Toolbar (Hidden in Print) ── */}
      {showPrintToolbar && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 print:hidden bg-[#01142B] border border-white/10 rounded-[4px] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
              Voucher Reference:
            </span>
            <code className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-[2px] border border-sky-500/30">
              {payslip.payslipNumber}
            </code>
            <span
              className={`text-[0.688rem] font-mono font-semibold px-2.5 py-1 rounded-[2px] border ${
                isDisbursed
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/30"
              }`}
            >
              {isDisbursed ? "● DISBURSED & SETTLED" : "○ PENDING DISBURSEMENT"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#CC6600] hover:bg-[#FFA040] text-white text-xs font-sans font-semibold rounded-[2px] flex items-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <IconPrinter size={15} stroke={2} />
              <span>Print Official Voucher / Save PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Official Printable Document Sheet ── */}
      <div className="official-payslip-sheet bg-white text-slate-900 border border-slate-300 rounded-[2px] p-3.5 sm:p-8 md:p-12 shadow-2xl relative font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:bg-white print:text-black print:min-w-0">
        
        {/* ── Corporate Letterhead & Institutional Header ── */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 sm:pb-5 sm:mb-6 print-avoid-break">
          <div className="flex flex-col sm:flex-row print:flex-row sm:items-start print:items-start justify-between gap-3 sm:gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <Image
                  src="/jaxislogo.png"
                  alt="JAXIS StatLab Logo"
                  width={40}
                  height={40}
                  className="h-8 w-8 sm:h-9 sm:w-9 object-contain shrink-0 select-none"
                  priority
                  unoptimized
                />
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base md:text-lg font-black tracking-wider text-slate-950 uppercase font-sans leading-tight">
                    JAXIS STATLAB PHILIPPINES
                  </h1>
                  <p className="text-[0.625rem] sm:text-[0.688rem] text-slate-600 font-sans tracking-wide">
                    Division of Quantitative Research, Statistical Modeling &amp; Psychometrics
                  </p>
                </div>
              </div>
              <p className="text-[0.562rem] sm:text-[0.625rem] text-slate-500 font-mono pt-0.5 break-words">
                SEC Reg: PH-2026-90812 · BIR TIN: 009-872-654-000 · Metro Manila, Philippines
              </p>
              <p className="text-[0.562rem] sm:text-[0.625rem] text-slate-500 font-mono break-words">
                Treasury Settlement Portal: finance@jaxisstatlab.com · https://jaxisstatlab.com
              </p>
            </div>

            <div className="text-left sm:text-right print:text-right font-sans text-xs space-y-0.5 bg-slate-50 p-2.5 sm:p-3 rounded-[2px] border border-slate-200 shrink-0">
              <span className="text-[0.562rem] sm:text-[0.625rem] font-mono uppercase tracking-wider text-slate-500 block">
                Official Statement Voucher
              </span>
              <p className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                {payslip.payslipNumber}
              </p>
              <p className="text-[0.625rem] sm:text-[0.688rem] text-slate-600 font-mono">
                Issued: {new Date(payslip.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-[0.625rem] sm:text-[0.688rem] font-mono font-semibold text-slate-700">
                Status: <span className={isDisbursed ? "text-emerald-700 font-bold" : "text-amber-700"}>{payslip.status}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Document Title Banner ── */}
        <div className="text-center py-2 sm:py-2.5 mb-4 sm:mb-6 bg-slate-100 border border-slate-300 rounded-[2px] px-2 print-avoid-break">
          <h2 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wider text-slate-900 font-sans">
            Official Statement of Duty Compensation &amp; Payslip
          </h2>
          <p className="text-[0.688rem] sm:text-xs font-sans text-slate-600 mt-0.5">
            Pay Period: <strong className="text-slate-900 font-mono">{displayPeriod}</strong>
          </p>
        </div>

        {/* ── Employee Particulars & Settlement Destination ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 print-avoid-break">
          {/* Employee Info Box */}
          <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-[2px] space-y-1.5 sm:space-y-2">
            <span className="text-[0.625rem] font-mono uppercase tracking-wider text-slate-500 font-bold block border-b border-slate-200 pb-1">
              Staff Specialist Particulars
            </span>
            <div className="grid grid-cols-3 gap-1 text-[0.688rem] sm:text-xs">
              <span className="text-slate-500">Employee Name:</span>
              <span className="col-span-2 font-bold text-slate-900">{payslip.staffName}</span>

              <span className="text-slate-500">Assigned Role:</span>
              <span className="col-span-2 font-sans font-semibold text-slate-800">{formatEnumLabel(payslip.staffRole)}</span>

              <span className="text-slate-500">Official Email:</span>
              <span className="col-span-2 font-mono text-slate-700 truncate">{payslip.staffEmail}</span>

              <span className="text-slate-500">Compensation:</span>
              <span className="col-span-2 font-sans font-semibold text-slate-800">{formatEnumLabel(payslip.compensationType)}</span>
            </div>
          </div>

          {/* Settlement Destination Box */}
          <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-[2px] space-y-1.5 sm:space-y-2">
            <span className="text-[0.625rem] font-mono uppercase tracking-wider text-slate-500 font-bold block border-b border-slate-200 pb-1">
              Payout &amp; Settlement Routing
            </span>
            <div className="grid grid-cols-3 gap-1 text-[0.688rem] sm:text-xs">
              <span className="text-slate-500">Payout Channel:</span>
              <span className="col-span-2 font-sans font-bold text-slate-900">
                {formatEnumLabel(payslip.payoutDetails?.payoutChannel || payslip.disbursementMethod || "TREASURY SETTLEMENT")}
              </span>

              <span className="text-slate-500">Account / Mobile:</span>
              <span className="col-span-2 font-mono font-bold text-slate-900">
                {payslip.payoutDetails?.accountNumber || "Corporate Cash Window"}
              </span>

              <span className="text-slate-500">KYC Recipient:</span>
              <span className="col-span-2 font-sans text-slate-800">
                {payslip.payoutDetails?.accountName || payslip.staffName}
              </span>

              {isDisbursed && (
                <>
                  <span className="text-slate-500">Treasury Ref:</span>
                  <span className="col-span-2 font-mono font-bold text-emerald-800">
                    {payslip.disbursementReference}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 1: Itemized Research Studies & Deliverables Commissions ── */}
        {payslip.itemizedStudies && payslip.itemizedStudies.length > 0 && (
          <div className="mb-4 sm:mb-6 space-y-2 print-avoid-break">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-300 pb-1 gap-1">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <IconSparkles size={14} className="text-amber-600 print:text-black shrink-0" />
                <span>1. Completed Research Studies &amp; Commission Deliverables</span>
              </h3>
              <span className="text-[0.625rem] sm:text-[0.688rem] font-mono text-slate-600">
                Commission Baseline: {payslip.compensationType === "TIER_DELIVERABLE" ? "Fixed Package Tier Rates" : `${payslip.commissionPercentage}% of contract`}
              </span>
            </div>

            <div className="overflow-x-auto w-full border border-slate-300 rounded-[2px]">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-mono text-[0.688rem] uppercase">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-300">Study Ref</th>
                    <th className="py-2 px-3 border-r border-slate-300">Research Project Title</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-right">Study Value</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Commission (₱)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {payslip.itemizedStudies.map((st) => (
                    <tr key={st.projectId}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">{st.intakeId}</td>
                      <td className="py-2 px-3 font-sans text-slate-800 border-r border-slate-200">{st.researchTitle}</td>
                      <td className="py-2 px-3 font-mono text-right text-slate-700 border-r border-slate-200 whitespace-nowrap">
                        <span className="font-sans font-normal inline-block mr-0.5">₱</span>{st.grossAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 font-mono text-right text-slate-600 border-r border-slate-200 whitespace-nowrap">{st.commissionPercentage}%</td>
                      <td className="py-2 px-3 font-mono text-right font-bold text-slate-900 whitespace-nowrap">
                        <span className="font-sans font-normal inline-block mr-0.5">₱</span>{st.commissionEarned.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-mono font-bold text-xs">
                  <tr>
                    <td colSpan={2} className="py-2 px-3 text-slate-700 border-r border-slate-300">
                      Total Delivered Studies Commission
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 border-r border-slate-300 whitespace-nowrap">
                      <span className="font-sans font-normal inline-block mr-0.5">₱</span>{payslip.completedStudiesGrossValue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300"></td>
                    <td className="py-2 px-3 text-right text-slate-950 font-extrabold whitespace-nowrap">
                      <span className="font-sans font-normal inline-block mr-0.5">₱</span>{payslip.commissionEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Section 2: Platform Duty Hours & Timeclock Log ── */}
        {(payslip.verifiedDutyHours > 0 || payslip.hourlyRate > 0) && (
          <div className="mb-4 sm:mb-6 space-y-2 print-avoid-break">
            <div className="flex items-center justify-between border-b border-slate-300 pb-1">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <IconClock size={14} className="text-sky-600 print:text-black shrink-0" />
                <span>2. Verified Platform Duty Hours &amp; Time Tracking</span>
              </h3>
              <span className="text-[0.625rem] sm:text-[0.688rem] font-mono text-slate-600">
                Audited Attendance Ledger
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 p-3 bg-slate-50 border border-slate-200 rounded-[2px] font-mono text-xs">
              <div>
                <span className="text-[0.625rem] text-slate-500 uppercase block">Net Verified Hours</span>
                <span className="text-sm font-bold text-slate-900">{payslip.verifiedDutyHours} hrs</span>
              </div>
              <div>
                <span className="text-[0.625rem] text-slate-500 uppercase block">Approved Hourly Wage</span>
                <span className="text-sm font-bold text-slate-900"><span className="font-sans font-normal inline-block mr-0.5">₱</span>{payslip.hourlyRate.toFixed(2)} / hr</span>
              </div>
              <div>
                <span className="text-[0.625rem] text-slate-500 uppercase block">Duty Attendance Subtotal</span>
                <span className="text-sm font-bold text-slate-950">
                  <span className="font-sans font-normal inline-block mr-0.5">₱</span>{payslip.hourlyDutyEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 3: Financial Statement & Net Take-Home Calculation ── */}
        <div className="mb-4 sm:mb-6 space-y-3 print-avoid-break">
          <div className="border-b border-slate-300 pb-1">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
              3. Consolidated Compensation Statement &amp; Net Take-Home
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3 sm:gap-4">
            {/* Earnings Breakdown Table */}
            <div className="border border-slate-300 rounded-[2px] overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 font-mono text-[0.688rem] font-bold text-slate-800 uppercase border-b border-slate-300">
                A. Duty Compensation &amp; Allowances
              </div>
              <div className="p-3 space-y-1.5 text-xs font-sans">
                {payslip.baseSalary > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">Monthly Base Salary / Retainer</span>
                    <span className="font-mono text-slate-900 font-semibold whitespace-nowrap"><span className="font-sans font-normal inline-block mr-0.5">₱</span>{payslip.baseSalary.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {payslip.commissionEarnings > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">Study Deliverables Commission ({payslip.completedStudiesCount} studies)</span>
                    <span className="font-mono text-slate-900 font-semibold whitespace-nowrap"><span className="font-sans font-normal inline-block mr-0.5">₱</span>{payslip.commissionEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {payslip.hourlyDutyEarnings > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">Duty Compute Hours ({payslip.verifiedDutyHours}h @ <span className="font-sans">₱</span>{payslip.hourlyRate}/h)</span>
                    <span className="font-mono text-slate-900 font-semibold whitespace-nowrap"><span className="font-sans font-normal inline-block mr-0.5">₱</span>{payslip.hourlyDutyEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {payslip.overtimeEarnings > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">Approved Overtime / Urgent SLA Premiums</span>
                    <span className="font-mono text-slate-900 font-semibold whitespace-nowrap"><span className="font-sans font-normal inline-block mr-0.5">₱</span>{payslip.overtimeEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {payslip.allowances > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">StatLab Compute &amp; Connectivity Allowance</span>
                    <span className="font-mono text-slate-900 font-semibold whitespace-nowrap"><span className="font-sans font-normal inline-block mr-0.5">₱</span>{payslip.allowances.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t-2 border-slate-300 font-bold text-slate-950">
                  <span>Gross Duty Earnings</span>
                  <span className="font-mono text-sm whitespace-nowrap"><span className="font-sans font-normal inline-block mr-0.5">₱</span>{payslip.grossEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Deductions Breakdown Table */}
            <div className="border border-slate-300 rounded-[2px] overflow-hidden flex flex-col">
              <div className="bg-slate-100 px-3 py-1.5 font-mono text-[0.688rem] font-bold text-slate-800 uppercase border-b border-slate-300">
                B. Statutory &amp; Institutional Deductions
              </div>
              <div className="p-3 space-y-1.5 text-xs font-sans flex-1 flex flex-col">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-700">Withholding Tax (BIR Scale)</span>
                  <span className="font-mono text-slate-900 whitespace-nowrap">
                    {payslip.withholdingTax > 0 ? (
                      <span>-<span className="font-sans font-normal opacity-85 inline-block mr-0.5">₱</span>{payslip.withholdingTax.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    ) : (
                      <span><span className="font-sans font-normal opacity-85 inline-block mr-0.5">₱</span>0.00 (Exempt)</span>
                    )}
                  </span>
                </div>
                {payslip.otherDeductions > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">Other Deductions / Cash Advances</span>
                    <span className="font-mono text-slate-900 whitespace-nowrap">-<span className="font-sans font-normal opacity-85 inline-block mr-0.5">₱</span>{payslip.otherDeductions.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t-2 border-slate-300 font-bold text-slate-950 mt-auto">
                  <span>Total Deductions</span>
                  <span className="font-mono text-sm whitespace-nowrap">
                    {payslip.withholdingTax + payslip.otherDeductions > 0 ? (
                      <span>-<span className="font-sans font-normal opacity-85 inline-block mr-0.5">₱</span>{(payslip.withholdingTax + payslip.otherDeductions).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    ) : (
                      <span><span className="font-sans font-normal opacity-85 inline-block mr-0.5">₱</span>0.00</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Take-Home Highlight Box — Full Width */}
          <div className="p-3.5 sm:p-5 bg-emerald-50 border-2 border-emerald-600 rounded-[2px] print-avoid-break">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-sans font-bold uppercase tracking-wider text-emerald-950">
                Net Take-Home Pay (Disbursement)
              </span>
              <span className="text-xl sm:text-2xl md:text-3xl font-mono font-black text-emerald-950 whitespace-nowrap">
                <span className="font-sans font-normal opacity-85 inline-block mr-0.5">₱</span>{payslip.netPay.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[0.625rem] sm:text-[0.688rem] text-emerald-800 font-sans italic mt-1 leading-tight">
              Amount in Words: {numberToWordsPesos(payslip.netPay)}
            </p>
          </div>
        </div>

        {/* ── Section 4: Treasury Clearance & Security Stamp (if Disbursed) ── */}
        {isDisbursed && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-3.5 bg-slate-50 border border-slate-300 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono text-slate-800 print-avoid-break">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-[2px] bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <IconShieldCheck size={18} stroke={2} />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-950 block text-[0.688rem] sm:text-xs">TREASURY DISBURSEMENT AUDITED &amp; CLEARED</span>
                <span className="text-[0.625rem] sm:text-[0.688rem] text-slate-600 block truncate">
                  Ref No: <strong className="text-slate-900">{payslip.disbursementReference}</strong> ({formatEnumLabel(payslip.disbursementMethod || payslip.payoutDetails?.payoutChannel || "")}
                  {payslip.payoutDetails?.accountNumber ? ` · ${payslip.payoutDetails.accountNumber}` : ""})
                </span>
              </div>
            </div>
            <div className="text-left sm:text-right text-[0.625rem] sm:text-[0.688rem] text-slate-600 shrink-0">
              <span>Authorized by: <strong>{payslip.disbursedByName || employerName}</strong></span>
              <span className="block">{payslip.disbursedAt ? new Date(payslip.disbursedAt).toLocaleString("en-PH") : ""}</span>
            </div>
          </div>
        )}

        {/* ── Section 5: Tripartite Formal Signatures & Certification ── */}
        <div className="pt-6 sm:pt-10 mt-6 sm:mt-8 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center text-xs print-avoid-break">
          {/* Prepared By */}
          <div className="flex flex-col items-center">
            <div className="h-10 sm:h-14 w-full flex items-end justify-center overflow-visible pb-1">
              <p className="font-signature text-3xl sm:text-4xl text-[#0c2340] print:text-black leading-none select-none tracking-normal transform -rotate-2 scale-105 pointer-events-none whitespace-nowrap">
                {preparerSignature}
              </p>
            </div>
            <div className="w-full border-t border-slate-900 pt-2">
              <p className="font-sans font-bold text-xs text-slate-900">
                {normalizePersonName(preparedByName)}
              </p>
              <p className="text-[0.625rem] text-slate-600 font-sans font-medium mt-0.5">
                {preparerTitle}
              </p>
              <p className="text-[0.562rem] text-slate-500 uppercase tracking-wider font-sans mt-0.5">
                Prepared &amp; Computed By
              </p>
            </div>
          </div>

          {/* Approved By (Employer) */}
          <div className="flex flex-col items-center">
            <div className="h-10 sm:h-14 w-full flex items-end justify-center overflow-visible pb-1">
              <p className="font-signature text-3xl sm:text-4xl text-[#0c2340] print:text-black leading-none select-none tracking-normal transform -rotate-1 scale-105 pointer-events-none whitespace-nowrap">
                {employerSignature}
              </p>
            </div>
            <div className="w-full border-t border-slate-900 pt-2">
              <p className="font-sans font-bold text-xs text-slate-900">
                {normalizePersonName(employerName)}
              </p>
              <p className="text-[0.625rem] text-slate-600 font-sans font-medium mt-0.5">
                CEO / Executive Director
              </p>
              <p className="text-[0.562rem] text-slate-500 uppercase tracking-wider font-sans mt-0.5">
                Reviewed &amp; Approved By (Employer)
              </p>
            </div>
          </div>

          {/* Acknowledged By (Employee) */}
          <div className="flex flex-col items-center">
            <div className="h-10 sm:h-14 w-full flex items-end justify-center overflow-visible pb-1">
              <p className="font-signature text-3xl sm:text-4xl text-[#0c2340] print:text-black leading-none select-none tracking-normal transform -rotate-2 scale-105 pointer-events-none whitespace-nowrap">
                {employeeSignature}
              </p>
            </div>
            <div className="w-full border-t border-slate-900 pt-2">
              <p className="font-sans font-bold text-xs text-slate-900">
                {normalizePersonName(employeeName)}
              </p>
              <p className="text-[0.625rem] text-slate-600 font-sans font-medium mt-0.5">
                {formatEnumLabel(payslip.staffRole)}
              </p>
              <p className="text-[0.562rem] text-slate-500 uppercase tracking-wider font-sans mt-0.5">
                Received &amp; Acknowledged By (Employee)
              </p>
            </div>
          </div>
        </div>

        {/* ── Document Footer ── */}
        <div className="mt-6 sm:mt-8 pt-3 border-t border-slate-300 flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between text-[0.563rem] font-mono text-slate-400 print-avoid-break">
          <span>
            JAXIS STATLAB · ELECTRONIC DOCUMENT VALID WITHOUT DRY SEAL
          </span>
          <span className="mt-1 sm:mt-0 print:mt-0">
            DOC ID: {payslip.id.slice(0, 16).toUpperCase()} · PAGE 1 OF 1
          </span>
        </div>
      </div>
    </div>
  );
}
