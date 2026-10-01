import { db, withDbTimeout } from "@/lib/db";
import { extractR2StorageKey } from "@/lib/storage";

/**
 * Checks file paths a client sends with a study or a payment before they are saved.
 *
 * A saved path decides who may open that file (see /api/files/preview), so a client must not be able to attach
 * a path they didn't upload. Each path has to be one of the app's own upload locations for that kind of file,
 * and must not already be on file for another person.
 */

export type UploadKind = "study" | "receipt";

// The keys generateR2StorageKey() makes for client uploads (studies/{id}/raw/... and treasury/payments/{id}/...).
// Deliverables, analysis files, and the payment QR codes (SYSTEM_CONFIG) are never valid here.
const UPLOAD_KEY_PATTERNS: Record<UploadKind, RegExp> = {
  study: /^studies\/[A-Za-z0-9_-]+\/raw\/\d+-[A-Za-z0-9._-]+$/,
  receipt: /^treasury\/payments\/(?!SYSTEM_CONFIG\/)[A-Za-z0-9_-]+\/\d+-[A-Za-z0-9._-]+$/,
};

const isLocalDev = () => process.env.NODE_ENV !== "production";
const isOfflineDev = () => isLocalDev() && process.env.JAXIS_OFFLINE === "1";

function isOwnStorageHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    const configured = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : null;
    return host === configured || host.endsWith(".r2.dev");
  } catch {
    return false;
  }
}

export async function checkUploadedFilePaths(
  paths: string[],
  ownerId: string,
  kind: UploadKind
): Promise<{ ok: true } | { ok: false; message: string }> {
  const rejected = {
    ok: false as const,
    message: "One of your files couldn't be attached. Please upload it again and resend.",
  };

  for (const raw of paths) {
    if (!raw) return rejected;
    // Local development stores files without the bucket (offline sink, or no storage configured).
    if (isLocalDev() && /^(offline\/|intake-uploads\/|blob:)/.test(raw)) continue;
    if (/^https?:\/\//i.test(raw) && !isOwnStorageHost(raw)) return rejected;

    const key = extractR2StorageKey(raw);
    if (!UPLOAD_KEY_PATTERNS[kind].test(key)) return rejected;

    // Offline dev has no database to check against.
    if (isOfflineDev()) continue;

    const samePath = { OR: [{ filePath: key }, { filePath: { endsWith: `/${key}` } }] };
    try {
      const [studyFile, proof] = await withDbTimeout(
        Promise.all([
          db.projectFile.findFirst({
            where: { ...samePath, project: { clientId: { not: ownerId } } },
            select: { id: true },
          }),
          db.paymentProof.findFirst({
            where: { ...samePath, payment: { project: { clientId: { not: ownerId } } } },
            select: { id: true },
          }),
        ])
      );
      if (studyFile || proof) return rejected;
    } catch {
      return { ok: false, message: "We couldn't check your files just now. Please try again in a moment." };
    }
  }

  return { ok: true };
}
