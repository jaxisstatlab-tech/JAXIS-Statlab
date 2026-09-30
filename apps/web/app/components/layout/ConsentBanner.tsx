"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_OPEN, getConsent, setConsent, type Consent } from "@/lib/consent";

const btn =
  "inline-flex h-8 items-center justify-center rounded-[2px] px-3.5 font-sans text-[13px] font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97]";

// Small consent prompt: a slim bar on phones, a compact card in the bottom-left corner on larger screens.
// Shown until the visitor chooses, or when reopened from the footer's "Cookie settings".
export default function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Consent | null>(null);

  useEffect(() => {
    let timer = 0;
    if (getConsent() === null) {
      // Wait for the first-visit intro to finish before sliding in.
      const introPlays = document.documentElement.dataset.intro !== "skip";
      timer = window.setTimeout(() => setOpen(true), introPlays ? 2000 : 1000);
    }
    const reopen = () => {
      setCurrent(getConsent());
      setOpen(true);
    };
    window.addEventListener(CONSENT_OPEN, reopen);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(CONSENT_OPEN, reopen);
    };
  }, []);

  // Lets other fixed UI (the mobile call-to-action bar) step aside while the prompt is up.
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.setAttribute("data-consent-open", "");
    else root.removeAttribute("data-consent-open");
  }, [open]);

  const choose = (value: Consent) => {
    setOpen(false);
    setConsent(value);
  };

  return (
    <div
      role="region"
      aria-label="Cookie choices"
      className="consent-card fixed inset-x-0 bottom-0 z-[60] border-t border-white/10 bg-[#050513]/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[22rem] sm:rounded-[2px] sm:border sm:p-4 sm:shadow-2xl sm:shadow-black/60"
      data-open={open ? "" : undefined}
      inert={!open}
    >
      <div className="flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-3.5">
        <p className="min-w-0 flex-1 font-sans text-[12px] leading-snug text-white/70 sm:text-[13px] sm:leading-relaxed">
          We&apos;d like to use analytics to see which pages help students most. No ads.{" "}
          <Link
            href="/privacy"
            className="text-white underline decoration-white/35 underline-offset-2 transition-colors hover:decoration-white"
          >
            Privacy
          </Link>
          {current ? (
            <span className="mt-1 block font-mono text-[11px] text-white/55">
              Now: {current === "accepted" ? "accepted" : "declined"}
            </span>
          ) : null}
        </p>
        <div className="flex shrink-0 gap-2 sm:grid sm:grid-cols-2">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className={`${btn} border border-white/15 text-white hover:border-white/35 hover:bg-white/[0.04]`}
          >
            Decline
          </button>
          <button type="button" onClick={() => choose("accepted")} className={`${btn} bg-[#CC6600] text-white hover:bg-[#E67300]`}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
