import { ProjectStatus, RoleName, QADecision, ErrorClassification } from "@prisma/client";
import { db } from "./db";

/**
 * 1. Verifies that the user is the assigned Senior QA Lead (or Admin/CEO).
 */
export async function assertQaLeadAssigned(
  projectId: string,
  userId: string,
  role?: RoleName | string
): Promise<void> {
  if (role === "ADMIN" || role === "CEO") {
    return;
  }

  const assignment = await db.assignment.findFirst({
    where: {
      projectId,
      qaLeadId: userId,
      isActive: true,
    },
  });

  if (!assignment) {
    throw new Error(
      "FORBIDDEN: You are not the assigned Senior QA Lead for this research study."
    );
  }
}

/**
 * 2. Asserts whether a project in a given master status can undergo QA review.
 */
export function assertCanSubmitQaReview(
  projectStatus: ProjectStatus,
  qaApproved = false
): { allowed: boolean; reason?: string } {
  if (projectStatus === "FOR_QA") {
    return { allowed: true };
  }

  if (projectStatus === "ETHICAL_BREACH") {
    return {
      allowed: false,
      reason: "This study is locked due to an active ethical breach escalation.",
    };
  }

  if (qaApproved || projectStatus === "DELIVERED") {
    return {
      allowed: false,
      reason: "QA evaluation has already been approved for this study.",
    };
  }

  if (projectStatus === "QA_REVISION") {
    return {
      allowed: false,
      reason: "This study is currently undergoing revisions by the Lead Statistical Analyst.",
    };
  }

  return {
    allowed: false,
    reason: `QA evaluation cannot be submitted while study is in '${projectStatus}' status.`,
  };
}

/**
 * 3. Computes the 24-hour turnaround deadline for QA revisions.
 */
export function computeQaRevisionDeadline(from: Date = new Date()): Date {
  return new Date(from.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * 4. Checks if a package belongs to Tier 2 (JX-03 Core or JX-04 Advanced).
 * Under RULE_REL_02, Tier 2 packages strictly require QA approval before release.
 */
export function isTier2Package(packageName: string | null | undefined): boolean {
  if (!packageName) return false;
  return (
    packageName.includes("JX_03") ||
    packageName.includes("JX_04") ||
    packageName.includes("CORE") ||
    packageName.includes("ADVANCED")
  );
}

/**
 * 5. Masks internal QA workflow statuses for client-facing queries.
 * In accordance with JAXIS security protocols, clients receive 'IN_PROGRESS'
 * for all internal QA review, revision, and breach states.
 */
export const QA_INTERNAL_STATUSES: ProjectStatus[] = [
  "FOR_QA",
  "QA_REVISION",
  "ETHICAL_BREACH",
];

export function getClientFacingStatus(
  masterStatus: ProjectStatus,
  viewerRole: RoleName | string = "CLIENT"
): ProjectStatus {
  if (viewerRole === "CLIENT" && QA_INTERNAL_STATUSES.includes(masterStatus)) {
    return "IN_PROGRESS";
  }
  return masterStatus;
}

/**
 * 6. Error classification metadata.
 */
export const ERROR_CLASSIFICATION_METADATA: Record<
  ErrorClassification,
  {
    label: string;
    description: string;
    badgeVariant: "info" | "warning" | "danger";
  }
> = {
  MINOR: {
    label: "Minor Formatting / Note",
    description: "Minor APA formatting, table labeling, or non-critical cosmetic adjustment.",
    badgeVariant: "info",
  },
  MAJOR: {
    label: "Major Analytical Discrepancy",
    description: "Incorrect statistical test selection, unverified assumptions, or missing outputs.",
    badgeVariant: "warning",
  },
  CRITICAL: {
    label: "Critical Calculation Flaw",
    description: "Flawed calculations, incorrect inferences, or severe methodological error.",
    badgeVariant: "danger",
  },
  ETHICAL_BREACH: {
    label: "Ethical Violation / Data Manipulation",
    description: "Data fabrication, p-hacking, or severe academic dishonesty (RULE_ETH_01).",
    badgeVariant: "danger",
  },
};

/**
 * 7. QA Decision metadata.
 */
export const QA_DECISION_METADATA: Record<
  QADecision,
  {
    label: string;
    description: string;
    badgeVariant: "emerald" | "warning" | "danger";
  }
> = {
  QA_APPROVED: {
    label: "Approve Study",
    description: "Analytical output passes all quality, accuracy, and reproducibility checks.",
    badgeVariant: "emerald",
  },
  QA_REJECTED: {
    label: "Require Revisions",
    description: "Requires corrections by the Lead Statistical Analyst within 24 hours.",
    badgeVariant: "warning",
  },
  ESCALATED_TO_CEO: {
    label: "Escalate Ethical Breach",
    description: "Locks project immediately and alerts CEO for emergency intervention.",
    badgeVariant: "danger",
  },
};
