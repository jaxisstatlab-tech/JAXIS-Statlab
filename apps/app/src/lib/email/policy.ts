import type { EmailTemplateName } from "./types";

/**
 * Which emails go out, and how many. Resend's free plan allows 100 emails a day and 3,000 a month, so email is
 * kept for moments when someone has to act; everything else stays in the in-app bell.
 *
 * About 6 emails per study: team inbox (new study, price accepted) + client (price ready, agreement ready,
 * files ready) + sometimes (more info needed, receipt not accepted). See docs/modules/specs/22-email.md.
 */
export const EMAIL_POLICY = {
  /** Always sent, even near the limit, so nobody gets locked out of their account. */
  critical: ["PasswordReset"] as EmailTemplateName[],
  /** Sent to the team inbox. */
  team: ["NewIntake", "QuoteAccepted", "ClaimFiled"] as EmailTemplateName[],
  /** Sent to the client. */
  client: ["QuoteReady", "InfoRequested", "SOWReady", "PaymentRejected", "ProjectDelivered"] as EmailTemplateName[],
  /** Above these (rolling 24 hours / 30 days), everything but `critical` is held back. Leaves room under 100/3,000. */
  dailyLimit: 90,
  monthlyLimit: 2850,
} as const;

export function isEmailAllowed(template: EmailTemplateName): boolean {
  return (
    EMAIL_POLICY.critical.includes(template) ||
    EMAIL_POLICY.team.includes(template) ||
    EMAIL_POLICY.client.includes(template)
  );
}

export const isCriticalEmail = (template: EmailTemplateName) => EMAIL_POLICY.critical.includes(template);

/** One shared inbox for staff alerts (one email instead of one per admin). Same inbox as the website contact form. */
export function teamInbox(): string {
  return process.env.TEAM_INBOX_EMAIL?.trim() || "jaxis.statlab@gmail.com";
}
