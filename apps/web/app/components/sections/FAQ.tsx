"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChatCircleDots, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { CONTACT_EMAIL, MESSENGER_URL } from "@/lib/config";
import { FAQS } from "../../content/site";
import { btnGhost, container, heading, kicker } from "../ui/styles";

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

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const q = query.trim();
  const matches = useMemo(
    () =>
      FAQS.map((f, i) => ({ ...f, i })).filter(
        (f) => !q || f.q.toLowerCase().includes(q.toLowerCase()) || f.a.toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, [contenteditable='true']");
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    const hit = /^#faq-(\d+)$/.exec(window.location.hash);
    if (hit) setOpen(Number(hit[1]) - 1);

    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const search = (value: string) => {
    setQuery(value);
    const v = value.trim().toLowerCase();
    const first = FAQS.findIndex((f) => f.q.toLowerCase().includes(v) || f.a.toLowerCase().includes(v));
    setOpen(v && first >= 0 ? first : v ? null : 0);
  };

  const clear = () => {
    search("");
    input.current?.focus();
  };

  return (
    <section id="faq" className="relative scroll-mt-16 border-t border-white/[0.06] py-16 lg:py-24">
      <div className={`${container} grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16`}>
        <div className="lg:sticky lg:top-28 lg:col-span-5">
          <div className={kicker}>FAQ</div>
          <h2 className={heading}>Questions students ask first</h2>
          <p className="mt-4 max-w-sm font-sans text-sm leading-relaxed text-white/65">
            Something else on your mind? Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-white/85 underline decoration-white/25 underline-offset-4 transition-colors hover:text-[#FFA040]"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            and a statistician will reply.
          </p>
          {MESSENGER_URL ? (
            <a href={MESSENGER_URL} data-cta="faq-messenger" className={`${btnGhost} mt-6`}>
              <ChatCircleDots size={16} weight="fill" className="text-[#CC6600]" />
              Message us on Messenger
            </a>
          ) : null}
        </div>

        <div className="lg:col-span-7">
          <div className="relative">
            <MagnifyingGlass size={15} weight="bold" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45" />
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
              className="h-11 w-full rounded-[2px] border border-white/15 bg-[#010D1F] pl-10 pr-20 font-sans text-sm text-white placeholder:text-white/40 focus:border-[#CC6600]/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-2">
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
          <p className="mt-3 font-mono text-[11px] text-white/50" aria-live="polite">
            {q ? `${matches.length} of ${FAQS.length} questions match` : `${FAQS.length} questions`}
          </p>

          {matches.length === 0 ? (
            <div className="mt-6 rounded-[2px] border border-white/10 bg-[#01142B] p-6">
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
            <ul className="mt-4 border-t border-white/10">
              {matches.map((f) => {
                const isOpen = open === f.i;
                return (
                  <li
                    key={f.q}
                    id={`faq-${f.i + 1}`}
                    className={`scroll-mt-24 border-b border-white/10 transition-colors duration-300 ${isOpen ? "bg-white/[0.02]" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : f.i)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${f.i}`}
                      className="group flex w-full items-center justify-between gap-6 px-3 py-5 text-left sm:px-4 sm:py-6"
                    >
                      <span className="flex items-baseline gap-4">
                        <span className="font-mono text-[11px] text-white/55">{String(f.i + 1).padStart(2, "0")}</span>
                        <span
                          className={`font-sans text-[15px] font-medium leading-snug transition-colors sm:text-base ${
                            isOpen ? "text-white" : "text-white/80 group-hover:text-white"
                          }`}
                        >
                          {highlight(f.q, q)}
                        </span>
                      </span>
                      <Plus
                        size={16}
                        weight="bold"
                        className={`shrink-0 transition-transform duration-300 ease-out ${
                          isOpen ? "rotate-45 text-[#CC6600]" : "text-white/55 group-hover:text-white/80"
                        }`}
                      />
                    </button>
                    <div
                      id={`faq-panel-${f.i}`}
                      role="region"
                      className="faq-panel grid"
                      data-open={isOpen ? "" : undefined}
                    >
                      <div className="overflow-hidden">
                        <p className="faq-answer pb-6 pl-11 pr-8 font-sans text-sm leading-relaxed text-white/65 sm:pl-[3.25rem]">
                          {highlight(f.a, q)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
