import { db } from "@/lib/db";

export async function recordSsrTrace(tag: string, metadata: Record<string, unknown> = {}) {
  try {
    await db.authAuditLog.create({
      data: {
        email: `ssr:${tag}`,
        event: "LOGIN_SUCCESS",
        metadata: {
          tag,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      },
    });
  } catch (err) {
    console.error(`[SSR Trace Failed for ${tag}]:`, err);
  }
}
