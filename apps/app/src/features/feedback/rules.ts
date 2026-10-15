import { FEEDBACK_EDIT_DAYS, NAME_STYLES, type NameStyle } from "./schemas";

const DAY = 86_400_000;

/**
 * A study is finished, and its client can be asked for feedback, once it's closed, or delivered with the free-changes
 * window over, and the final files have been released to the client.
 */
export function isStudyFinished(p: {
  masterStatus: string;
  revisionWindowExpiresAt?: Date | string | null;
  hasReleasedFiles: boolean;
  now?: number;
}): boolean {
  if (!p.hasReleasedFiles) return false;
  if (p.masterStatus === "CLOSED") return true;
  if (p.masterStatus !== "DELIVERED" || !p.revisionWindowExpiresAt) return false;
  const ends = new Date(p.revisionWindowExpiresAt).getTime();
  return Number.isFinite(ends) && ends < (p.now ?? Date.now());
}

/** Until when the client can still change their feedback, or null once that time has passed. */
export function editableUntil(createdAt: Date | string, now = Date.now()): string | null {
  const until = new Date(createdAt).getTime() + FEEDBACK_EDIT_DAYS * DAY;
  return until > now ? new Date(until).toISOString() : null;
}

export const asNameStyle = (v: string | null | undefined): NameStyle =>
  (NAME_STYLES as readonly string[]).includes(v ?? "") ? (v as NameStyle) : "HIDDEN";

/** 1 or 2 out of 5: someone should follow up. */
export const isLowRating = (rating: number) => rating <= 2;

/** Days to wait after asking before the one reminder. */
export const REMIND_AFTER_DAYS = 3;
