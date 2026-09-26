"use client";

import React, { useEffect, useState } from "react";

const STEPS = [
  { title: "Send your study", body: "Your data and questions" },
  { title: "Get a fixed price", body: "In writing, within 24 hours" },
  { title: "Get your files", body: "Checked twice" },
];

// How long each step stays lit. The countdown line reads this via --step-ms, so they stay in sync.
const INTERVAL = 5000;

// How a study moves through JAXIS: three open rows in the panel's own type, the current one lit,
// with a thin line filling along its top until the next step. Hovering a row holds it.
export function StepTrack({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setActive((a) => (a + 1) % STEPS.length), INTERVAL);
    return () => window.clearTimeout(id);
  }, [active, paused]);

  return (
    <div
      className={`step-track relative ${className}`}
      style={{ ["--step-ms" as string]: `${INTERVAL}ms` }}
      data-paused={paused ? "" : undefined}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pb-3 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">How it works</div>
      <ol className="border-b border-white/10">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            data-state={i < active ? "done" : i === active ? "active" : "next"}
            aria-current={i === active ? "step" : undefined}
            onMouseEnter={() => {
              setActive(i);
              setPaused(true);
            }}
            className="step relative grid grid-cols-[2.25rem_1fr] items-baseline border-t border-white/10 py-3.5"
          >
            <span aria-hidden="true" className="step-bar absolute inset-x-0 -top-px h-px" />
            <span className="step-num font-mono text-[11px]">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <span className="step-title font-sans text-sm font-medium">{s.title}</span>
              <span className="step-body font-mono text-[11px]">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
