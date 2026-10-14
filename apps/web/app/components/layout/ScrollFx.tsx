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
//   [data-hero]           hero copy drifts up and fades as you scroll away
//   [data-split]          heading lines slide up out of a mask when scrolled into view
//   [data-parallax="0.3"] element drifts against the scroll (value = strength; mouse and trackpad only)
export default function ScrollFx() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    const conditions = {
      motion: "(prefers-reduced-motion: no-preference)",
      pointer: "(hover: hover) and (pointer: fine)",
    };

    mm.add(conditions, (context) => {
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
        const handoff = gsap.timeline({
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
        });
        const content = hero.querySelector("[data-hero-content]");
        if (content) handoff.to(content, { y: -90, opacity: 0, ease: "power1.in" }, 0);
        // (The background no longer moves with scroll: the GPU canvas reacts to scroll itself, and shifting it would
        // cut its top glow off with a hard edge.)
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

    return () => mm.revert();
  }, []);

  return null;
}
