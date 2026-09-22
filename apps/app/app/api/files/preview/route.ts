import { NextRequest, NextResponse } from "next/server";
import { r2Client } from "@/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { auth } from "@/lib/auth";
import { db, withDbTimeout } from "@/lib/db";

/**
 * Resilient File Streaming & Preview Proxy
 * Requires active authenticated session and enforces strict tenant and role isolation:
 * - Payment proofs: Only owning Client, Finance Officer, Admin, CEO.
 * - Deliverables: Owning Client (if released), Assigned Specialists, Finance, Admin, CEO.
 * - Project/Analysis files: Study Owner, Assigned Specialists, Admin, CEO.
 * - Public/Profile assets: Any authenticated user.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized: Authentication required to preview files.", {
      status: 401,
    });
  }

  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url") || searchParams.get("key");

  if (!rawUrl) {
    return new NextResponse("Missing file URL or key parameter", { status: 400 });
  }

  // Extract storage key from full R2 URL or relative key
  let storageKey = rawUrl;
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    try {
      const parsed = new URL(rawUrl);
      storageKey = parsed.pathname.replace(/^\/+/, "");
    } catch {
      storageKey = rawUrl;
    }
  }

  const userId = session.user.id;
  const userRole = session.user.role;
  const isManager = userRole === "ADMIN" || userRole === "CEO";
  const isFinance = userRole === "FINANCE_OFFICER";

  // Admin and CEO have system-wide audit access
  if (!isManager) {
    // 1. Allow public profile avatars or branding assets
    const isPublicAsset =
      storageKey.startsWith("avatars/") ||
      storageKey.startsWith("public/") ||
      storageKey.startsWith("system/");

    if (!isPublicAsset) {
      let isAuthorized = false;

      try {
        // 2. Check if file is a Payment Proof
        const paymentProof = await withDbTimeout(
          db.paymentProof.findFirst({
            where: {
              OR: [
                { filePath: storageKey },
                { filePath: { endsWith: storageKey } },
              ],
            },
            include: {
              payment: {
                include: {
                  project: {
                    select: { clientId: true },
                  },
                },
              },
            },
          })
        );

        if (paymentProof) {
          // Payment proofs: Only owning Client and Finance Officers are allowed
          const isOwner = paymentProof.payment?.project?.clientId === userId;
          if (isOwner || isFinance) {
            isAuthorized = true;
          } else {
            return new NextResponse("Forbidden: Access denied to client commercial payment proofs.", {
              status: 403,
            });
          }
        }

        // 3. Check if file is a Deliverable
        if (!isAuthorized) {
          const deliverable = await withDbTimeout(
            db.deliverable.findFirst({
              where: {
                OR: [
                  { filePath: storageKey },
                  { filePath: { endsWith: storageKey } },
                ],
              },
              include: {
                project: {
                  include: {
                    assignment: true,
                  },
                },
              },
            })
          );

          if (deliverable) {
            const isOwner = deliverable.project.clientId === userId;
            const isAssignedStat =
              deliverable.project.assignment?.statisticianId === userId &&
              deliverable.project.assignment?.isActive !== false;
            const isAssignedQa =
              deliverable.project.assignment?.qaLeadId === userId &&
              deliverable.project.assignment?.isActive !== false;

            if (userRole === "CLIENT") {
              if (isOwner && deliverable.isFinalReleased) {
                isAuthorized = true;
              }
            } else if (isAssignedStat || isAssignedQa || isFinance) {
              isAuthorized = true;
            }

            if (!isAuthorized) {
              return new NextResponse("Forbidden: Access denied to research deliverable.", {
                status: 403,
              });
            }
          }
        }

        // 4. Check if file is a Study Project File (dataset, research doc)
        if (!isAuthorized) {
          const projectFile = await withDbTimeout(
            db.projectFile.findFirst({
              where: {
                OR: [
                  { filePath: storageKey },
                  { filePath: { endsWith: storageKey } },
                ],
              },
              include: {
                project: {
                  include: {
                    assignment: true,
                  },
                },
              },
            })
          );

          if (projectFile) {
            const isOwner = projectFile.project.clientId === userId;
            const isAssignedStat =
              projectFile.project.assignment?.statisticianId === userId &&
              projectFile.project.assignment?.isActive !== false;
            const isAssignedQa =
              projectFile.project.assignment?.qaLeadId === userId &&
              projectFile.project.assignment?.isActive !== false;

            if (isOwner || isAssignedStat || isAssignedQa || isFinance) {
              isAuthorized = true;
            } else {
              return new NextResponse("Forbidden: Access denied to study project file.", {
                status: 403,
              });
            }
          }
        }

        // 5. Check if file is an Analysis File (internal workbench)
        if (!isAuthorized) {
          const analysisFile = await withDbTimeout(
            db.analysisFile.findFirst({
              where: {
                OR: [
                  { filePath: storageKey },
                  { filePath: { endsWith: storageKey } },
                ],
              },
              include: {
                project: {
                  include: {
                    assignment: true,
                  },
                },
              },
            })
          );

          if (analysisFile) {
            const isAssignedStat =
              analysisFile.project.assignment?.statisticianId === userId &&
              analysisFile.project.assignment?.isActive !== false;
            const isAssignedQa =
              analysisFile.project.assignment?.qaLeadId === userId &&
              analysisFile.project.assignment?.isActive !== false;

            if (isAssignedStat || isAssignedQa) {
              isAuthorized = true;
            } else {
              return new NextResponse("Forbidden: Access denied to analysis workbench file.", {
                status: 403,
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn("[File Preview Proxy] Authorization lookup warning:", dbErr);
      }

      // If object could not be verified against any study the user has rights to
      if (!isAuthorized) {
        return new NextResponse("Forbidden: Access denied to storage object.", { status: 403 });
      }
    }
  }

  try {
    const s3Res = await r2Client.send(
      new GetObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: storageKey,
      })
    );

    if (!s3Res.Body) {
      return new NextResponse("File body not found in storage bucket", { status: 404 });
    }

    const contentType =
      s3Res.ContentType ||
      (storageKey.endsWith(".png")
        ? "image/png"
        : storageKey.endsWith(".jpg") || storageKey.endsWith(".jpeg")
        ? "image/jpeg"
        : storageKey.endsWith(".webp")
        ? "image/webp"
        : storageKey.endsWith(".pdf")
        ? "application/pdf"
        : "application/octet-stream");

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set(
      "Content-Disposition",
      `inline; filename="${storageKey.split("/").pop() || "preview"}"`
    );

    // Transform stream to Web ReadableStream for Next.js response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = s3Res.Body.transformToWebStream
      ? s3Res.Body.transformToWebStream()
      : (s3Res.Body as any);

    return new NextResponse(stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.warn(
      `[File Preview Proxy] Failed to fetch key "${storageKey}" from Cloudflare R2:`,
      error
    );
    return new NextResponse("File preview unavailable from storage.", { status: 404 });
  }
}
