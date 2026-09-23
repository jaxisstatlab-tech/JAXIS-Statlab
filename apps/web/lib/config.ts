/**
 * Application environment configuration & URLs
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://jaxis-statlab-app.vercel.app";

export const REGISTER_URL = `${APP_URL}/register`;
export const LOGIN_URL = `${APP_URL}/login`;
