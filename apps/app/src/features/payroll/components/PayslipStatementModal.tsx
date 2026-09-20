"use client";

import React, { useState } from "react";
import { Modal, Button, Badge, KpiCard, Peso } from "@repo/ui";
import {
  IconPrinter,
  IconFileCertificate,
  IconLayoutGrid,
  IconExternalLink,
  IconCopy,
  IconCheck,
  IconBuildingBank,
  IconDeviceMobile,
  IconShieldCheck,
  IconSparkles,
  IconClock,
} from "@tabler/icons-react";
import type { StaffPayslipDTO } from "../schemas";
import { OfficialPayslipDocument } from "./OfficialPayslipDocument";
import { formatSettlementAccountNumber } from "@/lib/formatters";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Format raw SCREAMING_SNAKE_CASE enum values into Title Case labels. */
function formatEnumLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PayslipStatementModalProps {
  payslip: StaffPayslipDTO | null;
  open: boolean;
  onClose: () => void;
}

export function PayslipStatementModal({
  payslip,
  open,
  onClose,
}: PayslipStatementModalProps) {
  const pathname = usePathname();
  const [viewMode, setViewMode] = useState<"document" | "interactive">("document");
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  if (!payslip) return null;

  const printUrl = pathname?.includes("/dashboard/finance")
    ? `/dashboard/finance/payroll/payslips/${payslip.id}/print`
    : `/dashboard/staff/hr/payslips/${payslip.id}/print`;

  const handlePrint = () => {
    if (viewMode !== "document") {
      setViewMode("document");
      setTimeout(() => {
        window.print();
      }, 150);
    } else {
      window.print();
    }
  };

  const handleCopyRef = () => {
    if (!payslip.disbursementReference) return;
    navigator.clipboard.writeText(payslip.disbursementReference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleCopyAccount = () => {
    if (!payslip.payoutDetails?.accountNumber) return;
    navigator.clipboard.writeText(payslip.payoutDetails.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const isDisbursed = payslip.status === "DISBURSED";
  const totalDeductions = payslip.withholdingTax + payslip.otherDeductions;
  const payout = payslip.payoutDetails;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Official Statement Voucher — ${payslip.payslipNumber}`}
      description={`Staff: ${payslip.staffName} (${payslip.staffRole}) · Period: ${payslip.payPeriodMonth}`}
      size="2xl"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full print:hidden">
          <div className="flex items-center justify-between sm:justify-start gap-2 text-xs font-mono text-white/50">
            <span>Security ID: {payslip.id.slice(0, 12).toUpperCase()}</span>
            <span>•</span>
            <span className={isDisbursed ? "text-emerald-400 font-bold" : "text-amber-400"}>
              {isDisbursed ? "Disbursed & Settled" : "Draft / Pending"}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <Link
                href={printUrl}
                target="_blank"
                className="text-xs font-sans text-white/70 hover:text-white flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-[2px] border border-white/10 hover:bg-white/[0.06] transition-colors w-full sm:w-auto"
              >
                <IconExternalLink size={14} stroke={1.5} />
                <span>Fullscreen Desk</span>
              </Link>

              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="text-xs w-full sm:w-auto py-2 sm:py-1.5 cursor-pointer"
              >
                Close
              </Button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 font-sans cursor-pointer text-xs font-semibold w-full sm:w-auto py-2 sm:py-1.5 justify-center"
            >
              <IconPrinter size={15} stroke={2} />
              <span className="hidden sm:inline">Print Official Voucher / PDF</span>
              <span className="sm:hidden">Print Voucher / PDF</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 sm:gap-5">
        {/* View Mode Segmented Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10 print:hidden">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1 bg-[#010D1F] border border-white/10 rounded-[2px] w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode("document")}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[2px] text-xs font-sans font-medium transition-colors cursor-pointer text-center ${
                viewMode === "document"
                  ? "bg-[#CC6600] text-white shadow-sm font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <IconFileCertificate size={14} stroke={2} className="shrink-0" />
              <span className="hidden sm:inline">Official Document Sheet (Print-Ready)</span>
              <span className="sm:hidden">Document</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("interactive")}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[2px] text-xs font-sans font-medium transition-colors cursor-pointer text-center ${
                viewMode === "interactive"
                  ? "bg-[#CC6600] text-white shadow-sm font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <IconLayoutGrid size={14} stroke={2} className="shrink-0" />
              <span className="hidden sm:inline">Detailed Breakdown</span>
              <span className="sm:hidden">Breakdown</span>
            </button>
          </div>

          <span className="text-[0.688rem] font-mono text-white/40 hidden sm:inline-block">
            {viewMode === "document"
              ? "Formatted for print / PDF output"
              : "Itemized pay breakdown"}
          </span>
        </div>

        {/* ── Document View Mode (Zero nested scroll; single unified modal body scroll) ── */}
        {viewMode === "document" ? (
          <div className="overflow-x-auto w-full p-1 sm:p-4 bg-slate-900/40 border border-white/10 rounded-[2px] print:p-0 print:m-0 print:bg-transparent print:border-none">
            <div className="min-w-[480px] sm:min-w-0 print:min-w-0">
              <OfficialPayslipDocument payslip={payslip} showPrintToolbar={false} />
            </div>
          </div>
        ) : (
          /* ── Interactive Breakdown Mode (Zero nested scroll) ── */
          <div className="flex flex-col gap-6 text-white font-sans animate-content-fade">
            {/* KPI Quad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Net Pay"
                value={
                  <span className="inline-flex items-baseline">
                    <Peso />
                    {payslip.netPay.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                }
                variant="emerald"
                badge={isDisbursed ? "Paid" : "Pending"}
                badgeColor={isDisbursed ? "emerald" : "amber"}
                description="Final pay amount"
              />

              <KpiCard
                label="Gross Earnings"
                value={
                  <span className="inline-flex items-baseline">
                    <Peso />
                    {payslip.grossEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                }
                variant="default"
                description="Base salary, commissions & hours"
              />

              <KpiCard
                label="Total Deductions"
                value={
                  <span className="inline-flex items-baseline">
                    {totalDeductions > 0 ? "-" : ""}
                    <Peso />
                    {totalDeductions.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                }
                variant="default"
                description="Taxes & other deductions"
              />

              <KpiCard
                label="Completed Studies"
                value={payslip.completedStudiesCount}
                unit="studies"
                variant="sky"
                description={
                  payslip.commissionEarnings > 0
                    ? `₱${payslip.commissionEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })} commission earned`
                    : "No study commissions this cycle"
                }
              />
            </div>

            {/* Payout Details Card */}
            <div className="p-5 rounded-[2px] bg-[#01142B] border border-white/10 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  {payout?.payoutChannel === "BANK_TRANSFER" ? (
                    <IconBuildingBank size={16} stroke={1.5} className="text-[#FFA040]" />
                  ) : (
                    <IconDeviceMobile size={16} stroke={1.5} className="text-[#FFA040]" />
                  )}
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/90">
                    Payment &amp; Bank Details
                  </span>
                </div>
                <Badge
                  variant={isDisbursed ? "emerald" : "amber"}
                  className="text-[0.688rem] font-mono self-start sm:self-auto"
                >
                  {isDisbursed ? "Settlement Cleared" : "Pending Disbursement"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-white/50 font-mono text-[0.688rem] uppercase block">Payout Channel</span>
                  <span className="font-semibold text-white mt-0.5 block">
                    {formatEnumLabel(payout?.payoutChannel || payslip.disbursementMethod || "TREASURY SETTLEMENT")}
                  </span>
                  {payout?.bankName && (
                    <span className="text-[0.625rem] font-mono text-sky-400 block mt-0.5">
                      {payout.bankName}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-white/50 font-mono text-[0.688rem] uppercase block">Routing / Mobile</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-white">
                      {payout?.accountNumber
                        ? formatSettlementAccountNumber(payout.payoutChannel, payout.accountNumber)
                        : "Corporate Cash Window"}
                    </span>
                    {payout?.accountNumber && (
                      <button
                        type="button"
                        onClick={handleCopyAccount}
                        className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
                        title="Copy account number"
                      >
                        {copiedAccount ? (
                          <IconCheck size={13} stroke={2.5} className="text-emerald-400" />
                        ) : (
                          <IconCopy size={13} stroke={1.5} />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-white/50 font-mono text-[0.688rem] uppercase block">KYC Recipient</span>
                  <span className="font-semibold text-white mt-0.5 block">
                    {payout?.accountName || payslip.staffName}
                  </span>
                </div>

                <div>
                  <span className="text-white/50 font-mono text-[0.688rem] uppercase block">Treasury Reference</span>
                  {payslip.disbursementReference ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-emerald-400">
                        {payslip.disbursementReference}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyRef}
                        className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
                        title="Copy treasury reference"
                      >
                        {copiedRef ? (
                          <IconCheck size={13} stroke={2.5} className="text-emerald-400" />
                        ) : (
                          <IconCopy size={13} stroke={1.5} />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-white/40 font-mono italic mt-0.5 block">Awaiting Release</span>
                  )}
                </div>
              </div>
            </div>

            {/* Itemized Studies Commission Table (if applicable) */}
            {payslip.itemizedStudies && payslip.itemizedStudies.length > 0 && (
              <div className="p-5 rounded-[2px] bg-[#01142B] border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <IconSparkles size={16} stroke={1.5} className="text-[#FFA040]" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/90">
                      Completed Research Studies Commission
                    </span>
                  </div>
                  <span className="text-xs font-mono text-white/50">
                    Baseline: {(payslip.compensationType as string) === "TIER_DELIVERABLE" ? "Tier Deliverable Rates" : `${payslip.commissionPercentage}% of SOW`}
                  </span>
                </div>

                <div className="overflow-x-auto border border-white/10 rounded-[2px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#010D1F] border-b border-white/10 text-white/60 font-mono text-[0.688rem] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Study Ref</th>
                        <th className="py-2.5 px-3">Project Title</th>
                        <th className="py-2.5 px-3 text-right">Study Value</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-3 text-right">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {payslip.itemizedStudies.map((st) => (
                        <tr key={st.projectId} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#FFA040]">{st.intakeId}</td>
                          <td className="py-2.5 px-3 text-white/80">{st.researchTitle}</td>
                          <td className="py-2.5 px-3 font-mono text-right text-white/70">
                            <span className="inline-flex items-baseline"><Peso />{st.grossAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-right text-white/60">{st.commissionPercentage}%</td>
                          <td className="py-2.5 px-3 font-mono text-right font-bold text-emerald-400">
                            <span className="inline-flex items-baseline"><Peso />{st.commissionEarned.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#010D1F] border-t border-white/10 font-mono font-bold text-xs">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-white/70">Total Delivered Studies Commission</td>
                        <td className="py-2.5 px-3 text-right text-white/70">
                          <span className="inline-flex items-baseline"><Peso />{payslip.completedStudiesGrossValue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="py-2.5 px-3"></td>
                        <td className="py-2.5 px-3 text-right text-emerald-400">
                          <span className="inline-flex items-baseline"><Peso />{payslip.commissionEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Platform Duty Hours & Timeclock Log (if applicable) */}
            {(payslip.verifiedDutyHours > 0 || payslip.hourlyRate > 0) && (
              <div className="p-5 rounded-[2px] bg-[#01142B] border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <IconClock size={16} stroke={1.5} className="text-sky-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/90">
                      Platform Duty Hours &amp; Timeclock Attendance
                    </span>
                  </div>
                  <span className="text-xs font-mono text-white/50">
                    Audited Platform Ledger
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#010D1F] border border-white/10 rounded-[2px] font-mono text-xs">
                  <div>
                    <span className="text-[0.625rem] text-white/50 uppercase block">Verified Duty Hours</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{payslip.verifiedDutyHours} hrs</span>
                  </div>
                  <div>
                    <span className="text-[0.625rem] text-white/50 uppercase block">Approved Hourly Wage</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      <span className="inline-flex items-baseline"><Peso />{payslip.hourlyRate.toFixed(2)} / hr</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[0.625rem] text-white/50 uppercase block">Attendance Duty Subtotal</span>
                    <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                      <span className="inline-flex items-baseline"><Peso />{payslip.hourlyDutyEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Consolidated Earnings & Deductions Ledger Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Earnings Table */}
              <div className="p-5 rounded-[2px] bg-[#01142B] border border-white/10 space-y-3 flex flex-col">
                <div className="border-b border-white/10 pb-2 font-mono text-xs font-bold uppercase tracking-wider text-white/90">
                  Duty Compensation &amp; Allowances
                </div>
                <div className="space-y-2 text-xs flex-1">
                  {payslip.baseSalary > 0 && (
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-white/70">Monthly Base Salary</span>
                      <span className="font-mono text-white font-semibold">
                        <span className="inline-flex items-baseline"><Peso />{payslip.baseSalary.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </span>
                    </div>
                  )}
                  {payslip.commissionEarnings > 0 && (
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-white/70">Deliverables Commission ({payslip.completedStudiesCount} studies)</span>
                      <span className="font-mono text-white font-semibold">
                        <span className="inline-flex items-baseline"><Peso />{payslip.commissionEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </span>
                    </div>
                  )}
                  {payslip.hourlyDutyEarnings > 0 && (
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-white/70">Duty Compute Hours ({payslip.verifiedDutyHours}h)</span>
                      <span className="font-mono text-white font-semibold">
                        <span className="inline-flex items-baseline"><Peso />{payslip.hourlyDutyEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </span>
                    </div>
                  )}
                  {payslip.overtimeEarnings > 0 && (
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-white/70">Approved Overtime Premiums</span>
                      <span className="font-mono text-white font-semibold">
                        <span className="inline-flex items-baseline"><Peso />{payslip.overtimeEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </span>
                    </div>
                  )}
                  {payslip.allowances > 0 && (
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-white/70">Connectivity &amp; Compute Allowance</span>
                      <span className="font-mono text-white font-semibold">
                        <span className="inline-flex items-baseline"><Peso />{payslip.allowances.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-white/10 font-bold text-white text-xs">
                  <span>Gross Duty Earnings</span>
                  <span className="font-mono text-sm text-[#FFA040]">
                    <span className="inline-flex items-baseline"><Peso />{payslip.grossEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </span>
                </div>
              </div>

              {/* Deductions Table */}
              <div className="p-5 rounded-[2px] bg-[#01142B] border border-white/10 space-y-3 flex flex-col">
                <div className="border-b border-white/10 pb-2 font-mono text-xs font-bold uppercase tracking-wider text-white/90">
                  Statutory &amp; Institutional Deductions
                </div>
                <div className="space-y-2 text-xs flex-1">
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-white/70">Withholding Tax (BIR Scale)</span>
                    <span className="font-mono text-white">
                      {payslip.withholdingTax > 0 ? (
                        <span className="inline-flex items-baseline text-red-400">
                          -<Peso />{payslip.withholdingTax.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-white/50">₱0.00 (Exempt)</span>
                      )}
                    </span>
                  </div>
                  {payslip.otherDeductions > 0 && (
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-white/70">Other Deductions / Cash Advances</span>
                      <span className="font-mono text-red-400">
                        <span className="inline-flex items-baseline">
                          -<Peso />{payslip.otherDeductions.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-white/10 font-bold text-white text-xs">
                  <span>Total Deductions</span>
                  <span className="font-mono text-sm text-red-400">
                    {totalDeductions > 0 ? (
                      <span className="inline-flex items-baseline">
                        -<Peso />{totalDeductions.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      "₱0.00"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Treasury Stamp Audit Callout (if Disbursed) */}
            {isDisbursed && (
              <div className="p-4 bg-[#01142B] border border-emerald-500/30 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-[2px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                    <IconShieldCheck size={20} stroke={2} />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-400 block font-sans">
                      Treasury Audit &amp; Settlement Verified
                    </span>
                    <span className="text-[0.688rem] text-white/60">
                      Ref: <strong className="text-white font-mono">{payslip.disbursementReference}</strong> · Authorized by {payslip.disbursedByName || "Finance Officer"}
                    </span>
                  </div>
                </div>
                {payslip.disbursedAt && (
                  <span className="text-[0.688rem] text-white/40 font-mono sm:text-right">
                    Settled: {new Date(payslip.disbursedAt).toLocaleString("en-PH")}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
