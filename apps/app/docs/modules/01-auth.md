# JAXIS — Module 01: Authentication & RBAC

**Module Code:** `01-auth`\
**Domain:** Identity\
**Stack:** Next.js 16 App Router · NextAuth.js v5 · Prisma ORM · PostgreSQL · Zod · bcryptjs\
**Depends On:** `00-foundation` (Prisma client, Tailwind, base layout, env schema)\
**Blocks:** All subsequent modules — no module can run without an authenticated session.

---

## 1. Module Identity

- **Module Name:** Authentication & Role-Based Access Control
- **Primary Objective:** Provide secure multi-role authentication so that all 6 JAXIS roles (Client, Statistician, Senior QA Lead, Admin/Manager, Finance Officer, CEO/Owner) can register or be provisioned, authenticate, and have their session and route access enforced before any application feature is accessed.
- **Core Responsibilities:** User identity lifecycle, credential management, session issuance, role assignment, route protection middleware, and the `requireRole()` enforcement utility consumed by every subsequent module.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature | Notes |
|---|---|---|
| `AUTH-F01` | **Client Self-Registration** | Public `/register` page. Clients create their own account with email + password. |
| `AUTH-F02` | **Email + Password Login (All Roles)** | Single `/login` page handles all 6 roles via credentials provider. |
| `AUTH-F03` | **Session Issuance (JWT)** | NextAuth.js v5 JWT session containing `userId`, `role`, `fullName`. |
| `AUTH-F04` | **Route Protection Middleware** | `src/middleware.ts` protects all `/dashboard/*` routes. Unauthenticated → `/login`. |
| `AUTH-F05` | **Role-Scoped Dashboard Redirect** | Post-login redirect sends each role to their specific desk URL. |
| `AUTH-F06` | **`requireRole()` Server-Side Guard** | Typed utility called at the top of every Server Action and API route. Returns 403 on mismatch. |
| `AUTH-F07` | **RBAC Route Enforcement** | Cross-role URL access (e.g., Statistician hitting `/dashboard/admin/`) redirects to `/unauthorized`. |
| `AUTH-F08` | **Admin-Provisioned Staff Accounts** | Admin creates accounts for Statistician, QA Lead, Finance Officer, CEO roles via seed + admin panel stub. |
| `AUTH-F09` | **Password Hashing** | `bcryptjs` with salt rounds = 12 on all password storage. |
| `AUTH-F10` | **Logout** | Session destruction. Redirect to `/login`. |
| `AUTH-F11` | **Database Seed** | Operations Manager + one user per role seeded via `prisma db seed` for development. |
| `AUTH-F12` | **Audit Log (Auth Events)** | Login success, login failure, logout, and registration events written to `AuthAuditLog`. |
| `AUTH-F13` | **Account Status Gate** | `SUSPENDED` or `TERMINATED` accounts cannot log in. Returns descriptive error. |
| `AUTH-F14` | **Token Refresh / Session Extension** | JWT auto-rotated on each request within the active session window. |
| `AUTH-F15` | **Self-Service Password Recovery** | Public `/forgot-password` and `/reset-password` flows with cryptographically secure single-use tokens, 60-min TTL, Resend email dispatch, sandbox testing auto-detection, and direct bypass. |



---

## 3. Database Schema

### 3.1 Prisma Models

```prisma
// prisma/schema.prisma

enum UserStatus {
  ACTIVE
  SUSPENDED
  TERMINATED
}

enum RoleName {
  CLIENT
  STATISTICIAN
  SENIOR_QA_LEAD
  ADMIN
  FINANCE_OFFICER
  CEO
}

model User {
  id            String     @id @default(cuid())
  email         String     @unique
  passwordHash  String
  fullName      String
  phone         String?
  status        UserStatus @default(ACTIVE)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  // Relations
  userRoles     UserRole[]
  authAuditLogs AuthAuditLog[]
  clientProfile ClientProfile?   // Module 02

  @@index([email])
  @@index([status])
  @@map("users")
}

model Role {
  id        Int      @id @default(autoincrement())
  name      RoleName @unique
  label     String                    // Human-readable: "Senior QA Lead"
  createdAt DateTime @default(now())

  userRoles UserRole[]

  @@map("roles")
}

model UserRole {
  userId    String
  roleId    Int
  assignedAt DateTime @default(now())
  assignedBy String?  // userId of Admin who assigned (null for self-registration)

  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id])

  @@id([userId, roleId])
  @@index([userId])
  @@index([roleId])
  @@map("user_roles")
}

model AuthAuditLog {
  id         String   @id @default(cuid())
  userId     String?  // null on failed login (unknown email)
  email      String   // always recorded
  event      AuthEvent
  ipAddress  String?
  userAgent  String?
  metadata   Json?    // extra context (failure reason, etc.)
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([email])
  @@index([event])
  @@index([createdAt])
  @@map("auth_audit_logs")
}

model PasswordResetToken {
  id        String    @id @default(cuid())
  email     String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([email])
  @@index([tokenHash])
  @@map("password_reset_tokens")
}

enum AuthEvent {
  LOGIN_SUCCESS
  LOGIN_FAILED
  LOGOUT
  REGISTRATION
  ACCOUNT_SUSPENDED_BLOCK
  ACCOUNT_TERMINATED_BLOCK
}
```

### 3.2 Relationships & Indexes Summary

| Relationship | Type | Cardinality |
|---|---|---|
| `User` → `UserRole` | One-to-Many | One user can have one role (MVP: single role per user enforced in app layer) |
| `Role` → `UserRole` | One-to-Many | One role can be assigned to many users |
| `User` → `AuthAuditLog` | One-to-Many | All auth events tracked per user |
| `User` → `ClientProfile` | One-to-One | Created in Module 02, FK exists here |

> **Note:** The schema supports multi-role per user at the DB level (`UserRole` junction), but the application layer enforces single-role in MVP. This allows future role expansion without a migration.

### 3.3 Index Rationale

- `users.email` — Login lookup (most frequent query in auth flow)
- `users.status` — Account status gate checked on every login
- `user_roles.userId` + `user_roles.roleId` — Session role resolution
- `auth_audit_logs.email` + `createdAt` — Security audit queries and login failure detection

---

## 4. API Routes & Server Actions

### 4.1 API Routes (`/api/v1/auth/`)

| Method | Route | Auth Required | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | No | — | Client self-registration |
| `POST` | `/api/v1/auth/[...nextauth]` | No | — | NextAuth.js handler (login, session, logout) |
| `GET` | `/api/v1/auth/session` | Yes | Any | Returns current session (role, userId, fullName) |

### 4.2 Server Actions (`src/features/auth/actions.ts`)

| Action | Description | Role Guard |
|---|---|---|
| `registerClient(data)` | Validates input, hashes password, creates User + assigns CLIENT role | Public |
| `getCurrentSession()` | Returns typed session or throws UNAUTHENTICATED | Any authenticated |

### 4.3 Zod Schemas (`src/features/auth/schemas.ts`)

```ts
export const RegisterSchema = z.object({
  fullName:        z.string().min(2).max(100),
  email:           z.string().email(),
  password:        z.string().min(8).max(72),     // bcrypt max 72 chars
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});
```

### 4.4 `requireRole()` Utility (`src/lib/auth.ts`)

```ts
export type Role = 'CLIENT' | 'STATISTICIAN' | 'SENIOR_QA_LEAD' | 'ADMIN' | 'FINANCE_OFFICER' | 'CEO';

export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('UNAUTHENTICATED');
  }
  if (!roles.includes(session.user.role as Role)) {
    throw new Error('FORBIDDEN');
  }
  return session;
}
```

---

## 5. Route Protection Map

| Route Prefix | Allowed Roles | On Violation |
|---|---|---|
| `/dashboard/client/*` | `CLIENT` | Redirect `/unauthorized` |
| `/dashboard/statistician/*` | `STATISTICIAN` | Redirect `/unauthorized` |
| `/dashboard/qa/*` | `SENIOR_QA_LEAD` | Redirect `/unauthorized` |
| `/dashboard/admin/*` | `ADMIN` | Redirect `/unauthorized` |
| `/dashboard/finance/*` | `FINANCE_OFFICER` | Redirect `/unauthorized` |
| `/dashboard/ceo/*` | `CEO` | Redirect `/unauthorized` |
| `/dashboard/*` (catch-all) | Any authenticated | Redirect `/login` if unauthenticated |
| `/login`, `/register` | Unauthenticated only | Redirect to role desk if already logged in |

Post-login redirect map:

```ts
const ROLE_HOME: Record<Role, string> = {
  CLIENT:          '/dashboard/client',
  STATISTICIAN:    '/dashboard/statistician',
  SENIOR_QA_LEAD:  '/dashboard/qa',
  ADMIN:           '/dashboard/admin',
  FINANCE_OFFICER: '/dashboard/finance',
  CEO:             '/dashboard/ceo',
};
```

---

## 6. Page Views

| Page | Route | Description |
|---|---|---|
| Login | `/login` | Email + password form. Error states for invalid credentials, suspended, terminated. |
| Register | `/register` | Client-only self-registration form. Success → redirect to `/login`. |
| Unauthorized | `/unauthorized` | Shown when a valid session hits a forbidden route. Displays role context + back link. |
| Dashboard Shells | `/dashboard/[role]/` | Empty desk stubs — layout, sidebar, topbar, role label. Content added by subsequent modules. |

---

## 7. Seed Data Requirements

```ts
// prisma/seed.ts — Required seed records

const roles = [
  { id: 1, name: 'CLIENT',          label: 'Client' },
  { id: 2, name: 'STATISTICIAN',    label: 'Statistician' },
  { id: 3, name: 'SENIOR_QA_LEAD',  label: 'Senior QA Lead' },
  { id: 4, name: 'ADMIN',           label: 'Admin / Manager' },
  { id: 5, name: 'FINANCE_OFFICER', label: 'Finance Officer' },
  { id: 6, name: 'CEO',             label: 'CEO / Owner' },
];

const seedUsers = [
  { fullName: 'Operations Manager', email: 'admin@jaxis.dev',   role: 'ADMIN',           password: 'JaxisAdmin2026!' },
  { fullName: 'CEO Owner',        email: 'ceo@jaxis.dev',        role: 'CEO',             password: 'JaxisCeo2026!' },
  { fullName: 'Finance Officer',  email: 'finance@jaxis.dev',    role: 'FINANCE_OFFICER', password: 'JaxisFin2026!' },
  { fullName: 'Dr. Juan Reyes',   email: 'stat@jaxis.dev',       role: 'STATISTICIAN',    password: 'JaxisStat2026!' },
  { fullName: 'QA Lead Maria',    email: 'qa@jaxis.dev',         role: 'SENIOR_QA_LEAD',  password: 'JaxisQA2026!' },
  { fullName: 'Client Ana Cruz',  email: 'client@jaxis.dev',     role: 'CLIENT',          password: 'JaxisClient2026!' },
];
// All passwords are hashed via bcryptjs saltRounds=12 at seed time.
```

---

## 8. Business Rules Enforced in This Module

| Rule ID | Rule | Enforcement Point |
|---|---|---|
| `AUTH-BR-01` | Clients self-register. Staff accounts are Admin-provisioned. | `POST /api/v1/auth/register` — role hardcoded to CLIENT |
| `AUTH-BR-02` | SUSPENDED accounts cannot log in. | NextAuth `authorize()` callback |
| `AUTH-BR-03` | TERMINATED accounts cannot log in. | NextAuth `authorize()` callback |
| `AUTH-BR-04` | Passwords stored with bcryptjs (salt rounds 12). Plain text never persisted. | `registerClient()` Server Action |
| `AUTH-BR-05` | Session must contain `userId`, `role`, `fullName`. No other sensitive fields. | NextAuth `session` callback |
| `AUTH-BR-06` | Cross-role route access is redirected, not 401 in browser (better UX). | `src/middleware.ts` |
| `AUTH-BR-07` | All login events (success + failure) written to `AuthAuditLog`. | NextAuth `signIn` event handler |
| `AUTH-BR-08` | `requireRole()` must be the first call in every protected Server Action and API route. | Developer convention + lint rule |
| `RULE_ROL_01` | Statisticians cannot access Admin, Finance, CEO, or QA routes. | Middleware + `requireRole()` |

---

## 9. Error Responses

All auth errors follow the standard JAXIS error contract:

```ts
// Login — bad credentials
{ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.', status: 401 } }

// Login — suspended account
{ error: { code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended. Contact support.', status: 403 } }

// Login — terminated account
{ error: { code: 'ACCOUNT_TERMINATED', message: 'This account has been permanently deactivated.', status: 403 } }

// Any protected route — no session
{ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.', status: 401 } }

// Any protected route — wrong role
{ error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.', status: 403 } }

// Registration — email already in use
{ error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.', status: 409 } }

// Registration — validation failure
{ error: { code: 'VALIDATION_ERROR', message: 'Invalid registration data.', status: 422, details: {...} } }
```

---

### 🎯 Expected Output (What you should be able to do now)

- [x] **Client Registration:** Able to self-register a new institutional/client account at `/register` with full validation (password min. 8 chars, unique email).
- [x] **Multi-Role Authentication:** Able to log in with valid credentials at `/login` for all 6 stakeholder roles (`CLIENT`, `STATISTICIAN`, `SENIOR_QA_LEAD`, `ADMIN`, `FINANCE_OFFICER`, `CEO`).
- [x] **1-Click Dev Presets:** Able to use the preset selector on `/login` to auto-fill credentials for fast cross-role testing.
- [x] **Route Protection:** Unauthenticated access to `/dashboard/*` immediately redirects to `/login` with callback preservation.
- [x] **Role-Scoped Dashboard Shells:** Authenticated users are routed to their designated desk (`/dashboard/client`, `/dashboard/statistician`, `/dashboard/qa`, `/dashboard/admin`, `/dashboard/finance`, `/dashboard/ceo`).
- [x] **RBAC Boundary Enforcement:** Unauthorized cross-role visits (e.g. Client attempting `/dashboard/admin`) redirect to `/unauthorized`.
- [x] **Account Status Gate:** `SUSPENDED` and `TERMINATED` users are blocked at login with descriptive alert notifications.
- [x] **Authentication Audit Logging:** Registration, login success, login failure, and logout events recorded in `AuthAuditLog`.
- [x] **Secure Session Termination:** Able to log out and destroy active JWT sessions completely.


## 10. Acceptance Criteria (Done Checklist)

### Database

- [x] `User`, `Role`, `UserRole`, `AuthAuditLog` tables exist in PostgreSQL after `prisma migrate dev`
- [x] All 6 roles exist in the `roles` table after `prisma db seed`
- [x] One seed user per role exists with a hashed password (bcrypt verifiable)
- [x] `users.email` has a unique constraint enforced at DB level

### Authentication Flow

- [x] Client can register at `/register` with valid email + password → account created, role = CLIENT
- [x] Registration with an existing email returns `EMAIL_TAKEN` (409)
- [x] Registration with mismatched passwords returns `VALIDATION_ERROR` (422)
- [x] All 6 seed users can log in at `/login` with correct credentials
- [x] Login with wrong password returns `INVALID_CREDENTIALS` (401)
- [x] Login attempt for a SUSPENDED user returns `ACCOUNT_SUSPENDED` (403)
- [x] Login attempt for a TERMINATED user returns `ACCOUNT_TERMINATED` (403)
- [x] Successful login redirects each role to their correct dashboard desk URL
- [x] Logout destroys session and redirects to `/login`

### Password Recovery & Reset Flow

- [x] Public `/forgot-password` page accepts email and initiates recovery flow
- [x] Cryptographically random 256-bit token generated and stored as SHA-256 hash with 60-min expiration
- [x] Transactional email dispatched via Resend (`PasswordReset` template)
- [x] Resend free testing sandbox auto-detected with direct recovery bypass link (`Open Password Reset Desk Directly →`)
- [x] Safe unauthenticated audit logging in `notification_logs`
- [x] Public `/reset-password?token=...` verifies token validity, checks expiration and single-use status
- [x] Strong password validation enforced before resetting (8+ chars, uppercase, number, match confirmation)
- [x] Password hashed with bcrypt (salt rounds = 12), token marked as used, user redirected to `/login?reset=success`

### Session & Middleware

- [x] Session JWT contains `userId`, `role`, `fullName` — no password hash, no sensitive data
- [x] Visiting any `/dashboard/*` route without a session redirects to `/login`
- [x] CLIENT session visiting `/dashboard/admin/` redirects to `/unauthorized`
- [x] STATISTICIAN session visiting `/dashboard/finance/` redirects to `/unauthorized`
- [x] Visiting `/login` while already authenticated redirects to the role's home desk

### `requireRole()` Guard

- [x] Calling `requireRole('ADMIN')` from a Client session throws `FORBIDDEN`
- [x] Calling `requireRole('ADMIN')` from an Admin session returns the session object
- [x] Calling `requireRole()` from an unauthenticated context throws `UNAUTHENTICATED`

### Audit Logging

- [x] Successful login writes a `LOGIN_SUCCESS` event to `AuthAuditLog`
- [x] Failed login writes a `LOGIN_FAILED` event to `AuthAuditLog` (email recorded, userId null)
- [x] Logout writes a `LOGOUT` event to `AuthAuditLog`
- [x] New client registration writes a `REGISTRATION` event to `AuthAuditLog`

### Dashboard Stubs

- [x] Each role has a working dashboard shell (topbar + sidebar with role label) at their respective `/dashboard/[role]` route
- [x] Sidebar shows the correct role label and user's full name
- [x] `/unauthorized` page renders with a clear message and a "Go back" button

### Quality Gates

- [x] `npm run check-types` → 0 TypeScript errors
- [x] `npm run lint` → 0 ESLint warnings or errors
- [x] `npm run build` → clean build with no Next.js errors
- [x] No `any` types in any auth-related file
- [x] Password hash never appears in any API response or session token
