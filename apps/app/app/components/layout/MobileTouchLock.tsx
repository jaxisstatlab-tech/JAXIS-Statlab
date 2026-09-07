"use client";

import { useEffect } from "react";

/**
 * MobileTouchLock — Enterprise Touch Polish
 * Prevents accidental multi-touch pinch-to-zoom and double-tap zoom on mobile
 * (iOS Safari and Android Chrome), keeping the application shell rigid and native-feeling.
 * Single-finger native scrolling remains 100% fluid.
 * Allows zooming inside containers marked with [data-allow-zoom] or .allow-zoom.
 */
export function MobileTouchLock() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Prevent iOS Safari proprietary pinch-to-zoom gestures
    const handleGesture = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-allow-zoom], .allow-zoom")) {
        return;
      }
      e.preventDefault();
    };

    // 2. Prevent multi-touch pinch zoom on touchmove while keeping 1-finger scrolling fluid
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        const target = e.target as HTMLElement | null;
        if (target?.closest?.("[data-allow-zoom], .allow-zoom")) {
          return;
        }
        e.preventDefault();
      }
    };

    // 3. Prevent accidental double-tap zoom on fast tapping
    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        const target = e.target as HTMLElement | null;
        // Don't block double-taps on inputs or text selection areas
        if (
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.closest?.("[data-allow-zoom], .allow-zoom")
        ) {
          lastTouchEnd = now;
          return;
        }
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener("gesturestart", handleGesture, { passive: false });
    document.addEventListener("gesturechange", handleGesture, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", handleGesture);
      document.removeEventListener("gesturechange", handleGesture);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return null;
}
