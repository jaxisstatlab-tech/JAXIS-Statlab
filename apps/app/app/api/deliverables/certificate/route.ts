import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClientDeliverables } from "@/features/deliverables/actions";
import { generateCertificatePdfBytes } from "@/features/deliverables/utils/generateCertificatePdf";

export const dynamic = "force-dynamic";

/**
 * Direct Server-Side Certificate PDF Download Endpoint
 * Serves the compiled PDF with explicit HTTP Content-Type: application/pdf
 * and Content-Disposition: attachment; filename="...pdf" headers.
 * This ensures 100% compliance across all browsers (Chrome, Edge, Safari, Firefox)
 * and prevents download managers or extensions from renaming the file to a UUID or stripping .pdf.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Authentication required", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const studyId = searchParams.get("studyId") || searchParams.get("projectId");

  if (!studyId) {
    return new NextResponse("Missing studyId parameter", { status: 400 });
  }

  try {
    const deliverablesData = await getClientDeliverables(studyId);
    if (!deliverablesData.qaCertificate) {
      return new NextResponse("Certificate of Statistical Audit not available for this study.", {
        status: 404,
      });
    }

    const pdfBytes = await generateCertificatePdfBytes(deliverablesData.qaCertificate);
    const rawId = (deliverablesData.qaCertificate.certificateId || "JAXIS-AUDIT-CERTIFICATE").trim();
    const cleanId = rawId.replace(/[^\w.-]/g, "_");
    const fileName = cleanId.toLowerCase().endsWith(".pdf") ? cleanId : `${cleanId}.pdf`;

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": pdfBytes.byteLength.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("Failed to generate certificate PDF on server:", err);
    return new NextResponse(
      err instanceof Error ? err.message : "Failed to generate certificate PDF",
      { status: 500 }
    );
  }
}
