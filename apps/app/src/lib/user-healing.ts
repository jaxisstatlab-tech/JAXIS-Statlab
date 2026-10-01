import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, withDbTimeout } from "@/lib/db";
import type { RoleName } from "@prisma/client";
import { ensureFreshAccountNotifications } from "@/features/notifications/actions";

interface UserCandidate {
  id: string;
  email?: string | null;
  name?: string | null;
  fullName?: string | null;
  role?: string | null;
}

/**
 * Resolves the signed-in person's own database user, creating it if it doesn't exist yet.
 *
 * It only ever returns that person's own account. If it can't be found or created, it returns the session's
 * id and the caller's write fails safely; it never borrows another user's account, which used to file one
 * client's study under someone else's account.
 */
export async function resolveOrProvisionUser(
  userCandidate: UserCandidate,
  targetRole: RoleName = "CLIENT"
): Promise<string> {
  const candidateId = userCandidate.id;
  const candidateEmail = userCandidate.email?.toLowerCase().trim();

  // 1. Direct match by ID in PostgreSQL
  try {
    const existingById = await withDbTimeout(
      db.user.findUnique({
        where: { id: candidateId },
        select: { id: true },
      }),
      1500
    );
    if (existingById?.id) {
      return existingById.id;
    }
  } catch (err) {
    console.warn("[resolveOrProvisionUser] ID lookup warning:", err);
  }

  // 2. Lookup by email in PostgreSQL
  if (candidateEmail) {
    try {
      const existingByEmail = await withDbTimeout(
        db.user.findUnique({
          where: { email: candidateEmail },
          select: { id: true },
        }),
        1500
      );
      if (existingByEmail?.id) {
        return existingByEmail.id;
      }
    } catch (err) {
      console.warn("[resolveOrProvisionUser] Email lookup warning:", err);
    }
  }

  // 3. Auto-provision the user in PostgreSQL
  if (candidateEmail) {
    try {
      // Ensure target role exists in `roles` table
      const roleRecord = await db.role.upsert({
        where: { name: targetRole },
        update: {},
        create: {
          name: targetRole,
          label: targetRole === "CLIENT" ? "Client" : targetRole,
        },
      });

      const fullName =
        userCandidate.fullName ||
        userCandidate.name ||
        (targetRole === "CLIENT" ? "Research Client" : "Staff User");

      // A random password nobody knows: the person signs in the way they already do (e.g. Google) or sets
      // one with "Forgot password". (A fixed default used to be shared by every account created here.)
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

      const newUser = await db.user.upsert({
        where: { email: candidateEmail },
        // If the account appeared meanwhile, use it as it is: never reactivate a suspended account or rename it.
        update: {},
        create: {
          email: candidateEmail,
          fullName,
          passwordHash,
          status: "ACTIVE",
          userRoles: {
            create: {
              roleId: roleRecord.id,
            },
          },
        },
        select: { id: true },
      });

      if (newUser?.id) {
        console.log(`[resolveOrProvisionUser] Auto-provisioned DB user ${newUser.id} for ${candidateEmail}`);
        try {
          await ensureFreshAccountNotifications(newUser.id, targetRole);
        } catch {
          // Non-blocking
        }
        return newUser.id;
      }
    } catch (provisionErr) {
      console.warn("[resolveOrProvisionUser] Auto-provision warning:", provisionErr);
    }
  }

  // 4. Not found and not created: return the session's own id. A write that needs a real user then fails
  // with an error the caller reports, rather than landing in someone else's account.
  console.warn(`[resolveOrProvisionUser] Could not resolve a database user for ${candidateEmail || candidateId}`);
  return candidateId;
}
