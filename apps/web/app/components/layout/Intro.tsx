import PixelField from "../ui/PixelField";

// First-visit intro: the hero's pixel grid lights up in a sweep and gathers into the centre, where the JAXIS mark
// assembles from square points; the mark then flies into the navbar logo while the dark cover lifts off the hero,
// whose own grid stays as the background. Pure CSS so it always finishes, even if scripts are slow. A head script
// sets html[data-intro="skip"] on repeat visits in the same session or when reduced motion is requested.

type Pt = [number, number];

// The logo traced in its 1920px source space (see public/jaxislogo.png), scaled to a 200-unit box.
const K = 0.1;
const BAR: Pt[] = [
  [110, 1080],
  [588, 1080],
  [490, 1790],
  [12, 1790],
];
const HOOK: Pt[] = [
  [790, 605],
  [1253, 605],
  [1148, 1365],
  [1275, 1365],
  [1440, 200],
  [1540, 130],
  [1922, 130],
  [1710, 1680],
  [1590, 1790],
  [612, 1790],
];

const STEP = 9;
const SIZE = 6.6;
const BOX = { x: 0, y: 10, w: 196, h: 172 };

function inside([x, y]: Pt, poly: Pt[]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i] as Pt;
    const [xj, yj] = poly[j] as Pt;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// Square points on a regular grid, each tagged with which part of the mark it belongs to and when it lights:
// a diagonal sweep from the bottom-left, starting as the lit grid pulls back into the centre.
const POINTS = (() => {
  const out: { x: number; y: number; hook: boolean; delay: number }[] = [];
  for (let y = BOX.y + STEP / 2; y < BOX.y + BOX.h; y += STEP) {
    for (let x = BOX.x + STEP / 2; x < BOX.x + BOX.w; x += STEP) {
      const src: Pt = [x / K, y / K];
      const hook = inside(src, HOOK);
      if (!hook && !inside(src, BAR)) continue;
      const sweep = (x - BOX.x) / BOX.w + (BOX.y + BOX.h - y) / BOX.h;
      out.push({ x: x - SIZE / 2, y: y - SIZE / 2, hook, delay: Math.round(200 + (sweep / 2) * 360) });
    }
  }
  return out;
})();

export default function Intro() {
  return (
    <div aria-hidden="true" className="intro">
      <PixelField className="intro-grid" />
      <span className="intro-glow" />
      <svg viewBox={`${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}`} className="intro-mark">
        {POINTS.map((p) => (
          <rect
            key={`${p.x}-${p.y}`}
            x={p.x}
            y={p.y}
            width={SIZE}
            height={SIZE}
            className={p.hook ? "intro-pt intro-pt-hook" : "intro-pt"}
            style={{ animationDelay: `${p.delay}ms` }}
          />
        ))}
      </svg>
      <div className="intro-word font-sans text-[17px] font-semibold tracking-[-0.01em] text-white">
        JAXIS <span className="font-normal text-white/60">StatLab</span>
      </div>
    </div>
  );
}
