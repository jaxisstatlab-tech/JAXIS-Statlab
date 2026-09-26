// Visitor consent for analytics and any future tracking tools. Stored in this browser only.
// Nothing that needs consent may load until getConsent() returns "accepted".

export type Consent = "accepted" | "rejected";

const KEY = "jx-consent";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 182; // about 6 months, then we ask again

export const CONSENT_CHANGED = "jaxis:consent-changed";
export const CONSENT_OPEN = "jaxis:consent-open";

export function getConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { value, at } = JSON.parse(raw) as { value?: Consent; at?: number };
    if ((value !== "accepted" && value !== "rejected") || !at || Date.now() - at > MAX_AGE_MS) return null;
    return value;
  } catch {
    return null;
  }
}

export function setConsent(value: Consent) {
  const before = getConsent();
  try {
    localStorage.setItem(KEY, JSON.stringify({ value, at: Date.now() }));
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_CHANGED, { detail: value }));
  // Scripts that already loaded can't be unloaded, so withdrawing consent reloads the page without them.
  if (before === "accepted" && value === "rejected") window.location.reload();
}

/** Reopens the banner, e.g. from the footer's "Cookie settings" link. */
export function openConsentSettings() {
  window.dispatchEvent(new Event(CONSENT_OPEN));
}
