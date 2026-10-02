"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { PageHeader, KpiCard, Button, AreaChart, Pagination, Peso, Toast, CopyButton } from "@repo/ui";
import {
  ArrowRight,
  Bank,
  CalendarCheck,
  Coins,
  DeviceMobile,
  HandCoins,
  PencilSimple,
  Receipt,
  UsersThree,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import { Meter, Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { PendingLeaveQueue } from "@/features/staff/components/PendingLeaveQueue";
import type { FinanceOverviewData, StudyReceivableItem } from "@/features/payments/schemas";
import type { PaymentChannelDetails } from "@/lib/payment-rules";

// Finance Overview (finance officers, and the CEO from "Finance & Payments"): money in, what's still owed,
// receipts waiting for a check, and the accounts clients pay into. Every figure is from real records.

const PaymentChannelSettingsModal = dynamic(
  () => import("@/features/payments/components/PaymentChannelSettingsModal").then((m) => m.PaymentChannelSettingsModal),
  { ssr: false }
);

type ToastState = { message: string; description?: string; variant: "info" | "success" | "warning" | "danger" } | null;

const money = (n: number) => Math.round(n).toLocaleString("en-PH");

function shortMoney(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `₱${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `₱${Math.round(n)}`;
}

function changeLine(current: number, previous: number, prevLabel: string) {
  if (previous <= 0) return undefined;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: `same as ${prevLabel}`, direction: "flat" as const };
  return { text: `${pct > 0 ? "up" : "down"} ${Math.abs(pct)}% from ${prevLabel}`, direction: pct > 0 ? ("up" as const) : ("down" as const) };
}

const METHOD_LABEL: Record<string, string> = { GCASH: "GCash", BANK_TRANSFER: "Bank transfer", UNKNOWN: "Not recorded" };

interface FinanceDashboardClientProps {
  initialData: FinanceOverviewData | null;
  initialChannels: PaymentChannelDetails[] | null;
}

export function FinanceDashboardClient({ initialData, initialChannels }: FinanceDashboardClientProps) {
  const router = useRouter();
  const [channels, setChannels] = useState<PaymentChannelDetails[] | null>(initialChannels);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const data = initialData;
  const toCheck = data?.kpis.pendingClearancesCount ?? 0;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title="Finance Overview"
        description={
          toCheck > 0
            ? `${toCheck} ${toCheck === 1 ? "receipt is" : "receipts are"} waiting for a check. Here's the money side of every study.`
            : "No receipts waiting. Here's the money side of every study."
        }
        breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, { label: "Finance Overview" }]}
        actions={
          <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center">
            <Button asChild variant="ghost" size="sm" className="gap-1.5 active:scale-[0.97]">
              <Link href="/dashboard/finance/leaves">
                <CalendarCheck size={15} weight="fill" className="text-white/60" />
                Staff Leaves
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 active:scale-[0.97]">
              <Link href="/dashboard/finance/payroll">
                <UsersThree size={15} weight="fill" className="text-white/60" />
                Staff Payroll
              </Link>
            </Button>
            <Button asChild variant={toCheck > 0 ? "primary" : "outline"} size="sm" className="gap-1.5 active:scale-[0.97]">
              <Link href="/dashboard/finance/payments">
                <Receipt size={15} weight="fill" />
                Check Payments{toCheck > 0 ? ` (${toCheck})` : ""}
                <ArrowRight size={14} weight="bold" />
              </Link>
            </Button>
          </div>
        }
      />

      {!data ? (
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Warning size={20} weight="fill" className="mt-0.5 shrink-0 text-white/50" />
              <div>
                <p className="text-sm font-medium text-white">The payment totals didn&apos;t load.</p>
                <p className="mt-0.5 text-[13px] text-white/55">The database took too long to answer. Nothing was changed.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.refresh()} className="active:scale-[0.97]">
              Try Again
            </Button>
          </PanelBody>
        </Panel>
      ) : (
        <>
          <KpiRow data={data} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <MoneyPanel data={data} />
            <div className="flex flex-col gap-6 lg:col-span-4">
              <AccountsPanel channels={channels} onEdit={() => setIsAccountsOpen(true)} />
              <MethodsPanel data={data} />
            </div>
          </div>
        </>
      )}

      <PendingLeaveQueue
        onStatusChange={() => router.refresh()}
        title="Leave requests"
        subtitle="Staff waiting for an answer about time off."
      />

      {data ? <PaymentsTable rows={data.receivables} /> : null}

      <PaymentChannelSettingsModal
        open={isAccountsOpen}
        onClose={() => setIsAccountsOpen(false)}
        onSuccess={(saved) => {
          setChannels(saved);
          const shown = saved.filter((c) => c.isEnabled !== false).length;
          setToast({
            message: "Payment accounts saved",
            description:
              shown > 0
                ? `Clients now see ${shown} ${shown === 1 ? "account" : "accounts"} on their Payment page.`
                : "No account is shown to clients right now.",
            variant: shown > 0 ? "success" : "warning",
          });
          router.refresh();
        }}
      />

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function KpiRow({ data }: { data: FinanceOverviewData }) {
  const months = data.months ?? [];
  const collected = data.collectedByMonth ?? [];
  const paidOut = data.paidOutByMonth ?? [];
  const n = months.length;
  const prevLabel = months[n - 2] ?? "last month";
  const thisMonth = collected[n - 1] ?? 0;
  const lastMonth = collected[n - 2] ?? 0;
  const owing = data.receivables.filter((r) => r.remainingBalance > 0).length;
  const toCheck = data.kpis.pendingClearancesCount;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Collected"
        description="This month, payments checked"
        icon={<Coins size={18} weight="fill" />}
        value={
          <span className="whitespace-nowrap">
            <Peso />
            {money(thisMonth)}
          </span>
        }
        change={changeLine(thisMonth, lastMonth, prevLabel)}
        badge={lastMonth <= 0 ? `Nothing in ${prevLabel}` : undefined}
        trend={collected.some((v) => v > 0) ? collected : undefined}
        trendStyle="bars"
        trendLabel="Money collected per month, last 6 months"
        info={`Counted on the day a payment was checked. All time: ₱${money(data.kpis.totalVaultCleared)}.`}
      />
      <KpiCard
        label="Still owed"
        description={owing > 0 ? `By clients on ${owing} ${owing === 1 ? "study" : "studies"}` : "Nothing owed right now"}
        icon={<HandCoins size={18} weight="fill" />}
        value={
          <span className="whitespace-nowrap">
            <Peso />
            {money(data.kpis.totalOutstandingReceivables)}
          </span>
        }
        info="The accepted price minus checked payments, for studies that aren't stopped. Studies without an accepted price aren't counted."
      />
      <KpiCard
        label="Waiting for a check"
        description={
          toCheck > 0 ? (
            <>
              Receipts worth <Peso />
              {money(data.pendingProofAmount ?? 0)}
            </>
          ) : (
            "No receipts waiting"
          )
        }
        icon={<Receipt size={18} weight="fill" />}
        value={toCheck}
        href="/dashboard/finance/payments"
      />
      <KpiCard
        label="Paid to staff"
        description="This month, analyst and reviewer pay sent"
        icon={<UsersThree size={18} weight="fill" />}
        value={
          <span className="whitespace-nowrap">
            <Peso />
            {money(paidOut[n - 1] ?? 0)}
          </span>
        }
        trend={paidOut.some((v) => v > 0) ? paidOut : undefined}
        trendStyle="bars"
        trendLabel="Staff pay sent per month, last 6 months"
      />
    </div>
  );
}

function MoneyPanel({ data }: { data: FinanceOverviewData }) {
  const months = data.months ?? [];
  const collected = data.collectedByMonth ?? [];
  const paidOut = data.paidOutByMonth ?? [];
  const totalIn = collected.reduce((a, b) => a + b, 0);
  const totalOut = paidOut.reduce((a, b) => a + b, 0);
  const chart = months.map((m, i) => ({ month: m, "Collected from clients": collected[i] ?? 0, "Paid to staff": paidOut[i] ?? 0 }));
  return (
    <Panel className="lg:col-span-8">
      <PanelHeader
        title="Money in and out"
        subtitle="Checked client payments and staff pay sent, per month"
        aside={
          <div className="text-right">
            <p className="font-sans text-xl font-semibold tabular-nums text-white">
              <Peso />
              {money(totalIn - totalOut)}
            </p>
            <p className="text-xs text-white/45">kept in 6 months</p>
          </div>
        }
      />
      <div className="flex items-center gap-4 px-5 pt-4 text-[12px] text-white/60 sm:px-6">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#CC6600]" aria-hidden="true" />
          Collected from clients
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#8A8AA0]" aria-hidden="true" />
          Paid to staff
        </span>
      </div>
      <PanelBody className="relative min-h-[300px] flex-1">
        {totalIn > 0 || totalOut > 0 ? (
          <div className="absolute inset-x-5 inset-y-5 sm:inset-x-6">
            <AreaChart
              data={chart}
              index="month"
              categories={["Collected from clients", "Paid to staff"]}
              colors={["#CC6600", "#8A8AA0"]}
              valueFormatter={(v) => `₱${money(v)}`}
              yAxisFormatter={shortMoney}
              yAxisWidth={64}
              showLegend={false}
              height="100%"
              className="h-full"
            />
          </div>
        ) : (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 text-center">
            <Coins size={22} weight="fill" className="text-white/25" />
            <p className="text-sm text-white/60">No money in or out in the last 6 months yet.</p>
            <p className="text-[13px] text-white/40">The chart fills in as payments are checked and staff are paid.</p>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

/** What clients see on their Payment page, with one button to change it. */
function AccountsPanel({ channels, onEdit }: { channels: PaymentChannelDetails[] | null; onEdit: () => void }) {
  const list = channels ?? [];
  const shown = list.filter((c) => c.isEnabled !== false);
  return (
    <Panel className={shown.length === 0 ? "border-[#CC6600]/40" : ""}>
      <PanelHeader
        title="Payment accounts"
        subtitle="Where clients send money"
        aside={
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5 active:scale-[0.97]">
            <PencilSimple size={14} weight="fill" />
            Edit
          </Button>
        }
      />
      <PanelBody>
        {channels === null ? (
          <p className="text-[13px] text-white/60">The accounts didn&apos;t load. Open Edit to try again.</p>
        ) : list.length === 0 || shown.length === 0 ? (
          <p className="flex items-start gap-2 text-[13px] text-white/80">
            <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-[#CC6600]" />
            Clients can&apos;t see where to pay. Add a GCash number or bank account.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/[0.06]">
            {list.map((c, i) => {
              const gcash = c.id === "GCASH";
              const on = c.isEnabled !== false;
              return (
                <li key={`${c.id}-${c.accountNumber}-${i}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs text-white/55">
                      {gcash ? <DeviceMobile size={13} weight="fill" /> : <Bank size={13} weight="fill" />}
                      {gcash ? "GCash" : c.institution || "Bank"}
                    </p>
                    <p className={`mt-1 font-mono text-sm font-semibold ${on ? "text-white" : "text-white/40 line-through"}`}>{c.accountNumber}</p>
                    <p className="truncate text-[12px] text-white/50">{c.accountName}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-[2px] border px-2 py-0.5 text-[11px] ${
                      on ? "border-white/15 bg-white/[0.06] text-white/75" : "border-white/10 text-white/40"
                    }`}
                  >
                    {on ? "Shown" : "Hidden"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}

function MethodsPanel({ data }: { data: FinanceOverviewData }) {
  const methods = data.byMethod ?? [];
  const total = methods.reduce((s, m) => s + m.amount, 0);
  return (
    <Panel className="flex-1">
      <PanelHeader title="How clients paid" subtitle="Checked payments, all time" />
      <PanelBody>
        {methods.length === 0 ? (
          <p className="text-[13px] text-white/50">No checked payments yet.</p>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {methods.map((m) => (
              <li key={m.method}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="text-white/80">
                    {METHOD_LABEL[m.method] ?? m.method}
                    <span className="text-white/40">{` · ${m.count} ${m.count === 1 ? "payment" : "payments"}`}</span>
                  </span>
                  <span className="font-mono tabular-nums text-white">
                    <Peso />
                    {money(m.amount)}
                  </span>
                </div>
                <Meter value={m.amount} max={total || 1} label={`${METHOD_LABEL[m.method] ?? m.method}: ${money(m.amount)}`} />
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}

type Filter = "all" | "deposit" | "partial" | "paid" | "overpaid";

const FILTERS: Array<{ value: Filter; label: string; match: (r: StudyReceivableItem) => boolean }> = [
  { value: "all", label: "All", match: () => true },
  { value: "deposit", label: "Waiting for deposit", match: (r) => !r.isDownpaymentCleared && r.remainingBalance > 0 },
  { value: "partial", label: "Deposit paid", match: (r) => r.isDownpaymentCleared && !r.isFullyPaid && !r.isOverpaid },
  { value: "paid", label: "Paid in full", match: (r) => r.isFullyPaid },
  { value: "overpaid", label: "Paid too much", match: (r) => Boolean(r.isOverpaid) },
];

function statusText(r: StudyReceivableItem) {
  if (r.isOverpaid) return "Paid too much";
  if (r.isFullyPaid) return "Paid in full";
  if (r.isDownpaymentCleared) return "Deposit paid";
  if (r.remainingBalance === 0) return "Stopped";
  return "Waiting for deposit";
}

function PaymentsTable({ rows }: { rows: StudyReceivableItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.value, rows.filter(f.match).length])) as Record<Filter, number>,
    [rows]
  );
  const filtered = rows.filter(FILTERS.find((f) => f.value === filter)!.match);
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Panel>
      <PanelHeader title="Client payments" count={rows.length} subtitle="Studies with an accepted price: what they cost, what's paid, and what's left." />
      <div className="mt-4 -mx-1 flex items-center gap-1 overflow-x-auto px-6 [scrollbar-width:none] sm:px-7" role="tablist" aria-label="Show studies">
        {FILTERS.filter((f) => f.value === "all" || counts[f.value] > 0 || f.value === filter).map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setFilter(f.value);
                setPage(1);
              }}
              className={`inline-flex shrink-0 items-center gap-2 rounded-[2px] px-3 py-1.5 font-sans text-[13px] transition-colors ${
                active ? "bg-white/[0.08] font-medium text-white" : "text-white/55 hover:text-white"
              }`}
            >
              {f.label}
              <span className={`font-mono text-[11px] ${active ? "text-white/60" : "text-white/35"}`}>{counts[f.value]}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-sm text-white/60">{rows.length === 0 ? "No studies have an accepted price yet." : "No studies match."}</p>
          {rows.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
              Clear Filters
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06] md:hidden">
            {shown.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <CopyButton value={r.intakeId} label={r.intakeId} copiedLabel="Copied" variant="badge" />
                  <span className="text-[12px] text-white/60">{statusText(r)}</span>
                </div>
                <p className="text-sm text-white">{r.researchTitle}</p>
                <p className="-mt-1 text-[13px] text-white/50">{r.clientName}</p>
                <PaidCell r={r} />
                <Button asChild variant="outline" size="sm" className="self-start">
                  <Link href={`/dashboard/finance/projects/${r.id}/payment`}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-4 hidden overflow-x-auto border-t border-white/[0.06] md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                  <th className="px-6 py-2.5 font-medium">Study</th>
                  <th className="px-3 py-2.5 font-medium">Paid</th>
                  <th className="px-3 py-2.5 text-right font-medium">Left to pay</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-6 py-2.5" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {shown.map((r) => (
                  <tr
                    key={r.id}
                    className="align-top transition-colors hover:bg-white/[0.02]"
                    onMouseEnter={() => router.prefetch(`/dashboard/finance/projects/${r.id}/payment`)}
                  >
                    <td className="max-w-[360px] px-6 py-3.5">
                      <CopyButton value={r.intakeId} label={r.intakeId} copiedLabel="Copied" variant="badge" />
                      <p className="mt-1.5 truncate text-sm text-white" title={r.researchTitle}>
                        {r.researchTitle}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-white/50">
                        {r.clientName}
                        {r.university ? <span className="text-white/35">{` · ${r.university}`}</span> : null}
                      </p>
                    </td>
                    <td className="min-w-[200px] px-3 py-3.5">
                      <PaidCell r={r} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right font-mono text-[13px] tabular-nums">
                      {r.isOverpaid ? (
                        <span className="text-white">
                          +<Peso />
                          {money(r.overpaidAmount ?? 0)} over
                        </span>
                      ) : r.remainingBalance > 0 ? (
                        <span className="font-semibold text-white">
                          <Peso />
                          {money(r.remainingBalance)}
                        </span>
                      ) : (
                        <span className="text-white/35">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5">
                      <span className="rounded-[2px] border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[12px] text-white/75">{statusText(r)}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right">
                      <Button asChild variant="ghost" size="sm" className="gap-1 active:scale-[0.97]">
                        <Link href={`/dashboard/finance/projects/${r.id}/payment`}>
                          Open
                          <ArrowRight size={13} weight="bold" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            itemLabel="studies"
          />
        </>
      )}
    </Panel>
  );
}

function PaidCell({ r }: { r: StudyReceivableItem }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono text-[13px] tabular-nums">
        <span className="font-semibold text-white">
          <Peso />
          {money(r.totalPaidAmount)}
        </span>
        <span className="text-white/40">{` of ${money(r.totalContractAmount)}`}</span>
      </p>
      <Meter value={r.totalPaidAmount} max={r.totalContractAmount || 1} label={`${r.intakeId} paid`} className="max-w-[180px]" />
    </div>
  );
}
