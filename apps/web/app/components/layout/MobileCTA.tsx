"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { LOGIN_URL } from "@/lib/config";
import { btnPrimary } from "../ui/styles";

export default function MobileCTA() {
  const [pastHero, setPastHero] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const end = document.getElementById("final-cta");
    const onScroll = () => {
      setPastHero(window.scrollY > 640);
      setAtEnd(end ? end.getBoundingClientRect().top < window.innerHeight * 0.85 : false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const visible = pastHero && !atEnd;

  return (
    <div
      aria-hidden={!visible}
      className={`mobile-cta fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#010114]/90 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 ease-out lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-sans text-sm font-medium text-white">Fixed price in 24 hours</div>
          <div className="truncate font-mono text-[11px] text-white/55">No payment needed to ask</div>
        </div>
        <a href={LOGIN_URL} data-cta="mobile-sticky-send" tabIndex={visible ? 0 : -1} className={`${btnPrimary} shrink-0`}>
          Send your study
          <ArrowRight size={14} weight="bold" />
        </a>
      </div>
    </div>
  );
}
