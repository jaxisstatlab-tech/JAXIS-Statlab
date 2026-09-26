"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

// Scroll-driven effects, wired by data attributes so sections stay server-rendered:
//   [data-split]          heading lines slide up out of a mask when scrolled into view
//   [data-parallax="0.3"] element drifts against the scroll (value = strength)
//   [data-pin-steps]      How it works pins while its [data-step] items light up in turn
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

    mm.add("(min-width: 1024px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)", () => {
      const block = document.querySelector<HTMLElement>("[data-pin-steps]");
      if (!block) return;
      const steps = Array.from(block.querySelectorAll<HTMLElement>("[data-step]"));
      const bar = block.querySelector<HTMLElement>("[data-step-bar]");

      const activate = (index: number) =>
        steps.forEach((step, i) => {
          step.dataset.state = i < index ? "done" : i === index ? "active" : "next";
        });

      block.setAttribute("data-pinned", "");
      activate(0);

      ScrollTrigger.create({
        trigger: block,
        start: "center center",
        end: `+=${steps.length * 55}%`,
        pin: true,
        onUpdate: (self) => {
          activate(Math.min(steps.length - 1, Math.floor(self.progress * steps.length)));
          if (bar) bar.style.transform = `scaleY(${self.progress})`;
        },
      });

      return () => {
        block.removeAttribute("data-pinned");
        steps.forEach((step) => delete step.dataset.state);
      };
    });

    return () => mm.revert();
  }, []);

  return null;
}
