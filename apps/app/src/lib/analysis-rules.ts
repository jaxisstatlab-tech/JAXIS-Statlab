import { db } from "@/lib/db";
import { AnalysisFileCategory, type ProjectStatus } from "@prisma/client";
import { DATA_EXTENSIONS, REPORT_AND_FIGURE_EXTENSIONS, fileExtension } from "@/lib/file-types";

export const MAX_ANALYSIS_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export interface AnalysisCategoryMeta {
  /** Plain name shown in the workbench, the review page and file lists. */
  label: string;
  description: string;
  badgeVariant: "sky" | "emerald" | "amber" | "info" | "secondary" | "warning" | "muted";
  allowedExtensions: string[];
  /** For the file picker (the extensions, comma separated). */
  accept: string;
  /** Short list of the formats, e.g. ".r, .rmd, .qmd". */
  hint: string;
}

const meta = (
  label: string,
  description: string,
  badgeVariant: AnalysisCategoryMeta["badgeVariant"],
  allowedExtensions: string[]
): AnalysisCategoryMeta => ({
  label,
  description,
  badgeVariant,
  allowedExtensions,
  accept: allowedExtensions.join(","),
  hint: allowedExtensions.join(", "),
});

// Each kind of analysis file and the formats it takes. Lists come from src/lib/file-types.ts.
export const ANALYSIS_CATEGORY_METADATA: Record<AnalysisFileCategory, AnalysisCategoryMeta> = {
  PDF_REPORT: meta("Results write-up", "Chapter 4 or the results and discussion, with APA tables", "warning", [".pdf", ".docx", ".doc", ".odt", ".html"]),
  R_OUTPUT: meta("R or Quarto", "R scripts, R Markdown or Quarto files, and saved R data", "sky", [".r", ".rmd", ".qmd", ".rds", ".rdata", ".rda", ".html"]),
  PYTHON_OUTPUT: meta("Python", "Python scripts or Jupyter notebooks", "emerald", [".py", ".ipynb", ".html"]),
  SPSS_OUTPUT: meta("SPSS", "Syntax, output and data files", "secondary", [".sps", ".spv", ".sav", ".zsav", ".por"]),
  EXCEL_WORKBOOK: meta("Excel workbook", "Tables and calculations in a spreadsheet", "emerald", [".xlsx", ".xls", ".xlsm", ".ods", ".csv"]),
  STATA_OUTPUT: meta("Stata", "Do-files, logs and data files", "info", [".do", ".log", ".smcl", ".dta"]),
  RAW_DATASET: meta("Cleaned data", "The data after cleaning, in any common format", "sky", DATA_EXTENSIONS),
  OTHER: meta(
    "Other files",
    "SAS, JASP, jamovi or Minitab files, figures, or a ZIP of everything",
    "muted",
    [...new Set([".sas", ".sas7bdat", ".xpt", ".jasp", ".omv", ".mtw", ".mpx", ...REPORT_AND_FIGURE_EXTENSIONS, ".pdf", ".docx", ".txt", ".zip"])]
  ),
};

/** Every extension any analysis file kind accepts. */
export const ALLOWED_ANALYSIS_EXTENSIONS = [...new Set(Object.values(ANALYSIS_CATEGORY_METADATA).flatMap((m) => m.allowedExtensions))];

/** The kinds that count as "code or output" for sending to the reviewer (the write-up is the other half). */
export const CODE_OR_OUTPUT_CATEGORIES: AnalysisFileCategory[] = [
  "R_OUTPUT",
  "PYTHON_OUTPUT",
  "SPSS_OUTPUT",
  "STATA_OUTPUT",
  "EXCEL_WORKBOOK",
  "OTHER",
];

/**
 * What's still missing before the work can go to the reviewer: a current results write-up, and current code or
 * output so the reviewer can check the numbers. Empty when ready. Used by the workbench and by submitForQA.
 */
export function missingForReview(currentCategories: string[]): string[] {
  const missing: string[] = [];
  if (!currentCategories.includes("PDF_REPORT")) missing.push("a results write-up");
  if (!currentCategories.some((c) => CODE_OR_OUTPUT_CATEGORIES.includes(c as AnalysisFileCategory))) {
    missing.push("your code or output (R, Quarto, Python, SPSS, Stata, Excel or similar)");
  }
  return missing;
}

/**
 * Asserts that the given statistician is actively assigned to the project.
 */
export async function assertStatisticianAssigned(
  projectId: string,
  statisticianId: string
): Promise<void> {
  const assignment = await db.assignment.findFirst({
    where: {
      projectId,
      statisticianId,
      isActive: true,
    },
  });

  if (!assignment) {
    throw new Error("NOT_ASSIGNED: You are not the actively assigned Lead Statistical Analyst for this study.");
  }
}

/**
 * Validates whether the study master status permits file uploads by the statistician.
 */
export function assertCanUploadAnalysis(status: ProjectStatus): {
  allowed: boolean;
  reason?: string;
} {
  if (status === "SCOPE_CREEP_HALTED") {
    return {
      allowed: false,
      reason: "Work is on hold while the extra work you flagged is priced. Uploads open again once that is settled.",
    };
  }

  if (status === "FOR_QA") {
    return {
      allowed: false,
      reason: "Your files are with the reviewer. Uploads open again if they ask for changes.",
    };
  }

  if (["DELIVERED", "CLOSED", "HALTED", "CANCELLED", "DISPUTED", "EXPIRED", "ETHICAL_BREACH"].includes(status)) {
    return {
      allowed: false,
      reason: status === "DELIVERED" || status === "CLOSED" || status === "DISPUTED" ? "This study is delivered, so its files can't change." : "This study was stopped, so its files can't change.",
    };
  }

  return { allowed: true };
}

/**
 * Validates uploaded file MIME type, extension, and category-specific format match.
 */
export function validateAnalysisFileFormat(
  fileName: string,
  mimeType?: string,
  fileSize?: number,
  category?: AnalysisFileCategory
): {
  valid: boolean;
  error?: string;
} {
  if (fileSize && fileSize > MAX_ANALYSIS_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size (${(fileSize / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed limit of 15MB.`,
    };
  }

  const ext = fileExtension(fileName);

  // If specific category is provided, validate against category-specific allowed extensions
  if (category && ANALYSIS_CATEGORY_METADATA[category]) {
    const catMeta = ANALYSIS_CATEGORY_METADATA[category];
    if (!catMeta.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `"${fileName}" can't be added as ${catMeta.label}. Use ${catMeta.hint}.`,
      };
    }
    return { valid: true };
  }

  const hasValidExt = ALLOWED_ANALYSIS_EXTENSIONS.includes(ext);
  if (!hasValidExt) {
    return {
      valid: false,
      error: `"${ext || "Files without an extension"}" can't be uploaded here.`,
    };
  }

  return { valid: true };
}
