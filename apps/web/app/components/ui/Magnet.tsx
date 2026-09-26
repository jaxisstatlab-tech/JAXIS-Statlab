"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Pulls its child gently toward the cursor when the pointer comes within `reach` px.
export default function Magnet({ children, reach = 70, strength = 0.28 }: { children: ReactNode; reach?: number; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const near = Math.abs(dx) < r.width / 2 + reach && Math.abs(dy) < r.height / 2 + reach;
      el.style.transform = near ? `translate3d(${dx * strength}px, ${dy * strength}px, 0)` : "";
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reach, strength]);

  return (
    <span ref={ref} className="magnet inline-flex">
      {children}
    </span>
  );
}
