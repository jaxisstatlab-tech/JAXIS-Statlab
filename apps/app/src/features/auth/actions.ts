"use server";

import bcrypt from "bcryptjs";
import { db, withDbTimeout } from "@/lib/db";
import { RegisterClientSchema, type ActionResult } from "./schemas";
import {
  getDevUserByEmail,
  registerDevUser,
} from "@/lib/mock-data/users.data";

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

