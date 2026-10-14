"use client";

import { useEffect, useRef } from "react";
import { createGlField } from "./glField";
import type { HorizonShape } from "./HorizonTracker";

const GAP = 24;
const RADIUS = 200;
const PULL = 12;
const BLOOM = 420;

// Dot field above the final CTA horizon. Dots brighten toward the rim like an atmosphere; near the
// cursor they lean in and warm to orange, and a sunrise glow rises from the horizon beneath it.
// Draws on demand only: while the cursor moves or the effect is still easing, and only on screen.
// Painted by the graphics card (WebGL2: each pixel works out its nearest dots in FRAG below); browsers without
// WebGL2 get the same picture drawn on a 2D canvas by the processor.

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform float uDpr;
uniform vec3 uCur;
uniform vec4 uRim;
out vec4 outColor;

const float GAP = ${GAP}.0;
const float RADIUS = ${RADIUS}.0;
const float PULL = ${PULL}.0;
const float BLOOM = ${BLOOM}.0;

float rimY(float x) {
  if (uRim.w < 0.5) return uSize.y;
  float t = (2.0 * x - uRim.z) / uRim.z;
  return uRim.x + (uRim.y - uRim.x) * t * t;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  vec4 acc = vec4(0.0);

  // Sunrise glow on the horizon under the cursor.
  if (uCur.z > 0.01) {
    float t = length(p - vec2(uCur.x, rimY(uCur.x))) / BLOOM;
    vec4 c0 = vec4(1.0, 0.541, 0.122, 0.45 * uCur.z);
    vec4 c1 = vec4(0.8, 0.4, 0.0, 0.14 * uCur.z);
    vec4 c = t < 0.45 ? mix(c0, c1, t / 0.45) : mix(c1, vec4(0.8, 0.4, 0.0, 0.0), clamp((t - 0.45) / 0.55, 0.0, 1.0));
    acc = vec4(c.rgb * c.a, c.a);
  }

  float x0 = mod(uSize.x, GAP) * 0.5;
  vec2 base = vec2(round((p.x - x0) / GAP), round((p.y - GAP * 0.5) / GAP));
  for (int dj = -1; dj <= 1; dj++) {
    for (int di = -1; di <= 1; di++) {
      vec2 dot0 = vec2(x0 + (base.x + float(di)) * GAP, GAP * 0.5 + (base.y + float(dj)) * GAP);
      if (dot0.x < 0.0 || dot0.x >= uSize.x || dot0.y < 0.0 || dot0.y >= uSize.y) continue;
      float top = clamp((dot0.y / uSize.y - 0.04) / 0.55, 0.0, 1.0);
      if (top <= 0.0) continue;
      float ry = rimY(dot0.x);
      if (dot0.y > ry - 6.0) continue;
      float nearRim = 1.0 - min(1.0, (ry - dot0.y) / 320.0);

      vec2 pos = dot0;
      float heat = 0.0;
      if (uCur.z > 0.01) {
        vec2 dv = uCur.xy - dot0;
        float d = length(dv);
        if (d < RADIUS) {
          heat = pow(1.0 - d / RADIUS, 2.0) * uCur.z;
          if (d > 0.5) pos += dv / d * PULL * heat;
        }
      }
      float alpha = min(1.0, (0.08 + 0.24 * nearRim) * top + 0.75 * heat);
      float warm = min(1.0, nearRim * 0.55 + heat);
      vec3 color = vec3(1.0, (255.0 - 105.0 * warm) / 255.0, (255.0 - 205.0 * warm) / 255.0);
      float half_ = (1.4 + 1.4 * heat) * 0.5;
      vec2 off = abs(p - pos);
      vec2 cov2 = clamp((half_ - off) * uDpr + 0.5, 0.0, 1.0);
      float a = alpha * cov2.x * cov2.y;
      acc = vec4(color * a, a) + acc * (1.0 - a);
    }
  }
  outColor = acc;
}`;
export default function CtaField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const section = canvas?.parentElement;
    if (!canvas || !section) return;
    const field = createGlField(canvas, FRAG);
    const ctx = field ? null : canvas.getContext("2d");
    if (!field && !ctx) return;

    const interactive = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    ).matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let rim: HorizonShape | null = null;
    const target = { x: 0, y: 0, on: 0 };
    const cur = { x: 0, y: 0, on: 0 };
    let frame = 0;
    let visible = false;

    const measure = () => {
      const r = section.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      if (field) return field.resize(w, h);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };

    // The horizon bends with scroll, so its rim is a parabola reported by HorizonTracker.
    const rimY = (x: number) => (rim ? rim.m + (rim.e - rim.m) * ((2 * x - rim.w) / rim.w) ** 2 : h);

    const draw = () => {
      if (field) {
        field.draw({ uCur: [cur.x, cur.y, cur.on], uRim: rim ? [rim.m, rim.e, rim.w, 1] : [0, 0, 1, 0] });
        return;
      }
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (cur.on > 0.01) {
        const by = rimY(cur.x);
        const glow = ctx.createRadialGradient(cur.x, by, 0, cur.x, by, BLOOM);
        glow.addColorStop(0, `rgba(255,138,31,${(0.45 * cur.on).toFixed(3)})`);
        glow.addColorStop(0.45, `rgba(204,102,0,${(0.14 * cur.on).toFixed(3)})`);
        glow.addColorStop(1, "rgba(204,102,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(cur.x - BLOOM, by - BLOOM, BLOOM * 2, BLOOM * 2);
      }

      const x0 = (w % GAP) / 2;
      for (let y = GAP / 2; y < h; y += GAP) {
        const top = Math.min(1, Math.max(0, (y / h - 0.04) / 0.55));
        if (top <= 0) continue;
        for (let x = x0; x < w; x += GAP) {
          const ry = rimY(x);
          if (y > ry - 6) continue;
          const nearRim = 1 - Math.min(1, (ry - y) / 320);

          let px = x;
          let py = y;
          let heat = 0;
          if (cur.on > 0.01) {
            const dx = cur.x - x;
            const dy = cur.y - y;
            const d = Math.hypot(dx, dy);
            if (d < RADIUS) {
              heat = (1 - d / RADIUS) ** 2 * cur.on;
              if (d > 0.5) {
                px += (dx / d) * PULL * heat;
                py += (dy / d) * PULL * heat;
              }
            }
          }

          const alpha = Math.min(1, (0.08 + 0.24 * nearRim) * top + 0.75 * heat);
          const warm = Math.min(1, nearRim * 0.55 + heat);
          const g = Math.round(255 - 105 * warm);
          const b = Math.round(255 - 205 * warm);
          const size = 1.4 + 1.4 * heat;
          ctx.fillStyle = `rgba(255,${g},${b},${alpha.toFixed(3)})`;
          ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }
      }
    };

    const step = () => {
      cur.x += (target.x - cur.x) * 0.16;
      cur.y += (target.y - cur.y) * 0.16;
      cur.on += (target.on - cur.on) * 0.12;
      draw();
      const settled =
        Math.abs(target.x - cur.x) < 0.3 && Math.abs(target.y - cur.y) < 0.3 && Math.abs(target.on - cur.on) < 0.004;
      frame = settled || !visible ? 0 : requestAnimationFrame(step);
    };
    const kick = () => {
      if (!frame && visible) frame = requestAnimationFrame(step);
    };

    const onMove = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      target.x = e.clientX - r.left;
      target.y = e.clientY - r.top;
      if (cur.on < 0.01) {
        cur.x = target.x;
        cur.y = target.y;
      }
      target.on = 1;
      kick();
    };
    const onLeave = () => {
      target.on = 0;
      kick();
    };

    const resize = new ResizeObserver(() => {
      measure();
      draw();
    });
    resize.observe(section);

    // The arch reports its shape as it bends; redraw at most once per frame, and only if it actually moved.
    let shapeFrame = 0;
    const onShape = (e: Event) => {
      const next = (e as CustomEvent<HorizonShape>).detail;
      if (rim && Math.abs(rim.m - next.m) < 0.5 && Math.abs(rim.e - next.e) < 0.5 && rim.w === next.w) return;
      rim = next;
      if (!visible || frame || shapeFrame) return;
      shapeFrame = requestAnimationFrame(() => {
        shapeFrame = 0;
        if (!frame) draw();
      });
    };
    section.addEventListener("horizon:shape", onShape);

    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) kick();
    });
    io.observe(section);

    if (interactive) {
      section.addEventListener("pointermove", onMove);
      section.addEventListener("pointerleave", onLeave);
    }

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(shapeFrame);
      resize.disconnect();
      io.disconnect();
      section.removeEventListener("horizon:shape", onShape);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      field?.destroy();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full [mask-image:linear-gradient(to_bottom,black_calc(100%-90px),transparent_100%)]"
    />
  );
}
