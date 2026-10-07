import { revalidatePath } from "next/cache";
import type { RoleName } from "@prisma/client";
import { db } from "@/lib/db";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache-tags";
import { computeSlaDueDate } from "@/lib/sla-calculator";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import { WORKING_STATUSES, rankVolunteers, specializationMatches } from "./rules";
import type { StudyVolunteerItem } from "./schemas";

// Server-only helpers (not server actions, so they can't be called from the browser).

/** A study's volunteers, first offer first, with open-study counts, field matches and the suggestion. */
export async function loadRankedVolunteers(projectId: string): Promise<StudyVolunteerItem[] | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      analysisGoals: true,
      volunteers: {
        orderBy: { createdAt: "asc" },
        include: {
          statistician: {
            select: {
              fullName: true,
              email: true,
              status: true,
              staffProfile: { select: { specializations: true } },
              _count: { select: { statisticianAssignments: { where: { isActive: true, project: { masterStatus: { in: [...WORKING_STATUSES] } } } } } },
            },
          },
        },
      },
    },
  });
  if (!project) return null;
  return rankVolunteers(
    project.volunteers.map((v, i) => {
      const specs = v.statistician.staffProfile?.specializations ?? [];
      return {
        statisticianId: v.statisticianId,
        fullName: v.statistician.fullName,
        email: v.statistician.email,
        status: v.statistician.status,
        specializations: specs,
        matches: specializationMatches(specs, project.analysisGoals),
        note: v.note,
        volunteeredAt: v.createdAt.toISOString(),
        order: i + 1,
        openStudies: v.statistician._count.statisticianAssignments,
        picked: !!v.pickedAt,
      };
    })
  );
}

export type AutoAssignOutcome =
  | { assigned: true; statisticianName: string; qaLeadName: string; how: "picked" | "suggested" }
  | { assigned: false; reason: "NOT_READY" | "NO_VOLUNTEER" | "ANALYST_UNAVAILABLE" | "NO_REVIEWER" };

/**
 * When a study is paid (Needs a Team) and has no team: assigns the analyst the admin picked, or else the
 * best-ranked volunteer, with the least busy available reviewer. Does nothing otherwise, so it's safe to call
 * more than once; two calls at the same moment can't both assign.
 */
export async function autoAssignVolunteer(projectId: string, actor: { id: string; role?: string | null }): Promise<AutoAssignOutcome> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      intakeId: true,
      researchTitle: true,
      masterStatus: true,
      assignment: { select: { isActive: true } },
      sows: { orderBy: { generatedAt: "desc" }, take: 1, select: { turnaroundDays: true } },
    },
  });
  if (!project || project.masterStatus !== "ACTIVE" || project.assignment?.isActive) return { assigned: false, reason: "NOT_READY" };

  const volunteers = (await loadRankedVolunteers(project.id)) ?? [];
  const picked = volunteers.find((v) => v.picked);
  const chosen = picked ?? volunteers.find((v) => v.suggested);
  if (!chosen) return { assigned: false, reason: "NO_VOLUNTEER" };
  if (chosen.status !== "ACTIVE") return { assigned: false, reason: "ANALYST_UNAVAILABLE" };
  const how = picked ? "picked" : "suggested";

  // The available reviewer with the fewest studies on hand.
  const reviewers = await db.user.findMany({
    where: { status: "ACTIVE", id: { not: chosen.statisticianId }, userRoles: { some: { role: { name: "SENIOR_QA_LEAD" } } } },
    select: {
      id: true,
      fullName: true,
      _count: { select: { qaAssignments: { where: { isActive: true, project: { masterStatus: { in: [...WORKING_STATUSES] } } } } } },
    },
  });
  const reviewer = reviewers.sort((a, b) => a._count.qaAssignments - b._count.qaAssignments || a.fullName.localeCompare(b.fullName))[0];
  if (!reviewer) return { assigned: false, reason: "NO_REVIEWER" };

  const now = new Date();
  const turnaround = project.sows[0]?.turnaroundDays || 5;
  const slaDueAt = await computeSlaDueDate(now, turnaround);

  const done = await db.$transaction(async (tx) => {
    const moved = await tx.project.updateMany({ where: { id: project.id, masterStatus: "ACTIVE" }, data: { masterStatus: "EXPERT_ASSIGNED" } });
    if (moved.count === 0) return false;
    const fields = {
      statisticianId: chosen.statisticianId,
      qaLeadId: reviewer.id,
      assignedBy: actor.id,
      assignedAt: now,
      slaStartAt: now,
      slaDueAt,
      slaPausedAt: null,
      slaPauseReason: null,
      slaPausedBy: null,
      slaApprovedBy: null,
      isActive: true,
    };
    await tx.assignment.upsert({ where: { projectId: project.id }, create: { projectId: project.id, ...fields }, update: fields });
    await tx.auditLog.create({
      data: {
        projectId: project.id,
        actorId: actor.id,
        actorRole: (actor.role as RoleName) || "ADMIN",
        action: "AUTO_ASSIGNED_VOLUNTEER",
        oldValue: "ACTIVE",
        newValue: "EXPERT_ASSIGNED",
        reason: `${how === "picked" ? "Admin's pick" : "First volunteer (suggested)"}: ${chosen.fullName}; reviewer ${reviewer.fullName} (fewest studies on hand).`,
      },
    });
    return true;
  });
  if (!done) return { assigned: false, reason: "NOT_READY" };

  revalidatePath(`/dashboard/admin/projects/${project.id}`);
  revalidatePath("/dashboard/statistician");
  revalidatePath("/dashboard/statistician/open-studies");
  revalidatePath("/dashboard/qa");
  invalidateCacheTags(CACHE_TAGS.STAFF_CAPACITY, CACHE_TAGS.PROJECTS);

  try {
    await dispatchRealtimeNotification({
      eventType: "ASSIGNMENT",
      projectId: project.id,
      intakeId: project.intakeId,
      title: `${project.intakeId} is yours`,
      message: `The deposit is in, so you're the analyst on "${project.researchTitle}". ${reviewer.fullName} reviews it. Due in ${turnaround} working days.`,
      linkUrl: `/dashboard/statistician/projects/${project.id}/workbench`,
      targetUserIds: [chosen.statisticianId],
    });
    await dispatchRealtimeNotification({
      eventType: "ASSIGNMENT",
      projectId: project.id,
      intakeId: project.intakeId,
      title: `New study to review: ${project.intakeId}`,
      message: `${chosen.fullName} is the analyst on "${project.researchTitle}". You'll get it when it's sent for review.`,
      linkUrl: `/dashboard/qa/projects/${project.id}/review`,
      targetUserIds: [reviewer.id],
    });
    await dispatchRealtimeNotification({
      eventType: "ASSIGNMENT",
      projectId: project.id,
      intakeId: project.intakeId,
      title: `Team assigned: ${project.intakeId}`,
      message: `The deposit cleared, so ${chosen.fullName} (${how === "picked" ? "your pick" : "suggested volunteer"}) and ${reviewer.fullName} were assigned automatically.`,
      linkUrl: `/dashboard/admin/projects/${project.id}`,
      targetRoles: ["ADMIN", "CEO"],
      excludeUserId: actor.id,
    });
    const others = volunteers.filter((v) => v.statisticianId !== chosen.statisticianId).map((v) => v.statisticianId);
    if (others.length) {
      await dispatchRealtimeNotification({
        eventType: "ASSIGNMENT",
        projectId: project.id,
        intakeId: project.intakeId,
        title: `${project.intakeId} went to another analyst`,
        message: `Thanks for offering. "${project.researchTitle}" was given to someone else this time.`,
        linkUrl: "/dashboard/statistician/open-studies",
        targetUserIds: others,
      });
    }
  } catch (e) {
    console.warn("[autoAssignVolunteer] Notification failed:", e);
  }
  return { assigned: true, statisticianName: chosen.fullName, qaLeadName: reviewer.fullName, how };
}
