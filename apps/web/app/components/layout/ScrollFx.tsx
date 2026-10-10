"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { getLenis, setLenis } from "@/lib/smoothScroll";

gsap.registerPlugin(ScrollTrigger, SplitText);
// Phones resize the viewport as the address bar shows and hides; recalculating then makes the page jump.
ScrollTrigger.config({ ignoreMobileResize: true });

// Scroll-driven effects, wired by data attributes so sections stay server-rendered. All of it is off when the
// visitor asks for reduced motion. Touch screens keep the phone's own scrolling: no smooth-scroll takeover and no
// pinned sections, so a swipe always moves the page (taking over the fling made phone scrolling feel heavy, and
// pins held the screen while the page moved sideways). Swipe rows ([data-h-scroll]) are plain CSS snap rows there.
//   Lenis                 smooths mouse wheel and trackpad scrolling (mouse and trackpad only)
//   [data-hero]           hero copy drifts up and fades as you scroll away; its pixel field lags behind for depth
//   [data-tab-pin="5"]    wide screens: a step list pins under the navbar and scrolling moves through its steps,
//                         both ways (it gets "step-scroll" with the step index and --step-p for progress through
//                         the step, and can send "step-jump" to scroll to a step). Narrower screens stack the steps.
//   [data-split]          heading lines slide up out of a mask when scrolled into view
//   [data-parallax="0.3"] element drifts against the scroll (value = strength; mouse and trackpad only)
export default function ScrollFx() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    const conditions = {
      motion: "(prefers-reduced-motion: no-preference)",
      pointer: "(hover: hover) and (pointer: fine)",
      wide: "(min-width: 1024px)",
    };

    mm.add(conditions, (context) => {
      const { motion, pointer, wide } = context.conditions ?? {};
      const cleanups: (() => void)[] = [];
      if (!motion) return;

      // Smooth wheel scrolling for mouse and trackpad only; touch keeps native scrolling and momentum.
      let lenis: Lenis | null = null;
      let tick: ((time: number) => void) | null = null;
      if (pointer) {
        const smooth = new Lenis({ lerp: 0.1 });
        lenis = smooth;
        setLenis(smooth);
        smooth.on("scroll", ScrollTrigger.update);
        tick = (time: number) => smooth.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
      }

      const hero = document.querySelector<HTMLElement>("[data-hero]");
      if (hero) {
        const handoff = gsap.timeline({
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
        });
        const content = hero.querySelector("[data-hero-content]");
        const field = hero.querySelector(".pixel-field");
        if (content) handoff.to(content, { y: -90, opacity: 0, ease: "power1.in" }, 0);
        if (field) handoff.to(field, { y: 140, ease: "none" }, 0);
      }

      gsap.utils.toArray<HTMLElement>("[data-tab-pin]").forEach((block) => {
        if (!wide) return; // narrower screens show the steps stacked, scrolling normally
        const count = Math.max(1, Number(block.dataset.tabPin) || 1);
        let current = -1;
        block.setAttribute("data-pinned", "");
        const pinned = block;
        const trigger = ScrollTrigger.create({
          trigger: pinned,
          // Centred in the visible space below the navbar (64px).
          start: () => `top ${Math.round(Math.max(84, 64 + (window.innerHeight - 64 - pinned.offsetHeight) / 2))}px`,
          end: () => `+=${Math.round(window.innerHeight * 0.55 * count)}`,
          pin: pinned,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const x = self.progress * count;
            const index = Math.min(count - 1, Math.floor(x));
            block.style.setProperty("--step-p", String(Math.min(1, x - index)));
            if (index === current) return;
            current = index;
            block.dispatchEvent(new CustomEvent("step-scroll", { detail: index }));
          },
        });
        const jump = (e: Event) => {
          const index = (e as CustomEvent<number>).detail;
          const top = trigger.start + ((index + 0.35) / count) * (trigger.end - trigger.start);
          const smooth = getLenis();
          if (smooth) smooth.scrollTo(top);
          else window.scrollTo({ top, behavior: "smooth" });
        };
        block.addEventListener("step-jump", jump);
        cleanups.push(() => {
          block.removeEventListener("step-jump", jump);
          block.removeAttribute("data-pinned");
          block.style.removeProperty("--step-p");
        });
      });

      // Pins were created per feature, not in page order; sort so each accounts for the pins above it.
      ScrollTrigger.sort();
      ScrollTrigger.refresh();

      const splits = gsap.utils.toArray<HTMLElement>("[data-split]").map((heading) =>
        SplitText.create(heading, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 0.9,
              ease: "expo.out",
              stagger: 0.08,
              scrollTrigger: { trigger: heading, start: "top 88%", once: true },
            }),
        }),
      );

      (pointer ? gsap.utils.toArray<HTMLElement>("[data-parallax]") : []).forEach((el) => {
        const distance = Number(el.dataset.parallax || 0.3) * 120;
        gsap.fromTo(
          el,
          { y: distance },
          {
            y: -distance,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });

      return () => {
        cleanups.forEach((fn) => fn());
        splits.forEach((s) => s.revert());
        if (tick) gsap.ticker.remove(tick);
        if (lenis) {
          gsap.ticker.lagSmoothing(500, 33);
          lenis.destroy();
          setLenis(null);
        }
      };
    });

    return () => mm.revert();
  }, []);

  return null;
}
