import { CLIENT_PACKAGES } from "./client-packages";

// What the client would like on the intake form: a package, add-ons and notes. These are wishes, not the
// price: the admin builds the quote after reviewing the study and may pick a different package or add-ons.
// Add-on names and details match the public website (apps/web/app/content/pricing.ts ADDONS).

export const PREFERRED_PACKAGE_OPTIONS = ["JX_01_DATACHECK", "JX_02_START", "JX_03_CORE", "JX_04_ADVANCED", "UNSURE"] as const;
export type PreferredPackage = (typeof PREFERRED_PACKAGE_OPTIONS)[number];

export const PREFERRED_ADDON_OPTIONS = ["DEFENSELAB", "RUSH", "EXPRESS", "EMERGENCY", "NONE", "UNSURE"] as const;
export type PreferredAddOn = (typeof PREFERRED_ADDON_OPTIONS)[number];

/** Delivery speeds: a study can have at most one. */
export const SPEED_ADDONS: PreferredAddOn[] = ["RUSH", "EXPRESS", "EMERGENCY"];

export const CLIENT_ADDONS: Record<"DEFENSELAB" | "RUSH" | "EXPRESS" | "EMERGENCY", { name: string; detail: string }> = {
  DEFENSELAB: { name: "DefenseLab mock panel", detail: "A 1-on-1 practice defense with a senior analyst. You get the recording." },
  RUSH: { name: "Rush", detail: "Ready in 3 days after your deposit is confirmed." },
  EXPRESS: { name: "Express", detail: "Ready in 48 hours after your deposit is confirmed." },
  EMERGENCY: { name: "Emergency", detail: "Ready in 24 hours, with a senior reviewer on your study." },
};

export const CLIENT_NOTES_MAX = 2000;

export const PREFERENCE_NOTE =
  "These are your preferences. JAXIS may change the package and add-ons after reviewing your study and files. Your written quote shows the final package and price before you pay anything.";

/** "Core Thesis Package", "Not sure, JAXIS picks", or null when the study was sent before the form asked. */
export function preferredPackageLabel(code?: string | null): string | null {
  if (!code) return null;
  if (code === "UNSURE") return "Not sure, JAXIS picks";
  return CLIENT_PACKAGES[code as keyof typeof CLIENT_PACKAGES]?.name ?? code;
}

/** "DefenseLab mock panel, Rush", "No add-ons", "Not sure, JAXIS picks", or null when not asked. */
export function preferredAddOnsLabel(codes?: string[] | null): string | null {
  if (!codes?.length) return null;
  if (codes.includes("UNSURE")) return "Not sure, JAXIS picks";
  if (codes.includes("NONE")) return "No add-ons";
  return codes.map((c) => CLIENT_ADDONS[c as keyof typeof CLIENT_ADDONS]?.name ?? c).join(", ");
}

/** Why a set of add-on choices doesn't work, or null when it's fine. */
export function addOnsProblem(codes: string[]): string | null {
  if (codes.length === 0) return 'Pick the add-ons you want, "No add-ons", or "Not sure".';
  const special = codes.filter((c) => c === "NONE" || c === "UNSURE");
  if (special.length && codes.length > 1) return '"No add-ons" and "Not sure" can\'t be picked with other add-ons.';
  if (codes.filter((c) => SPEED_ADDONS.includes(c as PreferredAddOn)).length > 1) return "Pick only one delivery speed (Rush, Express or Emergency).";
  return null;
}

/** Real add-on codes from the client's choices (for starting a quote), without NONE / UNSURE. */
export function preferredAddOnCodes(codes?: string[] | null): Array<keyof typeof CLIENT_ADDONS> {
  return (codes ?? []).filter((c): c is keyof typeof CLIENT_ADDONS => c in CLIENT_ADDONS);
}
