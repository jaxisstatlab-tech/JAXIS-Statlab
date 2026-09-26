// The public marketing site (apps/web). A localhost value is ignored so links from a
// deployed app never point at someone's dev machine.
const configured = process.env.NEXT_PUBLIC_SITE_URL;

export const SITE_URL =
  configured && !configured.includes("localhost") ? configured.replace(/\/$/, "") : "https://jaxis-statlab-web.vercel.app";

export const SITE_TERMS_URL = `${SITE_URL}/terms`;
export const SITE_PRIVACY_URL = `${SITE_URL}/privacy`;

// Only same-site paths are allowed as a post-login destination ("/dashboard", not "//evil.com").
export function safeCallbackPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
