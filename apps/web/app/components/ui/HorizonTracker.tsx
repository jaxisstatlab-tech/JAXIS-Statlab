"use client";

import { useEffect, useRef } from "react";

// Extra curve drawn past each side edge so the glow never fades out at the viewport edges.
const PAD = 240;
// Room above the highest point of the curve for the outer glow.
const HAZE = 240;
const GLINT = 140;

// Soft glows without blur filters: a blurred stroke is rebuilt from nested strokes, widest first, each with just
// enough opacity that the stacked result matches the Gaussian falloff of a stroke `width` wide blurred by `sigma`.
// Blending ~20 strokes is far cheaper to redraw while the arch bends than a Gaussian blur over the same area.
type Layer = { width: number; opacity: number };
function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
function blurLayers(width: number, sigma: number, alpha: number, step: number): Layer[] {
  const half = width / 2;
  const cdf = (x: number) => 0.5 * (1 + erf(x / (sigma * Math.SQRT2)));
  const target = (d: number) => alpha * (cdf(d + half) - cdf(d - half));
  const reach = half + 2.6 * sigma;
  const radii: number[] = [];
  for (let r = reach; r > step / 2; r -= step) radii.push(r);
  const layers: Layer[] = [];
  let covered = 0;
  radii.forEach((r, i) => {
    // Opacity wanted just inside this layer's edge, given what the wider layers already contribute.
    const want = target(Math.max(0, r - step / 2));
    const opacity = i === 0 ? want : Math.max(0, 1 - (1 - want) / (1 - covered));
    covered = 1 - (1 - covered) * (1 - opacity);
    if (opacity > 0.002) layers.push({ width: Math.round(r * 2), opacity: +opacity.toFixed(4) });
  });
  return layers;
}
const HAZE_LAYERS = blurLayers(90, 46, 0.34, 10);
const GLOW_LAYERS = blurLayers(8, 12, 0.6, 3);
const INNER_LAYERS = blurLayers(36, 22, 0.45, 5);

export type HorizonShape = { w: number; m: number; e: number };

// Responsive peak height above the section floor and sagitta (drop from center to edge).
// Mobile keeps a gentle sagitta so the arch stays wide instead of a steep half-circle.
function geometry(w: number) {
  if (w >= 1024) return { peakH: 230, s: 190 };
  if (w >= 640) return { peakH: 180, s: 100 };
  return { peakH: 140, s: Math.max(36, Math.min(56, Math.round(w * 0.13))) };
}

// The horizon arc. As the section scrolls into view it bends from a concave dip into a rising
// dome, and its bright glint travels along the rim to sit under the cursor.
export default function HorizonTracker() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    const section = svg?.parentElement;
    if (!svg || !section) return;

    const curves = svg.querySelectorAll<SVGPathElement>("[data-curve]");
    const body = svg.querySelectorAll<SVGPathElement>("[data-body]");
    const core = svg.querySelector<SVGEllipseElement>("[data-core]");
    const glint = svg.querySelector<SVGLinearGradientElement>("#horizon-glint");
    const floor = svg.querySelector<SVGRectElement>("[data-floor]");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    ).matches;

    let w = 0;
    let h = 0;
    let H = 0;
    let geo = geometry(0);
    // Bend: 0 = concave dip, 1 = full dome.
    let bend = reduced ? 1 : 0;
    let bendTarget = bend;
    let gx = 0;
    let gxTarget = 0;
    let frame = 0;
    let visible = false;
    // What was last written to the SVG, so frames where nothing changed cost nothing (the blurred layers are
    // expensive to redraw, and scrolling alone used to redraw them every frame).
    let drawn = "";
    let glintAt = NaN;

    const measure = () => {
      const r = section.getBoundingClientRect();
      w = r.width || window.innerWidth;
      h = r.height;
      geo = geometry(w);
      H = geo.peakH + HAZE;
      svg.setAttribute("viewBox", `0 0 ${w} ${H}`);
      svg.style.height = `${H}px`;
      // Same depth as the section's old floor fade (h-24, lg:h-32), now drawn under the rim instead of over it.
      const fadeH = w >= 1024 ? 128 : 96;
      floor?.setAttribute("x", `${-PAD}`);
      floor?.setAttribute("width", `${w + PAD * 2}`);
      floor?.setAttribute("y", `${H - fadeH}`);
      floor?.setAttribute("height", `${fadeH + 40}`);
      gx = gxTarget = w / 2;
      drawn = "";
      glintAt = NaN;
    };

    // Scroll progress, measured on the arch's lowest point in its starting (dipped) shape. It starts only once
    // the whole curve is in view with some room below it, and completes when the page reaches its end (or when
    // that point reaches 30% of the screen, if the page scrolls further than that).
    const readProgress = () => {
      if (reduced) return 1;
      const vh = window.innerHeight;
      const lowY = section.getBoundingClientRect().bottom - (geo.peakH - geo.s);
      const se = document.scrollingElement;
      const remaining = se ? Math.max(0, se.scrollHeight - vh - window.scrollY) : Infinity;
      const end = Math.max(vh * 0.3, lowY - remaining);
      // On short screens the arch may never fully clear the bottom; still give the bend its last 80px of scroll.
      const start = Math.max(vh - Math.min(140, vh * 0.15), end + 80);
      return Math.min(1, Math.max(0, (start - lowY) / (start - end)));
    };

    const render = () => {
      if (Math.abs(gx - glintAt) >= 0.5) {
        glintAt = gx;
        glint?.setAttribute("x1", `${gx - GLINT}`);
        glint?.setAttribute("x2", `${gx + GLINT}`);
      }
      // Steps of 1/400 are invisible but let an unchanged shape skip the redraw entirely.
      const key = `${Math.round(bend * 400)}`;
      if (key === drawn) return;
      drawn = key;
      const k = (Math.round(bend * 400) / 400) * 2 - 1;
      const mid = geo.peakH - geo.s / 2;
      // Heights above the section floor for the curve's center and side edges.
      const centerH = mid + (k * geo.s) / 2;
      const edgeH = mid - (k * geo.s) / 2;
      const m = H - centerH;
      const e = H - edgeH;
      // Parabola through (0, e), (w/2, m), (w, e), extended PAD past each side.
      const f = (x: number) => m + (e - m) * ((2 * x - w) / w) ** 2;
      const x0 = -PAD;
      const x1 = w + PAD;
      const E = f(x0);
      const curve = `M${x0} ${E.toFixed(2)} Q${w / 2} ${(2 * m - E).toFixed(2)} ${x1} ${E.toFixed(2)}`;
      const fill = `${curve} L${x1} ${H + 40} L${x0} ${H + 40} Z`;

      curves.forEach((p) => p.setAttribute("d", curve));
      body.forEach((p) => p.setAttribute("d", fill));
      core?.setAttribute("cx", `${w / 2}`);
      core?.setAttribute("cy", m.toFixed(2));

      section.dispatchEvent(
        new CustomEvent<HorizonShape>("horizon:shape", { detail: { w, m: h - centerH, e: h - edgeH } }),
      );
    };

    const step = () => {
      bendTarget = readProgress();
      bend += (bendTarget - bend) * 0.14;
      gx += (gxTarget - gx) * 0.12;
      const settled = Math.abs(bendTarget - bend) < 0.001 && Math.abs(gxTarget - gx) < 0.3;
      if (settled) {
        bend = bendTarget;
        gx = gxTarget;
      }
      render();
      frame = settled || !visible ? 0 : requestAnimationFrame(step);
    };
    const kick = () => {
      if (!frame && visible) frame = requestAnimationFrame(step);
    };

    measure();
    bend = bendTarget = readProgress();
    render();

    const ro = new ResizeObserver(() => {
      measure();
      render();
      kick();
    });
    ro.observe(section);

    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) kick();
    });
    io.observe(section);

    const move = (e: PointerEvent) => {
      gxTarget = Math.max(0, Math.min(w, e.clientX - section.getBoundingClientRect().left));
      kick();
    };
    const leave = () => {
      gxTarget = w / 2;
      kick();
    };

    if (!reduced) window.addEventListener("scroll", kick, { passive: true });
    if (pointer) {
      section.addEventListener("pointermove", move);
      section.addEventListener("pointerleave", leave);
    }

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", kick);
      section.removeEventListener("pointermove", move);
      section.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      overflow="visible"
      className="horizon pointer-events-none absolute inset-x-0 bottom-0 z-[3] w-full"
    >
      <defs>
        <clipPath id="horizon-body">
          <path data-body />
        </clipPath>
        <radialGradient id="horizon-core">
          <stop offset="0%" stopColor="rgb(230,115,0)" stopOpacity="0.42" />
          <stop offset="20%" stopColor="rgb(180,80,0)" stopOpacity="0.22" />
          <stop offset="45%" stopColor="rgb(90,35,4)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#010114" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="horizon-glint" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="0">
          <stop offset="0%" stopColor="#ffd2a1" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffd2a1" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffd2a1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="horizon-floor" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#010114" stopOpacity="0" />
          <stop offset="50%" stopColor="#010114" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#010114" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Outer atmosphere above the rim. Stacked translucent strokes instead of blur filters: they build the same soft
          falloff but are cheap to redraw while the arch bends (a Gaussian blur over this area caused scroll lag). */}
      {HAZE_LAYERS.map((l) => (
        <path key={`haze-${l.width}`} data-curve fill="none" stroke="rgb(204,102,0)" strokeOpacity={l.opacity} strokeWidth={l.width} />
      ))}
      {GLOW_LAYERS.map((l) => (
        <path key={`glow-${l.width}`} data-curve fill="none" stroke="rgb(230,115,0)" strokeOpacity={l.opacity} strokeWidth={l.width} />
      ))}

      {/* Planet body with its inner rim light */}
      <path data-body fill="#010114" />
      <g clipPath="url(#horizon-body)">
        <ellipse data-core rx="1600" ry="110" fill="url(#horizon-core)" />
        {INNER_LAYERS.map((l) => (
          <path key={`inner-${l.width}`} data-curve fill="none" stroke="rgb(204,102,0)" strokeOpacity={l.opacity} strokeWidth={l.width} />
        ))}
        <path data-curve fill="none" stroke="rgba(255,190,120,0.35)" strokeWidth="5" />
      </g>

      {/* Fade the body into the page before the footer. Clipped to the body so the halo above the rim keeps its full
          glow even where the dipped curve runs close to the floor. */}
      <g clipPath="url(#horizon-body)">
        <rect data-floor fill="url(#horizon-floor)" />
      </g>

      {/* Crisp rim and the travelling glint */}
      <path data-curve fill="none" stroke="rgba(255,176,102,0.95)" strokeWidth="1" />
      <path data-curve fill="none" stroke="url(#horizon-glint)" strokeWidth="2.5" />
    </svg>
  );
}
