"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import { clientPackageName } from "@/features/projects/client-packages";
import { devStudyDataEnabled } from "@/features/projects/dev-study-store";
import { autoAssignVolunteer, loadRankedVolunteers } from "./auto-assign";
import { devOpenStudies, devPick, devPickedStudies, devStudyVolunteers, devVolunteer, devVolunteerProjectIds, devWithdraw } from "./dev-volunteers";
import { kindOfRoles } from "./rules";
import {
  OPEN_FOR_VOLUNTEERS,
  OPEN_STAGE_LABEL,
  PickVolunteerSchema,
  VolunteerSchema,
  type OpenStudyItem,
  type StudyVolunteerItem,
  type VolunteerKind,
  type VolunteerResult,
} from "./schemas";

// "I'll take this study". Analysts and reviewers see studies without a team and offer to take them (as many as they
// like: there are far fewer reviewers than analysts, and every study needs one); admins and the CEO see the offers
// ranked by the owner's criteria (rules.ts) and may pick one of each; when the deposit clears the picks, or else the
// best-ranked volunteers, are assigned (auto-assign.ts).

const INTAKE_FILES = ["RESEARCH_DOCUMENT", "DATASET", "QUESTIONNAIRE"] as const;
const fail = (code: string, message: string) => ({ success: false as const, error: { code, message } });

/** The signed-in analyst or reviewer, with which kind of offer they make. */
async function volunteerUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = session.user.role;
  if (role === "STATISTICIAN") return { ...session.user, kind: "ANALYST" as VolunteerKind };
  if (role === "SENIOR_QA_LEAD") return { ...session.user, kind: "REVIEWER" as VolunteerKind };
  return null;
}
const OPEN_STUDIES_PATH: Record<VolunteerKind, string> = {
  ANALYST: "/dashboard/statistician/open-studies",
  REVIEWER: "/dashboard/qa/open-studies",
};
const KIND_WORD: Record<VolunteerKind, string> = { ANALYST: "analyst", REVIEWER: "reviewer" };
/** Prisma filter: offers made by people of one kind (by their role). */
const byKind = (kind: VolunteerKind) =>
  kind === "REVIEWER"
    ? { statistician: { userRoles: { some: { role: { name: "SENIOR_QA_LEAD" as const } }, none: { role: { name: "STATISTICIAN" as const } } } } }
    : { statistician: { NOT: { userRoles: { some: { role: { name: "SENIOR_QA_LEAD" as const } }, none: { role: { name: "STATISTICIAN" as const } } } } } };
async function manager() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user.role === "ADMIN" || session.user.role === "CEO" ? session.user : null;
}

/** Studies without a team, newest first, with the viewer's offer. Analysts and reviewers. */
export async function getOpenStudies(): Promise<VolunteerResult<OpenStudyItem[]>> {
  const me = await volunteerUser();
  if (!me) return fail("FORBIDDEN", "Only analysts and reviewers can see studies looking for a team.");
  try {
    const projects = await db.project.findMany({
      where: { masterStatus: { in: OPEN_FOR_VOLUNTEERS }, OR: [{ assignment: null }, { assignment: { isActive: false } }] },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        intakeId: true,
        researchTitle: true,
        masterStatus: true,
        createdAt: true,
        deadlineRequested: true,
        analysisGoals: true,
        packageName: true,
        researchQuestions: true,
        researchObjectives: true,
        clientNotes: true,
        hypotheses: true,
        // School and program only: no client name or contact details.
        client: { select: { clientProfile: { select: { institutionSchool: true, academicProgram: true } } } },
        files: {
          where: { fileCategory: { in: [...INTAKE_FILES] } },
          select: { id: true, projectId: true, fileName: true, filePath: true, fileType: true, fileCategory: true, uploadedAt: true },
          orderBy: { uploadedAt: "asc" },
        },
        // Only offers of the viewer's kind: an analyst's place in line is among analysts, a reviewer's among reviewers.
        volunteers: {
          where: byKind(me.kind),
          orderBy: { createdAt: "asc" },
          select: { statisticianId: true, note: true, createdAt: true, pickedAt: true },
        },
      },
    });
    return {
      success: true,
      data: projects.map((p) => {
        const place = p.volunteers.findIndex((v) => v.statisticianId === me.id);
        const mine = place >= 0 ? p.volunteers[place]! : null;
        return {
          id: p.id,
          intakeId: p.intakeId,
          researchTitle: p.researchTitle,
          masterStatus: p.masterStatus,
          stageLabel: OPEN_STAGE_LABEL[p.masterStatus] ?? p.masterStatus,
          createdAt: p.createdAt.toISOString(),
          deadlineRequested: p.deadlineRequested?.toISOString() ?? null,
          analysisGoals: p.analysisGoals ?? [],
          packageName: clientPackageName(p.packageName) ?? null,
          school: p.client.clientProfile?.institutionSchool ?? null,
          program: p.client.clientProfile?.academicProgram ?? null,
          researchQuestions: p.researchQuestions,
          researchObjectives: p.researchObjectives,
          clientNotes: p.clientNotes ?? null,
          hypotheses: p.hypotheses,
          files: p.files.map((f) => ({ ...f, fileCategory: f.fileCategory as string, uploadedAt: f.uploadedAt.toISOString() })),
          volunteerCount: p.volunteers.length,
          mine: mine ? { volunteeredAt: mine.createdAt.toISOString(), note: mine.note, picked: !!mine.pickedAt, place: place + 1 } : null,
          pickedSomeoneElse: p.volunteers.some((v) => v.pickedAt && v.statisticianId !== me.id),
        };
      }),
    };
  } catch (err) {
    if (devStudyDataEnabled()) return { success: true, data: devOpenStudies(me) };
    console.error("[getOpenStudies] Error:", err);
    return fail("SERVER_ERROR", "The studies didn't load. Please try again.");
  }
}

/** "I'll take this study". Once per person per study, only while it has no team; admins and the CEO are told. */
export async function volunteerForStudy(input: unknown): Promise<VolunteerResult<{ count: number }>> {
  const me = await volunteerUser();
  if (!me) return fail("FORBIDDEN", "Only analysts and reviewers can offer to take a study.");
  const parsed = VolunteerSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Check your note.");
  const { projectId } = parsed.data;
  const note = parsed.data.note?.trim() || null;

  try {
    const [user, project] = await Promise.all([
      db.user.findUnique({ where: { id: me.id }, select: { fullName: true, status: true } }),
      db.project.findUnique({
        where: { id: projectId },
        select: { id: true, intakeId: true, researchTitle: true, masterStatus: true, assignment: { select: { isActive: true } } },
      }),
    ]);
    if (!user || user.status !== "ACTIVE") return fail("UNAVAILABLE", "You can offer to take studies while you're active (not on leave).");
    if (!project || !OPEN_FOR_VOLUNTEERS.includes(project.masterStatus) || project.assignment?.isActive) {
      return fail("CLOSED", "This study already has a team.");
    }
    await db.studyVolunteer.create({ data: { projectId, statisticianId: me.id, note } });
    const count = await db.studyVolunteer.count({ where: { projectId, ...byKind(me.kind) } });
    const word = KIND_WORD[me.kind];

    revalidatePath(OPEN_STUDIES_PATH[me.kind]);
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    try {
      await dispatchRealtimeNotification({
        eventType: "ASSIGNMENT",
        projectId,
        intakeId: project.intakeId,
        title: me.kind === "REVIEWER" ? `${user.fullName} wants to review ${project.intakeId}` : `${user.fullName} wants to take ${project.intakeId}`,
        message: `${count === 1 ? `First ${word} offer` : `${word[0]!.toUpperCase()}${word.slice(1)} offer ${count}`} for "${project.researchTitle}".${note ? ` Note: ${note}` : ""} See the volunteers on the study page.`,
        linkUrl: `/dashboard/admin/projects/${projectId}`,
        targetRoles: ["ADMIN", "CEO"],
      });
    } catch (e) {
      console.warn("[volunteerForStudy] Notification failed:", e);
    }

    return { success: true, data: { count } };
  } catch (err) {
    // Two clicks at once: the second hits the one-offer-per-study rule.
    if ((err as { code?: string }).code === "P2002") return fail("ALREADY", "You already offered to take this study.");
    if (devStudyDataEnabled()) return devVolunteer(projectId, me, note);
    console.error("[volunteerForStudy] Error:", err);
    return fail("SERVER_ERROR", "Your offer didn't go through. Please try again.");
  }
}

/** Take back an offer. If the admin had picked you, they're told. */
export async function withdrawVolunteer(projectId: string): Promise<VolunteerResult<{ wasPicked: boolean }>> {
  const me = await volunteerUser();
  if (!me) return fail("FORBIDDEN", "Only analysts and reviewers can do this.");
  try {
    const row = await db.studyVolunteer.findUnique({
      where: { projectId_statisticianId: { projectId, statisticianId: me.id } },
      include: { project: { select: { intakeId: true } }, statistician: { select: { fullName: true } } },
    });
    if (!row) return fail("NOT_FOUND", "You hadn't offered to take this study.");
    await db.studyVolunteer.delete({ where: { id: row.id } });
    revalidatePath(OPEN_STUDIES_PATH[me.kind]);
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    if (row.pickedAt) {
      try {
        await dispatchRealtimeNotification({
          eventType: "ASSIGNMENT",
          projectId,
          intakeId: row.project.intakeId,
          title: `${row.statistician.fullName} withdrew from ${row.project.intakeId}`,
          message: `They were your pick. Pick another ${KIND_WORD[me.kind]} on the study page, or the best-ranked volunteer is assigned when the deposit clears.`,
          linkUrl: `/dashboard/admin/projects/${projectId}`,
          targetRoles: ["ADMIN", "CEO"],
        });
      } catch (e) {
        console.warn("[withdrawVolunteer] Notification failed:", e);
      }
    }
    return { success: true, data: { wasPicked: !!row.pickedAt } };
  } catch (err) {
    if (devStudyDataEnabled()) return devWithdraw(projectId, me);
    console.error("[withdrawVolunteer] Error:", err);
    return fail("SERVER_ERROR", "That didn't go through. Please try again.");
  }
}

/** Who offered to take a study, ranked by the criteria. Admins and the CEO. */
export async function getStudyVolunteers(projectId: string): Promise<VolunteerResult<StudyVolunteerItem[]>> {
  const me = await manager();
  if (!me) return fail("FORBIDDEN", "Only admins and the CEO can see who offered.");
  try {
    const rows = await loadRankedVolunteers(projectId);
    if (!rows) return fail("NOT_FOUND", "Study not found.");
    return { success: true, data: rows };
  } catch (err) {
    if (devStudyDataEnabled()) return { success: true, data: devStudyVolunteers(projectId) };
    console.error("[getStudyVolunteers] Error:", err);
    return fail("SERVER_ERROR", "The volunteers didn't load.");
  }
}

/**
 * The admin picks the analyst or the reviewer (or clears that pick with null, so the best-ranked volunteer is used).
 * One pick of each kind per study. If the study is already paid and has no team, the team is assigned right away;
 * otherwise when the deposit clears.
 */
export async function pickVolunteer(input: unknown): Promise<VolunteerResult<{ assigned: boolean }>> {
  const me = await manager();
  if (!me) return fail("FORBIDDEN", "Only admins and the CEO can pick the analyst.");
  const parsed = PickVolunteerSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Choose an analyst or a reviewer.");
  const { projectId, statisticianId } = parsed.data;
  let kind: VolunteerKind = parsed.data.kind;

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { intakeId: true, researchTitle: true, masterStatus: true, assignment: { select: { isActive: true } } },
    });
    if (!project || !OPEN_FOR_VOLUNTEERS.includes(project.masterStatus) || project.assignment?.isActive) {
      return fail("CLOSED", "This study already has a team. Change it on the Team card instead.");
    }
    const ok = await db.$transaction(async (tx) => {
      if (statisticianId) {
        const row = await tx.studyVolunteer.findUnique({
          where: { projectId_statisticianId: { projectId, statisticianId } },
          include: { statistician: { select: { status: true, userRoles: { select: { role: { select: { name: true } } } } } } },
        });
        if (!row) return "NOT_FOUND";
        if (row.statistician.status !== "ACTIVE") return "UNAVAILABLE";
        kind = kindOfRoles(row.statistician.userRoles.map((r) => r.role.name));
      }
      // One pick per study for each kind (an analyst and a reviewer).
      await tx.studyVolunteer.updateMany({ where: { projectId, ...byKind(kind) }, data: { pickedAt: null, pickedBy: null } });
      if (statisticianId) {
        await tx.studyVolunteer.update({
          where: { projectId_statisticianId: { projectId, statisticianId } },
          data: { pickedAt: new Date(), pickedBy: me.id },
        });
      }
      return "OK";
    });
    if (ok === "NOT_FOUND") return fail("NOT_FOUND", "That person didn't offer to take this study.");
    if (ok === "UNAVAILABLE") return fail("UNAVAILABLE", "That person is on leave or not active right now.");

    revalidatePath(`/dashboard/admin/projects/${projectId}`);
    revalidatePath(OPEN_STUDIES_PATH[kind]);

    // Picking on a study that's already paid assigns right away; otherwise it waits for the deposit.
    const outcome = statisticianId ? await autoAssignVolunteer(projectId, { id: me.id, role: me.role }) : { assigned: false as const };
    if (!outcome.assigned && statisticianId) {
      try {
        await dispatchRealtimeNotification({
          eventType: "ASSIGNMENT",
          projectId,
          intakeId: project.intakeId,
          title: `You were picked for ${project.intakeId}`,
          message:
            kind === "REVIEWER"
              ? `You'll review "${project.researchTitle}" once the client pays the deposit. You'll be told when it starts.`
              : `"${project.researchTitle}" will be yours once the client pays the deposit. You'll be told when it starts.`,
          linkUrl: OPEN_STUDIES_PATH[kind],
          targetUserIds: [statisticianId],
        });
      } catch (e) {
        console.warn("[pickVolunteer] Notification failed:", e);
      }
    }
    return { success: true, data: { assigned: outcome.assigned } };
  } catch (err) {
    if (devStudyDataEnabled()) return devPick(projectId, statisticianId, me, kind);
    console.error("[pickVolunteer] Error:", err);
    return fail("SERVER_ERROR", "The pick wasn't saved. Please try again.");
  }
}

/** For the Studies list: per study without a team, how many analysts offered (and which one is picked) and how many
 * reviewers offered. */
export type VolunteerSummary = Record<string, { count: number; picked: string | null; reviewers?: number }>;
export async function getVolunteerSummary(): Promise<VolunteerResult<VolunteerSummary>> {
  const me = await manager();
  if (!me) return fail("FORBIDDEN", "Only admins and the CEO can see offers.");
  try {
    const rows = await db.studyVolunteer.findMany({
      where: { project: { masterStatus: { in: OPEN_FOR_VOLUNTEERS } } },
      select: {
        projectId: true,
        pickedAt: true,
        statistician: { select: { fullName: true, userRoles: { select: { role: { select: { name: true } } } } } },
      },
    });
    const out: VolunteerSummary = {};
    for (const r of rows) {
      const o = (out[r.projectId] ??= { count: 0, picked: null, reviewers: 0 });
      if (kindOfRoles(r.statistician.userRoles.map((x) => x.role.name)) === "REVIEWER") {
        o.reviewers = (o.reviewers ?? 0) + 1;
        continue;
      }
      o.count += 1;
      if (r.pickedAt) o.picked = r.statistician.fullName;
    }
    return { success: true, data: out };
  } catch (err) {
    if (devStudyDataEnabled()) {
      const out: VolunteerSummary = {};
      for (const id of devVolunteerProjectIds()) {
        const all = devStudyVolunteers(id);
        const v = all.filter((x) => x.kind === "ANALYST");
        out[id] = { count: v.length, picked: v.find((x) => x.picked)?.fullName ?? null, reviewers: all.length - v.length };
      }
      return { success: true, data: out };
    }
    console.error("[getVolunteerSummary] Error:", err);
    return fail("SERVER_ERROR", "Offers didn't load.");
  }
}

export interface PickedStudy {
  projectId: string;
  intakeId: string;
  researchTitle: string;
  stageLabel: string;
  statisticianId: string;
  fullName: string;
  pickedAt: string;
}

/** Analysts the admin picked for studies that don't have a team yet (Assign Experts page). */
export async function getPickedStudies(): Promise<VolunteerResult<PickedStudy[]>> {
  const me = await manager();
  if (!me) return fail("FORBIDDEN", "Only admins and the CEO can see picks.");
  try {
    const rows = await db.studyVolunteer.findMany({
      where: { pickedAt: { not: null }, project: { masterStatus: { in: OPEN_FOR_VOLUNTEERS } }, ...byKind("ANALYST") },
      orderBy: { pickedAt: "asc" },
      select: {
        pickedAt: true,
        statisticianId: true,
        statistician: { select: { fullName: true } },
        project: { select: { id: true, intakeId: true, researchTitle: true, masterStatus: true, assignment: { select: { isActive: true } } } },
      },
    });
    return {
      success: true,
      data: rows
        .filter((r) => !r.project.assignment?.isActive)
        .map((r) => ({
          projectId: r.project.id,
          intakeId: r.project.intakeId,
          researchTitle: r.project.researchTitle,
          stageLabel: OPEN_STAGE_LABEL[r.project.masterStatus] ?? r.project.masterStatus,
          statisticianId: r.statisticianId,
          fullName: r.statistician.fullName,
          pickedAt: r.pickedAt!.toISOString(),
        })),
    };
  } catch (err) {
    if (devStudyDataEnabled()) return { success: true, data: devPickedStudies() };
    console.error("[getPickedStudies] Error:", err);
    return fail("SERVER_ERROR", "Picks didn't load.");
  }
}
