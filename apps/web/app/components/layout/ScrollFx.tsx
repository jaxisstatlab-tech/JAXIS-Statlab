"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { setLenis } from "@/lib/smoothScroll";

gsap.registerPlugin(ScrollTrigger, SplitText);
// Phones resize the viewport as the address bar shows and hides; recalculating then makes the page jump.
ScrollTrigger.config({ ignoreMobileResize: true });

// Scroll-driven effects, wired by data attributes so sections stay server-rendered. All of it is off when the
// visitor asks for reduced motion. Touch screens keep the phone's own scrolling: no smooth-scroll takeover and no
// pinned sections, so a swipe always moves the page (taking over the fling made phone scrolling feel heavy, and
// pins held the screen while the page moved sideways). Swipe rows ([data-h-scroll]) are plain CSS snap rows there.
//   Lenis                 smooths mouse wheel and trackpad scrolling (mouse and trackpad only)
//   [data-hero]           the hero holds while the next section slides over it (phones too), receding and
//                         dimming; its copy and card drift up at different speeds and fade
//   [data-sheet-feather]  the soft top edge of the section that slides over the held hero fades in as it arrives
//   [data-split]          heading lines slide up out of a mask when scrolled into view
//   [data-parallax="0.3"] element drifts against the scroll (value = strength; mouse and trackpad only)
export default function ScrollFx() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    const conditions = {
      motion: "(prefers-reduced-motion: no-preference)",
      pointer: "(hover: hover) and (pointer: fine)",
    };

    // Set up once the page is idle, so this work doesn't land on the hero intro's first moments (it stalled them).
    const setup = () => mm.add(conditions, (context) => {
      const { motion, pointer } = context.conditions ?? {};
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
        // The hero holds (CSS sticky, .hero-hold[data-stick]) while the next section slides up over it like a sheet.
        // On phones the hero is taller than the screen, so it scrolls normally until its bottom (the results card) is on
        // screen, then holds there: `lead` is that distance (0 on desktop, where the hero is one screen tall).
        const lead = () => Math.max(0, hero.offsetHeight - window.innerHeight);
        const setStick = () => hero.style.setProperty("--hero-stick", `${-lead()}px`);
        setStick();
        hero.dataset.stick = "";
        ScrollTrigger.addEventListener("refreshInit", setStick);
        cleanups.push(() => {
          ScrollTrigger.removeEventListener("refreshInit", setStick);
          delete hero.dataset.stick;
          hero.style.removeProperty("--hero-stick");
        });

        // Measured from the hero's wrapper: while the hero holds, its own position reads as fixed on screen, which
        // would throw the start off if the page is re-measured mid-scroll. One screen of scrolling covers it.
        const handoff = gsap.timeline({
          scrollTrigger: {
            trigger: hero.parentElement ?? hero,
            start: () => `top+=${lead()} top`,
            end: () => `+=${window.innerHeight}`,
            invalidateOnRefresh: true,
            scrub: true,
          },
        });
        // Parallax hand-off: the copy leaves fastest, the results card a little slower, and the background (moved by
        // HeroHorizon itself, which also raises the sun) slowest, so the next section slides up over the hero.
        const copy = hero.querySelector("[data-hero-copy]");
        const card = hero.querySelector("[data-hero-card]");
        if (copy && card) {
          handoff.to(copy, { y: -140, opacity: 0, ease: "power1.in" }, 0);
          handoff.to(card, { y: -60, scale: 0.97, opacity: 0, ease: "power1.in" }, 0);
        } else {
          const content = hero.querySelector("[data-hero-content]");
          if (content) handoff.to(content, { y: -90, opacity: 0, ease: "power1.in" }, 0);
        }
        const dim = hero.querySelector("[data-hero-dim]");
        if (dim) handoff.to(dim, { opacity: 0.5, ease: "power1.in" }, 0);

        // Underneath the incoming section the hero recedes (scales down a little) and dims.
        const stage = hero.querySelector("[data-hero-stage]");
        if (stage) {
          handoff.to(stage, { scale: 0.92, ease: "power1.in" }, 0);
          // The covering section's top edge is feathered (a tall fade into the page colour), so the hero dissolves
          // into it with no visible edge; the feather appears as soon as scrolling starts.
          const feather = document.querySelector("[data-sheet-feather]");
          // (On the hero's own timeline: the other tweens there last 0.5, so 0.06 is the first 12% of the scroll.)
          if (feather) handoff.fromTo(feather, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "none" }, 0);
          if (dim) handoff.to(dim, { opacity: 0.65, ease: "power1.in" }, 0);
        }
      }

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
    // Safari has no requestIdleCallback: a short timeout instead.
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idleId = hasIdle ? window.requestIdleCallback(() => setup(), { timeout: 1200 }) : 0;
    const timer = hasIdle ? 0 : window.setTimeout(setup, 400);

    return () => {
      if (idleId) window.cancelIdleCallback(idleId);
      window.clearTimeout(timer);
      mm.revert();
    };
  }, []);

  return null;
}
