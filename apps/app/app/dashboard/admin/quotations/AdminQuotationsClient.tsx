"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, CopyButton, KpiCard, PageHeader, Peso } from "@repo/ui";
import { CheckCircle, Clock, MagnifyingGlass, NotePencil, XCircle } from "@phosphor-icons/react";
import { Panel, PanelBody } from "@/components/dashboard/Panel";
import { QuotationBuilderModal } from "@/features/quotations/components/QuotationBuilderModal";
import { clientPackageName } from "@/features/projects/client-packages";
import type { QuotationDetailItem } from "@/features/quotations/schemas";
import type { CommercialCatalogData } from "@/lib/pricing-rules";

// Quotes: every quote the office has made, by where it stands. Drafts to finish and quotes about to expire come
// first. Quotes are built on each study (Build Quote); packages and prices are the CEO's (Money & Pay Rates).

const DAY = 86_400_000;
const FIELD =
  "h-9 w-full rounded-[2px] border border-white/10 bg-[#050513] px-3 font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

type Show = "TODO" | "DRAFT" | "SENT" | "ACCEPTED" | "CLOSED" | "ALL";
type Kind = "DRAFT" | "SENT" | "EXPIRED" | "ACCEPTED" | "DECLINED" | "REPLACED";

const money = (n: number) => n.toLocaleString("en-PH", { maximumFractionDigits: 0 });
const date = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }) : "—";

/** Where a quote stands. A sent quote past its date counts as expired even if it wasn't marked so yet. */
function kindOf(q: QuotationDetailItem, now: number | null = null): Kind {
  if (q.status === "DRAFT") return "DRAFT";
  if (q.status === "CLIENT_APPROVED") return "ACCEPTED";
  if (q.status === "QUOTE_DECLINED") return "DECLINED";
  if (q.status === "SUPERSEDED") return "REPLACED";
  if (q.status === "QUOTE_EXPIRED" || q.isExpired || (now !== null && +new Date(q.expiresAt) < now)) return "EXPIRED";
  return "SENT";
}

export function AdminQuotationsClient({
  quotes,
  failed = false,
  catalog,
}: {
  quotes: QuotationDetailItem[];
  failed?: boolean;
  catalog?: CommercialCatalogData;
}) {
  const router = useRouter();
  const [show, setShow] = useState<Show>("TODO");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<QuotationDetailItem | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => setNow(Date.now()), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const expiresSoon = (x: QuotationDetailItem) => kindOf(x, now) === "SENT" && now !== null && +new Date(x.expiresAt) - now < 2 * DAY;

  const counts = useMemo(() => {
    const by = (k: Kind) => quotes.filter((x) => kindOf(x, now) === k).length;
    const sent = quotes.filter((x) => kindOf(x, now) === "SENT");
    return {
      draft: by("DRAFT"),
      sent: sent.length,
      sentValue: sent.reduce((s, x) => s + x.totalAmount, 0),
      accepted: by("ACCEPTED"),
      closed: by("DECLINED") + by("EXPIRED"),
      soon: sent.filter(expiresSoon).length,
      all: quotes.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, now]);
  const todoCount = counts.draft + counts.soon;
  // Open on Needs you only when something is there; otherwise on All.
  const settled = useRef(false);
  useEffect(() => {
    if (settled.current || now === null) return;
    settled.current = true;
    if (todoCount === 0) setShow("ALL");
  }, [now, todoCount]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const match = (x: QuotationDetailItem) => {
      const k = kindOf(x, now);
      if (show === "TODO") return k === "DRAFT" || expiresSoon(x);
      if (show === "DRAFT") return k === "DRAFT";
      if (show === "SENT") return k === "SENT";
      if (show === "ACCEPTED") return k === "ACCEPTED";
      if (show === "CLOSED") return k === "DECLINED" || k === "EXPIRED";
      return true;
    };
    return quotes
      .filter(match)
      .filter((x) =>
        !term
          ? true
          : [x.projectTitle, x.projectIntakeId, x.clientName, x.clientEmail, clientPackageName(x.packageName) ?? x.packageName]
              .join(" ")
              .toLowerCase()
              .includes(term)
      )
      .sort((a, b) => {
        // Drafts, then the soonest to expire, then the newest.
        const rank = (x: QuotationDetailItem) => (kindOf(x, now) === "DRAFT" ? 0 : kindOf(x, now) === "SENT" ? 1 : 2);
        return rank(a) - rank(b) || (rank(a) === 1 ? +new Date(a.expiresAt) - +new Date(b.expiresAt) : +new Date(b.updatedAt) - +new Date(a.updatedAt));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, show, q, now]);

  const description = failed
    ? "The quotes didn't load. Refresh the page to try again."
    : todoCount === 0
      ? "No drafts to finish and nothing about to expire."
      : [counts.draft ? `${counts.draft} ${counts.draft === 1 ? "draft" : "drafts"} to finish` : "", counts.soon ? `${counts.soon} expiring within 2 days` : ""]
          .filter(Boolean)
          .join(" and ") + ".";

  const status = (x: QuotationDetailItem) => {
    const k = kindOf(x, now);
    const left = now ? Math.ceil((+new Date(x.expiresAt) - now) / DAY) : null;
    switch (k) {
      case "DRAFT":
        return { text: "Draft, not sent", sub: `Saved ${date(x.updatedAt)}`, tone: "todo" as const };
      case "SENT":
        return {
          text: "Waiting for the client",
          sub: left === null ? `Valid until ${date(x.expiresAt)}` : left <= 0 ? "Expires today" : `Expires in ${left} ${left === 1 ? "day" : "days"}`,
          tone: expiresSoon(x) ? ("todo" as const) : ("plain" as const),
        };
      case "ACCEPTED":
        return { text: "Accepted", sub: x.respondedAt ? date(x.respondedAt) : "", tone: "plain" as const };
      case "DECLINED":
        return { text: "Declined", sub: x.declineReason ? `“${x.declineReason}”` : x.respondedAt ? date(x.respondedAt) : "", tone: "muted" as const };
      case "EXPIRED":
        return { text: "Expired", sub: date(x.expiresAt), tone: "muted" as const };
      default:
        return { text: "Replaced by a newer quote", sub: "", tone: "muted" as const };
    }
  };

  const tabs: Array<[Show, string, number]> = [
    ["TODO", "Needs you", todoCount],
    ["DRAFT", "Drafts", counts.draft],
    ["SENT", "Waiting for the client", counts.sent],
    ["ACCEPTED", "Accepted", counts.accepted],
    ["CLOSED", "Declined or expired", counts.closed],
    ["ALL", "All", counts.all],
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <PageHeader
        title="Quotes"
        description={description}
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Quotes" },
        ]}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/admin/intake">Studies to Price</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Drafts" description="Built but not sent yet" icon={<NotePencil size={18} weight="fill" />} value={counts.draft} />
        <KpiCard
          label="Waiting for the client"
          description={counts.sentValue ? `Worth ₱${money(counts.sentValue)}` : "Sent and still valid"}
          icon={<Clock size={18} weight="fill" />}
          value={counts.sent}
          badge={counts.soon ? `${counts.soon} expiring soon` : undefined}
        />
        <KpiCard label="Accepted" description="The client said yes" icon={<CheckCircle size={18} weight="fill" />} value={counts.accepted} />
        <KpiCard label="Declined or expired" description="May need a new quote" icon={<XCircle size={18} weight="fill" />} value={counts.closed} />
      </div>

      <div className="overflow-hidden rounded-[2px] border border-white/[0.07] bg-[#0A0A18]">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Show">
            {tabs.map(([key, label, n]) => (
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
                {label} <span className="font-mono text-[11px] text-white/40">{n}</span>
              </button>
            ))}
          </div>
          <label className="relative lg:w-[320px]">
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
              placeholder="Search study, client or package"
              aria-label="Search quotes"
              className={`${FIELD} pl-9 pr-9`}
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[2px] border border-white/15 px-1.5 font-mono text-[10px] text-white/45">/</kbd>
          </label>
        </div>

        {failed ? (
          <PanelBody className="flex items-center justify-between gap-4">
            <p className="text-[13px] text-white/60">The quotes didn&apos;t load.</p>
            <Button variant="outline" size="sm" onClick={() => router.refresh()}>
              Try Again
            </Button>
          </PanelBody>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <p className="text-sm font-medium text-white">{show === "TODO" && !q ? "Nothing needs you" : "No quotes match"}</p>
            <p className="mt-1 text-[13px] text-white/50">
              {show === "TODO" && !q ? "Drafts and quotes about to expire show up here." : "Try another search or show all quotes."}
            </p>
            {q || show !== "ALL" ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQ("");
                  setShow("ALL");
                }}
              >
                Show All Quotes
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {rows.map((x) => {
              const st = status(x);
              const addOns = x.lineItems.filter((li) => li.itemType === "ADDON").length;
              const k = kindOf(x, now);
              return (
                <li key={x.id} className="grid grid-cols-1 gap-3 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_200px_190px_190px] lg:items-center lg:gap-6">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/admin/projects/${x.projectId}`}
                      className="block truncate text-[13px] font-medium text-white hover:underline hover:underline-offset-2"
                      title={x.projectTitle}
                    >
                      {x.projectTitle || "Untitled study"}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/45">
                      {x.projectIntakeId ? <CopyButton variant="badge" value={x.projectIntakeId} label={x.projectIntakeId} /> : null}
                      <span className="truncate">{x.clientName}</span>
                    </div>
                  </div>
                  <div className="text-[13px]">
                    <p className="text-white/85">{clientPackageName(x.packageName) ?? x.packageName}</p>
                    <p className="text-[12px] text-white/45">{addOns ? `${addOns} ${addOns === 1 ? "add-on" : "add-ons"}` : "No add-ons"}</p>
                  </div>
                  <div className="text-[13px]">
                    <p className="font-medium text-white">
                      <Peso />
                      {money(x.totalAmount)}
                    </p>
                    <p className="text-[12px] text-white/45">deposit ₱{money(x.downpaymentRequired)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <div className="min-w-0 text-[13px] lg:text-right">
                      <p className={st.tone === "muted" ? "text-white/50" : "text-white"}>
                        {st.tone === "todo" ? <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#CC6600] align-middle" aria-hidden="true" /> : null}
                        {st.text}
                      </p>
                      {st.sub ? <p className="truncate text-[12px] text-white/45" title={st.sub}>{st.sub}</p> : null}
                    </div>
                    <Button variant={k === "DRAFT" ? "outline" : "ghost"} size="sm" onClick={() => setOpen(x)} className="shrink-0">
                      {k === "DRAFT" ? "Finish" : "View"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Panel as="div">
        <PanelBody className="text-[13px] leading-relaxed text-white/55">
          New quotes are built on each study with <span className="text-white/80">Build Quote</span>. Packages, add-ons and prices are set by the CEO
          in Money &amp; Pay Rates.
        </PanelBody>
      </Panel>

      <QuotationBuilderModal
        isOpen={!!open}
        onClose={() => setOpen(null)}
        projectId={open?.projectId ?? ""}
        projectIntakeId={open?.projectIntakeId}
        projectTitle={open?.projectTitle}
        clientName={open?.clientName}
        existingQuotation={open}
        customCatalog={catalog}
        onSuccess={() => {
          setOpen(null);
          router.refresh();
        }}
      />
    </div>
  );
}
