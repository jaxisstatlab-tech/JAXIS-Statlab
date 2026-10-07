import { z } from "zod";

// Names, profile photos and client social links, shared by every role's My Profile.

/** Letters (any language, e.g. ñ), spaces, hyphens, apostrophes and periods. */
const NAME_CHARS = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u;

export const NameSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Enter your first name.")
    .max(50, "Keep your first name under 50 characters.")
    .regex(NAME_CHARS, "Use letters only (spaces, - ' and . are fine)."),
  lastName: z
    .string()
    .trim()
    .min(1, "Enter your last name.")
    .max(50, "Keep your last name under 50 characters.")
    .regex(NAME_CHARS, "Use letters only (spaces, - ' and . are fine)."),
});
export type NameInput = z.infer<typeof NameSchema>;

/** "Juan", "Reyes" -> "Juan Reyes". */
export function composeFullName(first: string, last: string): string {
  return [first.trim(), last.trim()].filter(Boolean).join(" ").replace(/\s+/g, " ");
}

/**
 * Best guess for accounts made before names were split: the last word is the last name, everything before it the
 * first name ("Juan D. Reyes" -> "Juan D." / "Reyes"); titles like Dr. are dropped; one word -> first name only.
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter((w) => !/^(dr|mr|mrs|ms|prof|engr|atty)\.?$/i.test(w));
  if (words.length === 0) return { firstName: "", lastName: "" };
  if (words.length === 1) return { firstName: words[0]!, lastName: "" };
  return { firstName: words.slice(0, -1).join(" "), lastName: words[words.length - 1]! };
}

// ── Profile photo ────────────────────────────────────────────────────────────

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Where a person's photos are stored; the server only accepts a photo saved under their own folder. */
export const avatarFolder = (userId: string) => `avatars/${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}/`;

export const AvatarSchema = z.object({ storageKey: z.string().min(1).max(300) });

// ── Client social links (Facebook and Instagram only) ─────────────────────────

/** Accepts a full link, a link without https, or (Instagram) @handle; returns a clean https link or null. */
export function normalizeFacebook(raw: string | null | undefined): string | null | "INVALID" {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const url = v.startsWith("http") ? v : `https://${v.replace(/^\/+/, "")}`;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^(www\.|m\.|web\.)/, "");
    if (host !== "facebook.com" && host !== "fb.com") return "INVALID";
    const path = u.pathname.replace(/\/+$/, "");
    if (!path || path === "/") return "INVALID";
    return `https://www.facebook.com${path}${u.pathname.startsWith("/profile.php") ? u.search : ""}`;
  } catch {
    return "INVALID";
  }
}

export function normalizeInstagram(raw: string | null | undefined): string | null | "INVALID" {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const handle = /^@?[A-Za-z0-9._]{1,30}$/.test(v) ? v.replace(/^@/, "") : null;
  if (handle) return `https://www.instagram.com/${handle}`;
  const url = v.startsWith("http") ? v : `https://${v.replace(/^\/+/, "")}`;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
    if (host !== "instagram.com") return "INVALID";
    const name = u.pathname.split("/").filter(Boolean)[0];
    if (!name || !/^[A-Za-z0-9._]{1,30}$/.test(name)) return "INVALID";
    return `https://www.instagram.com/${name}`;
  } catch {
    return "INVALID";
  }
}

/** "https://www.instagram.com/ana.reyes" -> "@ana.reyes"; Facebook -> the page path. For display. */
export function socialLabel(url: string): string {
  try {
    const u = new URL(url);
    const first = u.pathname.split("/").filter(Boolean)[0] ?? "";
    if (u.hostname.includes("instagram")) return `@${first}`;
    return first === "profile.php" ? "Facebook profile" : first;
  } catch {
    return url;
  }
}
