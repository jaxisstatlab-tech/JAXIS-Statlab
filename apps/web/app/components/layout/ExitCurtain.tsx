"use client";

import { useEffect } from "react";
import { APP_URL } from "@/lib/config";

const COVER_MS = 260;

// Clicking through to the app drops a navy curtain, then navigates with ?via=web so the
// app's auth pages can lift a matching curtain. Plain clicks only; modified clicks open normally.
export default function ExitCurtain() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const appOrigin = new URL(APP_URL).origin;
    const root = document.documentElement;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== appOrigin) return;

      e.preventDefault();
      url.searchParams.set("via", "web");
      root.setAttribute("data-leaving", "");
      window.setTimeout(() => window.location.assign(url.toString()), COVER_MS);
    };

    // Coming back with the browser's Back button restores this page from cache; lift the curtain.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) root.removeAttribute("data-leaving");
    };

    document.addEventListener("click", onClick);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

  return (
    <div aria-hidden="true" className="exit-curtain">
      <div className="intro-mark">
        <span className="exit-bar" style={{ height: "38%", background: "#D9D9D9" }} />
        <span className="exit-bar" style={{ height: "68%", background: "#CC6600" }} />
        <span className="exit-bar" style={{ height: "100%", background: "#E67300" }} />
      </div>
    </div>
  );
}
