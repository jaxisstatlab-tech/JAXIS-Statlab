"use client";

import { useEffect, useRef, useState } from "react";

export default function RotatingWord({
  words,
  interval = 2800,
  className = "",
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [{ index, prev }, setTurn] = useState<{ index: number; prev: number | null }>({ index: 0, prev: null });
  const [widths, setWidths] = useState<number[]>([]);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const measure = () => {
      const el = measureRef.current;
      if (!el) return;
      setWidths(Array.from(el.children).map((c) => (c as HTMLElement).getBoundingClientRect().width));
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [words]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setTurn((t) => ({ index: (t.index + 1) % words.length, prev: t.index }));
    }, interval);
    return () => window.clearInterval(id);
  }, [words.length, interval]);

  const width = widths[index];

  return (
    <span
      className={`rot-slot ${className}`}
      style={width ? { width: `${width}px` } : undefined}
      aria-hidden="true"
    >
      <span className="invisible">{words[index]}</span>
      {words.map((word, w) => {
        const state = w === index ? "in" : w === prev ? "out" : "idle";
        return (
          <span key={word} className="rot-word" data-state={state}>
            {Array.from(word).map((ch, c) => (
              <span key={c} className="rot-char" style={{ transitionDelay: state === "idle" ? "0ms" : `${c * 28}ms` }}>
                {ch}
              </span>
            ))}
          </span>
        );
      })}
      <span ref={measureRef} className="rot-measure">
        {words.map((word) => (
          <span key={word}>{word}</span>
        ))}
      </span>
    </span>
  );
}
