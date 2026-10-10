import type { QaCertificateDTO } from "./schemas";

// One wording for the certificate, used by both the on-screen/printable sheet and the PDF, so the
// two never disagree. The opening statement is the owner's wording (2026-10-10); the list says what
// the check covers.

export const CERTIFICATE_TEXT = {
  title: "Certificate of Statistical Audit",
  /** Heading over the study details (shown in capitals). */
  studyHeading: "1. Project & Research Study Identification",
  /** Heading over the list of what was checked (shown in capitals). */
  checksHeading: "2. Scope of Audit & Verified Compliance Parameters",
  /** Label of the study title row (shown in italics). */
  titleLabel: "Title of Research Study",
  statement:
    "This official attestation confirms that the empirical dataset, analytical procedures, and statistical outputs for the research study specified below have undergone independent methodological auditing and quality assurance verification conducted by JAXIS StatLab.",
  /** Paragraph under the scope heading, above the list of what was checked. */
  scope:
    "The independent audit conducted by JAXIS StatLab Statistical Review Editors verifies dataset structural integrity, procedural alignment, and computational accuracy in accordance with JAXIS Reproducible Execution Standards. All empirical procedures, test statistics, probability values, and tabular outputs have been cross-validated against raw execution logs to confirm mathematical precision and reporting compliance.",
  checks: [
    "Data cleaning and coding",
    "The assumptions of each statistical test",
    "Whether each test fits the research objectives",
    "The accuracy of the reported numbers and tables",
  ],
  attestationHeading: "3. Institutional Attestation & Disclaimer",
  /** The date is in the "Date of Certification" row; this text doesn't repeat it. */
  attestation:
    "JAXIS StatLab certifies that the analytical outputs presented in the verified deliverable are computationally sound and methodologically compliant as of the date of issuance. Primary authorship, contextual interpretation, and academic responsibility for the research findings remain exclusively with the researcher.",
  /** Label over the reviewer's signature (shown in capitals). */
  signedByLabel: "Certified By:",
  /** Bottom line: the study's ID (e.g. JAXIS-202610-5125), shown as the client's ID number. */
  footerId: (d: Pick<QaCertificateDTO, "certificateId" | "studyId">) => `Client ID number: ${certificateStudyId(d)}`,
  /** Shown instead of a signature image when the reviewer has none on file (never another person's). */
  noSignature: "Approved electronically in JAXIS StatLab",
  contact: "consult@jaxisstatlab.com",
};

/** The study's ID (JAXIS-202610-5125); older data only has the certificate number (JAXIS-AUDIT-2026-202610-5125). */
export function certificateStudyId(d: Pick<QaCertificateDTO, "certificateId" | "studyId">): string {
  return d.studyId || d.certificateId.replace(/^JAXIS-AUDIT-\d{4}-/i, "JAXIS-");
}

/** Rows under the study heading. Empty values are left out instead of showing placeholder text. */
export function certificateRows(d: QaCertificateDTO): Array<{ label: string; value: string }> {
  const school = [d.institution, d.program].map((s) => (s || "").trim()).filter(Boolean).join(", ");
  return [
    { label: CERTIFICATE_TEXT.titleLabel, value: d.researchTitle },
    { label: "Researcher", value: d.clientName },
    { label: "Institution & Program", value: school },
    { label: "Package", value: d.tierExecuted },
    { label: "Date of Certification", value: d.completionDate },
  ].filter((r) => (r.value || "").trim().length > 0);
}
