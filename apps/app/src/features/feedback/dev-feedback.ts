import fs from "fs";
import path from "path";
import { getDevUserByEmail } from "@/lib/mock-data/users.data";
import { asNameStyle, editableUntil } from "./rules";
import type { ClientFeedbackState, FeedbackItem, SubmitFeedbackInput } from "./schemas";

/**
 * Offline dev only (`npm run dev:offline`): client feedback on the sample studies in .dev-projects.json, kept in
 * .dev-feedback.json. A sample study counts as finished when it's delivered or closed (the sample data has no file
 * release records). Never used in production.
 */

type DevFeedback = {
  id: string;
  projectId: string;
  clientId: string;
  rating: number;
  wentWell: string | null;
  couldImprove: string | null;
  showOnWebsite: boolean;
  nameStyle: string;
  displayNames: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
};
type DevProject = {
  id: string;
  intakeId: string;
  researchTitle: string;
  masterStatus: string;
  clientId?: string;
  client?: { id?: string; email?: string; fullName?: string; clientProfile?: { institutionSchool?: string; academicProgram?: string } };
  assignment?: { statistician?: { fullName?: string }; qaLead?: { fullName?: string } } | null;
};

const FILES = {
  projects: path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-projects.json"),
  feedback: path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-feedback.json"),
};
function read<T>(f: string): T[] {
  try {
    return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf-8")) as T[]) : [];
  } catch {
    return [];
  }
}
const write = (f: string, rows: unknown[]) => fs.writeFileSync(f, JSON.stringify(rows, null, 2), "utf-8");

const finished = (p?: DevProject) => !!p && (p.masterStatus === "DELIVERED" || p.masterStatus === "CLOSED");
const userId = (u: { id?: string | null; email?: string | null }) => (u.email ? getDevUserByEmail(u.email)?.id : undefined) ?? u.id ?? "";

export function devClientFeedback(projectId: string): ClientFeedbackState {
  const p = read<DevProject>(FILES.projects).find((x) => x.id === projectId);
  const f = read<DevFeedback>(FILES.feedback).find((x) => x.projectId === projectId);
  return {
    eligible: finished(p),
    feedback: f
      ? { rating: f.rating, wentWell: f.wentWell, couldImprove: f.couldImprove, nameStyle: asNameStyle(f.nameStyle), displayNames: f.displayNames, createdAt: f.createdAt }
      : null,
    editableUntil: f ? editableUntil(f.createdAt) : null,
  };
}

export function devSubmitFeedback(input: SubmitFeedbackInput, user: { id?: string | null; email?: string | null }) {
  const p = read<DevProject>(FILES.projects).find((x) => x.id === input.projectId);
  if (!finished(p)) return { ok: false as const, message: "You can share feedback once your study is finished." };
  const rows = read<DevFeedback>(FILES.feedback);
  const now = new Date().toISOString();
  const existing = rows.find((x) => x.projectId === input.projectId);
  if (existing && !editableUntil(existing.createdAt)) return { ok: false as const, message: "Your feedback can't be changed any more." };
  const next: DevFeedback = {
    id: existing?.id ?? `fb_${Date.now()}`,
    projectId: input.projectId,
    clientId: existing?.clientId ?? userId(user),
    rating: input.rating,
    wentWell: input.wentWell?.trim() || null,
    couldImprove: input.couldImprove?.trim() || null,
    showOnWebsite: input.nameStyle !== "HIDDEN",
    nameStyle: input.nameStyle,
    displayNames: input.nameStyle === "NAMES" ? input.displayNames?.trim() || null : null,
    approvedAt: null,
    approvedBy: null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  write(FILES.feedback, existing ? rows.map((x) => (x === existing ? next : x)) : [...rows, next]);
  return { ok: true as const, created: !existing, previousRating: existing?.rating ?? null };
}

function toItem(f: DevFeedback, projects: DevProject[]): FeedbackItem {
  const p = projects.find((x) => x.id === f.projectId);
  return {
    id: f.id,
    projectId: f.projectId,
    intakeId: p?.intakeId ?? "Study",
    researchTitle: p?.researchTitle ?? "",
    clientName: p?.client?.fullName ?? "Client",
    school: p?.client?.clientProfile?.institutionSchool ?? null,
    program: p?.client?.clientProfile?.academicProgram ?? null,
    analystName: p?.assignment?.statistician?.fullName ?? null,
    reviewerName: p?.assignment?.qaLead?.fullName ?? null,
    rating: f.rating,
    wentWell: f.wentWell,
    couldImprove: f.couldImprove,
    showOnWebsite: f.showOnWebsite,
    nameStyle: asNameStyle(f.nameStyle),
    displayNames: f.displayNames,
    approvedAt: f.approvedAt,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

export function devListFeedback(): FeedbackItem[] {
  const projects = read<DevProject>(FILES.projects);
  return read<DevFeedback>(FILES.feedback)
    .map((f) => toItem(f, projects))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function devFeedbackForStudy(projectId: string): FeedbackItem | null {
  return devListFeedback().find((f) => f.projectId === projectId) ?? null;
}

export function devSetApproval(feedbackId: string, approved: boolean, by: string): boolean {
  const rows = read<DevFeedback>(FILES.feedback);
  const f = rows.find((x) => x.id === feedbackId);
  if (!f || !f.showOnWebsite) return false;
  f.approvedAt = approved ? new Date().toISOString() : null;
  f.approvedBy = approved ? by : null;
  write(FILES.feedback, rows);
  return true;
}
