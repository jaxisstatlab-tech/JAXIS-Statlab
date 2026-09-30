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
// visitor asks for reduced motion. Phones keep native touch scrolling and skip the costlier effects.
//   Lenis                 smooths mouse wheel and trackpad scrolling; on touch it also takes over the fling
//                         (syncTouch) with a softer, slower glide so a quick swipe can't race past sections
//   [data-hero]           hero copy drifts up and fades as you scroll away; its pixel field lags behind for depth
//   [data-grid-draw]      a joined card grid draws its hairlines left to right, then its cards settle in
//   [data-h-scroll]       on phones, a swipe row pins mid-screen and scrolling down moves it sideways, so every
//                         card (and its picture) comes into view without a swipe. With data-h-snap it pages one
//                         whole card at a time; without it the row glides continuously.
//   [data-tab-pin="5"]    a step list pins under the navbar and scrolling moves through its steps, both ways (it
//                         gets "step-scroll" with the step index and --step-p for progress through the step, and
//                         can send "step-jump" to scroll to a step)
//   main > section        on large screens, each section recedes slightly as it scrolls out the top (not the first
//                         or last section, nor any section with sticky content, which a transform would break)
//   [data-split]          heading lines slide up out of a mask when scrolled into view
//   [data-parallax="0.3"] element drifts against the scroll (value = strength)
export default function ScrollFx() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    const conditions = {
      motion: "(prefers-reduced-motion: no-preference)",
      pointer: "(hover: hover) and (pointer: fine)",
      wide: "(min-width: 1024px)",
      phone: "(max-width: 639px)",
    };

    mm.add(conditions, (context) => {
      const { motion, pointer, wide, phone } = context.conditions ?? {};
      const cleanups: (() => void)[] = [];
      if (!motion) return;

      const lenis = new Lenis(
        pointer
          ? { lerp: 0.1 }
          : {
              syncTouch: true,
              // Lower lerp = the page eases toward the finger more gently.
              syncTouchLerp: 0.09,
              // Lower = a flick carries less momentum, so it coasts a shorter, calmer distance.
              touchInertiaExponent: 1.6,
              touchMultiplier: 1,
            },
      );
      setLenis(lenis);
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

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

      gsap.utils.toArray<HTMLElement>("[data-grid-draw]").forEach((frame) => {
        const cells = Array.from(frame.firstElementChild?.children ?? []);
        gsap.set(frame, { "--draw": 0 });
        gsap.set(cells, { autoAlpha: 0, y: 24 });
        gsap
          .timeline({ scrollTrigger: { trigger: frame, start: "top 82%", once: true } })
          .to(frame, { "--draw": 1, duration: 1.1, ease: "power2.inOut" })
          .to(
            cells,
            // Hand the cells back to their own classes afterwards (the step cards fade themselves on phones).
            { autoAlpha: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.07, clearProps: "opacity,visibility,transform" },
            0.25,
          );
      });

      if (phone) {
        gsap.utils.toArray<HTMLElement>("[data-h-scroll]").forEach((track) => {
          // Pin the grid frame or a marked wrapper (so a row that bleeds past the page margins keeps its width).
          const frame = track.closest<HTMLElement>("[data-grid-draw], [data-h-pin]") ?? track;
          const slides = Array.from(track.children) as HTMLElement[];
          const distance = () => Math.max(0, track.scrollWidth - track.clientWidth);
          if (distance() <= 0 || slides.length < 2) return;
          const snaps = track.hasAttribute("data-h-snap");
          gsap.set(track, { scrollSnapType: "none" });

          if (snaps) {
            // Paged: the scroll picks a card and the row glides to show that whole card, so it never rests between two.
            let current = -1;
            const show = (index: number, instant = false) => {
              if (index === current) return;
              current = index;
              const first = slides[0]?.offsetLeft ?? 0;
              const left = Math.min(distance(), (slides[index]?.offsetLeft ?? first) - first);
              gsap.to(track, { scrollLeft: left, duration: instant ? 0 : 0.55, ease: "power3.out", overwrite: true });
            };
            ScrollTrigger.create({
              trigger: frame,
              start: "center center",
              end: () => `+=${distance()}`,
              pin: frame,
              invalidateOnRefresh: true,
              onUpdate: (self) => show(Math.round(self.progress * (slides.length - 1))),
              onRefresh: (self) => {
                current = -1;
                show(Math.round(self.progress * (slides.length - 1)), true);
              },
            });
            return;
          }

          // Gliding: the row follows the scroll, trailing it a little, which reads smoother for long text.
          gsap.to(track, {
            scrollLeft: () => distance(),
            ease: "none",
            scrollTrigger: {
              trigger: frame,
              start: "center center",
              end: () => `+=${distance()}`,
              pin: frame,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });
        });
      }

      gsap.utils.toArray<HTMLElement>("[data-tab-pin]").forEach((block) => {
        const count = Math.max(1, Number(block.dataset.tabPin) || 1);
        let current = -1;
        block.setAttribute("data-pinned", "");
        // Phones pin the whole section content (heading included) so the held screen is full, not a short block.
        const pinned = (!wide && block.parentElement) || block;
        const trigger = ScrollTrigger.create({
          trigger: pinned,
          // Centred in the visible space: below the navbar (64px) and, on phones, above the sticky button bar (~72px).
          start: () => {
            const wide = window.innerWidth >= 1024;
            const room = window.innerHeight - 64 - (wide ? 0 : 72);
            return `top ${Math.round(Math.max(wide ? 84 : 72, 64 + (room - pinned.offsetHeight) / 2))}px`;
          },
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

      const sections = wide ? gsap.utils.toArray<HTMLElement>("main > section") : [];
      sections.forEach((section, i) => {
        // A transform on the section would break anything pinned or sticky inside it.
        if (i === 0 || i === sections.length - 1 || section.querySelector("[class*='sticky'], [data-tab-pin], [data-h-scroll]")) return;
        gsap.to(section, {
          scale: 0.97,
          opacity: 0.5,
          transformOrigin: "50% 100%",
          ease: "none",
          scrollTrigger: { trigger: section, start: "bottom 55%", end: "bottom top", scrub: true },
        });
      });

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

      return () => {
        cleanups.forEach((fn) => fn());
        splits.forEach((s) => s.revert());
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(500, 33);
        lenis.destroy();
        setLenis(null);
      };
    });

    return () => mm.revert();
  }, []);

  return null;
}
