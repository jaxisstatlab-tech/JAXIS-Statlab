import type Lenis from "lenis";

// The page's Lenis instance, set by ScrollFx while smooth scrolling is on (null otherwise), so other components
// (like AnchorScroll) can scroll through it instead of fighting it with native scrolling.
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function getLenis() {
  return instance;
}
