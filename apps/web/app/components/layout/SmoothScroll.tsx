"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export const SCROLL_LOCK_EVENT = "jaxis:scroll-lock";

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      anchors: { offset: -72 },
    });

    const onLock = (e: Event) => ((e as CustomEvent<boolean>).detail ? lenis.stop() : lenis.start());
    window.addEventListener(SCROLL_LOCK_EVENT, onLock);

    return () => {
      window.removeEventListener(SCROLL_LOCK_EVENT, onLock);
      lenis.destroy();
    };
  }, []);

  return null;
}
