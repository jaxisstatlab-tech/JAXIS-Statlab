import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

// Cloudflare R2 via S3-compatible API — for large files
export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function getR2UploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    r2Client,
    new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn: 300 } // 5 minutes
  );
}

export async function getR2DownloadUrl(
  key: string,
  fileName?: string,
  contentType?: string
): Promise<string> {
  const safeFileName = fileName ? fileName.replace(/[^\w.-]/g, "_") : undefined;
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: safeFileName
        ? `attachment; filename="${safeFileName}"`
        : undefined,
      ResponseContentType: contentType || undefined,
    }),
    { expiresIn: 3600 } // 1 hour
  );
}

/**
 * Extracts the relative S3 storage key from a full public URL or relative path.
 * e.g. "https://pub-xxx.r2.dev/studies/intake/file.pdf" -> "studies/intake/file.pdf"
 * e.g. "/studies/intake/file.pdf" -> "studies/intake/file.pdf"
 */
export function extractR2StorageKey(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    }
  } catch {
    // If URL parsing fails, continue to string stripping
  }
  return trimmed.replace(/^\/+/, "");
}

/**
 * Generates an organized, domain-segregated Cloudflare R2 storage key.
 *
 * Folder Structure:
 * - Client Raw Inputs:  studies/{studyId}/raw/{timestamp}-{filename}
 * - Analysis Workbench: studies/{studyId}/workbench/{timestamp}-{filename}
 * - Final Deliverables: deliverables/{studyId}/{timestamp}-{filename}
 * - Payment Proofs:     treasury/payments/{studyId}/{timestamp}-{filename}
 * - Dispute Evidence:   disputes/{studyId}/{timestamp}-{filename}
 */
export function generateR2StorageKey(
  category: string,
  entityId: string,
  fileName: string
): string {
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const sanitizedId = (entityId || "general").replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = Date.now();

  switch (category) {
    case "PAYMENT_PROOF":
      return `treasury/payments/${sanitizedId}/${timestamp}-${cleanFileName}`;
    case "DELIVERABLE":
      return `deliverables/${sanitizedId}/${timestamp}-${cleanFileName}`;
    case "ANALYSIS_OUTPUT":
      return `studies/${sanitizedId}/workbench/${timestamp}-${cleanFileName}`;
    case "DISPUTE_EVIDENCE":
      return `disputes/${sanitizedId}/${timestamp}-${cleanFileName}`;
    case "RESEARCH_DOCUMENT":
    case "DATASET":
    case "QUESTIONNAIRE":
    default:
      return `studies/${sanitizedId}/raw/${timestamp}-${cleanFileName}`;
  }
}

/**
 * Permanently deletes an object from Cloudflare R2 storage bucket.
 * Automatically handles full URLs by extracting the storage key.
 */
export async function deleteR2Object(keyOrUrl: string): Promise<boolean> {
  const key = extractR2StorageKey(keyOrUrl);
  if (!key || !env.R2_BUCKET_NAME) return false;
  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error(`[deleteR2Object] Failed to delete object "${key}" from R2:`, error);
    return false;
  }
}

/**
 * High-performance batched deletion for multiple R2 objects using DeleteObjectsCommand.
 * Automatically sanitizes keys from URLs and processes up to 1,000 objects per S3 batch.
 */
export async function deleteMultipleR2Objects(
  keysOrUrls: string[]
): Promise<{ deleted: number; failed: number }> {
  if (!env.R2_BUCKET_NAME || !keysOrUrls.length) return { deleted: 0, failed: 0 };

  const sanitizedKeys = Array.from(
    new Set(
      keysOrUrls
        .map((k) => extractR2StorageKey(k))
        .filter((k): k is string => Boolean(k && k.length > 0))
    )
  );

  if (!sanitizedKeys.length) return { deleted: 0, failed: 0 };

  let totalDeleted = 0;
  let totalFailed = 0;

  // AWS S3 DeleteObjects supports max 1,000 keys per batch
  const chunkSize = 1000;
  for (let i = 0; i < sanitizedKeys.length; i += chunkSize) {
    const chunk = sanitizedKeys.slice(i, i + chunkSize);
    try {
      const command = new DeleteObjectsCommand({
        Bucket: env.R2_BUCKET_NAME,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      });
      const response = await r2Client.send(command);
      const errors = response.Errors?.length || 0;
      totalDeleted += chunk.length - errors;
      totalFailed += errors;
    } catch (error) {
      console.error("[deleteMultipleR2Objects] Batch deletion failed, falling back to individual deletes:", error);
      for (const key of chunk) {
        const ok = await deleteR2Object(key);
        if (ok) totalDeleted++;
        else totalFailed++;
      }
    }
  }

  return { deleted: totalDeleted, failed: totalFailed };
}

/**
 * Lists all objects currently stored in the Cloudflare R2 bucket.
 */
export async function listAllR2Objects(prefix?: string): Promise<Array<{ key: string; size: number; lastModified?: Date }>> {
  if (!env.R2_BUCKET_NAME) return [];
  const results: Array<{ key: string; size: number; lastModified?: Date }> = [];
  let continuationToken: string | undefined = undefined;

  do {
    const command: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: env.R2_BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const res: ListObjectsV2CommandOutput = await r2Client.send(command);
    if (res.Contents) {
      for (const item of res.Contents) {
        if (item.Key) {
          results.push({
            key: item.Key,
            size: item.Size || 0,
            lastModified: item.LastModified,
          });
        }
      }
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  return results;
}

