import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { r2Client } from "@/lib/storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import type { FileCategory } from "@prisma/client";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const ALLOWED_CATEGORY_EXTENSIONS: Partial<Record<FileCategory, string[]>> = {
  RESEARCH_DOCUMENT: [".pdf", ".docx", ".doc", ".zip"],
  DATASET: [".xlsx", ".xls", ".csv", ".sav", ".dta", ".tsv"],
  QUESTIONNAIRE: [".pdf", ".docx", ".doc", ".xlsx", ".csv"],
  PAYMENT_PROOF: [".pdf", ".png", ".jpg", ".jpeg"],
  ANALYSIS_OUTPUT: [".pdf", ".docx", ".xlsx", ".csv", ".zip", ".sav"],
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as FileCategory) || "RESEARCH_DOCUMENT";
    const studyId = (formData.get("studyId") as string) || "general";

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "No file was provided." } },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
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
    const fileNameLower = file.name.toLowerCase();
    const allowed = ALLOWED_CATEGORY_EXTENSIONS[category] || [".pdf", ".docx", ".xlsx", ".csv", ".sav"];
    const hasValidExtension = allowed.some((ext) => fileNameLower.endsWith(ext));

    if (!hasValidExtension) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FILE_TYPE",
            message: `The file "${file.name}" is not an accepted format for ${category} (${allowed.join(", ")}).`,
          },
        },
        { status: 400 }
      );
    }

    // Prepare buffer and Cloudflare R2 Key
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const sanitizedStudyId = studyId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const storageKey = `studies/${sanitizedStudyId}/${Date.now()}-${cleanFileName}`;
    const contentType = file.type || "application/octet-stream";

    // Upload directly to Cloudflare R2
    await r2Client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: storageKey,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const publicUrl = env.R2_PUBLIC_URL
      ? `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${storageKey}`
      : storageKey;

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        storageKey,
        publicUrl,
        fileType: contentType,
        fileSize: file.size,
        fileCategory: category,
      },
    });
  } catch (error) {
    console.error("[Cloudflare R2 Upload Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPLOAD_FAILED",
          message: "Failed to upload file. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
