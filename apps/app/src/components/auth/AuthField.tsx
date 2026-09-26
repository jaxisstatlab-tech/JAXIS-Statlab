"use client";

import { useEffect, useRef } from "react";

const GAP = 22;
const WAVE_EVERY = 3.2; // seconds between pulses
const WAVE_LIFE = 4.4; // seconds a pulse takes to cross the panel and fade
const WAVE_WIDTH = 42;
const FLASH = 0.22; // share of a pulse's life during which the arc flashes
const CURSOR_RADIUS = 190;
const CURSOR_PULL = 10;

// Living dot grid for the auth showcase. Dots twinkle and warm up near the horizon arc. Every few
// seconds the arc flashes and sends out a pulse: a curved band that follows the arc's shape, leaves
// fast, then slows and fades. Dots near the cursor lean in and light up.
// The arc's glow is driven from here (--pulse on .auth-horizon) so it brightens in step with each pulse.
// Reduced motion gets a single still frame.

const easeOut = (p: number) => 1 - (1 - p) ** 3;
const smooth = (a: number, b: number, v: number) => {
  const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
export function AuthField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const panel = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !panel || !ctx) return;

    const horizon = panel.querySelector<HTMLElement>(".auth-horizon");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let rim = { cx: 0, cy: 0, r: 0 };
    let phases: number[] = [];
    const cursor = { x: 0, y: 0, on: 0, target: 0 };
    let frame = 0;
    const start = performance.now();

    const measure = () => {
      const r = panel.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (horizon) {
        const hr = horizon.getBoundingClientRect();
        rim = { cx: hr.left - r.left + hr.width / 2, cy: hr.top - r.top + hr.height / 2, r: hr.width / 2 };
      }
      const count = Math.ceil(w / GAP) * Math.ceil(h / GAP);
      phases = Array.from({ length: count }, () => Math.random() * Math.PI * 2);
    };

    const rimX = (y: number) => (rim.r ? rim.cx - Math.sqrt(Math.max(0, rim.r * rim.r - (y - rim.cy) ** 2)) : w);

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Pulses: each one is a band at a growing distance from the arc (so its front has the arc's
      // curve), fading in over its first moments and out as it spreads.
      const reach = Math.max(w, 1) * 1.05;
      const waves: { radius: number; amp: number }[] = [];
      let flash = 0;
      if (!still) {
        for (let k = 0; k < Math.ceil(WAVE_LIFE / WAVE_EVERY) + 1; k++) {
          const age = (t % WAVE_EVERY) + k * WAVE_EVERY;
          const p = age / WAVE_LIFE;
          if (p >= 1) continue;
          waves.push({ radius: reach * easeOut(p), amp: smooth(0, 0.05, p) * (1 - p) ** 1.4 });
          if (p < FLASH) flash = Math.max(flash, smooth(0, 0.03, p) * (1 - smooth(0.03, FLASH, p)));
        }
      }
      horizon?.style.setProperty("--pulse", flash.toFixed(3));

      cursor.on += (cursor.target - cursor.on) * 0.12;

      let i = 0;
      const x0 = (w % GAP) / 2;
      for (let y = GAP / 2; y < h; y += GAP) {
        const ry = rimX(y);
        for (let x = x0; x < w; x += GAP, i++) {
          if (x > ry - 8) continue;
          const nearRim = 1 - Math.min(1, (ry - x) / 300);
          const leftFade = 0.2 + 0.8 * Math.min(1, x / (w * 0.55));
          const twinkle = still ? 1 : 0.7 + 0.3 * Math.sin(t * 1.1 + (phases[i] ?? 0));

          // Distance from this dot to the arc's edge (0 at the rim, growing leftward).
          const fromRim = rim.r ? Math.hypot(x - rim.cx, y - rim.cy) - rim.r : w - x;
          let glow = flash * 0.9 * Math.max(0, 1 - fromRim / 70);
          for (const wave of waves) {
            glow += Math.exp(-(((fromRim - wave.radius) / WAVE_WIDTH) ** 2)) * wave.amp;
          }

          let px = x;
          let py = y;
          if (cursor.on > 0.01) {
            const dx = cursor.x - x;
            const dy = cursor.y - y;
            const cd = Math.hypot(dx, dy);
            if (cd < CURSOR_RADIUS) {
              const f = (1 - cd / CURSOR_RADIUS) ** 2 * cursor.on;
              glow += f * 1.2;
              if (cd > 0.5) {
                px += (dx / cd) * CURSOR_PULL * f;
                py += (dy / cd) * CURSOR_PULL * f;
              }
            }
          }

          const heat = Math.min(1, glow);
          const alpha = Math.min(1, (0.08 + 0.24 * nearRim) * leftFade * twinkle + 0.85 * heat);
          const warm = Math.min(1, nearRim * 0.5 + heat);
          const size = 1.3 + 2 * heat;
          ctx.fillStyle = `rgba(255,${Math.round(255 - 105 * warm)},${Math.round(255 - 205 * warm)},${alpha.toFixed(3)})`;
          ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }
      }
    };

    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const r = panel.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      cursor.x = e.clientX - r.left;
      cursor.y = e.clientY - r.top;
      cursor.target = inside ? 1 : 0;
    };

    const resize = new ResizeObserver(() => {
      measure();
      if (still) draw(performance.now());
    });
    resize.observe(panel);
    measure();

    if (still) {
      draw(performance.now());
    } else {
      frame = requestAnimationFrame(loop);
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        window.addEventListener("pointermove", onMove, { passive: true });
      }
    }

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
