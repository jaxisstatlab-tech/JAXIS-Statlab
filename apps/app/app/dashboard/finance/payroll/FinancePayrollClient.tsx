"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  KpiCard,
  Badge,
  Button,
  LoadingState,
  PageHeader,
  Toast,
  Pagination,
  Peso,
} from "@repo/ui";
import Link from "next/link";
import {
  IconReceipt,
  IconLoader2,
  IconShieldCheck,
  IconSearch,
  IconPrinter,
  IconEye,
  IconChevronDown,
} from "@tabler/icons-react";
import {
  getCompanyPayslips,
  generateBatchPayslips,
  approvePayslip,
  getPayrollConfigurations,
} from "@/features/payroll/actions";
import type {
  StaffPayslipDTO,
  PayrollKpiSummary,
  RoleCompensationConfigDTO,
  CorporatePayrollScheduleConfigDTO,
  CutOffCycle,
} from "@/features/payroll/schemas";
import { PayslipStatementModal } from "@/features/payroll/components/PayslipStatementModal";
import { DisbursePayslipModal } from "@/features/payroll/components/DisbursePayslipModal";

export interface FinancePayrollClientProps {
  initialPayslipData?: {
    payslips: StaffPayslipDTO[];
    kpis: PayrollKpiSummary;
    availablePeriods: string[];
  };
  initialConfigData?: {
    roleConfigs: RoleCompensationConfigDTO[];
    scheduleConfig: CorporatePayrollScheduleConfigDTO | null;
  };
}

export function FinancePayrollClient({
  initialPayslipData,
  initialConfigData,
}: FinancePayrollClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [payslips, setPayslips] = useState<StaffPayslipDTO[]>(initialPayslipData?.payslips || []);
  const [roleConfigs, setRoleConfigs] = useState<RoleCompensationConfigDTO[]>(
    initialConfigData?.roleConfigs || []
  );
  const [scheduleConfig, setScheduleConfig] = useState<CorporatePayrollScheduleConfigDTO | null>(
    initialConfigData?.scheduleConfig || null
  );
  const [selectedBatchCycle, setSelectedBatchCycle] = useState<CutOffCycle>("FIRST_HALF");
  const [availablePeriods, setAvailablePeriods] = useState<string[]>(
    initialPayslipData?.availablePeriods || []
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [kpis, setKpis] = useState<PayrollKpiSummary>(
    initialPayslipData?.kpis || {
      totalInstitutionalPayroll: 0,
      totalDisbursed: 0,
      pendingDisbursementsCount: 0,
      totalDutyHoursCompensated: 0,
      totalStudiesRewarded: 0,
      activeStaffCount: 0,
    }
  );

  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [selectedPayslipForStatement, setSelectedPayslipForStatement] = useState<StaffPayslipDTO | null>(null);
  const [selectedPayslipForDisburse, setSelectedPayslipForDisburse] = useState<StaffPayslipDTO | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    description?: string;
    variant: "success" | "warning" | "danger" | "info";
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [payslipRes, configRes] = await Promise.all([
        getCompanyPayslips({
          period: selectedPeriod,
          status: filterStatus,
        }),
        getPayrollConfigurations(),
      ]);
      setPayslips(payslipRes.payslips);
      setKpis(payslipRes.kpis);
      setAvailablePeriods(payslipRes.availablePeriods);
      setRoleConfigs(configRes.roleConfigs);
      setScheduleConfig(configRes.scheduleConfig);
    } catch (err) {
      console.error("Failed to load Finance payroll data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, filterStatus]);

  useEffect(() => {
    if (!initialPayslipData && !initialConfigData) {
      loadData();
    }
  }, [loadData, initialPayslipData, initialConfigData]);

  const handleGenerateBatch = async (cycle: CutOffCycle = selectedBatchCycle) => {
    setIsGeneratingBatch(true);
    try {
      const currentMonthStr = new Date().toLocaleDateString("en-PH", { month: "long", year: "numeric" });
      const now = new Date();

      let startStr: string;
      let endStr: string;
      let cycleTitle: string;

      if (cycle === "FIRST_HALF") {
        startStr = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString();
        endStr = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59).toISOString();
        cycleTitle = "First Half-Month Cycle (Days 1–15)";
      } else if (cycle === "SECOND_HALF") {
        startStr = new Date(now.getFullYear(), now.getMonth(), 16, 0, 0, 0).toISOString();
        endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        cycleTitle = "Second Half-Month Cycle (Days 16–End)";
      } else {
        startStr = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString();
        endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        cycleTitle = "Full Calendar Month Cycle";
      }

      const res = await generateBatchPayslips({
        payPeriodMonth: currentMonthStr,
        payPeriodStart: startStr,
        payPeriodEnd: endStr,
        cutOffCycle: cycle,
      });

      if (res.success) {
        setToast({
          variant: "success",
          message: "Payroll Calculation Completed",
          description: `Generated payslips for ${res.count} staff members for ${cycleTitle} (${currentMonthStr}).`,
        });
        await loadData();
      } else {
        setToast({
          variant: "danger",
          message: "Payroll Run Failed",
          description: res.error?.message,
        });
      }
    } catch {
      setToast({
        variant: "danger",
        message: "Error",
        description: "Failed to generate batch payroll.",
      });
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleApprove = async (payslipId: string) => {
    try {
      const res = await approvePayslip(payslipId);
      if (res.success) {
        setToast({
          variant: "success",
          message: "Payslip Approved",
          description: "Ready for treasury disbursement via GCash or Bank Transfer.",
        });
        await loadData();
      }
    } catch {
      setToast({
        variant: "danger",
        message: "Error",
        description: "Failed to approve payslip.",
      });
    }
  };

  const filteredPayslips = payslips.filter(
    (p) =>
      p.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.staffRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.payslipNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedPayslips = filteredPayslips.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (isLoading && payslips.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading Finance Payroll Desk..."
          description="Retrieving staff duty hours, study commission shares, and disbursement queues"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {/* Toast Alert Portal */}
      {toast && (
        <Toast
          message={toast.message}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      {/* Standardized PageHeader */}
      <PageHeader
        title="Staff Payroll &amp; Payslips"
        description="Generate staff payroll, verify hours worked and completed studies, and record payments via GCash or bank transfer."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Finance & HR", href: "/dashboard/finance" },
          { label: "Staff Payroll & Payslips" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={selectedBatchCycle}
                onChange={(e) => setSelectedBatchCycle(e.target.value as CutOffCycle)}
                className="bg-[#010D1F] border border-white/10 rounded-[2px] pl-3 pr-9 py-1.5 text-xs text-white font-mono outline-none focus:border-[#CC6600] cursor-pointer appearance-none hover:border-white/25 transition-colors"
              >
                <option value="FIRST_HALF">First Half (Days 1–15)</option>
                <option value="SECOND_HALF">Second Half (Days 16–End)</option>
                <option value="FULL_MONTH">Full Month</option>
              </select>
              <IconChevronDown
                size={14}
                stroke={2}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleGenerateBatch(selectedBatchCycle)}
              disabled={isGeneratingBatch}
              className="gap-2 font-sans font-semibold cursor-pointer rounded-[2px]"
            >
              {isGeneratingBatch ? (
                <IconLoader2 size={16} stroke={2.5} className="animate-spin text-white/90" />
              ) : (
                <IconReceipt size={16} stroke={1.5} />
              )}
              <span>Generate Payslips</span>
            </Button>
          </div>
        }
      />

      {/* Active Pay Policy Banner */}
      <div className="p-3.5 sm:p-4 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="p-2 bg-[#CC6600]/15 border border-[#CC6600]/40 rounded-[2px] text-[#FFA040] shrink-0 mt-0.5">
            <IconShieldCheck size={18} stroke={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="font-bold text-white text-xs sm:text-sm">
                Active Pay Rates &amp; Schedule
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                <Badge variant="emerald" className="text-[0.625rem] font-mono shrink-0">
                  Active Formula
                </Badge>
                {scheduleConfig && (
                  <Badge variant="amber" className="text-[0.625rem] font-mono truncate max-w-full">
                    {scheduleConfig.frequency === "SEMI_MONTHLY" ? (
                      <>
                        <span className="hidden sm:inline">Schedule: </span>Semi-Monthly (Twice a month)
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Schedule: </span>Monthly (Once a month)
                      </>
                    )}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-[0.688rem] sm:text-xs text-white/60 font-sans mt-1.5 leading-relaxed">
              Pay calculations follow the rates set by the CEO.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto shrink-0 text-xs font-mono">
          {roleConfigs.map((rc) => (
            <span
              key={rc.roleName}
              className="px-2.5 py-1.5 bg-[#010D1F] border border-white/10 rounded-[2px] text-white/80 text-[0.688rem] flex items-center justify-between sm:justify-start gap-2"
            >
              <strong className="text-white font-sans">{rc.roleName.replace(/_/g, " ")}:</strong>{" "}
              <span className="inline-flex items-baseline font-mono text-white/90">
                {rc.compensationType === "TIER_DELIVERABLE" ? (
                  "Tier Deliverable Fee"
                ) : rc.compensationType === "PERCENTAGE_PER_STUDY" ? (
                  `${rc.commissionPercentagePerStudy}% / study`
                ) : rc.compensationType === "FIXED_SALARY" ? (
                  <>
                    <Peso className="text-[0.625rem] mr-0.5" />
                    {rc.baseSalaryMonthly.toLocaleString()} Base
                  </>
                ) : rc.compensationType === "HYBRID" ? (
                  <>
                    <Peso className="text-[0.625rem] mr-0.5" />
                    {rc.baseSalaryMonthly.toLocaleString()} + {rc.commissionPercentagePerStudy}%
                  </>
                ) : (
                  <>
                    <Peso className="text-[0.625rem] mr-0.5" />
                    {rc.hourlyDutyRate}/h
                  </>
                )}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          label="Total Payroll"
          value={<><Peso />{kpis.totalInstitutionalPayroll.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</>}
          description={`${kpis.activeStaffCount} active staff`}
        />

        <KpiCard
          label="Total Paid Out"
          value={<><Peso />{kpis.totalDisbursed.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</>}
          description={kpis.pendingDisbursementsCount === 0 ? "All paid" : `${kpis.pendingDisbursementsCount} pending`}
        />

        <KpiCard
          label="Hours Worked"
          value={kpis.totalDutyHoursCompensated}
          unit="hrs total"
          description="Verified attendance hours"
        />

        <KpiCard
          label="Studies Completed"
          value={kpis.totalStudiesRewarded}
          unit="completed"
          description="Paid commissions this cycle"
        />
      </div>

      {/* Main Payslips Ledger Card */}
      <Card className="p-3.5 sm:p-4 lg:p-5 bg-[#01142B] border-white/10 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-bold text-white font-sans">
              Staff Payslips
            </h2>
            <p className="text-xs text-white/50 font-sans mt-0.5">
              Review earnings, view itemized statements, and mark payments as sent.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            {availablePeriods.length > 0 && (
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-[#010D1F] border border-white/10 rounded-[2px] pl-3 pr-9 py-2 text-xs text-white font-mono outline-none focus:border-[#CC6600] cursor-pointer appearance-none hover:border-white/25 transition-colors"
                >
                  <option value="ALL">All Pay Periods</option>
                  {availablePeriods.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <IconChevronDown
                  size={14}
                  stroke={2}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"
                />
              </div>
            )}

            <div className="relative w-full sm:w-60">
              <IconSearch size={15} stroke={1.5} className="absolute left-3 top-2.5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff or ID..."
                className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[#CC6600] font-sans"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-[#010D1F] p-1 border border-white/10 rounded-[2px]">
              {["ALL", "DRAFT", "APPROVED", "DISBURSED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 text-[0.688rem] font-mono rounded-[2px] cursor-pointer transition-colors ${
                    filterStatus === st
                      ? "bg-[#CC6600] text-white font-bold"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {st === "DISBURSED" ? "PAID" : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredPayslips.length === 0 ? (
          <div className="py-12 text-center text-xs text-white/40 italic font-sans">
            No payslips found for the selected filter. Click &ldquo;Generate Payslips&rdquo; to calculate.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[2px] border border-white/10 bg-[#010D1F]/60 shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#010D1F] border-b border-white/10 text-white/50 font-mono uppercase text-[0.625rem] sm:text-[0.688rem] tracking-wider">
                  <th className="py-2.5 px-1.5 whitespace-nowrap">Payslip No.</th>
                  <th className="py-2.5 px-2 min-w-[110px]">Staff</th>
                  <th className="py-2.5 px-1.5">Role</th>
                  <th className="py-2.5 px-1.5">Pay Period</th>
                  <th className="py-2.5 px-1 whitespace-nowrap text-right">Hours</th>
                  <th className="py-2.5 px-1 whitespace-nowrap text-center">Studies</th>
                  <th className="py-2.5 px-1.5 whitespace-nowrap text-right">Gross Pay</th>
                  <th className="py-2.5 px-1.5 whitespace-nowrap text-right text-white/50">Net Pay</th>
                  <th className="py-2.5 px-1 whitespace-nowrap text-center">Status</th>
                  <th className="py-2.5 px-1.5 whitespace-nowrap text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {paginatedPayslips.map((ps) => {
                  const parts = ps.payPeriodMonth.split("(");
                  const mainMonth = parts[0]?.trim() || ps.payPeriodMonth;
                  let cycleSub = "";
                  if (parts.length > 1) {
                    const rawCycle = parts[1]?.replace(")", "").trim();
                    if (rawCycle?.includes("First Half") || rawCycle?.includes("Days 1-15") || rawCycle?.includes("Days 1–15")) {
                      cycleSub = "1st Half (1–15)";
                    } else if (rawCycle?.includes("Second Half") || rawCycle?.includes("Days 16")) {
                      cycleSub = "2nd Half (16–End)";
                    } else {
                      cycleSub = rawCycle || "";
                    }
                  } else if (ps.cutOffCycle === "FIRST_HALF") {
                    cycleSub = "1st Half (1–15)";
                  } else if (ps.cutOffCycle === "SECOND_HALF") {
                    cycleSub = "2nd Half (16–End)";
                  } else if (ps.cutOffCycle === "FULL_MONTH") {
                    cycleSub = "Full Month";
                  }

                  const roleLabel =
                    ps.staffRole === "STATISTICIAN"
                      ? "Statistician"
                      : ps.staffRole === "SENIOR_QA_LEAD"
                      ? "Senior QA Lead"
                      : ps.staffRole === "FINANCE_OFFICER"
                      ? "Finance Officer"
                      : ps.staffRole === "ADMIN"
                      ? "Operations Manager"
                      : ps.staffRole === "CEO"
                      ? "Executive Director"
                      : ps.staffRole;

                  return (
                    <tr key={ps.id} className="hover:bg-white/[0.04] transition-colors group">
                      {/* Statement Number */}
                      <td className="py-2 px-1.5 font-mono font-semibold text-[0.688rem] tracking-tight text-[#FFA040] whitespace-nowrap">
                        {ps.payslipNumber}
                      </td>

                      {/* Specialist Details */}
                      <td className="py-2 px-2">
                        <span className="font-semibold text-white font-sans text-xs block leading-tight truncate max-w-[150px]" title={ps.staffName}>
                          {ps.staffName}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-[0.625rem] font-mono text-white/40 truncate max-w-[130px]" title={ps.staffEmail}>
                            {ps.staffEmail}
                          </span>
                          {ps.payoutDetails && (
                            <span
                              className="text-[0.562rem] font-mono px-1 py-0.2 rounded-[2px] bg-white/[0.06] text-white/80 border border-white/10 inline-flex items-center gap-1 shrink-0"
                              title={`${ps.payoutDetails.payoutChannel}: ${ps.payoutDetails.accountNumber} (${ps.payoutDetails.accountName})`}
                            >
                              <span className="w-1 h-1 rounded-full bg-[#FFA040]" />
                              {ps.payoutDetails.payoutChannel.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-2 px-1.5">
                        <span className="text-xs text-white/70 font-sans block leading-tight max-w-[95px]">
                          {roleLabel}
                        </span>
                      </td>

                      {/* Pay Period & Cut-Off */}
                      <td className="py-2 px-1.5 whitespace-nowrap">
                        <span className="font-semibold text-white font-sans text-xs block leading-tight">
                          {mainMonth}
                        </span>
                        {cycleSub && (
                          <span className="text-[0.625rem] font-mono tracking-tight text-sky-400/80 block mt-0.5">
                            {cycleSub}
                          </span>
                        )}
                      </td>

                      {/* Duty Hours */}
                      <td className="py-2 px-1 font-mono text-right text-white/90 whitespace-nowrap text-xs tabular-nums">
                        {ps.verifiedDutyHours > 0 ? `${ps.verifiedDutyHours}h` : "—"}
                      </td>

                      {/* Studies */}
                      <td className="py-2 px-1 text-center whitespace-nowrap font-mono">
                        {ps.completedStudiesCount > 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[0.688rem] font-semibold">
                            {ps.completedStudiesCount} {ps.completedStudiesCount === 1 ? "study" : "studies"}
                          </span>
                        ) : (
                          <span className="text-white/30 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Gross Pay */}
                      <td className="py-2 px-1.5 font-mono text-right text-white/70 text-xs whitespace-nowrap tabular-nums">
                        <span className="inline-flex items-baseline"><Peso />{ps.grossEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </td>

                      {/* Net Pay */}
                      <td className="py-2 px-1.5 font-mono text-right whitespace-nowrap tabular-nums">
                        <span className="inline-flex items-baseline font-mono font-bold text-xs text-white">
                          <Peso className="text-white/70 text-xs" />{ps.netPay.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-1 text-center whitespace-nowrap">
                        {ps.status === "DISBURSED" && (
                          <div className="inline-flex flex-col items-center">
                            <Badge variant="emerald" className="text-[0.562rem] font-mono uppercase tracking-wider py-0.5 px-1.5">
                              Paid
                            </Badge>
                            {ps.disbursementMethod && (
                              <span className="text-[0.562rem] font-mono text-white/40 block mt-0.5 max-w-[65px] truncate" title={ps.disbursementMethod}>
                                {ps.disbursementMethod.replace("Institutional Transfer", "Transfer").replace("Corporate Bank Wire", "Bank Wire")}
                              </span>
                            )}
                          </div>
                        )}
                        {ps.status === "APPROVED" && (
                          <Badge variant="sky" className="text-[0.562rem] font-mono uppercase tracking-wider py-0.5 px-1.5">
                            Approved
                          </Badge>
                        )}
                        {ps.status === "DRAFT" && (
                          <Badge variant="amber" className="text-[0.562rem] font-mono uppercase tracking-wider py-0.5 px-1.5">
                            Draft
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-1.5 text-right whitespace-nowrap pr-2">
                        <div className="flex items-center justify-end gap-1">
                          {ps.status === "DRAFT" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(ps.id)}
                              className="h-6 text-[0.688rem] font-sans px-1.5 text-sky-400 border-sky-500/30 hover:bg-sky-500/10 cursor-pointer rounded-[2px]"
                            >
                              Approve
                            </Button>
                          )}
                          {ps.status === "APPROVED" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setSelectedPayslipForDisburse(ps)}
                              className="h-6 text-[0.688rem] font-sans font-semibold px-1.5 bg-[#CC6600] hover:bg-[#E67300] text-white cursor-pointer rounded-[2px]"
                            >
                              Send Pay →
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedPayslipForStatement(ps)}
                            className="h-6 w-6 flex items-center justify-center text-white/70 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 rounded-[2px] transition-colors cursor-pointer shrink-0"
                            title="View Itemized Statement"
                          >
                            <IconEye size={13} stroke={2} />
                          </button>
                          <Link
                            href={`/dashboard/finance/payroll/payslips/${ps.id}/print`}
                            target="_blank"
                            className="h-6 w-6 flex items-center justify-center text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-[2px] hover:bg-white/[0.06] transition-colors shrink-0"
                            title="Print Payslip Voucher"
                          >
                            <IconPrinter size={13} stroke={2} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredPayslips.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredPayslips.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="payslips"
          />
        )}
      </Card>

      {/* Modals */}
      {selectedPayslipForStatement && (
        <PayslipStatementModal
          payslip={selectedPayslipForStatement}
          open={!!selectedPayslipForStatement}
          onClose={() => setSelectedPayslipForStatement(null)}
        />
      )}

      {selectedPayslipForDisburse && (
        <DisbursePayslipModal
          payslip={selectedPayslipForDisburse}
          open={!!selectedPayslipForDisburse}
          onClose={() => setSelectedPayslipForDisburse(null)}
          onSuccess={async () => {
            setToast({
              variant: "success",
              message: "Payment Recorded",
              description: `Payment marked as sent for ${selectedPayslipForDisburse.staffName}.`,
            });
            await loadData();
          }}
        />
      )}
    </div>
  );
}
