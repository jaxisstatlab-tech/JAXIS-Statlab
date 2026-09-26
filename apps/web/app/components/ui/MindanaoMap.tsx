// Dot-matrix locator of Mindanao with Bukidnon lit and a pin on Maramag.
// Outlines are rough [longitude, latitude] traces: close enough to read as the island, not survey-grade.

type Pt = [number, number];

const MINDANAO: Pt[] = [
  [122.07, 6.91], [122.13, 7.7], [122.6, 8.0], [122.99, 8.24], [123.42, 8.66], [123.8, 8.5], [123.84, 8.15],
  [124.24, 8.23], [124.65, 8.48], [125.1, 8.82], [125.5, 9.0], [125.49, 9.79], [125.75, 9.6], [126.2, 9.08],
  [126.36, 8.21], [126.6, 7.3], [126.22, 6.95], [126.18, 6.27], [125.85, 6.9], [125.61, 7.07], [125.36, 6.75],
  [125.61, 6.4], [125.4, 5.6], [125.17, 6.11], [124.62, 5.99], [124.06, 6.53], [124.25, 7.22], [124.07, 7.59],
  [123.44, 7.83], [123.17, 7.58], [122.6, 7.4],
];

const BUKIDNON: Pt[] = [
  [124.6, 8.4], [125.1, 8.65], [125.35, 8.45], [125.45, 8.0], [125.3, 7.55], [125.0, 7.45], [124.7, 7.6], [124.55, 8.0],
];

const MARAMAG: Pt = [125.0, 7.76];

const inside = ([x, y]: Pt, poly: Pt[]) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

const STEP = 0.075;
const BOUNDS = { west: 121.9, east: 126.8, north: 9.95, south: 5.45 };
const SCALE = 100;
const px = (lon: number) => (lon - BOUNDS.west) * SCALE;
const py = (lat: number) => (BOUNDS.north - lat) * SCALE;

const DOTS: { x: number; y: number; lit: boolean }[] = [];
for (let lat = BOUNDS.south; lat <= BOUNDS.north; lat += STEP) {
  for (let lon = BOUNDS.west; lon <= BOUNDS.east; lon += STEP) {
    const p: Pt = [lon, lat];
    if (inside(p, MINDANAO)) DOTS.push({ x: px(lon), y: py(lat), lit: inside(p, BUKIDNON) });
  }
}

const W = (BOUNDS.east - BOUNDS.west) * SCALE;
const H = (BOUNDS.north - BOUNDS.south) * SCALE;

export default function MindanaoMap({ className = "" }: { className?: string }) {
  const pin = { x: px(MARAMAG[0]), y: py(MARAMAG[1]) };
  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Map of Mindanao with Maramag, Bukidnon marked">
        {DOTS.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.lit ? 2.6 : 2.2} fill={d.lit ? "#CC6600" : "rgba(255,255,255,0.16)"} />
        ))}
      </svg>
      <span
        aria-hidden="true"
        className="absolute flex h-3 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ left: `${(pin.x / W) * 100}%`, top: `${(pin.y / H) * 100}%` }}
      >
        <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 motion-safe:animate-ping" />
        <span className="relative h-3 w-3 rounded-full border-2 border-white bg-[#CC6600]" />
      </span>
      <span
        className="absolute -translate-y-1/2 whitespace-nowrap rounded-[2px] border border-white/15 bg-[#010114] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white"
        style={{ left: `calc(${(pin.x / W) * 100}% + 12px)`, top: `${(pin.y / H) * 100}%` }}
      >
        Maramag
      </span>
    </div>
  );
}
