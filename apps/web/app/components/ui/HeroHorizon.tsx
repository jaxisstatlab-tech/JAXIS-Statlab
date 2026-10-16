"use client";

import { useEffect, useRef } from "react";
import { createGlField } from "./glField";

const GAP = 26;
const BAND = 170; // half-width of the glow around the trend line
const SWEEP_EVERY = 10; // seconds between "fits" running along the line
const CURSOR_RADIUS = 220;
const CURSOR_PULL = 8;
const IDLE_RADIUS = 340;
const PARALLAX = 0.35; // share of the scroll the background lags behind
const SUN_RISE = 160; // px the sun rises over the hero's height of scrolling
const IDLE_AFTER = 1200; // ms without mouse movement before the glow starts wandering on its own

// The hero's background: data finding its pattern. A scatter of points (each a little off its grid spot) over a
// sunrise in the bottom-right corner (.hero-sun in globals.css). Points near a rising trend line pull into line and
// glow warmer, so the line shows through the noise, and every few seconds a light runs along it, like a regression
// being fitted. Points near the cursor lean in and light up; when the cursor rests (or on touch screens) a soft glow
// drifts slowly over the field on its own, on a path that never quite repeats.
// Scrolling away is a parallax hand-off: the whole background moves slower than the page (so the next section slides
// over it) and the sun rises a little as it goes.
// Painted by the graphics card (WebGL2; FRAG works out each pixel's nearest points) and paused while off screen.
// Without WebGL2 a single still frame is drawn on a 2D canvas; reduced motion gets one still frame.

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform float uDpr;
uniform float uT;
uniform vec3 uSun;   // circle: center x, center y, radius (CSS px)
uniform vec4 uLine;  // trend line from (x, y) to (z, w)
uniform vec3 uCur;   // x, y, strength
uniform vec3 uIdle;  // the wandering glow: x, y, strength
out vec4 outColor;

const float GAP = ${GAP}.0;
const float BAND = ${BAND}.0;
const float SWEEP_EVERY = ${SWEEP_EVERY.toFixed(1)};
const float RADIUS = ${CURSOR_RADIUS}.0;
const float PULL = ${CURSOR_PULL}.0;
const float IDLE_RADIUS = ${IDLE_RADIUS}.0;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  vec4 acc = vec4(0.0);

  vec2 a = uLine.xy;
  vec2 ab = uLine.zw - uLine.xy;
  float len = length(ab);
  vec2 dir = ab / len;
  vec2 nrm = vec2(-dir.y, dir.x);
  float breathe = 1.0 + 0.15 * sin(uT * 0.22);
  float sweep = fract(uT / SWEEP_EVERY) * 1.5 - 0.25; // position along the line, 0..1 (with run-in and run-out)

  // A soft warm wash under the wandering glow.
  if (uIdle.z > 0.01) {
    float wa = 0.05 * uIdle.z * exp(-pow(length(p - uIdle.xy) / (IDLE_RADIUS * 1.2), 2.0));
    acc = vec4(vec3(1.0, 0.55, 0.15) * wa, wa);
  }

  // The fitted line itself: a faint dashed stroke.
  float u0 = dot(p - a, dir);
  float d0 = abs(dot(p - a, nrm));
  if (u0 > 0.0 && u0 < len && mod(u0, 9.0) < 4.5) {
    float la = 0.07 * clamp(1.0 - d0 / 0.9, 0.0, 1.0);
    la += 0.25 * clamp(1.0 - d0 / 1.2, 0.0, 1.0) * exp(-pow((u0 / len - sweep) / 0.09, 2.0));
    acc = vec4(vec3(1.0, 0.75, 0.5) * la, la) + acc * (1.0 - la);
  }

  vec2 base = floor(p / GAP);
  for (int dj = -1; dj <= 1; dj++) {
    for (int di = -1; di <= 1; di++) {
      vec2 cell = base + vec2(float(di), float(dj));
      vec2 center = (cell + 0.5) * GAP;
      vec2 jitter = (hash2(cell) - 0.5) * GAP * 0.8;

      // How close this point is to the trend line (1 on it, 0 far away), and where along it.
      float d = abs(dot(center - a, nrm));
      float u = dot(center - a, dir) / len;
      float band = exp(-pow(d / (BAND * breathe), 2.0)) * smoothstep(-0.1, 0.05, u) * (1.0 - smoothstep(0.95, 1.1, u));
      // Points near the line close in on it: their scatter shrinks toward the line.
      vec2 pos = center + jitter * (1.0 - 0.55 * band) - nrm * dot(jitter, nrm) * 0.35 * band;
      if (pos.x < 0.0 || pos.y < 0.0 || pos.x > uSize.x || pos.y > uSize.y) continue;

      float fromSun = length(pos - uSun.xy) - uSun.z;
      if (fromSun < 6.0) continue;
      float nearSun = 1.0 - min(1.0, fromSun / 320.0);

      float fit = band * exp(-pow((u - sweep) / 0.11, 2.0)) * 0.75;
      float twinkle = 0.78 + 0.22 * sin(uT * 0.45 + hash2(cell + 7.0).x * 6.2832);
      float rightward = 0.3 + 0.7 * smoothstep(0.15, 0.75, pos.x / uSize.x);

      float heat = 0.0;
      if (uIdle.z > 0.01) {
        float id = length(uIdle.xy - pos);
        if (id < IDLE_RADIUS) heat += pow(1.0 - id / IDLE_RADIUS, 2.5) * uIdle.z * 0.55;
      }
      if (uCur.z > 0.01) {
        vec2 dv = uCur.xy - pos;
        float cd = length(dv);
        if (cd < RADIUS) {
          float ch = pow(1.0 - cd / RADIUS, 2.0) * uCur.z;
          heat += ch * 0.8;
          if (cd > 0.5) pos += dv / cd * PULL * ch;
        }
      }

      float glow = min(1.0, fit + heat);
      float alpha = min(1.0, (0.07 + 0.2 * band + 0.22 * nearSun) * twinkle * rightward + 0.8 * glow);
      float warm = min(1.0, nearSun * 0.6 + band * 0.35 + glow);
      vec3 color = vec3(1.0, (255.0 - 105.0 * warm) / 255.0, (255.0 - 205.0 * warm) / 255.0);
      float half_ = (1.3 + 0.7 * band + 1.6 * glow) * 0.5;
      vec2 off = abs(p - pos);
      vec2 cov2 = clamp((half_ - off) * uDpr + 0.5, 0.0, 1.0);
      float al = alpha * cov2.x * cov2.y;
      acc = vec4(color * al, al) + acc * (1.0 - al);
    }
  }
  outColor = acc;
}`;

export default function HeroHorizon() {
  const ref = useRef<HTMLCanvasElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const sunWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const sunEl = sunRef.current;
    const layer = layerRef.current;
    const sunWrap = sunWrapRef.current;
    const section = layer?.parentElement;
    if (!canvas || !sunEl || !layer || !sunWrap || !section) return;
    // Set up the GPU field only after the entrance's main beats (compiling the shader can stall a frame), then fade it
    // in (data-ready). Everything below runs from start().
    let stop: (() => void) | null = null;
    let cancelled = false;
    const begin = () => {
      if (cancelled) return;
      stop = start();
    };
    const startTimer = window.setTimeout(() => {
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (idle) idle(begin, { timeout: 600 });
      else begin();
    }, 2300);
    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      stop?.();
    };

    function start(): (() => void) | null {
    if (!canvas || !sunEl || !layer || !sunWrap || !section) return null;
    const field = createGlField(canvas, FRAG);
    const ctx = field ? null : canvas.getContext("2d");
    if (!field && !ctx) return null;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let sun = { cx: 0, cy: 0, r: 0 };
    let line = [0, 0, 1, 0];
    const cursor = { x: 0, y: 0, on: 0, target: 0 };
    // The wandering glow, and when the mouse last moved over the hero.
    const idle = { on: 0 };
    let lastMove = -Infinity;
    // How far the background lags (px) and the sun has risen (px), from how far the hero has scrolled away.
    let shift = 0;
    let rise = 0;
    let frame = 0;
    let visible = true;
    const start = performance.now();

    const measure = () => {
      const r = section.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      // Layout position (ignores the rise-in transform).
      sun = { cx: sunEl.offsetLeft + sunEl.offsetWidth / 2, cy: sunEl.offsetTop + sunEl.offsetHeight / 2, r: sunEl.offsetWidth / 2 };
      // The trend rises from the lower left to the upper right, passing above the sunrise.
      line = w >= 1024 ? [w * 0.04, h * 0.92, w * 0.98, h * 0.12] : [0, h * 0.78, w, h * 0.42];
      if (field) field.resize(w, h);
      else {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
    };

    // CPU fallback: one still frame of the scatter, so browsers without WebGL2 don't spend the processor on it.
    const drawStill2d = () => {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const [ax, ay, bx, by] = line as [number, number, number, number];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / len;
      const ny = (bx - ax) / len;
      let seed = 7;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let y = GAP / 2; y < h; y += GAP) {
        for (let x = GAP / 2; x < w; x += GAP) {
          const jx = (rand() - 0.5) * GAP * 0.8;
          const jy = (rand() - 0.5) * GAP * 0.8;
          const d = Math.abs((x - ax) * nx + (y - ay) * ny);
          const band = Math.exp(-((d / BAND) ** 2));
          const px = x + jx * (1 - 0.55 * band);
          const py = y + jy * (1 - 0.55 * band);
          const fromSun = Math.hypot(px - sun.cx, py - sun.cy) - sun.r;
          if (fromSun < 6) continue;
          const nearSun = 1 - Math.min(1, fromSun / 320);
          const rightward = 0.3 + 0.7 * Math.min(1, Math.max(0, (px / w - 0.15) / 0.6));
          const alpha = (0.07 + 0.2 * band + 0.22 * nearSun) * rightward * 0.9;
          const warm = Math.min(1, nearSun * 0.6 + band * 0.35);
          ctx.fillStyle = `rgba(255,${Math.round(255 - 105 * warm)},${Math.round(255 - 205 * warm)},${alpha.toFixed(3)})`;
          const size = 1.3 + 0.7 * band;
          ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }
      }
    };

    const draw = (now: number) => {
      if (!field) return drawStill2d();
      const t = (now - start) / 1000;
      // The hero sits at the top of the page, so its progress comes from the page's scroll. While it holds in place it
      // doesn't move, so the background doesn't lag; the sun still rises.
      // When ScrollFx holds the hero (data-stick), progress runs over the one screen of scrolling during the hold,
      // which starts once the hero's bottom is on screen (later on phones, where the hero is taller than the screen).
      const held = section.closest<HTMLElement>("[data-hero]")?.dataset.stick !== undefined;
      const vh = window.innerHeight;
      const lead = Math.max(0, h - vh);
      const scrolled = Math.min(1, Math.max(0, held ? (window.scrollY - lead) / Math.max(1, vh) : window.scrollY / Math.max(1, h)));
      const nextShift = held ? 0 : scrolled * h * PARALLAX;
      const nextRise = scrolled * SUN_RISE;
      if (Math.abs(nextShift - shift) > 0.1 || Math.abs(nextRise - rise) > 0.1) {
        shift = nextShift;
        rise = nextRise;
        layer.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
        sunWrap.style.transform = `translate3d(0, ${(-rise).toFixed(1)}px, 0)`;
      }
      // Smooth, slow follow for the cursor glow.
      cursor.on += (cursor.target - cursor.on) * 0.06;
      // After a rest, the glow drifts on its own; it hands back to the cursor as soon as the mouse moves.
      const resting = now - lastMove > IDLE_AFTER;
      idle.on += ((resting ? 1 : 0) - idle.on) * 0.02;
      // Sums of slow sines with unrelated speeds: a path that wanders and never quite repeats.
      const ix = w * (0.62 + 0.24 * Math.sin(t * 0.061 + 0.4) + 0.1 * Math.sin(t * 0.137 + 2.1));
      const iy = h * (0.5 + 0.26 * Math.sin(t * 0.047 + 1.7) + 0.1 * Math.sin(t * 0.113 + 0.3));
      const breathe = 0.75 + 0.25 * Math.sin(t * 0.21);
      // Held and fully covered by the next section: nothing to paint.
      if (held && scrolled >= 1) return;
      field.draw({
        // A still frame sits between sweeps, so no light is caught mid-run.
        uT: still ? 3 : t,
        uSun: [sun.cx, sun.cy - rise, sun.r],
        uLine: line,
        uCur: [cursor.x, cursor.y, cursor.on],
        uIdle: still ? [0, 0, 0] : [ix, iy, idle.on * breathe],
      });
    };

    const loop = (now: number) => {
      draw(now);
      frame = visible ? requestAnimationFrame(loop) : 0;
    };
    const run = () => {
      if (!frame && visible && field && !still) frame = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      cursor.x = e.clientX - r.left;
      cursor.y = e.clientY - r.top - shift;
      cursor.target = 1;
      lastMove = performance.now();
    };
    const onLeave = () => {
      cursor.target = 0;
      lastMove = -Infinity;
    };

    const resize = new ResizeObserver(() => {
      measure();
      draw(performance.now());
    });
    resize.observe(section);
    measure();
    draw(performance.now());
    canvas.dataset.ready = "";

    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      run();
    });
    io.observe(section);

    if (field && !still && pointer) {
      section.addEventListener("pointermove", onMove, { passive: true });
      section.addEventListener("pointerleave", onLeave);
    }
    run();

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      io.disconnect();
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      field?.destroy();
    };
    }
  }, []);

  return (
    <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 will-change-transform">
      <div ref={sunWrapRef} className="absolute inset-0">
        <div ref={sunRef} className="hero-sun absolute" />
      </div>
      <canvas
        ref={ref}
        className="hero-field absolute inset-0 h-full w-full"
      />
    </div>
  );
}
