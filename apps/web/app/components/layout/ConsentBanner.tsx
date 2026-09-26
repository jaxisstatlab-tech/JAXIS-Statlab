"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "@phosphor-icons/react";
import { CONSENT_OPEN, getConsent, setConsent, type Consent } from "@/lib/consent";
import { btnGhost, btnPrimary } from "../ui/styles";

// Small, non-blocking consent card. Shown until the visitor chooses, and again from the footer's
// "Cookie settings". Accept and Reject carry equal weight; nothing that needs consent loads before Accept.
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
    <div
      role="region"
      aria-label="Cookie choices"
      className="consent-card fixed inset-x-4 bottom-4 z-[60] rounded-[2px] border border-white/12 bg-[#010D1F]/95 p-5 backdrop-blur-md sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-[23rem]"
      data-open={open ? "" : undefined}
      inert={!open}
    >
      <div className="flex items-center gap-2.5">
        <Cookie size={18} weight="fill" className="text-[#CC6600]" />
        <p className="font-sans text-[15px] font-semibold text-white">Your privacy</p>
      </div>
      <p className="mt-2 font-sans text-[13px] leading-relaxed text-white/65">
        We&apos;d like to count visits anonymously to learn which pages help people. No ads, and we never sell your data.
      </p>
      <Link
        href="/privacy#cookies"
        className="mt-2 inline-block font-mono text-[11px] text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
      >
        Read our Privacy Policy
      </Link>
      {current ? (
        <p className="mt-3 font-mono text-[11px] text-white/45">
          Current choice: <span className="text-white/80">{current === "accepted" ? "Accepted" : "Rejected"}</span>
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => choose("rejected")} className={`${btnGhost} h-9 text-[13px]`}>
          Reject
        </button>
        <button type="button" onClick={() => choose("accepted")} className={`${btnPrimary} h-9 text-[13px]`}>
          Accept
        </button>
      </div>
    </div>
  );
}
