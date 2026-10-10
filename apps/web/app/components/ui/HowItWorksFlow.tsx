"use client";

import { useEffect, useRef, useState } from "react";
import type { HowStep as Step } from "../../content/site";
import StageArt from "./StageArt";

export type { Step };

const ease = "ease-[cubic-bezier(0.23,1,0.32,1)]";
const num = (i: number) => String(i + 1).padStart(2, "0");

// How it works. Wide screens: a hairline list of the five steps beside one showcase panel; ScrollFx pins the block
// and scrolling moves through the steps, forwards and backwards (it sends "step-scroll" with the step index and sets
// --step-p, the progress through that step). Picking a step sends "step-jump" so the page scrolls to it; without the
// pin (reduced motion) steps open on tap. Phones and tablets: the steps are stacked and scroll normally, each scene
// playing once it comes into view (pinning there held the screen and made scrolling feel stuck).
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

  return (
    <div
      ref={ref}
      data-tab-pin={steps.length}
      className="group/tabs mt-10 grid grid-cols-1 content-start gap-5 bg-[#010114] lg:mt-12 lg:grid-cols-12 lg:gap-12"
    >
      <ol className="hidden border-t border-white/10 lg:col-span-5 lg:block">
        {steps.map((s, i) => {
          const on = i === active;
          return (
            <li
              key={s.tag}
              className={`relative border-b border-white/10 transition-[background-color] duration-500 ${on ? "bg-[linear-gradient(90deg,rgba(204,102,0,0.07),transparent_70%)]" : ""}`}
            >
              {/* The open step's rail; while pinned it fills top to bottom as you scroll through the step */}
              <span
                aria-hidden="true"
                className={`absolute left-0 top-0 h-full w-[2px] bg-white/[0.08] transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"}`}
              >
                <span
                  className="block h-full w-full origin-top bg-[#FF8A1F] shadow-[0_0_10px_rgba(255,138,31,0.6)]"
                  style={{ transform: on ? "scaleY(var(--step-p, 1))" : "scaleY(0)" }}
                />
              </span>
              <button
                type="button"
                onClick={() => choose(i)}
                aria-current={on ? "step" : undefined}
                className="group flex w-full items-baseline gap-4 py-3.5 pl-4 text-left lg:py-[1.375rem] lg:pl-6"
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
                  <p className="max-w-md pb-6 pl-[3.5rem] pr-4 font-sans text-[15px] leading-relaxed text-white/65">{s.body}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Wide screens: one showcase panel; the five scenes share it and cross-fade */}
      <div className="relative hidden overflow-hidden rounded-[2px] border border-white/[0.08] bg-[#0A0A18] lg:col-span-7 lg:flex lg:flex-col lg:justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_at_50%_55%,black,transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-[radial-gradient(ellipse_at_50%_100%,rgba(204,102,0,0.13),transparent_65%)]"
        />
        <div className="relative grid">
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

      {/* Phones and tablets: every step stacked, scrolling normally */}
      <ol className="flex flex-col gap-12 lg:hidden">
        {steps.map((s, i) => (
          <StackedStep key={s.tag} step={s} index={i} last={last} />
        ))}
      </ol>
    </div>
  );
}

/** One step on phones and tablets; its scene plays the first time it scrolls into view. */
function StackedStep({ step: s, index: i, last }: { step: Step; index: number; last: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setOn(true);
        io.disconnect();
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <li ref={ref}>
      <div className="flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-wider">
        <span className="text-white/45">
          <span className="text-white">{num(i)}</span> / {num(last)}
        </span>
        <span className="text-[#FFA040]">{s.tag}</span>
        <span className="ml-auto normal-case tracking-normal text-white/45">{s.time}</span>
      </div>
      <h3 className="mt-2 font-sans text-xl font-medium tracking-[-0.03em] text-white sm:text-2xl">{s.title}</h3>
      <p className="mt-2 max-w-xl font-sans text-[15px] leading-relaxed text-white/65">{s.body}</p>
      <div className="relative -mx-6 mt-3 sm:mx-0">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-[radial-gradient(ellipse_at_50%_100%,rgba(204,102,0,0.14),transparent_70%)]"
        />
        <StageArt index={i} on={on} label={`${s.title}: ${s.body}`} zoom={1.45} />
      </div>
    </li>
  );
}
