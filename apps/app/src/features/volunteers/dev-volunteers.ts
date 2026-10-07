import fs from "fs";
import path from "path";
import type { ProjectStatus } from "@prisma/client";
import { getDevUserByEmail, getDevUsers } from "@/lib/mock-data/users.data";
import { clientPackageName } from "@/features/projects/client-packages";
import { OPEN_FOR_VOLUNTEERS, OPEN_STAGE_LABEL, type OpenStudyItem, type StudyVolunteerItem } from "./schemas";
import { WORKING_STATUSES, rankVolunteers, specializationMatches } from "./rules";

/**
 * Offline dev only (`npm run dev:offline`): volunteering on the sample studies in .dev-projects.json, kept in
 * .dev-volunteers.json, with the same rules as the database version. Never used in production.
 */

type User = { id?: string | null; email?: string | null; role?: string | null };
type DevVolunteer = { projectId: string; statisticianId: string; note: string | null; createdAt: string; pickedAt: string | null; pickedBy: string | null };
type DevProject = {
  id: string;
  intakeId: string;
  researchTitle: string;
  researchQuestions?: string | null;
  researchObjectives?: string | null;
  hypotheses?: string | null;
  masterStatus: string;
  packageName?: string | null;
  analysisGoals?: string[];
  createdAt: string;
  deadlineRequested?: string | null;
  client?: { clientProfile?: { institutionSchool?: string; academicProgram?: string } };
  assignment?: Record<string, unknown> | null;
  files?: Array<{ id: string; fileName: string; filePath: string; fileType?: string; fileCategory?: string; uploadedAt?: string }>;
};
type Result<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

const FILES = {
  projects: path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-projects.json"),
  volunteers: path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-volunteers.json"),
};
function read<T>(f: string): T[] {
  try {
    return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf-8")) as T[]) : [];
  } catch {
    return [];
  }
}
const write = (f: string, rows: unknown[]) => fs.writeFileSync(f, JSON.stringify(rows, null, 2), "utf-8");

const myId = (user: User) => (user.email ? getDevUserByEmail(user.email)?.id : undefined) ?? user.id ?? "";
const staff = () => Object.values(getDevUsers());
const assigned = (p: DevProject) => !!(p.assignment as { statisticianId?: string } | null)?.statisticianId;
const isOpen = (p: DevProject) => OPEN_FOR_VOLUNTEERS.includes(p.masterStatus as ProjectStatus) && !assigned(p);
const working = (projects: DevProject[], id: string, key: "statisticianId" | "qaLeadId") =>
  projects.filter((p) => (p.assignment as Record<string, unknown> | null)?.[key] === id && (WORKING_STATUSES as readonly string[]).includes(p.masterStatus)).length;

export function devOpenStudies(user: User): OpenStudyItem[] {
  const me = myId(user);
  const vols = read<DevVolunteer>(FILES.volunteers);
  return read<DevProject>(FILES.projects)
    .filter(isOpen)
    .map((p) => {
      const forThis = vols.filter((v) => v.projectId === p.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const place = forThis.findIndex((v) => v.statisticianId === me);
      const mine = place >= 0 ? forThis[place]! : null;
      return {
        id: p.id,
        intakeId: p.intakeId,
        researchTitle: p.researchTitle,
        masterStatus: p.masterStatus as ProjectStatus,
        stageLabel: OPEN_STAGE_LABEL[p.masterStatus as ProjectStatus] ?? p.masterStatus,
        createdAt: p.createdAt,
        deadlineRequested: p.deadlineRequested ?? null,
        analysisGoals: p.analysisGoals ?? [],
        packageName: clientPackageName(p.packageName) ?? null,
        school: p.client?.clientProfile?.institutionSchool ?? null,
        program: p.client?.clientProfile?.academicProgram ?? null,
        researchQuestions: p.researchQuestions ?? "",
        researchObjectives: p.researchObjectives ?? "",
        hypotheses: p.hypotheses ?? null,
        files: (p.files ?? [])
          .filter((f) => ["RESEARCH_DOCUMENT", "DATASET", "QUESTIONNAIRE"].includes(f.fileCategory ?? "RESEARCH_DOCUMENT"))
          .map((f) => ({
            id: f.id,
            projectId: p.id,
            fileName: f.fileName,
            filePath: f.filePath,
            fileType: f.fileType ?? "application/octet-stream",
            fileCategory: f.fileCategory ?? "RESEARCH_DOCUMENT",
            uploadedAt: f.uploadedAt ?? p.createdAt,
          })),
        volunteerCount: forThis.length,
        mine: mine ? { volunteeredAt: mine.createdAt, note: mine.note, picked: !!mine.pickedAt, place: place + 1 } : null,
        pickedSomeoneElse: forThis.some((v) => v.pickedAt && v.statisticianId !== me),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function devVolunteer(projectId: string, user: User, note: string | null): Result<{ count: number }> {
  const me = myId(user);
  const p = read<DevProject>(FILES.projects).find((x) => x.id === projectId);
  if (!p || !isOpen(p)) return { success: false, error: { code: "CLOSED", message: "This study already has a team." } };
  const vols = read<DevVolunteer>(FILES.volunteers);
  if (vols.some((v) => v.projectId === projectId && v.statisticianId === me)) return { success: false, error: { code: "ALREADY", message: "You already offered to take this study." } };
  vols.push({ projectId, statisticianId: me, note, createdAt: new Date().toISOString(), pickedAt: null, pickedBy: null });
  write(FILES.volunteers, vols);
  return { success: true, data: { count: vols.filter((v) => v.projectId === projectId).length } };
}

export function devWithdraw(projectId: string, user: User): Result<{ wasPicked: boolean }> {
  const me = myId(user);
  const vols = read<DevVolunteer>(FILES.volunteers);
  const mine = vols.find((v) => v.projectId === projectId && v.statisticianId === me);
  if (!mine) return { success: false, error: { code: "NOT_FOUND", message: "You hadn't offered to take this study." } };
  write(FILES.volunteers, vols.filter((v) => v !== mine));
  return { success: true, data: { wasPicked: !!mine.pickedAt } };
}

export function devStudyVolunteers(projectId: string): StudyVolunteerItem[] {
  const projects = read<DevProject>(FILES.projects);
  const p = projects.find((x) => x.id === projectId);
  const people = staff();
  return rankVolunteers(
    read<DevVolunteer>(FILES.volunteers)
      .filter((v) => v.projectId === projectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((v, i) => {
        const u = people.find((x) => x.id === v.statisticianId);
        const specs = u?.staffProfile?.specializations ?? [];
        return {
          statisticianId: v.statisticianId,
          fullName: u?.fullName ?? "Analyst",
          email: u?.email ?? "",
          status: u?.status ?? "ACTIVE",
          specializations: specs,
          matches: specializationMatches(specs, p?.analysisGoals),
          note: v.note,
          volunteeredAt: v.createdAt,
          order: i + 1,
          openStudies: working(projects, v.statisticianId, "statisticianId"),
          picked: !!v.pickedAt,
        };
      })
  );
}

/** Pick (or clear with null), then assign right away if the study is already paid. */
export function devPick(projectId: string, statisticianId: string | null, user: User): Result<{ assigned: boolean }> {
  const p = read<DevProject>(FILES.projects).find((x) => x.id === projectId);
  if (!p || !isOpen(p)) return { success: false, error: { code: "CLOSED", message: "This study already has a team." } };
  const vols = read<DevVolunteer>(FILES.volunteers);
  if (statisticianId && !vols.some((v) => v.projectId === projectId && v.statisticianId === statisticianId)) {
    return { success: false, error: { code: "NOT_FOUND", message: "That analyst didn't offer to take this study." } };
  }
  const now = new Date().toISOString();
  for (const v of vols) {
    if (v.projectId !== projectId) continue;
    const isPick = v.statisticianId === statisticianId;
    v.pickedAt = isPick ? now : null;
    v.pickedBy = isPick ? myId(user) : null;
  }
  write(FILES.volunteers, vols);
  return { success: true, data: { assigned: statisticianId ? devAutoAssign(projectId) : false } };
}

/** Offline version of autoAssignVolunteer: the pick, or else the best-ranked volunteer. */
export function devAutoAssign(projectId: string): boolean {
  const projects = read<DevProject>(FILES.projects);
  const p = projects.find((x) => x.id === projectId);
  if (!p || p.masterStatus !== "ACTIVE" || assigned(p)) return false;
  const ranked = devStudyVolunteers(projectId);
  const chosen = ranked.find((v) => v.picked) ?? ranked.find((v) => v.suggested);
  const people = staff();
  const analyst = chosen ? people.find((u) => u.id === chosen.statisticianId) : undefined;
  const reviewer = people
    .filter((u) => u.role === "SENIOR_QA_LEAD" && u.status === "ACTIVE")
    .sort((a, b) => working(projects, a.id, "qaLeadId") - working(projects, b.id, "qaLeadId"))[0];
  if (!analyst || analyst.status !== "ACTIVE" || !reviewer) return false;
  const now = new Date();
  p.assignment = {
    statisticianId: analyst.id,
    qaLeadId: reviewer.id,
    statistician: { fullName: analyst.fullName, email: analyst.email },
    qaLead: { fullName: reviewer.fullName, email: reviewer.email },
    assignedAt: now.toISOString(),
    slaDueAt: new Date(now.getTime() + 5 * 864e5).toISOString(),
  };
  p.masterStatus = "EXPERT_ASSIGNED";
  write(FILES.projects, projects);
  return true;
}

/** Studies with at least one offer (for the admin's Studies list). */
export function devVolunteerProjectIds(): string[] {
  return [...new Set(read<DevVolunteer>(FILES.volunteers).map((v) => v.projectId))];
}

/** Offline: picked analysts on studies without a team. */
export function devPickedStudies() {
  const projects = read<DevProject>(FILES.projects);
  const people = staff();
  return read<DevVolunteer>(FILES.volunteers)
    .filter((v) => v.pickedAt)
    .flatMap((v) => {
      const p = projects.find((x) => x.id === v.projectId);
      if (!p || !isOpen(p)) return [];
      return [{
        projectId: p.id,
        intakeId: p.intakeId,
        researchTitle: p.researchTitle,
        stageLabel: OPEN_STAGE_LABEL[p.masterStatus as ProjectStatus] ?? p.masterStatus,
        statisticianId: v.statisticianId,
        fullName: people.find((u) => u.id === v.statisticianId)?.fullName ?? "Analyst",
        pickedAt: v.pickedAt!,
      }];
    });
}
