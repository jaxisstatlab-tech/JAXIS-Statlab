import type { FileCategory } from "@prisma/client";

// Strict 15MB file size ceiling
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export interface R2UploadResult {
  fileName: string;
  storageKey: string;
  publicUrl: string;
  fileType: string;
  fileSize: number;
  fileCategory: FileCategory;
}

export interface UploadResponse {
  success: boolean;
  data?: R2UploadResult;
  error?: { code: string; message: string };
}

/**
 * Uploads a file directly to Cloudflare R2 through the JAXIS secure storage pipeline.
 * Uses direct-to-R2 presigned PUT URLs to bypass Vercel's 4.5MB serverless payload limit,
 * reliably supporting files up to a strict 15MB ceiling.
 * Returns the permanent Cloudflare storage key and public URL.
 */
export async function uploadFileToR2(
  file: File,
  category: FileCategory,
  studyId?: string
): Promise<UploadResponse> {
  // 1. Strict 15MB client-side ceiling guard
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: "File exceeds maximum allowed limit of 15MB. Please compress your file.",
      },
    };
  }

  // 2. Primary pipeline: Direct-to-R2 pre-signed upload (bypasses Vercel 4.5MB payload limit)
  try {
    const presignRes = await fetch("/api/upload/presigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
        category,
        studyId: studyId || "general",
      }),
    });

    if (presignRes.ok) {
      const presignJson = await presignRes.json();
      if (presignJson.success && presignJson.data?.uploadUrl) {
        const { uploadUrl, storageKey, publicUrl } = presignJson.data;

        // Direct PUT to Cloudflare R2 bucket
        const r2PutRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (r2PutRes.ok) {
          return {
            success: true,
            data: {
              fileName: file.name,
              storageKey,
              publicUrl,
              fileType: file.type || "application/octet-stream",
              fileSize: file.size,
              fileCategory: category,
            },
          };
        } else {
          console.warn(`[uploadFileToR2] Direct R2 PUT returned status ${r2PutRes.status}. Falling back to server route.`);
        }
      } else if (!presignJson.success && presignJson.error) {
        return presignJson;
      }
    } else {
      const errJson = await presignRes.json().catch(() => null);
      if (errJson?.error) {
        return errJson;
      }
    }
  } catch (presignErr) {
    console.warn("[uploadFileToR2] Direct presigned upload failed, falling back to server route:", presignErr);
  }

  // 3. Fallback pipeline: Standard /api/upload route
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  if (studyId) {
    formData.append("studyId", studyId);
  }

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    try {
      const errJson = await res.json();
      return errJson;
    } catch {
      if (res.status === 413) {
        return {
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: "File exceeds upload capacity. Please ensure your file is under 15MB.",
          },
        };
      }
      return {
        success: false,
        error: { code: "HTTP_ERROR", message: `Upload failed with HTTP status ${res.status}.` },
      };
    }
  }

  return res.json();
}
