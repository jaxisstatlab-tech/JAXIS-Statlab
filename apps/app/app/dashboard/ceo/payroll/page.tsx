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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Peso,
} from "@repo/ui";
import {
  IconSettings,
  IconReceipt,
  IconClock,
  IconBuildingBank,
  IconCheck,
  IconLoader2,
  IconShieldLock,
  IconUsers,
  IconSparkles,
  IconCoins,
  IconAdjustments,
  IconCalendarTime,
  IconArrowRight,
} from "@tabler/icons-react";
import {
  getPayrollConfigurations,
  saveRoleCompensationConfig,
  saveCompanyPayrollSchedule,
  getCompanyPayslips,
  generateBatchPayslips,
  approvePayslip,
  type InternalStaffMember,
} from "@/features/payroll/actions";
import type {
  RoleCompensationConfigDTO,
  StaffPayslipDTO,
  PayrollKpiSummary,
  CompensationType,
  CorporatePayrollScheduleConfigDTO,
  CutOffCycle,
} from "@/features/payroll/schemas";
import { PayslipStatementModal } from "@/features/payroll/components/PayslipStatementModal";
import { SpecialistOverrideModal } from "@/features/payroll/components/SpecialistOverrideModal";

const ROLE_DISPLAY_NAMES: Record<string, { title: string; subtitle: string }> = {
  STATISTICIAN: {
    title: "Lead Research Statistician",
    subtitle: "Data analysis, statistical modeling, and research deliverables.",
  },
  SENIOR_QA_LEAD: {
    title: "Senior QA Reviewer",
    subtitle: "Quality checks, script reviews, data accuracy, and formatting compliance.",
  },
  FINANCE_OFFICER: {
    title: "Finance & HR Officer",
    subtitle: "Payment processing, fund releases, and leave management.",
  },
  ADMIN: {
    title: "Operations & Study Admin",
    subtitle: "Client handling, quotations, timeline tracking, and platform coordination.",
  },
};

function generateRoleNotes(config: {
  compensationType: CompensationType;
  baseSalaryMonthly: number;
  commissionPercentagePerStudy: number;
  hourlyDutyRate: number;
  fixedPerStudyBonus: number;
  allowancesMonthly: number;
}): string {
  const parts: string[] = [];
  if (config.compensationType === "PERCENTAGE_PER_STUDY") {
    parts.push(`${config.commissionPercentagePerStudy}% commission per completed research study`);
    if (config.fixedPerStudyBonus > 0) {
      parts.push(`+ ₱${config.fixedPerStudyBonus.toLocaleString()} deliverable bonus`);
    }
  } else if (config.compensationType === "FIXED_SALARY") {
    parts.push(`Fixed base salary of ₱${config.baseSalaryMonthly.toLocaleString()}/month (₱${(config.baseSalaryMonthly / 2).toLocaleString()} per 15-day cut-off)`);
  } else if (config.compensationType === "HOURLY_DUTY") {
    parts.push(`₱${config.hourlyDutyRate.toLocaleString()}/hr based on verified clock-in duty`);
  } else if (config.compensationType === "HYBRID") {
    parts.push(`₱${config.baseSalaryMonthly.toLocaleString()}/month base + ${config.commissionPercentagePerStudy}% commission per completed study`);
    if (config.hourlyDutyRate > 0) {
      parts.push(`+ ₱${config.hourlyDutyRate.toLocaleString()}/hr duty rate`);
    }
  }

  if (config.allowancesMonthly > 0) {
    parts.push(`+ ₱${config.allowancesMonthly.toLocaleString()} monthly allowance`);
  }

  return parts.join(" ") + ".";
}

export default function CeoPayrollPolicyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ROLES" | "STAFF" | "PAYSLIPS">("ROLES");
  const [roleConfigs, setRoleConfigs] = useState<RoleCompensationConfigDTO[]>([]);
  const [staffMembers, setStaffMembers] = useState<InternalStaffMember[]>([]);
  const [payslips, setPayslips] = useState<StaffPayslipDTO[]>([]);
  const [payrollKpis, setPayrollKpis] = useState<PayrollKpiSummary>({
    totalInstitutionalPayroll: 0,
    totalDisbursed: 0,
    pendingDisbursementsCount: 0,
    totalDutyHoursCompensated: 0,
    totalStudiesRewarded: 0,
    activeStaffCount: 0,
  });

  // Selected for modals
  const [selectedStaffForOverride, setSelectedStaffForOverride] = useState<InternalStaffMember | null>(null);
  const [selectedPayslipForView, setSelectedPayslipForView] = useState<StaffPayslipDTO | null>(null);

  // Corporate schedule config state
  const [scheduleConfig, setScheduleConfig] = useState<CorporatePayrollScheduleConfigDTO | null>(null);
  const [scheduleForm, setScheduleForm] = useState<CorporatePayrollScheduleConfigDTO | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [selectedBatchCycle, setSelectedBatchCycle] = useState<CutOffCycle>("FIRST_HALF");

  const hasUnsavedScheduleChanges = Boolean(
    scheduleConfig &&
    scheduleForm &&
    (scheduleConfig.frequency !== scheduleForm.frequency ||
      scheduleConfig.firstCutoffDay !== scheduleForm.firstCutoffDay ||
      scheduleConfig.disbursementGraceDays !== scheduleForm.disbursementGraceDays ||
      scheduleConfig.prorateMonthlyBase !== scheduleForm.prorateMonthlyBase)
  );

  // Editing state for roles
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<RoleCompensationConfigDTO | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    description?: string;
    variant: "success" | "warning" | "danger" | "info";
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [configData, payslipData] = await Promise.all([
        getPayrollConfigurations(),
        getCompanyPayslips(),
      ]);
      setRoleConfigs(configData.roleConfigs);
      setStaffMembers(configData.staffMembers);
      setScheduleConfig(configData.scheduleConfig);
      setScheduleForm({ ...configData.scheduleConfig });
      setPayslips(payslipData.payslips);
      setPayrollKpis(payslipData.kpis);
    } catch (err) {
      console.error("Failed to load CEO payroll configurations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartEditRole = (role: RoleCompensationConfigDTO) => {
    setEditingRole(role.roleName);
    setFormConfig({ ...role });
  };

  const handleSelectRoleModel = (modelId: CompensationType) => {
    setFormConfig((prev) => {
      if (!prev) return null;
      const next = { ...prev, compensationType: modelId };
      if (modelId === "PERCENTAGE_PER_STUDY") {
        next.baseSalaryMonthly = 0;
        next.hourlyDutyRate = 0;
        if (!next.commissionPercentagePerStudy) next.commissionPercentagePerStudy = 50;
      } else if (modelId === "FIXED_SALARY") {
        next.commissionPercentagePerStudy = 0;
        next.hourlyDutyRate = 0;
        next.fixedPerStudyBonus = 0;
        if (!next.baseSalaryMonthly) next.baseSalaryMonthly = 35000;
      } else if (modelId === "HOURLY_DUTY") {
        next.baseSalaryMonthly = 0;
        next.commissionPercentagePerStudy = 0;
        next.fixedPerStudyBonus = 0;
        if (!next.hourlyDutyRate) next.hourlyDutyRate = 450;
      } else if (modelId === "HYBRID") {
        next.hourlyDutyRate = 0;
        next.fixedPerStudyBonus = 0;
        if (!next.baseSalaryMonthly) next.baseSalaryMonthly = 12000;
        if (!next.commissionPercentagePerStudy) next.commissionPercentagePerStudy = 10;
      }
      next.notes = generateRoleNotes(next);
      return next;
    });
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm) return;
    setIsSavingSchedule(true);
    try {
      const res = await saveCompanyPayrollSchedule(scheduleForm);
      if (res.success && res.config) {
        setScheduleConfig(res.config);
        setToast({
          variant: "success",
          message: "Corporate Payroll Schedule Updated",
          description: `Settlement cadence configured to ${
            res.config.frequency === "SEMI_MONTHLY"
              ? "Semi-Monthly (Twice a month)"
              : "Monthly (Once a month)"
          }.`,
        });
        await loadData();
      } else {
        setToast({
          variant: "danger",
          message: "Schedule Update Failed",
          description: res.error?.message,
        });
      }
    } catch {
      setToast({
        variant: "danger",
        message: "Error",
        description: "Failed to save corporate schedule policy.",
      });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConfig) return;

    setIsSavingRole(true);
    const updatedNotes = generateRoleNotes(formConfig);
    const payload = { ...formConfig, notes: updatedNotes };

    try {
      const res = await saveRoleCompensationConfig(payload);
      if (res.success) {
        const savedData = res.data || payload;
        // Optimistic 0ms local state update
        setRoleConfigs((prev) =>
          prev.map((r) => (r.roleName === payload.roleName ? savedData : r))
        );
        setToast({
          variant: "success",
          message: "Role Compensation Policy Updated",
          description: `New compensation formula and rates applied to all ${formConfig.roleName} team members.`,
        });
        setEditingRole(null);
        await loadData();
      } else {
        setToast({
          variant: "danger",
          message: "Policy Update Failed",
          description: res.error?.message || "Failed to update compensation policy.",
        });
      }
    } catch {
      setToast({
        variant: "danger",
        message: "Network Error",
        description: "Unable to reach server to save compensation parameters.",
      });
    } finally {
      setIsSavingRole(false);
    }
  };

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
        cycleTitle = "1st Half (Days 1–15)";
      } else if (cycle === "SECOND_HALF") {
        startStr = new Date(now.getFullYear(), now.getMonth(), 16, 0, 0, 0).toISOString();
        endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        cycleTitle = "2nd Half (Days 16–End)";
      } else {
        startStr = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString();
        endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        cycleTitle = "Full Month";
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
          message: "Payslips Generated",
          description: `Created payslips for ${res.count} staff members for ${cycleTitle} (${currentMonthStr}).`,
        });
        await loadData();
      } else {
        setToast({
          variant: "danger",
          message: "Payroll Generation Failed",
          description: res.error?.message,
        });
      }
    } catch {
      setToast({
        variant: "danger",
        message: "Error",
        description: "Failed to generate batch payslips.",
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
          description: "Payslip approved and ready for payment.",
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

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState
          variant="page"
          label="Loading payroll settings..."
          description="Getting pay rates and staff details"
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

      {/* Page Header */}
      <PageHeader
        title="Payroll & Pay Rates"
        description="Set how each role gets paid — fixed salary, per-study commission, hourly rate, or a mix. Customize individual staff terms and generate payslips."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "CEO Console", href: "/dashboard/ceo" },
          { label: "Payroll Settings" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="amber" className="text-xs font-mono flex items-center gap-1">
              <IconShieldLock size={13} stroke={2} />
              <span>CEO Access</span>
            </Badge>

            <select
              value={selectedBatchCycle}
              onChange={(e) => setSelectedBatchCycle(e.target.value as CutOffCycle)}
              className="bg-[#010D1F] border border-white/10 rounded-[2px] px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-[#CC6600]"
            >
              <option value="FIRST_HALF">First Half (Days 1–15)</option>
              <option value="SECOND_HALF">Second Half (Days 16–End)</option>
              <option value="FULL_MONTH">Full Calendar Month</option>
            </select>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleGenerateBatch(selectedBatchCycle)}
              disabled={isGeneratingBatch}
              className="gap-1.5 font-sans font-semibold cursor-pointer rounded-[2px]"
            >
              {isGeneratingBatch ? (
                <IconLoader2 size={15} stroke={2.5} className="animate-spin text-white/90" />
              ) : (
                <IconReceipt size={15} stroke={2} />
              )}
              <span>Generate Payslips</span>
            </Button>
          </div>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Payroll"
          value={`₱${payrollKpis.totalInstitutionalPayroll.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
          variant="default"
          icon={<IconCoins size={16} stroke={1.5} />}
          description={`${payrollKpis.activeStaffCount} active staff members`}
        />

        <KpiCard
          label="Total Paid Out"
          value={`₱${payrollKpis.totalDisbursed.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
          variant="sky"
          icon={<IconBuildingBank size={16} stroke={1.5} />}
          description={payrollKpis.pendingDisbursementsCount === 0 ? "All paid" : `${payrollKpis.pendingDisbursementsCount} pending`}
        />

        <KpiCard
          label="Hours Worked"
          value={payrollKpis.totalDutyHoursCompensated}
          unit="hrs total"
          icon={<IconClock size={16} stroke={1.5} />}
          description="Verified attendance hours"
        />

        <KpiCard
          label="Studies Completed"
          value={payrollKpis.totalStudiesRewarded}
          unit="completed"
          variant="amber"
          icon={<IconSparkles size={16} stroke={1.5} />}
          description="Paid commissions this cycle"
        />
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "ROLES" | "STAFF" | "PAYSLIPS")}
        className="w-full"
      >
        <TabsList className="bg-[#01142B] border border-white/10 p-1 rounded-[2px] w-fit flex flex-wrap gap-1">
          <TabsTrigger
            value="ROLES"
            className="flex items-center gap-2 px-4 py-2 text-xs font-sans font-semibold rounded-[2px] transition-colors data-[state=active]:bg-[#CC6600] data-[state=active]:text-white text-white/70 hover:text-white cursor-pointer"
          >
            <IconSettings size={15} stroke={2} />
            <span>Pay Rates</span>
          </TabsTrigger>
          <TabsTrigger
            value="STAFF"
            className="flex items-center gap-2 px-4 py-2 text-xs font-sans font-semibold rounded-[2px] transition-colors data-[state=active]:bg-[#CC6600] data-[state=active]:text-white text-white/70 hover:text-white cursor-pointer"
          >
            <IconUsers size={15} stroke={2} />
            <span>Staff Overrides ({staffMembers.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="PAYSLIPS"
            className="flex items-center gap-2 px-4 py-2 text-xs font-sans font-semibold rounded-[2px] transition-colors data-[state=active]:bg-[#CC6600] data-[state=active]:text-white text-white/70 hover:text-white cursor-pointer"
          >
            <IconReceipt size={15} stroke={2} />
            <span>Payslips ({payslips.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: ROLE COMPENSATION POLICIES ── */}
        <TabsContent value="ROLES" className="mt-6 flex flex-col gap-6">
          {/* Corporate Settlement Schedule Card */}
          {scheduleForm && (
            <Card className="p-6 sm:p-7 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 bg-amber-950/50 border border-amber-500/30 text-amber-400 rounded-[2px] shrink-0 mt-0.5 sm:mt-0">
                    <IconCalendarTime size={20} stroke={1.5} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white font-sans">
                        Pay Schedule
                      </h3>
                      {hasUnsavedScheduleChanges ? (
                        <Badge variant="amber" className="text-[0.625rem] font-mono">
                          Unsaved Changes
                        </Badge>
                      ) : (
                        <Badge variant="emerald" className="text-[0.625rem] font-mono">
                          Active: {scheduleConfig?.frequency === "SEMI_MONTHLY"
                            ? "Semi-Monthly (Twice a month)"
                            : "Monthly (Once a month)"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-white/50 font-sans mt-0.5 leading-relaxed">
                      Choose how often staff get paid and when payments go out.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveSchedule}
                    disabled={isSavingSchedule || !hasUnsavedScheduleChanges}
                    className={`gap-1.5 font-sans font-semibold cursor-pointer rounded-[2px] transition-all ${
                      hasUnsavedScheduleChanges
                        ? "shadow-md ring-2 ring-[#CC6600]/40"
                        : "opacity-80"
                    }`}
                  >
                    {isSavingSchedule ? (
                      <IconLoader2 size={15} stroke={2.5} className="animate-spin text-white/90" />
                    ) : (
                      <IconCheck size={15} stroke={2} />
                    )}
                    <span>{hasUnsavedScheduleChanges ? "Save Schedule" : "Saved"}</span>
                  </Button>
                </div>
              </div>

              {/* 1. Interactive Cadence Selector Cards */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-mono text-white/70 font-semibold tracking-wide uppercase">
                  1. How Often to Pay
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Card 1: Semi-Monthly */}
                  <button
                    type="button"
                    onClick={() =>
                      setScheduleForm((prev) =>
                        prev ? { ...prev, frequency: "SEMI_MONTHLY" } : prev
                      )
                    }
                    className={`text-left p-4 rounded-[2px] border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      scheduleForm.frequency === "SEMI_MONTHLY"
                        ? "bg-[#CC6600]/10 border-[#CC6600] ring-1 ring-[#CC6600]/50 shadow-sm"
                        : "bg-[#010D1F] border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[0.688rem] font-mono font-semibold text-[#FFA040] uppercase tracking-wider block">
                          Most Common
                        </span>
                        <h4 className="text-sm font-bold text-white font-sans mt-0.5">
                          Semi-Monthly
                        </h4>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          scheduleForm.frequency === "SEMI_MONTHLY"
                            ? "bg-[#CC6600] text-white"
                            : "border border-white/25"
                        }`}
                      >
                        {scheduleForm.frequency === "SEMI_MONTHLY" && (
                          <IconCheck size={12} stroke={3} />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-white/70 font-sans leading-relaxed">
                      Pay twice a month. First half covers Days 1–15, second half covers Days 16 to end of month.
                    </p>
                    <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[0.688rem] font-mono text-white/50">
                      <span>24 Runs / Year</span>
                      <span>15-Day Cycles</span>
                    </div>
                  </button>

                  {/* Card 2: Monthly */}
                  <button
                    type="button"
                    onClick={() =>
                      setScheduleForm((prev) =>
                        prev ? { ...prev, frequency: "MONTHLY" } : prev
                      )
                    }
                    className={`text-left p-4 rounded-[2px] border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      scheduleForm.frequency === "MONTHLY"
                        ? "bg-[#CC6600]/10 border-[#CC6600] ring-1 ring-[#CC6600]/50 shadow-sm"
                        : "bg-[#010D1F] border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[0.688rem] font-mono font-semibold text-emerald-400 uppercase tracking-wider block">
                          Single Payout
                        </span>
                        <h4 className="text-sm font-bold text-white font-sans mt-0.5">
                          Monthly
                        </h4>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          scheduleForm.frequency === "MONTHLY"
                            ? "bg-[#CC6600] text-white"
                            : "border border-white/25"
                        }`}
                      >
                        {scheduleForm.frequency === "MONTHLY" && (
                          <IconCheck size={12} stroke={3} />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-white/70 font-sans leading-relaxed">
                      One payday per month. Full salary paid at once at the end of the month.
                    </p>
                    <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[0.688rem] font-mono text-white/50">
                      <span>12 Runs / Year</span>
                      <span>Full Month</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Visual Schedule & Contextual Parameters */}
              <div className="flex flex-col gap-3 pt-2">
                <span className="text-xs font-mono text-white/70 font-semibold tracking-wide uppercase">
                  2. Pay Timeline
                </span>

                {/* Timeline Strip */}
                {scheduleForm.frequency === "SEMI_MONTHLY" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#010D1F] p-3.5 rounded-[2px] border border-white/10">
                    {/* Cycle 1 */}
                    <div className="p-3 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-[#FFA040] font-semibold">
                          Cut-Off 1 (First Half)
                        </span>
                        <Badge variant="amber" className="text-[0.625rem] font-mono">
                          Cycle 1
                        </Badge>
                      </div>
                      <div className="text-sm font-bold text-white font-sans flex items-center gap-2">
                        <span>Day 1</span>
                        <IconArrowRight size={14} className="text-white/40" />
                        <span>Day {scheduleForm.firstCutoffDay}</span>
                      </div>
                      <p className="text-xs text-white/60 font-sans">
                        Payday: <span className="text-white font-mono font-semibold">Day {scheduleForm.firstCutoffDay + scheduleForm.disbursementGraceDays} of the month</span>
                      </p>
                    </div>

                    {/* Cycle 2 */}
                    <div className="p-3 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-emerald-400 font-semibold">
                          Cut-Off 2 (Second Half)
                        </span>
                        <Badge variant="emerald" className="text-[0.625rem] font-mono">
                          Cycle 2
                        </Badge>
                      </div>
                      <div className="text-sm font-bold text-white font-sans flex items-center gap-2">
                        <span>Day {scheduleForm.firstCutoffDay + 1}</span>
                        <IconArrowRight size={14} className="text-white/40" />
                        <span>Month-End (30th/31st)</span>
                      </div>
                      <p className="text-xs text-white/60 font-sans">
                        Payday: <span className="text-white font-mono font-semibold">Day {scheduleForm.disbursementGraceDays} of next month</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#010D1F] p-3.5 rounded-[2px] border border-white/10">
                    <div className="p-3.5 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-emerald-400 font-semibold">
                            Full Month
                          </span>
                          <Badge variant="emerald" className="text-[0.625rem] font-mono">
                            Once a Month
                          </Badge>
                        </div>
                        <div className="text-sm font-bold text-white font-sans flex items-center gap-2 mt-1">
                          <span>Day 1</span>
                          <IconArrowRight size={14} className="text-white/40" />
                          <span>Last Day of Month (28th–31st)</span>
                        </div>
                      </div>
                      <div className="text-xs text-white/60 font-sans sm:text-right">
                        Target Disbursement:{" "}
                        <span className="text-white font-mono font-semibold block sm:inline">
                           Within {scheduleForm.disbursementGraceDays} days after cycle ends
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Granular Parameter Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                  {/* First Cut-Off Day (Only relevant for Semi-Monthly) */}
                  {scheduleForm.frequency === "SEMI_MONTHLY" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono text-white/70 font-semibold flex items-center justify-between">
                        <span>1st Cut-Off Day</span>
                        <span className="text-[0.625rem] text-white/40 font-mono">Range: 10th–20th</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={10}
                          max={20}
                          value={scheduleForm.firstCutoffDay}
                          onChange={(e) =>
                            setScheduleForm((prev) =>
                              prev ? { ...prev, firstCutoffDay: Number(e.target.value) } : prev
                            )
                          }
                          className="w-full bg-[#010D1F] border border-white/15 rounded-[2px] py-2.5 pl-3 pr-28 text-xs text-white font-mono outline-none focus:border-[#CC6600] transition-colors"
                        />
                        <span className="absolute right-3 text-xs font-mono text-white/40 pointer-events-none select-none">
                          th of month
                        </span>
                      </div>
                      <span className="text-[0.688rem] text-white/45 font-sans">
                        Day of the month when the first pay period ends (usually the 15th).
                      </span>
                    </div>
                  )}

                  {/* Disbursement Grace Window */}
                  <div className={`flex flex-col gap-1.5 ${scheduleForm.frequency !== "SEMI_MONTHLY" ? "sm:col-span-2" : ""}`}>
                    <label className="text-xs font-mono text-white/70 font-semibold flex items-center justify-between">
                      <span>Processing Days</span>
                      <span className="text-[0.625rem] text-white/40 font-mono">Range: 0–10 days</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={scheduleForm.disbursementGraceDays}
                        onChange={(e) =>
                          setScheduleForm((prev) =>
                            prev ? { ...prev, disbursementGraceDays: Number(e.target.value) } : prev
                          )
                        }
                        className="w-full bg-[#010D1F] border border-white/15 rounded-[2px] py-2.5 pl-3 pr-32 text-xs text-white font-mono outline-none focus:border-[#CC6600] transition-colors"
                      />
                      <span className="absolute right-3 text-xs font-mono text-white/40 pointer-events-none select-none">
                        business days
                      </span>
                    </div>
                    <span className="text-[0.688rem] text-white/45 font-sans">
                      Extra days for Finance to process and verify payments after each pay period.
                    </span>
                  </div>
                </div>

                {/* Proration Switch (Semi-Monthly only) */}
                {scheduleForm.frequency === "SEMI_MONTHLY" && (
                  <div
                    onClick={() =>
                      setScheduleForm((prev) =>
                        prev ? { ...prev, prorateMonthlyBase: !prev.prorateMonthlyBase } : prev
                      )
                    }
                    className="p-3.5 bg-[#010D1F] border border-white/10 hover:border-white/20 rounded-[2px] flex items-center justify-between gap-4 cursor-pointer transition-colors mt-1 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
                          scheduleForm.prorateMonthlyBase ? "bg-[#CC6600]" : "bg-white/20"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            scheduleForm.prorateMonthlyBase ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white font-sans block">
                          Split Monthly Salary in Half (50% each payday)
                        </span>
                        <span className="text-[0.688rem] text-white/50 font-sans">
                          {scheduleForm.prorateMonthlyBase
                            ? "On: A ₱25,000 monthly salary pays ₱12,500 each half."
                            : "Off: Full monthly salary is paid on each half-month payday."}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={scheduleForm.prorateMonthlyBase ? "emerald" : "outline"}
                      className="text-[0.625rem] font-mono shrink-0"
                    >
                      {scheduleForm.prorateMonthlyBase ? "SPLIT 50/50" : "FULL AMOUNT"}
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          )}

          <div className="p-4 bg-sky-950/40 border border-sky-500/30 rounded-[2px] flex items-start gap-3 text-xs text-sky-200">
            <IconAdjustments size={20} stroke={1.5} className="text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block text-sm">
                How Pay Rates Work
              </span>
              <p className="text-white/80 mt-1 leading-relaxed">
                Set how each role gets paid — fixed monthly salary, a percentage per completed study, hourly rate, or a mix. Finance uses these settings to calculate payslips.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {roleConfigs.map((role) => {
              const isEditing = editingRole === role.roleName;
              const meta = ROLE_DISPLAY_NAMES[role.roleName] || {
                title: role.roleName,
                subtitle: "Platform internal staff role.",
              };

              return (
                <Card
                  key={role.roleName}
                  className={`p-6 sm:p-7 bg-[#01142B] border transition-colors flex flex-col justify-between ${
                    isEditing ? "border-[#CC6600] ring-1 ring-[#CC6600]" : "border-white/10"
                  }`}
                >
                  <div className="flex flex-col gap-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-[#CC6600] font-bold">
                            {role.roleName}
                          </span>
                          <Badge variant="sky" className="text-[0.625rem] font-mono">
                            {role.compensationType.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <h3 className="text-base font-bold text-white font-sans">{meta.title}</h3>
                        <p className="text-xs text-white/50 font-sans mt-0.5">{meta.subtitle}</p>
                      </div>

                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEditRole(role)}
                          className="text-xs font-mono font-semibold cursor-pointer shrink-0"
                        >
                          Configure Rates →
                        </Button>
                      )}
                    </div>

                    {/* Content View / Form */}
                    {isEditing && formConfig ? (
                      <form onSubmit={handleSaveRole} className="flex flex-col gap-5 text-xs">
                        {/* Compensation Model Selector */}
                        <div className="flex flex-col gap-2">
                          <label className="text-[0.688rem] uppercase font-mono text-white/60 font-semibold">
                            Select Compensation Model
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {[
                              {
                                id: "PERCENTAGE_PER_STUDY",
                                title: "Study % Commission",
                                subtitle: "Earn percentage per completed study",
                              },
                              {
                                id: "FIXED_SALARY",
                                title: "Fixed Monthly Base",
                                subtitle: "Guaranteed monthly or 15-day salary",
                              },
                              {
                                id: "HOURLY_DUTY",
                                title: "Hourly Duty Wage",
                                subtitle: "Paid per verified attendance hour",
                              },
                              {
                                id: "HYBRID",
                                title: "Hybrid (Base + %)",
                                subtitle: "Base monthly pay + Study % commission",
                              },
                            ].map((m) => {
                              const isSelected = formConfig.compensationType === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => handleSelectRoleModel(m.id as CompensationType)}
                                  className={`p-3 rounded-[2px] border text-left font-sans transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-[#CC6600]/20 border-[#CC6600] text-white ring-1 ring-[#CC6600]"
                                      : "bg-[#010D1F] border-white/10 text-white/70 hover:text-white hover:border-white/20"
                                  }`}
                                >
                                  <div className="font-semibold text-xs text-white mb-0.5">{m.title}</div>
                                  <div className="text-[0.688rem] text-white/50">{m.subtitle}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {(formConfig.roleName === "ADMIN" || formConfig.roleName === "FINANCE_OFFICER") &&
                          (formConfig.compensationType === "PERCENTAGE_PER_STUDY" || formConfig.compensationType === "HYBRID") && (
                            <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-[2px] text-xs text-amber-200 flex flex-col gap-1">
                              <span className="font-semibold text-white">Platform Operations Role:</span>
                              <p className="text-white/80 leading-relaxed text-[0.688rem]">
                                {formConfig.roleName === "ADMIN" ? "Operations & Study Admin" : "Finance & HR Officer"} coordinates all research studies platform-wide. Their per-study commission percentage applies across active studies completed during each pay cycle.
                              </p>
                            </div>
                          )}

                        {/* Focused Inputs - Show ONLY what is needed for the active model */}
                        <div className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex flex-col gap-4">
                          {formConfig.compensationType === "PERCENTAGE_PER_STUDY" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-mono text-white/80 block mb-1.5 font-semibold">
                                  Commission % Per Study
                                </label>
                                <div className="relative flex items-center">
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={formConfig.commissionPercentagePerStudy}
                                    onChange={(e) =>
                                      setFormConfig((p) =>
                                        p ? { ...p, commissionPercentagePerStudy: Number(e.target.value) } : null
                                      )
                                    }
                                    className="w-full bg-[#01142B] border border-white/15 rounded-[2px] px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#CC6600]"
                                  />
                                  <span className="absolute right-3 text-xs font-mono text-white/50">
                                    % of study fee
                                  </span>
                                </div>
                                <span className="text-[0.688rem] text-white/40 font-sans mt-1 block">
                                  Staff earns this percentage of the study fee when the study is completed.
                                </span>
                              </div>

                              <div>
                                <label className="text-xs font-mono text-white/80 block mb-1.5 font-semibold">
                                  Optional Deliverable Bonus (₱)
                                </label>
                                <div className="relative flex items-center">
                                  <span className="absolute left-3"><Peso className="text-xs text-white/50" /></span>
                                  <input
                                    type="number"
                                    step={100}
                                    min={0}
                                    value={formConfig.fixedPerStudyBonus}
                                    onChange={(e) =>
                                      setFormConfig((p) =>
                                        p ? { ...p, fixedPerStudyBonus: Number(e.target.value) } : null
                                      )
                                    }
                                    className="w-full bg-[#01142B] border border-white/15 rounded-[2px] pl-7 pr-3 py-2 text-sm text-white font-mono outline-none focus:border-[#CC6600]"
                                    placeholder="0"
                                  />
                                </div>
                                <span className="text-[0.688rem] text-white/40 font-sans mt-1 block">
                                  Extra bonus paid for each completed study.
                                </span>
                              </div>
                            </div>
                          )}

                          {formConfig.compensationType === "FIXED_SALARY" && (
                            <div>
                              <label className="text-xs font-mono text-white/80 block mb-1.5 font-semibold">
                                Monthly Base Salary (₱)
                              </label>
                              <div className="relative flex items-center max-w-md">
                                <span className="absolute left-3"><Peso className="text-sm text-white/50" /></span>
                                <input
                                  type="number"
                                  step={500}
                                  min={0}
                                  value={formConfig.baseSalaryMonthly}
                                  onChange={(e) =>
                                    setFormConfig((p) =>
                                      p ? { ...p, baseSalaryMonthly: Number(e.target.value) } : null
                                    )
                                  }
                                  className="w-full bg-[#01142B] border border-white/15 rounded-[2px] pl-8 pr-3 py-2 text-sm text-white font-mono outline-none focus:border-[#CC6600]"
                                />
                              </div>
                              <span className="text-[0.688rem] text-white/40 font-sans mt-1.5 block">
                                In a semi-monthly schedule, this pays <Peso className="text-[0.688rem] text-white/40" />{(formConfig.baseSalaryMonthly / 2).toLocaleString()} every 15-day cut-off.
                              </span>
                            </div>
                          )}

                          {formConfig.compensationType === "HOURLY_DUTY" && (
                            <div>
                              <label className="text-xs font-mono text-white/80 block mb-1.5 font-semibold">
                                Hourly Duty Rate (₱ / hour)
                              </label>
                              <div className="relative flex items-center max-w-md">
                                <span className="absolute left-3"><Peso className="text-sm text-white/50" /></span>
                                <input
                                  type="number"
                                  step={25}
                                  min={0}
                                  value={formConfig.hourlyDutyRate}
                                  onChange={(e) =>
                                    setFormConfig((p) =>
                                      p ? { ...p, hourlyDutyRate: Number(e.target.value) } : null
                                    )
                                  }
                                  className="w-full bg-[#01142B] border border-white/15 rounded-[2px] pl-8 pr-16 py-2 text-sm text-white font-mono outline-none focus:border-[#CC6600]"
                                />
                                <span className="absolute right-3 text-xs font-mono text-white/50">/ hour</span>
                              </div>
                              <span className="text-[0.688rem] text-white/40 font-sans mt-1.5 block">
                                Calculated from verified clock-in and clock-out records.
                              </span>
                            </div>
                          )}

                          {formConfig.compensationType === "HYBRID" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-mono text-white/80 block mb-1.5 font-semibold">
                                  Monthly Base Salary (₱)
                                </label>
                                <div className="relative flex items-center">
                                  <span className="absolute left-3"><Peso className="text-sm text-white/50" /></span>
                                  <input
                                    type="number"
                                    step={500}
                                    min={0}
                                    value={formConfig.baseSalaryMonthly}
                                    onChange={(e) =>
                                      setFormConfig((p) =>
                                        p ? { ...p, baseSalaryMonthly: Number(e.target.value) } : null
                                      )
                                    }
                                    className="w-full bg-[#01142B] border border-white/15 rounded-[2px] pl-8 pr-3 py-2 text-sm text-white font-mono outline-none focus:border-[#CC6600]"
                                  />
                                </div>
                                <span className="text-[0.688rem] text-white/40 font-sans mt-1 block">
                                  Guaranteed base pay (<Peso className="text-[0.688rem] text-white/40" />{(formConfig.baseSalaryMonthly / 2).toLocaleString()} per half-month).
                                </span>
                              </div>

                              <div>
                                <label className="text-xs font-mono text-white/80 block mb-1.5 font-semibold">
                                  Commission % Per Study
                                </label>
                                <div className="relative flex items-center">
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={formConfig.commissionPercentagePerStudy}
                                    onChange={(e) =>
                                      setFormConfig((p) =>
                                        p ? { ...p, commissionPercentagePerStudy: Number(e.target.value) } : null
                                      )
                                    }
                                    className="w-full bg-[#01142B] border border-white/15 rounded-[2px] px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#CC6600]"
                                  />
                                  <span className="absolute right-3 text-xs font-mono text-white/50">
                                    % of study fee
                                  </span>
                                </div>
                                <span className="text-[0.688rem] text-white/40 font-sans mt-1 block">
                                  Commission added on top of base pay for each completed study.
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Monthly Allowance - Compact Optional Row */}
                          <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <label className="text-xs font-mono text-white/80 font-semibold block">
                                Monthly Allowance / Stipend (Optional)
                              </label>
                              <span className="text-[0.688rem] text-white/40 font-sans">
                                Extra monthly allowance for internet, tools, or other expenses.
                              </span>
                            </div>
                            <div className="relative flex items-center w-full sm:w-44 shrink-0">
                              <span className="absolute left-3"><Peso className="text-xs text-white/50" /></span>
                              <input
                                type="number"
                                step={250}
                                min={0}
                                value={formConfig.allowancesMonthly}
                                onChange={(e) =>
                                  setFormConfig((p) =>
                                    p ? { ...p, allowancesMonthly: Number(e.target.value) } : null
                                  )
                                }
                                className="w-full bg-[#01142B] border border-white/15 rounded-[2px] pl-7 pr-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[#CC6600]"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Conversational Rule Preview Box */}
                        <div className="p-3.5 bg-[#010D1F] border border-emerald-500/20 rounded-[2px] flex items-start gap-3">
                          <div className="p-1 bg-emerald-950/60 border border-emerald-500/30 rounded-[2px] text-emerald-400 shrink-0 mt-0.5">
                            <IconSparkles size={14} stroke={1.5} />
                          </div>
                          <div className="text-xs font-sans text-white/90 leading-relaxed">
                            <span className="font-bold text-emerald-400 mr-1.5">How this role gets paid:</span>
                            {formConfig.compensationType === "PERCENTAGE_PER_STUDY" && (
                              <span>
                                Specialist earns <strong>{formConfig.commissionPercentagePerStudy}%</strong> of the project fee for every completed study
                                {formConfig.fixedPerStudyBonus > 0 ? (
                                  <span> + <Peso />{formConfig.fixedPerStudyBonus.toLocaleString()} bonus</span>
                                ) : ""}
                                {formConfig.allowancesMonthly > 0 ? (
                                  <span> + <Peso />{formConfig.allowancesMonthly.toLocaleString()} monthly allowance</span>
                                ) : ""}.
                              </span>
                            )}
                            {formConfig.compensationType === "FIXED_SALARY" && (
                              <span>
                                Fixed salary of <strong><Peso />{formConfig.baseSalaryMonthly.toLocaleString()} / month</strong>
                                {" "}(paid as <Peso />{(formConfig.baseSalaryMonthly / 2).toLocaleString()} every 15 days)
                                {formConfig.allowancesMonthly > 0 ? (
                                  <span> + <Peso />{formConfig.allowancesMonthly.toLocaleString()} monthly allowance</span>
                                ) : ""}.
                              </span>
                            )}
                            {formConfig.compensationType === "HOURLY_DUTY" && (
                              <span>
                                Paid <strong><Peso />{formConfig.hourlyDutyRate.toLocaleString()} / hour</strong> based on verified duty attendance
                                {formConfig.allowancesMonthly > 0 ? (
                                  <span> + <Peso />{formConfig.allowancesMonthly.toLocaleString()} monthly allowance</span>
                                ) : ""}.
                              </span>
                            )}
                            {formConfig.compensationType === "HYBRID" && (
                              <span>
                                Base salary of <strong><Peso />{formConfig.baseSalaryMonthly.toLocaleString()} / month</strong> + <strong>{formConfig.commissionPercentagePerStudy}%</strong> per completed study
                                {formConfig.allowancesMonthly > 0 ? (
                                  <span> + <Peso />{formConfig.allowancesMonthly.toLocaleString()} allowance</span>
                                ) : ""}.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingRole(null)}
                            disabled={isSavingRole}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            type="submit"
                            disabled={isSavingRole}
                            className="gap-1.5 font-sans font-semibold cursor-pointer rounded-[2px] text-xs"
                          >
                            {isSavingRole ? (
                              <IconLoader2 size={14} stroke={2.5} className="animate-spin text-white/90" />
                            ) : (
                              <IconCheck size={14} stroke={2} />
                            )}
                            <span>Save Policy</span>
                          </Button>
                        </div>
                      </form>
                    ) : (
                      /* Readonly Display */
                      <div className="flex flex-col gap-4">
                        <div className="p-4 bg-[#010D1F] border border-white/10 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[0.625rem] uppercase font-mono text-white/40 block mb-1">
                              Pay Structure
                            </span>
                            <div className="font-sans font-bold text-sm text-white flex items-center gap-2">
                              {role.compensationType === "PERCENTAGE_PER_STUDY" && (
                                <span className="text-emerald-400 font-mono text-base">
                                  {role.commissionPercentagePerStudy}% Commission per Study
                                </span>
                              )}
                              {role.compensationType === "FIXED_SALARY" && (
                                <span className="text-white font-mono text-base inline-flex items-baseline">
                                  <Peso />{role.baseSalaryMonthly.toLocaleString()} / month
                                  <span className="text-xs text-white/50 font-sans font-normal ml-1.5 inline-flex items-baseline">
                                    (<Peso className="text-white/50" />{(role.baseSalaryMonthly / 2).toLocaleString()} every 15 days)
                                  </span>
                                </span>
                              )}
                              {role.compensationType === "HOURLY_DUTY" && (
                                <span className="text-purple-300 font-mono text-base inline-flex items-baseline">
                                  <Peso className="text-purple-300/80" />{role.hourlyDutyRate.toFixed(2)} / hour
                                </span>
                              )}
                              {role.compensationType === "HYBRID" && (
                                <span className="text-sky-400 font-mono text-sm inline-flex items-baseline">
                                  <Peso className="text-sky-400/80" />{role.baseSalaryMonthly.toLocaleString()} Base + {role.commissionPercentagePerStudy}% Commission
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {role.fixedPerStudyBonus > 0 && (
                              <span className="px-2 py-1 bg-amber-950/40 border border-amber-500/30 text-amber-300 rounded-[2px] text-xs font-mono inline-flex items-baseline">
                                +<Peso className="text-amber-300/80" />{role.fixedPerStudyBonus.toLocaleString()} Bonus
                              </span>
                            )}
                            {role.allowancesMonthly > 0 && (
                              <span className="px-2 py-1 bg-sky-950/40 border border-sky-500/30 text-sky-300 rounded-[2px] text-xs font-mono inline-flex items-baseline">
                                +<Peso className="text-sky-300/80" />{role.allowancesMonthly.toLocaleString()} Allowance
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-[2px] text-xs text-white/70 font-sans">
                          <strong className="text-white">Notes: </strong>
                          {role.notes || "Using standard pay rates for this role."}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[0.688rem] font-mono text-white/40">
                    <span>Authorized by: {role.updatedBy || "CEO"}</span>
                    <span>Updated: {role.updatedAt ? new Date(role.updatedAt).toLocaleDateString("en-PH") : "Active"}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── TAB 2: SPECIALIST OVERRIDES ── */}
        <TabsContent value="STAFF" className="mt-6 flex flex-col gap-6">
          <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white font-sans">
                  Staff & Custom Pay Rates
                </h2>
                <p className="text-xs text-white/50 font-sans mt-0.5">
                  View each team member&rsquo;s pay setup. You can set custom rates for individual staff without changing the default role rates.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 font-mono uppercase text-[0.688rem]">
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Pay Type</th>
                    <th className="py-3 px-3">Base Salary</th>
                    <th className="py-3 px-3">Study %</th>
                    <th className="py-3 px-3">Hourly Rate</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {staffMembers.map((staff) => {
                    const cfg = staff.effectiveConfig;
                    const hasOverride = Boolean(staff.overrideConfig);

                    return (
                      <tr key={staff.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{staff.fullName}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[0.688rem] font-mono text-white/40">{staff.email}</span>
                              {staff.payoutDetails && (
                                <span
                                  className="text-[0.562rem] font-mono px-1.5 py-0.2 rounded-[2px] bg-orange-500/15 text-[#FFA040] border border-[#FFA040]/30"
                                  title={`${staff.payoutDetails.payoutChannel}: ${staff.payoutDetails.accountNumber} (${staff.payoutDetails.accountName})`}
                                >
                                  {staff.payoutDetails.payoutChannel.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[0.688rem] text-white/70">
                          {staff.role}
                        </td>
                        <td className="py-3 px-3 font-mono text-white/80">
                          {cfg.compensationType.replace(/_/g, " ")}
                        </td>
                        <td className="py-3 px-3 font-mono text-white">
                          {cfg.baseSalaryMonthly > 0 ? (
                            <span className="inline-flex items-baseline"><Peso />{cfg.baseSalaryMonthly.toLocaleString()}</span>
                          ) : "--"}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">
                          {cfg.commissionPercentagePerStudy > 0 ? `${cfg.commissionPercentagePerStudy}%` : "--"}
                        </td>
                        <td className="py-3 px-3 font-mono text-white/70">
                          <span className="inline-flex items-baseline"><Peso />{cfg.hourlyDutyRate.toFixed(2)}/h</span>
                        </td>
                        <td className="py-3 px-3">
                          {hasOverride ? (
                            <Badge variant="amber" className="text-[0.625rem] font-mono">
                              Custom Rate
                            </Badge>
                          ) : (
                            <Badge variant="sky" className="text-[0.625rem] font-mono">
                              Role Default
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedStaffForOverride(staff)}
                            className="font-mono text-xs py-1 px-3 cursor-pointer"
                          >
                            {hasOverride ? "Edit" : "Customize"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── TAB 3: EXECUTIVE PAYSLIP AUDIT VAULT ── */}
        <TabsContent value="PAYSLIPS" className="mt-6 flex flex-col gap-6">
          <Card className="p-6 sm:p-8 bg-[#01142B] border-white/10 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white font-sans">
                  All Payslips
                </h2>
                <p className="text-xs text-white/50 font-sans mt-0.5">
                  View all generated payslips, study details, and payment dates.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleGenerateBatch(selectedBatchCycle)}
                  disabled={isGeneratingBatch}
                  className="gap-1.5 font-sans font-semibold cursor-pointer rounded-[2px]"
                >
                  <IconReceipt size={14} stroke={2} />
                  <span>Generate Payslips</span>
                </Button>
              </div>
            </div>

            {payslips.length === 0 ? (
              <div className="py-12 text-center text-xs text-white/40 italic font-sans">
                No payslips yet for this cycle. Click &ldquo;Generate Payslips&rdquo; to create them.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[2px] border border-white/10 bg-[#010D1F]/60 shadow-xl">
                <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#010D1F] border-b border-white/10 text-white/50 font-mono uppercase text-[0.688rem] tracking-wider">
                          <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">Payslip No.</th>
                          <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">Staff</th>
                          <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Pay Period</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[100px]">Hours</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[100px]">Studies</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[110px]">Gross Pay</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[130px] text-emerald-400/90">Net Pay</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[120px]">Status</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[150px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {payslips.map((ps) => {
                          const parts = ps.payPeriodMonth.split("(");
                          const mainMonth = parts[0]?.trim() || ps.payPeriodMonth;
                          let cycleSub = "";
                          if (parts.length > 1) {
                            const rawCycle = parts[1]?.replace(")", "").trim();
                            if (rawCycle?.includes("First Half") || rawCycle?.includes("Days 1-15") || rawCycle?.includes("Days 1–15")) {
                              cycleSub = "1st Half (Days 1–15)";
                            } else if (rawCycle?.includes("Second Half") || rawCycle?.includes("Days 16")) {
                              cycleSub = "2nd Half (Days 16–End)";
                            } else {
                              cycleSub = rawCycle || "";
                            }
                          } else if (ps.cutOffCycle === "FIRST_HALF") {
                            cycleSub = "1st Half (Days 1–15)";
                          } else if (ps.cutOffCycle === "SECOND_HALF") {
                            cycleSub = "2nd Half (Days 16–End)";
                          } else if (ps.cutOffCycle === "FULL_MONTH") {
                            cycleSub = "Full Month";
                          }

                          return (
                            <tr key={ps.id} className="hover:bg-white/[0.04] transition-colors group">
                              <td className="py-3.5 px-4 font-mono font-semibold text-[#FFA040] whitespace-nowrap">
                                {ps.payslipNumber}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-semibold text-white font-sans text-xs block leading-tight">
                                  {ps.staffName}
                                </span>
                                <span className="text-[0.688rem] font-mono text-white/40 block mt-0.5">
                                  {ps.staffRole.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-semibold text-white font-sans text-xs block leading-tight">
                                  {mainMonth}
                                </span>
                                {cycleSub && (
                                  <span className="text-[0.688rem] font-mono text-sky-400/80 block mt-0.5">
                                    {cycleSub}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-right text-white/90 whitespace-nowrap">
                                {ps.verifiedDutyHours > 0 ? `${ps.verifiedDutyHours}h` : "—"}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono">
                                {ps.completedStudiesCount > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                                    {ps.completedStudiesCount} {ps.completedStudiesCount === 1 ? "study" : "studies"}
                                  </span>
                                ) : (
                                  <span className="text-white/30 font-mono">—</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-right text-white/70 text-xs whitespace-nowrap">
                                <span className="inline-flex items-baseline"><Peso />{ps.grossEarnings.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-right whitespace-nowrap">
                                <span className="inline-flex items-baseline font-mono font-bold text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-[2px]">
                                  <Peso className="text-emerald-400/80 text-xs" />{ps.netPay.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {ps.status === "DISBURSED" && (
                                  <Badge variant="emerald" className="text-[0.625rem] font-mono uppercase tracking-wider">
                                    Disbursed
                                  </Badge>
                                )}
                                {ps.status === "APPROVED" && (
                                  <Badge variant="sky" className="text-[0.625rem] font-mono uppercase tracking-wider">
                                    Approved
                                  </Badge>
                                )}
                                {ps.status === "DRAFT" && (
                                  <Badge variant="amber" className="text-[0.625rem] font-mono uppercase tracking-wider">
                                    Draft
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {ps.status === "DRAFT" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleApprove(ps.id)}
                                      className="h-7 text-xs font-sans px-2.5 text-sky-400 border-sky-500/30 hover:bg-sky-500/10 cursor-pointer rounded-[2px]"
                                    >
                                      Approve
                                    </Button>
                                  )}
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setSelectedPayslipForView(ps)}
                                    className="h-7 text-xs font-sans px-2.5 bg-white/10 hover:bg-white/15 text-white cursor-pointer rounded-[2px]"
                                  >
                                    View →
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Specialist Override Modal */}
      {selectedStaffForOverride && (
        <SpecialistOverrideModal
          staff={selectedStaffForOverride}
          open={!!selectedStaffForOverride}
          onClose={() => setSelectedStaffForOverride(null)}
          onSuccess={async () => {
            setToast({
              variant: "success",
              message: "Custom Rates Saved",
              description: `Updated pay rates for ${selectedStaffForOverride.fullName}.`,
            });
            await loadData();
          }}
        />
      )}

      {/* Official Payslip Statement Modal */}
      {selectedPayslipForView && (
        <PayslipStatementModal
          payslip={selectedPayslipForView}
          open={!!selectedPayslipForView}
          onClose={() => setSelectedPayslipForView(null)}
        />
      )}
    </div>
  );
}
