"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ProjectStatus, RoleName } from "@prisma/client";
import { db, withDbTimeout } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { isOfflineDev } from "@/lib/app-settings";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache-tags";
import { getDevUsers, markDevUserRemoved } from "@/lib/mock-data/users.data";
import { isRemovedAccountEmail, removedEmailFor } from "@/lib/account-removal";

// CEO tool: find any account by email and delete it. Deleting keeps the account's history (studies, payments,
// payslips, messages) under its name, frees the email so it can be added again, removes saved payout details,
// and blocks sign-in straight away (open sessions end on their next page load).

type Result<T> = { success: true; data: T } | { success: false; error: string };

export interface AccountSummary {
  id: string;
  email: string;
  fullName: string;
  role: RoleName | null;
  status: string;
  createdAt: string | null;
  /** Studies this person sent as a client, and how many are still underway. */
  clientStudies: number;
  clientOpenStudies: number;
  /** Studies they're assigned to (analyst or reviewer) that aren't finished. Deleting waits until these move. */
  openAssignments: string[];
  /** Why this account can't be deleted, in plain words; null when it can. */
  blockedReason: string | null;
}

const FINISHED: ProjectStatus[] = ["DELIVERED", "CLOSED", "CANCELLED", "EXPIRED"];


const EmailSchema = z.string().trim().toLowerCase().email("Type a full email address, like name@gmail.com.");

const DeleteSchema = z.object({
  userId: z.string().min(1),
  confirmEmail: z.string().trim().toLowerCase(),
  reason: z.string().trim().max(300).optional(),
});

function blockedReason(
  target: { id: string; role: RoleName | null; email: string },
  callerId: string,
  openAssignments: string[]
): string | null {
  if (target.id === callerId) return "You can't delete your own account.";
  if (target.role === "CEO") return "CEO accounts can't be deleted here.";
  if (isRemovedAccountEmail(target.email)) return "This account is already deleted.";
  if (openAssignments.length > 0) {
    const list = openAssignments.slice(0, 3).join(", ") + (openAssignments.length > 3 ? ` and ${openAssignments.length - 3} more` : "");
    return `They're still working on ${list}. Give ${openAssignments.length === 1 ? "that study" : "those studies"} to someone else first.`;
  }
  return null;
}

export async function findAccountByEmail(email: unknown): Promise<Result<AccountSummary | null>> {
  let session;
  try {
    session = await requireRole("CEO");
  } catch {
    return { success: false, error: "Only the CEO can look up accounts." };
  }
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the email." };
  const address = parsed.data;

  if (isOfflineDev()) {
    const dev = getDevUsers()[address];
    if (!dev || dev.email.toLowerCase() !== address) return { success: true, data: null };
    const target = { id: dev.id, role: dev.role, email: dev.email };
    return {
      success: true,
      data: {
        id: dev.id,
        email: dev.email,
        fullName: dev.fullName,
        role: dev.role,
        status: dev.status,
        createdAt: null,
        clientStudies: 0,
        clientOpenStudies: 0,
        openAssignments: [],
        blockedReason: blockedReason(target, session.user.id, []),
      },
    };
  }

  try {
    const user = await withDbTimeout(
      db.user.findUnique({
        where: { email: address },
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          createdAt: true,
          userRoles: { select: { role: { select: { name: true } } } },
          clientProjects: { select: { masterStatus: true } },
          statisticianAssignments: { select: { project: { select: { intakeId: true, masterStatus: true } } } },
          qaAssignments: { select: { project: { select: { intakeId: true, masterStatus: true } } } },
        },
      })
    );
    if (!user) return { success: true, data: null };

    const role = (user.userRoles[0]?.role.name as RoleName | undefined) ?? null;
    const openAssignments = [
      ...new Set(
        [...user.statisticianAssignments, ...user.qaAssignments]
          .filter((a) => !FINISHED.includes(a.project.masterStatus))
          .map((a) => a.project.intakeId)
      ),
    ];
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        clientStudies: user.clientProjects.length,
        clientOpenStudies: user.clientProjects.filter((p) => !FINISHED.includes(p.masterStatus)).length,
        openAssignments,
        blockedReason: blockedReason({ id: user.id, role, email: user.email }, session.user.id, openAssignments),
      },
    };
  } catch (err) {
    console.error("[findAccountByEmail] Lookup failed:", err);
    return { success: false, error: "Couldn't look up that account. Try again." };
  }
}

export async function deleteAccount(input: unknown): Promise<Result<{ email: string; fullName: string }>> {
  let session;
  try {
    session = await requireRole("CEO");
  } catch {
    return { success: false, error: "Only the CEO can delete accounts." };
  }
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Something's missing. Look up the account again." };
  const { userId, confirmEmail, reason } = parsed.data;

  // Look the account up again on the server: the checks never trust what the page sent.
  const lookup = await (async () => {
    if (isOfflineDev()) {
      const dev = Object.values(getDevUsers()).find((u) => u.id === userId);
      return dev ? findAccountByEmail(dev.email) : null;
    }
    const row = await withDbTimeout(db.user.findUnique({ where: { id: userId }, select: { email: true } }));
    return row ? findAccountByEmail(row.email) : null;
  })().catch(() => null);

  if (!lookup) return { success: false, error: "That account no longer exists." };
  if (!lookup.success) return lookup;
  const account = lookup.data;
  if (!account) return { success: false, error: "That account no longer exists." };
  if (account.blockedReason) return { success: false, error: account.blockedReason };
  if (confirmEmail !== account.email.toLowerCase()) {
    return { success: false, error: "The email you typed doesn't match this account." };
  }

  const freedEmail = removedEmailFor(account.id);

  if (isOfflineDev()) {
    markDevUserRemoved(account.email, freedEmail);
  } else {
    try {
      // A password nobody knows, so the old one stops working and open sessions are cut off.
      const lockedHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
      await db.$transaction(async (tx) => {
        // Only if the account still has this email: two clicks (or two people) can't delete it twice.
        const changed = await tx.user.updateMany({
          where: { id: account.id, email: account.email },
          data: {
            email: freedEmail,
            passwordHash: lockedHash,
            status: "TERMINATED",
            phone: null,
            leaveReason: null,
            leaveFrom: null,
            leaveUntil: null,
          },
        });
        if (changed.count !== 1) throw new Error("ALREADY_CHANGED");
        await tx.staffPayoutDetail.deleteMany({ where: { userId: account.id } });
        await tx.passwordResetToken.deleteMany({ where: { email: account.email } });
        await tx.auditLog.create({
          data: {
            actorId: session.user.id,
            actorRole: "CEO",
            action: "ACCOUNT_DELETED",
            oldValue: account.email,
            newValue: freedEmail,
            reason: reason || null,
            metadata: {
              userId: account.id,
              fullName: account.fullName,
              role: account.role,
              clientStudies: account.clientStudies,
            },
          },
        });
        await tx.authAuditLog.create({
          data: {
            userId: account.id,
            email: account.email,
            event: "ACCOUNT_TERMINATED_BLOCK",
            metadata: { deleted: true, deletedBy: session.user.id },
          },
        });
      });
    } catch (err) {
      if (err instanceof Error && err.message === "ALREADY_CHANGED") {
        return { success: false, error: "This account was just changed. Look it up again." };
      }
      console.error("[deleteAccount] Failed:", err);
      return { success: false, error: "Couldn't delete the account. Nothing was changed." };
    }
  }

  invalidateCacheTags(CACHE_TAGS.STAFF_ROSTER, CACHE_TAGS.STAFF_DIRECTORY, CACHE_TAGS.STAFF_CAPACITY);
  revalidatePath("/dashboard/admin/staff");
  revalidatePath("/dashboard/ceo");
  console.info("[deleteAccount] Account deleted", { userId: account.id, role: account.role, by: session.user.id });
  return { success: true, data: { email: account.email, fullName: account.fullName } };
}

