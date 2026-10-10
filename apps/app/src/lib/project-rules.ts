import type { ProjectStatus } from "@prisma/client";

/**
 * Valid state transitions for the JAXIS StatLab Project lifecycle state machine.
 * All transitions are validated server-side to prevent illegal status bypasses.
 */
export const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  NEW_REQUEST: ["AWAITING_INFORMATION", "UNDER_EVALUATION", "CANCELLED"],
  AWAITING_INFORMATION: ["UNDER_EVALUATION", "CANCELLED"],
  UNDER_EVALUATION: ["QUOTE_SENT", "AWAITING_INFORMATION", "CANCELLED"],
  QUOTE_SENT: ["CLIENT_APPROVED", "UNDER_EVALUATION", "AWAITING_INFORMATION", "CANCELLED"],
  CLIENT_APPROVED: ["SOW_PENDING", "UNDER_EVALUATION"],
  SOW_PENDING: ["SOW_SIGNED"],
  SOW_SIGNED: ["AWAITING_PAYMENT"],
  AWAITING_PAYMENT: ["ACTIVE", "EXPIRED", "HALTED"],
  ACTIVE: ["EXPERT_ASSIGNED", "CANCELLED"],
  EXPERT_ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["FOR_QA", "SCOPE_CREEP_HALTED", "SLA_PAUSED", "REASSIGNMENT_NEEDED"],
  SLA_PAUSED: ["IN_PROGRESS"],
  SCOPE_CREEP_HALTED: ["IN_PROGRESS", "CANCELLED"],
  FOR_QA: ["QA_REVISION", "DELIVERED", "ETHICAL_BREACH"],
  QA_REVISION: ["FOR_QA"],
  DELIVERED: ["REVISION_REQUESTED", "CLOSED", "DISPUTED"],
  REVISION_REQUESTED: ["IN_PROGRESS"],
  DISPUTED: ["HALTED", "CLOSED"],
  HALTED: ["CLOSED", "DISPUTED"],
  ETHICAL_BREACH: ["CANCELLED"],
  REASSIGNMENT_NEEDED: ["IN_PROGRESS"],
  CLOSED: [],
  CANCELLED: [],
  EXPIRED: [],
};

/**
 * Moves an admin or the CEO may make by hand with "Change Status". Every other move belongs to its own step, which
 * also records what goes with it: sending the quote, the client accepting it, issuing and signing the agreement,
 * finance confirming a payment, assigning the team, the analyst sending work, the reviewer's decision, a client's
 * claim. A manual "Signed", "Paid" or "Delivered" used to skip all of that (no signature, payment, review or files).
 */
const MANUAL_TARGETS: ProjectStatus[] = ["UNDER_EVALUATION", "CANCELLED", "EXPIRED", "HALTED", "CLOSED", "REASSIGNMENT_NEEDED"];

/** Allowed manual moves from a status (a subset of VALID_TRANSITIONS). */
export function manualTransitionsFrom(status: ProjectStatus): ProjectStatus[] {
  const valid = VALID_TRANSITIONS[status] ?? [];
  return valid.filter(
    (t) =>
      MANUAL_TARGETS.includes(t) ||
      // A client's change request has no step of its own that restarts the work.
      (status === "REVISION_REQUESTED" && t === "IN_PROGRESS")
  );
}

/** What a manual move means, in plain words, for the Change Status window. */
export const MANUAL_STATUS_HELP: Partial<Record<ProjectStatus, string>> = {
  UNDER_EVALUATION: "Back to pricing: you'll build or change the quote.",
  CANCELLED: "Stop the study for good. The client is told.",
  EXPIRED: "The deposit wasn't paid in time. The client is told.",
  HALTED: "Pause everything while something is sorted out.",
  CLOSED: "Finish the study. Nothing more will happen on it.",
  REASSIGNMENT_NEEDED: "The analyst or reviewer can't continue; pick new ones.",
  IN_PROGRESS: "The client's change request is accepted: the analyst works on it again.",
};

/**
 * Checks if transitioning from currentStatus to targetStatus is valid.
 */
export function isValidStatusTransition(
  currentStatus: ProjectStatus,
  targetStatus: ProjectStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

/**
 * Asserts that a status transition is permitted, throwing an error if illegal.
 */
export function assertValidStatusTransition(
  currentStatus: ProjectStatus,
  targetStatus: ProjectStatus
): void {
  if (!isValidStatusTransition(currentStatus, targetStatus)) {
    throw new Error(
      `INVALID_STATUS_TRANSITION: Cannot transition project from "${currentStatus}" to "${targetStatus}".`
    );
  }
}

/**
 * Generates a human-readable unique intake ID: JAXIS-YYYYMM-XXXX (e.g. JAXIS-202608-0042).
 */
export function generateIntakeId(seq?: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const yearMonth = `${year}${month}`;

  if (seq !== undefined && seq > 0) {
    const paddedSeq = String(seq).padStart(4, "0");
    return `JAXIS-${yearMonth}-${paddedSeq}`;
  }

  // High-entropy 4-digit number fallback
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `JAXIS-${yearMonth}-${randomSuffix}`;
}

/**
 * Human-friendly labels for each ProjectStatus enum value.
 */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  NEW_REQUEST: "New Request",
  AWAITING_INFORMATION: "Waiting for Client Info",
  UNDER_EVALUATION: "Pricing",
  QUOTE_SENT: "Quote Sent",
  CLIENT_APPROVED: "Quote Accepted",
  SOW_PENDING: "Agreement Sent",
  SOW_SIGNED: "Agreement Signed",
  AWAITING_PAYMENT: "Waiting for Deposit",
  ACTIVE: "Needs a Team",
  EXPERT_ASSIGNED: "Team Assigned",
  IN_PROGRESS: "In Progress",
  SCOPE_CREEP_HALTED: "On Hold: Extra Work",
  SLA_PAUSED: "Deadline Paused",
  FOR_QA: "With Reviewer",
  QA_REVISION: "Sent Back for Changes",
  DELIVERED: "Delivered",
  REVISION_REQUESTED: "Client Asked for Changes",
  CLOSED: "Closed",
  HALTED: "On Hold",
  CANCELLED: "Cancelled",
  DISPUTED: "Claim Open",
  ETHICAL_BREACH: "Reported to the CEO",
  EXPIRED: "Expired",
  REASSIGNMENT_NEEDED: "Needs a New Team",
};

/**
 * Resolves the real-time display status and label for a research project.
 * 1. If in AWAITING_PAYMENT / SOW_SIGNED with proof submitted -> "Awaiting Payment Confirmation"
 * 2. If ACTIVE (payment confirmed, in queue for specialists assignment) -> "Pending Assignment"
 */
const CLIENT_SEES_IN_PROGRESS: ProjectStatus[] = ["FOR_QA", "QA_REVISION", "SLA_PAUSED", "SCOPE_CREEP_HALTED", "ETHICAL_BREACH", "REASSIGNMENT_NEEDED"];

export function getProjectDisplayStatus(
  project: {
    masterStatus: ProjectStatus | string;
    hasPendingPaymentVerification?: boolean;
    latestPaymentStatus?: string | null;
  },
  viewerRole?: string
): {
  status: string;
  label: string;
  pulse: boolean;
  description?: string;
} {
  const isAwaitingPayment =
    project.masterStatus === "AWAITING_PAYMENT" || project.masterStatus === "SOW_SIGNED";

  if (
    isAwaitingPayment &&
    (project.hasPendingPaymentVerification || project.latestPaymentStatus === "PROOF_SUBMITTED")
  ) {
    return {
      status: "PROOF_SUBMITTED",
      label: "Checking Payment",
      pulse: true,
      description: "Payment sent. Finance is checking it.",
    };
  }

  if (project.masterStatus === "ACTIVE") {
    return {
      status: "PENDING_ASSIGNMENT",
      label: viewerRole === "CLIENT" ? "Getting Your Team Ready" : "Needs a Team",
      pulse: true,
      description: "Deposit confirmed. An analyst and a reviewer are being assigned.",
    };
  }

  if (project.masterStatus === "CLIENT_APPROVED") {
    const isAdmin = viewerRole === "ADMIN" || viewerRole === "CEO";
    return {
      status: "CLIENT_APPROVED",
      label: isAdmin ? "Draft the Agreement" : "Quote Accepted",
      pulse: true,
      description: isAdmin
        ? "The client accepted the quote. Draft the agreement for them to sign."
        : "You accepted the quote. We're preparing your agreement.",
    };
  }

  if (project.masterStatus === "SOW_PENDING") {
    const isAdmin = viewerRole === "ADMIN" || viewerRole === "CEO";
    return {
      status: "SOW_PENDING",
      label: isAdmin ? "Waiting for Signature" : "Sign the Agreement",
      pulse: true,
      description: isAdmin
        ? "The agreement was sent. Waiting for the client to sign it."
        : "Your agreement is ready. Read it and sign to continue.",
    };
  }

  // Clients don't see the inside of the work (review, pauses, extra-work holds, reports): to them it's in progress.
  if (viewerRole === "CLIENT" && CLIENT_SEES_IN_PROGRESS.includes(project.masterStatus as ProjectStatus)) {
    return { status: "IN_PROGRESS", label: PROJECT_STATUS_LABELS.IN_PROGRESS, pulse: true };
  }

  return {
    status: project.masterStatus,
    label: PROJECT_STATUS_LABELS[project.masterStatus as ProjectStatus] || project.masterStatus,
    pulse:
      project.masterStatus === "AWAITING_INFORMATION" ||
      project.masterStatus === "IN_PROGRESS" ||
      project.masterStatus === "FOR_QA",
  };
}

/**
 * Standard pre-configured templates for administrator "Request Missing Artifacts" action.
 */
export interface MissingInfoTemplate {
  id: string;
  label: string;
  category: string;
  text: string;
}

export const MISSING_INFO_TEMPLATES: MissingInfoTemplate[] = [
  {
    id: "raw-dataset",
    label: "Raw Data File Missing (Excel / CSV / SPSS)",
    category: "Dataset",
    text: "We need your original data file (Excel .xlsx, .csv, or SPSS .sav). Please upload your data file with column headers for each survey question or variable so our statistical team can evaluate your study.",
  },
  {
    id: "cleaned-dataset",
    label: "Cleaned & Coded Excel File Needed (Numbered Answers)",
    category: "Dataset",
    text: "The uploaded file looks like an unformatted Google Forms export. To proceed, please upload a cleaned spreadsheet where survey answers are converted into numbers (e.g. Likert Scale: 1 = Strongly Disagree to 5 = Strongly Agree) and each column has a short name rather than the full question sentence.",
  },
  {
    id: "survey-tool",
    label: "Survey Questionnaire / Form Used Missing",
    category: "Instrument",
    text: "Please upload a copy of the survey questionnaire or tool you used (including the scoring guide or rating scale key, such as 1 to 5). This helps our statistical analysts verify your questions and tests.",
  },
  {
    id: "variables-hypotheses",
    label: "Research objectives / Chapter 1–3 needed",
    category: "Scope",
    text: "We need more details on your research objectives, statement of the problem, or hypotheses. Please upload your Chapter 1–3 draft or list your research objectives (numbered) so we can match the right statistical tests.",
  },
  {
    id: "data-dictionary",
    label: "Explanation of Numbers & Codes Needed (Codebook)",
    category: "Codebook",
    text: "Please provide a short guide explaining what the numbers and codes in your data file mean (for example: 1 = Male, 2 = Female, or what abbreviations stand for) so we understand your data correctly.",
  },
  {
    id: "sample-size",
    label: "Number of Respondents / Participants Needed",
    category: "Methodology",
    text: "Please tell us the total number of respondents or participants in your study (Sample Size / N) and who was included or excluded so we can run accurate sample size and statistical power calculations.",
  },
  {
    id: "corrupted-file",
    label: "File Cannot Be Opened (Please Re-upload)",
    category: "File Issue",
    text: "One of your uploaded files cannot be opened or appears damaged. Please re-upload your data file and proposal in standard Excel (.xlsx, .csv), Word (.docx), or PDF format.",
  },
];
