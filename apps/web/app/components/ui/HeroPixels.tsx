"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CELL, COLS, ROWS } from "./pixelGrid";

const HOLD_MS = 90;

// Lights the grid cells under the cursor and lets them fade out, leaving a short trail.
export default function HeroPixels({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = ref.current;
    const section = wrap?.parentElement;
    const svg = wrap?.querySelector("svg");
    if (!wrap || !section || !svg) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cells = Array.from(svg.children) as SVGElement[];
    const timers = new Map<number, number>();
    const point = svg.createSVGPoint();
    let last = -1;

    const heat = (index: number, level: "hot" | "warm") => {
      const cell = cells[index];
      if (!cell || !cell.classList.contains("px")) return;
      if (level === "warm" && cell.dataset.heat === "hot") return;
      cell.dataset.heat = level;
      window.clearTimeout(timers.get(index));
      timers.set(
        index,
        window.setTimeout(() => {
          delete cell.dataset.heat;
          timers.delete(index);
        }, HOLD_MS),
      );
    };

    const onMove = (e: PointerEvent) => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      point.x = e.clientX;
      point.y = e.clientY;
      const p = point.matrixTransform(ctm.inverse());
      const col = Math.floor(p.x / CELL);
      const row = Math.floor(p.y / CELL);
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return;
      const index = row * COLS + col;
      if (index === last) return;
      last = index;
      heat(index, "hot");
      if (col > 0) heat(index - 1, "warm");
      if (col < COLS - 1) heat(index + 1, "warm");
      if (row > 0) heat(index - COLS, "warm");
      if (row < ROWS - 1) heat(index + COLS, "warm");
    };

    section.addEventListener("pointermove", onMove);
    return () => {
      section.removeEventListener("pointermove", onMove);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      {children}
    </div>
  );
}
