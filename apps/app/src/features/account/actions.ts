"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDevUserByEmail, registerDevUser } from "@/lib/mock-data/users.data";
import { AVATAR_EXTENSIONS, AvatarSchema, NameSchema, avatarFolder, composeFullName, splitFullName } from "@/lib/person-rules";
import { hasAllowedExtension } from "@/lib/file-types";
import type { RoleName } from "@prisma/client";

// My Profile for every role: first and last name, and a profile photo.

export interface MyAccount {
  id: string;
  email: string;
  role: string;
  fullName: string;
  firstName: string;
  lastName: string;
  /** /api/avatar/{id}?v=…, or null without a photo. */
  avatarUrl: string | null;
}

type Result<T> = { success: true; data: T } | { success: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
const fail = (code: string, message: string, fieldErrors?: Record<string, string[]>) => ({ success: false as const, error: { code, message, fieldErrors } });
const offline = () => process.env.NODE_ENV !== "production" && process.env.JAXIS_OFFLINE === "1";

/** The photo link for a user (the version makes a new photo show at once instead of a cached old one). */
function avatarUrlFor(userId: string, avatarPath: string | null | undefined) {
  if (!avatarPath) return null;
  const v = /\/(\d+)-/.exec(avatarPath)?.[1] ?? "1";
  return `/api/avatar/${encodeURIComponent(userId)}?v=${v}`;
}

function shape(u: { id: string; email: string; fullName: string; firstName?: string | null; lastName?: string | null; avatarPath?: string | null }, role: string): MyAccount {
  const guess = splitFullName(u.fullName);
  const hasParts = !!(u.firstName || u.lastName);
  return {
    id: u.id,
    email: u.email,
    role,
    fullName: u.fullName,
    firstName: hasParts ? (u.firstName ?? "") : guess.firstName,
    lastName: hasParts ? (u.lastName ?? "") : guess.lastName,
    avatarUrl: avatarUrlFor(u.id, u.avatarPath),
  };
}

async function me() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, email: session.user.email ?? "", role: (session.user.role as string) || "CLIENT" };
}

export async function getMyAccount(): Promise<Result<MyAccount>> {
  const s = await me();
  if (!s) return fail("UNAUTHORIZED", "Please sign in again.");
  try {
    const u = await db.user.findUnique({
      where: { id: s.id },
      select: { id: true, email: true, fullName: true, firstName: true, lastName: true, avatarPath: true },
    });
    if (!u) throw new Error("NOT_FOUND");
    return { success: true, data: shape(u, s.role) };
  } catch (err) {
    if (offline()) {
      const dev = getDevUserByEmail(s.email);
      if (dev) return { success: true, data: shape(dev, s.role) };
    }
    console.error("[getMyAccount] Error:", err);
    return fail("SERVER_ERROR", "Your profile didn't load.");
  }
}

/** First and last name; the full name everywhere is built from them. */
export async function updateMyName(input: unknown): Promise<Result<MyAccount>> {
  const s = await me();
  if (!s) return fail("UNAUTHORIZED", "Please sign in again.");
  const parsed = NameSchema.safeParse(input);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Check your name.", fe);
  }
  const { firstName, lastName } = parsed.data;
  const fullName = composeFullName(firstName, lastName);

  try {
    const before = await db.user.findUnique({ where: { id: s.id }, select: { fullName: true } });
    if (!before) throw new Error("NOT_FOUND");
    const u = await db.user.update({
      where: { id: s.id },
      data: { firstName, lastName, fullName },
      select: { id: true, email: true, fullName: true, firstName: true, lastName: true, avatarPath: true },
    });
    if (before.fullName !== fullName) {
      // Names appear on agreements, certificates and payslips, so a change is kept on record.
      await db.auditLog
        .create({ data: { actorId: s.id, actorRole: s.role as RoleName, action: "NAME_CHANGED", oldValue: before.fullName, newValue: fullName } })
        .catch(() => null);
    }
    revalidatePath("/dashboard", "layout");
    return { success: true, data: shape(u, s.role) };
  } catch (err) {
    if (offline()) {
      const dev = getDevUserByEmail(s.email);
      if (dev) {
        registerDevUser({ ...dev, firstName, lastName, fullName });
        revalidatePath("/dashboard", "layout");
        return { success: true, data: shape({ ...dev, firstName, lastName, fullName }, s.role) };
      }
    }
    console.error("[updateMyName] Error:", err);
    return fail("SERVER_ERROR", "Your name wasn't saved. Please try again.");
  }
}

/** Uses a photo just uploaded (with category AVATAR) as the profile photo. Only one from the person's own folder. */
export async function updateMyAvatar(input: unknown): Promise<Result<{ avatarUrl: string }>> {
  const s = await me();
  if (!s) return fail("UNAUTHORIZED", "Please sign in again.");
  const parsed = AvatarSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Choose a photo.");
  const key = parsed.data.storageKey;
  const ownFolders = [avatarFolder(s.id)];
  if (offline()) {
    const dev = getDevUserByEmail(s.email);
    if (dev) ownFolders.push(avatarFolder(dev.id));
  }
  if (!ownFolders.some((f) => key.startsWith(f)) || key.includes("..") || !hasAllowedExtension(key, AVATAR_EXTENSIONS)) {
    return fail("INVALID_FILE", "That photo wasn't uploaded for your account. Please choose it again.");
  }
  try {
    await db.user.update({ where: { id: s.id }, data: { avatarPath: key } });
    revalidatePath("/dashboard", "layout");
    return { success: true, data: { avatarUrl: avatarUrlFor(s.id, key)! } };
  } catch (err) {
    if (offline()) {
      const dev = getDevUserByEmail(s.email);
      if (dev) {
        registerDevUser({ ...dev, avatarPath: key });
        revalidatePath("/dashboard", "layout");
        return { success: true, data: { avatarUrl: avatarUrlFor(dev.id, key)! } };
      }
    }
    console.error("[updateMyAvatar] Error:", err);
    return fail("SERVER_ERROR", "Your photo wasn't saved. Please try again.");
  }
}

export async function removeMyAvatar(): Promise<Result<null>> {
  const s = await me();
  if (!s) return fail("UNAUTHORIZED", "Please sign in again.");
  try {
    await db.user.update({ where: { id: s.id }, data: { avatarPath: null } });
    revalidatePath("/dashboard", "layout");
    return { success: true, data: null };
  } catch (err) {
    if (offline()) {
      const dev = getDevUserByEmail(s.email);
      if (dev) {
        registerDevUser({ ...dev, avatarPath: null });
        revalidatePath("/dashboard", "layout");
        return { success: true, data: null };
      }
    }
    console.error("[removeMyAvatar] Error:", err);
    return fail("SERVER_ERROR", "Your photo wasn't removed. Please try again.");
  }
}
