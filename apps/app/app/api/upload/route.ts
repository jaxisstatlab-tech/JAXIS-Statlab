import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { r2Client, generateR2StorageKey } from "@/lib/storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import type { FileCategory } from "@prisma/client";
import { canVerifyPayment } from "@/lib/payment-rules";
import { allowedForCategory, hasAllowedExtension, maxBytesForCategory } from "@/lib/file-types";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB


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

    // Payment QR codes are shown to every client, so only the people who manage payment accounts may upload them.
    if (String(studyId) === "SYSTEM_CONFIG" && !canVerifyPayment(session.user.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only finance, admin, or the CEO can upload payment QR codes." } },
        { status: 403 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "No file was provided." } },
        { status: 400 }
      );
    }

    // Profile photos: 2 MB at most, and always into the uploader's own folder (whatever id the browser sent).
    if (String(category) === "AVATAR") {
      if (file.size > maxBytesForCategory("AVATAR")) {
        return NextResponse.json(
          { success: false, error: { code: "FILE_TOO_LARGE", message: "Your photo is over 2 MB. Please use a smaller picture." } },
          { status: 400 }
        );
      }
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
    const allowed = allowedForCategory(String(category));
    const hasValidExtension = hasAllowedExtension(file.name, allowed);

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
    const storageKey = generateR2StorageKey(category, String(category) === "AVATAR" ? session.user.id : studyId, file.name);
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
