"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize Lenis with optimized physics for silky ScrollTrigger pinning
    const lenis = new Lenis({
      lerp: 0.08, // Buttery smooth response without pinning drag lag
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    // Synchronize Lenis with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // Use GSAP's ticker to drive Lenis's requestAnimationFrame
    const update = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(update);

    // Disable GSAP's lag smoothing to prevent jank with Lenis
    gsap.ticker.lagSmoothing(0);

    // Expose lenis globally for programmatic navigation
    (window as any).__lenis = lenis;

    // Smoothly handle anchor links (Navbar, buttons, in-page links)
    const handleAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='#']");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#" || href === "#!") return;
      const targetEl = document.querySelector(href);
      if (targetEl) {
        e.preventDefault();
        window.history.pushState(null, "", href);
        lenis.scrollTo(targetEl as HTMLElement, { offset: -64, duration: 1.2 });
      }
    };
    document.addEventListener("click", handleAnchorClick);

    // Refresh ScrollTrigger after DOM has fully settled
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
      // If user arrived with a hash, smoothly scroll to it
      if (window.location.hash) {
        const hashEl = document.querySelector(window.location.hash);
        if (hashEl) {
          lenis.scrollTo(hashEl as HTMLElement, { offset: -64, duration: 1.0 });
        }
      }
    }, 250);

    // Suppress external browser extension unhandled rejections from interrupting Next.js Dev Overlay
    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason?.toString?.() || "";
      const stack = e.reason?.stack?.toString?.() || "";
      if (
        reason.includes("MetaMask") ||
        stack.includes("chrome-extension://") ||
        stack.includes("inpage.js")
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(update);
      document.removeEventListener("click", handleAnchorClick);
      clearTimeout(refreshTimer);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
}
