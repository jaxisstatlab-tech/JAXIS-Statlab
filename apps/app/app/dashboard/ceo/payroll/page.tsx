"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KpiCard, Button, LoadingState, PageHeader, Toast, Peso, Switch, CopyButton } from "@repo/ui";
import { ArrowRight, CalendarCheck, Clock, Coins, Files, Receipt, UsersThree } from "@phosphor-icons/react";
import {
  getPayrollConfigurations,
  saveRoleCompensationConfig,
  saveCompanyPayrollSchedule,
  getCompanyPayslips,
  generateBatchPayslips,
  approvePayslip,
  type InternalStaffMember,
} from "@/features/payroll/actions";
import {
  PAY_MODEL_OPTIONS,
  payModelSummary,
  usesTimeClock,
  type RoleCompensationConfigDTO,
  type StaffPayslipDTO,
  type PayrollKpiSummary,
  type CompensationType,
  type CorporatePayrollScheduleConfigDTO,
  type CutOffCycle,
} from "@/features/payroll/schemas";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { PayslipStatementModal } from "@/features/payroll/components/PayslipStatementModal";
import { SpecialistOverrideModal } from "@/features/payroll/components/SpecialistOverrideModal";

// Payroll Settings (CEO): how each role is paid, pay for one person, the pay schedule, and payslips.
// Study pay percentages per package live on Money & Pay Rates; this page links there instead of repeating them.

const ROLE_INFO: Record<string, { title: string; subtitle: string }> = {
  STATISTICIAN: { title: "Analysts", subtitle: "Run the analysis for each study." },
  SENIOR_QA_LEAD: { title: "Reviewers", subtitle: "Check the work before it goes to the client." },
  FINANCE_OFFICER: { title: "Finance", subtitle: "Check payments, pay staff, and handle leave." },
  ADMIN: { title: "Admins", subtitle: "Price studies, assign work, and talk to clients." },
};

const ROLE_SHORT: Record<string, string> = {
  STATISTICIAN: "Analyst",
  SENIOR_QA_LEAD: "Reviewer",
  FINANCE_OFFICER: "Finance",
  ADMIN: "Admin",
  CEO: "CEO",
};

const MODEL_TITLE: Record<string, string> = Object.fromEntries(PAY_MODEL_OPTIONS.map((m) => [m.id, m.title]));
MODEL_TITLE.PERCENTAGE_PER_STUDY = "Percent per Study";

const money = (n: number) => Math.round(n).toLocaleString("en-PH");

type ToastState = { message: string; description?: string; variant: "success" | "warning" | "danger" | "info" } | null;
type Tab = "ROLES" | "PEOPLE" | "PAYSLIPS";

function cycleLabel(ps: StaffPayslipDTO) {
  const inside = ps.payPeriodMonth.match(/\((.+)\)/)?.[1];
  const month = ps.payPeriodMonth.replace(/\s*\(.+\)\s*$/, "");
  return { month, part: inside ?? (ps.cutOffCycle === "FIRST_HALF" ? "Days 1–15" : ps.cutOffCycle === "SECOND_HALF" ? "Days 16–end" : "Full month") };
}

export default function CeoPayrollPolicyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tab, setTab] = useState<Tab>("ROLES");
  const [roleConfigs, setRoleConfigs] = useState<RoleCompensationConfigDTO[]>([]);
  const [staffMembers, setStaffMembers] = useState<InternalStaffMember[]>([]);
  const [payslips, setPayslips] = useState<StaffPayslipDTO[]>([]);
  const [kpis, setKpis] = useState<PayrollKpiSummary | null>(null);
  const [schedule, setSchedule] = useState<CorporatePayrollScheduleConfigDTO | null>(null);
  const [cycle, setCycle] = useState<CutOffCycle>("FIRST_HALF");
  const [isGenerating, setIsGenerating] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<InternalStaffMember | null>(null);
  const [payslipToView, setPayslipToView] = useState<StaffPayslipDTO | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const loadData = useCallback(async () => {
    try {
      const [configData, payslipData] = await Promise.all([getPayrollConfigurations(), getCompanyPayslips()]);
      setRoleConfigs(configData.roleConfigs);
      setStaffMembers(configData.staffMembers);
      setSchedule(configData.scheduleConfig);
      setPayslips(payslipData.payslips);
      setKpis(payslipData.kpis);
      setLoadFailed(false);
    } catch (err) {
      console.error("Failed to load payroll settings:", err);
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const customCount = useMemo(() => staffMembers.filter((s) => Boolean(s.overrideConfig)).length, [staffMembers]);
  const waitingApproval = payslips.filter((p) => p.status === "DRAFT").length;

  const generate = async () => {
    setIsGenerating(true);
    try {
      const now = new Date();
      const monthName = now.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
      const y = now.getFullYear();
      const m = now.getMonth();
      const [start, end] =
        cycle === "FIRST_HALF"
          ? [new Date(y, m, 1), new Date(y, m, 15, 23, 59, 59)]
          : cycle === "SECOND_HALF"
            ? [new Date(y, m, 16), new Date(y, m + 1, 0, 23, 59, 59)]
            : [new Date(y, m, 1), new Date(y, m + 1, 0, 23, 59, 59)];
      const res = await generateBatchPayslips({
        payPeriodMonth: monthName,
        payPeriodStart: start.toISOString(),
        payPeriodEnd: end.toISOString(),
        cutOffCycle: cycle,
      });
      if (res.success) {
        const skipped = (res as { skipped?: number }).skipped ?? 0;
        setToast({
          variant: "success",
          message: "Payslips made",
          description: `${res.count} ${res.count === 1 ? "payslip" : "payslips"} for ${monthName}${skipped ? `. ${skipped} already approved or paid were left as they are` : ""}.`,
        });
        setTab("PAYSLIPS");
        await loadData();
      } else {
        setToast({ variant: "danger", message: "Couldn't make payslips", description: res.error?.message });
      }
    } catch {
      setToast({ variant: "danger", message: "Couldn't make payslips", description: "Check your connection and try again." });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState variant="page" label="Loading payroll settings..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title="Payroll Settings"
        description="How each role is paid, pay for one person, the pay schedule, and payslips."
        breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, { label: "Payroll Settings" }]}
        actions={
          <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center">
            <select
              value={cycle}
              onChange={(e) => setCycle(e.target.value as CutOffCycle)}
              aria-label="Pay period"
              className="h-9 rounded-[2px] border border-white/10 bg-[#050513] px-3 font-sans text-[13px] text-white outline-none focus:border-[#CC6600]/60"
            >
              <option value="FIRST_HALF">This month, days 1–15</option>
              <option value="SECOND_HALF">This month, days 16–end</option>
              <option value="FULL_MONTH">This month, whole month</option>
            </select>
            <Button variant="primary" size="sm" onClick={generate} loading={isGenerating} className="gap-1.5 active:scale-[0.97]">
              <Receipt size={15} weight="fill" />
              Make Payslips
            </Button>
          </div>
        }
      />

      {loadFailed ? (
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/75">The pay settings didn&apos;t load. Nothing was changed.</p>
            <Button variant="outline" size="sm" onClick={loadData}>
              Try Again
            </Button>
          </PanelBody>
        </Panel>
      ) : null}

      {kpis ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Payroll"
            description={`${kpis.activeStaffCount} ${kpis.activeStaffCount === 1 ? "person" : "people"} on payslips`}
            icon={<Coins size={18} weight="fill" />}
            value={
              <span className="whitespace-nowrap">
                <Peso />
                {money(kpis.totalInstitutionalPayroll)}
              </span>
            }
          />
          <KpiCard
            label="Paid out"
            description={kpis.pendingDisbursementsCount > 0 ? `${kpis.pendingDisbursementsCount} not paid yet` : "Everything is paid"}
            icon={<Receipt size={18} weight="fill" />}
            value={
              <span className="whitespace-nowrap">
                <Peso />
                {money(kpis.totalDisbursed)}
              </span>
            }
          />
          <KpiCard label="Hours paid" description="Hourly staff only" icon={<Clock size={18} weight="fill" />} value={kpis.totalDutyHoursCompensated} unit="hrs" />
          <KpiCard label="Studies paid" description="Delivered and fully paid by clients" icon={<Files size={18} weight="fill" />} value={kpis.totalStudiesRewarded} />
        </div>
      ) : null}

      <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]" role="tablist" aria-label="Payroll sections">
        {(
          [
            { id: "ROLES", label: "Pay by role" },
            { id: "PEOPLE", label: "Pay per person", count: customCount },
            { id: "PAYSLIPS", label: "Payslips", count: payslips.length, attention: waitingApproval > 0 },
          ] as Array<{ id: Tab; label: string; count?: number; attention?: boolean }>
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-[2px] px-3 py-1.5 font-sans text-[13px] transition-colors ${
                active ? "bg-white/[0.08] font-medium text-white" : "text-white/55 hover:text-white"
              }`}
            >
              {t.attention ? <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" /> : null}
              {t.label}
              {t.count !== undefined ? <span className={`font-mono text-[11px] ${active ? "text-white/60" : "text-white/35"}`}>{t.count}</span> : null}
            </button>
          );
        })}
      </div>

      {tab === "ROLES" ? (
        <>
          {schedule ? (
            <ScheduleCard
              schedule={schedule}
              onSaved={async (saved) => {
                setSchedule(saved);
                setToast({ variant: "success", message: "Pay schedule saved", description: saved.frequency === "SEMI_MONTHLY" ? "Staff are paid twice a month." : "Staff are paid once a month." });
                await loadData();
              }}
              onError={(message) => setToast({ variant: "danger", message: "Couldn't save the schedule", description: message })}
            />
          ) : null}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {roleConfigs.map((role) => (
              <RoleCard
                key={role.roleName}
                role={role}
                halfMonth={schedule?.frequency === "SEMI_MONTHLY" && schedule.prorateMonthlyBase !== false}
                onSaved={(saved) => {
                  setRoleConfigs((prev) => prev.map((r) => (r.roleName === saved.roleName ? saved : r)));
                  setToast({ variant: "success", message: "Pay saved", description: `${ROLE_INFO[saved.roleName]?.title ?? saved.roleName} use the new pay from the next payslips.` });
                  loadData();
                }}
                onError={(message) => setToast({ variant: "danger", message: "Couldn't save the pay", description: message })}
              />
            ))}
          </div>
        </>
      ) : null}

      {tab === "PEOPLE" ? <PeoplePanel staff={staffMembers} onEdit={setPersonToEdit} /> : null}

      {tab === "PAYSLIPS" ? (
        <PayslipsPanel
          payslips={payslips}
          onView={setPayslipToView}
          onMake={generate}
          isMaking={isGenerating}
          onApprove={async (ps) => {
            try {
              const res = await approvePayslip(ps.id);
              if (res.success) {
                setToast({ variant: "success", message: "Payslip approved", description: `${ps.payslipNumber} is ready for finance to pay.` });
                await loadData();
              } else {
                setToast({ variant: "danger", message: "Couldn't approve", description: "Please try again." });
              }
            } catch {
              setToast({ variant: "danger", message: "Couldn't approve", description: "Check your connection and try again." });
            }
          }}
        />
      ) : null}

      {personToEdit ? (
        <SpecialistOverrideModal
          staff={personToEdit}
          open
          onClose={() => setPersonToEdit(null)}
          onSuccess={async () => {
            setToast({ variant: "success", message: "Pay saved", description: `${personToEdit.fullName}'s own pay is set.` });
            await loadData();
          }}
        />
      ) : null}

      {payslipToView ? <PayslipStatementModal payslip={payslipToView} open onClose={() => setPayslipToView(null)} /> : null}

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function ScheduleCard({
  schedule,
  onSaved,
  onError,
}: {
  schedule: CorporatePayrollScheduleConfigDTO;
  onSaved: (saved: CorporatePayrollScheduleConfigDTO) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CorporatePayrollScheduleConfigDTO>({ ...schedule });
  const [saving, setSaving] = useState(false);
  const twice = form.frequency === "SEMI_MONTHLY";
  const summary =
    schedule.frequency === "SEMI_MONTHLY"
      ? `Twice a month: days 1–${schedule.firstCutoffDay} and ${schedule.firstCutoffDay + 1}–end. Paid within ${schedule.disbursementGraceDays} working days.`
      : `Once a month. Paid within ${schedule.disbursementGraceDays} working days.`;

  const save = async () => {
    setSaving(true);
    try {
      const res = await saveCompanyPayrollSchedule(form);
      if (res.success && res.config) {
        setOpen(false);
        onSaved(res.config);
      } else onError(res.error?.message || "Please try again.");
    } catch {
      onError("Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const input =
    "h-9 w-full rounded-[2px] border border-white/10 bg-[#050513] px-3 font-mono text-[13px] text-white outline-none focus:border-[#CC6600]/60";

  return (
    <Panel>
      <PanelHeader
        title="Pay schedule"
        subtitle={summary}
        aside={
          <Button variant="outline" size="sm" onClick={() => (open ? (setForm({ ...schedule }), setOpen(false)) : setOpen(true))} className="gap-1.5 active:scale-[0.97]">
            <CalendarCheck size={14} weight="fill" />
            {open ? "Close" : "Edit"}
          </Button>
        }
      />
      {open ? (
        <PanelBody className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(
              [
                { id: "SEMI_MONTHLY", title: "Twice a month", text: "Days 1–15 and 16–end." },
                { id: "MONTHLY", title: "Once a month", text: "The whole month at the end." },
              ] as const
            ).map((o) => {
              const on = form.frequency === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, frequency: o.id }))}
                  aria-pressed={on}
                  className={`rounded-[2px] border px-4 py-3 text-left transition-colors ${
                    on ? "border-[#CC6600]/70 bg-[#CC6600]/[0.06]" : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <p className="text-sm font-medium text-white">{o.title}</p>
                  <p className="mt-0.5 text-[13px] text-white/55">{o.text}</p>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {twice ? (
              <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
                First half ends on day
                <input type="number" min={10} max={20} value={form.firstCutoffDay} onChange={(e) => setForm((f) => ({ ...f, firstCutoffDay: Number(e.target.value) }))} className={input} />
                <span className="text-[12px] text-white/40">Between 10 and 20.</span>
              </label>
            ) : null}
            <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
              Pay within (working days)
              <input type="number" min={0} max={10} value={form.disbursementGraceDays} onChange={(e) => setForm((f) => ({ ...f, disbursementGraceDays: Number(e.target.value) }))} className={input} />
              <span className="text-[12px] text-white/40">Between 0 and 10.</span>
            </label>
          </div>
          {twice ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">Split monthly salaries in half</p>
                <p className="mt-0.5 text-[13px] text-white/55">
                  {form.prorateMonthlyBase ? "A ₱30,000 salary is paid as ₱15,000 each payday." : "The full monthly salary is paid each payday."}
                </p>
              </div>
              <Switch checked={form.prorateMonthlyBase} onCheckedChange={(v) => setForm((f) => ({ ...f, prorateMonthlyBase: v }))} aria-label="Split monthly salaries in half" />
            </div>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
            <Button variant="ghost" size="sm" onClick={() => (setForm({ ...schedule }), setOpen(false))}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={save} loading={saving} className="active:scale-[0.97]">
              Save Schedule
            </Button>
          </div>
        </PanelBody>
      ) : null}
    </Panel>
  );
}

function RoleCard({
  role,
  halfMonth,
  onSaved,
  onError,
}: {
  role: RoleCompensationConfigDTO;
  halfMonth: boolean;
  onSaved: (saved: RoleCompensationConfigDTO) => void;
  onError: (message: string) => void;
}) {
  const info = ROLE_INFO[role.roleName] ?? { title: role.roleName, subtitle: "" };
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<RoleCompensationConfigDTO>(role);
  const [saving, setSaving] = useState(false);
  const clock = usesTimeClock(role.compensationType);

  const pickModel = (id: CompensationType) =>
    setForm((prev) => {
      const next = { ...prev, compensationType: id };
      if (id === "TIER_DELIVERABLE" || id === "PERCENTAGE_PER_STUDY") Object.assign(next, { baseSalaryMonthly: 0, hourlyDutyRate: 0, commissionPercentagePerStudy: 0 });
      if (id === "FIXED_SALARY") Object.assign(next, { commissionPercentagePerStudy: 0, hourlyDutyRate: 0, fixedPerStudyBonus: 0, baseSalaryMonthly: next.baseSalaryMonthly || 35000 });
      if (id === "HOURLY_DUTY") Object.assign(next, { baseSalaryMonthly: 0, commissionPercentagePerStudy: 0, fixedPerStudyBonus: 0, hourlyDutyRate: next.hourlyDutyRate || 450 });
      if (id === "HYBRID") Object.assign(next, { hourlyDutyRate: 0, fixedPerStudyBonus: 0, baseSalaryMonthly: next.baseSalaryMonthly || 12000 });
      return next;
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, notes: payModelSummary(form) };
      const res = await saveRoleCompensationConfig(payload);
      if (res.success) {
        setEditing(false);
        onSaved(res.data || payload);
      } else onError(res.error?.message || "Please try again.");
    } catch {
      onError("Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const numberInput =
    "h-9 w-full rounded-[2px] border border-white/10 bg-[#050513] pl-7 pr-3 font-mono text-[13px] text-white outline-none focus:border-[#CC6600]/60";
  const amount = (label: string, key: keyof RoleCompensationConfigDTO, step: number, hint?: string) => (
    <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
      {label}
      <span className="relative flex items-center">
        <span className="pointer-events-none absolute left-3 text-white/45">₱</span>
        <input
          type="number"
          min={0}
          step={step}
          value={Number(form[key]) || 0}
          onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
          className={numberInput}
        />
      </span>
      {hint ? <span className="text-[12px] text-white/40">{hint}</span> : null}
    </label>
  );

  return (
    <Panel className={editing ? "border-[#CC6600]/40" : ""}>
      <PanelHeader
        title={info.title}
        subtitle={info.subtitle}
        aside={
          editing ? null : (
            <Button variant="outline" size="sm" onClick={() => (setForm(role), setEditing(true))} className="active:scale-[0.97]">
              Edit
            </Button>
          )
        }
      />
      <PanelBody className="flex flex-1 flex-col gap-4">
        {!editing ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[2px] border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[12px] text-white/80">{MODEL_TITLE[role.compensationType] ?? role.compensationType}</span>
              <span className="inline-flex items-center gap-1 text-[12px] text-white/45">
                <Clock size={12} weight="fill" />
                {clock ? "Uses the time clock" : "No clock-in"}
              </span>
            </div>
            <RoleRate role={role} halfMonth={halfMonth} />
            <p className="text-[13px] leading-relaxed text-white/60">{payModelSummary(role)}</p>
            {role.compensationType === "TIER_DELIVERABLE" || role.compensationType === "HYBRID" ? (
              <Link href="/dashboard/ceo/finance" className="inline-flex w-fit items-center gap-1 text-[13px] text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                Package rates on Money &amp; Pay Rates
                <ArrowRight size={12} weight="bold" />
              </Link>
            ) : null}
            <p className="mt-auto border-t border-white/[0.06] pt-3 text-[12px] text-white/40">
              Last changed{role.updatedAt ? ` ${new Date(role.updatedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}` : ""}
              {role.updatedBy ? ` by ${role.updatedBy}` : ""}
            </p>
          </>
        ) : (
          <form onSubmit={save} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PAY_MODEL_OPTIONS.map((m) => {
                const on = form.compensationType === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => pickModel(m.id)}
                    aria-pressed={on}
                    className={`rounded-[2px] border px-3.5 py-2.5 text-left transition-colors ${
                      on ? "border-[#CC6600]/70 bg-[#CC6600]/[0.06]" : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{m.title}</p>
                    <p className="mt-0.5 text-[12px] text-white/50">{m.subtitle}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] leading-relaxed text-white/45">
              Only Hourly Wage uses the time clock. For the others, Clock In is greyed out and clocked hours never change pay.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {form.compensationType === "FIXED_SALARY" || form.compensationType === "HYBRID"
                ? amount("Monthly salary", "baseSalaryMonthly", 500, halfMonth ? `Paid as ₱${money((form.baseSalaryMonthly || 0) / 2)} each payday.` : undefined)
                : null}
              {form.compensationType === "HOURLY_DUTY" ? amount("Hourly wage", "hourlyDutyRate", 25) : null}
              {form.compensationType === "HYBRID" || form.compensationType === "PERCENTAGE_PER_STUDY" ? (
                <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
                  Share of each study (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.commissionPercentagePerStudy}
                    onChange={(e) => setForm((f) => ({ ...f, commissionPercentagePerStudy: Number(e.target.value) }))}
                    className="h-9 w-full rounded-[2px] border border-white/10 bg-[#050513] px-3 font-mono text-[13px] text-white outline-none focus:border-[#CC6600]/60"
                  />
                  <span className="text-[12px] text-white/40">0 uses the package rate.</span>
                </label>
              ) : null}
              {form.compensationType === "TIER_DELIVERABLE" || form.compensationType === "PERCENTAGE_PER_STUDY"
                ? amount("Extra per study (optional)", "fixedPerStudyBonus", 100)
                : null}
              {amount("Monthly allowance (optional)", "allowancesMonthly", 250, "For internet, tools, and the like.")}
            </div>

            <p className="rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-[13px] leading-relaxed text-white/75">
              <span className="text-white/45">They get: </span>
              {payModelSummary(form)}
            </p>

            <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={saving} className="active:scale-[0.97]">
                Save Pay
              </Button>
            </div>
          </form>
        )}
      </PanelBody>
    </Panel>
  );
}

function RoleRate({ role, halfMonth }: { role: RoleCompensationConfigDTO; halfMonth: boolean }) {
  const big = "font-sans text-2xl font-semibold tabular-nums text-white";
  const small = "ml-1.5 text-[13px] font-normal text-white/45";
  if (role.compensationType === "FIXED_SALARY" || role.compensationType === "HYBRID")
    return (
      <p className={big}>
        <Peso />
        {money(role.baseSalaryMonthly)}
        <span className={small}>
          a month{halfMonth ? ` · ₱${money(role.baseSalaryMonthly / 2)} each payday` : ""}
          {role.compensationType === "HYBRID" ? " + study pay" : ""}
        </span>
      </p>
    );
  if (role.compensationType === "HOURLY_DUTY")
    return (
      <p className={big}>
        <Peso />
        {money(role.hourlyDutyRate)}
        <span className={small}>an hour</span>
      </p>
    );
  if (role.compensationType === "PERCENTAGE_PER_STUDY")
    return (
      <p className={big}>
        {role.commissionPercentagePerStudy}%<span className={small}>of each study</span>
      </p>
    );
  return (
    <p className={big}>
      Package rate<span className={small}>of each delivered study</span>
    </p>
  );
}

function PeoplePanel({ staff, onEdit }: { staff: InternalStaffMember[]; onEdit: (s: InternalStaffMember) => void }) {
  return (
    <Panel>
      <PanelHeader title="Pay per person" subtitle="Everyone follows their role's pay unless you give them their own. Their own pay never changes the role." />
      {staff.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-white/55">No staff yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto border-t border-white/[0.06]">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-6 py-2.5 font-medium">Person</th>
                <th className="px-3 py-2.5 font-medium">Role</th>
                <th className="px-3 py-2.5 font-medium">Pay</th>
                <th className="px-3 py-2.5 font-medium">Set by</th>
                <th className="px-6 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-[13px]">
              {staff.map((s) => {
                const own = Boolean(s.overrideConfig);
                const cfg = s.effectiveConfig;
                return (
                  <tr key={s.id} className="align-top transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-3">
                      <p className="font-medium text-white">{s.fullName}</p>
                      <p className="text-[12px] text-white/45">
                        {s.email}
                        {s.payoutDetails ? ` · paid by ${s.payoutDetails.payoutChannel === "GCASH" ? "GCash" : s.payoutDetails.payoutChannel === "MAYA" ? "Maya" : s.payoutDetails.payoutChannel === "BANK_TRANSFER" ? "bank" : "cash"}` : " · no payout details yet"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-white/75">{ROLE_SHORT[s.role] ?? s.role}</td>
                    <td className="max-w-[340px] px-3 py-3">
                      <p className="text-white">{MODEL_TITLE[cfg.compensationType] ?? cfg.compensationType}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-white/50">{payModelSummary(cfg)}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={own ? "font-medium text-white" : "text-white/55"}>{own ? "Their own pay" : "Their role"}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => onEdit(s)} className="active:scale-[0.97]">
                        {own ? "Edit" : "Set Own Pay"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function PayslipsPanel({
  payslips,
  onView,
  onApprove,
  onMake,
  isMaking,
}: {
  payslips: StaffPayslipDTO[];
  onView: (ps: StaffPayslipDTO) => void;
  onApprove: (ps: StaffPayslipDTO) => Promise<void>;
  onMake: () => void;
  isMaking: boolean;
}) {
  const [approving, setApproving] = useState<string | null>(null);
  return (
    <Panel>
      <PanelHeader
        title="Payslips"
        subtitle="Approve a draft when it looks right; finance then pays it."
        aside={
          <Button asChild variant="ghost" size="sm" className="gap-1 active:scale-[0.97]">
            <Link href="/dashboard/finance/payroll">
              Finance payroll
              <ArrowRight size={13} weight="bold" />
            </Link>
          </Button>
        }
      />
      {payslips.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-sm text-white/60">No payslips yet.</p>
          <Button variant="outline" size="sm" onClick={onMake} loading={isMaking} className="gap-1.5">
            <UsersThree size={14} weight="fill" />
            Make Payslips
          </Button>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto border-t border-white/[0.06]">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-6 py-2.5 font-medium">Payslip</th>
                <th className="px-3 py-2.5 font-medium">Person</th>
                <th className="px-3 py-2.5 font-medium">Period</th>
                <th className="px-3 py-2.5 text-right font-medium">Hours</th>
                <th className="px-3 py-2.5 text-right font-medium">Studies</th>
                <th className="px-3 py-2.5 text-right font-medium">Take-home</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-6 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-[13px]">
              {payslips.map((ps) => {
                const period = cycleLabel(ps);
                const draft = ps.status === "DRAFT";
                return (
                  <tr key={ps.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-6 py-3">
                      <CopyButton value={ps.payslipNumber} label={ps.payslipNumber} copiedLabel="Copied" variant="badge" />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-white">{ps.staffName}</p>
                      <p className="text-[12px] text-white/45">{ROLE_SHORT[ps.staffRole] ?? ps.staffRole}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <p className="text-white/85">{period.month}</p>
                      <p className="text-[12px] text-white/45">{period.part}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums text-white/70">{ps.verifiedDutyHours > 0 ? `${ps.verifiedDutyHours} h` : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums text-white/70">{ps.completedStudiesCount > 0 ? ps.completedStudiesCount : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono font-semibold tabular-nums text-white">
                      <Peso />
                      {ps.netPay.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={draft ? "inline-flex items-center gap-1.5 font-medium text-white" : "text-white/60"}>
                        {draft ? <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" /> : null}
                        {draft ? "Needs approval" : ps.status === "APPROVED" ? "Approved, not paid yet" : "Paid"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {draft ? (
                          <Button
                            variant="outline"
                            size="sm"
                            loading={approving === ps.id}
                            onClick={async () => {
                              setApproving(ps.id);
                              await onApprove(ps);
                              setApproving(null);
                            }}
                            className="active:scale-[0.97]"
                          >
                            Approve
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" onClick={() => onView(ps)} className="active:scale-[0.97]">
                          View
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
    </Panel>
  );
}
