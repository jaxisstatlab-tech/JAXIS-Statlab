import fs from "fs";
import path from "path";

/**
 * Offline dev only (`npm run dev:offline`): clients' Facebook and Instagram, kept in .dev-client-socials.json by
 * email, so the admin's browser sees what the client saved (the offline profile copy lives in the client's own
 * browser cookie). Never used in production.
 */

const FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-client-socials.json");
type Socials = { facebookUrl?: string | null; instagramUrl?: string | null };

export const devSocialsEnabled = () => process.env.NODE_ENV !== "production" && process.env.JAXIS_OFFLINE === "1";

function readAll(): Record<string, Socials> {
  try {
    return fs.existsSync(FILE) ? (JSON.parse(fs.readFileSync(FILE, "utf-8")) as Record<string, Socials>) : {};
  } catch {
    return {};
  }
}

export function devSaveSocials(email: string, socials: Socials) {
  if (!devSocialsEnabled() || !email) return;
  const all = readAll();
  all[email.toLowerCase()] = { ...all[email.toLowerCase()], ...socials };
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2), "utf-8");
}

export function devReadSocials(email: string | null | undefined): Socials | null {
  if (!devSocialsEnabled() || !email) return null;
  return readAll()[email.toLowerCase()] ?? null;
}

/** The client's email for an offline sample study. */
export function devStudyClientEmail(projectId: string): { clientId: string; email: string } | null {
  try {
    const file = path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-projects.json");
    const list = JSON.parse(fs.readFileSync(file, "utf-8")) as Array<{ id: string; intakeId?: string; clientId: string; client?: { email?: string } }>;
    const p = list.find((x) => x.id === projectId || x.intakeId === projectId);
    return p?.client?.email ? { clientId: p.clientId, email: p.client.email } : null;
  } catch {
    return null;
  }
}
