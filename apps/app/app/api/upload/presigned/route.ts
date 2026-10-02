import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getR2UploadUrl, generateR2StorageKey } from "@/lib/storage";
import { env } from "@/lib/env";
import type { FileCategory } from "@prisma/client";
import { canVerifyPayment } from "@/lib/payment-rules";

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

    // Payment QR codes are shown to every client, so only the people who manage payment accounts may upload them.
    if (String(studyId) === "SYSTEM_CONFIG" && !canVerifyPayment(session.user.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only finance, admin, or the CEO can upload payment QR codes." } },
        { status: 403 }
      );
    }

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILENAME", message: "A valid file name must be provided." } },
        { status: 400 }
      );
    }

    if (!fileSize || typeof fileSize !== "number" || !Number.isInteger(fileSize) || fileSize <= 0) {
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

    const storageKey = generateR2StorageKey(category, studyId, fileName);
    const contentType = fileType || "application/octet-stream";

    // Offline dev only: no real storage. The sink keeps the file in a local folder under the same key,
    // so the file viewer can show it again (payment QR codes, receipts) while testing offline.
    if (process.env.NODE_ENV !== "production" && process.env.JAXIS_OFFLINE === "1") {
      return NextResponse.json({
        success: true,
        data: {
          uploadUrl: `/api/dev/upload-sink?key=${encodeURIComponent(storageKey)}`,
          storageKey,
          publicUrl: storageKey,
          fileName,
          fileSize,
          fileCategory: category,
          fileType: contentType,
        },
      });
    }

    // Generate Cloudflare R2 Presigned PUT URL (5-minute expiration)
    // The link only accepts a file of exactly this (already size-checked) length.
    const uploadUrl = await getR2UploadUrl(storageKey, contentType, fileSize);

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
