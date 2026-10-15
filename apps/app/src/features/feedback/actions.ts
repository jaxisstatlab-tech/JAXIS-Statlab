"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db, withDbTimeout } from "@/lib/db";
import { emailTeam } from "@/lib/email/notify";
import { dispatchRealtimeNotification } from "@/features/notifications/dispatcher";
import { devStudyDataEnabled } from "@/features/projects/dev-study-store";
import { devClientFeedback, devFeedbackForStudy, devListFeedback, devSetApproval, devSubmitFeedback } from "./dev-feedback";
import { asNameStyle, editableUntil, isLowRating, isStudyFinished } from "./rules";
import {
  RATING_LABEL,
  SubmitFeedbackSchema,
  type ClientFeedbackState,
  type FeedbackItem,
  type FeedbackResult,
  type FeedbackSummary,
} from "./schemas";

// Client feedback on finished studies. The client answers on their study page; staff read it (analyst and reviewer
// only on their own studies); admins and the CEO see everything and choose what goes on the website. A rating of 1 or
// 2 alerts admins and the CEO straight away. Asking and the one reminder are sent by ./requests (daily job).

const fail = (code: string, message: string) => ({ success: false as const, error: { code, message } });

const FEEDBACK_SELECT = {
  id: true,
  projectId: true,
  rating: true,
  wentWell: true,
  couldImprove: true,
  showOnWebsite: true,
  nameStyle: true,
  displayNames: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      intakeId: true,
      researchTitle: true,
      client: { select: { fullName: true, clientProfile: { select: { institutionSchool: true, academicProgram: true } } } },
      assignment: { select: { statistician: { select: { fullName: true } }, qaLead: { select: { fullName: true } } } },
    },
  },
} as const;

type FeedbackRow = {
  id: string;
  projectId: string;
  rating: number;
  wentWell: string | null;
  couldImprove: string | null;
  showOnWebsite: boolean;
  nameStyle: string;
  displayNames: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  project: {
    intakeId: string;
    researchTitle: string;
    client: { fullName: string; clientProfile: { institutionSchool: string | null; academicProgram: string | null } | null };
    assignment: { statistician: { fullName: string } | null; qaLead: { fullName: string } | null } | null;
  };
};

function toItem(f: FeedbackRow): FeedbackItem {
  return {
    id: f.id,
    projectId: f.projectId,
    intakeId: f.project.intakeId,
    researchTitle: f.project.researchTitle,
    clientName: f.project.client.fullName,
    school: f.project.client.clientProfile?.institutionSchool ?? null,
    program: f.project.client.clientProfile?.academicProgram ?? null,
    analystName: f.project.assignment?.statistician?.fullName ?? null,
    reviewerName: f.project.assignment?.qaLead?.fullName ?? null,
    rating: f.rating,
    wentWell: f.wentWell,
    couldImprove: f.couldImprove,
    showOnWebsite: f.showOnWebsite,
    nameStyle: asNameStyle(f.nameStyle),
    displayNames: f.displayNames,
    approvedAt: f.approvedAt?.toISOString() ?? null,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

async function finishedStudy(projectId: string) {
  const p = await withDbTimeout(
    db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        intakeId: true,
        researchTitle: true,
        clientId: true,
        masterStatus: true,
        revisionWindowExpiresAt: true,
        deliverables: { where: { isFinalReleased: true }, select: { id: true }, take: 1 },
        assignment: { select: { statisticianId: true, qaLeadId: true } },
      },
    }),
  );
  if (!p) return null;
  return {
    ...p,
    finished: isStudyFinished({ masterStatus: p.masterStatus, revisionWindowExpiresAt: p.revisionWindowExpiresAt, hasReleasedFiles: p.deliverables.length > 0 }),
  };
}

// ─── Client ──────────────────────────────────────────────────────────────────

/** For the client's study page: whether to ask for feedback, and their answer if they gave one. */
export async function getClientStudyFeedback(projectId: string): Promise<FeedbackResult<ClientFeedbackState>> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") return fail("FORBIDDEN", "Only the client can see this.");
  try {
    const p = await finishedStudy(projectId);
    if (!p || p.clientId !== session.user.id) return fail("NOT_FOUND", "Study not found.");
    const f = await withDbTimeout(db.studyFeedback.findUnique({ where: { projectId } }));
    return {
      success: true,
      data: {
        eligible: p.finished,
        feedback: f
          ? { rating: f.rating, wentWell: f.wentWell, couldImprove: f.couldImprove, nameStyle: asNameStyle(f.nameStyle), displayNames: f.displayNames, createdAt: f.createdAt.toISOString() }
          : null,
        editableUntil: f ? editableUntil(f.createdAt) : null,
      },
    };
  } catch (err) {
    if (devStudyDataEnabled()) return { success: true, data: devClientFeedback(projectId) };
    console.error("[getClientStudyFeedback]", err);
    return fail("SERVER_ERROR", "We couldn't load this. Please try again.");
  }
}

/** Save the client's feedback (first time, or a change within 7 days), and tell the people who need to know. */
export async function submitStudyFeedback(input: unknown): Promise<FeedbackResult<{ created: boolean }>> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") return fail("FORBIDDEN", "Only the client can share feedback.");
  const parsed = SubmitFeedbackSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Check your answers.");
  const d = parsed.data;
  const data = {
    rating: d.rating,
    wentWell: d.wentWell?.trim() || null,
    couldImprove: d.couldImprove?.trim() || null,
    showOnWebsite: d.nameStyle !== "HIDDEN",
    nameStyle: d.nameStyle,
    displayNames: d.nameStyle === "NAMES" ? d.displayNames?.trim() || null : null,
  };

  let created = false;
  let previousRating: number | null = null;
  let changedRecently = false;
  let study: Awaited<ReturnType<typeof finishedStudy>> = null;
  try {
    study = await finishedStudy(d.projectId);
    if (!study || study.clientId !== session.user.id) return fail("NOT_FOUND", "Study not found.");
    if (!study.finished) return fail("NOT_FINISHED", "You can share feedback once your study is finished.");
    const existing = await withDbTimeout(db.studyFeedback.findUnique({ where: { projectId: d.projectId }, select: { createdAt: true, updatedAt: true, rating: true } }));
    if (existing) {
      if (!editableUntil(existing.createdAt)) return fail("LOCKED", "Your feedback can't be changed any more. Message us if you want to add something.");
      previousRating = existing.rating;
      changedRecently = Date.now() - existing.updatedAt.getTime() < 60 * 60 * 1000;
      // A changed answer goes back to the admins before it can appear on the website again.
      await withDbTimeout(db.studyFeedback.update({ where: { projectId: d.projectId }, data: { ...data, approvedAt: null, approvedBy: null } }));
    } else {
      try {
        await withDbTimeout(db.studyFeedback.create({ data: { ...data, projectId: d.projectId, clientId: session.user.id } }));
        created = true;
      } catch (e) {
        // Sent twice at once: the first one saved it.
        if ((e as { code?: string }).code === "P2002") return { success: true, data: { created: false } };
        throw e;
      }
    }
  } catch (err) {
    if (devStudyDataEnabled()) {
      const r = devSubmitFeedback(d, session.user);
      if (!r.ok) return fail("NOT_ALLOWED", r.message);
      return { success: true, data: { created: r.created } };
    }
    console.error("[submitStudyFeedback]", err);
    return fail("SERVER_ERROR", "Your feedback wasn't saved. Please try again.");
  }

  revalidatePath(`/dashboard/client/projects/${d.projectId}`);
  revalidatePath("/dashboard/admin/feedback");
  revalidatePath("/dashboard/ceo/feedback");

  // Tell the team. A new answer goes to admins and the CEO, and to the analyst and reviewer of the study; a low
  // rating (new, or changed down to 1 or 2) also emails the team inbox so someone follows up today.
  // A change made within an hour of the last one doesn't alert again, so switching a rating back and forth can't
  // flood the team inbox.
  const becameLow = isLowRating(d.rating) && (previousRating === null || (!isLowRating(previousRating) && !changedRecently));
  if (study && (created || becameLow)) {
    const stars = `${d.rating}/5 (${RATING_LABEL[d.rating]})`;
    try {
      await dispatchRealtimeNotification({
        eventType: "CLIENT_FEEDBACK",
        projectId: study.id,
        intakeId: study.intakeId,
        title: becameLow ? `Low rating on ${study.intakeId}: ${stars}` : `Client feedback on ${study.intakeId}: ${stars}`,
        message: becameLow
          ? `The client rated "${study.researchTitle}" ${stars}. Please contact them today.${data.couldImprove ? ` They said: ${data.couldImprove}` : ""}`
          : `The client rated "${study.researchTitle}" ${stars}.${data.wentWell ? ` "${data.wentWell}"` : ""}`,
        // The study page has the Client feedback panel (the CEO can open admin study pages too).
        linkUrl: `/dashboard/admin/projects/${study.id}`,
        targetRoles: ["ADMIN", "CEO"],
      });
      const team = [
        study.assignment?.statisticianId ? { id: study.assignment.statisticianId, link: `/dashboard/statistician/projects/${study.id}/workbench` } : null,
        study.assignment?.qaLeadId ? { id: study.assignment.qaLeadId, link: `/dashboard/qa/projects/${study.id}/review` } : null,
      ].filter((x): x is { id: string; link: string } => Boolean(x));
      for (const member of team) {
        await dispatchRealtimeNotification({
          eventType: "CLIENT_FEEDBACK",
          projectId: study.id,
          intakeId: study.intakeId,
          title: `The client rated ${study.intakeId}: ${stars}`,
          message: `See what they said about "${study.researchTitle}" in your study details.`,
          linkUrl: member.link,
          targetUserIds: [member.id],
        });
      }
    } catch (e) {
      console.warn("[submitStudyFeedback] Notification failed:", e);
    }
    if (becameLow) {
      emailTeam(
        "LowRating",
        { rating: d.rating, ratingLabel: RATING_LABEL[d.rating], couldImprove: data.couldImprove, wentWell: data.wentWell },
        { projectId: study.id },
      );
    }
  }

  return { success: true, data: { created } };
}

// ─── Staff ───────────────────────────────────────────────────────────────────

/** The client's feedback on one study. Admins and the CEO see any study; the analyst and reviewer only their own. */
export async function getStudyFeedbackForStaff(projectId: string): Promise<FeedbackResult<FeedbackItem | null>> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !role || role === "CLIENT" || role === "FINANCE_OFFICER") return fail("FORBIDDEN", "Not allowed.");
  try {
    if (role === "STATISTICIAN" || role === "SENIOR_QA_LEAD") {
      const a = await withDbTimeout(db.assignment.findUnique({ where: { projectId }, select: { statisticianId: true, qaLeadId: true } }));
      if (!a || (a.statisticianId !== session.user.id && a.qaLeadId !== session.user.id)) return fail("FORBIDDEN", "Not your study.");
    }
    const f = await withDbTimeout(db.studyFeedback.findUnique({ where: { projectId }, select: FEEDBACK_SELECT }));
    return { success: true, data: f ? toItem(f as FeedbackRow) : null };
  } catch (err) {
    if (devStudyDataEnabled()) return { success: true, data: devFeedbackForStudy(projectId) };
    console.error("[getStudyFeedbackForStaff]", err);
    return fail("SERVER_ERROR", "Feedback didn't load.");
  }
}

async function manager() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user.role === "ADMIN" || session.user.role === "CEO" ? session.user : null;
}

/** Every response, newest first, with the numbers for the summary. Admins and the CEO. */
export async function getFeedbackOverview(): Promise<FeedbackResult<{ items: FeedbackItem[]; summary: FeedbackSummary }>> {
  if (!(await manager())) return fail("FORBIDDEN", "Only admins and the CEO can see all feedback.");
  try {
    const [rows, awaiting] = await Promise.all([
      withDbTimeout(db.studyFeedback.findMany({ orderBy: { createdAt: "desc" }, take: 500, select: FEEDBACK_SELECT })),
      withDbTimeout(db.feedbackRequest.count({ where: { project: { feedback: { is: null } } } })),
    ]);
    const items = (rows as FeedbackRow[]).map(toItem);
    return { success: true, data: { items, summary: summarize(items, awaiting) } };
  } catch (err) {
    if (devStudyDataEnabled()) {
      const items = devListFeedback();
      return { success: true, data: { items, summary: summarize(items, 0) } };
    }
    console.error("[getFeedbackOverview]", err);
    return fail("SERVER_ERROR", "Feedback didn't load.");
  }
}

function summarize(items: FeedbackItem[], awaiting: number): FeedbackSummary {
  const spread: FeedbackSummary["spread"] = [0, 0, 0, 0, 0];
  for (const f of items) spread[Math.min(5, Math.max(1, f.rating)) - 1]! += 1;
  const since = Date.now() - 30 * 86_400_000;
  const recent = items.filter((f) => Date.parse(f.createdAt) >= since);
  return {
    count: items.length,
    average: items.length ? Math.round((items.reduce((n, f) => n + f.rating, 0) / items.length) * 10) / 10 : null,
    spread,
    recentCount: recent.length,
    awaiting,
    recentLow: recent.filter((f) => isLowRating(f.rating)).length,
  };
}

/** Show (or stop showing) a response on the website. Only for responses the client allowed. Admins and the CEO. */
export async function setFeedbackOnWebsite(input: { feedbackId: string; approved: boolean }): Promise<FeedbackResult<{ approved: boolean }>> {
  const me = await manager();
  if (!me) return fail("FORBIDDEN", "Only admins and the CEO can choose what goes on the website.");
  if (!input?.feedbackId) return fail("VALIDATION_ERROR", "Pick a response.");
  try {
    const moved = await withDbTimeout(
      db.studyFeedback.updateMany({
        where: { id: input.feedbackId, showOnWebsite: true },
        data: input.approved ? { approvedAt: new Date(), approvedBy: me.id } : { approvedAt: null, approvedBy: null },
      }),
    );
    if (moved.count === 0) return fail("NOT_ALLOWED", "The client didn't allow this one on the website.");
  } catch (err) {
    if (devStudyDataEnabled()) {
      return devSetApproval(input.feedbackId, input.approved, me.id ?? "admin")
        ? { success: true, data: { approved: input.approved } }
        : fail("NOT_ALLOWED", "The client didn't allow this one on the website.");
    }
    console.error("[setFeedbackOnWebsite]", err);
    return fail("SERVER_ERROR", "That didn't save. Please try again.");
  }
  revalidatePath("/dashboard/admin/feedback");
  revalidatePath("/dashboard/ceo/feedback");
  return { success: true, data: { approved: input.approved } };
}
