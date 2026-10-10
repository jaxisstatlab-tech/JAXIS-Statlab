"use client";

import { useEffect, useState } from "react";

// Under a swipe row on phones: which card is in view, how many there are, and a dot per card to jump to it.
// The row itself is a plain CSS snap row (native swiping); this only follows its scroll position.
export default function SwipeDots({ target, label = "Swipe for more" }: { target: string; label?: string }) {
  const [count, setCount] = useState(0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const row = document.getElementById(target);
    if (!row) return;
    const cards = () => Array.from(row.children) as HTMLElement[];
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const list = cards();
        const first = list[0]?.offsetLeft ?? 0;
        let best = 0;
        let gap = Infinity;
        list.forEach((card, i) => {
          const d = Math.abs(card.offsetLeft - first - row.scrollLeft);
          if (d < gap) {
            gap = d;
            best = i;
          }
        });
        // At the end of the row the last card counts as shown even if it can't reach the left edge.
        if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 4) best = list.length - 1;
        setCount(list.length);
        setIndex(best);
      });
    };
    update();
    row.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      row.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [target]);

  if (count < 2) return null;

  const go = (i: number) => {
    const row = document.getElementById(target);
    const list = row ? (Array.from(row.children) as HTMLElement[]) : [];
    if (!row || !list[i]) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({ left: list[i]!.offsetLeft - (list[0]?.offsetLeft ?? 0), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="mt-3 flex items-center justify-between gap-4 sm:hidden">
      <span className="whitespace-nowrap font-mono text-[11px] text-white/45">
        <span className="text-white/70">{index + 1}</span> / {count} · {label}
      </span>
      <div className="flex">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show card ${i + 1} of ${count}`}
            aria-current={i === index ? "true" : undefined}
            className="flex h-10 w-6 items-center justify-center"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-4 bg-[#FF8A1F]" : "w-1.5 bg-white/25"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
