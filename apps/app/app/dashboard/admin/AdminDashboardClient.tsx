"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, KpiCard, PageHeader, Peso } from "@repo/ui";
import { ArrowRight, CheckCircle, Hourglass, Lightning, PaperPlaneTilt } from "@phosphor-icons/react";
import { Meter, Panel, PanelBody, PanelFooterLink, PanelHeader } from "@/components/dashboard/Panel";
import { PROJECT_STATUS_LABELS } from "@/lib/project-rules";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import type { FinanceOverviewData } from "@/features/payments/schemas";
import type { ProjectStatus } from "@prisma/client";

// Admin Overview: what needs an admin today (one list, most urgent first, each with the step to take), where all
// studies are, client dates coming up, and money waiting to be checked. Real data only.

const DAY = 86_400_000;
const FINISHED: string[] = ["DELIVERED", "CLOSED", "CANCELLED", "EXPIRED"];
const WITH_CLIENT: string[] = ["AWAITING_INFORMATION", "QUOTE_SENT", "SOW_PENDING", "SOW_SIGNED", "AWAITING_PAYMENT"];
const IN_WORK: string[] = ["EXPERT_ASSIGNED", "IN_PROGRESS", "SLA_PAUSED", "SCOPE_CREEP_HALTED", "FOR_QA", "QA_REVISION"];

type Need = { project: ProjectDetailItem; what: string; href: string; rank: number };

const money = (n: number) => n.toLocaleString("en-PH", { maximumFractionDigits: 0 });
const shortDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" });

/** The admin's next step for a study, if there is one. Lower rank = more urgent. */
function needFor(p: ProjectDetailItem, offers: number): Omit<Need, "project"> | null {
  const base = `/dashboard/admin/projects/${p.id}`;
  switch (p.masterStatus as ProjectStatus) {
    case "REVISION_REQUESTED":
      return { what: "The client asked for changes", href: "/dashboard/admin/revisions", rank: 0 };
    case "SCOPE_CREEP_HALTED":
      return { what: "On hold: the analyst flagged extra work", href: `${base}/analysis`, rank: 1 };
    case "REASSIGNMENT_NEEDED":
      return { what: "Needs a new analyst or reviewer", href: base, rank: 1 };
    case "ACTIVE":
      return { what: offers ? `Assign the team (${offers} ${offers === 1 ? "analyst wants" : "analysts want"} it)` : "Assign the team", href: base, rank: 2 };
    case "SOW_SIGNED":
    case "AWAITING_PAYMENT":
      return p.hasPendingPaymentVerification ? { what: "Check the client's payment", href: `${base}/payment`, rank: 2 } : null;
    case "CLIENT_APPROVED":
      return { what: "Draft the agreement", href: `${base}/sow`, rank: 3 };
    case "UNDER_EVALUATION":
      return { what: "Build the quote", href: base, rank: 4 };
    case "NEW_REQUEST":
      return { what: "Read the new request", href: base, rank: 5 };
    default:
      return null;
  }
}

export function AdminDashboardClient({
  projects,
  failed = false,
  finance,
  offers = {},
}: {
  projects: ProjectDetailItem[];
  failed?: boolean;
  finance: FinanceOverviewData | null;
  offers?: Record<string, { count: number; picked: string | null }>;
}) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  // Comes back quietly at most once a minute when you return to the tab, and right away on study updates.
  const last = useRef(Date.now());
  useEffect(() => {
    const quiet = () => {
      if (Date.now() - last.current < 60_000) return;
      last.current = Date.now();
      router.refresh();
    };
    const now = () => {
      last.current = Date.now();
      router.refresh();
    };
    window.addEventListener("focus", quiet);
    window.addEventListener("jaxis:study-updated", now);
    return () => {
      window.removeEventListener("focus", quiet);
      window.removeEventListener("jaxis:study-updated", now);
    };
  }, [router]);

  const data = useMemo(() => {
    const open = projects.filter((p) => !FINISHED.includes(p.masterStatus));
    const needs: Need[] = projects
      .map((p) => {
        const n = needFor(p, offers[p.id]?.count ?? 0);
        return n ? { project: p, ...n } : null;
      })
      .filter((n): n is Need => n !== null)
      .sort((a, b) => a.rank - b.rank || +new Date(a.project.createdAt) - +new Date(b.project.createdAt));

    // Delivered per month, last 6 months (from real delivery dates).
    const months: { label: string; count: number }[] = [];
    const ref = now ? new Date(now) : null;
    if (ref) {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
        const count = projects.filter((p) => {
          if (!p.deliveredAt) return false;
          const x = new Date(p.deliveredAt);
          return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
        }).length;
        months.push({ label: d.toLocaleDateString("en-PH", { month: "short" }), count });
      }
    }

    const stages = [
      { label: "New and being priced", count: projects.filter((p) => ["NEW_REQUEST", "AWAITING_INFORMATION", "UNDER_EVALUATION"].includes(p.masterStatus)).length },
      { label: "Quote and agreement", count: projects.filter((p) => ["QUOTE_SENT", "CLIENT_APPROVED", "SOW_PENDING"].includes(p.masterStatus)).length },
      { label: "Waiting for the deposit", count: projects.filter((p) => ["SOW_SIGNED", "AWAITING_PAYMENT"].includes(p.masterStatus)).length },
      { label: "Needs a team", count: projects.filter((p) => ["ACTIVE", "REASSIGNMENT_NEEDED"].includes(p.masterStatus)).length },
      { label: "Analyst working", count: projects.filter((p) => ["EXPERT_ASSIGNED", "IN_PROGRESS", "SLA_PAUSED", "SCOPE_CREEP_HALTED", "QA_REVISION"].includes(p.masterStatus)).length },
      { label: "With the reviewer", count: projects.filter((p) => p.masterStatus === "FOR_QA").length },
      { label: "Client asked for changes", count: projects.filter((p) => p.masterStatus === "REVISION_REQUESTED").length },
    ];

    const dueSoon = now
      ? open
          .filter((p) => p.deadlineRequested && +new Date(p.deadlineRequested) - now < 7 * DAY)
          .sort((a, b) => +new Date(a.deadlineRequested) - +new Date(b.deadlineRequested))
      : [];

    return {
      open,
      needs,
      withClient: projects.filter((p) => WITH_CLIENT.includes(p.masterStatus) && !p.hasPendingPaymentVerification).length,
      inWork: projects.filter((p) => IN_WORK.includes(p.masterStatus)).length,
      months,
      deliveredThisMonth: months[months.length - 1]?.count ?? 0,
      stages,
      dueSoon,
    };
  }, [projects, offers, now]);

  const top = data.needs[0];
  const headline = failed
    ? "The studies didn't load. Refresh the page to try again."
    : data.needs.length === 0
      ? "Nothing needs you right now."
      : data.needs.length === 1
        ? "1 study needs you."
        : `${data.needs.length} studies need you. The most urgent is first.`;
  const maxStage = Math.max(1, ...data.stages.map((s) => s.count));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <PageHeader
        title="Admin Overview"
        description={headline}
        breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, { label: "Admin Overview" }]}
        actions={
          <div className="flex items-center gap-2">
            {top ? (
              <Button asChild variant="primary" size="sm" className="gap-1.5 active:scale-[0.97]">
                <Link href={top.href}>
                  Start Here
                  <ArrowRight size={13} weight="bold" />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/intake">All Studies</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Needs you"
          description="A step only an admin can take"
          icon={<Lightning size={18} weight="fill" />}
          value={data.needs.length}
          info="New requests, quotes to build, agreements to draft, payments to check, teams to assign, holds and client change requests."
        />
        <KpiCard
          label="With the client"
          description="Waiting on their reply, signature or deposit"
          icon={<PaperPlaneTilt size={18} weight="fill" />}
          value={data.withClient}
        />
        <KpiCard
          label="In the works"
          description="With the analyst or the reviewer"
          icon={<Hourglass size={18} weight="fill" />}
          value={data.inWork}
        />
        <KpiCard
          label="Delivered this month"
          description="Last 6 months in the chart"
          icon={<CheckCircle size={18} weight="fill" />}
          value={data.deliveredThisMonth}
          trend={data.months.length && data.months.some((m) => m.count > 0) ? data.months.map((m) => m.count) : undefined}
          trendStyle="bars"
          trendLabel={data.months.map((m) => `${m.label}: ${m.count}`).join(", ")}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <PanelHeader title="Needs you" count={data.needs.length} subtitle="Most urgent first: client changes and holds, then teams and payments, then pricing." />
          {data.needs.length === 0 ? (
            <PanelBody>
              <p className="text-[13px] text-white/45">{failed ? "Couldn't load studies." : "All caught up. New requests show up here."}</p>
            </PanelBody>
          ) : (
            <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
              {data.needs.slice(0, 8).map((n, i) => {
                const p = n.project;
                const late = now && p.deadlineRequested ? +new Date(p.deadlineRequested) < now : false;
                return (
                  <li key={p.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[13px] font-medium text-white">
                        {i === 0 ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" /> : null}
                        {n.what}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-white/70" title={p.researchTitle}>
                        {p.researchTitle}
                      </p>
                      <p className="mt-0.5 text-[12px] text-white/45">
                        <span className="font-mono">{p.intakeId}</span> · {p.client.fullName}
                        {p.deadlineRequested ? (
                          <span className={late ? "text-red-300" : undefined}> · needs it by {shortDate(p.deadlineRequested)}</span>
                        ) : null}
                      </p>
                    </div>
                    <Button asChild variant={i === 0 ? "primary" : "outline"} size="sm" className="shrink-0 self-start sm:self-center">
                      <Link href={n.href}>Open</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {data.needs.length > 8 ? <PanelFooterLink href="/dashboard/admin/intake">See all {data.needs.length} in Studies</PanelFooterLink> : null}
        </Panel>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Panel>
            <PanelHeader title="Where studies are" count={data.open.length} subtitle="Open studies by stage" />
            <PanelBody className="flex flex-col gap-3">
              {data.stages.map((s) => (
                <div key={s.label}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className={s.count ? "text-white/80" : "text-white/40"}>{s.label}</span>
                    <span className="font-mono text-[12px] text-white/70">{s.count}</span>
                  </div>
                  <Meter value={s.count} max={maxStage} label={s.label} className="mt-1" />
                </div>
              ))}
            </PanelBody>
          </Panel>

          {finance ? (
            <Panel>
              <PanelHeader title="Payments" />
              <PanelBody className="flex flex-col gap-3 text-[13px]">
                <div className="flex items-baseline justify-between">
                  <span className="text-white/55">Waiting to be checked</span>
                  <span className={finance.kpis.pendingClearancesCount ? "font-medium text-white" : "text-white/45"}>{finance.kpis.pendingClearancesCount}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-white/55">Collected so far</span>
                  <span className="text-white">
                    <Peso />
                    {money(finance.kpis.totalVaultCleared)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-white/55">Still owed by clients</span>
                  <span className="text-white">
                    <Peso />
                    {money(finance.kpis.totalOutstandingReceivables)}
                  </span>
                </div>
              </PanelBody>
            </Panel>
          ) : null}
        </div>
      </div>

      <Panel>
        <PanelHeader title="Client dates this week" count={data.dueSoon.length} subtitle="Open studies whose client needs them within 7 days, or already past the date." />
        {data.dueSoon.length === 0 ? (
          <PanelBody>
            <p className="text-[13px] text-white/45">No client dates in the next 7 days.</p>
          </PanelBody>
        ) : (
          <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
            {data.dueSoon.slice(0, 8).map((p) => {
              const days = now ? Math.ceil((+new Date(p.deadlineRequested) - now) / DAY) : 0;
              return (
                <li key={p.id} className="flex items-center gap-4 px-5 py-3 sm:px-6">
                  <span className={`w-24 shrink-0 text-[12px] ${days < 0 ? "text-red-300" : "text-white/70"}`}>
                    {days < 0 ? `${-days} ${-days === 1 ? "day" : "days"} late` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-white">{p.researchTitle}</p>
                    <p className="text-[12px] text-white/45">
                      <span className="font-mono">{p.intakeId}</span> · {PROJECT_STATUS_LABELS[p.masterStatus as ProjectStatus] ?? p.masterStatus}
                    </p>
                  </div>
                  <Link href={`/dashboard/admin/projects/${p.id}`} className="shrink-0 text-[13px] text-white/70 hover:text-white hover:underline">
                    Open
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
