"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KpiCard, Button, PageHeader, Toast, Switch, Pagination } from "@repo/ui";
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  ClockCountdown,
  Desktop,
  DeviceMobile,
  ListChecks,
  MagnifyingGlass,
  UserCircleCheck,
} from "@phosphor-icons/react";
import { updateCompanyAttendancePolicy } from "@/features/attendance/actions";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import type {
  StaffAttendanceItem,
  AttendanceCorrectionItem,
  AttendanceSummaryKPIs,
  AttendancePolicyDTO,
} from "@/features/attendance/schemas";

// Staff Timesheets (CEO): who uses the time clock (only staff paid by the hour), their shifts, missed-punch
// requests, and the clock rules. Who uses the clock is set in Payroll Settings, per role or per person.

export interface ClockUser {
  id: string;
  name: string;
  role: string;
  /** Set on the person themselves, not their role. */
  personal: boolean;
}

export interface CeoAttendanceAuditClientProps {
  initialData: {
    allLogs: StaffAttendanceItem[];
    allCorrections: AttendanceCorrectionItem[];
    kpis: AttendanceSummaryKPIs;
    policyConfig: AttendancePolicyDTO | null;
  };
  clockUsers: ClockUser[] | null;
}

type ToastState = { message: string; description?: string; variant: "success" | "warning" | "danger" | "info" } | null;
type Tab = "SHIFTS" | "CORRECTIONS" | "RULES";

const ROLE_LABEL: Record<string, string> = {
  STATISTICIAN: "Analyst",
  SENIOR_QA_LEAD: "Reviewer",
  FINANCE_OFFICER: "Finance",
  ADMIN: "Admin",
  CEO: "CEO",
};

const CORRECTION_LABEL: Record<string, string> = {
  MISSED_CLOCK_IN: "Forgot to clock in",
  MISSED_CLOCK_OUT: "Forgot to clock out",
  MISSED_FULL_SHIFT: "Missed a whole shift",
  BREAK_ADJUSTMENT: "Break time fix",
  OVERTIME_CLAIM: "Overtime",
};

const DEFAULT_POLICY: AttendancePolicyDTO = {
  allowWeekendWork: true,
  allowHolidayWork: true,
  operatingHoursMode: "FLEXIBLE_24_7",
  coreHoursStart: "08:00",
  coreHoursEnd: "18:00",
  autoDeductMealBreak: true,
  mealBreakMinutes: 60,
  mealBreakThresholdHours: 5.0,
  baseHourlyRate: 450.0,
  maxShiftCapHours: 14,
};

function dayTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeOnly(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }) : "—";
}

function shiftStatus(log: StaffAttendanceItem): { label: string; strong?: boolean } {
  if (log.status === "IN_PROGRESS") return { label: "On the clock", strong: true };
  if (log.status === "AUTO_CLOSED") return { label: "Closed automatically" };
  if (log.status === "ADJUSTED" || log.isAdjusted) return { label: "Fixed by HR" };
  if (log.status === "VOIDED") return { label: "Cancelled" };
  return { label: "Done" };
}

export function CeoAttendanceAuditClient({ initialData, clockUsers }: CeoAttendanceAuditClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("SHIFTS");
  const [toast, setToast] = useState<ToastState>(null);
  const kpis = initialData.kpis;
  const pendingCorrections = initialData.allCorrections.filter((c) => c.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title="Staff Timesheets"
        description="Clock-in records for staff paid by the hour, and the rules for the time clock."
        breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, { label: "Staff Timesheets" }]}
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5 active:scale-[0.97]">
            <Link href="/dashboard/ceo/payroll">
              Payroll Settings
              <ArrowRight size={14} weight="bold" />
            </Link>
          </Button>
        }
      />

      <ClockUsersPanel clockUsers={clockUsers} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Hours this month" description="Clocked by hourly staff" icon={<Clock size={18} weight="fill" />} value={kpis.totalHoursThisMonth} unit="hrs" />
        <KpiCard
          label="On the clock now"
          description={kpis.onDutyStaffCount === 1 ? "1 person working" : `${kpis.onDutyStaffCount} people working`}
          icon={<UserCircleCheck size={18} weight="fill" />}
          value={kpis.onDutyStaffCount}
        />
        <KpiCard label="Shifts recorded" description="Latest 100 shifts" icon={<ListChecks size={18} weight="fill" />} value={kpis.completedShiftsCount} />
        <KpiCard
          label="Requests waiting"
          description="Missed punches and overtime"
          icon={<ClockCountdown size={18} weight="fill" />}
          value={pendingCorrections}
          href={pendingCorrections > 0 ? "/dashboard/finance/attendance" : undefined}
        />
      </div>

      <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]" role="tablist" aria-label="Timesheet sections">
        {(
          [
            { id: "SHIFTS", label: "Shifts", count: initialData.allLogs.length },
            { id: "CORRECTIONS", label: "Missed punches & overtime", count: initialData.allCorrections.length },
            { id: "RULES", label: "Clock rules" },
          ] as Array<{ id: Tab; label: string; count?: number }>
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
              {t.label}
              {t.count !== undefined ? <span className={`font-mono text-[11px] ${active ? "text-white/60" : "text-white/35"}`}>{t.count}</span> : null}
            </button>
          );
        })}
      </div>

      {tab === "SHIFTS" ? <ShiftsPanel logs={initialData.allLogs} /> : null}
      {tab === "CORRECTIONS" ? <CorrectionsPanel corrections={initialData.allCorrections} /> : null}
      {tab === "RULES" ? (
        <RulesPanel
          initial={initialData.policyConfig || DEFAULT_POLICY}
          onSaved={() => {
            setToast({ variant: "success", message: "Clock rules saved", description: "They apply to the next clock-in." });
            router.refresh();
          }}
          onError={(message) => setToast({ variant: "danger", message: "Couldn't save the rules", description: message })}
        />
      ) : null}

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function ClockUsersPanel({ clockUsers }: { clockUsers: ClockUser[] | null }) {
  return (
    <Panel>
      <PanelHeader
        title="Who uses the time clock"
        subtitle="Only staff paid by the hour clock in. Everyone else sees Clock In greyed out, and hours never change their pay."
        aside={
          <Button asChild variant="ghost" size="sm" className="gap-1 active:scale-[0.97]">
            <Link href="/dashboard/ceo/payroll">Change</Link>
          </Button>
        }
      />
      <PanelBody>
        {clockUsers === null ? (
          <p className="text-[13px] text-white/55">Couldn&apos;t load the pay settings. Open Payroll Settings to check.</p>
        ) : clockUsers.length === 0 ? (
          <p className="text-[13px] text-white/70">
            <span className="font-medium text-white">Nobody right now.</span> To use the clock for someone, set their role (or just
            them) to <span className="text-white">Hourly Wage</span> in Payroll Settings.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {clockUsers.map((u) => (
              <li key={u.id} className="inline-flex items-center gap-2 rounded-[2px] border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[13px] text-white">
                {u.name}
                <span className="text-[12px] text-white/45">
                  {ROLE_LABEL[u.role] ?? u.role}
                  {u.personal ? " · own setting" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}

function ShiftsPanel({ logs }: { logs: StaffAttendanceItem[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "/" && !(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT"))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((l) => !q || l.staffName.toLowerCase().includes(q) || (ROLE_LABEL[l.staffRole] ?? "").toLowerCase().includes(q));
  }, [logs, query]);
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Panel>
      <PanelHeader
        title="Shifts"
        subtitle="Newest first."
        aside={
          <label className="relative flex w-56 items-center">
            <MagnifyingGlass size={14} weight="bold" className="pointer-events-none absolute left-3 text-white/35" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("");
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search name or role"
              aria-label="Search shifts"
              className="h-9 w-full rounded-[2px] border border-white/10 bg-[#050513] pl-8 pr-9 font-sans text-[13px] text-white outline-none placeholder:text-white/35 focus:border-[#CC6600]/60"
            />
            <kbd className="pointer-events-none absolute right-2.5 rounded-[2px] border border-white/15 px-1.5 font-mono text-[10px] text-white/40">/</kbd>
          </label>
        }
      />
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-sm text-white/60">{logs.length === 0 ? "No shifts yet." : "No shifts match."}</p>
          {logs.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setQuery("")}>
              Clear Search
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto border-t border-white/[0.06]">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                  <th className="px-6 py-2.5 font-medium">Person</th>
                  <th className="px-3 py-2.5 font-medium">Clocked in</th>
                  <th className="px-3 py-2.5 font-medium">Out</th>
                  <th className="px-3 py-2.5 font-medium">Break</th>
                  <th className="px-3 py-2.5 font-medium">Hours</th>
                  <th className="px-3 py-2.5 font-medium">Device</th>
                  <th className="px-6 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-[13px]">
                {shown.map((log) => {
                  const st = shiftStatus(log);
                  return (
                    <tr key={log.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-6 py-3">
                        <p className="font-medium text-white">{log.staffName}</p>
                        <p className="text-[12px] text-white/45">{ROLE_LABEL[log.staffRole] ?? log.staffRole}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-white/80">{dayTime(log.clockInAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-white/80">{timeOnly(log.clockOutAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-white/55">{log.breakMinutes} min</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold tabular-nums text-white">{log.netHoursFormatted}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-white/60">
                        <span className="inline-flex items-center gap-1.5">
                          {log.isMobile ? <DeviceMobile size={14} weight="fill" /> : <Desktop size={14} weight="fill" />}
                          {log.isMobile ? "Phone" : log.deviceLabel || "Computer"}
                        </span>
                        {log.ipAddress ? <span className="block font-mono text-[11px] text-white/30">{log.ipAddress}</span> : null}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <span className={`inline-flex items-center gap-1.5 ${st.strong ? "font-medium text-white" : "text-white/60"}`}>
                          {st.strong ? <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" /> : null}
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalItems={rows.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            itemLabel="shifts"
          />
        </>
      )}
    </Panel>
  );
}

function CorrectionsPanel({ corrections }: { corrections: AttendanceCorrectionItem[] }) {
  return (
    <Panel>
      <PanelHeader
        title="Missed punches & overtime"
        subtitle="Requests from hourly staff. Finance approves or declines them."
        aside={
          <Button asChild variant="ghost" size="sm" className="gap-1 active:scale-[0.97]">
            <Link href="/dashboard/finance/attendance">
              Review
              <ArrowRight size={13} weight="bold" />
            </Link>
          </Button>
        }
      />
      {corrections.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-white/55">No requests yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto border-t border-white/[0.06]">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-6 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Person</th>
                <th className="px-3 py-2.5 font-medium">What</th>
                <th className="px-3 py-2.5 font-medium">Hours asked</th>
                <th className="px-3 py-2.5 font-medium">Why</th>
                <th className="px-6 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-[13px]">
              {corrections.map((c) => (
                <tr key={c.id} className="align-top transition-colors hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-6 py-3 text-white/80">
                    {new Date(c.targetDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-white">{c.staffName}</p>
                    <p className="text-[12px] text-white/45">{ROLE_LABEL[c.staffRole] ?? c.staffRole}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-white/75">{CORRECTION_LABEL[c.correctionType] ?? c.correctionType}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold tabular-nums text-white">{c.claimedNetHours} hrs</td>
                  <td className="max-w-[280px] px-3 py-3 text-white/65">
                    <p className="line-clamp-2" title={c.reason}>
                      {c.reason}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3">
                    <span className={c.status === "PENDING" ? "inline-flex items-center gap-1.5 font-medium text-white" : "text-white/60"}>
                      {c.status === "PENDING" ? <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" /> : null}
                      {c.status === "PENDING" ? "Waiting" : c.status === "APPROVED" ? "Approved" : "Declined"}
                    </span>
                    {c.reviewerName ? (
                      <p className="text-[12px] text-white/40">
                        by {c.reviewerName}
                        {c.reviewedAt ? `, ${new Date(c.reviewedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}` : ""}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function RulesPanel({
  initial,
  onSaved,
  onError,
}: {
  initial: AttendancePolicyDTO;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [policy, setPolicy] = useState<AttendancePolicyDTO>(initial);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<AttendancePolicyDTO>) => setPolicy((p) => ({ ...p, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await updateCompanyAttendancePolicy(policy);
      if (res.success) {
        setPolicy(res.data);
        onSaved();
      } else onError(res.error.message);
    } catch {
      onError("Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const select =
    "h-9 rounded-[2px] border border-white/10 bg-[#050513] px-3 font-sans text-[13px] text-white outline-none focus:border-[#CC6600]/60 disabled:opacity-40";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel>
        <PanelHeader title="When people can clock in" subtitle="For hourly staff only." />
        <PanelBody className="flex flex-col gap-4">
          <RuleRow
            title="Weekends"
            text="Let people clock in on Saturdays and Sundays."
            control={<Switch checked={policy.allowWeekendWork} onCheckedChange={(v) => set({ allowWeekendWork: v })} aria-label="Allow weekends" />}
          />
          <RuleRow
            title="Holidays"
            text="Let people clock in on Philippine holidays."
            control={<Switch checked={policy.allowHolidayWork} onCheckedChange={(v) => set({ allowHolidayWork: v })} aria-label="Allow holidays" />}
          />
          <RuleRow
            title="Set working hours"
            text={policy.operatingHoursMode === "FIXED_CORE_HOURS" ? "Clock-ins only between these times." : "Off: people can clock in at any hour."}
            control={
              <Switch
                checked={policy.operatingHoursMode === "FIXED_CORE_HOURS"}
                onCheckedChange={(v) => set({ operatingHoursMode: v ? "FIXED_CORE_HOURS" : "FLEXIBLE_24_7" })}
                aria-label="Use set working hours"
              />
            }
          />
          {policy.operatingHoursMode === "FIXED_CORE_HOURS" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
                From
                <input type="time" value={policy.coreHoursStart} onChange={(e) => set({ coreHoursStart: e.target.value })} className={select} />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
                Until
                <input type="time" value={policy.coreHoursEnd} onChange={(e) => set({ coreHoursEnd: e.target.value })} className={select} />
              </label>
            </div>
          ) : null}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Breaks and long shifts" subtitle="Applied when someone clocks out." />
        <PanelBody className="flex flex-col gap-4">
          <RuleRow
            title="Take off a lunch break"
            text="Subtract a break from long shifts automatically."
            control={<Switch checked={policy.autoDeductMealBreak} onCheckedChange={(v) => set({ autoDeductMealBreak: v })} aria-label="Take off a lunch break" />}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
              Break length
              <select disabled={!policy.autoDeductMealBreak} value={policy.mealBreakMinutes} onChange={(e) => set({ mealBreakMinutes: Number(e.target.value) })} className={select}>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1 hour 30 minutes</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
              For shifts of at least
              <select
                disabled={!policy.autoDeductMealBreak}
                value={policy.mealBreakThresholdHours}
                onChange={(e) => set({ mealBreakThresholdHours: Number(e.target.value) })}
                className={select}
              >
                <option value={4}>4 hours</option>
                <option value={5}>5 hours</option>
                <option value={6}>6 hours</option>
                <option value={8}>8 hours</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
            Clock out automatically after
            <select value={policy.maxShiftCapHours} onChange={(e) => set({ maxShiftCapHours: Number(e.target.value) })} className={select}>
              {[10, 12, 14, 16, 20].map((h) => (
                <option key={h} value={h}>
                  {h} hours
                </option>
              ))}
            </select>
            <span className="text-[12px] text-white/40">For when someone forgets to clock out. They can ask for a fix afterwards.</span>
          </label>
        </PanelBody>
      </Panel>

      <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-[13px] text-white/50">
          <CalendarCheck size={15} weight="fill" className="shrink-0" />
          Hourly rates are set per role or person in Payroll Settings.
        </p>
        <Button variant="primary" size="sm" onClick={save} loading={saving} className="active:scale-[0.97]">
          Save Rules
        </Button>
      </div>
    </div>
  );
}

function RuleRow({ title, text, control }: { title: string; text: string; control: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-0.5 text-[13px] text-white/55">{text}</p>
      </div>
      <div className="pt-0.5">{control}</div>
    </div>
  );
}
