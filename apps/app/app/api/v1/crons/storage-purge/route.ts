import { NextRequest, NextResponse } from "next/server";
import { db, withDbTimeout } from "@/lib/db";
import { purgeExpiredFilesAction } from "@/features/reporting/actions";

/**
 * Trigger.dev Automated Cron Endpoint
 * Scheduled to run daily at midnight UTC to purge expired study files.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    const expectedSecret = process.env.TRIGGER_API_KEY || process.env.CRON_SECRET;

    if (process.env.NODE_ENV === "production" && !expectedSecret) {
      return NextResponse.json(
        { error: "Cron authorization secret is not configured." },
        { status: 500 }
      );
    }

    // Verify bearer token unless in open development with no secrets defined
    if (expectedSecret && token !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized cron execution." },
        { status: 401 }
      );
    }

    // Check CEO policy toggle: only run if auto-purge is enabled
    const config = await withDbTimeout(
      db.storageRetentionConfig.findUnique({
        where: { id: "default-config" },
      })
    );

    if (config && !config.autoPurgeEnabled) {
      return NextResponse.json({
        success: true,
        message: "Automated storage purge is currently paused in CEO settings.",
        purgedCount: 0,
        purgedFilesCount: 0,
        freedMB: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Execute purge under system authority
    const result = await purgeExpiredFilesAction({
      id: "system-trigger-cron",
      role: "CEO",
      fullName: "Trigger.dev Storage Purge Engine",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "Storage purge failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      purgedCount: result.purgedCount,
      purgedFilesCount: result.purgedFilesCount,
      freedMB: result.freedMB,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal cron execution error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const config = await withDbTimeout(
    db.storageRetentionConfig.findUnique({
      where: { id: "default-config" },
    })
  );

  return NextResponse.json({
    status: "HEALTHY",
    cronId: "storage-purge-engine",
    autoPurgeEnabled: config?.autoPurgeEnabled ?? false,
    retentionDays: config?.retentionPeriodDays ?? 90,
  });
}
