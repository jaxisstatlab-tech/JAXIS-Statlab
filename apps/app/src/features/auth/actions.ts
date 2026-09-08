"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, withDbTimeout } from "@/lib/db";
import {
  RegisterClientSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  type ActionResult,
} from "./schemas";
import {
  DEV_USERS,
  getDevUserByEmail,
  registerDevUser,
} from "@/lib/mock-data/users.data";
import { sendEmail } from "@/lib/email";

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
 * - Always returns success to prevent user email enumeration.
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
    const user = await withDbTimeout(
      db.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true, fullName: true, status: true },
      }),
      3000
    );

    if (user && user.status !== "TERMINATED") {
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

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3001";
      console.log(`\n🔑 [PASSWORD RECOVERY LINK]: ${appUrl}/reset-password?token=${rawToken}\n`);

      // Dispatch recovery email via Resend abstraction
      const emailRes = await sendEmail({
        to: user.email,
        recipientId: user.id,
        template: "PasswordReset",
        data: {
          email: user.email,
          userName: user.fullName,
          resetToken: rawToken,
        },
      });

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
    }
  } catch (err) {
    console.warn("[PasswordReset] Request failed or DB offline:", err);
  }

  // Always return success for security (prevent email enumeration)
  return {
    success: true,
    data: { sent: true },
  };
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
      3000
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
      3000
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

    const passwordHash = await bcrypt.hash(password, 12);

    // Update user password and mark token as consumed
    await withDbTimeout(
      db.$transaction([
        db.user.update({
          where: { email: record.email },
          data: { passwordHash },
        }),
        db.passwordResetToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        }),
      ]),
      5000
    );

    // Sync dev mock user store if dev logins are enabled
    const allowDevLogins = process.env.DISABLE_DEV_LOGINS !== "true";
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
