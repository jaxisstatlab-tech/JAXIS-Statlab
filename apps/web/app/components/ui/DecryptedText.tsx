"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GLYPHS = "abcdefghijklmnopqrstuvwxyz0123456789_";
const INTRO_MS = 1250;

export default function DecryptedText({
  text,
  delay = 200,
  speed = 32,
  className = "",
}: {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
}) {
  const [output, setOutput] = useState(text);
  const timer = useRef<number | undefined>(undefined);

  const run = useCallback(() => {
    window.clearInterval(timer.current);
    let frame = 0;
    timer.current = window.setInterval(() => {
      const revealed = Math.floor(frame / 2);
      setOutput(
        Array.from(text)
          .map((ch, i) => (i < revealed || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      frame++;
      if (revealed >= text.length) window.clearInterval(timer.current);
    }, speed);
  }, [text, speed]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const introLeft = document.documentElement.dataset.intro === "skip" ? 0 : Math.max(0, INTRO_MS - performance.now());
    const start = window.setTimeout(run, delay + introLeft);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer.current);
    };
  }, [run, delay]);

  const onEnter = () => {
    if (window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) run();
  };

  return (
    <span className={className} aria-label={text} onMouseEnter={onEnter}>
      <span aria-hidden="true">{output}</span>
    </span>
  );
}
