# JAXIS StatLab — Engineering, Security, Scalability & Reliability Standards

This document establishes the mandatory engineering standards and pre-implementation checklist for all developers and AI coding assistants working on **JAXIS StatLab**.

Before shipping any new feature, updating existing modules, or refactoring code, you must evaluate your implementation against these core foundational pillars.

---

## 📊 1. Database & Scalability

> *A slow database can destroy even the best application.*

### Core Evaluation Checklist:
- **Can your database handle 10,000 users instead of 10?**
- **Are your queries optimized?**
- **Have you added proper indexes?**
- **What happens when your data grows from hundreds to millions of records?**

### JAXIS StatLab Implementation Standards:
1. **Indexing Strategy**:
   - Every foreign key (`studyId`, `userId`, `projectId`, `intakeId`, `shiftId`) must have a corresponding index in the Prisma schema (`@@index([field])`).
   - High-cardinality search/filter columns (e.g., status, created_at, role) must be indexed to prevent full table scans.
2. **Eliminate N+1 Queries**:
   - Always use Prisma `include` or batch queries (`in: [...]`) instead of looping over records to make individual database calls.
3. **Strict Column Selection**:
   - Avoid indiscriminate `findMany()` calls that retrieve entire rows. Use Prisma `select` to fetch only the fields required by the view.
4. **Pagination by Default**:
   - Never load unbounded datasets. Tables and feeds (payslips, attendance records, study ledgers, logs) must support cursor-based or limit-offset pagination (`take: 50, skip: ...`).
5. **Connection Pooling**:
   - All serverless database queries must connect via Supabase Transaction Pooler (PgBouncer port 6543) using `DIRECT_URL` strictly for schema migrations.

---

## 🔒 2. Security

> *If your app is public, someone will eventually test its weaknesses.*

### Core Evaluation Checklist:
- **Are passwords stored securely?**
- **Are API keys protected?**
- **Is user input validated?**
- **Do you have rate limiting to prevent abuse?**
- **Can bots, scrapers, or attackers exploit your endpoints?**

### JAXIS StatLab Implementation Standards:
1. **Zero Secret Leakage**:
   - Never expose API keys, database credentials, or secret keys in client-side bundles. Prefix only public values with `NEXT_PUBLIC_`.
2. **Server-Side Input Validation**:
   - Client-side validation is for UX only. Every Server Action and API route (`/api/...`) **MUST** parse and validate input using strict Zod schemas (`safeParse`).
3. **Role-Based Access Control (RBAC)**:
   - Every server mutation must verify session identity and enforce role boundaries via `assertRole` or `requireSession`. Never trust client-supplied user IDs or role claims.
4. **Credential & Sensitive Data Protection**:
   - Passwords must be hashed using strong cryptographic algorithms (Argon2id or bcrypt with appropriate work factor). Sensitive payout tokens and bank details must be encrypted.
5. **Rate Limiting & Abuse Prevention**:
   - Public-facing endpoints (login, registration, lead intake, file upload endpoints) must enforce rate limiting (IP-based and account-based) to thwart brute-force and scraping attempts.
6. **Communication Firewall**:
   - In-app chat must pass through the communication firewall to detect and flag off-platform contact evasion (phone numbers, personal emails, external links).

---

## ⚡ 3. Performance

> *Users rarely remember a beautiful UI, but they always remember a slow application.*

### Core Evaluation Checklist:
- **Are pages loading quickly?**
- **Are APIs optimized?**
- **Are you caching frequently accessed data?**
- **What happens during traffic spikes?**

### JAXIS StatLab Implementation Standards:
1. **Server Component Pre-loading (RSC)**:
   - Primary operational desks must prefetch data on the server in async Server Components (`page.tsx`) and pass `initialData` into client components. This eliminates client-side spinner flashes and layout shifts.
2. **In-Memory Server Caching (`unstable_cache`)**:
   - Read-heavy data (package rates, staff directories, attendance summaries, company signatories) must be cached with canonical tags (`CACHE_TAGS`).
3. **Instant Tag-Based Invalidation (`invalidateCacheTags`)**:
   - Any mutating Server Action must immediately invalidate its corresponding cache tag using Next.js `updateTag` / `revalidateTag` so data is fresh without waiting for TTL expiry.
4. **Optimistic 0ms UI Transitions**:
   - Interactive actions (clock-in, status changes, badge updates) must update the UI immediately (0ms) and reconcile in the background.
5. **Single-Track Arc Loading & Anti-Double-Loading**:
   - Always use `<LoadingState variant="..." />`. Never show secondary card spinners or skeletons while a page-level loader is running.

---

## 📈 4. Monitoring & Logs

> *One of the biggest mistakes developers make is launching without visibility. If you can’t see problems, you can’t fix them.*

### Core Evaluation Checklist:
- **Do you have logs?**
- **Error tracking?**
- **Performance monitoring?**
- **Alerts when something breaks?**

### JAXIS StatLab Implementation Standards:
1. **Structured Server Logging**:
   - Server Actions and API endpoints must log actionable errors with context (timestamp, userId, operation, error stack) rather than silent empty `catch` blocks.
2. **Audit Trails & Ledgers**:
   - Critical business mutations (payment verification, escrow disbursement, dispute creation, shift corrections, role pay adjustments) must record immutable rows in system activity audit ledgers.
3. **Notification Delivery Logs**:
   - Transactional emails and in-app alerts must maintain delivery audit records with retry attempt tracking (Module 16).
4. **Client Error Boundaries**:
   - Wrap critical dashboard desks in React Error Boundaries (`error.tsx`) to prevent a single component crash from breaking the entire application shell.

---

## 💾 5. Reliability & Recovery

> *Failures are inevitable in distributed software. Resilient architectures guarantee business continuity.*

### Core Evaluation Checklist:
- **What happens if your database crashes?**
- **Do you have backups?**
- **Can you recover lost data?**
- **Can you roll back a bad deployment?**

### JAXIS StatLab Implementation Standards:
1. **Automated Backups & Point-in-Time Recovery**:
   - Supabase PostgreSQL automated daily snapshots and Point-in-Time Recovery (PITR) must be enabled for production databases.
2. **Object Storage Redundancy**:
   - Research datasets, deliverables, and SOW contracts in Cloudflare R2 must leverage object versioning to protect against accidental deletion or corruption.
3. **Atomic Database Transactions**:
   - Multi-step state transitions (e.g. approving a payment + releasing deliverables + crediting ledger) must be wrapped in Prisma `$transaction` blocks. If any step fails, the entire operation rolls back.
4. **Instant Deployment Rollbacks**:
   - All deployments to Vercel/production must support 1-click instantaneous rollback to the previous stable build.
5. **Idempotent Mutations**:
   - Critical operations (such as batch payslip generation or payout disbursements) must be idempotent so that retries do not create duplicate payments or duplicate ledger entries.

---

## ⚖️ 6. Data Integrity & Concurrency Control

> *Race conditions turn subtle timing bugs into irreversible financial and legal disputes.*

### Core Evaluation Checklist:
- **What happens if two users click "Approve" or "Disburse" at the exact same millisecond?**
- **Can two statisticians be accidentally assigned to the same research study?**
- **Are your state transitions atomic and guarded against double-submissions?**
- **Could network retries trigger duplicate payouts or duplicate ledger deductions?**

### JAXIS StatLab Implementation Standards:
1. **Conditional State Transitions (Optimistic Locking)**:
   - When updating a status (e.g. approving a payment proof, closing an intake, signing an SOW), always filter by the expected prerequisite status:
     ```ts
     await prisma.payment.updateMany({
       where: { id: paymentId, status: "PENDING_VERIFICATION" },
       data: { status: "VERIFIED", verifiedAt: new Date() }
     });
     ```
   - If `count === 0`, throw a clean conflict error (`"This payment has already been processed or modified."`).
2. **Client-Side Debounce & Optimistic Disabling**:
   - Submit buttons, payout approvals, and clock-in triggers must instantly disable and display `<IconLoader2 className="animate-spin" />` to physically prevent multi-click races.
3. **Database Unique Constraints**:
   - Enforce compound unique indexes (e.g., `@@unique([studyId, version])` or `@@unique([specialistId, payPeriodId])`) so the database rejects duplicate records at the storage engine level.
4. **Idempotency Keys for Financial & Payout Actions**:
   - Any financial mutation that writes to `financial_ledgers` or `payouts` must generate or pass a unique operation key (`refNumber` or hash) to guarantee that re-running the action does not double-charge or double-credit.

---

## 🧪 7. Testing & Quality Assurance

> *Untested code is broken code that simply hasn't run into its edge case yet.*

### Core Evaluation Checklist:
- **Can you deploy to production on a Friday without anxiety?**
- **Do you know with certainty if your changes broke another role's workflow?**
- **Are edge cases (leap years, 15-day payroll cut-offs, zero-division in commissions, timezone shifts) covered?**
- **Does your code pass type-checking and linting with zero warnings?**

### JAXIS StatLab Implementation Standards:
1. **Monorepo Type Integrity**:
   - Always run `npm run check-types` (`turbo run check-types`). Must exit with code `0` across all packages (`@repo/ui`, `web`, `app`) before any merge.
2. **Strict Lint Enforcement**:
   - Zero ESLint warnings or errors (`npx eslint ... --max-warnings 0`) on modified files.
3. **Unit Testing for Financial & Mathematical Logic**:
   - Any logic involving money, split percentages, tax deductions, attendance duty hours, or SLA turnaround countdowns must have isolated unit tests verifying edge cases.
4. **Role Workflow Verification**:
   - Every module maintains a companion verification record in `docs/modules/verifications/` documenting step-by-step validation of role boundaries and UI states.

---

## 💸 8. Resource & Cost Optimization (FinOps)

> *Unmonitored cloud architecture will silently inflate infrastructure bills.*

### Core Evaluation Checklist:
- **Will your cloud bill spike when 500 students upload 15MB thesis datasets simultaneously?**
- **Are you accidentally streaming heavy file binaries through expensive serverless function memory?**
- **Do you retain abandoned or temporary files forever?**
- **Are your transactional emails throttled against billing runaways?**

### JAXIS StatLab Implementation Standards:
1. **Zero-Egress Object Storage**:
   - Leverage Cloudflare R2's zero-egress pricing model for all research datasets, final deliverables, SOW contract PDFs, and defense recordings.
2. **Bypass Serverless Function Payload Limits**:
   - File uploads must never exceed Next.js / Vercel 4.5MB serverless body limits. Use Cloudflare R2 direct pre-signed URLs or dedicated lightweight streaming endpoints with a strict 15MB ceiling.
3. **Automated Storage Purge Policies**:
   - Automated 90-day post-archive retention purge (Module 17) must clean up intermediate draft files while preserving permanent audit records and signed SOW contracts.
4. **Email Delivery Throttling**:
   - Bulk or automated notifications (Module 16) must incorporate rate limiting and exponential backoff retry guards to prevent Resend API quota exhaustion.

---

## 🧩 9. Defensive Data Contracts & Backwards Compatibility

> *Frontend blank screens almost always stem from unexpected nulls or breaking schema changes.*

### Core Evaluation Checklist:
- **What happens if a stored JSON record or legacy database row lacks a newly introduced property?**
- **Does your UI crash with an unhandled exception if an API returns `null`, `undefined`, or an empty array?**
- **Are stored JSON structures versioned so historical projects remain readable?**

### JAXIS StatLab Implementation Standards:
1. **Defensive UI Rendering**:
   - Never assume nested server data exists. Always provide safe fallbacks:
     ```tsx
     // Safe fallback pattern
     const clientName = study?.client?.fullName ?? "Unassigned Client";
     const totalAmount = study?.quotation?.totalAmount ?? 0;
     const deliverables = study?.deliverables ?? [];
     ```
2. **Non-Breaking Schema Evolutions**:
   - When adding new keys to stored JSON configurations (e.g., `payroll_configs.json`, `package_rates.json`, `sowTermsJson`), always assign default values in Zod schemas using `.optional().default(...)`.
3. **Zero Breaking Database Column Deletions**:
   - When modifying Prisma schema columns, use deprecation staging rather than immediate destructive column drops on active production databases.

---

*Back to [Master Documentation Index](../README.md) · [System Architecture](./02-architecture.md) · [Data Storage Reference](./03-data-storage.md)*
