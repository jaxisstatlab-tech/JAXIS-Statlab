import type { FileCategory } from "@prisma/client";

// One list of the file types JAXIS accepts, shared by the upload routes, the server actions and the upload forms
// (they used to keep separate copies that drifted apart). Safe in browser code: no server imports.
//
// Web-type files (.html, .svg) are fine to accept: the file viewer (/api/files/preview) sends anything that isn't
// a PDF, picture or plain text as a download, never as a page, so nothing inside them can run on this site.

const uniq = (...lists: string[][]) => [...new Set(lists.flat())];

/** Documents: chapters, adviser notes, ethics approval. */
export const DOCUMENT_EXTENSIONS = [".pdf", ".docx", ".doc", ".odt", ".rtf", ".txt"];

/** Data in the formats students and statistics software save: spreadsheets, text, SPSS, Stata, SAS, R, JASP, jamovi, Minitab. */
export const DATA_EXTENSIONS = [
  ".xlsx", ".xls", ".xlsm", ".ods",
  ".csv", ".tsv", ".txt", ".dat", ".json",
  ".sav", ".zsav", ".por",
  ".dta",
  ".sas7bdat", ".xpt",
  ".rds", ".rdata", ".rda",
  ".jasp", ".omv",
  ".mtw", ".mpx",
];

/** Code, notebooks and saved output from the tools analysts use (R and Quarto, Python, SPSS, Stata, SAS, JASP, jamovi, Minitab). */
export const CODE_EXTENSIONS = [
  ".r", ".rmd", ".qmd",
  ".py", ".ipynb",
  ".sps", ".spv",
  ".do", ".log", ".smcl",
  ".sas",
  ".jasp", ".omv",
  ".mtw", ".mpx",
];

/** Rendered reports and figures (Quarto / R Markdown HTML, chart images). */
export const REPORT_AND_FIGURE_EXTENSIONS = [".html", ".png", ".jpg", ".jpeg", ".svg"];

export const ARCHIVE_EXTENSIONS = [".zip"];

/** What each kind of study file may be. The client forms use narrower lists per slot, always inside these. */
export const STUDY_FILE_EXTENSIONS: Record<FileCategory, string[]> = {
  // Chapters and "something else": documents, plus earlier analysis or code the client or adviser already has.
  RESEARCH_DOCUMENT: uniq(DOCUMENT_EXTENSIONS, ARCHIVE_EXTENSIONS, CODE_EXTENSIONS, DATA_EXTENSIONS, REPORT_AND_FIGURE_EXTENSIONS),
  DATASET: DATA_EXTENSIONS,
  QUESTIONNAIRE: uniq([".pdf", ".docx", ".doc", ".odt", ".rtf", ".txt", ".xlsx", ".xls", ".csv"]),
  PAYMENT_PROOF: [".pdf", ".png", ".jpg", ".jpeg"],
  ANALYSIS_OUTPUT: uniq(DOCUMENT_EXTENSIONS, DATA_EXTENSIONS, CODE_EXTENSIONS, REPORT_AND_FIGURE_EXTENSIONS, ARCHIVE_EXTENSIONS),
  DELIVERABLE: uniq(DOCUMENT_EXTENSIONS, DATA_EXTENSIONS, CODE_EXTENSIONS, REPORT_AND_FIGURE_EXTENSIONS, ARCHIVE_EXTENSIONS),
  DISPUTE_EVIDENCE: [".pdf", ".docx", ".png", ".jpg", ".jpeg", ".zip"],
};

/** Lower-case extension with the dot ("survey.QMD" → ".qmd"), or "" when there is none. */
export function fileExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i > 0 ? fileName.slice(i).toLowerCase() : "";
}

export function hasAllowedExtension(fileName: string, allowed: string[]): boolean {
  return allowed.includes(fileExtension(fileName));
}

/** Allowed extensions for a study file kind (falls back to documents for anything unknown). */
export function allowedForCategory(category: string): string[] {
  return STUDY_FILE_EXTENSIONS[category as FileCategory] ?? DOCUMENT_EXTENSIONS;
}

/**
 * Final files a client gets: the written results (PDF or Word). Code, data, output tables and other working
 * files stay with staff; the client also gets the certificate, which is made separately.
 */
export const CLIENT_FILE_EXTENSIONS = [".pdf", ".docx", ".doc"];

export function clientGetsFile(fileName: string): boolean {
  return hasAllowedExtension(fileName, CLIENT_FILE_EXTENSIONS);
}
