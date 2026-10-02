import fs from "fs";
import path from "path";
import { isOfflineDev } from "@/lib/app-settings";

// Offline development has no file storage, so uploads are kept in a local folder (git-ignored) under the same
// key they'd have in storage. That way uploaded files, like payment QR codes, can be seen while testing offline.
// Never used outside `npm run dev:offline`.

const ROOT = path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-uploads");
const ALLOWED_PREFIXES = ["studies/", "deliverables/", "treasury/", "disputes/", "sows/", "uploads/", "intake-uploads/"];

/** The local file for a storage key, or null when the key isn't one we'd store (or offline mode is off). */
export function devUploadPath(storageKey: string): string | null {
  if (!isOfflineDev()) return null;
  const key = storageKey.replace(/^\/+/, "");
  if (key.includes("..") || key.includes("\\") || !ALLOWED_PREFIXES.some((p) => key.startsWith(p))) return null;
  const full = path.join(ROOT, key);
  return full.startsWith(ROOT + path.sep) ? full : null;
}

export function saveDevUpload(storageKey: string, data: Buffer): boolean {
  const file = devUploadPath(storageKey);
  if (!file) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  return true;
}

export function readDevUpload(storageKey: string): Buffer | null {
  const file = devUploadPath(storageKey);
  if (!file || !fs.existsSync(file)) return null;
  return fs.readFileSync(file);
}
