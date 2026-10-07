"use server";

import { normalizeFacebook, normalizeInstagram } from "@/lib/person-rules";
import { devReadSocials, devSaveSocials, devSocialsEnabled, devStudyClientEmail } from "./dev-socials";
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
          message: "Please check the highlighted fields.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { institutionSchool, academicProgram, contactNumber, region } = parsed.data;
    // Facebook and Instagram only, saved as clean links.
    const facebookUrl = normalizeFacebook(parsed.data.facebookUrl);
    const instagramUrl = normalizeInstagram(parsed.data.instagramUrl);
    const socialErrors: Record<string, string[]> = {};
    if (facebookUrl === "INVALID") socialErrors.facebookUrl = ["Paste the link to your Facebook profile, e.g. facebook.com/your.name"];
    if (instagramUrl === "INVALID") socialErrors.instagramUrl = ["Enter your Instagram username or link, e.g. @your.name"];
    if (Object.keys(socialErrors).length) {
      return { success: false, error: { message: "Please check the highlighted fields.", fieldErrors: socialErrors } };
    }
    // Left out (e.g. the quick profile window): keep what's saved.
    const socials = {
      ...(parsed.data.facebookUrl !== undefined ? { facebookUrl: facebookUrl as string | null } : {}),
      ...(parsed.data.instagramUrl !== undefined ? { instagramUrl: instagramUrl as string | null } : {}),
    };

    try {
      await withDbTimeout(
        db.clientProfile.upsert({
          where: { userId: resolvedUserId },
          update: {
            institutionSchool,
            academicProgram,
            contactNumber,
            region,
            ...socials,
          },
          create: {
            userId: resolvedUserId,
            institutionSchool,
            academicProgram,
            contactNumber,
            region,
            ...socials,
          },
        })
      );
    } catch (dbErr) {
      // Offline mode keeps a copy in a cookie; on the live site a failed save must say so (it used to say "saved").
      if (process.env.NODE_ENV === "production" || process.env.JAXIS_OFFLINE !== "1") {
        console.error("[upsertClientProfile] Save failed:", dbErr);
        return { success: false, error: { message: "We couldn't save your details. Please try again." } };
      }
      console.warn("[upsertClientProfile] DB offline, keeping the cookie copy", dbErr);
      // Offline: also where the admin's browser can read them.
      if (Object.keys(socials).length) devSaveSocials(session.user.email ?? "", socials);
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
        ...socials,
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
    return { success: false, error: { message: "We couldn't save your details. Please try again." } };
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

/**
 * A study's client's Facebook and Instagram, and whether they have a photo, for the admin and CEO study page.
 * Admins and the CEO only: analysts and reviewers never get a client's social accounts.
 */
export async function getClientContactForManagers(projectId: string): Promise<{ facebookUrl: string | null; instagramUrl: string | null; clientId: string } | null> {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "CEO") return null;
  try {
    const p = await withDbTimeout(
      db.project.findUnique({
        where: { id: projectId },
        select: { clientId: true, client: { select: { clientProfile: { select: { facebookUrl: true, instagramUrl: true } } } } },
      })
    );
    if (!p) return null;
    return { clientId: p.clientId, facebookUrl: p.client.clientProfile?.facebookUrl ?? null, instagramUrl: p.client.clientProfile?.instagramUrl ?? null };
  } catch {
    if (devSocialsEnabled()) {
      const c = devStudyClientEmail(projectId);
      const saved = c ? devReadSocials(c.email) : null;
      if (c) return { clientId: c.clientId, facebookUrl: saved?.facebookUrl ?? null, instagramUrl: saved?.instagramUrl ?? null };
    }
    return null;
  }
}
