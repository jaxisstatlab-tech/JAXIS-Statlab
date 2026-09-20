/**
 * Application environment configuration & URLs
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.jaxis-statlab.com";

export const REGISTER_URL = `${APP_URL}/register`;
export const LOGIN_URL = `${APP_URL}/login`;
