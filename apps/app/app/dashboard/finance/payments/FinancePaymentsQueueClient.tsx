"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button, CopyButton, KpiCard, PageHeader, Pagination, Peso, Toast } from "@repo/ui";
import { ArrowClockwise, CheckCircle, Clock, HourglassMedium, MagnifyingGlass, XCircle } from "@phosphor-icons/react";
import { PanelBody } from "@/components/dashboard/Panel";
import { paymentKind, paymentMethod } from "@/features/payments/labels";
import type { PaymentItem } from "@/features/payments/schemas";

// Payments to Check: every payment a client says they sent (deposit, the rest, or in full), oldest first, with
// the ones already confirmed or sent back below. Finance opens one, finds it in the JAXIS GCash or bank history,
// and confirms it (which unlocks the next step for the client) or sends it back with a reason.

const PaymentVerificationModal = dynamic(
  () => import("@/features/payments/components/PaymentVerificationModal").then((m) => m.PaymentVerificationModal),
  { ssr: false }
);

const HOUR = 3_600_000;
const FIELD =
  "h-9 rounded-[2px] border border-white/10 bg-[#050513] px-3 font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

type Show = "WAITING" | "CONFIRMED" | "SENT_BACK" | "ALL";
type Method = "ALL" | "GCASH" | "BANK_TRANSFER";

const money = (n: number) => n.toLocaleString("en-PH", { maximumFractionDigits: 2 });
const monthOf = (d: string | number) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }).slice(0, 7);
const date = (d: string) => new Date(d).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" });
const dateTime = (d: string) =>
  new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const waited = (ms: number) => {
  const h = Math.floor(ms / HOUR);
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
};
const isConfirmed = (p: PaymentItem) => p.paymentStatus === "VERIFIED" || p.paymentStatus === "FULLY_PAID";
const normRef = (s: string) => s.replace(/[\s-]/g, "").toUpperCase();

export function FinancePaymentsQueueClient({ payments, failed = false }: { payments: PaymentItem[]; failed?: boolean }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [show, setShow] = useState<Show>("WAITING");
  const [method, setMethod] = useState<Method>("ALL");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [open, setOpen] = useState<PaymentItem | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "info" | "danger" } | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const lastRefresh = useRef(0);

  const refresh = () => {
    lastRefresh.current = Date.now();
    startRefresh(() => router.refresh());
  };

  useEffect(() => {
    setNow(Date.now());
    lastRefresh.current = Date.now();
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    // New payments arrive while the tab sits in the background: check again on return (at most once a minute).
    const onFocus = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefresh.current > 60_000) refresh();
    };
    document.addEventListener("visibilitychange", onFocus);
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const waiting = useMemo(
    () => payments.filter((p) => p.paymentStatus === "PROOF_SUBMITTED").sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [payments]
  );

  const stats = useMemo(() => {
    const thisMonth = now ? monthOf(now) : null;
    const checkedThisMonth = (p: PaymentItem) => !!thisMonth && !!p.verifiedAt && monthOf(p.verifiedAt) === thisMonth;
    const confirmedMonth = payments.filter((p) => isConfirmed(p) && checkedThisMonth(p));
    // How long payments waited before someone checked them, over the last 30 days (middle value).
    const waits = now
      ? payments
          .filter((p) => p.paymentStatus !== "PROOF_SUBMITTED" && p.verifiedAt && now - +new Date(p.verifiedAt) < 30 * 24 * HOUR)
          .map((p) => +new Date(p.verifiedAt!) - +new Date(p.createdAt))
          .filter((ms) => ms >= 0)
          .sort((a, b) => a - b)
      : [];
    return {
      waitingTotal: waiting.reduce((s, p) => s + p.amountSubmitted, 0),
      overADay: now ? waiting.filter((p) => now - +new Date(p.createdAt) > 24 * HOUR).length : 0,
      confirmedMonthTotal: confirmedMonth.reduce((s, p) => s + p.amountSubmitted, 0),
      confirmedMonthCount: confirmedMonth.length,
      sentBackMonth: payments.filter((p) => p.paymentStatus === "REJECTED" && checkedThisMonth(p)).length,
      usualWait: waits.length ? waits[Math.floor(waits.length / 2)]! : null,
      checkedRecently: waits.length,
    };
  }, [payments, waiting, now]);

  const counts = {
    WAITING: waiting.length,
    CONFIRMED: payments.filter(isConfirmed).length,
    SENT_BACK: payments.filter((p) => p.paymentStatus === "REJECTED").length,
    ALL: payments.length,
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const termRef = normRef(q.trim());
    const base =
      show === "WAITING"
        ? waiting
        : payments
            .filter((p) => (show === "CONFIRMED" ? isConfirmed(p) : show === "SENT_BACK" ? p.paymentStatus === "REJECTED" : true))
            .sort((a, b) =>
              // Waiting first (oldest first), then the most recently checked.
              a.paymentStatus === "PROOF_SUBMITTED" || b.paymentStatus === "PROOF_SUBMITTED"
                ? (a.paymentStatus === "PROOF_SUBMITTED" ? -1 : 1) - (b.paymentStatus === "PROOF_SUBMITTED" ? -1 : 1) ||
                  +new Date(a.createdAt) - +new Date(b.createdAt)
                : +new Date(b.verifiedAt ?? b.updatedAt) - +new Date(a.verifiedAt ?? a.updatedAt)
            );
    return base
      .filter((p) => method === "ALL" || p.paymentMethod === method)
      .filter((p) => {
        if (!term) return true;
        const text = [p.project?.intakeId, p.project?.researchTitle, p.project?.client.fullName, p.project?.client.email, p.project?.client.clientProfile?.institutionSchool]
          .join(" ")
          .toLowerCase();
        return text.includes(term) || (!!termRef && !!p.referenceNumber && normRef(p.referenceNumber).includes(termRef));
      });
  }, [payments, waiting, show, method, q]);

  useEffect(() => setPage(1), [show, method, q]);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const filtered = q.trim() !== "" || method !== "ALL";

  const oldest = waiting[0];
  const description = failed
    ? "The payments didn't load. Refresh to try again."
    : waiting.length === 0
      ? "Nothing to check. New payments show up here as soon as a client sends them."
      : `${waiting.length} ${waiting.length === 1 ? "payment" : "payments"} to check${
          oldest && now ? `. The oldest was sent ${waited(now - +new Date(oldest.createdAt))} ago` : ""
        }. Clients are told it's confirmed within one working day.`;

  const tabs: Array<[Show, string]> = [
    ["WAITING", "To check"],
    ["CONFIRMED", "Confirmed"],
    ["SENT_BACK", "Sent back"],
    ["ALL", "All"],
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <PageHeader
        title="Payments to Check"
        description={description}
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Finance", href: "/dashboard/finance" },
          { label: "Payments to Check" },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={refresh} loading={refreshing} className="gap-1.5">
            {!refreshing ? <ArrowClockwise size={14} weight="bold" /> : null}
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="To check"
          description={stats.waitingTotal ? `₱${money(stats.waitingTotal)} sent by clients` : "Nothing waiting"}
          icon={<HourglassMedium size={18} weight="fill" />}
          value={waiting.length}
          badge={stats.overADay ? `${stats.overADay} waiting over a day` : undefined}
        />
        <KpiCard
          label="Confirmed this month"
          description={`${stats.confirmedMonthCount} ${stats.confirmedMonthCount === 1 ? "payment" : "payments"}`}
          icon={<CheckCircle size={18} weight="fill" />}
          value={
            <>
              <Peso />
              {money(stats.confirmedMonthTotal)}
            </>
          }
        />
        <KpiCard
          label="Sent back this month"
          description="Not found or didn't match"
          icon={<XCircle size={18} weight="fill" />}
          value={stats.sentBackMonth}
        />
        <KpiCard
          label="Usual wait"
          description={stats.checkedRecently ? `From sent to checked, last 30 days (${stats.checkedRecently})` : "No payments checked in 30 days"}
          icon={<Clock size={18} weight="fill" />}
          value={stats.usualWait === null ? "—" : waited(stats.usualWait)}
        />
      </div>

      <div className="overflow-hidden rounded-[2px] border border-white/[0.07] bg-[#0A0A18]">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Show">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={show === key}
                onClick={() => setShow(key)}
                className={`rounded-[2px] px-2.5 py-1.5 text-[13px] transition-colors ${
                  show === key ? "bg-white/[0.08] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {label} <span className="font-mono text-[11px] text-white/40">{counts[key]}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={method} onChange={(e) => setMethod(e.target.value as Method)} aria-label="Account" className={`${FIELD} cursor-pointer [&>option]:bg-[#0A0A18]`}>
              <option value="ALL">GCash and bank</option>
              <option value="GCASH">GCash only</option>
              <option value="BANK_TRANSFER">Bank only</option>
            </select>
            <label className="relative sm:w-[300px]">
              <MagnifyingGlass size={15} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                ref={search}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQ("");
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Search study, client or reference"
                aria-label="Search payments"
                className={`${FIELD} w-full pl-9 pr-9`}
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[2px] border border-white/15 px-1.5 font-mono text-[10px] text-white/45">/</kbd>
            </label>
          </div>
        </div>

        {failed ? (
          <PanelBody className="flex items-center justify-between gap-4">
            <p className="text-[13px] text-white/60">The payments didn&apos;t load.</p>
            <Button variant="outline" size="sm" onClick={refresh} loading={refreshing}>
              Try Again
            </Button>
          </PanelBody>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <p className="text-sm font-medium text-white">{show === "WAITING" && !filtered ? "Nothing to check" : "No payments match"}</p>
            <p className="mt-1 text-[13px] text-white/50">
              {show === "WAITING" && !filtered
                ? "New payments show up here as soon as a client sends them."
                : filtered
                  ? "Try another search or account."
                  : "None here yet."}
            </p>
            {filtered ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQ("");
                  setMethod("ALL");
                }}
              >
                Clear Filters
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {pageRows.map((p) => {
              const isWaiting = p.paymentStatus === "PROOF_SUBMITTED";
              const age = now ? now - +new Date(p.createdAt) : 0;
              const late = isWaiting && age > 24 * HOUR;
              const first = isWaiting && p.id === waiting[0]?.id;
              const total = p.quotation?.totalAmount;
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-1 gap-3 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_110px_130px_150px_240px] lg:items-center lg:gap-5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/finance/projects/${p.project?.id ?? p.projectId}/payment`}
                      className="block truncate text-[13px] font-medium text-white hover:underline hover:underline-offset-2"
                      title={p.project?.researchTitle}
                    >
                      {p.project?.researchTitle || "Untitled study"}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/45">
                      {p.project?.intakeId ? (
                        <CopyButton
                          variant="badge"
                          value={p.project.intakeId}
                          label={p.project.intakeId}
                          onCopy={(id) => setToast({ message: "Study ID copied", description: id, variant: "info" })}
                        />
                      ) : null}
                      <span className="truncate">
                        {p.project?.client.fullName}
                        {p.project?.client.clientProfile?.institutionSchool ? ` · ${p.project.client.clientProfile.institutionSchool}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="text-[13px]">
                    <p className="text-white/85">{paymentKind(p.paymentType)}</p>
                    <p className="text-[12px] text-white/45">{paymentMethod(p.paymentMethod)}</p>
                  </div>

                  <div className="text-[13px]">
                    <p className="font-semibold text-white">
                      <Peso />
                      {money(p.amountSubmitted)}
                    </p>
                    <p className="text-[12px] text-white/45">{total ? `of ₱${money(total)} total` : " "}</p>
                  </div>

                  <div className="min-w-0 text-[13px]">
                    {p.referenceNumber ? (
                      <CopyButton
                        variant="badge"
                        value={p.referenceNumber}
                        label={p.referenceNumber}
                        onCopy={() => setToast({ message: "Reference number copied", description: "Paste it in the GCash or bank search.", variant: "info" })}
                      />
                    ) : (
                      <span className="text-white/45">No reference</span>
                    )}
                    <p className="mt-1 text-[12px] text-white/45">{p.proofs.length ? "Screenshot sent" : "No screenshot"}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <div className="min-w-0 text-[13px] lg:text-right">
                      {isWaiting ? (
                        <>
                          <p className="text-white">
                            {late ? <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#CC6600] align-middle" aria-hidden="true" /> : null}
                            {now ? `Waiting ${waited(age)}` : "Waiting"}
                          </p>
                          <p className="text-[12px] text-white/45">Sent {dateTime(p.createdAt)}</p>
                        </>
                      ) : isConfirmed(p) ? (
                        <>
                          <p className="text-white/85">Confirmed {p.verifiedAt ? date(p.verifiedAt) : ""}</p>
                          <p className="truncate text-[12px] text-white/45">{p.verifiedByName ? `by ${p.verifiedByName}` : `Sent ${date(p.createdAt)}`}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-white/55">Sent back {p.verifiedAt ? date(p.verifiedAt) : ""}</p>
                          <p className="truncate text-[12px] text-white/45" title={p.rejectionReason ?? undefined}>
                            {p.rejectionReason ? `“${p.rejectionReason.split(".")[0]}”` : ""}
                          </p>
                        </>
                      )}
                    </div>
                    <Button variant={first ? "primary" : isWaiting ? "outline" : "ghost"} size="sm" onClick={() => setOpen(p)} className="shrink-0">
                      {isWaiting ? "Check" : "View"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!failed && rows.length > pageSize ? (
          <Pagination
            currentPage={page}
            totalItems={rows.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="payments"
          />
        ) : null}
      </div>

      <p className="text-[13px] leading-relaxed text-white/50">
        Confirming a payment updates what the client has paid right away: a deposit starts the study and a final payment unlocks their files.
        Only confirm what you can see in the JAXIS GCash or bank history.
      </p>

      {open ? (
        <PaymentVerificationModal
          open
          onClose={() => setOpen(null)}
          payment={open}
          onSuccess={(outcome) => {
            const what = `${open.project?.intakeId ?? "Payment"} · ₱${money(open.amountSubmitted)}`;
            setToast(
              outcome === "rejected"
                ? { message: "Sent back to the client", description: `${what}. They can send it again.`, variant: "info" }
                : { message: "Payment confirmed", description: `${what}. The client is told.`, variant: "success" }
            );
            refresh();
          }}
        />
      ) : null}

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
