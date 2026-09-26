import type { ProjectStatus } from "@prisma/client";

// What a client sees for each study status: which of the 5 steps it is on, a plain label, what is
// happening, what comes next, and the one action to take (if any). Internal-only states (QA rework,
// reassignment, ethics review) are shown as ordinary progress so clients never see raw workflow codes.

export const CLIENT_STEPS = ["Price", "Agreement", "Deposit", "Analysis", "Files"] as const;

/** "action": the client needs to do something. "wait": we are working. "done": finished. "stopped": paused or ended. */
export type ClientStageTone = "action" | "wait" | "done" | "stopped";

export interface ClientStage {
  step: number; // 0..4, index into CLIENT_STEPS
  label: string;
  tone: ClientStageTone;
  now: string;
  next: string;
  /** Path appended to /dashboard/client/projects/[id]; "" opens the study itself. */
  action?: { label: string; path: string };
}

const STAGES: Record<ProjectStatus, ClientStage> = {
  NEW_REQUEST: {
    step: 0,
    label: "We're reviewing your study",
    tone: "wait",
    now: "Our team is reading your research questions and files to prepare your price.",
    next: "You'll get a fixed written price within 24 hours.",
  },
  UNDER_EVALUATION: {
    step: 0,
    label: "We're reviewing your study",
    tone: "wait",
    now: "Our team is reading your research questions and files to prepare your price.",
    next: "You'll get a fixed written price within 24 hours.",
  },
  AWAITING_INFORMATION: {
    step: 0,
    label: "We need more information",
    tone: "action",
    now: "We need a few more details or files before we can price your study.",
    next: "Add what we asked for and we'll finish your price.",
    action: { label: "Add files", path: "" },
  },
  QUOTE_SENT: {
    step: 0,
    label: "Your price is ready",
    tone: "action",
    now: "Your written price and everything it includes are ready to review.",
    next: "Accept it and we'll prepare your agreement.",
    action: { label: "Review price", path: "/quote" },
  },
  CLIENT_APPROVED: {
    step: 1,
    label: "Preparing your agreement",
    tone: "wait",
    now: "You accepted the price. We're writing your agreement with the exact scope and files you'll get.",
    next: "We'll let you know as soon as it's ready to sign.",
  },
  SOW_PENDING: {
    step: 1,
    label: "Sign your agreement",
    tone: "action",
    now: "Your agreement is ready. It lists your scope, files, price, and delivery date.",
    next: "Read it and sign by typing your full name.",
    action: { label: "Review & sign", path: "/sow" },
  },
  SOW_SIGNED: {
    step: 2,
    label: "Pay your deposit",
    tone: "action",
    now: "Your agreement is signed. Pay your deposit by GCash or bank transfer and upload the receipt.",
    next: "Once we confirm it, we assign your statistician.",
    action: { label: "Pay deposit", path: "/payment" },
  },
  AWAITING_PAYMENT: {
    step: 2,
    label: "Pay your deposit",
    tone: "action",
    now: "Pay your deposit by GCash or bank transfer and upload the receipt.",
    next: "Once we confirm it, we assign your statistician.",
    action: { label: "Pay deposit", path: "/payment" },
  },
  ACTIVE: {
    step: 3,
    label: "Assigning your statistician",
    tone: "wait",
    now: "Your deposit is confirmed. We're matching you with a statistician who knows your kind of study.",
    next: "They'll start your analysis and you can message them here.",
  },
  EXPERT_ASSIGNED: {
    step: 3,
    label: "Analysis in progress",
    tone: "wait",
    now: "Your statistician is working on your analysis.",
    next: "When it's done, a second statistician checks everything before you get your files.",
  },
  IN_PROGRESS: {
    step: 3,
    label: "Analysis in progress",
    tone: "wait",
    now: "Your statistician is working on your analysis.",
    next: "When it's done, a second statistician checks everything before you get your files.",
  },
  REASSIGNMENT_NEEDED: {
    step: 3,
    label: "Analysis in progress",
    tone: "wait",
    now: "Your analysis is being worked on.",
    next: "When it's done, a second statistician checks everything before you get your files.",
  },
  FOR_QA: {
    step: 3,
    label: "Final check",
    tone: "wait",
    now: "A second statistician is checking your results and tables before release.",
    next: "Your files are released as soon as the check is complete.",
  },
  QA_REVISION: {
    step: 3,
    label: "Final check",
    tone: "wait",
    now: "A second statistician is checking your results and tables before release.",
    next: "Your files are released as soon as the check is complete.",
  },
  SLA_PAUSED: {
    step: 3,
    label: "Waiting for your reply",
    tone: "action",
    now: "Your statistician asked you a question. Work and your delivery timer are paused until you reply.",
    next: "Reply in your study's messages to continue.",
    action: { label: "Open messages", path: "/messages" },
  },
  SCOPE_CREEP_HALTED: {
    step: 3,
    label: "Paused: outside your scope",
    tone: "stopped",
    now: "Part of the requested work is outside your signed agreement.",
    next: "We'll message you about an add-on agreement before continuing.",
    action: { label: "Open messages", path: "/messages" },
  },
  DELIVERED: {
    step: 4,
    label: "Your files are ready",
    tone: "done",
    now: "Your tables, write-up, and code are ready to download.",
    next: "Need changes within your scope? Ask within 3 business days of delivery.",
    action: { label: "Get files", path: "/deliverables" },
  },
  REVISION_REQUESTED: {
    step: 4,
    label: "Making your changes",
    tone: "wait",
    now: "We're making the changes you asked for.",
    next: "Your updated files will appear here when they're ready.",
  },
  CLOSED: {
    step: 4,
    label: "Completed",
    tone: "done",
    now: "This study is complete.",
    next: "Your files stay available to download for 90 days.",
    action: { label: "View files", path: "/deliverables" },
  },
  DISPUTED: {
    step: 4,
    label: "Claim under review",
    tone: "stopped",
    now: "We're reviewing the claim you filed on this study.",
    next: "You'll see our decision in Revisions & Help.",
  },
  HALTED: {
    step: 3,
    label: "On hold",
    tone: "stopped",
    now: "This study is on hold.",
    next: "We'll contact you about next steps.",
  },
  ETHICAL_BREACH: {
    step: 3,
    label: "On hold",
    tone: "stopped",
    now: "This study is on hold.",
    next: "We'll contact you about next steps.",
  },
  CANCELLED: {
    step: 0,
    label: "Cancelled",
    tone: "stopped",
    now: "This study was cancelled.",
    next: "You can send a new study anytime.",
  },
  EXPIRED: {
    step: 2,
    label: "Expired",
    tone: "stopped",
    now: "The deposit wasn't paid within 3 days, so this request expired.",
    next: "You can send it again anytime.",
  },
};

const FALLBACK: ClientStage = {
  step: 0,
  label: "In review",
  tone: "wait",
  now: "We're working on your study.",
  next: "You'll see updates here as it moves along.",
};

export function getClientStage(status: string): ClientStage {
  return STAGES[status as ProjectStatus] ?? FALLBACK;
}

/** Most urgent first: things the client must do, then work in progress, then finished or stopped. */
export function clientStagePriority(status: string): number {
  const tone = getClientStage(status).tone;
  return tone === "action" ? 0 : tone === "wait" ? 1 : tone === "done" ? 2 : 3;
}
