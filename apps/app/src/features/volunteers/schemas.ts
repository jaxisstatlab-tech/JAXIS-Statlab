import { z } from "zod";
import type { ProjectStatus } from "@prisma/client";

// "I'll take this study": analysts and reviewers offer to take a study that has no team yet; the admin may pick one
// of each; when the deposit clears the picks (or else the best-ranked volunteers) are assigned automatically (see
// auto-assign.ts). Reviewers' offers sit in the same table (study_volunteers.statisticianId holds any staff user's
// id); the person's role says which kind of offer it is, so no database change was needed.

/** Which part of the team an offer is for. */
export type VolunteerKind = "ANALYST" | "REVIEWER";

/** Stages where a study has no team yet, so analysts can see it and offer to take it. */
export const OPEN_FOR_VOLUNTEERS: ProjectStatus[] = [
  "NEW_REQUEST",
  "AWAITING_INFORMATION",
  "UNDER_EVALUATION",
  "QUOTE_SENT",
  "CLIENT_APPROVED",
  "SOW_PENDING",
  "SOW_SIGNED",
  "AWAITING_PAYMENT",
  "ACTIVE",
];

/** The stage in words an analyst understands. */
export const OPEN_STAGE_LABEL: Partial<Record<ProjectStatus, string>> = {
  NEW_REQUEST: "New request",
  AWAITING_INFORMATION: "Waiting for the client's info",
  UNDER_EVALUATION: "Being priced",
  QUOTE_SENT: "Quote sent to the client",
  CLIENT_APPROVED: "Quote accepted",
  SOW_PENDING: "Waiting for the client to sign",
  SOW_SIGNED: "Waiting for the deposit",
  AWAITING_PAYMENT: "Waiting for the deposit",
  ACTIVE: "Paid, needs a team",
};

export const VolunteerSchema = z.object({
  projectId: z.string().min(1),
  note: z.string().trim().max(500, "Keep the note under 500 characters.").optional(),
});

export const PickVolunteerSchema = z.object({
  projectId: z.string().min(1),
  /** The analyst or reviewer picked; null clears the pick of `kind` (the best-ranked volunteer is then assigned). */
  statisticianId: z.string().min(1).nullable(),
  kind: z.enum(["ANALYST", "REVIEWER"]).default("ANALYST"),
});

export interface OpenStudyItem {
  id: string;
  intakeId: string;
  researchTitle: string;
  masterStatus: ProjectStatus;
  stageLabel: string;
  createdAt: string;
  deadlineRequested: string | null;
  analysisGoals: string[];
  packageName: string | null;
  school: string | null;
  program: string | null;
  researchQuestions: string;
  researchObjectives: string;
  clientNotes: string | null;
  hypotheses: string | null;
  files: Array<{ id: string; projectId: string; fileName: string; filePath: string; fileType: string; fileCategory: string; uploadedAt: string }>;
  /** Offers of the viewer's kind (analysts see analysts' offers, reviewers see reviewers'). */
  volunteerCount: number;
  /** The viewer's offer, if they made one. */
  mine: { volunteeredAt: string; note: string | null; picked: boolean; place: number } | null;
  /** The admin picked another person of the viewer's kind. */
  pickedSomeoneElse: boolean;
}

export interface StudyVolunteerItem {
  /** The person's user id (analyst or reviewer). */
  statisticianId: string;
  kind: VolunteerKind;
  fullName: string;
  email: string;
  status: string;
  specializations: string[];
  /** Specializations that fit the study's analysis goals. */
  matches: string[];
  note: string | null;
  volunteeredAt: string;
  /** 1 = first of their kind to offer. */
  order: number;
  /** Studies they're working on (analysts) or reviewing (reviewers) now. */
  openStudies: number;
  /** Best ranked by the criteria (what's assigned if the admin doesn't pick). */
  suggested: boolean;
  picked: boolean;
}

export type VolunteerResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };
