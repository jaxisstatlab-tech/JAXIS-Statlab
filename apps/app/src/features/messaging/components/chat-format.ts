import type { MessageDTO } from "../schemas";

/** "Dr. Juan Reyes" → "JR", "Ana" → "AN". Titles like Dr./Prof. are skipped. */
export function initials(name?: string | null): string {
  const words = (name ?? "")
    .replace(/\b(dr|prof|engr|atty|mr|ms|mrs)\.?\s+/gi, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}

/** First name for short labels: "Dr. Juan Reyes" → "Juan". */
export function firstName(name?: string | null): string {
  const words = (name ?? "").replace(/\b(dr|prof|engr|atty|mr|ms|mrs)\.?\s+/gi, "").split(/\s+/).filter(Boolean);
  return words[0] ?? "";
}

/** Plain role names shown next to a sender. */
export function roleLabel(role?: string | null): string {
  switch (role) {
    case "CLIENT":
      return "Client";
    case "STATISTICIAN":
      return "Statistical Analyst";
    case "SENIOR_QA_LEAD":
      return "Reviewer";
    case "ADMIN":
    case "CEO":
      return "JAXIS team";
    default:
      return "";
  }
}

// Chat times are shown in Philippine time on both the server and the browser, so the first
// render matches (no hydration flash) and everyone sees the same day labels.
export const CHAT_TZ = "Asia/Manila";
const DAY = 24 * 60 * 60 * 1000;
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: CHAT_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dayKey = (d: Date) => dayKeyFmt.format(d);
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);

/** "Today", "Yesterday", "Thu, Sep 24", or "Sep 24, 2025" for older years. */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (sameDay(d, now)) return "Today";
  if (sameDay(d, new Date(now.getTime() - DAY))) return "Yesterday";
  if (dayKey(d).slice(0, 4) !== dayKey(now).slice(0, 4)) {
    return d.toLocaleDateString("en-PH", { timeZone: CHAT_TZ, month: "short", day: "numeric", year: "numeric" });
  }
  return d.toLocaleDateString("en-PH", { timeZone: CHAT_TZ, weekday: "short", month: "short", day: "numeric" });
}

export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-PH", { timeZone: CHAT_TZ, hour: "numeric", minute: "2-digit" });

/** Full date and time for tooltips. */
export const fullTimeLabel = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    timeZone: CHAT_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** Inbox time: "3:25 PM" today, "Yesterday", weekday within a week, else "Sep 24". */
export function listTimeLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (sameDay(d, now)) return timeLabel(iso);
  if (sameDay(d, new Date(now.getTime() - DAY))) return "Yesterday";
  if (now.getTime() - d.getTime() < 6 * DAY) {
    return d.toLocaleDateString("en-PH", { timeZone: CHAT_TZ, weekday: "short" });
  }
  return d.toLocaleDateString("en-PH", { timeZone: CHAT_TZ, month: "short", day: "numeric" });
}

/** Messages from the same sender within 5 minutes read as one group (one name, one time). */
export function sameGroup(a: MessageDTO | undefined, b: MessageDTO | undefined): boolean {
  if (!a || !b) return false;
  if (a.senderId !== b.senderId || a.isMine !== b.isMine) return false;
  const da = new Date(a.sentAt);
  const db = new Date(b.sentAt);
  return sameDay(da, db) && Math.abs(db.getTime() - da.getTime()) < 5 * 60 * 1000;
}
