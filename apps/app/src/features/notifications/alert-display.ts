// Plain-English presentation of in-app alerts (title, link label, short time), shared by the
// notification drawer and dashboard "recent updates" panels.

// ─── Plain-English titles and link labels per alert type ──────────────────────

const ALERT_META: Record<string, { label: string; action: string }> = {
  NEW_INTAKE: { label: "New study request", action: "Open study" },
  PAYMENT_UPDATE: { label: "Payment update", action: "View payment" },
  COMMERCIAL_UPDATE: { label: "Price and agreement", action: "Review" },
  ASSIGNMENT: { label: "Statistician assigned", action: "Open study" },
  QA_DECISION: { label: "Quality check", action: "Open study" },
  QA_SUBMISSION: { label: "Ready for quality check", action: "Open study" },
  DELIVERABLE_UPDATE: { label: "Your files are ready", action: "Get files" },
  REVISION_REQUEST: { label: "Changes requested", action: "View changes" },
  PRE_DEADLINE: { label: "Deadline coming up", action: "Open study" },
  ETHICAL_BREACH: { label: "Study on hold", action: "Open study" },
  CLAIM_FILED: { label: "Claim filed", action: "View claim" },
  DISPUTE: { label: "Claim update", action: "View claim" },
  NEW_MESSAGE: { label: "New message", action: "Reply" },
  MESSAGE_ALERT: { label: "New message", action: "Reply" },
  STATUS_UPDATE: { label: "Study update", action: "Open study" },
  INPUT_UPDATE: { label: "Study details updated", action: "Open study" },
  OUTPUT_UPDATE: { label: "Results updated", action: "Open study" },
  SLA_ALERT: { label: "Delivery timer", action: "Open study" },
  DEFENSELAB_UPDATE: { label: "DefenseLab update", action: "Open DefenseLab" },
  PAYROLL_UPDATE: { label: "Payroll update", action: "Open payroll" },
  ATTENDANCE_UPDATE: { label: "Timesheet update", action: "Open timesheet" },
  STUDY_DELETION_REQUESTED: { label: "Deletion requested", action: "Review" },
  SECURITY_ALERT: { label: "Security alert", action: "Review" },
  SYSTEM_ALERT: { label: "From JAXIS", action: "Open" },
};

export function alertMeta(type: string) {
  return (
    ALERT_META[type] ?? {
      label: type ? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, " ") : "Update",
      action: "Open",
    }
  );
}

/** Title + link label. Price and agreement alerts share one type, so the message decides which. */
export function describeAlert(type: string, message: string): { title: string; action: string } {
  const meta = alertMeta(type);
  if (type === "COMMERCIAL_UPDATE") {
    if (/agreement|statement of work|\bSOW\b/i.test(message)) return { title: "Agreement ready to sign", action: "Review & sign" };
    if (/price|quot/i.test(message)) return { title: "Your price is ready", action: "Review price" };
  }
  return { title: meta.label, action: meta.action };
}

export const STUDY_ID = /JAXIS-\d{6}-\d{4}/;

/** "Your price is ready. Review…" under the title "Your price is ready" → "Review…". */
export function dropRepeatedTitle(message: string, title: string): string {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const match = message.match(/^(.+?[.!?])\s+(.+)$/s);
  return match && normalize(match[1]!) === normalize(title) ? match[2]! : message;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The study ID has its own line, so drop it (with a leading "for"/"study") from the sentence. */
export function stripStudyId(message: string, intakeId: string | null): string {
  const ids = [STUDY_ID.source, intakeId ? escapeRegExp(intakeId) : null].filter(Boolean).join("|");
  return message
    .replace(new RegExp(`\\s*\\(?(?:(?:for|of|on|in)\\s+)?(?:study\\s+)?(?:${ids})\\)?`, "gi"), "")
    .replace(/\s+([.,!?)])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function dayGroup(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Earlier";
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : "Earlier";
}

/** "Just now", "12m ago", "2:14 PM" (today/yesterday), "Sep 12" (older). */
export function shortTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (dayGroup(dateStr) !== "Earlier") return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });
}
