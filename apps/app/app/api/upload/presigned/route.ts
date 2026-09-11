import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getR2UploadUrl } from "@/lib/storage";
import { env } from "@/lib/env";
import type { FileCategory } from "@prisma/client";

// Strict 15MB file size ceiling
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const ALLOWED_CATEGORY_EXTENSIONS: Partial<Record<FileCategory, string[]>> = {
  RESEARCH_DOCUMENT: [".pdf", ".docx", ".doc", ".zip"],
  DATASET: [".xlsx", ".xls", ".csv", ".sav", ".dta", ".tsv"],
  QUESTIONNAIRE: [".pdf", ".docx", ".doc", ".xlsx", ".csv"],
  PAYMENT_PROOF: [".pdf", ".png", ".jpg", ".jpeg"],
  ANALYSIS_OUTPUT: [".pdf", ".docx", ".doc", ".xlsx", ".xls", ".csv", ".zip", ".sav", ".spv", ".sps", ".r", ".rmd", ".py", ".ipynb", ".dta", ".do", ".txt"],
  DELIVERABLE: [".pdf", ".docx", ".xlsx", ".csv", ".zip"],
  DISPUTE_EVIDENCE: [".pdf", ".docx", ".png", ".jpg", ".jpeg", ".zip"],
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "You must be signed in to upload files." } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { fileName, fileSize, fileType, category = "RESEARCH_DOCUMENT", studyId = "general" } = body;

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILENAME", message: "A valid file name must be provided." } },
        { status: 400 }
      );
    }

    if (!fileSize || typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_FILE_SIZE", message: "A valid file size is required." } },
        { status: 400 }
      );
    }

    // Strict 15MB ceiling validation
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: "File exceeds maximum allowed limit of 15MB. Please compress your document.",
          },
        },
        { status: 400 }
      );
    }

    // Validate extension
    const fileNameLower = fileName.toLowerCase();
    const allowed = ALLOWED_CATEGORY_EXTENSIONS[category as FileCategory] || [".pdf", ".docx", ".xlsx", ".csv", ".sav"];
    const hasValidExtension = allowed.some((ext) => fileNameLower.endsWith(ext));

    if (!hasValidExtension) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FILE_TYPE",
            message: `The file "${fileName}" is not an accepted format for ${category} (${allowed.join(", ")}).`,
          },
        },
        { status: 400 }
      );
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const sanitizedStudyId = studyId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const storageKey = `studies/${sanitizedStudyId}/${Date.now()}-${cleanFileName}`;
    const contentType = fileType || "application/octet-stream";

    // Generate Cloudflare R2 Presigned PUT URL (5-minute expiration)
    const uploadUrl = await getR2UploadUrl(storageKey, contentType);

    const publicUrl = env.R2_PUBLIC_URL
      ? `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${storageKey}`
      : storageKey;

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl,
        storageKey,
        publicUrl,
        fileName,
        fileSize,
        fileCategory: category,
        fileType: contentType,
      },
    });
  } catch (error) {
    console.error("[Presigned Upload URL Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PRESIGNED_URL_FAILED",
          message: "Failed to generate secure upload credentials. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
