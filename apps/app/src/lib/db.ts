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
  return Promise.race([promise, timeoutPromise])
    .catch((err: unknown) => {
      // Many actions return err.message to the UI. Connection failures carry Prisma internals
      // (compiled file paths, host names), so replace them with a plain message. Query errors
      // (unique constraints etc.) pass through untouched so callers can still inspect err.code.
      if (isDbConnectionError(err)) throw new DatabaseUnavailableError(err);
      throw err;
    })
    .finally(() => {
      if (timer) clearTimeout(timer);
    });
}

export class DatabaseUnavailableError extends Error {
  constructor(cause: unknown) {
    super("We couldn't load this right now. Please try again in a moment.", { cause });
    this.name = "DatabaseUnavailableError";
  }
}

const CONNECTION_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

// Offline dev mode (`npm run dev:offline` sets JAXIS_OFFLINE=1): the database is unreachable on purpose,
// and the many fallbacks that log that failure with console.error would flood the Next.js dev overlay.
// Turn those into one-line warnings. Normal dev and production logging are unchanged.
if (process.env.JAXIS_OFFLINE === "1" && process.env.NODE_ENV !== "production") {
  const g = globalThis as { __jaxisOfflineConsole?: boolean };
  if (!g.__jaxisOfflineConsole) {
    g.__jaxisOfflineConsole = true;
    // Match by name: Next loads this module more than once (server/SSR layers), so instanceof can miss.
    const isOfflineError = (value: unknown) =>
      (value instanceof Error && value.name === "DatabaseUnavailableError") || isDbConnectionError(value);
    const quiet =
      (fallback: (...args: unknown[]) => void) =>
      (...args: unknown[]) => {
        if (!args.some(isOfflineError)) return fallback(...args);
        const label = typeof args[0] === "string" ? args[0].replace(/[:\s]+$/, "") : "Database call";
        originalWarn(`[offline] ${label}: database unreachable, using local data`);
      };
    const originalWarn = console.warn.bind(console);
    console.error = quiet(console.error.bind(console));
    console.warn = quiet(originalWarn);
  }
}

function isDbConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as { errorCode?: string; code?: string }).errorCode ?? (err as { code?: string }).code;
  return (
    err.message === "DB_TIMEOUT" ||
    err.name === "PrismaClientInitializationError" ||
    err.name === "PrismaClientRustPanicError" ||
    (typeof code === "string" && CONNECTION_ERROR_CODES.has(code))
  );
}
