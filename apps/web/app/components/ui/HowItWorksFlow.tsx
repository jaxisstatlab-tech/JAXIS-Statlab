"use client";

import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getLenis } from "@/lib/smoothScroll";
import type { HowStep as Step } from "../../content/site";
import StageArt from "./StageArt";

export type { Step };

const ease = "ease-[cubic-bezier(0.23,1,0.32,1)]";
/** Scroll per step while the section is held, as a share of the screen height. */
const SCROLL_PER_STEP = 0.5;

gsap.registerPlugin(ScrollTrigger);

// How it works as a compact step list beside one scene, about a screen tall.
// The steps are an accordion of hairline rows (number, title, usual time); only the open step shows its description
// and what it covers, and the scene for the open step sits on the right.
// Wide screens with a mouse or trackpad: scrolling drives it. When the section reaches the screen it holds in place
// (ScrollTrigger pin), and scrolling moves through the steps, forwards and backwards; the open step's top line fills
// as you scroll through that step, and after the last step the page carries on. Clicking a step scrolls to
// it. Phones, touch screens and reduced motion: nothing is held; the steps open on tap (phones show each scene inside
// its step).
export default function HowItWorksFlow({ steps }: { steps: Step[] }) {
  const root = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const [active, setActive] = useState(0);
  const [artOn, setArtOn] = useState(false);
  // True while the scroll-driven (held) version is on.
  const [scrolly, setScrolly] = useState(false);
  const progress = useRef<HTMLSpanElement>(null);
  const stepP = useRef(0);
  const trigger = useRef<ScrollTrigger | null>(null);

  // Each time a step opens, its scene starts in its "before" state and then plays to "done".
  useEffect(() => {
    const reset = requestAnimationFrame(() => setArtOn(false));
    const play = window.setTimeout(() => setArtOn(true), 250);
    return () => {
      cancelAnimationFrame(reset);
      window.clearTimeout(play);
    };
  }, [active]);

  // Wide screens with a mouse or trackpad: hold the section and let scrolling move through the steps.
  useEffect(() => {
    const el = root.current;
    const section = el?.closest("section");
    if (!el || !section) return;
    const count = steps.length;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      setScrolly(true);
      let current = -1;
      const st = ScrollTrigger.create({
        trigger: section,
        // Hold it centred in the space below the navbar (64px).
        start: () => `top ${Math.round(Math.max(64, 64 + (window.innerHeight - 64 - section.offsetHeight) / 2))}px`,
        end: () => `+=${Math.round(window.innerHeight * SCROLL_PER_STEP * count)}`,
        pin: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const x = self.progress * count;
          const index = Math.min(count - 1, Math.floor(x));
          stepP.current = index === count - 1 && self.progress >= 1 ? 1 : Math.min(1, x - index);
          if (progress.current) progress.current.style.transform = `scaleX(${stepP.current})`;
          if (index !== current) {
            current = index;
            setActive(index);
          }
        },
      });
      trigger.current = st;
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
      return () => {
        st.kill();
        trigger.current = null;
        setScrolly(false);
      };
    });
    return () => mm.revert();
  }, [steps.length]);

  // When the open step changes, its new line picks up the current progress straight away.
  useEffect(() => {
    if (progress.current) progress.current.style.transform = `scaleX(${stepP.current})`;
  }, [active]);

  const choose = (i: number) => {
    const st = trigger.current;
    if (!st) {
      setActive(i);
      return;
    }
    // Held version: scroll to just inside that step's stretch of the hold.
    const top = st.start + ((i + 0.08) / steps.length) * (st.end - st.start);
    const smooth = getLenis();
    if (smooth) smooth.scrollTo(top);
    else window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div ref={root} className="mt-10 grid grid-cols-1 gap-6 lg:mt-14 lg:grid-cols-12 lg:items-center lg:gap-16">
      <ol className="border-b border-white/[0.08] lg:col-span-5" aria-label="How it works, step by step">
        {steps.map((s, i) => {
          const open = i === active;
          const panelId = `${baseId}-step-${i}`;
          return (
            <li key={s.tag} className="relative border-t border-white/[0.08]">
              {/* The open step's top line: orange, filling as you scroll through it (held version), else a brighter line */}
              {open ? (
                scrolly ? (
                  <span
                    ref={progress}
                    aria-hidden="true"
                    className="absolute inset-x-0 -top-px h-px origin-left bg-[#CC6600]"
                    style={{ transform: `scaleX(${stepP.current})` }}
                  />
                ) : (
                  <span aria-hidden="true" className="absolute inset-x-0 -top-px h-px bg-white/30" />
                )
              ) : null}
              <button
                type="button"
                onClick={() => choose(i)}
                aria-expanded={open}
                aria-controls={panelId}
                className="group grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-4 text-left sm:py-5"
              >
                <span
                  className={`font-mono text-xs tabular-nums transition-colors duration-300 ${open ? "text-[#E67300]" : "text-white/35 group-hover:text-white/55"}`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`font-sans font-medium tracking-[-0.02em] transition-[color,font-size] duration-300 ${ease} ${
                    open ? "text-lg text-white lg:text-xl" : "text-base text-white/60 group-hover:text-white/85"
                  }`}
                >
                  {s.title}
                </span>
                <span
                  className={`font-mono text-[11px] transition-colors duration-300 ${open ? "text-white/60" : "text-white/35 group-hover:text-white/50"}`}
                >
                  {s.time}
                </span>
              </button>
              <div
                id={panelId}
                className={`grid transition-[grid-template-rows,opacity] duration-500 ${ease} ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              >
                <div className="overflow-hidden pl-[3rem]">
                  <p className="max-w-md font-sans text-[15px] leading-relaxed text-white/65">{s.body}</p>
                  <p className="pb-5 pt-3 font-mono text-[11px] text-white/45">{s.chips.join(" · ")}</p>
                  {/* Phones: the step's scene opens inside it */}
                  <div className="mb-5 overflow-hidden rounded-[2px] border border-white/[0.09] bg-[#0B0B1E] lg:hidden">
                    <StageArt index={i} on={open && artOn} label={`${s.title}: ${s.body}`} compact />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Wide screens: the open step's scene */}
      <div className="hidden lg:col-span-7 lg:block">
        <div className="overflow-hidden rounded-[2px] border border-white/[0.09] bg-[#0B0B1E]">
          <div className="relative grid">
            {steps.map((s, i) => (
              <div
                key={s.tag}
                aria-hidden={i !== active}
                className={`col-start-1 row-start-1 transition-opacity duration-500 ${ease} ${
                  i === active ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <StageArt index={i} on={i === active && artOn} label={`${s.title}: ${s.body}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
