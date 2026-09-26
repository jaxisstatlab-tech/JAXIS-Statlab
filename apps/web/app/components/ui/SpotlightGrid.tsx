"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Lights up the 1px gaps between tiles around the cursor.
export default function SpotlightGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || still.matches) return;

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
      el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
    };
    // Jump to the cursor on entry so only subsequent movement eases.
    const enter = (e: PointerEvent) => {
      el.style.transition = "none";
      move(e);
      void el.offsetWidth;
      el.style.transition = "";
      el.setAttribute("data-spot", "");
    };
    const leave = () => el.removeAttribute("data-spot");

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={ref} className={`spotlight-frame rounded-[2px] p-px ${className}`}>
      {children}
    </div>
  );
}
