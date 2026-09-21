import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { db } from "../src/lib/db";

async function checkRecentAuditLogs() {
  console.log("=== Checking Recent Auth Audit Logs ===");
  try {
    const logs = await db.authAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    console.log(`Found ${logs.length} recent audit logs:`);
    for (const log of logs) {
      console.log(`- [${log.createdAt.toISOString()}] Event: ${log.event}, Email: ${log.email}, Metadata:`, log.metadata);
    }
  } catch (err) {
    console.error("DB error:", err);
  } finally {
    await db.$disconnect();
  }
}

checkRecentAuditLogs();
