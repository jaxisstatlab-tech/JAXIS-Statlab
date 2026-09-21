import crypto from "crypto";
import { cache } from "react";
import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import type { RoleName, UserStatus } from "@prisma/client";
import { db, withDbTimeout } from "@/lib/db";
import { LoginSchema } from "@/features/auth/schemas";
import { DEV_USERS, getDevUserByEmail } from "@/lib/mock-data/users.data";
import { authConfig as baseAuthConfig } from "@/lib/auth.config";
import { ensureFreshAccountNotifications } from "@/features/notifications/actions";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";

export type Role = RoleName;

/**
 * Computes a secure 16-character SHA-256 fingerprint of a password hash.
 * Stored in the JWT session to invalidate active sessions across all devices when a password changes.
 */
export function computePasswordFingerprint(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

// Enforce canonical production URL in production / Vercel environments
if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  process.env.AUTH_URL = "https://app.jaxis-statlab.com";
  process.env.NEXTAUTH_URL = "https://app.jaxis-statlab.com";
}

export const authConfig: NextAuthConfig = {
  ...baseAuthConfig,
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev_secret_key_minimum_32_characters_long_for_jaxis_statlab",
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
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password, rememberMe } = parsed.data;
        const isRemembered = Boolean(rememberMe);
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Attempt DB Lookup with fast timeout fallback
        try {
          const user = await withDbTimeout(
            db.user.findUnique({
              where: { email: normalizedEmail },
              include: {
                userRoles: {
                  include: { role: true },
                },
              },
            }),
            2500
          );

          if (user) {
            if (user.status === "SUSPENDED") {
              try {
                await withDbTimeout(
                  db.authAuditLog.create({
                    data: {
                      userId: user.id,
                      email: user.email,
                      event: "ACCOUNT_SUSPENDED_BLOCK",
                      metadata: { reason: "ACCOUNT_SUSPENDED" },
                    },
                  }),
                  1000
                );
              } catch (e) {
                void e;
              }
              throw new Error("ACCOUNT_SUSPENDED");
            }

            if (user.status === "TERMINATED") {
              try {
                await withDbTimeout(
                  db.authAuditLog.create({
                    data: {
                      userId: user.id,
                      email: user.email,
                      event: "ACCOUNT_TERMINATED_BLOCK",
                      metadata: { reason: "ACCOUNT_TERMINATED" },
                    },
                  }),
                  1000
                );
              } catch (e) {
                void e;
              }
              throw new Error("ACCOUNT_TERMINATED");
            }

            let isValidPassword = false;
            try {
              isValidPassword = await bcrypt.compare(password, user.passwordHash);
            } catch {
              isValidPassword = false;
            }

            // Dev password fallback check (strictly disabled in production)
            const allowDevLogins =
              process.env.NODE_ENV !== "production" &&
              process.env.DISABLE_DEV_LOGINS !== "true";
            const devFallback = getDevUserByEmail(normalizedEmail) || DEV_USERS[normalizedEmail];
            if (!isValidPassword && allowDevLogins && devFallback && devFallback.password === password) {
              isValidPassword = true;
            }

            if (!isValidPassword) {
              try {
                await withDbTimeout(
                  db.authAuditLog.create({
                    data: {
                      userId: user.id,
                      email: user.email,
                      event: "LOGIN_FAILED",
                      metadata: { reason: "INVALID_PASSWORD" },
                    },
                  }),
                  1000
                );
              } catch (e) {
                void e;
              }
              return null;
            }

            const primaryRole: RoleName =
              user.userRoles[0]?.role.name ?? devFallback?.role ?? "CLIENT";

            // Fire-and-forget: do not block the user login response on telemetry audit writes
            db.authAuditLog.create({
              data: {
                userId: user.id,
                email: user.email,
                event: "LOGIN_SUCCESS",
                metadata: { role: primaryRole },
              },
            }).catch(() => {});

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
          if ((dbError as Error)?.message === "ACCOUNT_SUSPENDED" || (dbError as Error)?.message === "ACCOUNT_TERMINATED") {
            throw dbError;
          }
          // If DB is offline/unreachable, fallback to dev user store
          console.warn("[Auth] Live DB unreachable or offline. Checking dev user fallback.", dbError);
        }

        // 2. Development Quick Credentials Fallback (Offline / Employee QA Testing Mode; disabled in production)
        const allowDevLogins =
          process.env.NODE_ENV !== "production" &&
          process.env.DISABLE_DEV_LOGINS !== "true";
        if (allowDevLogins) {
          const devUser = getDevUserByEmail(normalizedEmail) || DEV_USERS[normalizedEmail];
          if (devUser) {
            if (devUser.status === "SUSPENDED") {
              throw new Error("ACCOUNT_SUSPENDED");
            }
            if (devUser.status === "TERMINATED") {
              throw new Error("ACCOUNT_TERMINATED");
            }

            if (devUser.password === password) {
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
        }

        return null;
      },
    }),
  ],
  callbacks: {
    ...baseAuthConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
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
          userRoles: {
            select: { role: { select: { name: true } } },
          },
        },
      }),
      2500
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

  // 2. Offline / Dev User Fallback (Disabled in Production)
  const allowDevLogins =
    process.env.NODE_ENV !== "production" &&
    process.env.DISABLE_DEV_LOGINS !== "true";

  if (allowDevLogins && session.user.email) {
    const devUser = getDevUserByEmail(session.user.email) || DEV_USERS[session.user.email];
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
