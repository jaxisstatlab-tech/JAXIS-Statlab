"use client";

import { useEffect, useState } from "react";

const LAYERS = 4;

// Progressive blur pinned to the bottom of the viewport. Hides once the footer is in view.
export default function GradualBlur() {
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver(([entry]) => setAtEnd(Boolean(entry?.isIntersecting)));
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  return (
    <div aria-hidden="true" className="gradual-blur" data-hidden={atEnd ? "" : undefined}>
      {Array.from({ length: LAYERS }, (_, i) => (
        <div key={i} />
      ))}
    </div>
  );
}
