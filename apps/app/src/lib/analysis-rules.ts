import { db } from "@/lib/db";
import { AnalysisFileCategory, type ProjectStatus } from "@prisma/client";

export const ALLOWED_ANALYSIS_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/octet-stream",
  "text/x-r-source",
  "text/x-python",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/json",
];

export const ALLOWED_ANALYSIS_EXTENSIONS = [
  ".pdf",
  ".xlsx",
  ".xls",
  ".csv",
  ".sav",
  ".spv",
  ".r",
  ".rmd",
  ".py",
  ".ipynb",
  ".dta",
  ".do",
  ".zip",
  ".txt",
  ".docx",
];

export const MAX_ANALYSIS_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export interface AnalysisCategoryMeta {
  label: string;
  description: string;
  badgeVariant: "sky" | "emerald" | "amber" | "info" | "secondary" | "warning" | "muted";
  allowedExtensions: string[];
  accept: string;
  hint: string;
}

export const ANALYSIS_CATEGORY_METADATA: Record<AnalysisFileCategory, AnalysisCategoryMeta> = {
  PDF_REPORT: {
    label: "1. Client Results & Discussion (PDF / DOCX)",
    description: "Written statistical narrative, APA tables, and results interpretation",
    badgeVariant: "warning",
    allowedExtensions: [".pdf", ".docx", ".doc"],
    accept: ".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword",
    hint: ".pdf, .docx, .doc",
  },
  R_OUTPUT: {
    label: "2. R Script / Markdown (.r, .rmd)",
    description: "Reproducible R source code (.r), RMarkdown (.rmd), or serialized output (.rds)",
    badgeVariant: "sky",
    allowedExtensions: [".r", ".rmd", ".rds"],
    accept: ".r,.rmd,.rds,text/x-r-source,text/plain",
    hint: ".r, .rmd, .rds",
  },
  PYTHON_OUTPUT: {
    label: "2. Python Script / Notebook (.py, .ipynb)",
    description: "Python reproducible script (.py) or computational notebook (.ipynb)",
    badgeVariant: "emerald",
    allowedExtensions: [".py", ".ipynb"],
    accept: ".py,.ipynb,text/x-python,application/x-ipynb+json,text/plain",
    hint: ".py, .ipynb",
  },
  SPSS_OUTPUT: {
    label: "2. SPSS Syntax / Output (.sps, .spv, .sav)",
    description: "SPSS dataset (.sav), output viewer (.spv), or syntax (.sps)",
    badgeVariant: "secondary",
    allowedExtensions: [".sav", ".spv", ".sps"],
    accept: ".sav,.spv,.sps,application/x-spss-sav,application/octet-stream",
    hint: ".sav, .spv, .sps",
  },
  EXCEL_WORKBOOK: {
    label: "Excel Calculation Workbook (.xlsx)",
    description: "Statistical summary tables, crosstabs, and raw calculations (.xlsx)",
    badgeVariant: "emerald",
    allowedExtensions: [".xlsx", ".xls", ".csv"],
    accept: ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv",
    hint: ".xlsx, .xls, .csv",
  },
  STATA_OUTPUT: {
    label: "Stata Do-File / Output (.do, .dta)",
    description: "Stata dataset (.dta), command log, or do-file (.do)",
    badgeVariant: "info",
    allowedExtensions: [".do", ".dta"],
    accept: ".do,.dta,application/octet-stream,text/plain",
    hint: ".do, .dta",
  },
  RAW_DATASET: {
    label: "Cleaned / Imputed Dataset",
    description: "Preprocessed and imputed research dataset (.csv, .xlsx, .sav)",
    badgeVariant: "sky",
    allowedExtensions: [".csv", ".xlsx", ".sav", ".dta", ".json"],
    accept: ".csv,.xlsx,.sav,.dta,.json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json",
    hint: ".csv, .xlsx, .sav, .dta, .json",
  },
  OTHER: {
    label: "Other Analytical Asset",
    description: "Supplementary archive (.zip), figure, or documentation",
    badgeVariant: "muted",
    allowedExtensions: [".pdf", ".docx", ".xlsx", ".csv", ".zip", ".txt"],
    accept: ".pdf,.docx,.xlsx,.csv,.zip,.txt",
    hint: ".pdf, .docx, .xlsx, .csv, .zip, .txt",
  },
};

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
    throw new Error("NOT_ASSIGNED: You are not the actively assigned Lead Statistician for this study.");
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
      reason: "Work is currently halted due to an active scope creep flag. Uploads will unlock once the supplemental quotation is resolved.",
    };
  }

  if (status === "FOR_QA") {
    return {
      allowed: false,
      reason: "This study is currently submitted for QA evaluation. File uploads are locked pending Senior QA Lead review.",
    };
  }

  if (["DELIVERED", "CLOSED", "HALTED", "CANCELLED", "DISPUTED", "EXPIRED", "ETHICAL_BREACH"].includes(status)) {
    return {
      allowed: false,
      reason: `File modifications are disabled because the study is in ${status} state.`,
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

  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();

  // If specific category is provided, validate against category-specific allowed extensions
  if (category && ANALYSIS_CATEGORY_METADATA[category]) {
    const catMeta = ANALYSIS_CATEGORY_METADATA[category];
    if (!catMeta.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File "${fileName}" does not match "${catMeta.label}". Expected file format: ${catMeta.hint} (received "${ext}").`,
      };
    }
    return { valid: true };
  }

  const hasValidExt = ALLOWED_ANALYSIS_EXTENSIONS.includes(ext);
  if (!hasValidExt) {
    return {
      valid: false,
      error: `File extension "${ext}" is not supported. Supported extensions: ${ALLOWED_ANALYSIS_EXTENSIONS.join(", ")}`,
    };
  }

  return { valid: true };
}
