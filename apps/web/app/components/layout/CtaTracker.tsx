"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
import { getConsent } from "@/lib/consent";

// Counts clicks on key buttons, only for visitors who accepted analytics.
export default function CtaTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cta]");
      if (!el?.dataset.cta || getConsent() !== "accepted") return;
      track("cta_click", { cta: el.dataset.cta });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
