"use client";

import { useEffect } from "react";

// Glides to #section links on the current page. Done per click rather than with CSS
// `scroll-behavior: smooth`, which would also animate the browser's Back/Forward scroll
// restore and let the pinned "How it works" setup interrupt it.
export default function AnchorScroll() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a[href*='#']");
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;

      e.preventDefault();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      window.history.pushState(window.history.state, "", url.hash);
    };
    // Capture phase, so this runs before next/link handles the same click.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
