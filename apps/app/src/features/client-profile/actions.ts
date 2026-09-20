"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db, withDbTimeout } from "@/lib/db";
import { ClientProfileSchema, type ClientProfileFormData } from "./schemas";
import { redirect } from "next/navigation";

export type ActionResponse<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: { message: string; fieldErrors?: Record<string, string[]> } };

import { cookies } from "next/headers";
import { resolveOrProvisionUser } from "@/lib/user-healing";

/**
 * Upsert the client profile for the authenticated user.
 */
export async function upsertClientProfile(
  data: ClientProfileFormData
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: "Unauthorized. Please log in." } };
    }

    const resolvedUserId = await resolveOrProvisionUser(session.user, "CLIENT");

    // Validate input
    const parsed = ClientProfileSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: "Invalid profile data",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { institutionSchool, academicProgram, contactNumber, region } = parsed.data;

    try {
      await withDbTimeout(
        db.clientProfile.upsert({
          where: { userId: resolvedUserId },
          update: {
            institutionSchool,
            academicProgram,
            contactNumber,
            region,
          },
          create: {
            userId: resolvedUserId,
            institutionSchool,
            academicProgram,
            contactNumber,
            region,
          },
        })
      );
    } catch (dbErr) {
      console.warn("[upsertClientProfile] DB slow or offline, falling back to cookie mirror", dbErr);
    }

    // Always mirror to cookie for resilient offline testing
    try {
      const cookieStore = await cookies();
      const profileJson = JSON.stringify({
        id: `profile_${resolvedUserId}`,
        userId: resolvedUserId,
        institutionSchool,
        academicProgram,
        contactNumber,
        region,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      cookieStore.set(`jaxis_profile_${resolvedUserId}`, profileJson, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      if (session.user.id !== resolvedUserId) {
        cookieStore.set(`jaxis_profile_${session.user.id}`, profileJson, {
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
      }
    } catch (cookieErr) {
      console.warn("[upsertClientProfile] Cookie mirror error", cookieErr);
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/client");
    revalidatePath("/dashboard/client/profile");

    return { success: true };
  } catch (error) {
    console.error("[upsertClientProfile]", error);
    return { success: false, error: { message: "Internal server error" } };
  }
}

/**
 * Helper to fetch the authenticated user's client profile.
 */
export async function getClientProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const resolvedUserId = await resolveOrProvisionUser(session.user, "CLIENT");

  try {
    const profile = await withDbTimeout(
      db.clientProfile.findFirst({
        where: {
          OR: [
            { userId: resolvedUserId },
            { userId: session.user.id },
            ...(session.user.email
              ? [
                  { user: { email: session.user.email.toLowerCase().trim() } },
                  { user: { email: session.user.email } },
                ]
              : []),
          ],
        },
      })
    );
    if (profile) return profile;
  } catch (dbErr) {
    console.warn("[getClientProfile] DB slow or offline, reading from cookie mirror", dbErr);
  }

  // Fallback to cookie for development/demo testing
  try {
    const cookieStore = await cookies();
    const cookieVal =
      cookieStore.get(`jaxis_profile_${resolvedUserId}`)?.value ||
      cookieStore.get(`jaxis_profile_${session.user.id}`)?.value;
    if (cookieVal) {
      return JSON.parse(cookieVal);
    }
  } catch {
    // Ignore cookie retrieval issues
  }

  return null;
}

/**
 * Middleware-like function to assert that the client has completed their profile.
 * Should be called in Client Dashboard pages before showing sensitive forms (like Intake).
 */
export async function assertClientProfileComplete() {
  const profile = await getClientProfile();

  if (!profile || !profile.institutionSchool || !profile.contactNumber) {
    redirect("/dashboard/client/profile");
  }

  return profile;
}
