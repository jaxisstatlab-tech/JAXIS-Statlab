"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  KpiCard,
  Button,
  Modal,
  Toast,
  CopyButton,
  AreaChart,
  Peso,
} from "@repo/ui";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle,
  Coins,
  FolderSimplePlus,
  HandCoins,
  MagnifyingGlass,
  Trash,
  UserMinus,
  Warning,
} from "@phosphor-icons/react";
import {
  Meter,
  Panel,
  PanelBody,
  PanelHeader,
} from "@/components/dashboard/Panel";
import { DeleteStudyDialog } from "@/features/projects/components/DeleteStudyDialog";
import { clientPackageName } from "@/features/projects/client-packages";
import {
  STAGES,
  STUDY_LIMIT,
  type CeoOverview,
  type OverviewStudy,
  type StageKey,
} from "@/features/ceo/overview-types";
import {
  findAccountByEmail,
  deleteAccount,
  type AccountSummary,
} from "@/features/accounts/actions";

type ToastState = {
  message: string;
  description?: string;
  variant: "info" | "success" | "warning" | "danger";
} | null;

const money = (n: number) => Math.round(n).toLocaleString("en-PH");

function shortMoney(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `₱${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `₱${Math.round(n)}`;
}

function shortDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  });
}

/** "up 12% from Sep" / "down 4% from Sep" / "same as Sep"; nothing when last month was zero. */
function changeLine(current: number, previous: number, prevLabel: string) {
  if (previous <= 0) return undefined;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0)
    return { text: `same as ${prevLabel}`, direction: "flat" as const };
  return {
    text: `${pct > 0 ? "up" : "down"} ${Math.abs(pct)}% from ${prevLabel}`,
    direction: pct > 0 ? ("up" as const) : ("down" as const),
  };
}

export function CEODashboardClient({
  overview,
}: {
  overview: CeoOverview | null;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);

  if (!overview) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
        <Header attentionCount={null} />
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Warning
                size={20}
                weight="fill"
                className="mt-0.5 shrink-0 text-white/50"
              />
              <div>
                <p className="text-sm font-medium text-white">
                  The overview didn&apos;t load.
                </p>
                <p className="mt-0.5 text-[13px] text-white/55">
                  The database took too long to answer. Your data is safe.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
              className="active:scale-[0.97]"
            >
              Try Again
            </Button>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  const attentionCount = overview.attention.reduce(
    (sum, a) => sum + a.count,
    0,
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <Header attentionCount={attentionCount} />

      {overview.offline ? (
        <p className="-mt-2 rounded-[2px] border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-[13px] text-white/60">
          Offline mode: studies come from the sample files, and money totals
          stay at zero without the database.
        </p>
      ) : null}

      <KpiRow overview={overview} />

      {/* 2:1 bento: money (focal) beside what needs attention and where studies are */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <MoneyPanel overview={overview} />
        <div className="flex flex-col gap-6 lg:col-span-4">
          <AttentionPanel overview={overview} />
          <StagesPanel overview={overview} />
        </div>
      </div>

      <StudiesPanel
        overview={overview}
        onDeleted={(id) => {
          setToast({
            message: "Study deleted",
            description: `${id} and its files were removed.`,
            variant: "success",
          });
          router.refresh();
        }}
      />
      <AccountsPanel
        onDeleted={(name, email) => {
          setToast({
            message: "Account deleted",
            description: `${name} can't sign in anymore. ${email} is free to add again.`,
            variant: "success",
          });
          router.refresh();
        }}
        onError={(message) =>
          setToast({
            message: "Couldn't delete the account",
            description: message,
            variant: "danger",
          })
        }
      />

      {toast ? (
        <Toast
          message={toast.message}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}

function Header({ attentionCount }: { attentionCount: number | null }) {
  const description =
    attentionCount === null
      ? "Money, studies, and what needs you."
      : attentionCount > 0
        ? `${attentionCount} ${attentionCount === 1 ? "thing needs" : "things need"} your attention. Here's how the business is doing.`
        : "Nothing needs you right now. Here's how the business is doing.";
  return (
    <PageHeader
      title="Overview"
      description={description}
      breadcrumbs={[
        { label: "WORKSPACE", href: "/dashboard" },
        { label: "CEO Overview" },
      ]}
      actions={
        <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1.5 active:scale-[0.97]"
          >
            <Link href="/dashboard/admin/staff">Staff Directory</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 active:scale-[0.97]"
          >
            <Link href="/dashboard/ceo/finance">
              Money &amp; Pay Rates
              <ArrowRight size={14} weight="bold" />
            </Link>
          </Button>
        </div>
      }
    />
  );
}

function KpiRow({ overview }: { overview: CeoOverview }) {
  const n = overview.months.length;
  const thisMonth = overview.collectedByMonth[n - 1] ?? 0;
  const lastMonth = overview.collectedByMonth[n - 2] ?? 0;
  const newThisMonth = overview.newStudiesByMonth[n - 1] ?? 0;
  const newLastMonth = overview.newStudiesByMonth[n - 2] ?? 0;
  const prevLabel = overview.months[n - 2] ?? "last month";
  const d = overview.delivered90;
  const onTimePct =
    d.withDue > 0 ? Math.round((d.onTime / d.withDue) * 100) : null;
  const hasMoney = overview.collectedByMonth.some((v) => v > 0);
  const hasNew = overview.newStudiesByMonth.some((v) => v > 0);

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
        trend={hasMoney ? overview.collectedByMonth : undefined}
        trendStyle="bars"
        trendLabel="Money collected per month, last 6 months"
        info="Counts payments on the day finance marked them as checked, in Philippine time."
      />
      <KpiCard
        label="Still owed"
        description={
          overview.owedStudies > 0
            ? `On ${overview.owedStudies} ${overview.owedStudies === 1 ? "study" : "studies"} underway`
            : "Nothing owed on studies underway"
        }
        icon={<HandCoins size={18} weight="fill" />}
        value={
          <span className="whitespace-nowrap">
            <Peso />
            {money(overview.owed)}
          </span>
        }
        badge={`${overview.clientsUnderway} ${overview.clientsUnderway === 1 ? "client" : "clients"} with work underway`}
        info="The accepted price minus what clients have paid, for studies between the signed agreement and delivery."
      />
      <KpiCard
        label="New studies"
        description="Sent by clients this month"
        icon={<FolderSimplePlus size={18} weight="fill" />}
        value={newThisMonth}
        change={changeLine(newThisMonth, newLastMonth, prevLabel)}
        badge={
          newLastMonth <= 0
            ? `${overview.totalStudies} studies in total`
            : undefined
        }
        trend={hasNew ? overview.newStudiesByMonth : undefined}
        trendStyle="area"
        trendLabel="New studies per month, last 6 months"
      />
      <KpiCard
        label="Delivered on time"
        description="Last 90 days"
        icon={<CalendarCheck size={18} weight="fill" />}
        value={onTimePct === null ? "—" : onTimePct}
        unit={onTimePct === null ? undefined : "%"}
        badge={
          d.count === 0
            ? "No studies delivered yet"
            : `${d.count} delivered${d.medianDays !== null ? ` · usually ${Math.max(1, Math.round(d.medianDays))} ${Math.round(d.medianDays) <= 1 ? "day" : "days"}` : ""}`
        }
        info="On time means delivered by the due date set when the analyst was assigned (or the client's requested date before that). Usual time is the middle value from start to delivery."
      />
    </div>
  );
}

function MoneyPanel({ overview }: { overview: CeoOverview }) {
  const total = overview.collectedByMonth.reduce((a, b) => a + b, 0);
  const data = overview.months.map((m, i) => ({
    month: m,
    Collected: overview.collectedByMonth[i] ?? 0,
  }));
  return (
    <Panel className="lg:col-span-8">
      <PanelHeader
        title="Money collected"
        subtitle="Checked payments per month, last 6 months"
        aside={
          <div className="text-right">
            <p className="font-sans text-xl font-semibold tabular-nums text-white">
              <Peso />
              {money(total)}
            </p>
            <p className="text-xs text-white/45">in 6 months</p>
          </div>
        }
      />
      <PanelBody className="relative min-h-[280px] flex-1">
        {total > 0 ? (
          <div className="absolute inset-x-5 inset-y-5 sm:inset-x-6">
            <AreaChart
              data={data}
              index="month"
              categories={["Collected"]}
              colors={["#CC6600"]}
              valueFormatter={(v) => `₱${money(v)}`}
              yAxisFormatter={shortMoney}
              yAxisWidth={64}
              showLegend={false}
              height="100%"
              className="h-full"
            />
          </div>
        ) : (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-center">
            <Coins size={22} weight="fill" className="text-white/25" />
            <p className="text-sm text-white/60">
              No checked payments in the last 6 months yet.
            </p>
            <p className="text-[13px] text-white/40">
              The chart fills in as finance checks client payments.
            </p>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

function AttentionPanel({ overview }: { overview: CeoOverview }) {
  const items = overview.attention;
  if (items.length === 0) {
    return (
      <Panel as="div">
        <div className="flex items-center gap-3 px-5 py-5 sm:px-6">
          <CheckCircle
            size={20}
            weight="fill"
            className="shrink-0 text-white/40"
          />
          <p className="text-sm text-white/70">
            <span className="font-medium text-white">Nothing needs you.</span>{" "}
            No late studies, payments to check, or open claims.
          </p>
        </div>
      </Panel>
    );
  }
  return (
    <Panel className="border-[#CC6600]/30" aria-label="Needs your attention">
      <PanelHeader
        title="Needs your attention"
        count={items.reduce((s, i) => s + i.count, 0)}
      />
      <ul className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06]">
        {items.map((item) => {
          const inner = (
            <>
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CC6600]"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white">
                  <span className="font-mono font-semibold tabular-nums">
                    {item.count}
                  </span>{" "}
                  {item.label.toLowerCase()}
                </p>
                <p className="mt-0.5 text-[13px] text-white/50">
                  {item.detail}
                </p>
              </div>
              <ArrowRight
                size={14}
                weight="bold"
                className="mt-1 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70"
              />
            </>
          );
          const cls =
            "group flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.03] sm:px-6";
          return (
            <li key={item.key}>
              {item.href.startsWith("#") ? (
                <a
                  href={item.href}
                  className={cls}
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("jaxis:ceo-studies-filter", {
                        detail: "late",
                      }),
                    )
                  }
                >
                  {inner}
                </a>
              ) : (
                <Link href={item.href} className={cls}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function StagesPanel({ overview }: { overview: CeoOverview }) {
  const shown = STAGES.filter(
    (s) => s.key !== "stopped" || overview.stageCounts.stopped > 0,
  );
  const max = Math.max(1, ...shown.map((s) => overview.stageCounts[s.key]));
  return (
    <Panel className="flex-1">
      <PanelHeader
        title="Where studies are"
        subtitle={`${overview.totalStudies} studies in total`}
      />
      <PanelBody>
        <ul className="flex flex-col gap-3.5">
          {shown.map((s) => {
            const count = overview.stageCounts[s.key];
            return (
              <li key={s.key}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                  <span
                    className={count > 0 ? "text-white/80" : "text-white/40"}
                  >
                    {s.label}
                  </span>
                  <span
                    className={`font-mono tabular-nums ${count > 0 ? "text-white" : "text-white/30"}`}
                  >
                    {count}
                  </span>
                </div>
                <Meter value={count} max={max} label={`${s.label}: ${count}`} />
              </li>
            );
          })}
        </ul>
      </PanelBody>
    </Panel>
  );
}

type StudyFilter = "all" | "underway" | "late" | "delivered" | "stopped";

const FILTERS: Array<{
  value: StudyFilter;
  label: string;
  match: (s: OverviewStudy) => boolean;
}> = [
  { value: "all", label: "All", match: () => true },
  {
    value: "underway",
    label: "Underway",
    match: (s) => !(["delivered", "stopped"] as StageKey[]).includes(s.stage),
  },
  { value: "late", label: "Past due", match: (s) => s.pastDue },
  {
    value: "delivered",
    label: "Delivered",
    match: (s) => s.stage === "delivered",
  },
  { value: "stopped", label: "Stopped", match: (s) => s.stage === "stopped" },
];

const STAGE_LABEL = Object.fromEntries(
  STAGES.map((s) => [s.key, s.label]),
) as Record<StageKey, string>;

function StudiesPanel({
  overview,
  onDeleted,
}: {
  overview: CeoOverview;
  onDeleted: (id: string) => void;
}) {
  const [filter, setFilter] = useState<StudyFilter>("all");
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<OverviewStudy | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" jumps to search (unless typing somewhere); Esc clears it. The "past due" alert switches the filter here.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    const onFilter = (e: Event) =>
      setFilter(((e as CustomEvent).detail as StudyFilter) || "all");
    window.addEventListener("keydown", onKey);
    window.addEventListener("jaxis:ceo-studies-filter", onFilter);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("jaxis:ceo-studies-filter", onFilter);
    };
  }, []);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((f) => [f.value, overview.studies.filter(f.match).length]),
      ) as Record<StudyFilter, number>,
    [overview.studies],
  );

  const rows = useMemo(() => {
    const match = FILTERS.find((f) => f.value === filter)!.match;
    const q = query.trim().toLowerCase();
    return overview.studies.filter(
      (s) =>
        match(s) &&
        (!q ||
          s.intakeId.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          s.client.toLowerCase().includes(q)),
    );
  }, [overview.studies, filter, query]);

  const clearFilters = () => {
    setFilter("all");
    setQuery("");
  };

  return (
    <Panel id="studies" className="scroll-mt-6">
      <PanelHeader
        title="Studies"
        count={overview.totalStudies}
        subtitle={
          overview.totalStudies > STUDY_LIMIT
            ? `Newest ${STUDY_LIMIT} shown. Search covers these.`
            : "Newest first. Open one to see everything about it."
        }
      />
      <div className="mt-4 flex flex-col gap-3 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div
          className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]"
          role="tablist"
          aria-label="Show studies"
        >
          {FILTERS.filter(
            (f) =>
              f.value === "all" || counts[f.value] > 0 || f.value === filter,
          ).map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.value)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-[2px] px-3 py-1.5 font-sans text-[13px] transition-colors ${
                  active
                    ? "bg-white/[0.08] font-medium text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                {f.label}
                <span
                  className={`font-mono text-[11px] ${active ? "text-white/60" : "text-white/35"}`}
                >
                  {counts[f.value]}
                </span>
              </button>
            );
          })}
        </div>
        <label className="relative flex w-full items-center sm:w-64">
          <MagnifyingGlass
            size={14}
            weight="bold"
            className="pointer-events-none absolute left-3 text-white/35"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                e.currentTarget.blur();
              }
            }}
            placeholder="Search ID, title, or client"
            aria-label="Search studies"
            className="h-9 w-full rounded-[2px] border border-white/10 bg-[#050513] pl-8 pr-9 font-sans text-[13px] text-white outline-none placeholder:text-white/35 focus:border-[#CC6600]/60"
          />
          <kbd className="pointer-events-none absolute right-2.5 rounded-[2px] border border-white/15 px-1.5 font-mono text-[10px] text-white/40">
            /
          </kbd>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-sm text-white/60">
            {overview.studies.length === 0
              ? "No studies yet."
              : "No studies match."}
          </p>
          {overview.studies.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="active:scale-[0.97]"
            >
              Clear Filters
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06] md:hidden">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <CopyButton
                    value={s.intakeId}
                    label={s.intakeId}
                    copiedLabel="Copied"
                    variant="badge"
                  />
                  <span className="text-[12px] text-white/60">
                    {STAGE_LABEL[s.stage]}
                  </span>
                </div>
                <p className="text-sm text-white">{s.title}</p>
                <p className="-mt-1 text-[13px] text-white/50">
                  {s.client || "Unknown client"}
                </p>
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <DueText s={s} />
                  <span className="font-mono tabular-nums">
                    <PaidText s={s} />
                  </span>
                </div>
                <RowActions s={s} onDelete={() => setToDelete(s)} />
              </li>
            ))}
          </ul>
          <div className="mt-4 hidden overflow-x-auto border-t border-white/[0.06] md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                  <th className="px-5 py-2.5 font-medium sm:px-6">Study</th>
                  <th className="px-3 py-2.5 font-medium">Stage</th>
                  <th className="px-3 py-2.5 font-medium">Due</th>
                  <th className="px-3 py-2.5 text-right font-medium">Paid</th>
                  <th className="px-5 py-2.5 sm:px-6" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    className="group align-top transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="max-w-[340px] px-5 py-3.5 sm:px-6">
                      <div className="flex items-center gap-2">
                        <CopyButton
                          value={s.intakeId}
                          label={s.intakeId}
                          copiedLabel="Copied"
                          variant="badge"
                        />
                        {clientPackageName(s.packageName) ? (
                          <span className="truncate text-[12px] text-white/40">
                            {clientPackageName(s.packageName)}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className="mt-1.5 truncate text-sm text-white"
                        title={s.title}
                      >
                        {s.title}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-white/50">
                        {s.client || "Unknown client"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-[13px] text-white/75">
                      {STAGE_LABEL[s.stage]}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-[13px]">
                      <DueText s={s} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right font-mono text-[13px] tabular-nums">
                      <PaidText s={s} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right sm:px-6">
                      <RowActions s={s} onDelete={() => setToDelete(s)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <DeleteStudyDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        study={
          toDelete
            ? {
                id: toDelete.intakeId,
                rawId: toDelete.id,
                intakeId: toDelete.intakeId,
                title: toDelete.title,
                client: toDelete.client,
              }
            : null
        }
        onDeleted={(id) => {
          setToDelete(null);
          onDeleted(id);
        }}
      />
    </Panel>
  );
}

function DueText({ s }: { s: OverviewStudy }) {
  if (s.deliveredAt)
    return (
      <span className="text-white/50">
        Delivered {shortDate(s.deliveredAt)}
      </span>
    );
  if (s.pastDue)
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-white">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#CC6600]"
          aria-hidden="true"
        />
        Late · {shortDate(s.dueAt)}
      </span>
    );
  return (
    <span className="text-white/70">
      {s.stage === "stopped" ? "—" : `Due ${shortDate(s.dueAt)}`}
    </span>
  );
}

function PaidText({ s }: { s: OverviewStudy }) {
  if (s.price === null)
    return <span className="text-white/30">No price yet</span>;
  return (
    <>
      <span className="font-semibold text-white">
        <Peso />
        {money(s.paid)}
      </span>
      <span className="text-white/40"> of {money(s.price)}</span>
    </>
  );
}

function RowActions({
  s,
  onDelete,
}: {
  s: OverviewStudy;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button asChild variant="ghost" size="sm" className="active:scale-[0.97]">
        <Link href={`/dashboard/admin/projects/${s.id}`}>Open</Link>
      </Button>
      <button
        type="button"
        title={`Delete ${s.intakeId}`}
        aria-label={`Delete ${s.intakeId}`}
        onClick={onDelete}
        className="rounded-[2px] p-2 text-white/35 transition-colors hover:bg-red-500/10 hover:text-red-400 active:scale-90"
      >
        <Trash size={14} weight="fill" />
      </button>
    </div>
  );
}

const ROLE_WORD: Record<string, string> = {
  CEO: "CEO",
  ADMIN: "Admin",
  FINANCE_OFFICER: "Finance",
  STATISTICIAN: "Analyst",
  SENIOR_QA_LEAD: "Reviewer",
  CLIENT: "Client",
};

function AccountsPanel({
  onDeleted,
  onError,
}: {
  onDeleted: (name: string, email: string) => void;
  onError: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const lookUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (looking) return;
    setLooking(true);
    setLookupError(null);
    setNotFound(null);
    setAccount(null);
    const res = await findAccountByEmail(email);
    setLooking(false);
    if (!res.success) return setLookupError(res.error);
    if (!res.data) return setNotFound(email.trim().toLowerCase());
    setAccount(res.data);
  };

  const confirmDelete = async () => {
    if (!account || deleting) return;
    setDeleting(true);
    const res = await deleteAccount({
      userId: account.id,
      confirmEmail: confirmText,
      reason: reason || undefined,
    });
    setDeleting(false);
    if (!res.success) return onError(res.error);
    setConfirmOpen(false);
    setConfirmText("");
    setReason("");
    setAccount(null);
    setEmail("");
    onDeleted(res.data.fullName, res.data.email);
  };

  const emailMatches = account
    ? confirmText.trim().toLowerCase() === account.email.toLowerCase()
    : false;

  return (
    <Panel>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <PanelHeader
            title="Delete an account"
            subtitle="Frees the email so you can add the person again, for example as staff."
          />
          <p className="px-5 pt-3 text-[13px] leading-relaxed text-white/45 sm:px-6 lg:pb-6">
            Their past studies, payments, and payslips stay on record under
            their name. They&apos;re signed out and can&apos;t sign in again
            with this account. Only you can do this, and it&apos;s noted in the
            activity log.
          </p>
        </div>
        <PanelBody className="flex flex-col gap-4 lg:col-span-7 lg:pt-6">
          <form onSubmit={lookUp} noValidate className="flex flex-col gap-2">
            <label
              htmlFor="account-email"
              className="text-[13px] text-white/70"
            >
              Email address
            </label>
            <div className="flex gap-2">
              <input
                id="account-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLookupError(null);
                }}
                placeholder="name@gmail.com"
                className="h-9 min-w-0 flex-1 rounded-[2px] border border-white/10 bg-[#050513] px-3 font-sans text-[13px] text-white outline-none placeholder:text-white/35 focus:border-[#CC6600]/60"
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                loading={looking}
                disabled={!email.trim()}
                className="shrink-0 active:scale-[0.97]"
              >
                Find
              </Button>
            </div>
            {lookupError ? (
              <p className="text-[13px] text-red-300">{lookupError}</p>
            ) : null}
            {notFound ? (
              <p className="text-[13px] text-white/55">
                No account uses {notFound}. It&apos;s free to add.
              </p>
            ) : null}
          </form>

          {account ? (
            <div className="rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {account.fullName}
                  </p>
                  <p className="truncate text-[13px] text-white/50">
                    {account.email}
                  </p>
                </div>
                <span className="shrink-0 rounded-[2px] border border-white/10 bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] uppercase text-white/70">
                  {account.role
                    ? (ROLE_WORD[account.role] ?? account.role)
                    : "No role"}
                </span>
              </div>
              <ul className="mt-3 flex flex-col gap-1 text-[13px] text-white/60">
                <li>
                  Status: {account.status.toLowerCase().replace(/_/g, " ")}
                </li>
                {account.clientStudies > 0 ? (
                  <li>
                    {account.clientStudies}{" "}
                    {account.clientStudies === 1 ? "study" : "studies"} sent
                    {account.clientOpenStudies > 0
                      ? `, ${account.clientOpenStudies} still underway`
                      : ""}
                  </li>
                ) : null}
              </ul>
              {account.blockedReason ? (
                <p className="mt-3 text-[13px] text-white/80">
                  {account.blockedReason}
                </p>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                  className="mt-4 w-full gap-1.5 active:scale-[0.97]"
                >
                  <UserMinus size={15} weight="fill" />
                  Delete Account
                </Button>
              )}
            </div>
          ) : null}
        </PanelBody>
      </div>

      {account ? (
        <Modal
          open={confirmOpen}
          onClose={() => (deleting ? undefined : setConfirmOpen(false))}
          title={`Delete ${account.fullName}'s account?`}
          description="This can't be undone."
          size="sm"
          footer={
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDelete}
                loading={deleting}
                disabled={!emailMatches}
                className="active:scale-[0.97]"
              >
                Delete Account
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-[13px] text-white/70">
            <ul className="flex list-disc flex-col gap-1 pl-4">
              <li>
                They&apos;re signed out and can&apos;t sign in with this account
                again.
              </li>
              <li>
                {account.email} becomes free, so you can add it again as a new
                account.
              </li>
              <li>Saved payout details (GCash or bank) are removed.</li>
              <li>
                Past studies, payments, payslips, and messages stay on record.
              </li>
              {account.clientOpenStudies > 0 ? (
                <li className="text-white">
                  {account.clientOpenStudies === 1
                    ? "1 of their studies is still underway. They won't be able to sign, pay, or download files for it."
                    : `${account.clientOpenStudies} of their studies are still underway. They won't be able to sign, pay, or download files for them.`}
                </li>
              ) : null}
            </ul>
            <label className="flex flex-col gap-1.5">
              <span>
                Type{" "}
                <span className="font-mono text-white">{account.email}</span> to
                confirm
              </span>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                className="h-9 rounded-[2px] border border-white/10 bg-[#050513] px-3 font-sans text-[13px] text-white outline-none focus:border-[#CC6600]/60"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span>Reason (optional, kept in the activity log)</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                placeholder="For example: moving to a staff account"
                className="h-9 rounded-[2px] border border-white/10 bg-[#050513] px-3 font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60"
              />
            </label>
          </div>
        </Modal>
      ) : null}
    </Panel>
  );
}
