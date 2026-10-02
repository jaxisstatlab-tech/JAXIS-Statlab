import { Prisma } from "@prisma/client";
import { getDb, withDbTimeout } from "@/lib/db";

/**
 * Settings edited in the app (price catalog, payment channels), stored in the `app_settings` table.
 * They used to be saved to files, which can't change on the server, so edits on the live site were lost.
 * Offline development (npm run dev:offline) has no database and keeps using the files.
 */
export const isOfflineDev = () => process.env.NODE_ENV !== "production" && process.env.JAXIS_OFFLINE === "1";

export const SETTING_KEYS = {
  commercialCatalog: "commercial_catalog",
  paymentChannels: "payment_channels",
} as const;

/** The saved value, or null when nothing has been saved yet (callers then use their built-in defaults). */
export async function getAppSetting<T>(key: string): Promise<T | null> {
  if (isOfflineDev()) return null;
  const row = await withDbTimeout(getDb().appSetting.findUnique({ where: { key } }), 5000);
  return row ? (row.value as T) : null;
}

/** Saves a setting. Throws if it can't be saved, so the page never says "saved" when it wasn't. */
export async function setAppSetting(key: string, value: unknown, updatedBy: string): Promise<void> {
  const json = value as Prisma.InputJsonValue;
  await withDbTimeout(
    getDb().appSetting.upsert({
      where: { key },
      create: { key, value: json, updatedBy },
      update: { value: json, updatedBy },
    }),
    10000
  );
}
