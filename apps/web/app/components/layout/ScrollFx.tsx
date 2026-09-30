"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);
// Phones resize the viewport as the address bar shows and hides; recalculating then makes the page jump.
ScrollTrigger.config({ ignoreMobileResize: true });

// Scroll-driven effects, wired by data attributes so sections stay server-rendered:
//   [data-split]          heading lines slide up out of a mask when scrolled into view
//   [data-parallax="0.3"] element drifts against the scroll (value = strength)
export default function ScrollFx() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
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

      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
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

      return () => splits.forEach((s) => s.revert());
    });

    return () => mm.revert();
  }, []);

  return null;
}
