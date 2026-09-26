type Tone = "dark" | "lit" | "glass" | "ink";

type BoxShape = {
  kind: "box";
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  tone: Tone;
  topFill?: string;
  delay?: number;
};

type CylShape = {
  kind: "cyl";
  x: number;
  y: number;
  z: number;
  r: number;
  h: number;
  tone: Tone;
};

type GlowShape = {
  kind: "glow";
  x: number;
  y: number;
  z: number;
  r: number;
  opacity?: number;
};

type CurveShape = {
  kind: "curve";
  points: [number, number, number][];
};

type Point = [number, number, number];

type PolyShape = {
  kind: "poly";
  points: Point[];
  fill?: string;
  stroke?: string;
  width?: number;
  opacity?: number;
  open?: boolean;
};

type LabelShape = {
  kind: "label";
  x: number;
  y: number;
  z: number;
  text: string;
  size: number;
  fill: string;
  plane: "top" | "front";
};

export type IsoShape = BoxShape | CylShape | GlowShape | CurveShape | PolyShape | LabelShape;

const COS = Math.cos(Math.PI / 6);

function project(x: number, y: number, z: number): [number, number] {
  return [(x - y) * COS, (x + y) * 0.5 - z];
}

function poly(points: [number, number, number][]): string {
  return points.map(([x, y, z]) => project(x, y, z).map((n) => n.toFixed(2)).join(",")).join(" ");
}

const STROKE: Record<Tone, string> = {
  dark: "rgba(255,255,255,0.09)",
  ink: "rgba(255,255,255,0.14)",
  lit: "rgba(255,196,140,0.75)",
  glass: "rgba(255,164,82,0.7)",
};

function fills(tone: Tone, id: string) {
  switch (tone) {
    case "lit":
      return { top: `url(#${id}-lt)`, left: `url(#${id}-ll)`, right: `url(#${id}-lr)` };
    case "glass":
      return { top: "rgba(204,102,0,0.22)", left: "rgba(204,102,0,0.12)", right: "rgba(204,102,0,0.06)" };
    case "ink":
      return { top: "#0B0B1E", left: "#07071A", right: "#040412" };
    default:
      return { top: `url(#${id}-dt)`, left: "#0A1830", right: "#050F22" };
  }
}

function bounds(shapes: IsoShape[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number, z: number, pad = 0) => {
    const [sx, sy] = project(x, y, z);
    minX = Math.min(minX, sx - pad);
    maxX = Math.max(maxX, sx + pad);
    minY = Math.min(minY, sy - pad);
    maxY = Math.max(maxY, sy + pad);
  };
  for (const s of shapes) {
    if (s.kind === "box") {
      for (const x of [s.x, s.x + s.w])
        for (const y of [s.y, s.y + s.d]) for (const z of [s.z, s.z + s.h]) add(x, y, z);
    } else if (s.kind === "cyl") {
      const rx = s.r * Math.SQRT2 * COS;
      add(s.x, s.y, s.z, rx);
      add(s.x, s.y, s.z + s.h, rx);
    } else if (s.kind === "curve" || s.kind === "poly") {
      for (const [x, y, z] of s.points) add(x, y, z, 2);
    } else if (s.kind === "label") {
      add(s.x, s.y, s.z, s.size);
    } else {
      add(s.x, s.y, s.z, s.r);
    }
  }
  return { minX, minY, maxX, maxY };
}

export function IsoScene({
  id,
  shapes,
  pad = 16,
  className,
  label,
}: {
  id: string;
  shapes: IsoShape[];
  pad?: number;
  className?: string;
  label: string;
}) {
  const b = bounds(shapes);
  const vb = `${(b.minX - pad).toFixed(1)} ${(b.minY - pad).toFixed(1)} ${(b.maxX - b.minX + pad * 2).toFixed(1)} ${(b.maxY - b.minY + pad * 2).toFixed(1)}`;

  return (
    <svg viewBox={vb} className={className} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${id}-lt`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFC285" />
          <stop offset="1" stopColor="#E67300" />
        </linearGradient>
        <linearGradient id={`${id}-ll`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C25E00" />
          <stop offset="1" stopColor="#6E3200" />
        </linearGradient>
        <linearGradient id={`${id}-lr`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6A3000" />
          <stop offset="1" stopColor="#2E1400" />
        </linearGradient>
        <linearGradient id={`${id}-dt`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#16294A" />
          <stop offset="1" stopColor="#0E1D38" />
        </linearGradient>
        <linearGradient id={`${id}-cs`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0A1830" />
          <stop offset="0.55" stopColor="#12264A" />
          <stop offset="1" stopColor="#050F22" />
        </linearGradient>
        <linearGradient id={`${id}-cl`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6E3200" />
          <stop offset="0.5" stopColor="#D06800" />
          <stop offset="1" stopColor="#3A1A00" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#FF8A1F" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#CC6600" stopOpacity="0.28" />
          <stop offset="1" stopColor="#CC6600" stopOpacity="0" />
        </radialGradient>
      </defs>

      {shapes.map((s, i) => {
        if (s.kind === "glow") {
          const [cx, cy] = project(s.x, s.y, s.z);
          return (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={s.r}
              ry={s.r * 0.62}
              fill={`url(#${id}-glow)`}
              opacity={s.opacity ?? 1}
            />
          );
        }

        if (s.kind === "curve") {
          const d = s.points
            .map(([x, y, z], j) => {
              const [px, py] = project(x, y, z);
              return `${j === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`;
            })
            .join(" ");
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="#FFA040"
              strokeWidth={1.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="3 4"
              opacity={0.9}
            />
          );
        }

        if (s.kind === "poly") {
          const PolyTag = s.open ? "polyline" : "polygon";
          return (
            <PolyTag
              key={i}
              points={poly(s.points)}
              fill={s.fill ?? "none"}
              stroke={s.stroke}
              strokeWidth={s.width ?? 0}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={s.opacity ?? 1}
            />
          );
        }

        if (s.kind === "label") {
          const [ox, oy] = project(s.x, s.y, s.z);
          const m = s.plane === "top" ? [COS, 0.5, -COS, 0.5] : [COS, 0.5, 0, 1];
          return (
            <text
              key={i}
              transform={`matrix(${m.map((n) => n.toFixed(4)).join(" ")} ${ox.toFixed(2)} ${oy.toFixed(2)})`}
              fontSize={s.size}
              fontWeight={700}
              fill={s.fill}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {s.text}
            </text>
          );
        }

        if (s.kind === "cyl") {
          const rx = s.r * Math.SQRT2 * COS;
          const ry = s.r * Math.SQRT2 * 0.5;
          const [cx, cyBase] = project(s.x, s.y, s.z);
          const cyTop = cyBase - s.h;
          const lit = s.tone === "lit";
          const side = `M${cx - rx},${cyTop} L${cx - rx},${cyBase} A${rx},${ry} 0 0 0 ${cx + rx},${cyBase} L${cx + rx},${cyTop} Z`;
          return (
            <g key={i}>
              <path d={side} fill={lit ? `url(#${id}-cl)` : `url(#${id}-cs)`} stroke={STROKE[s.tone]} strokeWidth={0.75} />
              <ellipse
                cx={cx}
                cy={cyTop}
                rx={rx}
                ry={ry}
                fill={lit ? `url(#${id}-lt)` : `url(#${id}-dt)`}
                stroke={STROKE[s.tone]}
                strokeWidth={0.75}
              />
            </g>
          );
        }

        const { x, y, z, w, d, h, tone } = s;
        const f = fills(tone, id);
        const stroke = STROKE[tone];
        const [ox, oy] = project(x + w, y + d, z);
        return (
          <g
            key={i}
            strokeLinejoin="round"
            className={s.delay !== undefined ? "iso-rise" : undefined}
            style={s.delay !== undefined ? { transformOrigin: `${ox}px ${oy}px`, animationDelay: `${s.delay}ms` } : undefined}
          >
            <polygon
              points={poly([
                [x, y + d, z],
                [x + w, y + d, z],
                [x + w, y + d, z + h],
                [x, y + d, z + h],
              ])}
              fill={f.left}
              stroke={stroke}
              strokeWidth={0.75}
            />
            <polygon
              points={poly([
                [x + w, y, z],
                [x + w, y + d, z],
                [x + w, y + d, z + h],
                [x + w, y, z + h],
              ])}
              fill={f.right}
              stroke={stroke}
              strokeWidth={0.75}
            />
            <polygon
              points={poly([
                [x, y, z + h],
                [x + w, y, z + h],
                [x + w, y + d, z + h],
                [x, y + d, z + h],
              ])}
              fill={s.topFill ?? f.top}
              stroke={stroke}
              strokeWidth={0.75}
            />
          </g>
        );
      })}
    </svg>
  );
}

const box = (
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  tone: Tone = "dark",
  topFill?: string,
  delay?: number,
): BoxShape => ({
  kind: "box",
  x,
  y,
  z,
  w,
  d,
  h,
  tone,
  topFill,
  delay,
});

function bellShapes(): IsoShape[] {
  const shapes: IsoShape[] = [box(-6, -6, 0, 13 * 22 + 12, 44, 8)];
  const tops: [number, number, number][] = [];
  const n = 13;
  for (let i = 0; i < n; i++) {
    const t = (i - (n - 1) / 2) / 2.6;
    const h = 8 + 132 * Math.exp(-0.5 * t * t);
    const center = i === (n - 1) / 2;
    const heat = Math.min(0.55, (h - 8) / 240);
    if (center) shapes.push({ kind: "glow", x: i * 22 + 8, y: 16, z: h + 8, r: 70, opacity: 0.9 });
    shapes.push(
      box(i * 22, 8, 8, 16, 16, h, center ? "lit" : "dark", center ? undefined : `rgba(204,102,0,${heat.toFixed(2)})`),
    );
    tops.push([i * 22 + 8, 16, 8 + h + 14]);
  }
  shapes.push({ kind: "curve", points: tops });
  return shapes;
}

export const BELL_SHAPES: IsoShape[] = bellShapes();

// A bell curve pulled out into a thick ribbon: the curve runs along x (toward the lower right of the
// screen), the ribbon's width along y. Quads are shaded by a light from the upper left and drawn back
// to front, with the ribbon's front edge given a solid wall so it reads as a sheet with thickness.
function ribbonShapes(): IsoShape[] {
  const length = 620;
  const width = 170;
  const height = 250;
  const thickness = 14;
  const nx = 72;
  const ny = 12;
  const peak = 0.46;
  const spread = 0.12;
  const z = (x: number) => height * Math.exp(-(((x / length - peak) / spread) ** 2) / 2) + 6;

  const L = (() => {
    const l = [-0.35, 0.55, 0.75];
    const m = Math.hypot(l[0]!, l[1]!, l[2]!);
    return l.map((c) => c / m) as [number, number, number];
  })();
  const dark = [9, 20, 42];
  const warm = [240, 120, 10];
  const color = (t: number, k: number) =>
    `rgb(${dark.map((c, idx) => Math.round(Math.min(255, (c + (warm[idx]! - c) * t) * k))).join(",")})`;
  const shade = (p: Point[]) => {
    const d1 = [p[2]![0] - p[0]![0], p[2]![1] - p[0]![1], p[2]![2] - p[0]![2]];
    const d2 = [p[3]![0] - p[1]![0], p[3]![1] - p[1]![1], p[3]![2] - p[1]![2]];
    const n = [d1[1]! * d2[2]! - d1[2]! * d2[1]!, d1[2]! * d2[0]! - d1[0]! * d2[2]!, d1[0]! * d2[1]! - d1[1]! * d2[0]!];
    const m = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    return Math.abs((n[0]! * L[0] + n[1]! * L[1] + n[2]! * L[2]) / m);
  };
  // Ends of the ribbon fade in and out so it has no hard start or stop.
  const endFade = (x: number) => Math.min(1, x / (length * 0.1), (length - x) / (length * 0.08));

  const parts: { key: number; shape: PolyShape }[] = [];
  for (let i = 0; i < nx; i++) {
    const x0 = (length * i) / nx;
    const x1 = (length * (i + 1)) / nx;
    const lift = Math.min(1, (z((x0 + x1) / 2) - 6) / height);
    const fade = endFade((x0 + x1) / 2);
    if (fade <= 0.02) continue;
    const t = 0.3 + 0.7 * lift ** 0.8;
    for (let j = 0; j < ny; j++) {
      const y0 = (width * j) / ny;
      const y1 = (width * (j + 1)) / ny;
      const pts: Point[] = [
        [x0, y0, z(x0)],
        [x1, y0, z(x1)],
        [x1, y1, z(x1)],
        [x0, y1, z(x0)],
      ];
      const k = 0.35 + 0.85 * shade(pts);
      parts.push({
        key: i + j * 0.001,
        shape: {
          kind: "poly",
          points: pts,
          fill: color(t, k),
          stroke: `rgba(255,205,150,${(0.06 + 0.2 * lift).toFixed(2)})`,
          width: 0.55,
          opacity: Number(fade.toFixed(2)),
        },
      });
    }
    // Front wall along y = width gives the sheet its thickness: a solid band (stroked in its own
    // fill so neighbouring segments don't show seams) topped by one bright edge line.
    const wallFill = color(t * 0.9, 0.5);
    parts.push({
      key: i + 0.9,
      shape: {
        kind: "poly",
        points: [
          [x0, width, z(x0)],
          [x1, width, z(x1)],
          [x1, width, z(x1) - thickness],
          [x0, width, z(x0) - thickness],
        ],
        fill: wallFill,
        stroke: wallFill,
        width: 0.6,
        opacity: Number(fade.toFixed(2)),
      },
    });
    parts.push({
      key: i + 0.95,
      shape: {
        kind: "poly",
        open: true,
        points: [
          [x0, width, z(x0)],
          [x1, width, z(x1)],
        ],
        stroke: `rgba(255,200,140,${(0.25 + 0.6 * lift).toFixed(2)})`,
        width: 1,
        opacity: Number(fade.toFixed(2)),
      },
    });
  }
  parts.sort((a, b) => a.key - b.key);

  return [
    { kind: "glow", x: length * peak, y: width / 2, z: height * 0.75, r: 220, opacity: 0.4 },
    ...parts.map((p) => p.shape),
  ];
}

export const SURFACE_SHAPES: IsoShape[] = ribbonShapes();

const INK_LINE = "rgba(58,26,0,0.7)";
const PAPER_LINE = "rgba(255,255,255,0.16)";

function topRect(x1: number, y1: number, x2: number, y2: number, z: number, fill: string): PolyShape {
  return { kind: "poly", points: [[x1, y1, z], [x2, y1, z], [x2, y2, z], [x1, y2, z]], fill };
}

function frontRect(x1: number, x2: number, z1: number, z2: number, y: number, fill: string, opacity = 1): PolyShape {
  return { kind: "poly", points: [[x1, y, z1], [x2, y, z1], [x2, y, z2], [x1, y, z2]], fill, opacity };
}

// Text lines printed on the top face of a sheet.
function textLines(x: number, y: number, w: number, d: number, z: number, fill: string): PolyShape[] {
  const rows = [0.18, 0.36, 0.54, 0.72];
  const lens = [0.8, 0.64, 0.74, 0.46];
  return rows.map((r, i) => topRect(x + w * 0.12, y + d * r, x + w * (0.12 + lens[i]! * 0.76), y + d * r + d * 0.07, z, fill));
}

// A vertical arrow drawn in the plane y = const, pointing up (dir 1) or down (dir -1).
function arrow(xc: number, y: number, zBase: number, len: number, dir: 1 | -1, fill: string): PolyShape {
  const shaft = 3;
  const head = 8;
  const headLen = 11;
  const tip = zBase + dir * len;
  const neck = tip - dir * headLen;
  return {
    kind: "poly",
    points: [
      [xc - shaft, y, zBase],
      [xc + shaft, y, zBase],
      [xc + shaft, y, neck],
      [xc + head, y, neck],
      [xc, y, tip],
      [xc - head, y, neck],
      [xc - shaft, y, neck],
    ],
    fill,
  };
}

const glow = (x: number, y: number, z: number, r: number, opacity = 0.8): GlowShape => ({ kind: "glow", x, y, z, r, opacity });
const cyl = (x: number, y: number, z: number, r: number, h: number, tone: Tone = "dark"): CylShape => ({ kind: "cyl", x, y, z, r, h, tone });

// Step 1: a document rising out of an upload tray.
export const STEP_SEND: IsoShape[] = [
  box(0, 0, 0, 96, 76, 6),
  box(12, 12, 6, 64, 50, 5, "ink"),
  box(18, 18, 11, 52, 38, 2),
  ...textLines(18, 18, 52, 38, 13, PAPER_LINE),
  glow(48, 40, 44, 50, 0.7),
  box(22, 22, 36, 52, 38, 2, "lit"),
  ...textLines(22, 22, 52, 38, 38, INK_LINE),
  arrow(48, 41, 52, 40, 1, "#FFA040"),
];

// Step 2: a written document with a peso price coin on it.
export const STEP_PRICE: IsoShape[] = [
  box(0, 0, 0, 104, 80, 6),
  box(10, 10, 6, 58, 62, 2),
  ...textLines(10, 10, 58, 62, 8, PAPER_LINE),
  topRect(18, 60, 50, 62, 8, "rgba(255,160,64,0.55)"),
  glow(80, 54, 18, 40, 0.8),
  cyl(80, 54, 6, 17, 7, "lit"),
  { kind: "label", x: 80, y: 54, z: 13, text: "₱", size: 20, fill: "#3A1A00", plane: "top" },
];

// Step 3: a phone showing a peso payment, next to a stack of coins.
export const STEP_PAY: IsoShape[] = [
  box(0, 0, 0, 108, 80, 6),
  cyl(78, 28, 6, 16, 7),
  cyl(78, 28, 13, 16, 7),
  glow(78, 28, 34, 40, 0.6),
  cyl(78, 28, 20, 16, 7, "lit"),
  { kind: "label", x: 78, y: 28, z: 27, text: "₱", size: 19, fill: "#3A1A00", plane: "top" },
  box(14, 44, 6, 38, 7, 64, "ink"),
  frontRect(18, 48, 12, 66, 51, "#CC6600", 0.92),
  frontRect(18, 48, 60, 66, 51, "rgba(58,26,0,0.45)"),
  { kind: "label", x: 33, y: 51, z: 44, text: "₱", size: 17, fill: "#1E0D00", plane: "front" },
  frontRect(24, 42, 22, 26, 51, "rgba(30,13,0,0.55)"),
];

// Step 4: the original chart and a rerun copy that matches, with a check.
export const STEP_RECHECK: IsoShape[] = [
  box(0, 0, 0, 136, 62, 6),
  box(10, 22, 6, 13, 13, 22),
  box(27, 22, 6, 13, 13, 34),
  box(44, 22, 6, 13, 13, 48, "lit"),
  box(78, 22, 6, 13, 13, 22, "glass"),
  box(95, 22, 6, 13, 13, 34, "glass"),
  box(112, 22, 6, 13, 13, 48, "glass"),
  glow(104, 20, 78, 36, 0.65),
  { kind: "poly", points: [[92, 20, 78], [100, 20, 70], [118, 20, 92]], stroke: "#FFA040", width: 4.5, open: true },
];

// Step 5: a finished document dropping into an open box.
export const STEP_DELIVER: IsoShape[] = [
  box(0, 0, 0, 96, 96, 6),
  box(14, 14, 6, 68, 68, 4, "ink"),
  box(18, 18, 10, 60, 6, 24),
  box(18, 24, 10, 6, 48, 24),
  box(72, 24, 10, 6, 48, 24),
  glow(48, 48, 50, 54, 0.85),
  box(30, 30, 44, 36, 36, 2, "lit"),
  ...textLines(30, 30, 36, 36, 46, INK_LINE),
  box(18, 72, 10, 60, 6, 24),
  arrow(48, 48, 96, 32, -1, "#FFA040"),
];

// File thumbnails for "What you get".
const WHITE_LINE = "rgba(255,255,255,0.22)";
const ORANGE_LINE = "rgba(255,160,64,0.9)";

// Write-up: a document with an orange title and paragraph lines.
export const FILE_WRITEUP: IsoShape[] = [
  box(8, 8, 0, 56, 72, 3, "ink"),
  box(0, 0, 3, 56, 72, 3),
  topRect(8, 8, 36, 13, 6, ORANGE_LINE),
  ...[20, 27, 34, 45, 52, 59].map((y, i) => topRect(8, y, [48, 44, 40, 48, 42, 30][i]!, y + 3.5, 6, WHITE_LINE)),
];

// Data: a spreadsheet with an orange header row.
export const FILE_DATA: IsoShape[] = [
  box(0, 0, 0, 64, 72, 3),
  ...[0, 1, 2, 3].flatMap((c) =>
    [0, 1, 2, 3, 4, 5].map((r) =>
      topRect(5 + c * 14.5, 5 + r * 11, 5 + c * 14.5 + 12.5, 5 + r * 11 + 9, 3, r === 0 ? ORANGE_LINE : "rgba(255,255,255,0.14)"),
    ),
  ),
];

// Code: a screen with indented code lines.
export const FILE_CODE: IsoShape[] = [
  box(0, 0, 0, 64, 70, 3, "ink"),
  ...[
    [6, 26, ORANGE_LINE],
    [6, 44, WHITE_LINE],
    [14, 50, WHITE_LINE],
    [14, 38, ORANGE_LINE],
    [22, 54, WHITE_LINE],
    [14, 34, WHITE_LINE],
    [6, 20, ORANGE_LINE],
  ].map(([x1, x2, fill], i) => topRect(x1 as number, 8 + i * 8.5, x2 as number, 8 + i * 8.5 + 3.5, 3, fill as string)),
];

// Defense: a question card and a lit answer card.
export const FILE_DEFENSE: IsoShape[] = [
  box(0, 0, 30, 40, 36, 4),
  { kind: "label", x: 20, y: 18, z: 34, text: "Q", size: 20, fill: "rgba(255,255,255,0.8)", plane: "top" },
  glow(52, 50, 8, 34, 0.6),
  box(32, 32, 0, 40, 36, 4, "lit"),
  { kind: "label", x: 52, y: 50, z: 4, text: "A", size: 20, fill: "#3A1A00", plane: "top" },
];
