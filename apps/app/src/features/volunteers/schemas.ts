import { z } from "zod";
import type { ProjectStatus } from "@prisma/client";

// "I'll take this study": analysts offer to take a study that has no team yet; the admin may pick one; when the
// deposit clears the pick (or else the best-ranked volunteer) is assigned automatically (see auto-assign.ts).

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
  /** null clears the pick (the best-ranked volunteer is then assigned). */
  statisticianId: z.string().min(1).nullable(),
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
  hypotheses: string | null;
  files: Array<{ id: string; projectId: string; fileName: string; filePath: string; fileType: string; fileCategory: string; uploadedAt: string }>;
  volunteerCount: number;
  /** This analyst's offer, if they made one. */
  mine: { volunteeredAt: string; note: string | null; picked: boolean; place: number } | null;
  /** The admin picked another analyst. */
  pickedSomeoneElse: boolean;
}

export interface StudyVolunteerItem {
  statisticianId: string;
  fullName: string;
  email: string;
  status: string;
  specializations: string[];
  /** Specializations that fit the study's analysis goals. */
  matches: string[];
  note: string | null;
  volunteeredAt: string;
  /** 1 = first to offer. */
  order: number;
  /** Studies they're working on now. */
  openStudies: number;
  /** Best ranked by the criteria (what's assigned if the admin doesn't pick). */
  suggested: boolean;
  picked: boolean;
}

export type VolunteerResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };
