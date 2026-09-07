import { cache } from "react";
import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { RoleName, UserStatus } from "@prisma/client";
import { db, withDbTimeout } from "@/lib/db";
import { LoginSchema } from "@/features/auth/schemas";
import { DEV_USERS, getDevUserByEmail } from "@/lib/mock-data/users.data";
import { authConfig as baseAuthConfig } from "@/lib/auth.config";

export type Role = RoleName;

export const authConfig: NextAuthConfig = {
  ...baseAuthConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
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

            // Dev password fallback check (active for employee QA / testing unless DISABLE_DEV_LOGINS=true)
            const allowDevLogins = process.env.DISABLE_DEV_LOGINS !== "true";
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
            };
          }
        } catch (dbError) {
          if ((dbError as Error)?.message === "ACCOUNT_SUSPENDED" || (dbError as Error)?.message === "ACCOUNT_TERMINATED") {
            throw dbError;
          }
          // If DB is offline/unreachable, fallback to dev user store
          console.warn("[Auth] Live DB unreachable or offline. Checking dev user fallback.", dbError);
        }

        // 2. Development Quick Credentials Fallback (Offline / Employee QA Testing Mode)
        const allowDevLogins = process.env.DISABLE_DEV_LOGINS !== "true";
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
              };
            }
          }
        }

        return null;
      },
    }),
  ],
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
 * Server-side role guard utility.
 * Must be the first check in protected Server Actions and API Route handlers.
 */
export async function requireRole(...roles: RoleName[]) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("UNAUTHENTICATED");
  }

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
