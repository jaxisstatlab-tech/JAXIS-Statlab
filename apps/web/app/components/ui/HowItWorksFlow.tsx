"use client";

import { useEffect, useRef, useState } from "react";
import type { HowStep as Step } from "../../content/site";
import StageArt from "./StageArt";

export type { Step };

const ease = "ease-[cubic-bezier(0.23,1,0.32,1)]";
const num = (i: number) => String(i + 1).padStart(2, "0");

// How it works as tabs: a hairline list of the five steps beside one showcase panel. ScrollFx pins the block and
// scrolling moves through the steps, forwards and backwards (it sends "step-scroll" with the step index and sets
// --step-p, the progress through that step). Picking a step sends "step-jump" so the page scrolls to it. Without the
// pin (reduced motion), steps just open on tap.
export default function HowItWorksFlow({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [artOn, setArtOn] = useState(false);
  const last = steps.length - 1;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onStep = (e: Event) => setActive((e as CustomEvent<number>).detail);
    el.addEventListener("step-scroll", onStep);
    return () => el.removeEventListener("step-scroll", onStep);
  }, []);

  // Each time a step opens, its scene starts in its "before" state and then plays to "done".
  useEffect(() => {
    const reset = requestAnimationFrame(() => setArtOn(false));
    const play = window.setTimeout(() => setArtOn(true), 350);
    return () => {
      cancelAnimationFrame(reset);
      window.clearTimeout(play);
    };
  }, [active]);

  const choose = (i: number) => {
    const el = ref.current;
    if (el?.hasAttribute("data-pinned")) el.dispatchEvent(new CustomEvent("step-jump", { detail: i }));
    else setActive(i);
  };

  const stage = (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:12px_12px] [mask-image:radial-gradient(ellipse_at_50%_70%,black,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_50%_100%,rgba(204,102,0,0.12),transparent_70%)]"
      />
      <div className="relative flex items-center justify-between px-5 pt-4 font-mono text-[10.5px] uppercase tracking-wider lg:px-7 lg:pt-6 lg:text-[11px]">
        <span className="text-white/45">
          Step <span className="text-white">{num(active)}</span> / {num(last)}
          <span className="text-white/25"> · </span>
          <span className="text-[#FFA040]">{steps[active]?.tag}</span>
        </span>
        <span className="text-white/45">{steps[active]?.time}</span>
      </div>
    </>
  );

  return (
    <div
      ref={ref}
      data-tab-pin={steps.length}
      className="group/tabs mt-10 grid grid-cols-1 content-start gap-5 bg-[#010114] lg:mt-12 lg:grid-cols-12 lg:gap-12"
    >
      {/* Phones: a slim progress bar that fills as you scroll through the steps */}
      <div className="lg:hidden">
        <div className="flex items-center gap-4">
          <div className="flex flex-1 gap-1">
            {steps.map((s, i) => (
              <button
                key={s.tag}
                type="button"
                onClick={() => choose(i)}
                aria-label={`Step ${i + 1}: ${s.title}`}
                aria-current={i === active ? "step" : undefined}
                className="h-6 flex-1 py-2.5"
              >
                <span className="block h-[3px] overflow-hidden rounded-full bg-white/[0.12]">
                  <span
                    className="block h-full w-full origin-left bg-[#FF8A1F] transition-transform duration-300"
                    style={{ transform: i < active ? "scaleX(1)" : i === active ? "scaleX(max(var(--step-p, 1), 0.08))" : "scaleX(0)" }}
                  />
                </span>
              </button>
            ))}
          </div>
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-white/45">
            <span className="text-white">{num(active)}</span> / {num(last)}
            <span className="text-white/25"> · </span>
            <span className="text-[#FFA040]">{steps[active]?.tag}</span>
          </span>
        </div>
      </div>

      <ol className="hidden border-t border-white/10 lg:col-span-5 lg:block">
        {steps.map((s, i) => {
          const on = i === active;
          return (
            <li key={s.tag} className="relative border-b border-white/10">
              <span
                aria-hidden="true"
                className={`absolute -left-px top-0 h-full w-[2px] bg-[#CC6600] transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"}`}
              />
              <button
                type="button"
                onClick={() => choose(i)}
                aria-current={on ? "step" : undefined}
                className="group flex w-full items-baseline gap-4 py-3.5 pl-4 text-left lg:py-5 lg:pl-5"
              >
                <span className={`font-mono text-xs tabular-nums transition-colors duration-300 ${on ? "text-[#FFA040]" : "text-white/40"}`}>
                  {num(i)}
                </span>
                <span
                  className={`flex-1 font-sans text-base font-medium tracking-[-0.02em] transition-colors duration-300 lg:text-lg ${
                    on ? "text-white" : "text-white/55 group-hover:text-white/85"
                  }`}
                >
                  {s.title}
                </span>
                <span className={`font-mono text-[11px] transition-colors duration-300 ${on ? "text-white/70" : "text-white/40"}`}>
                  {s.time}
                </span>
              </button>

              {/* Wide screens: the open step's sentence under its row */}
              <div
                className={`hidden transition-[grid-template-rows,opacity] duration-500 lg:grid ${ease} ${
                  on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="max-w-md pb-5 pl-[3.25rem] pr-4 font-sans text-[15px] leading-relaxed text-white/65">{s.body}</p>
                </div>
              </div>

              {/* Progress through this step while scrolling (only while pinned) */}
              {on ? (
                <span aria-hidden="true" className="absolute bottom-[-1px] left-0 hidden h-px w-full group-data-[pinned]/tabs:block">
                  <span className="block h-full w-full origin-left bg-[#FF8A1F]" style={{ transform: "scaleX(var(--step-p, 0))" }} />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Wide screens: one showcase panel; the five scenes share it and cross-fade */}
      <div className="relative hidden overflow-hidden rounded-[2px] border border-white/[0.08] bg-[#0A0A18] lg:col-span-7 lg:flex lg:flex-col">
        {stage}
        <div className="relative mt-2 grid">
          {steps.map((s, i) => (
            <div
              key={s.tag}
              aria-hidden={i !== active}
              className={`col-start-1 row-start-1 transition-[opacity,translate] duration-500 ${ease} ${
                i === active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
              }`}
            >
              <StageArt index={i} on={i === active && artOn} label={`${s.title}: ${s.body}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Phones: the open step's title and sentence, then its scene large and edge to edge */}
      <div className="lg:hidden">
        <div className="grid">
          {steps.map((s, i) => (
            <div
              key={s.tag}
              aria-hidden={i !== active}
              className={`col-start-1 row-start-1 transition-[opacity,translate] duration-500 ${ease} ${
                i === active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
              }`}
            >
              <h3 className="font-sans text-2xl font-medium tracking-[-0.03em] text-white">{s.title}</h3>
              <p className="mt-2 font-sans text-[15px] leading-relaxed text-white/65">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="relative -mx-6 mt-6 grid [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-[radial-gradient(ellipse_at_50%_100%,rgba(204,102,0,0.14),transparent_70%)]"
          />
          {steps.map((s, i) => (
            <div
              key={s.tag}
              aria-hidden={i !== active}
              className={`col-start-1 row-start-1 transition-[opacity,translate] duration-500 ${ease} ${
                i === active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
              }`}
            >
              <StageArt index={i} on={i === active && artOn} label={`${s.title}: ${s.body}`} zoom={1.3} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
