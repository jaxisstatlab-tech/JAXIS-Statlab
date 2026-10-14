"use client";

import { useEffect, useRef, useState } from "react";
import { createGlField } from "./glField";
import HeroPixels from "./HeroPixels";
import PixelField, { PIXEL_CELLS } from "./PixelField";
import { CELL, COLS, ROWS } from "./pixelGrid";

// The hero's pixel grid, drawn by the graphics card (WebGL2): faint squares behind a soft oval fade, a few orange
// squares that blink every 8 seconds, and a short orange trail under the cursor. It looks the same as the SVG
// version (PixelField + HeroPixels), which stays as the server render and the fallback without WebGL2; the SVG one
// made the processor repaint the whole masked grid on every blink frame.

const GAP = 2;
const HOLD_MS = 90;
const FADE_MS = 1600;
const HOT = 0.85;
const WARM = 0.28;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform float uDpr;
uniform float uTime;
uniform float uStatic;
uniform sampler2D uData;
out vec4 outColor;

const vec2 VIEW = vec2(${COLS * CELL}.0, ${ROWS * CELL}.0);
const float CELL = ${CELL}.0;
const float SIDE = ${CELL - GAP}.0;
const vec3 ORANGE = vec3(0.8, 0.4, 0.0);

float blink(float t) {
  float p = fract(t / 8.0);
  if (p < 0.45) return 0.15 + 0.7 * smoothstep(0.0, 1.0, p / 0.45);
  if (p < 0.55) return 0.85;
  return 0.15 + 0.7 * smoothstep(0.0, 1.0, (1.0 - p) / 0.45);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  // preserveAspectRatio="xMidYMid slice": the grid covers the box, centred.
  float scale = max(uSize.x / VIEW.x, uSize.y / VIEW.y);
  vec2 off = (uSize - VIEW * scale) * 0.5;
  vec2 v = (p - off) / scale;
  vec2 cell = floor(v / CELL);
  if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= ${COLS}.0 || cell.y >= ${ROWS}.0) { outColor = vec4(0.0); return; }
  vec2 local = v - cell * CELL;
  float px = scale * uDpr;
  vec2 cov2 = clamp((SIDE - local) * px + 0.5, 0.0, 1.0) * clamp(local * px + 0.5, 0.0, 1.0);
  float cov = cov2.x * cov2.y;
  if (cov <= 0.0) { outColor = vec4(0.0); return; }

  vec4 d = texelFetch(uData, ivec2(cell), 0);
  vec3 color;
  float alpha;
  if (d.g > 0.9) {
    color = ORANGE;
    alpha = uStatic > 0.5 ? 1.0 : blink(uTime - d.b * 8.0);
  } else {
    float base = d.r * 0.1;
    float level = d.g > 0.4 ? ${HOT} : ${WARM};
    color = mix(vec3(1.0), ORANGE, d.a);
    alpha = mix(base, level, d.a);
  }

  // The soft oval fade (was mask-image: radial-gradient(ellipse 80% 70% at 50% 35%, black 25%, transparent 85%)).
  float m = clamp((0.85 - length((p - vec2(0.5, 0.35) * uSize) / (vec2(0.8, 0.7) * uSize))) / 0.6, 0.0, 1.0);
  float a = alpha * m * cov;
  outColor = vec4(color * a, a);
}`;

/** cubic-bezier(0.23, 1, 0.32, 1), close enough: a strong ease-out. */
const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 4);

export default function HeroGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gpu, setGpu] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = canvas?.parentElement?.parentElement;
    if (!canvas || !section) return;
    const field = createGlField(canvas, FRAG);
    if (!field) return; // keep the SVG version
    setGpu(true);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !still;

    // One texel per cell: R = faint opacity (x10), G = 255 lit / 128 hot / 64 warm, B = blink delay (/8 s), A = heat.
    const data = new Uint8Array(COLS * ROWS * 4);
    PIXEL_CELLS.forEach((c, i) => {
      data[i * 4] = Math.round(c.opacity * 10 * 255);
      data[i * 4 + 1] = c.lit ? 255 : 0;
      data[i * 4 + 2] = Math.round((Number(c.delay) / 8) * 255);
    });
    field.setData(COLS, ROWS, data);

    // Cursor trail: each heated cell holds for 90 ms, then fades back over 1.6 s.
    const heat = new Map<number, { level: number; at: number }>();
    let w = 0;
    let h = 0;
    const measure = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      field.resize(w, h);
    };

    let frame = 0;
    let lastDraw = 0;
    let visible = false;
    const start = performance.now();

    const render = (now: number) => {
      for (const [i, cell] of heat) {
        const k = 1 - easeOut((now - cell.at - HOLD_MS) / FADE_MS);
        data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, k)) * 255);
        if (k <= 0) {
          data[i * 4 + 1] = 0;
          heat.delete(i);
        }
      }
      field.setData(COLS, ROWS, data);
      field.draw({ uTime: (now - start) / 1000, uStatic: still ? 1 : 0 });
    };

    const tick = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      // The blinks are slow, so ~30 fps is plenty; the cursor trail gets every frame.
      if (heat.size > 0 || now - lastDraw > 33) {
        lastDraw = now;
        render(now);
      }
      if (!still || heat.size > 0) frame = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };

    let last = -1;
    const warmUp = (index: number, level: number, now: number) => {
      if (PIXEL_CELLS[index]?.lit) return;
      const current = heat.get(index);
      if (level === WARM && current?.level === HOT && now - current.at < HOLD_MS) return;
      heat.set(index, { level, at: now });
      data[index * 4 + 1] = level === HOT ? 128 : 64;
      data[index * 4 + 3] = 255;
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const scale = Math.max(r.width / (COLS * CELL), r.height / (ROWS * CELL));
      const offX = (r.width - COLS * CELL * scale) / 2;
      const offY = (r.height - ROWS * CELL * scale) / 2;
      const col = Math.floor((e.clientX - r.left - offX) / scale / CELL);
      const row = Math.floor((e.clientY - r.top - offY) / scale / CELL);
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return;
      const index = row * COLS + col;
      if (index === last) return;
      last = index;
      const now = performance.now();
      warmUp(index, HOT, now);
      if (col > 0) warmUp(index - 1, WARM, now);
      if (col < COLS - 1) warmUp(index + 1, WARM, now);
      if (row > 0) warmUp(index - COLS, WARM, now);
      if (row < ROWS - 1) warmUp(index + COLS, WARM, now);
      kick();
    };

    const resize = new ResizeObserver(() => {
      measure();
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
    if (hover) section.addEventListener("pointermove", onMove);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      section.removeEventListener("pointermove", onMove);
      field.destroy();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      {gpu ? null : (
        <HeroPixels>
          <PixelField className="pixel-field absolute inset-0 h-full w-full" />
        </HeroPixels>
      )}
    </div>
  );
}
