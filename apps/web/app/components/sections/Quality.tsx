"use client";

import { useRef } from "react";
import { CaretLeft, CaretRight, Check } from "@phosphor-icons/react";
import CountUp from "../ui/CountUp";
import Reveal from "../ui/Reveal";
import { container, heading, kicker } from "../ui/styles";

const METRICS: { to: number; prefix?: string; suffix?: string; label: string; body: string; badge: string }[] = [
  {
    to: 2,
    label: "Statisticians per study",
    body: "One runs your tests. A second reruns everything from scratch.",
    badge: "Always",
  },
  {
    to: 6,
    suffix: "/6",
    label: "Quality checks passed",
    body: "Data, test choice, assumptions, rerun, effect sizes, and APA format.",
    badge: "Pass",
  },
  {
    to: 24,
    prefix: "< ",
    suffix: "h",
    label: "Time to your written price",
    body: "A fixed written scope and price before you pay anything.",
    badge: "Free",
  },
  {
    to: 7,
    suffix: " days",
    label: "To raise any issue",
    body: "After delivery, tell us if something looks wrong and we review it.",
    badge: "Included",
  },
];

export default function Quality() {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 320) + 24), behavior: "smooth" });
  };

  return (
    <section id="quality" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal className="flex items-end justify-between gap-6">
          <div>
            <div className={kicker}>Quality checks</div>
            <h2 data-split className={heading}>Quality you can check at a glance</h2>
          </div>
          <div className="hidden gap-2 sm:flex">
            {[
              { dir: -1, label: "Previous", icon: CaretLeft },
              { dir: 1, label: "Next", icon: CaretRight },
            ].map(({ dir, label, icon: ArrowIcon }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={() => scroll(dir)}
                className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-white/15 text-white/70 transition-colors hover:border-white/35 hover:text-white active:scale-95"
              >
                <ArrowIcon size={14} weight="bold" />
              </button>
            ))}
          </div>
        </Reveal>

        <div
          ref={rail}
          className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2"
        >
          {METRICS.map((m, i) => (
            <Reveal
              key={m.label}
              delay={i * 70}
              className="w-[82%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
            >
              <div data-card className="h-full rounded-[2px] border border-white/10 bg-[#01142B] p-6">
                <div className="flex items-start justify-between gap-4">
                  <CountUp
                    to={m.to}
                    prefix={m.prefix}
                    suffix={m.suffix}
                    delay={200 + i * 90}
                    className="font-sans text-3xl font-semibold tracking-[-0.03em] text-white sm:text-[2rem]"
                  />
                  <span
                    className="status-badge inline-flex items-center gap-1 rounded-[2px] border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400"
                    style={{ ["--mark-delay" as string]: `${900 + i * 90}ms` }}
                  >
                    <span className="mark-draw inline-flex">
                      <Check size={11} weight="bold" />
                    </span>
                    {m.badge}
                  </span>
                </div>
                <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-white/60">{m.label}</div>
                <p className="mt-6 font-sans text-sm leading-relaxed text-white/60">{m.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
