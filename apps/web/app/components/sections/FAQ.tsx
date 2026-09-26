"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { CONTACT_EMAIL } from "@/lib/config";
import { FAQS, type Faq } from "../../content/site";
import { btnGhost, container, heading, kicker, subtitle } from "../ui/styles";

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.split(new RegExp(`(${safe})`, "ig")).map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="rounded-[1px] bg-[#CC6600]/35 text-white">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

type FaqProps = {
  // "split": heading on the left, one column of questions on the right (no search).
  layout?: "grid" | "split";
  searchable?: boolean;
  items?: Faq[];
  title?: string;
  description?: string;
};

type Row = Faq & { i: number };

function Item({ f, open, onToggle, query }: { f: Row; open: boolean; onToggle: () => void; query: string }) {
  return (
    <li id={`faq-${f.i + 1}`} className="scroll-mt-24 border-b border-white/10">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`faq-panel-${f.i}`}
        className="group flex w-full items-center justify-between gap-6 py-5 text-left"
      >
        <span
          className={`font-sans text-[15px] font-medium leading-snug transition-colors duration-150 ${
            open ? "text-white" : "text-white/85 group-hover:text-white"
          }`}
        >
          {highlight(f.q, query)}
        </span>
        <Plus
          size={14}
          weight="bold"
          className={`shrink-0 transition-transform duration-200 ease-out ${
            open ? "rotate-45 text-[#CC6600]" : "text-white/50 group-hover:text-white/80"
          }`}
        />
      </button>
      <div id={`faq-panel-${f.i}`} role="region" className="faq-panel grid" data-open={open ? "" : undefined}>
        <div className="overflow-hidden">
          <p className="faq-answer pb-6 pr-8 font-sans text-sm leading-relaxed text-white/65">{highlight(f.a, query)}</p>
        </div>
      </div>
    </li>
  );
}

export default function FAQ({
  layout = "grid",
  searchable = false,
  items = FAQS,
  title = "Frequently asked questions",
  description = "Delivery times, privacy, payment, and defending your results.",
}: FaqProps) {
  const [open, setOpen] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const q = query.trim();
  const matches = useMemo(
    () =>
      items
        .map((f, i) => ({ ...f, i }))
        .filter((f) => !q || f.q.toLowerCase().includes(q.toLowerCase()) || f.a.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );
  // Two independent columns, so opening an answer never shifts the other column.
  const half = Math.ceil(matches.length / 2);
  const columns = [matches.slice(0, half), matches.slice(half)];

  useEffect(() => {
    const hit = /^#faq-(\d+)$/.exec(window.location.hash);
    if (hit) setOpen(Number(hit[1]) - 1);
    if (!searchable) return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable='true']");
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchable]);

  const search = (value: string) => {
    setQuery(value);
    const v = value.trim().toLowerCase();
    const first = items.findIndex((f) => f.q.toLowerCase().includes(v) || f.a.toLowerCase().includes(v));
    setOpen(v && first >= 0 ? first : null);
  };

  const emailLink = (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs text-[#FFA040] transition-colors hover:text-white sm:text-sm"
    >
      Can&apos;t find an answer? Email us
      <ArrowUpRight size={13} weight="bold" />
    </a>
  );

  const clear = () => {
    search("");
    input.current?.focus();
  };

  if (layout === "split") {
    return (
      <section id="faq" className="relative scroll-mt-16 py-16 lg:py-24">
        <div className={`${container} grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16`}>
          <div className="self-start lg:sticky lg:top-28 lg:col-span-5">
            <div className={kicker}>FAQ</div>
            <h2 data-split className={heading}>
              {title}
            </h2>
            <p className={subtitle}>{description}</p>
            <div className="mt-6">{emailLink}</div>
          </div>
          <ul className="border-t border-white/10 lg:col-span-7">
            {matches.map((f) => (
              <Item key={f.q} f={f} query={q} open={open === f.i} onToggle={() => setOpen(open === f.i ? null : f.i)} />
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section
      id="faq"
      className="relative scroll-mt-16 py-16 lg:py-24"
    >
      <div className={container}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={kicker}>FAQ</div>
            <h2 data-split className={heading}>
              {title}
            </h2>
            <p className={subtitle}>{description}</p>
          </div>
          {emailLink}
        </div>

        {searchable ? (
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="relative w-full sm:max-w-md">
              <MagnifyingGlass
                size={15}
                weight="bold"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45"
              />
              <input
                ref={input}
                type="search"
                value={query}
                onChange={(e) => search(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    search("");
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Search questions, like “revisions” or “private”"
                aria-label="Search questions"
                className="h-11 w-full rounded-[2px] border border-white/15 bg-[#010D1F] pl-10 pr-12 font-sans text-sm text-white placeholder:text-white/40 focus:border-[#CC6600]/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {query ? (
                  <button
                    type="button"
                    onClick={clear}
                    aria-label="Clear search"
                    className="flex h-6 w-6 items-center justify-center rounded-[2px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <X size={13} weight="bold" />
                  </button>
                ) : (
                  <kbd className="hidden rounded-[2px] border border-white/10 bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-white/60 sm:inline">
                    /
                  </kbd>
                )}
              </div>
            </div>
            <p className="font-mono text-[11px] text-white/50" aria-live="polite">
              {q ? `${matches.length} of ${items.length} questions match` : `${items.length} questions`}
            </p>
          </div>
        ) : null}

        {matches.length === 0 ? (
          <div className="mt-8 rounded-[2px] border border-white/10 bg-[#01142B] p-6">
            <p className="font-sans text-sm text-white">No questions match “{q}”.</p>
            <p className="mt-1 font-sans text-sm text-white/60">
              Try another word, or email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-white/85 underline decoration-white/25 underline-offset-4">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <button type="button" onClick={clear} className={`${btnGhost} mt-5 h-9 px-4 text-[13px]`}>
              Clear search
            </button>
          </div>
        ) : (
          <div className={`grid grid-cols-1 lg:grid-cols-2 lg:gap-x-12 ${searchable ? "mt-6" : "mt-10"}`}>
            {columns.map((col, c) => (
              <ul key={c} className={c === 0 ? "border-t border-white/10" : "border-white/10 lg:border-t"}>
                {col.map((f) => (
                  <Item key={f.q} f={f} query={q} open={open === f.i} onToggle={() => setOpen(open === f.i ? null : f.i)} />
                ))}
              </ul>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
