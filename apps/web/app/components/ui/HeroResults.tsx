"use client";

import { useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";

// The hero's results card: a page of what a client gets back, using the same sample study as "What you receive"
// (STEM vs non-STEM GWA: 88.4 vs 86.1, t(218) = 3.87, p < .001). Tagged "Example". Hovering a grading period shows its
// two averages, like a chart in the findings summary.

const PERIODS = [
  { label: "Q1", stem: 87.6, other: 85.4 },
  { label: "Q2", stem: 88.1, other: 85.9 },
  { label: "Q3", stem: 88.7, other: 86.3 },
  { label: "Q4", stem: 89.2, other: 86.8 },
];
const MIN = 84;
const MAX = 90;
const TICKS = [90, 87, 84];
const height = (v: number) => `${((v - MIN) / (MAX - MIN)) * 100}%`;

function Bar({ value, cap, delay }: { value: number; cap: string; delay: number }) {
  return (
    <div className="relative flex h-full w-full items-end">
      <div
        className="hx-bar relative w-full rounded-t-[2px] bg-linear-to-t from-white/[0.02] to-white/[0.09]"
        style={{ height: height(value), ["--d" as string]: `${delay}ms` }}
      >
        <span className={`absolute inset-x-0 top-0 h-[3px] rounded-[1px] ${cap}`} />
      </div>
    </div>
  );
}

export default function HeroResults() {
  const [active, setActive] = useState(PERIODS.length - 1);
  const a = PERIODS[active]!;

  return (
    <figure
      className="hx-card relative w-full rounded-[2px] border border-white/10 bg-[#0A0A18] p-5 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.85)] sm:p-7"
      style={{ ["--d" as string]: "320ms" }}
    >
      <figcaption className="sr-only">
        Example findings summary: STEM students averaged a GWA of 88.4 and non-STEM students 86.1, a difference unlikely to be
        chance (p less than .001), checked by a second analyst.
      </figcaption>

      <div aria-hidden="true">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-sans text-lg font-medium tracking-[-0.02em] text-white sm:text-xl">Findings summary</p>
            <p className="mt-1 font-mono text-[11px] text-white/50 sm:text-xs">Average GWA by grading period</p>
          </div>
          <span className="shrink-0 rounded-[2px] border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
            Example
          </span>
        </div>

        <div className="mt-5 flex items-center gap-5 font-sans text-[13px] text-white/70">
          <span className="flex items-center gap-2">
            <span className="h-[2px] w-5 rounded-full bg-[#FF8A1F]" />
            STEM
          </span>
          <span className="flex items-center gap-2">
            <span className="h-[2px] w-5 rounded-full bg-white/50" />
            Non-STEM
          </span>
        </div>

        {/* Chart */}
        <div className="mt-5 grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
          <div className="flex h-44 flex-col justify-between py-0 font-mono text-[10px] text-white/35 sm:h-52">
            {TICKS.map((t) => (
              <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
                {t}
              </span>
            ))}
          </div>
          <div className="relative h-44 border-b border-white/10 sm:h-52">
            {/* gridlines */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {TICKS.map((t) => (
                <span key={t} className="block h-px w-full bg-white/[0.05]" />
              ))}
            </div>
            <div className="relative grid h-full grid-cols-4 gap-2 sm:gap-3" onMouseLeave={() => setActive(PERIODS.length - 1)}>
              {PERIODS.map((p, i) => {
                const on = i === active;
                return (
                  <div
                    key={p.label}
                    onMouseEnter={() => setActive(i)}
                    className={`relative flex h-full items-end gap-1.5 rounded-[2px] border px-1.5 pt-8 transition-colors duration-200 sm:px-2 ${
                      on ? "border-white/15 bg-white/[0.03]" : "border-transparent"
                    }`}
                  >
                    <Bar value={p.stem} cap="bg-[#FF8A1F]" delay={760 + i * 80} />
                    <Bar value={p.other} cap="bg-white/50" delay={800 + i * 80} />
                    {on ? (
                      <div className="absolute left-1/2 top-1.5 z-10 -translate-x-1/2 whitespace-nowrap rounded-[2px] border border-white/10 bg-[#010114]/90 px-2 py-1 font-mono text-[10.5px] leading-tight text-white/85 shadow-lg">
                        <span className="flex items-center gap-1.5">
                          <span className="h-[2px] w-2.5 bg-[#FF8A1F]" />
                          {p.stem.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-[2px] w-2.5 bg-white/50" />
                          {p.other.toFixed(1)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <span />
          <div className="grid grid-cols-4 gap-2 font-mono text-[11px] sm:gap-3">
            {PERIODS.map((p, i) => (
              <span key={p.label} className={`text-center transition-colors duration-200 ${i === active ? "text-[#FF8A1F]" : "text-white/40"}`}>
                {p.label}
              </span>
            ))}
          </div>
        </div>

        {/* Result */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-5">
          <div>
            <p className="font-mono text-[11px] text-white/50">Difference in {a.label}</p>
            <p className="mt-1 font-sans text-3xl font-medium tabular-nums tracking-[-0.03em] text-white sm:text-[2.1rem]">
              +{(a.stem - a.other).toFixed(1)}
              <span className="ml-1.5 font-sans text-sm font-normal text-white/50">GWA points</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-[2px] border border-[#CC6600]/40 bg-[#CC6600]/15 px-2 py-1 font-mono text-xs font-medium text-[#FFB066]">
              p &lt; .001
            </span>
            <span className="font-sans text-[13px] text-white/70">Unlikely by chance</span>
          </div>
        </div>
        <p className="mt-4 flex items-center gap-1.5 font-mono text-[11px] text-white/50">
          <CheckCircle size={13} weight="fill" className="text-white/60" />
          Checked by a second analyst
        </p>
      </div>
    </figure>
  );
}
