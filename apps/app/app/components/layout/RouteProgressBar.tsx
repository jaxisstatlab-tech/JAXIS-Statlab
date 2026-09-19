"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ProgressState = "idle" | "starting" | "animating" | "completing" | "fading";

/**
 * Enterprise Dark Precision Route Transition Progress Bar.
 * Built with hardware-accelerated GPU transforms (transform: scaleX) to eliminate
 * all discrete stepping, layout reflow, and staggering. Glides with continuous,
 * butter-smooth physical deceleration, and smoothly completes on route change.
 */
export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ProgressState>("idle");
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const startProgress = useCallback(() => {
    clearTimers();
    // Step 1: Reset to 0 scale instantly without animation
    setState("starting");

    // Step 2: Next frame, trigger continuous, hardware-accelerated GPU scale-up
    const t1 = setTimeout(() => {
      setState("animating");
    }, 20);

    timersRef.current.push(t1);
  }, [clearTimers]);

  const completeProgress = useCallback(() => {
    clearTimers();
    // Step 3: Snap cleanly to 100% in 160ms
    setState("completing");

    // Step 4: Fade out gracefully
    const t2 = setTimeout(() => {
      setState("fading");
    }, 180);

    // Step 5: Reset back to idle
    const t3 = setTimeout(() => {
      setState("idle");
    }, 420);

    timersRef.current.push(t2, t3);
  }, [clearTimers]);

  // Complete progress when pathname or searchParams change
  useEffect(() => {
    if (state === "animating" || state === "starting") {
      completeProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Listen to navigation events from link clicks and the JAXIS event bus
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore right clicks or clicks with modifier keys
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = (e.target as HTMLElement)?.closest("a");
      if (!target || !target.href) return;

      try {
        const targetUrl = new URL(target.href, window.location.href);
        const isInternal = targetUrl.origin === window.location.origin;
        const isSamePath =
          targetUrl.pathname === window.location.pathname &&
          targetUrl.search === window.location.search;

        if (isInternal && !isSamePath && target.target !== "_blank") {
          startProgress();
        }
      } catch {
        // Ignore invalid URLs
      }
    };

    const handleNavStart = () => startProgress();
    const handleNavEnd = () => completeProgress();

    document.addEventListener("click", handleDocumentClick, { passive: true });
    window.addEventListener("jaxis:navigating-start", handleNavStart);
    window.addEventListener("jaxis:navigating-end", handleNavEnd);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      window.removeEventListener("jaxis:navigating-start", handleNavStart);
      window.removeEventListener("jaxis:navigating-end", handleNavEnd);
      clearTimers();
    };
  }, [startProgress, completeProgress, clearTimers]);

  if (state === "idle") return null;

  // GPU transform parameters based on current transition state
  let transform = "scaleX(0)";
  let transition = "none";
  let opacity = 1;

  if (state === "starting") {
    transform = "scaleX(0)";
    transition = "none";
    opacity = 1;
  } else if (state === "animating") {
    // Smooth 10s asymptotic glide from 0% to ~85% with continuous deceleration.
    // Zero setInterval steps, zero interruption, pure 120fps GPU compositor.
    transform = "scaleX(0.85)";
    transition = "transform 10000ms cubic-bezier(0.08, 0.82, 0.17, 1)";
    opacity = 1;
  } else if (state === "completing") {
    // Quick, tactile snap to 100%
    transform = "scaleX(1)";
    transition = "transform 160ms cubic-bezier(0.2, 0, 0, 1)";
    opacity = 1;
  } else if (state === "fading") {
    // Fade out while holding 100%
    transform = "scaleX(1)";
    transition = "opacity 200ms ease-out";
    opacity = 0;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[2px] overflow-hidden"
    >
      <div
        className="h-full w-full bg-gradient-to-r from-[#CC6600] via-[#E67300] to-[#FFA040] shadow-[0_0_8px_rgba(204,102,0,0.7)] relative origin-left"
        style={{
          transform,
          transition,
          opacity,
          willChange: "transform, opacity",
        }}
      >
        {/* Soft, warm amber laser tip (replaces the harsh white block) */}
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-r from-transparent via-[#FFB366]/40 to-[#FFE0B2]/90 shadow-[0_0_10px_rgba(255,160,64,0.8)]" />
      </div>
    </div>
  );
}
