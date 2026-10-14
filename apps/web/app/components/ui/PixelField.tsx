import { CELL, COLS, ROWS } from "./pixelGrid";

const GAP = 2;

function rand(i: number) {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** The grid's cells (shared with HeroGrid, the GPU version). */
export const PIXEL_CELLS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  // No accents behind the headline or under the navbar.
  const behindText = (col > 9 && col < 26 && row > 5 && row < 17) || row < 2;
  return {
    x: col * CELL,
    y: row * CELL,
    // Rounded: Math.sin's last digits differ between the server and the browser, which broke hydration.
    opacity: Number((0.02 + rand(i) * 0.07).toFixed(3)),
    lit: !behindText && rand(i + 1000) > 0.988,
    delay: (rand(i + 2000) * 8).toFixed(2),
  };
});

export default function PixelField({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`} preserveAspectRatio="xMidYMid slice">
      {PIXEL_CELLS.map((c, i) =>
        c.lit ? (
          <rect
            key={i}
            x={c.x}
            y={c.y}
            width={CELL - GAP}
            height={CELL - GAP}
            fill="#CC6600"
            className="pixel-lit"
            style={{ animationDelay: `${c.delay}s` }}
          />
        ) : (
          <rect key={i} x={c.x} y={c.y} width={CELL - GAP} height={CELL - GAP} fill="#FFFFFF" opacity={c.opacity} className="px" />
        ),
      )}
    </svg>
  );
}
