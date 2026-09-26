"use client";

import { useEffect, useRef } from "react";

// The horizon arc; its bright glint travels along the rim to sit under the cursor.
export default function HorizonTracker() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.parentElement;
    if (!el || !section) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const radius = r.width / 2;
      const dx = Math.max(-radius, Math.min(radius, e.clientX - (r.left + radius)));
      el.style.setProperty("--ha", `${((Math.asin(dx / radius) * 180) / Math.PI).toFixed(2)}deg`);
    };
    const leave = () => el.style.removeProperty("--ha");
    section.addEventListener("pointermove", move);
    section.addEventListener("pointerleave", leave);
    return () => {
      section.removeEventListener("pointermove", move);
      section.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="horizon pointer-events-none absolute left-1/2 -translate-x-1/2" />;
}
