# JAXIS — Module 00: Project Foundation & Infrastructure

**Module Code:** `00-foundation`\
**Domain:** Infrastructure\
**Depends On:** Nothing — this is the root.\
**Blocks:** Every subsequent module.

---

## 1. Module Identity

- **Primary Objective:** Establish the complete monorepo scaffolding, design system tokens, UI primitive library, all infrastructure clients, and environment validation layer. No business feature code. Only the shared foundation that every module builds on.
- **Core Responsibilities:** Turborepo workspace, Tailwind v4 design tokens, `@repo/ui` primitives, Prisma singleton (→ Supabase PostgreSQL), Supabase client (Realtime + Storage), Cloudflare R2 client, Resend email client, Trigger.dev job registration, Zod env schema, base layout shell.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `F00-01` | Turborepo workspace configuration with `apps/app`, `apps/web`, `packages/ui`, `packages/typescript-config`, `packages/eslint-config` |
| `F00-02` | Tailwind CSS v4 installed in `apps/app`; `globals.css` populated with all tokens from `design-system.md` |
| `F00-03` | Inter (sans) + Disket Mono (mono) fonts loaded via `next/font` in root layout |
| `F00-04` | Prisma client singleton at `src/lib/db.ts` — connects to **Supabase PostgreSQL** via `DATABASE_URL` (Supabase connection pooler URL). See [03-data-storage.md](../../info/03-data-storage.md) for full table inventory. |
| `F00-05` | Supabase browser + server clients at `src/lib/supabase.ts` — used for Realtime channels (Module 09) |
| `F00-06` | Cloudflare R2 client at `src/lib/storage.ts` — S3-compatible zero-egress object storage for research datasets, raw files, outputs, deliverables, and payment receipts. See [03-data-storage.md](../../info/03-data-storage.md). |
| `F00-07` | Resend client at `src/lib/email/index.ts` — `sendEmail()` abstraction backed by Resend API |
| `F00-08` | Trigger.dev client at `src/lib/jobs/` — cron job registration (3-day expiry, 90-day purge, SLA alerts) |
| `F00-09` | Zod env schema at `src/lib/env.ts` — all service env vars validated at boot |
| `F00-10` | `.env.example` documenting all required environment variables |
| `F00-11` | Root layout `src/app/layout.tsx` with `<Topbar>` shell + `<Sidebar>` shell (unstyled structural placeholders) |
| `F00-12` | `@repo/ui` package: `Button` (4 variants), `Card`, `StatusBadge`, `FormInput`, `FormSelect`, `FormTextarea`, `Modal`, `Alert`, `Skeleton`, `DataTable`, `PageHeader`, `Badge`, `Toast` |
| `F00-13` | TypeScript 5.9 strict mode configured in all packages |
| `F00-14` | ESLint 9 configured: `no-unused-vars` error, `no-explicit-any` error |
| `F00-15` | `npm run check-types`, `npm run lint`, `npm run build`, `npm run dev` scripts all functional |

### ❌ Explicitly Out of Scope

- Any authentication logic (Module 01)
- Any business feature code
- Prisma schema models (Module 01 adds first models)
- Supabase Realtime subscriptions in feature code (Module 09 wires this)
- File upload API routes (Module 04 and later)

---

## 3. Environment Variables Schema

All service credentials are validated at boot via Zod. The app crashes immediately with a descriptive error if any required var is missing.

const envSchema = z.object({
  // Core
  DATABASE_URL:             z.string().url(),        // Supabase PostgreSQL pooler URL
  NEXTAUTH_SECRET:          z.string().min(32),
  NEXTAUTH_URL:             z.string().url(),
  NODE_ENV:                 z.enum(['development', 'production', 'test']).default('development'),

  // Supabase (Realtime + Storage)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),        // https://<ref>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1), // Public anon key
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),      // Server-only: bypasses RLS

  // Cloudflare R2 (large file storage)
  R2_ACCOUNT_ID:            z.string().min(1),
  R2_ACCESS_KEY_ID:         z.string().min(1),
  R2_SECRET_ACCESS_KEY:     z.string().min(1),
  R2_BUCKET_NAME:           z.string().min(1),
  R2_PUBLIC_URL:            z.string().url(),        // Custom domain or R2.dev URL

  // Resend (transactional email)
  RESEND_API_KEY:           z.string().startsWith('re_'),

  // Trigger.dev (background jobs)
  TRIGGER_API_KEY:          z.string().min(1),
  TRIGGER_API_URL:          z.string().url().default('https://api.trigger.dev'),
});

export const env = envSchema.parse(process.env);
```

### `.env.example`

```bash
# ─── Core ─────────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:[password]@[ref].pooler.supabase.com:6543/postgres?pgbouncer=true"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3001"
NODE_ENV="development"

# ─── Supabase (Realtime + Storage) ────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# ─── Cloudflare R2 ────────────────────────────────────────────────────────────
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="jaxis-files"
R2_PUBLIC_URL="https://files.jaxis.dev"

# ─── Resend ───────────────────────────────────────────────────────────────────
RESEND_API_KEY="re_"

# ─── Trigger.dev ──────────────────────────────────────────────────────────────
TRIGGER_API_KEY=""
TRIGGER_API_URL="https://api.trigger.dev"
```

---

## 4. `@repo/ui` Component Specifications

All components must accept `className` prop for style overrides. Zero business logic — pure presentation.

| Component | Props | Design Token Applied |
|---|---|---|
| `Button` | `variant: primary\|secondary\|ghost\|danger`, `size: sm\|md\|lg`, `disabled`, `loading` | `--accent`, `--bg-surface`, border tokens |
| `Card` | `variant: default\|kpi`, `className` | `--bg-surface`, `--border-default` |
| `StatusBadge` | `status: ProjectStatus` | Status semantic tokens from design system |
| `FormInput` | `label`, `error`, `helper`, `...inputProps` | `--bg-surface`, `--border-focus` |
| `FormSelect` | `label`, `options[]`, `error` | Same as FormInput |
| `FormTextarea` | `label`, `rows`, `error` | Same as FormInput |
| `Modal` | `open`, `onClose`, `title`, `children`, `footer` | `--bg-overlay`, `--bg-surface` |
| `Alert` | `variant: info\|success\|warning\|danger`, `children` | Semantic status tokens |
| `Skeleton` | `className`, `count` | Pulse animation, `--bg-surface` |
| `DataTable` | `columns[]`, `rows[]`, `loading`, `emptyState` | `--border-default`, table shell |
| `PageHeader` | `title`, `breadcrumbs[]`, `actions` | `--text-primary`, `--text-muted` |
| `Badge` | `label`, `variant` | Small inline label |
| `Toast` | `message`, `variant`, `duration` | Slide-in animation, status tokens |

---

## 5. Base Layout Shell

```
/dashboard/layout.tsx
├── <Topbar>  (h-14, bg-base, border-bottom border-white/10)
│   ├── JAXIS logo mark (left)
│   └── User menu stub (right — fullName + logout)
└── <Sidebar> (w-60, bg-base, border-right border-white/10)
    ├── Role label badge (Disket Mono, xs, accent color)
    ├── Nav links (placeholder — populated by each module)
    └── User info card (bottom — avatar initial, fullName, email)
```

---

## 6. Infrastructure Client Stubs

### `src/lib/db.ts` — Prisma → Supabase PostgreSQL

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

### `src/lib/supabase.ts` — Supabase Client (Realtime + Storage)

```ts
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

// Browser client — used in Client Components for Realtime subscriptions
export const supabaseClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Server client — used in Server Components / API Routes for Storage operations
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);
```

### `src/lib/storage.ts` — Unified Storage Abstraction

```ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/lib/env';

// Cloudflare R2 via S3-compatible API — for large files
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function getR2UploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    r2Client,
    new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn: 300 }, // 5 minutes
  );
}

export async function getR2DownloadUrl(key: string): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    { expiresIn: 3600 }, // 1 hour
  );
}
```

### `prisma/schema.prisma` — Initial (Module 00)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")  // Supabase connection pooler URL
  directUrl = env("DIRECT_URL")    // Supabase direct URL for migrations
}
// Models added starting from Module 01
```

> **Note on `directUrl`:** Supabase requires `directUrl` (non-pooler) for `prisma migrate`. Add `DIRECT_URL` to `.env.example` pointing to the Supabase direct connection URL (port 5432, not 6543).

---

## 7. Seed Data Requirements

None for Module 00. Seed script is created (empty) with the `prisma db seed` command wired up:

```json
// package.json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

---

### 🎯 Expected Output (What you should be able to do now)

- [x] **Clean Monorepo Build:** Able to run `npm run build` with 0 errors across `@repo/ui`, `@repo/typescript-config`, `@repo/eslint-config`, `apps/app`, and `apps/web`.
- [x] **Dual Development Servers:** Able to run `npm run dev` and access `apps/app` on `http://localhost:3001` and `apps/web` on `http://localhost:3000`.
- [x] **Design Token System:** Able to verify CSS custom properties (`#010114` master background, color tokens, typography) rendered from `globals.css`.
- [x] **Custom Typography:** Able to verify `Inter` (sans) and `Disket Mono` (mono) fonts loaded via `next/font` without layout shifts.
- [x] **UI Component Library:** Able to render and test all shared primitives from `@repo/ui` (`Button`, `Card`, `StatusBadge`, `FormInput`, `FormSelect`, `FormTextarea`, `Modal`, `Alert`, `Skeleton`, `DataTable`, `PageHeader`, `Badge`, `Toast`).
- [x] **Infrastructure & Environment Validation:** Able to boot application with valid environment schema validation (`env.ts`) and Prisma database singleton connection.


## 8. Acceptance Criteria (Done Checklist)

### Workspace
- [x] `turbo.json` defines `build`, `dev`, `lint`, `check-types` pipelines
- [x] All 5 packages/apps exist and are recognized by Turborepo
- [x] `npm run dev` starts `apps/app` on port 3001

### Design System
- [x] `globals.css` contains all CSS custom properties from `design-system.md` Section 2
- [x] Inter and Disket Mono load correctly (no FOUT in dev)
- [x] Tailwind v4 utility classes resolve in all component files

### `@repo/ui`
- [x] All 13 components render without TypeScript errors
- [x] `Button` — all 4 variants × 3 sizes render correctly
- [x] `StatusBadge` — all 24 status values render with correct colors
- [x] No `any` types in any `@repo/ui` component

### Database (Supabase PostgreSQL + Prisma)
- [x] `DATABASE_URL` is the Supabase **pooler** URL (port 6543)
- [x] `DIRECT_URL` is the Supabase **direct** URL (port 5432) — used for `prisma migrate`
- [x] `npx prisma db push` connects successfully to Supabase
- [x] `src/lib/db.ts` exports a singleton Prisma client
- [x] `src/lib/env.ts` throws on startup if any required env var is missing

### Supabase Client
- [x] `supabaseClient` (browser) initializes without error
- [x] `supabaseAdmin` (server) initializes without error
- [x] Neither client crashes when env vars are present

### Cloudflare R2 Client
- [x] `r2Client` initializes without error
- [x] `getR2UploadUrl()` returns a valid pre-signed URL against the dev bucket
- [x] `getR2DownloadUrl()` returns a valid pre-signed URL

### Email Client
- [x] Resend client initializes with `RESEND_API_KEY`
- [x] `sendEmail()` function accepts template name + recipient without TypeScript errors

### Layout
- [x] Root layout renders without error at `/`
- [x] Dashboard layout shell renders at `/dashboard` (auth checked after Module 01)
- [x] Topbar and Sidebar structurally correct (spacing, colors, font)

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 warnings/errors
- [x] `npm run build` → clean build
