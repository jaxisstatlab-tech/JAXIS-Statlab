import { cache } from "react";
import { getClientProfile } from "./actions";

/**
 * The signed-in client's profile, read once per request. The dashboard layout and the page both
 * need it on a full page load; with this they share one lookup instead of repeating it.
 */
export const getClientProfileOnce = cache(() => getClientProfile());
