"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export const SCROLL_LOCK_EVENT = "jaxis:scroll-lock";

// Lenis smooth scrolling that only runs its frame loop while a scroll is in progress,
// so the page is fully idle (no per-frame work) when nobody is scrolling.
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.1, anchors: { offset: -72 } });

    let frame = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      frame = lenis.isScrolling ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };

    lenis.on("virtual-scroll", kick);
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest("a[href^='#']")) kick();
    };
    document.addEventListener("click", onClick);

    const onLock = (e: Event) => ((e as CustomEvent<boolean>).detail ? lenis.stop() : lenis.start());
    window.addEventListener(SCROLL_LOCK_EVENT, onLock);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onClick);
      window.removeEventListener(SCROLL_LOCK_EVENT, onLock);
      lenis.destroy();
    };
  }, []);

  return null;
}
