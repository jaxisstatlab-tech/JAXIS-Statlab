"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { PageHeader, Button, Toast, LoadingState, Pagination, Peso, CopyButton } from "@repo/ui";
import { ArrowRight, MagnifyingGlass, Receipt, X } from "@phosphor-icons/react";
import { getProjects } from "@/features/projects/actions";
import { getQuotationByProject } from "@/features/quotations/actions";
import { clientPackageName } from "@/features/projects/client-packages";
import type { ClientQuoteEntry } from "@/features/quotations/schemas";
import { Panel, PanelBody } from "@/components/dashboard/Panel";

// Client "Quotes": every price we've sent, in plain words. Prices waiting for an answer come first.

interface ClientQuotationsClientProps {
  initialEntries?: ClientQuoteEntry[];
}

type QuoteState = "waiting" | "accepted" | "pricing" | "closed";

const STATE_COPY: Record<QuoteState, { tag: string }> = {
  waiting: { tag: "Waiting for your answer" },
  accepted: { tag: "Accepted" },
  pricing: { tag: "Being priced" },
  closed: { tag: "Closed" },
};

const TABS: Array<{ value: QuoteState | "ALL"; label: string }> = [
  { value: "waiting", label: "Waiting for you" },
  { value: "accepted", label: "Accepted" },
  { value: "pricing", label: "Being priced" },
  { value: "closed", label: "Closed" },
  { value: "ALL", label: "All" },
];

const money = (n: number) => Math.round(n).toLocaleString("en-PH");
const shortDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

function quoteState({ quotation }: ClientQuoteEntry): QuoteState {
  if (!quotation || quotation.status === "DRAFT") return "pricing";
  if (quotation.status === "QUOTE_SENT" && !quotation.isExpired) return "waiting";
  if (quotation.status === "CLIENT_APPROVED") return "accepted";
  return "closed";
}

/** Why a closed price is closed, in plain words. */
function closedReason(entry: ClientQuoteEntry): string {
  const q = entry.quotation;
  if (!q) return "";
  if (q.status === "QUOTE_DECLINED") return "You asked for changes";
  if (q.status === "SUPERSEDED") return "Replaced by a newer price";
  return `Expired ${shortDate(q.expiresAt)}`;
}

// Same package names as the website ("Core Thesis Package").
const packageName = (pkg?: string) => clientPackageName(pkg);

export function ClientQuotationsClient({ initialEntries = [] }: ClientQuotationsClientProps) {
  const [entries, setEntries] = useState<ClientQuoteEntry[]>(initialEntries);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tab, setTab] = useState<QuoteState | "ALL">(() =>
    initialEntries.some((e) => quoteState(e) === "waiting") ? "waiting" : "ALL"
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadClientQuotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getProjects();
      if (res.success && res.data) {
        const results = await Promise.all(
          res.data.map(async (project) => ({ project, quotation: await getQuotationByProject(project.id) }))
        );
        setEntries(
          results.filter(
            (r) =>
              r.quotation !== null ||
              ["NEW_REQUEST", "QUOTE_SENT", "UNDER_EVALUATION", "CLIENT_APPROVED"].includes(r.project.masterStatus)
          )
        );
      }
    } catch {
      // Keep whatever we already have on screen.
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Background refresh if the server sent nothing (e.g. a slow first load).
  useEffect(() => {
    if (initialEntries.length === 0) {
      loadClientQuotes();
    }
  }, [initialEntries.length, loadClientQuotes]);

  const counts = useMemo(() => {
    const c: Record<QuoteState | "ALL", number> = { ALL: entries.length, waiting: 0, accepted: 0, pricing: 0, closed: 0 };
    for (const e of entries) c[quoteState(e)] += 1;
    return c;
  }, [entries]);

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const order: Record<QuoteState, number> = { waiting: 0, pricing: 1, accepted: 2, closed: 3 };
    return entries
      .filter((e) => tab === "ALL" || quoteState(e) === tab)
      .filter(({ project, quotation }) => {
        if (!q) return true;
        return [project.researchTitle, project.intakeId, packageName(quotation?.packageName) ?? ""].some((f) =>
          f.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const d = order[quoteState(a)] - order[quoteState(b)];
        if (d !== 0) return d;
        return new Date(b.project.createdAt).getTime() - new Date(a.project.createdAt).getTime();
      });
  }, [entries, tab, searchQuery]);

  const paginated = useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize]
  );

  const copyId = (id: string) =>
    setToastMessage({ message: "Study ID copied", description: `${id} is on your clipboard.`, variant: "info" });

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState variant="page" label="Loading your quotes..." />
      </div>
    );
  }

  return (
    <div data-portal="client" className="flex flex-col gap-6 max-w-5xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title="Quotes"
        description={
          counts.waiting > 0
            ? `${counts.waiting} ${counts.waiting === 1 ? "price is" : "prices are"} waiting for your answer.`
            : "Every price we've sent you, and the ones we're still preparing."
        }
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "My Studies", href: "/dashboard/client" },
          { label: "Quotes" },
        ]}
      />

      {entries.length === 0 ? (
        <Panel>
          <PanelBody className="flex flex-col items-center gap-4 py-14 text-center">
            <Receipt size={28} weight="fill" className="text-white/35" />
            <div className="max-w-sm">
              <p className="text-base font-semibold text-white">No quotes yet</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                Send a study and we&apos;ll reply with a fixed written price within 24 hours.
              </p>
            </div>
            <Button asChild variant="primary" size="sm">
              <Link href="/dashboard/client/projects/new">Send a New Study</Link>
            </Button>
          </PanelBody>
        </Panel>
      ) : (
        <>
          {/* Tabs + search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]" role="tablist" aria-label="Show quotes">
              {TABS.filter((t) => t.value !== "closed" || counts.closed > 0).map((t) => {
                const active = tab === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setTab(t.value);
                      setCurrentPage(1);
                    }}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-[2px] px-3 py-1.5 text-[13px] transition-colors ${
                      active ? "bg-white/[0.08] font-medium text-white" : "text-white/55 hover:text-white"
                    }`}
                  >
                    {t.value === "waiting" && counts.waiting > 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" />
                    ) : null}
                    {t.label}
                    <span className={`font-mono text-[11px] ${active ? "text-white/60" : "text-white/35"}`}>{counts[t.value]}</span>
                  </button>
                );
              })}
            </div>
            <label className="relative flex h-9 w-full items-center sm:w-64">
              <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 text-white/35" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by title or study ID"
                aria-label="Search quotes"
                className="h-full w-full rounded-[2px] border border-white/[0.08] bg-[#050513] pl-9 pr-8 text-base text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none sm:text-[13px]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 flex h-6 w-6 items-center justify-center text-white/40 hover:text-white"
                >
                  <X size={13} weight="bold" />
                </button>
              ) : null}
            </label>
          </div>

          {visible.length === 0 ? (
            <Panel>
              <PanelBody className="py-12 text-center">
                <p className="text-sm text-white/55">
                  {searchQuery ? "No quotes match your search." : "Nothing here right now."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTab("ALL");
                    setSearchQuery("");
                  }}
                  className="mt-2 text-[13px] text-white/75 underline decoration-white/25 underline-offset-4 hover:text-white"
                >
                  Show all quotes
                </button>
              </PanelBody>
            </Panel>
          ) : (
            <ul className="flex flex-col gap-4">
              {paginated.map((entry) => (
                <li key={entry.project.id}>
                  <QuoteCard entry={entry} onCopy={copyId} />
                </li>
              ))}
            </ul>
          )}

          {visible.length > pageSize ? (
            <Panel>
              <Pagination
                currentPage={currentPage}
                totalItems={visible.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="quotes"
              />
            </Panel>
          ) : null}
        </>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

/** One quote: what it's for, the price and how it's paid, where it stands, one button. */
function QuoteCard({ entry, onCopy }: { entry: ClientQuoteEntry; onCopy: (id: string) => void }) {
  const { project, quotation } = entry;
  const state = quoteState(entry);
  const pkg = packageName(quotation?.packageName);
  const extras = quotation?.lineItems.filter((li) => li.itemType === "ADDON").length ?? 0;
  const quoteHref = `/dashboard/client/projects/${project.id}/quote`;
  const studyHref = `/dashboard/client/projects/${project.id}`;
  const waiting = state === "waiting";

  const when =
    state === "waiting" && quotation
      ? `Good until ${shortDate(quotation.expiresAt)}`
      : state === "accepted" && quotation?.respondedAt
        ? `Accepted ${shortDate(quotation.respondedAt)}`
        : state === "closed"
          ? closedReason(entry)
          : state === "pricing"
            ? "You'll get a fixed price within 24 hours"
            : "";

  return (
    <Panel as="article" aria-label={project.researchTitle} className={waiting ? "border-[#CC6600]/35" : ""}>
      <div className="grid grid-cols-1 gap-5 px-5 py-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border px-2 py-0.5 text-xs font-medium ${
                waiting
                  ? "border-[#CC6600]/50 bg-[#CC6600]/10 text-[#FFA040]"
                  : state === "accepted"
                    ? "border-white/20 bg-white/[0.06] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/65"
              }`}
            >
              {waiting ? <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" /> : null}
              {STATE_COPY[state].tag}
            </span>
            {when ? <span className="font-mono text-[11px] text-white/45">{when}</span> : null}
          </div>
          <Link
            href={quotation ? quoteHref : studyHref}
            className="mt-2.5 block text-base font-semibold leading-snug text-white decoration-white/30 underline-offset-4 hover:underline"
          >
            {project.researchTitle}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45">
            <CopyButton variant="ghost" value={project.intakeId} label={project.intakeId} onCopy={() => onCopy(project.intakeId)} className="-ml-2 text-[11px]" />
            {pkg ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{pkg}</span>
              </>
            ) : null}
            {extras > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {extras} {extras === 1 ? "extra" : "extras"}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4 md:items-end">
          {quotation ? (
            <div className="md:text-right">
              <p className={`font-mono text-2xl font-bold tracking-tight ${state === "closed" ? "text-white/45" : "text-white"}`}>
                <Peso />
                {money(quotation.totalAmount)}
              </p>
              <p className="mt-0.5 text-xs text-white/50">
                {quotation.isUpfrontEnforced ? (
                  "Paid in full before we start"
                ) : (
                  <>
                    <Peso />
                    {money(quotation.downpaymentRequired)} deposit, rest when files are ready
                  </>
                )}
              </p>
            </div>
          ) : null}
          <Button asChild variant={waiting ? "primary" : "outline"} size="sm" className="gap-1.5 self-start whitespace-nowrap md:self-end">
            <Link href={quotation ? quoteHref : studyHref}>
              {waiting ? "Review Price" : quotation ? "View Price" : "View Study"}
              <ArrowRight size={14} weight="bold" />
            </Link>
          </Button>
        </div>
      </div>
    </Panel>
  );
}
