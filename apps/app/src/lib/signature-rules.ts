// Staff signatures (printed on the client's certificate). Shared by the profile's signature pad and the server.
//
// A signature is drawn in the profile and saved as a small SVG: one path of straight line segments in a 600x200
// box, black ink, nothing else. The server accepts only that exact shape (no scripts, links, images or styles), so
// the SVG is safe to render. It used to accept any text, and the certificate maker would fetch any web address or
// read any file path given there.
//
// Pictures saved before this (PNG, JPEG or WebP data URLs) still show and still print; they just can't be saved anew.

export const SIGNATURE_WIDTH = 600;
export const SIGNATURE_HEIGHT = 200;

/** A long signature is a few thousand points; this is plenty and keeps rows small. */
export const MAX_SIGNATURE_CHARS = 200_000;

/** The one built-in sample signature (offline sample reviewer). */
export const SAMPLE_SIGNATURE_PATH = "/signatures/qa-lead-maria.png";

const SVG_PREFIX = "data:image/svg+xml;base64,";
const SVG_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIGNATURE_WIDTH} ${SIGNATURE_HEIGHT}" width="${SIGNATURE_WIDTH}" height="${SIGNATURE_HEIGHT}">`;
const PATH_ATTRS = `fill="none" stroke="#111111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
const DRAWN_SVG = new RegExp(
  `^${SVG_OPEN.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}<path d="(?:[ML]-?\\d{1,4}(?:\\.\\d)? -?\\d{1,4}(?:\\.\\d)?)+" ${PATH_ATTRS}/></svg>$`
);

/** Pictures saved before signatures were drawn-only. Still printed; no longer accepted as new. */
export const LEGACY_PICTURE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Strokes (lists of [x, y] points in the 600x200 box) → the SVG data URL that gets saved. */
export function strokesToSignature(strokes: Array<Array<[number, number]>>): string | null {
  const r = (n: number) => Math.round(Math.min(Math.max(n, 0), 9999) * 10) / 10;
  const d = strokes
    .filter((s) => s.length > 0)
    .map((s) => {
      const pts = s.length === 1 ? [s[0]!, [s[0]![0] + 0.5, s[0]![1]] as [number, number]] : s;
      return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${r(x)} ${r(y)}`).join("");
    })
    .join("");
  if (!d) return null;
  const svg = `${SVG_OPEN}<path d="${d}" ${PATH_ATTRS}/></svg>`;
  return SVG_PREFIX + btoa(svg);
}

/** The SVG text inside a drawn signature, or null if the value isn't exactly a drawn signature. */
export function drawnSignatureSvg(value: string): string | null {
  if (!value.startsWith(SVG_PREFIX)) return null;
  let svg: string;
  try {
    svg = atob(value.slice(SVG_PREFIX.length));
  } catch {
    return null;
  }
  return DRAWN_SVG.test(svg) ? svg : null;
}

/** Plain reason a new signature can't be saved, or null when it's fine (null itself means "no signature"). */
export function signatureProblem(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value === SAMPLE_SIGNATURE_PATH) return null;
  if (value.length > MAX_SIGNATURE_CHARS) return "That signature is too long. Clear it and sign again.";
  if (!drawnSignatureSvg(value)) return "Draw your signature in the box on your profile.";
  return null;
}

/** Roles whose signature goes on a client's certificate when they approve a study; they must have one. */
export const SIGNATURE_REQUIRED_ROLES = ["SENIOR_QA_LEAD"];
