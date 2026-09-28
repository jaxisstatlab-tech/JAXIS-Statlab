/**
 * Core business rules, policies, and locking guardrails for Module 06 (06-sow).
 * Statement of Work generation, immutable snapshots, and digital signature validation.
 */

export type SOWContentSnapshot = {
  client: {
    fullName: string;
    email: string;
    institution: string;
    academicProgram: string;
    contactNumber: string;
  };
  project: {
    intakeId: string;
    researchTitle: string;
    researchObjectives: string;
    researchQuestions: string;
    hypotheses?: string | null;
  };
  commercial: {
    packageName: string;
    packageLabel: string;
    addOns: string[];
    basePrice: number;
    totalAmount: number;
    downpaymentRequired: number;
    balanceDue: number;
    paymentMethod: string;
  };
  delivery: {
    turnaroundDays: number;
    slaStartTrigger: string;
  };
  terms: {
    revisionPolicy: string;
    refundPolicy: string;
    communicationPolicy: string;
    liabilityBoundary: string;
    customTerms?: string | null;
  };
  generatedAt: string; // ISO timestamp
};

export const DEFAULT_REVISION_POLICY =
  "JAXIS StatLab provides minor revisions (e.g. data re-runs, formatting adjustments, or clarificatory notes) within seven (7) business days of initial deliverable handoff. Significant methodology modifications or additions to research objectives requested after SOW execution are deemed out of scope and require a Supplemental Statement of Work.";

export const DEFAULT_REFUND_POLICY =
  "In accordance with JAXIS commercial policies, downpayments are non-refundable once statistical analysis has commenced. If work is halted prior to expert assignment due to client withdrawal, a cancellation fee of 20% applies to cover administrative evaluation costs.";

export const DEFAULT_COMMUNICATION_POLICY =
  "To safeguard academic integrity, prevent unauthorized scope creep, and maintain full data confidentiality, all client-analyst correspondence, dataset revisions, and deliverable handoffs must be conducted exclusively through the authenticated JAXIS StatLab portal. Direct external communications are strictly prohibited.";

export const DEFAULT_LIABILITY_BOUNDARY =
  "JAXIS StatLab provides professional statistical computing, data analysis, and methodological reporting services. The client retains sole authorship, intellectual property rights, and final academic responsibility for thesis defense, publication, or institutional submission.";

/**
 * Asserts that an SOW is unlocked.
 * Throws an error if the SOW has already been signed by the client.
 */
export function assertSOWUnlocked(isLocked: boolean): void {
  if (isLocked) {
    throw new Error(
      "SOW_LOCKED: This Statement of Work has been signed and is legally locked. No modifications are permitted under any circumstance."
    );
  }
}

/**
 * Validates that the typed full name matches the registered client name (case-insensitive trim).
 */
export function validateSignatoryName(
  typedName: string,
  registeredFullName: string
): boolean {
  if (!typedName || !registeredFullName) return false;
  return (
    typedName.trim().toLowerCase() === registeredFullName.trim().toLowerCase()
  );
}

/**
 * Constructs the canonical, unalterable JSON content snapshot for an SOW.
 */
export function buildSOWSnapshot(params: {
  client: {
    fullName: string;
    email: string;
    institution?: string | null;
    academicProgram?: string | null;
    phone?: string | null;
  };
  project: {
    intakeId: string;
    researchTitle: string;
    researchObjectives: string;
    researchQuestions: string;
    hypotheses?: string | null;
  };
  commercial: {
    packageName: string;
    packageLabel?: string;
    addOns: string[];
    basePrice: number;
    totalAmount: number;
    downpaymentRequired: number;
    balanceDue?: number;
  };
  delivery: {
    turnaroundDays: number;
    slaStartTrigger?: string;
  };
  customTerms?: string | null;
}): SOWContentSnapshot {
  const { client, project, commercial, delivery, customTerms } = params;

  return {
    client: {
      fullName: client.fullName,
      email: client.email,
      institution: client.institution || "Independent Researcher",
      academicProgram: client.academicProgram || "Graduate / Faculty Research",
      contactNumber: client.phone || "On File",
    },
    project: {
      intakeId: project.intakeId,
      researchTitle: project.researchTitle,
      researchObjectives: project.researchObjectives,
      researchQuestions: project.researchQuestions,
      hypotheses: project.hypotheses || null,
    },
    commercial: {
      packageName: commercial.packageName,
      packageLabel: commercial.packageLabel || commercial.packageName,
      addOns: commercial.addOns,
      basePrice: commercial.basePrice,
      totalAmount: commercial.totalAmount,
      downpaymentRequired: commercial.downpaymentRequired,
      balanceDue:
        commercial.balanceDue ??
        Math.max(0, commercial.totalAmount - commercial.downpaymentRequired),
      paymentMethod: "GCash or Verified Bank Transfer (Philippine Peso)",
    },
    delivery: {
      turnaroundDays: delivery.turnaroundDays,
      slaStartTrigger:
        delivery.slaStartTrigger ||
        "SLA timeline commences immediately upon Lead Statistical Analyst assignment and verified downpayment receipt.",
    },
    terms: {
      revisionPolicy: DEFAULT_REVISION_POLICY,
      refundPolicy: DEFAULT_REFUND_POLICY,
      communicationPolicy: DEFAULT_COMMUNICATION_POLICY,
      liabilityBoundary: DEFAULT_LIABILITY_BOUNDARY,
      customTerms: customTerms?.trim() || null,
    },
    generatedAt: new Date().toISOString(),
  };
}
