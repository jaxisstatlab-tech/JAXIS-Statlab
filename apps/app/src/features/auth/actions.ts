"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, withDbTimeout } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  RegisterClientSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  type ActionResult,
} from "./schemas";
import {
  DEV_USERS,
  getDevUserByEmail,
  registerDevUser,
} from "@/lib/mock-data/users.data";
import { sendEmail } from "@/lib/email";
import { ensureFreshAccountNotifications } from "@/features/notifications/actions";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";

export async function registerClient(
  input: unknown
): Promise<ActionResult<{ id: string; email: string }>> {
  const parsed = RegisterClientSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid registration data. Please correct the fields below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { firstName, lastName, email, password } = parsed.data;
  const fullName = `${firstName.trim()} ${lastName.trim()}`;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const existing = await withDbTimeout(
      db.user.findUnique({
        where: { email: normalizedEmail },
      }),
      2500
    );

    if (existing) {
      return {
        success: false,
        error: {
          code: "EMAIL_TAKEN",
          message: "An institutional account with this email already exists.",
        },
      };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let clientRole = null;
    try {
      clientRole = await withDbTimeout(
        db.role.findUnique({
          where: { name: "CLIENT" },
        }),
        1500
      );
    } catch {
      // Role table lookup fallback
    }

    const user = await withDbTimeout(
      db.user.create({
        data: {
          email: normalizedEmail,
          fullName: fullName.trim(),
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
        select: {
          id: true,
          email: true,
        },
      }),
      3000
    );

    try {
      await withDbTimeout(
        db.authAuditLog.create({
          data: {
            userId: user.id,
            email: user.email,
            event: "REGISTRATION",
            metadata: { role: "CLIENT" },
          },
        }),
        1000
      );
    } catch {
      // Ignore audit log failure
    }

    // Sync to dev user store for offline / employee QA testing
    const allowDevLogins = process.env.DISABLE_DEV_LOGINS !== "true";
    if (allowDevLogins) {
      registerDevUser({
        id: user.id,
        email: user.email,
        fullName: fullName.trim(),
        role: "CLIENT",
        password: password,
        status: "ACTIVE",
      });
    }

    try {
      await ensureFreshAccountNotifications(user.id, "CLIENT");

      dispatchRealtimeNotification({
        eventType: "NEW_INTAKE",
        title: "New Client Registered",
        message: `${fullName.trim()} (${user.email}) registered a new client account.`,
        targetRoles: ["ADMIN", "CEO"],
        excludeUserId: user.id,
      });
    } catch (notifyErr) {
      console.warn("[Register] Welcome notification warning:", notifyErr);
    }

    return {
      success: true,
      data: user,
    };
  } catch (dbError) {
    const allowDevLogins = process.env.DISABLE_DEV_LOGINS !== "true";
    if (!allowDevLogins && process.env.NODE_ENV === "production") {
      console.error("[Register] Database user creation failed in production:", dbError);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to complete registration at this time. Please try again later.",
        },
      };
    }

    console.warn("[Register] DB unavailable in offline mode. Falling back to dev user store.", dbError);

    const existingDev = getDevUserByEmail(normalizedEmail);
    if (existingDev) {
      return {
        success: false,
        error: {
          code: "EMAIL_TAKEN",
          message: "An institutional account with this email already exists.",
        },
      };
    }

    const newDevUserId = `usr_dev_client_${Date.now()}`;
    registerDevUser({
      id: newDevUserId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      role: "CLIENT",
      password: password,
      status: "ACTIVE",
    });

    return {
      success: true,
      data: {
        id: newDevUserId,
        email: normalizedEmail,
      },
    };
  }
}

/**
 * Initiates a self-service password reset request.
 * - Generates a single-use 256-bit cryptographic token.
 * - Stores the SHA-256 hash of the token with a 60-minute expiration.
 * - Sends transactional email via Resend with dark precision styling.
/**
 * Generates a password reset token, saves it to the database, and dispatches an email via Resend.
 * - Verifies that the email exists on the platform before dispatching.
 * - Returns an explicit error if the account is not registered, suspended, or deactivated.
 */
export async function requestPasswordResetAction(
  input: unknown
): Promise<ActionResult<{ sent: boolean; sandboxNotice?: string; devRecoveryUrl?: string }>> {
  const parsed = ForgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please enter a valid email address.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();

  try {
    let user = await withDbTimeout(
      db.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true, fullName: true, status: true },
      }),
      3000
    ).catch(() => null);

    // Development fallback for mock users when running locally
    if (!user && process.env.NODE_ENV !== "production") {
      const devUser = getDevUserByEmail(normalizedEmail);
      if (devUser) {
        user = {
          id: devUser.id,
          email: devUser.email,
          fullName: devUser.fullName,
          status: devUser.status,
        };
      }
    }

    if (!user) {
      return {
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "No account found with this email address. Please check your spelling or create an account.",
        },
      };
    }

    if (user.status === "TERMINATED") {
      return {
        success: false,
        error: {
          code: "ACCOUNT_TERMINATED",
          message: "This account has been deactivated. Please contact support.",
        },
      };
    }

    if (user.status === "SUSPENDED") {
      return {
        success: false,
        error: {
          code: "ACCOUNT_SUSPENDED",
          message: "This account is currently suspended. Please contact support.",
        },
      };
    }

    // Generate 256-bit raw token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    // Invalidate existing unused tokens for this email
    await withDbTimeout(
      db.passwordResetToken.deleteMany({
        where: { email: normalizedEmail, usedAt: null },
      }).catch(() => {})
    );

    // Persist hashed token
    await withDbTimeout(
      db.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          tokenHash,
          expiresAt,
        },
      }),
      3000
    );

    const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      (isProd ? "https://jaxis-statlab-app.vercel.app" : "http://localhost:3001");
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
    console.log(`\n🔑 [PASSWORD RECOVERY LINK]: ${resetUrl}\n`);

    // Dispatch recovery email via Resend abstraction
    const emailRes = await sendEmail({
      to: user.email,
      recipientId: user.id,
      template: "PasswordReset",
      data: {
        email: user.email,
        userName: user.fullName,
        resetToken: rawToken,
        resetUrl,
      },
    });

    if (!emailRes.success) {
      return {
        success: false,
        error: {
          code: "EMAIL_FAILED",
          message: emailRes.error || "Unable to send recovery email. Please check your network and try again.",
        },
      };
    }

    // Audit trail
    await withDbTimeout(
      db.authAuditLog.create({
        data: {
          userId: user.id,
          email: user.email,
          event: "LOGIN_FAILED",
          metadata: { action: "PASSWORD_RESET_REQUESTED" },
        },
      }).catch(() => {})
    );

    const isSandboxRestriction = Boolean(emailRes.error?.includes("only send testing emails"));

    return {
      success: true,
      data: {
        sent: emailRes.success,
        sandboxNotice: isSandboxRestriction
          ? "Resend is in sandbox testing mode. Real emails can currently only be delivered to jaxis.statlab@gmail.com until a custom domain is verified at resend.com/domains."
          : undefined,
        devRecoveryUrl:
          process.env.NODE_ENV !== "production" || isSandboxRestriction
            ? `${appUrl}/reset-password?token=${rawToken}`
            : undefined,
      },
    };
  } catch (err) {
    console.warn("[PasswordReset] Request failed or DB offline:", err);
    return {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "An unexpected error occurred while processing your request. Please try again.",
      },
    };
  }
}

/**
 * Validates a recovery token before rendering the reset form.
 */
export async function verifyResetTokenAction(
  rawToken: string
): Promise<ActionResult<{ email: string }>> {
  if (!rawToken || typeof rawToken !== "string") {
    return {
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Missing or invalid recovery token.",
      },
    };
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const record = await withDbTimeout(
      db.passwordResetToken.findUnique({
        where: { tokenHash },
      }),
      8000
    );

    if (!record) {
      return {
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "This password recovery link is invalid or has already been used.",
        },
      };
    }

    if (record.usedAt) {
      return {
        success: false,
        error: {
          code: "TOKEN_USED",
          message: "This recovery link has already been used. Please request a new one.",
        },
      };
    }

    if (record.expiresAt < new Date()) {
      return {
        success: false,
        error: {
          code: "TOKEN_EXPIRED",
          message: "This password recovery link has expired. Please request a new one.",
        },
      };
    }

    return {
      success: true,
      data: { email: record.email },
    };
  } catch (err) {
    console.error("[PasswordReset] Verification error:", err);
    return {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Unable to verify recovery link at this time. Please try again.",
      },
    };
  }
}

/**
 * Executes password update with hash encryption and marks token used.
 */
export async function resetPasswordAction(
  input: unknown
): Promise<ActionResult<{ success: boolean }>> {
  const parsed = ResetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please ensure your passwords meet the security requirements.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { token: rawToken, password } = parsed.data;

  try {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const record = await withDbTimeout(
      db.passwordResetToken.findUnique({
        where: { tokenHash },
      }),
      8000
    );

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return {
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "This password recovery link is invalid or has expired. Please request a new link.",
        },
      };
    }

    // Check existing password to prevent reusing the same password
    const user = await withDbTimeout(
      db.user.findFirst({
        where: { email: { equals: record.email, mode: "insensitive" } },
        select: { id: true, email: true, passwordHash: true },
      }),
      8000
    );

    if (user && user.passwordHash) {
      let isSamePassword = false;
      try {
        if (
          user.passwordHash.startsWith("$2a$") ||
          user.passwordHash.startsWith("$2b$") ||
          user.passwordHash.startsWith("$2y$")
        ) {
          isSamePassword = await bcrypt.compare(password, user.passwordHash);
        } else {
          isSamePassword = user.passwordHash === password;
        }
      } catch {
        isSamePassword = user.passwordHash === password;
      }

      if (isSamePassword) {
        return {
          success: false,
          error: {
            code: "SAME_PASSWORD",
            message: "New password cannot be the same as your current password. Please choose a different password.",
          },
        };
      }
    }

    // Dev fallback if active
    const allowDevLogins = process.env.DISABLE_DEV_LOGINS !== "true";
    if (allowDevLogins && record.email) {
      const dev = getDevUserByEmail(record.email) || DEV_USERS[record.email];
      if (dev && dev.password === password) {
        return {
          success: false,
          error: {
            code: "SAME_PASSWORD",
            message: "New password cannot be the same as your current password. Please choose a different password.",
          },
        };
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Update user password and mark token as consumed
    await withDbTimeout(
      db.$transaction([
        db.user.update({
          where: user ? { id: user.id } : { email: record.email },
          data: { passwordHash },
        }),
        db.passwordResetToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        }),
      ]),
      10000
    );

    // Sync dev mock user store if dev logins are enabled
    if (allowDevLogins) {
      const dev = getDevUserByEmail(record.email) || DEV_USERS[record.email];
      if (dev) {
        dev.password = password;
      }
    }

    // Audit log
    await withDbTimeout(
      db.authAuditLog.create({
        data: {
          email: record.email,
          event: "LOGIN_SUCCESS",
          metadata: { action: "PASSWORD_RESET_COMPLETED" },
        },
      }).catch(() => {})
    );

    return {
      success: true,
      data: { success: true },
    };
  } catch (err) {
    console.error("[PasswordReset] Reset error:", err);
    return {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Unable to update password at this time. Please try again.",
      },
    };
  }
}

/**
 * Changes password for the currently authenticated user in their profile settings.
 * Accessible to all authenticated roles (Client, Statistician, QA Lead, Finance, CEO, Admin).
 */
export async function changePasswordAction(
  input: unknown
): Promise<ActionResult<{ success: boolean; message: string }>> {
  let session;
  try {
    session = await requireRole();
  } catch {
    return {
      success: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "You must be signed in to change your password.",
      },
    };
  }

  const parsed = ChangePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please correct the errors in the password form.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { currentPassword, newPassword } = parsed.data;
  const userId = session.user.id;
  const userEmail = session.user.email;

  try {
    const user = await withDbTimeout(
      db.user.findFirst({
        where: {
          OR: [
            { id: userId },
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        },
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      }),
      3000
    );

    if (!user) {
      return {
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User account could not be found.",
        },
      };
    }

    // Verify current password
    let isCurrentValid = false;
    if (user.passwordHash) {
      isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    }

    // Dev fallback if active
    const allowDevLogins = process.env.DISABLE_DEV_LOGINS !== "true";
    if (!isCurrentValid && allowDevLogins && user.email) {
      const dev = getDevUserByEmail(user.email) || DEV_USERS[user.email];
      if (dev && dev.password === currentPassword) {
        isCurrentValid = true;
      }
    }

    if (!isCurrentValid) {
      return {
        success: false,
        error: {
          code: "INVALID_CURRENT_PASSWORD",
          message: "The current password you entered is incorrect.",
          fieldErrors: {
            currentPassword: ["The current password you entered is incorrect."],
          },
        },
      };
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await withDbTimeout(
      db.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      }),
      4000
    );

    // Synchronize dev mock store if dev logins active
    if (allowDevLogins && user.email) {
      const dev = getDevUserByEmail(user.email) || DEV_USERS[user.email];
      if (dev) {
        dev.password = newPassword;
      }
    }

    // Audit log
    await withDbTimeout(
      db.authAuditLog.create({
        data: {
          userId: user.id,
          email: user.email,
          event: "LOGIN_SUCCESS",
          metadata: { action: "PASSWORD_CHANGED_IN_PROFILE", role: session.user.role },
        },
      }).catch(() => {})
    );

    return {
      success: true,
      data: {
        success: true,
        message: "Your password has been changed successfully.",
      },
    };
  } catch (err) {
    console.error("[ChangePassword] Error updating password:", err);
    return {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Unable to update password at this time. Please try again.",
      },
    };
  }
}

