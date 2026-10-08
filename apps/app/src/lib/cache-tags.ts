import { revalidateTag, updateTag } from "next/cache";

/**
 * Canonical Cache Tags for In-Memory Server Caching
 */
export const CACHE_TAGS = {
  PROJECTS: "projects",
  STAFF_CAPACITY: "staff-capacity",
  STAFF_DIRECTORY: "staff-directory",
  STAFF_ROSTER: "staff-roster",
  ATTENDANCE_REVIEW: "attendance-review",
  PAYROLL: "payroll-data",
  PAYMENTS: "payments-queue",
  QUOTATIONS: "quotations-roster",
} as const;

/**
 * Safely invalidates one or more cache tags.
 */
export function invalidateCacheTags(...tags: string[]): void {
  for (const tag of tags) {
    try {
      if (typeof updateTag === "function") {
        updateTag(tag);
      }
      if (typeof revalidateTag === "function") {
        revalidateTag(tag, "default");
      }
    } catch {
      // Revalidation may fail if called outside of request context (e.g. scripts/seed)
    }
  }
}

/**
 * Dates from an `unstable_cache` read: the first read hands back Date objects, but a cached copy comes back as
 * text (the cache stores JSON), so `.toISOString()` on it crashes. Use this for every date from a cached read.
 */
export function cachedIso(value: Date | string): string;
export function cachedIso(value: Date | string | null | undefined): string | null;
export function cachedIso(value: Date | string | null | undefined): string | null {
  return value == null ? null : new Date(value).toISOString();
}
