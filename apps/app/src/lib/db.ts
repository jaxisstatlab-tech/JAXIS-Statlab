/**
 * ============================================================================
 * 🔒 PRODUCTION DATABASE INTEGRITY & SAFETY GUARDRAILS (CRITICAL)
 * ============================================================================
 * THIS FILE INITIALIZES THE CORE PRISMA CLIENT CONNECTED TO THE PRODUCTION DATABASE.
 * 
 * STRICT RULES FOR ALL AI AGENTS & DEVELOPERS:
 * 1. ZERO UNCONTROLLED MUTATIONS:
 *    - Never execute bulk delete, truncate, drop table, or forced schema resets
 *      against the production database (PostgreSQL / Supabase).
 *    - Schema updates must ONLY be applied via tested, reversible Prisma migrations.
 *      NEVER run `prisma db push --force-reset` on environments with live data.
 * 2. SEPARATION OF MOCK FALLBACKS:
 *    - Dev-only JSON files (.dev-*.json, dev_data/*) exist exclusively for offline
 *      local development. They must NEVER overwrite, delete, or desync production
 *      database records.
 * 3. TRANSACTION INTEGRITY:
 *    - Multi-entity writes (financial payments, status transitions, study allocations)
 *      MUST be wrapped in atomic `db.$transaction()` blocks to prevent partial states.
 * 4. CREDENTIAL CONFIDENTIALITY:
 *    - DATABASE_URL and DIRECT_URL are server-only secrets. Under no circumstances
 *      should connection strings or query raw outputs be logged or exposed to clients.
 * ============================================================================
 */

import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  let ClientConstructor = PrismaClient;
  try {
    if (typeof require !== "undefined") {
      const dynamicModule = require("@prisma/client");
      if (dynamicModule?.PrismaClient) {
        ClientConstructor = dynamicModule.PrismaClient;
      }
    }
  } catch {
    // fallback
  }

  return new ClientConstructor({
    log:
      env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export function getDb(): PrismaClient {
  if (env.NODE_ENV !== "production") {
    if (
      !globalForPrisma.prisma ||
      !(globalForPrisma.prisma as any).defenseLabSession ||
      !(globalForPrisma.prisma as any).payout ||
      !(globalForPrisma.prisma as any).financialLedger ||
      !(globalForPrisma.prisma as any).dispute ||
      !(globalForPrisma.prisma as any).notificationLog ||
      !(globalForPrisma.prisma as any).inAppAlert ||
      !(globalForPrisma.prisma as any).archivedProject ||
      !(globalForPrisma.prisma as any).auditLog ||
      !(globalForPrisma.prisma as any).dataDeletionRequest ||
      !(globalForPrisma.prisma as any).storageRetentionConfig
    ) {
      globalForPrisma.prisma = createPrismaClient();
    }
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    const val = (client as any)[prop];
    if (typeof val === "function") {
      return val.bind(client);
    }
    return val;
  },
});

/**
 * Wraps a Prisma query with a fast timeout in development.
 * Prevents Windows TCP socket hangs and speeds up fallback when PostgreSQL is slow/offline.
 */
export async function withDbTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = env.NODE_ENV === "development" ? 15000 : 10000
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("DB_TIMEOUT")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
