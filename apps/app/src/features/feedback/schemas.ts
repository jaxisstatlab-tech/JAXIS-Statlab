import { z } from "zod";

// Client feedback on a finished study: a 1–5 rating, what went well, what could be better, and whether (and how)
// it may appear on the website.

/** How the client wants to be named if their words appear on the website. */
export const NAME_STYLES = ["NAMES", "PROGRAM", "HIDDEN"] as const;
export type NameStyle = (typeof NAME_STYLES)[number];

/** As staff read it. NAMES = the names the client typed; PROGRAM = anonymous (program and school only). */
export const NAME_STYLE_LABEL: Record<NameStyle, string> = {
  NAMES: "With their names",
  PROGRAM: "Anonymous (program and school only)",
  HIDDEN: "Not on the website",
};

export const RATING_LABEL: Record<number, string> = {
  1: "Not happy",
  2: "Could be better",
  3: "Okay",
  4: "Happy",
  5: "Very happy",
};

/** The client can change their answer for this long after first sending it. */
export const FEEDBACK_EDIT_DAYS = 7;

export const SubmitFeedbackSchema = z
  .object({
    projectId: z.string().min(1),
    rating: z.number().int().min(1, "Pick a rating from 1 to 5.").max(5, "Pick a rating from 1 to 5."),
    wentWell: z.string().trim().max(1500, "Keep it under 1,500 characters.").optional(),
    couldImprove: z.string().trim().max(1500, "Keep it under 1,500 characters.").optional(),
    nameStyle: z.enum(NAME_STYLES).default("HIDDEN"),
    displayNames: z.string().trim().max(300, "Keep the names under 300 characters.").optional(),
  })
  .refine((d) => d.nameStyle !== "NAMES" || Boolean(d.displayNames?.trim()), {
    message: "Type the names you want shown, or pick another option.",
    path: ["displayNames"],
  });
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;

/** One client's feedback, as staff see it. */
export interface FeedbackItem {
  id: string;
  projectId: string;
  intakeId: string;
  researchTitle: string;
  clientName: string;
  school: string | null;
  program: string | null;
  analystName: string | null;
  reviewerName: string | null;
  rating: number;
  wentWell: string | null;
  couldImprove: string | null;
  showOnWebsite: boolean;
  nameStyle: NameStyle;
  displayNames: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What the client's study page needs: whether to ask, and their answer if they gave one. */
export interface ClientFeedbackState {
  /** The study is finished, so feedback can be given. */
  eligible: boolean;
  feedback: {
    rating: number;
    wentWell: string | null;
    couldImprove: string | null;
    nameStyle: NameStyle;
    displayNames: string | null;
    createdAt: string;
  } | null;
  /** Until when they can still change it (ISO), or null when it can't be changed any more. */
  editableUntil: string | null;
}

export interface FeedbackSummary {
  count: number;
  average: number | null;
  /** How many 1s, 2s, … 5s (index 0 = rating 1). */
  spread: [number, number, number, number, number];
  /** Responses in the last 30 days. */
  recentCount: number;
  /** Finished studies asked but not answered yet. */
  awaiting: number;
  /** Ratings of 1 or 2 in the last 30 days. */
  recentLow: number;
}

/** A testimonial as the website shows it (only approved feedback the client allowed). */
export interface PublicTestimonial {
  quote: string;
  name: string;
  program: string;
  school: string;
  rating: number;
}

export type FeedbackResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };
