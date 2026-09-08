"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * High-performance, zero-dependency route transition progress bar.
 * Renders a precision 2px Enterprise Orange (#CC6600) laser bar at the top edge
 * of the viewport during navigation, giving instantaneous tactile feedback.
 */
export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setIsVisible(true);
    setProgress(25);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 55) return prev + 12;
        if (prev < 78) return prev + 5;
        if (prev < 90) return prev + 2;
        if (prev < 96) return prev + 0.6;
        return prev;
      });
    }, 140);
  };

  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);

    finishTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setProgress(0), 200);
    }, 280);
  };

  // Complete progress when pathname or searchParams change
  useEffect(() => {
    if (isVisible) {
      completeProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Listen for click events on links to start progress instantly
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore right clicks or clicks with modifier keys
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = (e.target as HTMLElement)?.closest("a");
      if (!target || !target.href) return;

      const targetUrl = new URL(target.href, window.location.href);
      const isInternal = targetUrl.origin === window.location.origin;
      const isSamePath =
        targetUrl.pathname === window.location.pathname &&
        targetUrl.search === window.location.search;

      if (isInternal && !isSamePath && target.target !== "_blank") {
        startProgress();
      }
    };

    document.addEventListener("click", handleDocumentClick, { passive: true });

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[2.5px] overflow-hidden"
    >
      <div
        className="h-full bg-gradient-to-r from-[#CC6600] via-[#E67300] to-[#FFA040] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] relative"
        style={{
          width: `${progress}%`,
          opacity: isVisible ? 1 : 0,
        }}
      >
        {/* Leading edge laser beam */}
        <div className="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-r from-transparent via-white/40 to-white/95" />
      </div>
    </div>
  );
}
