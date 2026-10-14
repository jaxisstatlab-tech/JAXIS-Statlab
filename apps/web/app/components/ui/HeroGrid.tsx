"use client";

import { useEffect, useRef, useState } from "react";
import { createGlField } from "./glField";
import HeroPixels from "./HeroPixels";
import PixelField, { PIXEL_CELLS } from "./PixelField";
import { CELL, COLS, ROWS } from "./pixelGrid";

// The hero background, drawn by the graphics card (WebGL2) in one shader. It treats the grid as graph paper and the
// cursor as a pen plotting data:
//   - a fine hairline grid, fading out towards the edges, with a few orange data points that pulse gently;
//   - a soft lens: the grid bulges slightly around the cursor and its lines warm up there;
//   - a trail: grid crossings the cursor passes light up as orange points and fade out, like a scatter plot being drawn;
//   - ripples: each click (or tap on phones) sends a soft ring through the grid, lighting crossings as it passes. Up to
//     RIPPLES rings run at once, so rapid clicks each get their own; overlapping rings are capped so they never flare.
// It only redraws while something moves (the pulse alone runs at ~30 fps), and people who prefer reduced motion get the
// still grid. Without WebGL2 the SVG grid (PixelField + HeroPixels) is the fallback. Nothing is drawn until the browser
// has answered (so the old grid never flashes before the canvas), then the canvas fades in.

const TRAIL = 16;
const TRAIL_LIFE = 1.4; // seconds a plotted point takes to fade
const TRAIL_STEP = 14; // px the cursor must move before a new point is plotted
const RIPPLE_LIFE = 1.4;
const RIPPLES = 10;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform float uDpr;
uniform float uTime;
uniform vec3 uCur;            // eased cursor x, y and presence 0..1
uniform vec3 uTrail[${TRAIL}];   // plotted points: x, y, time plotted (s)
uniform vec3 uRipples[${RIPPLES}];  // clicks: x, y, time (s)
uniform sampler2D uData;
out vec4 outColor;

const vec2 VIEW = vec2(${COLS * CELL}.0, ${ROWS * CELL}.0);
const float CELL = ${CELL}.0;
const vec3 ORANGE = vec3(0.8, 0.4, 0.0);
const vec3 AMBER = vec3(1.0, 0.56, 0.16);

float pulse(float t) {
  float p = fract(t / 8.0);
  return 0.5 - 0.5 * cos(p * 6.2831853);
}

// "Over" for premultiplied colours.
vec4 over(vec4 top, vec4 under) { return top + under * (1.0 - top.a); }

// How strongly the trail lights a point: each plotted point glows around itself and fades with age.
float trailAt(vec2 q) {
  float s = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    float age = uTime - uTrail[i].z;
    if (age < 0.0 || age > ${TRAIL_LIFE}) continue;
    float life = 1.0 - age / ${TRAIL_LIFE};
    vec2 d = q - uTrail[i].xy;
    s += life * life * exp(-dot(d, d) / 1800.0);
  }
  return clamp(s, 0.0, 1.0);
}

// The click ripples' rings at a point: soft bands that expand and fade. Overlaps add up, capped at full strength.
float rippleAt(vec2 q) {
  float s = 0.0;
  for (int i = 0; i < ${RIPPLES}; i++) {
    float age = uTime - uRipples[i].z;
    if (age < 0.0 || age > ${RIPPLE_LIFE}) continue;
    float band = length(q - uRipples[i].xy) - age * 620.0;
    s += exp(-band * band / 500.0) * (1.0 - age / ${RIPPLE_LIFE});
  }
  return min(s, 1.0);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  float W = uSize.x;
  float H = uSize.y;

  // Lens: sample the grid slightly pulled toward the cursor, so it bulges around it.
  vec2 toCur = p - uCur.xy;
  float lens = uCur.z * 0.12 * exp(-dot(toCur, toCur) / (2.0 * 150.0 * 150.0));
  vec2 g = p - toCur * lens;

  // Hairline grid (graph paper), centred and covering the box like the SVG version.
  float scale = max(W / VIEW.x, H / VIEW.y);
  vec2 off = (uSize - VIEW * scale) * 0.5;
  vec2 v = (g - off) / scale;
  vec2 nearest = floor(v / CELL + 0.5);
  vec2 dist = abs(v - nearest * CELL) * scale; // css px to the nearest line on each axis
  float line = max(1.0 - smoothstep(0.0, 1.0, dist.x), 1.0 - smoothstep(0.0, 1.0, dist.y));
  vec2 radii = H > W ? vec2(1.1, 0.75) : vec2(0.8, 0.7);
  float fade = clamp((0.9 - length((p - vec2(0.5, 0.35) * uSize) / (radii * uSize))) / 0.6, 0.0, 1.0);
  float spot = (1.0 - smoothstep(0.0, 300.0, length(toCur))) * uCur.z;
  float ring = rippleAt(p);
  float warm = clamp(spot * 0.7 + ring, 0.0, 1.0);
  float la = line * (0.075 + 0.26 * spot + 0.35 * ring) * max(fade, max(spot * 0.8, ring));
  vec4 acc = vec4(mix(vec3(1.0), AMBER, warm) * la, la);

  // Crossings: the steady data points, plus any the trail or the ripple is lighting right now.
  ivec2 ci = ivec2(nearest);
  if (ci.x >= 0 && ci.y >= 0 && ci.x < ${COLS} && ci.y < ${ROWS}) {
    float r = length(dist);
    vec2 crossing = off + nearest * CELL * scale;
    vec4 d = texelFetch(uData, ci, 0);
    float steady = d.g > 0.5 ? (0.35 + 0.65 * pulse(uTime - d.b * 8.0)) * max(fade, 0.35) : 0.0;
    float plotted = max(trailAt(crossing), rippleAt(crossing) * 0.9);
    float k = max(steady, plotted);
    if (k > 0.002) {
      float size = 1.4 + 1.3 * plotted;
      float dot_ = (1.0 - smoothstep(size, size + 1.0, r)) * k;
      float halo = exp(-r * r / (90.0 + 60.0 * plotted)) * 0.3 * k;
      float da = max(dot_, halo);
      acc = over(vec4(mix(ORANGE, AMBER, dot_) * da, da), acc);
    }
  }

  outColor = acc;
}`;

export default function HeroGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // null until the browser has answered: true = WebGL2 canvas, false = SVG fallback.
  const [gpu, setGpu] = useState<boolean | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = canvas?.parentElement?.parentElement;
    if (!canvas || !section) return;
    const field = createGlField(canvas, FRAG);
    if (!field) {
      setGpu(false); // show the SVG version
      return;
    }
    setGpu(true);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !still;

    // One texel per grid crossing: G = 255 for a data point, B = its pulse delay (/8 s).
    const data = new Uint8Array(COLS * ROWS * 4);
    PIXEL_CELLS.forEach((c, i) => {
      data[i * 4 + 1] = c.lit ? 255 : 0;
      data[i * 4 + 2] = Math.round((Number(c.delay) / 8) * 255);
    });
    field.setData(COLS, ROWS, data);

    const start = performance.now();
    const seconds = (now: number) => (now - start) / 1000;

    // The cursor's lens follows it with a little easing.
    const target = { x: 0, y: 0, on: 0 };
    const cur = { x: 0, y: 0, on: 0 };
    // Trail: a ring buffer of plotted points (x, y, time); unused slots are far in the past.
    const trail = new Float32Array(TRAIL * 3).fill(-1000);
    let trailNext = 0;
    let lastPlot: { x: number; y: number } | null = null;
    let lastPlotAt = -1000;
    // Ripples: a ring buffer of clicks (x, y, time); the newest replaces the oldest.
    const ripples = new Float32Array(RIPPLES * 3).fill(-1000);
    let rippleNext = 0;
    let lastRippleAt = -1000;

    let frame = 0;
    let lastDraw = 0;
    let visible = false;

    const render = (now: number) =>
      field.draw({
        uTime: still ? 0 : seconds(now),
        uCur: [cur.x, cur.y, cur.on],
        uTrail: trail,
        uRipples: ripples,
      });

    const tick = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      cur.x += (target.x - cur.x) * 0.14;
      cur.y += (target.y - cur.y) * 0.14;
      cur.on += (target.on - cur.on) * 0.08;
      const t = seconds(now);
      const moving =
        Math.abs(target.x - cur.x) > 0.3 ||
        Math.abs(target.y - cur.y) > 0.3 ||
        Math.abs(target.on - cur.on) > 0.003 ||
        t - lastPlotAt < TRAIL_LIFE ||
        t - lastRippleAt < RIPPLE_LIFE;
      // The steady points pulse slowly, so ~30 fps is plenty; the cursor, trail and ripple get every frame.
      if (moving || now - lastDraw > 33) {
        lastDraw = now;
        render(now);
      }
      if (!still || moving) frame = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      const at = local(e);
      target.x = at.x;
      target.y = at.y;
      if (cur.on < 0.01) {
        cur.x = at.x;
        cur.y = at.y;
      }
      target.on = 1;
      // Plot a point every TRAIL_STEP px of travel.
      if (!lastPlot || Math.hypot(at.x - lastPlot.x, at.y - lastPlot.y) >= TRAIL_STEP) {
        lastPlot = at;
        lastPlotAt = seconds(performance.now());
        trail.set([at.x, at.y, lastPlotAt], trailNext * 3);
        trailNext = (trailNext + 1) % TRAIL;
      }
      kick();
    };
    const onLeave = () => {
      target.on = 0;
      lastPlot = null;
      kick();
    };
    const onDown = (e: PointerEvent) => {
      const at = local(e);
      lastRippleAt = seconds(performance.now());
      ripples.set([at.x, at.y, lastRippleAt], rippleNext * 3);
      rippleNext = (rippleNext + 1) % RIPPLES;
      kick();
    };

    const resize = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      field.resize(r.width, r.height);
      render(performance.now());
    });
    resize.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      kick();
    });
    io.observe(section);
    const onVisibility = () => kick();
    document.addEventListener("visibilitychange", onVisibility);
    if (hover) {
      section.addEventListener("pointermove", onMove);
      section.addEventListener("pointerleave", onLeave);
    }
    // Clicks on a mouse, taps on a phone (taps don't disturb scrolling: it's a passive listener).
    if (!still) section.addEventListener("pointerdown", onDown, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      section.removeEventListener("pointerdown", onDown);
      field.destroy();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full transition-opacity duration-500 ease-out ${gpu ? "opacity-100" : "opacity-0"}`}
      />
      {gpu !== false ? null : (
        <HeroPixels>
          <PixelField className="pixel-field absolute inset-0 h-full w-full" />
        </HeroPixels>
      )}
    </div>
  );
}
