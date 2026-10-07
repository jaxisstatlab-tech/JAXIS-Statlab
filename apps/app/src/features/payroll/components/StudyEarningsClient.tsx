"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, KpiCard, Button, Peso } from "@repo/ui";
import { CheckCircle, ClockCountdown, Files, HourglassMedium, MagnifyingGlass } from "@phosphor-icons/react";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { clientPackageName } from "@/features/projects/client-packages";
import type { MyStudyEarningsDTO, StudyEarningItem, StudyEarningState } from "../schemas";

// "My Earnings" for analysts and reviewers: pay for each study, worked out exactly like the payslip (Payroll Settings
// and Money & Pay Rates), and where it stands: paid, on a payslip, on the next payslip, or later.

const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }) : "—";

type Filter = "all" | "paid" | "onPayslip" | "next" | "later" | "stopped";
const FILTER_OF: Record<StudyEarningState, Exclude<Filter, "all">> = {
  paid: "paid",
  onPayslip: "onPayslip",
  next: "next",
  waitingPayment: "later",
  onHold: "later",
  notDelivered: "later",
  stopped: "stopped",
};
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "onPayslip", label: "On a payslip" },
  { key: "next", label: "Next payslip" },
  { key: "later", label: "Later" },
  { key: "stopped", label: "Stopped" },
];
const ORDER: StudyEarningState[] = ["next", "onPayslip", "paid", "waitingPayment", "onHold", "notDelivered", "stopped"];

function StatusText({ s }: { s: StudyEarningItem }) {
  switch (s.state) {
    case "paid":
      return (
        <span className="text-white/80">
          Paid <span className="text-white/45">· {s.payslip?.number}</span>
        </span>
      );
    case "onPayslip":
      return (
        <span className="inline-flex flex-wrap items-center gap-x-1.5 text-white">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
          On payslip <span className="font-mono text-[12px] text-white/55">{s.payslip?.number}</span>
          <span className="text-white/45">({s.payslip?.status === "APPROVED" ? "approved, not paid yet" : "needs approval"})</span>
        </span>
      );
    case "next":
      return (
        <span className="inline-flex items-center gap-1.5 text-white">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
          On your next payslip
        </span>
      );
    case "waitingPayment":
      return <span className="text-white/65">Delivered · waiting for the client&apos;s final payment</span>;
    case "onHold":
      return <span className="text-white/65">On hold · a claim or refund is open</span>;
    case "notDelivered":
      return <span className="text-white/55">Paid after delivery</span>;
    default:
      return <span className="text-white/40">Stopped · no pay</span>;
  }
}

function HowWorkedOut({ s }: { s: StudyEarningItem }) {
  if (s.amount === null) return null;
  const parts: string[] = [];
  if (s.percent > 0 && s.gross !== null) parts.push(`${s.percent}% of ₱${money(s.gross)}`);
  else if (s.percent === 0) parts.push("Flat amount");
  if (s.bonus > 0) parts.push(`₱${money(s.bonus)} extra`);
  return <p className="mt-0.5 text-[12px] text-white/45">{parts.join(" + ")}</p>;
}

export function StudyEarningsClient({
  data,
  failed,
  role,
}: {
  data: MyStudyEarningsDTO | null;
  failed?: string;
  role: "analyst" | "reviewer";
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const home = role === "reviewer" ? { label: "Review Desk", href: "/dashboard/qa" } : { label: "My Studies", href: "/dashboard/statistician" };

  const header = (description: string) => (
    <PageHeader
      title="My Earnings"
      description={description}
      breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, home, { label: "My Earnings" }]}
      actions={
        <Button asChild variant="outline" size="sm" className="active:scale-[0.97]">
          <Link href="/dashboard/staff/hr">My Payslips</Link>
        </Button>
      }
    />
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, paid: 0, onPayslip: 0, next: 0, later: 0, stopped: 0 };
    for (const s of data?.studies ?? []) {
      c.all++;
      c[FILTER_OF[s.state]]++;
    }
    return c;
  }, [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.studies ?? [])
      .filter((s) => (filter === "all" || FILTER_OF[s.state] === filter) && (!q || s.intakeId.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)))
      .sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state) || b.intakeId.localeCompare(a.intakeId));
  }, [data, filter, query]);

  if (!data) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
        {header("What you earn for each study.")}
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/70">{failed || "Your earnings didn't load."} Nothing is lost.</p>
            <Button variant="outline" size="sm" onClick={() => router.refresh()}>
              Try Again
            </Button>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  const later = data.studies.filter((s) => FILTER_OF[s.state] === "later").length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {header(
        data.paysPerStudy
          ? `What you earn for each study you ${role === "reviewer" ? "review" : "analyse"}, worked out the same way as your payslip.`
          : "Your pay doesn't change with the studies you work on.",
      )}

      <Panel as="div">
        <PanelBody>
          <p className="text-[12px] text-white/45">How you&apos;re paid</p>
          <p className="mt-1 text-sm leading-relaxed text-white">{data.payText}</p>
          <p className="mt-1.5 text-[13px] text-white/50">
            Set by the CEO in Payroll Settings{data.paysPerStudy ? "; each package's share is on Money & Pay Rates" : ""}. Study pay is paid on your
            twice-a-month payslip once the study is delivered and the client has paid in full.
          </p>
        </PanelBody>
      </Panel>

      {!data.paysPerStudy ? (
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/70">Your salary or hourly pay is on your payslips.</p>
            <Button asChild variant="primary" size="sm">
              <Link href="/dashboard/staff/hr">Open My Payslips</Link>
            </Button>
          </PanelBody>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Paid"
              description="On payslips already paid"
              icon={<CheckCircle size={18} weight="fill" />}
              value={
                <span className="whitespace-nowrap">
                  <Peso />
                  {money(data.totals.paid)}
                </span>
              }
              badge={`${counts.paid} ${counts.paid === 1 ? "study" : "studies"}`}
            />
            <KpiCard
              label="On a payslip"
              description="Not paid yet"
              icon={<Files size={18} weight="fill" />}
              value={
                <span className="whitespace-nowrap">
                  <Peso />
                  {money(data.totals.onPayslip)}
                </span>
              }
              badge={`${counts.onPayslip} ${counts.onPayslip === 1 ? "study" : "studies"}`}
            />
            <KpiCard
              label="Next payslip"
              description="Delivered and paid by the client"
              icon={<ClockCountdown size={18} weight="fill" />}
              value={
                <span className="whitespace-nowrap">
                  <Peso />
                  {money(data.totals.next)}
                </span>
              }
              badge={`${counts.next} ${counts.next === 1 ? "study" : "studies"}`}
              info="Added when finance makes the next payslips."
            />
            <KpiCard
              label="Coming later"
              description="Estimate, not final"
              icon={<HourglassMedium size={18} weight="fill" />}
              value={
                <span className="whitespace-nowrap">
                  <Peso />
                  {money(data.totals.later)}
                </span>
              }
              badge={`${later} ${later === 1 ? "study" : "studies"}`}
              info="Studies not delivered yet, not fully paid by the client, or on hold. Worked out with today's rates; the amount on the payslip is final."
            />
          </div>

          <Panel>
            <PanelHeader title="Pay per study" count={data.studies.length} subtitle="Ready to be paid first. Amounts on a payslip are final; the rest are estimates." />
            <div className="mt-4 flex flex-col gap-3 px-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]" role="tablist" aria-label="Show studies">
                {FILTERS.filter((f) => f.key === "all" || counts[f.key] > 0 || f.key === filter).map((f) => {
                  const active = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFilter(f.key)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-[2px] px-3 py-1.5 text-[13px] transition-colors ${
                        active ? "bg-white/[0.08] font-medium text-white" : "text-white/55 hover:text-white"
                      }`}
                    >
                      {f.label}
                      <span className={`font-mono text-[11px] ${active ? "text-white/60" : "text-white/35"}`}>{counts[f.key]}</span>
                    </button>
                  );
                })}
              </div>
              <label className="relative flex w-full items-center sm:w-64">
                <MagnifyingGlass size={14} weight="bold" className="pointer-events-none absolute left-3 text-white/35" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ID or title"
                  aria-label="Search studies"
                  className="h-9 w-full rounded-[2px] border border-white/10 bg-[#050513] pl-8 pr-3 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-[#CC6600]/60"
                />
              </label>
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <p className="text-sm text-white/60">{data.studies.length === 0 ? "No studies yet. Pay shows up here as studies are assigned to you." : "No studies match."}</p>
                {data.studies.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilter("all");
                      setQuery("");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : null}
              </div>
            ) : (
              <>
                <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06] md:hidden">
                  {rows.map((s) => (
                    <li key={s.projectId} className="flex flex-col gap-1.5 px-5 py-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-white/55">{s.intakeId}</span>
                        <span className="text-sm font-semibold text-white tabular-nums">
                          {s.amount === null ? "—" : (
                            <>
                              <Peso />
                              {money(s.amount)}
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-white">{s.title}</p>
                      <HowWorkedOut s={s} />
                      <p className="text-[13px]">
                        <StatusText s={s} />
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 hidden overflow-x-auto border-t border-white/[0.06] md:block">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                        <th className="px-5 py-2.5 font-medium sm:px-6">Study</th>
                        <th className="px-3 py-2.5 text-right font-medium">Your pay</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-5 py-2.5 font-medium sm:px-6">Delivered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {rows.map((s) => (
                        <tr key={s.projectId} className="align-top transition-colors hover:bg-white/[0.02]">
                          <td className="max-w-[420px] px-5 py-3.5 sm:px-6">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-white/55">{s.intakeId}</span>
                              {clientPackageName(s.packageName) ? <span className="truncate text-[12px] text-white/40">{clientPackageName(s.packageName)}</span> : null}
                            </div>
                            <p className="mt-1 truncate text-sm text-white" title={s.title}>
                              {s.title}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-right">
                            <p className="text-sm font-semibold tabular-nums text-white">
                              {s.amount === null ? (
                                <span className="font-normal text-white/35">—</span>
                              ) : (
                                <>
                                  <Peso />
                                  {money(s.amount)}
                                </>
                              )}
                            </p>
                            <HowWorkedOut s={s} />
                          </td>
                          <td className="px-3 py-3.5 text-[13px]">
                            <StatusText s={s} />
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-white/60 sm:px-6">{shortDate(s.deliveredAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
