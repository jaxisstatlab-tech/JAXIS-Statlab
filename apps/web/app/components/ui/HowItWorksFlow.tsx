"use client";

import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChartBar, DownloadSimple, Receipt, UploadSimple, Wallet, type Icon } from "@phosphor-icons/react";
import { getLenis } from "@/lib/smoothScroll";
import type { HowStep as Step } from "../../content/site";
import StageArt from "./StageArt";

export type { Step };

const ease = "ease-[cubic-bezier(0.23,1,0.32,1)]";
const ICONS: Icon[] = [UploadSimple, Receipt, Wallet, ChartBar, DownloadSimple];
/** Scroll per step while the section is held, as a share of the screen height. */
const SCROLL_PER_STEP = 0.5;

gsap.registerPlugin(ScrollTrigger);

// How it works as a compact step list beside one scene, about a screen tall.
// The steps are an accordion: each has a small icon tile and a dashed line down to the next; only the open step shows
// its description, and the scene for the open step sits on the right.
// Wide screens with a mouse or trackpad: scrolling drives it. When the section reaches the screen it holds in place
// (ScrollTrigger pin), and scrolling moves through the steps, forwards and backwards; the dashed line under the open
// step fills as you scroll through that step, and after the last step the page carries on. Clicking a step scrolls to
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
          if (progress.current) progress.current.style.transform = `scaleY(${stepP.current})`;
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
    if (progress.current) progress.current.style.transform = `scaleY(${stepP.current})`;
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
      <ol className="lg:col-span-5" aria-label="How it works, step by step">
        {steps.map((s, i) => {
          const open = i === active;
          const StepIcon = ICONS[i] ?? UploadSimple;
          const last = i === steps.length - 1;
          const panelId = `${baseId}-step-${i}`;
          return (
            <li key={s.tag} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4">
              {/* Icon tile and the dashed line down to the next step */}
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border transition-[background-color,border-color,color] duration-300 ${ease} ${
                    open ? "border-white/20 bg-white/[0.08] text-white" : "border-white/[0.09] bg-white/[0.02] text-white/45"
                  }`}
                >
                  <StepIcon size={16} weight="fill" />
                </span>
                {!last || open ? (
                  <span aria-hidden="true" className="relative my-2 w-px flex-1 border-l border-dashed border-white/15">
                    {open && scrolly ? (
                      <span
                        ref={progress}
                        className="absolute -left-px top-0 h-full w-px origin-top bg-[#CC6600]"
                        style={{ transform: `scaleY(${stepP.current})` }}
                      />
                    ) : null}
                  </span>
                ) : null}
              </div>

              <div className={last ? "" : "pb-5"}>
                <button
                  type="button"
                  onClick={() => choose(i)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="group block w-full rounded-[2px] text-left"
                >
                  <span
                    className={`block font-mono text-[11px] uppercase tracking-[0.14em] transition-colors duration-300 ${
                      open ? "text-[#E67300]" : "text-white/40 group-hover:text-white/60"
                    }`}
                  >
                    Step {i + 1}
                  </span>
                  <span
                    className={`mt-1 block font-sans text-lg font-medium tracking-[-0.02em] transition-colors duration-300 lg:text-xl ${
                      open ? "text-white" : "text-white/55 group-hover:text-white/80"
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
                <div
                  id={panelId}
                  className={`grid transition-[grid-template-rows,opacity] duration-500 ${ease} ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-md pt-2 font-sans text-[15px] leading-relaxed text-white/60">{s.body}</p>
                    <p className="pt-2 font-sans text-xs text-white/40">Usually {s.time.charAt(0).toLowerCase() + s.time.slice(1)}</p>
                    {/* Phones: the step's scene opens inside it */}
                    <div className="mt-4 overflow-hidden rounded-[2px] border border-white/[0.09] bg-[#0B0B1E] lg:hidden">
                      <StageArt index={i} on={open && artOn} label={`${s.title}: ${s.body}`} compact />
                    </div>
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
