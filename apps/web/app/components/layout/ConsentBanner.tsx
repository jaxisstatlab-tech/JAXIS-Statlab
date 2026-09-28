"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "@phosphor-icons/react";
import {
  CONSENT_OPEN,
  getConsent,
  setConsent,
  type Consent,
} from "@/lib/consent";
import { btnGhost, btnPrimary } from "../ui/styles";

// Floating, wide consent banner modeled after the standard consent bar pattern.
// Shown until the visitor chooses, or when reopened from the footer's "Cookie settings".
export default function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Consent | null>(null);

  useEffect(() => {
    let timer = 0;
    if (getConsent() === null) {
      // Wait for the first-visit intro to finish before sliding in.
      const introPlays = document.documentElement.dataset.intro !== "skip";
      timer = window.setTimeout(() => setOpen(true), introPlays ? 2800 : 1000);
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

  // Lets other fixed UI (the mobile call-to-action bar) step aside while the card is up.
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
    // Centered bottom rail for wide floating banner
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-center sm:bottom-6 md:bottom-8">
      <div
        role="region"
        aria-label="Cookie choices"
        className="consent-card pointer-events-auto relative w-full max-w-4xl rounded-[2px] border border-white/12 bg-[#050513]/95 p-5 sm:p-6 backdrop-blur-md shadow-2xl shadow-black/80"
        data-open={open ? "" : undefined}
        inert={!open}
      >
        {/* Close button in top-right corner */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close cookie consent banner"
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-[2px] text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white sm:right-4 sm:top-4"
        >
          <X size={15} weight="bold" />
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 pr-6 sm:pr-8">
          {/* Title and message with privacy policy link */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Cookie size={18} weight="fill" className="text-[#CC6600] shrink-0" />
              <p className="font-sans text-sm sm:text-[15px] font-semibold text-white tracking-tight">
                Cookie Consent
              </p>
            </div>
            <p className="mt-1.5 font-sans text-xs sm:text-[13px] leading-relaxed text-white/70">
              By clicking &ldquo;Accept All&rdquo;, you agree to the storing of cookies on your device to enhance site navigation, analyze site usage, and assist in our research services.{" "}
              <Link
                href="/privacy"
                className="font-medium text-white underline decoration-white/35 underline-offset-4 transition-colors hover:text-[#CC6600]"
              >
                Privacy policy
              </Link>
            </p>
            {current ? (
              <p className="mt-1.5 font-mono text-[11px] text-white/45">
                Current choice:{" "}
                <span className="text-white/80 font-medium capitalize">
                  {current === "accepted" ? "Accepted" : "Rejected"}
                </span>
              </p>
            ) : null}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => choose("rejected")}
              className={`${btnGhost} h-9 px-4 text-xs sm:text-[13px]`}
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => choose("accepted")}
              className={`${btnPrimary} h-9 px-5 text-xs sm:text-[13px]`}
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
