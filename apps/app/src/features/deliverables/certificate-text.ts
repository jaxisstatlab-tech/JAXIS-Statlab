import type { QaCertificateDTO } from "./schemas";

// One wording for the certificate, used by both the on-screen/printable sheet and the PDF, so the
// two never disagree. It states what actually happened (a second statistical analyst checked the
// analysis and approved it for release) and lists what the check covers; no broader claims.

export const CERTIFICATE_TEXT = {
  title: "Certificate of Statistical Audit",
  statement:
    "This certifies that the statistical analysis for the study below was checked by a second statistical analyst at JAXIS StatLab and approved for release.",
  checks: [
    "Data cleaning and coding",
    "The assumptions of each statistical test",
    "Whether each test fits the research questions",
    "The accuracy of the reported numbers and tables",
  ],
  approval: (d: Pick<QaCertificateDTO, "completionDate">) =>
    `The results were approved for release on ${d.completionDate}. Authorship and academic responsibility for the study remain with the researcher.`,
  /** Shown instead of a signature image when the reviewer has none on file (never another person's). */
  noSignature: "Approved electronically in JAXIS StatLab",
  contact: "consult@jaxisstatlab.com",
};

/** Rows for "The study". Empty values are left out instead of showing placeholder text. */
export function certificateRows(d: QaCertificateDTO): Array<{ label: string; value: string }> {
  const school = [d.institution, d.program].map((s) => (s || "").trim()).filter(Boolean).join(", ");
  return [
    { label: "Study title", value: d.researchTitle },
    { label: "Researcher", value: d.clientName },
    { label: "School and program", value: school },
    { label: "Package", value: d.tierExecuted },
    { label: "Approved on", value: d.completionDate },
  ].filter((r) => (r.value || "").trim().length > 0);
}
