export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://jaxis-statlab-app.vercel.app";

export const REGISTER_URL = `${APP_URL}/register`;
export const LOGIN_URL = `${APP_URL}/login`;

// Where every "Send your study" button goes. New visitors need an account first, and the sign-up page has a
// Log in tab for returning students.
export const SEND_STUDY_URL = REGISTER_URL;

export const CONTACT_EMAIL = "consult@jaxis-statlab.com";

// Social pages (both @jaxis.statlab); an environment value overrides them.
export const SOCIAL_HANDLE = "jaxis.statlab";
export const FACEBOOK_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://www.facebook.com/jaxis.statlab";
export const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/jaxis.statlab";

// Optional. Each item only appears on the site once its value is set.
export const MESSENGER_URL = process.env.NEXT_PUBLIC_MESSENGER_URL || "";
export const BUSINESS_REGISTRATION = process.env.NEXT_PUBLIC_BUSINESS_REGISTRATION || "";
export const SAMPLE_OUTPUT_URL = process.env.NEXT_PUBLIC_SAMPLE_OUTPUT_URL || "";
