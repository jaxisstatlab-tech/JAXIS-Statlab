import crypto from "crypto";
import { cache } from "react";
import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import type { RoleName, UserStatus } from "@prisma/client";
import { db, withDbTimeout } from "@/lib/db";
import { ipFrom, isLoginThrottled, recordAuthEvent } from "@/lib/auth-throttle";
import { LoginSchema } from "@/features/auth/schemas";
import { getDevUserByEmail, getDevUsers } from "@/lib/mock-data/users.data";
import { authConfig as baseAuthConfig } from "@/lib/auth.config";
import { ensureFreshAccountNotifications } from "@/features/notifications/actions";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";

export type Role = RoleName;

/**
 * A sign-in refusal the login page can explain. Auth.js passes `code` back to signIn() on the client; any other
 * error thrown from authorize() reaches the page as a generic failure.
 */
class LoginError extends CredentialsSignin {
  constructor(code: "too_many_attempts" | "account_suspended" | "account_terminated") {
    super();
    this.code = code;
  }
}

/**
 * Computes a secure 16-character SHA-256 fingerprint of a password hash.
 * Stored in the JWT session to invalidate active sessions across all devices when a password changes.
 */
export function computePasswordFingerprint(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

// Enforce production URL in Vercel environments if not already specified
if (process.env.VERCEL) {
  if (!process.env.AUTH_URL) {
    process.env.AUTH_URL = "https://app.jaxis-statlab.com";
  }
  if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = "https://app.jaxis-statlab.com";
  }
}

/**
 * Whether the demo accounts (src/lib/mock-data/users.data.ts) may sign in with their built-in passwords.
 * Never in production: those passwords are in the repository. DISABLE_DEV_LOGINS=true turns them off locally too.
 */
export function devLoginsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DISABLE_DEV_LOGINS !== "true";
}

export const authConfig: NextAuthConfig = {
  ...baseAuthConfig,
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    // Local development only. This key is public in the repo, so production never falls back to it:
    // without AUTH_SECRET, Auth.js stops with a clear error instead of signing forgeable logins.
    (process.env.NODE_ENV === "production" ? undefined : "dev_secret_key_minimum_32_characters_long_for_jaxis_statlab"),
  debug: process.env.NODE_ENV !== "production",
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "text" },
      },
      async authorize(credentials, request) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password, rememberMe } = parsed.data;
        const isRemembered = Boolean(rememberMe);
        const normalizedEmail = email.toLowerCase().trim();
        // Demo accounts and their passwords live in the repo, so they only ever work on a local machine.
        const allowDevLogins = devLoginsAllowed();
        const ip = ipFrom(request);

        // Too many wrong passwords for this email (or from this network) recently: pause before checking at all.
        if (await isLoginThrottled(normalizedEmail, ip)) {
          throw new LoginError("too_many_attempts");
        }

        let accountExists = false;

        // 1. Attempt DB Lookup with fast timeout fallback
        try {
          const user = await withDbTimeout(
            db.user.findUnique({
              where: { email: normalizedEmail },
              select: {
                id: true,
                email: true,
                fullName: true,
                status: true,
                passwordHash: true,
                userRoles: { select: { role: { select: { name: true } } } },
              },
            }),
            8000
          );

          if (user) {
            accountExists = true;

            let isValidPassword = false;
            try {
              isValidPassword = await bcrypt.compare(password, user.passwordHash);
            } catch {
              isValidPassword = false;
            }

            // Dev password fallback check for demo presets or dev environments
            const devFallback = getDevUserByEmail(normalizedEmail);
            if (!isValidPassword && allowDevLogins && devFallback && devFallback.password === password) {
              isValidPassword = true;
            }

            if (!isValidPassword) {
              await recordAuthEvent({
                event: "LOGIN_FAILED",
                email: user.email,
                userId: user.id,
                ip,
                metadata: { reason: "INVALID_PASSWORD" },
              });
              return null;
            }

            // Only someone with the right password learns that an account is suspended or closed.
            if (user.status === "SUSPENDED" || user.status === "TERMINATED") {
              const suspended = user.status === "SUSPENDED";
              await recordAuthEvent({
                event: suspended ? "ACCOUNT_SUSPENDED_BLOCK" : "ACCOUNT_TERMINATED_BLOCK",
                email: user.email,
                userId: user.id,
                ip,
                metadata: { reason: suspended ? "ACCOUNT_SUSPENDED" : "ACCOUNT_TERMINATED" },
              });
              throw new LoginError(suspended ? "account_suspended" : "account_terminated");
            }

            const primaryRole: RoleName =
              (user.userRoles[0]?.role.name as RoleName | undefined) ?? devFallback?.role ?? "CLIENT";

            // Fire-and-forget: do not block the user login response on telemetry audit writes
            void recordAuthEvent({
              event: "LOGIN_SUCCESS",
              email: user.email,
              userId: user.id,
              ip,
              metadata: { role: primaryRole },
            });

            return {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              role: primaryRole,
              status: user.status as UserStatus,
              pwdFp: computePasswordFingerprint(user.passwordHash),
              rememberMe: isRemembered,
            };
          }
        } catch (dbError) {
          if (dbError instanceof LoginError) {
            throw dbError;
          }
          // If DB is offline/unreachable, fallback to dev user store
          console.warn("[Auth] Live DB unreachable or offline. Checking dev user fallback.", dbError);
        }

        // 2. Demo Presets & Development Fallback (Handles DB cold starts / offline demo testing)
        if (allowDevLogins) {
          const devUser = getDevUserByEmail(normalizedEmail);
          if (devUser && devUser.password === password) {
            if (devUser.status === "SUSPENDED") {
              throw new LoginError("account_suspended");
            }
            if (devUser.status === "TERMINATED") {
              throw new LoginError("account_terminated");
            }
            return {
              id: devUser.id,
              email: devUser.email,
              fullName: devUser.fullName,
              role: devUser.role,
              status: devUser.status,
              pwdFp: computePasswordFingerprint(devUser.password),
              rememberMe: isRemembered,
            };
          }
        }

        // An unknown email counts like a wrong password, so the pause can't reveal which emails have accounts.
        if (!accountExists) {
          await recordAuthEvent({ event: "LOGIN_FAILED", email: normalizedEmail, ip, metadata: { reason: "UNKNOWN_EMAIL" } });
        }
        return null;
      },
    }),
  ],
  callbacks: {
    ...baseAuthConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // Google sign-ins are matched to accounts by email, so the email must be one Google has verified.
        if (!user.email || profile?.email_verified !== true) return false;
        const normalizedEmail = user.email.toLowerCase().trim();

        try {
          // 1. Check if user already exists in PostgreSQL
          const existingUser = await withDbTimeout(
            db.user.findUnique({
              where: { email: normalizedEmail },
              include: {
                userRoles: {
                  include: { role: true },
                },
              },
            }),
            3000
          );

          if (existingUser) {
            // Block suspended or terminated accounts immediately
            if (existingUser.status === "SUSPENDED" || existingUser.status === "TERMINATED") {
              return false;
            }

            user.id = existingUser.id;
            user.role = (existingUser.userRoles[0]?.role.name as RoleName) || "CLIENT";
            user.fullName = existingUser.fullName;
            user.status = existingUser.status as UserStatus;
            user.pwdFp = computePasswordFingerprint(existingUser.passwordHash);

            db.authAuditLog.create({
              data: {
                userId: existingUser.id,
                email: existingUser.email,
                event: "LOGIN_SUCCESS",
                metadata: { role: user.role, provider: "google" },
              },
            }).catch(() => {});

            return true;
          }

          // 2. Auto-provision new CLIENT user in PostgreSQL
          let clientRole = null;
          try {
            clientRole = await withDbTimeout(
              db.role.findUnique({ where: { name: "CLIENT" } }),
              1500
            );
          } catch {
            // fallback
          }

          const randomPassword = crypto.randomBytes(32).toString("hex");
          const passwordHash = await bcrypt.hash(randomPassword, 10);
          const fullName = (user.name || "Research Client").trim();

          const newUser = await withDbTimeout(
            db.user.create({
              data: {
                email: normalizedEmail,
                fullName,
                passwordHash,
                status: "ACTIVE",
                userRoles: clientRole
                  ? {
                      create: {
                        roleId: clientRole.id,
                      },
                    }
                  : undefined,
              },
              include: {
                userRoles: {
                  include: { role: true },
                },
              },
            }),
            4000
          );

          user.id = newUser.id;
          user.role = "CLIENT";
          user.fullName = newUser.fullName;
          user.status = "ACTIVE";
          user.pwdFp = computePasswordFingerprint(newUser.passwordHash);

          db.authAuditLog.create({
            data: {
              userId: newUser.id,
              email: newUser.email,
              event: "REGISTRATION",
              metadata: { role: "CLIENT", provider: "google" },
            },
          }).catch(() => {});

          try {
            await ensureFreshAccountNotifications(newUser.id, "CLIENT");
            dispatchRealtimeNotification({
              eventType: "NEW_INTAKE",
              title: "New Client Registered (Google)",
              message: `${newUser.fullName} (${newUser.email}) registered via Google Sign-In.`,
              targetRoles: ["ADMIN", "CEO"],
              excludeUserId: newUser.id,
            });
          } catch {
            // non-blocking
          }

          return true;
        } catch (dbErr) {
          console.error("[Google Auth Error]:", dbErr);
          return false;
        }
      }
      return true;
    },
  },
  events: {
    signOut(message) {
      if ("token" in message && message.token?.email) {
        const userEmail = message.token.email as string;
        const userId = message.token.id as string | undefined;

        // Fire-and-forget: never stall the HTTP logout response on audit log creation
        db.authAuditLog.create({
          data: {
            userId: userId ?? null,
            email: userEmail,
            event: "LOGOUT",
          },
        }).catch(() => {});
      }
    },
  },
};

const nextAuthInstance = NextAuth(authConfig);

export const handlers = nextAuthInstance.handlers;
export const auth = cache(nextAuthInstance.auth);
export const signIn = nextAuthInstance.signIn;
export const signOut = nextAuthInstance.signOut;

/**
 * React cache memoized DB user status & credential fetcher.
 * Executes at most once per server request lifecycle to eliminate redundant DB lookups.
 */
export const getLiveAccountState = cache(async (userId: string) => {
  try {
    const liveUser = await withDbTimeout(
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          status: true,
          passwordHash: true,
          // My Profile edits show at once (the session keeps the name from sign-in).
          fullName: true,
          avatarPath: true,
          userRoles: {
            select: { role: { select: { name: true } } },
          },
        },
      }),
      8000
    );
    return liveUser;
  } catch (err) {
    // If DB is unreachable or timing out, return null to allow graceful fallback
    console.warn("[Auth] Live account state check failed or DB unreachable:", err);
    return null;
  }
});

/**
 * Server-side role guard utility with live account verification.
 * Must be the first check in protected Server Actions and API Route handlers.
 * Enforces immediate suspension/termination cutoff and session invalidation upon password changes.
 */
export async function requireRole(...roles: RoleName[]) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("UNAUTHENTICATED");
  }

  // 1. Live Database Verification (Zero-Revocation-Gap & Password Change Detection)
  const liveUser = await getLiveAccountState(session.user.id);

  if (liveUser) {
    // Immediate termination / suspension enforcement
    if (liveUser.status === "SUSPENDED") {
      throw new Error("ACCOUNT_SUSPENDED");
    }
    if (liveUser.status === "TERMINATED") {
      throw new Error("ACCOUNT_TERMINATED");
    }

    // Invalidate session if password was changed after token issuance
    if (session.user.pwdFp && liveUser.passwordHash) {
      const currentFp = computePasswordFingerprint(liveUser.passwordHash);
      if (currentFp !== session.user.pwdFp) {
        throw new Error("SESSION_REVOKED");
      }
    }

    // Sync live status onto session object for the current request context
    session.user.status = liveUser.status as UserStatus;

    // Check dynamic live role assignment from DB
    const liveRoles = liveUser.userRoles.map((ur) => ur.role.name as RoleName);
    const primaryRole = liveRoles[0];
    if (primaryRole) {
      session.user.role = primaryRole;
    }

    if (roles.length > 0 && !roles.some((r) => liveRoles.includes(r))) {
      throw new Error("FORBIDDEN");
    }

    return session;
  }

  // 2. Demo Presets & Dev User Fallback
  const allowDevLogins = devLoginsAllowed();

  if (allowDevLogins && session.user.email) {
    // Looked up by the sign-in email, so a deleted account (kept there, locked) ends its open session.
    const devUser = getDevUsers()[session.user.email.toLowerCase().trim()];
    if (devUser) {
      if (devUser.status === "SUSPENDED") throw new Error("ACCOUNT_SUSPENDED");
      if (devUser.status === "TERMINATED") throw new Error("ACCOUNT_TERMINATED");
      if (roles.length > 0 && !roles.includes(devUser.role)) throw new Error("FORBIDDEN");
      return session;
    }
  }

  // 3. Fallback to token claims if DB was temporarily unreachable
  if (session.user.status === "SUSPENDED") {
    throw new Error("ACCOUNT_SUSPENDED");
  }

  if (session.user.status === "TERMINATED") {
    throw new Error("ACCOUNT_TERMINATED");
  }

  if (roles.length > 0 && !roles.includes(session.user.role)) {
    throw new Error("FORBIDDEN");
  }

  return session;
}
