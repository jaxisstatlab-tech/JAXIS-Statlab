// Deleting an account keeps its history (studies, payments, payslips, messages) but frees the email so it
// can be added again, and blocks sign-in at once. The row stays because many records point to it, and the
// session check needs it to end open sessions. Removed accounts get an address on this reserved domain.
export const REMOVED_EMAIL_DOMAIN = "removed.jaxis.invalid";

export function removedEmailFor(userId: string): string {
  return `removed-${userId.toLowerCase()}@${REMOVED_EMAIL_DOMAIN}`;
}

export function isRemovedAccountEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${REMOVED_EMAIL_DOMAIN}`));
}
