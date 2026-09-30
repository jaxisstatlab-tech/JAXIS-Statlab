"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowsClockwise, DownloadSimple, FileArrowUp, Receipt, Wallet, type Icon } from "@phosphor-icons/react";
import SpotlightGrid from "./SpotlightGrid";
import StepArt from "./StepArt";
import { cardDesc, cardTitle } from "./styles";

export type Step = { tag: string; time: string; title: string; body: string; chips: string[] };

const ICONS: Icon[] = [FileArrowUp, Receipt, Wallet, ArrowsClockwise, DownloadSimple];
const STEP_MS = 1400;
const ease = "ease-[cubic-bezier(0.23,1,0.32,1)]";
const num = (i: number) => String(i + 1).padStart(2, "0");

// The five steps as a pipeline in the same joined grid as Services: an orange route runs through each step once
// when the section comes into view, replays on hover, and any step can be picked by hand.
export default function HowItWorksFlow({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const running = useRef(false);
  const [active, setActive] = useState(0);
  const last = steps.length - 1;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setActive(last));
      return () => cancelAnimationFrame(id);
    }

    const play = () => {
      if (running.current) return;
      running.current = true;
      let i = 0;
      setActive(0);
      window.clearInterval(timer.current);
      timer.current = window.setInterval(() => {
        i += 1;
        setActive(i);
        if (i >= last) {
          window.clearInterval(timer.current);
          running.current = false;
        }
      }, STEP_MS);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          io.disconnect();
          play();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);

    const stage = el.querySelector<HTMLElement>("[data-flow-stage]");
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (stage && hover) stage.addEventListener("pointerenter", play);

    return () => {
      io.disconnect();
      window.clearInterval(timer.current);
      stage?.removeEventListener("pointerenter", play);
    };
  }, [last]);

  const choose = (i: number) => {
    window.clearInterval(timer.current);
    running.current = false;
    setActive(i);
  };

  const current = steps[active];

  return (
    <SpotlightGrid className="mt-10">
      <div ref={ref} className="grid grid-cols-1 gap-px overflow-hidden rounded-[1px] lg:grid-cols-5">
        {/* The pipeline */}
        <div
          data-flow-stage
          className="bento-tile relative overflow-hidden bg-[#0A0A18] bg-[radial-gradient(ellipse_60%_90%_at_50%_100%,rgba(255,255,255,0.04),transparent)] lg:col-span-5"
        >
          <div className="flex items-start justify-between gap-4 px-7 pt-7 sm:px-8 sm:pt-8">
            <div>
              <h3 className={`${cardTitle} mb-1.5 lg:text-xl`}>Follow one study</h3>
              <p className={`${cardDesc} max-w-[44ch]`}>Every step is tracked in your account, from upload to download.</p>
            </div>
            <span className="shrink-0 pt-1 font-mono text-[11px] uppercase tracking-wider text-white/55" aria-live="polite">
              Step <span className="text-white">{num(active)}</span> / {num(last)}
              <span className="hidden sm:inline">
                <span className="text-white/25"> · </span>
                <span className="text-[#FFA040]">{current?.tag}</span>
              </span>
            </span>
          </div>

          <div className="px-4 pb-8 pt-10 sm:px-8 sm:pb-10">
          <ol className="relative mx-auto grid max-w-5xl grid-cols-5">
            <span aria-hidden="true" className="absolute left-[10%] right-[10%] top-[22px] border-t border-dashed border-white/20" />
            <span
              aria-hidden="true"
              className={`absolute left-[10%] top-[21px] h-[2px] bg-[#CC6600] transition-[width] duration-700 ${ease}`}
              style={{ width: `${(active / last) * 80}%` }}
            >
              <span className="absolute -right-1 -top-[3px] h-2 w-2 rounded-full bg-[#FFB066] shadow-[0_0_12px_rgba(255,138,31,0.9)]" />
            </span>

            {steps.map((s, i) => {
              const StepIcon = ICONS[i] ?? FileArrowUp;
              const on = i === active;
              const done = i < active;
              return (
                <li key={s.tag} className="relative flex justify-center">
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    aria-current={on ? "step" : undefined}
                    aria-label={`Step ${i + 1}: ${s.title}`}
                    className="group flex flex-col items-center text-center"
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-[3px] border transition-colors duration-300 ${
                        on
                          ? "border-[#FF8A1F] bg-[#21150F] text-white"
                          : done
                            ? "border-white/30 bg-[linear-gradient(180deg,#191934,#0E0E21)] text-white/85"
                            : "border-white/12 bg-[linear-gradient(180deg,#15152C,#0A0A18)] text-white/45 group-hover:text-white/75"
                      }`}
                    >
                      <StepIcon size={20} weight="fill" />
                    </span>
                    <span
                      className={`mt-3 font-sans text-[13px] font-medium transition-colors duration-300 ${
                        on || done ? "text-white" : "text-white/55"
                      }`}
                    >
                      {s.tag}
                    </span>
                    <span className="mt-0.5 hidden font-mono text-[11px] text-white/55 sm:block">{s.time}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          </div>
        </div>

        {/* One cell per step; each picture plays when the route reaches its step */}
        {steps.map((s, i) => {
          const on = i === active;
          return (
            <div
              key={s.tag}
              className={`bento-tile relative flex flex-col overflow-hidden transition-colors duration-300 ${on ? "bg-[#0E0E21]" : "bg-[#0A0A18]"}`}
            >
              <button
                type="button"
                onClick={() => choose(i)}
                aria-label={`Show step ${i + 1}: ${s.title}`}
                className="absolute inset-0 z-20"
              />
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 top-0 z-10 h-[2px] bg-[#CC6600] transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"}`}
              />
              <div className="px-7 pt-7 sm:px-8">
                <div className="flex items-baseline justify-between gap-3 font-mono text-[11px]">
                  <span className={`tabular-nums transition-colors duration-300 ${on ? "text-[#FFA040]" : "text-white/40"}`}>{num(i)}</span>
                  <span className="text-white/55">{s.time}</span>
                </div>
                <h3 className={`${cardTitle} mt-4`}>{s.title}</h3>
                <p className={`${cardDesc} mt-1.5`}>{s.body}</p>
              </div>
              <div className="mt-auto pt-6">
                <StepArt index={i} on={i <= active} />
              </div>
            </div>
          );
        })}
      </div>
    </SpotlightGrid>
  );
}
