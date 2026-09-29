"use client";

import { useEffect, useRef } from "react";

// The horizon arc; its bright glint travels along the rim to sit under the cursor.
export default function HorizonTracker() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.parentElement;
    if (!el || !section) return;

    // Dynamically calculate the circle geometry so that the horizon arc spans
    // edge-to-edge across the entire section width without cutting off or leaving flat bottom corners.
    const updateGeometry = () => {
      const w = section.getBoundingClientRect().width || window.innerWidth;
      // Responsive peak height above floor and sagitta (curvature drop from center to edge).
      // On mobile, keep sagitta gentle (20-30px) so the arch is stretched wide
      // across the phone instead of curving steeply like a half-circle dome.
      let peakH = 140;
      let s = 28;

      if (w >= 1024) {
        peakH = 220;
        s = 115;
      } else if (w >= 640) {
        peakH = 175;
        s = 55;
      } else {
        s = Math.max(20, Math.min(30, Math.round(w * 0.07)));
        peakH = 140;
      }

      // Radius of circle passing through (0, peakH - s), (w/2, peakH), (w, peakH - s):
      // (w/2)^2 + (R - s)^2 = R^2 => R = (w^2 / (8 * s)) + (s / 2)
      const r = (w * w) / (8 * s) + s / 2;
      const d = Math.round(2 * r);
      const bottom = Math.round(peakH - d);

      // Desired glint linear width ~280px along the circumference
      const glintDeg = Math.max(1.5, Math.min(12, (280 / r) * (180 / Math.PI)));

      el.style.setProperty("--horizon-d", `${d}px`);
      el.style.setProperty("--horizon-bottom", `${bottom}px`);
      el.style.setProperty("--glint-angle", `${glintDeg.toFixed(2)}deg`);
    };

    updateGeometry();

    const ro = new ResizeObserver(() => {
      updateGeometry();
    });
    ro.observe(section);

    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) {
      return () => ro.disconnect();
    }

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const radius = r.width / 2;
      if (radius <= 0) return;
      const dx = Math.max(-radius, Math.min(radius, e.clientX - (r.left + radius)));
      el.style.setProperty("--ha", `${((Math.asin(dx / radius) * 180) / Math.PI).toFixed(2)}deg`);
    };
    const leave = () => el.style.removeProperty("--ha");

    section.addEventListener("pointermove", move);
    section.addEventListener("pointerleave", leave);

    return () => {
      ro.disconnect();
      section.removeEventListener("pointermove", move);
      section.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="horizon pointer-events-none absolute left-1/2 -translate-x-1/2" />;
}

