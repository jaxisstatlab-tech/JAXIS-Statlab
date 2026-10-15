// When the home hero holds in place while the next section slides over it: wide screens with a mouse or trackpad and
// motion allowed. The hold itself is CSS (.hero-hold in globals.css, same query), so nothing is moved in the page
// (moving the hero into a wrapper restarted its entrance animation after every load).
export const HERO_HOLD_QUERY =
  "(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
