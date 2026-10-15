"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, CopyButton, KpiCard, PageHeader, Toast } from "@repo/ui";
import { ChatCircleText, HourglassMedium, MagnifyingGlass, Star, WarningCircle } from "@phosphor-icons/react";
import { setFeedbackOnWebsite } from "../actions";
import { NAME_STYLE_LABEL, RATING_LABEL, type FeedbackItem, type FeedbackSummary } from "../schemas";

// Every client's feedback, for admins and the CEO: the numbers at the top, then each response with the study, the
// team and what the client said. Responses the client allowed on the website can be shown or removed here.

type Filter = "ALL" | "LOW" | "WEBSITE";
const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";
const date = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} weight="fill" className={i <= n ? "text-[#CC6600]" : "text-white/15"} />
      ))}
    </span>
  );
}

export function FeedbackDesk({
  role,
  initialItems,
  initialSummary,
  failed,
}: {
  role: "ADMIN" | "CEO";
  initialItems: FeedbackItem[];
  initialSummary: FeedbackSummary;
  failed?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "danger" } | null>(null);
  const [, start] = useTransition();
  const search = useRef<HTMLInputElement>(null);
  const s = initialSummary;
  const home = role === "CEO" ? "/dashboard/ceo" : "/dashboard/admin";

  // "/" focuses the search, Esc clears it.
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

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter((f) => (filter === "LOW" ? f.rating <= 2 : filter === "WEBSITE" ? f.showOnWebsite : true))
      .filter((f) =>
        !term
          ? true
          : [f.intakeId, f.researchTitle, f.clientName, f.analystName ?? "", f.reviewerName ?? "", f.wentWell ?? "", f.couldImprove ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(term),
      );
  }, [items, filter, q]);

  const toggleWebsite = (f: FeedbackItem) => {
    const approve = !f.approvedAt;
    setBusyId(f.id);
    start(async () => {
      const res = await setFeedbackOnWebsite({ feedbackId: f.id, approved: approve });
      setBusyId(null);
      if (!res.success) {
        setToast({ message: "Not saved", description: res.error.message, variant: "danger" });
        return;
      }
      setItems((prev) => prev.map((x) => (x.id === f.id ? { ...x, approvedAt: approve ? new Date().toISOString() : null } : x)));
      setToast({
        message: approve ? "Shown on the website" : "Removed from the website",
        description: approve ? "It appears in the testimonials within an hour." : "It leaves the website within an hour.",
        variant: "success",
      });
      router.refresh();
    });
  };

  const filtersOn = filter !== "ALL" || q.trim() !== "";
  const counts = { all: items.length, low: items.filter((f) => f.rating <= 2).length, website: items.filter((f) => f.showOnWebsite).length };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 animate-content-fade">
      <PageHeader
        title="Client Feedback"
        description="What clients said once their study was finished. Low ratings need a follow-up the same day."
        breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, { label: role === "CEO" ? "Overview" : "Admin", href: home }, { label: "Client Feedback" }]}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Average rating"
          description="Out of 5, all responses"
          icon={<Star size={18} weight="fill" />}
          value={s.average !== null ? s.average.toFixed(1) : 0}
          unit={s.average !== null ? "/ 5" : undefined}
        />
        <KpiCard label="Responses" description={`${s.recentCount} in the last 30 days`} icon={<ChatCircleText size={18} weight="fill" />} value={s.count} />
        <KpiCard label="Waiting for an answer" description="Asked, not answered yet" icon={<HourglassMedium size={18} weight="fill" />} value={s.awaiting} />
        <KpiCard
          label="Low ratings"
          description="1 or 2 stars, last 30 days"
          icon={<WarningCircle size={18} weight="fill" />}
          value={s.recentLow}
          variant={s.recentLow > 0 ? "red" : undefined}
        />
      </div>

      <div className="overflow-hidden rounded-[2px] border border-white/[0.07] bg-[#0A0A18]">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="flex gap-1" role="tablist" aria-label="Show">
            {(
              [
                ["ALL", `All ${counts.all}`],
                ["LOW", `Low ratings ${counts.low}`],
                ["WEBSITE", `Allowed on website ${counts.website}`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={`rounded-[2px] px-3 py-1.5 font-sans text-[13px] transition-colors ${
                  filter === key ? "bg-white/[0.08] text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative flex-1 sm:ml-auto sm:max-w-xs">
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
              placeholder="Search study, client, team, or words"
              aria-label="Search feedback"
              className={`${FIELD} h-9 pl-9 pr-10`}
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[2px] border border-white/15 px-1.5 font-mono text-[10px] text-white/45">/</kbd>
          </label>
        </div>

        {failed ? (
          <div className="flex flex-col items-start gap-3 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-sans text-[13px] text-white/60">Feedback didn&apos;t load. {failed}</p>
            <Button variant="outline" size="sm" onClick={() => router.refresh()}>
              Try Again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <ChatCircleText size={28} weight="fill" className="text-white/25" />
            <p className="mt-3 font-sans text-sm font-medium text-white">{items.length === 0 ? "No feedback yet" : "Nothing matches"}</p>
            <p className="mt-1 font-sans text-[13px] text-white/50">
              {items.length === 0 ? "Clients are asked once their study is finished. Their answers show up here." : "Try another search or show everything."}
            </p>
            {filtersOn ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setFilter("ALL");
                  setQ("");
                }}
              >
                Clear Filters
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {rows.map((f) => (
              <li key={f.id} className="grid grid-cols-1 gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-8">
                <div className="min-w-0 font-sans">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <Stars n={f.rating} />
                    <span className={`text-[13px] ${f.rating <= 2 ? "font-medium text-red-300" : "text-white/60"}`}>{RATING_LABEL[f.rating]}</span>
                    <span className="text-xs text-white/40">{date(f.createdAt)}</span>
                  </div>
                  {f.wentWell ? <p className="mt-2.5 text-[14px] leading-relaxed text-white/85">&ldquo;{f.wentWell}&rdquo;</p> : null}
                  {f.couldImprove ? (
                    <p className="mt-1.5 text-[14px] leading-relaxed text-white/65">
                      <span className="text-white/45">Could be better: </span>
                      {f.couldImprove}
                    </p>
                  ) : null}
                  {!f.wentWell && !f.couldImprove ? <p className="mt-2.5 text-[13px] text-white/40">Rating only, no comments.</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/50">
                    <CopyButton
                      variant="badge"
                      value={f.intakeId}
                      label={f.intakeId}
                      onCopy={(id) => setToast({ message: "Study ID copied", description: `${id} is on your clipboard.`, variant: "success" })}
                    />
                    <Link href={`/dashboard/admin/projects/${f.projectId}`} className="truncate text-white/70 hover:text-white hover:underline">
                      {f.researchTitle}
                    </Link>
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    {f.clientName}
                    {f.program || f.school ? ` · ${[f.program, f.school].filter(Boolean).join(", ")}` : ""}
                    {f.analystName ? ` · Analyst ${f.analystName}` : ""}
                    {f.reviewerName ? ` · Reviewer ${f.reviewerName}` : ""}
                  </p>
                </div>

                <div className="flex flex-col gap-2 font-sans text-[13px]">
                  <p className="text-xs text-white/45">Website</p>
                  {!f.showOnWebsite ? (
                    <p className="text-white/55">The client chose not to show it.</p>
                  ) : !f.wentWell ? (
                    <p className="text-white/55">Allowed, but there&apos;s nothing to quote (no &ldquo;did well&rdquo; comment).</p>
                  ) : (
                    <>
                      <p className="text-white/75">
                        {f.approvedAt ? "On the website" : "The client allows it"}
                        <span className="text-white/45">
                          {" "}
                          · {NAME_STYLE_LABEL[f.nameStyle]}
                          {f.nameStyle === "NAMES" && f.displayNames ? `: ${f.displayNames}` : ""}
                        </span>
                      </p>
                      <Button
                        variant={f.approvedAt ? "ghost" : "outline"}
                        size="sm"
                        onClick={() => toggleWebsite(f)}
                        loading={busyId === f.id}
                        disabled={!!busyId}
                        className="self-start"
                      >
                        {f.approvedAt ? "Remove From Website" : "Show on Website"}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

/** Small read-only view of one study's feedback, for the admin study page and the team's study details. */
export function StudyFeedbackSummary({ feedback }: { feedback: FeedbackItem }) {
  return (
    <div className="flex flex-col gap-2 font-sans">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars n={feedback.rating} />
        <span className={`text-[13px] ${feedback.rating <= 2 ? "font-medium text-red-300" : "text-white/60"}`}>{RATING_LABEL[feedback.rating]}</span>
        <span className="text-xs text-white/40">{date(feedback.createdAt)}</span>
      </div>
      {feedback.wentWell ? <p className="text-[13px] leading-relaxed text-white/80">&ldquo;{feedback.wentWell}&rdquo;</p> : null}
      {feedback.couldImprove ? (
        <p className="text-[13px] leading-relaxed text-white/60">
          <span className="text-white/45">Could be better: </span>
          {feedback.couldImprove}
        </p>
      ) : null}
      {!feedback.wentWell && !feedback.couldImprove ? <p className="text-[13px] text-white/40">Rating only, no comments.</p> : null}
    </div>
  );
}
