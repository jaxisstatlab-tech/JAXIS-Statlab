// Google sign-in (OAuth redirect) and password-reset emails (Resend sender) both depend on the
// jaxis-statlab.com domain. While it is locked, both show as "Soon" and stay switched off.
// Flip this to true once the domain is live and verified.
export const AUTH_DOMAIN_READY = false;

export const GOOGLE_SIGN_IN_AVAILABLE = AUTH_DOMAIN_READY;
export const PASSWORD_RESET_EMAIL_AVAILABLE = AUTH_DOMAIN_READY;
