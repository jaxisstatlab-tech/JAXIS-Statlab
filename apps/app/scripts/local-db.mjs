/**
 * Local test database: `npm run dev:localdb` (from apps/app or the repo root).
 *
 * Runs the app on http://localhost:3013 against a PostgreSQL database on this computer, so changes that only
 * show with a real database (saving, permissions, payments) can be checked without touching the live site.
 *
 * - The database lives in apps/app/.local-db (ignored by git) on port 54329. It never connects to the live
 *   database: the address is fixed below, and the schema copy it uses has that address written in.
 * - First run: creates the tables from prisma/schema.prisma and adds test accounts and studies
 *   (scripts/seed-localdb.ts). Later runs keep your data and only add new tables or columns.
 * - `npm run dev:localdb -- --reset` deletes the local data and starts again.
 * - Email, file storage and live updates are switched off (uploading new files won't work here).
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_DIR = path.join(APP_DIR, ".local-db");
const DATA_DIR = path.join(LOCAL_DIR, "data");
const SCHEMA_COPY = path.join(LOCAL_DIR, "schema.prisma");
const DB_PORT = 54329;
const DB_NAME = "jaxis_local";
const DB_URL = `postgresql://jaxis:localtest@127.0.0.1:${DB_PORT}/${DB_NAME}`;
const APP_PORT = 3013;
const reset = process.argv.includes("--reset");

// Same switched-off services as `npm run dev:offline`, but with the local database.
const appEnv = {
  ...process.env,
  DATABASE_URL: DB_URL,
  DIRECT_URL: DB_URL,
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "offline",
  SUPABASE_SERVICE_ROLE_KEY: "offline",
  R2_ACCOUNT_ID: "offline-no-storage",
  R2_ACCESS_KEY_ID: "offline",
  R2_SECRET_ACCESS_KEY: "offline",
  R2_BUCKET_NAME: "offline",
  R2_PUBLIC_URL: "http://127.0.0.1:1",
  RESEND_API_KEY: "re_offline_disabled",
  TRIGGER_API_KEY: "offline",
  TRIGGER_API_URL: "http://127.0.0.1:1",
  JAXIS_OFFLINE: "",
  NEXT_PUBLIC_JAXIS_OFFLINE: "",
  NEXT_DIST_DIR: ".next-localdb",
  NEXTAUTH_URL: `http://localhost:${APP_PORT}`,
  AUTH_URL: `http://localhost:${APP_PORT}`,
  NODE_OPTIONS: "--max-old-space-size=4096",
};

const run = (cmd) => {
  const res = spawnSync(cmd, { cwd: APP_DIR, env: appEnv, stdio: "inherit", shell: true });
  if (res.status !== 0) throw new Error(`Failed: ${cmd}`);
};

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "jaxis",
  password: "localtest",
  port: DB_PORT,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
});

let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  console.log("\nStopping the local database...");
  try {
    await pg.stop();
  } catch {
    // already stopped
  }
  process.exit(code);
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

try {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  if (!fs.existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    console.log("Creating the local database (first run)...");
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    await pg.initialise();
  }
  await pg.start();
  if (reset) {
    console.log("Deleting local data (--reset)...");
    await pg.dropDatabase(DB_NAME).catch(() => {});
  }
  await pg.createDatabase(DB_NAME).catch(() => {}); // already there

  // A copy of the schema with the local address written in, so this can only ever change the local database.
  const schema = fs.readFileSync(path.join(APP_DIR, "prisma", "schema.prisma"), "utf8");
  const local = schema.replace(
    /datasource db \{[\s\S]*?\}/,
    `datasource db {\n  provider = "postgresql"\n  url      = "${DB_URL}"\n}`
  );
  if (!local.includes(`127.0.0.1:${DB_PORT}`)) throw new Error("Couldn't point the schema copy at the local database.");
  fs.writeFileSync(SCHEMA_COPY, local);

  console.log("Updating local tables...");
  run(`npx prisma db push --schema "${SCHEMA_COPY}" --skip-generate --accept-data-loss`);
  run("npx tsx scripts/seed-localdb.ts");

  console.log(`\nLocal database ready. Opening the app on http://localhost:${APP_PORT}`);
  console.log("Test accounts (password LocalTest123!): clienta@local.test, clientb@local.test, admin@local.test,");
  console.log("ceo@local.test, finance@local.test, stat@local.test, qa@local.test\n");

  const app = spawn(`npx next dev --port ${APP_PORT}`, { cwd: APP_DIR, env: appEnv, stdio: "inherit", shell: true });
  app.on("exit", (code) => stop(code ?? 0));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  await stop(1);
}
