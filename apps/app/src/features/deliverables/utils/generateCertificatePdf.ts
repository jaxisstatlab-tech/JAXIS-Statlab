import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { QaCertificateDTO } from "../schemas";

// In-memory cache for official brand assets to eliminate redundant network fetches
let cachedSealBytes: Uint8Array | null = null;
let cachedLogoBytes: Uint8Array | null = null;
let cachedSigBytes: Uint8Array | null = null;

async function getSealBytes(): Promise<Uint8Array | null> {
  if (cachedSealBytes) return cachedSealBytes;
  if (typeof window === "undefined") {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const p = path.join(process.cwd(), "public", "jaxis-seal.png");
      if (fs.existsSync(p)) {
        cachedSealBytes = new Uint8Array(fs.readFileSync(p));
        return cachedSealBytes;
      }
    } catch (err) {
      console.warn("Failed to read JAXIS seal on server:", err);
    }
  }
  try {
    const res = await fetch("/jaxis-seal.png");
    if (res.ok) {
      const buf = await res.arrayBuffer();
      cachedSealBytes = new Uint8Array(buf);
      return cachedSealBytes;
    }
  } catch (err) {
    console.warn("Failed to fetch JAXIS seal:", err);
  }
  return null;
}

async function getLogoBytes(): Promise<Uint8Array | null> {
  if (cachedLogoBytes) return cachedLogoBytes;
  if (typeof window === "undefined") {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const p = path.join(process.cwd(), "public", "jaxislogo.png");
      if (fs.existsSync(p)) {
        cachedLogoBytes = new Uint8Array(fs.readFileSync(p));
        return cachedLogoBytes;
      }
    } catch (err) {
      console.warn("Failed to read JAXIS logo on server:", err);
    }
  }
  try {
    const res = await fetch("/jaxislogo.png");
    if (res.ok) {
      const buf = await res.arrayBuffer();
      cachedLogoBytes = new Uint8Array(buf);
      return cachedLogoBytes;
    }
  } catch (err) {
    console.warn("Failed to fetch JAXIS logo:", err);
  }
  return null;
}

async function getSignatureBytes(): Promise<Uint8Array | null> {
  if (cachedSigBytes) return cachedSigBytes;
  if (typeof window === "undefined") {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const p = path.join(process.cwd(), "public", "signatures", "qa-lead-maria.png");
      if (fs.existsSync(p)) {
        cachedSigBytes = new Uint8Array(fs.readFileSync(p));
        return cachedSigBytes;
      }
    } catch (err) {
      console.warn("Failed to read QA signature on server:", err);
    }
  }
  try {
    const res = await fetch("/signatures/qa-lead-maria.png");
    if (res.ok) {
      const buf = await res.arrayBuffer();
      cachedSigBytes = new Uint8Array(buf);
      return cachedSigBytes;
    }
  } catch (err) {
    console.warn("Failed to fetch QA signature asset:", err);
  }
  return null;
}

if (typeof window !== "undefined") {
  // Pre-load assets during idle time
  const win = window as Window & { requestIdleCallback?: (cb: () => void) => void };
  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(() => {
      getSealBytes();
      getLogoBytes();
      getSignatureBytes();
    });
  } else {
    setTimeout(() => {
      getSealBytes();
      getLogoBytes();
      getSignatureBytes();
    }, 300);
  }
}

/**
 * Helper to split text into lines that fit within a maximum width in points.
 */
function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  font: PDFFont
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Converts any image (SVG, PNG, JPG, WebP) or data URL into a PNG Uint8Array via browser Canvas.
 */
async function imageToPngBytes(urlOrDataUrl: string): Promise<Uint8Array | null> {
  if (typeof window === "undefined") {
    try {
      const sharp = (await import("sharp")).default;
      let inputBuffer: Buffer;
      if (urlOrDataUrl.startsWith("data:")) {
        const commaIdx = urlOrDataUrl.indexOf(",");
        const base64Data = urlOrDataUrl.slice(commaIdx + 1);
        if (urlOrDataUrl.startsWith("data:image/svg+xml")) {
          inputBuffer = Buffer.from(decodeURIComponent(base64Data), "utf-8");
        } else {
          inputBuffer = Buffer.from(base64Data, "base64");
        }
      } else if (urlOrDataUrl.startsWith("http://") || urlOrDataUrl.startsWith("https://")) {
        const res = await fetch(urlOrDataUrl);
        const arrayBuf = await res.arrayBuffer();
        inputBuffer = Buffer.from(arrayBuf);
      } else {
        const fs = await import("fs");
        const path = await import("path");
        const cleanPath = urlOrDataUrl.replace(/^\/+/, "");
        const p = path.join(process.cwd(), "public", cleanPath);
        inputBuffer = fs.readFileSync(p);
      }

      const pngBuffer = await sharp(inputBuffer)
        .trim({ threshold: 15 })
        .png()
        .toBuffer();
      return new Uint8Array(pngBuffer);
    } catch (err) {
      console.warn("Server-side image rasterization failed:", err);
      return null;
    }
  }

  return new Promise((resolve) => {
    let cleanSrc = urlOrDataUrl;
    let blobUrlToRevoke: string | null = null;

    // If it's an SVG data URI, create an explicit Blob URL for instant, reliable browser decoding
    if (urlOrDataUrl.startsWith("data:image/svg+xml")) {
      const commaIdx = urlOrDataUrl.indexOf(",");
      if (commaIdx !== -1) {
        try {
          const rawSvg = decodeURIComponent(urlOrDataUrl.slice(commaIdx + 1));
          const svgBlob = new Blob([rawSvg], { type: "image/svg+xml;charset=utf-8" });
          cleanSrc = URL.createObjectURL(svgBlob);
          blobUrlToRevoke = cleanSrc;
        } catch {
          cleanSrc = urlOrDataUrl;
        }
      }
    }

    const cleanup = () => {
      if (blobUrlToRevoke) {
        try {
          URL.revokeObjectURL(blobUrlToRevoke);
        } catch {
          // Ignore revocation error
        }
        blobUrlToRevoke = null;
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      console.warn("Signature conversion timed out");
      resolve(null);
    }, 1200);

    const img = new Image();
    // Do NOT set crossOrigin on data: or blob: URIs as it causes browsers to hang/block
    if (!urlOrDataUrl.startsWith("data:") && !cleanSrc.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        const w = img.naturalWidth || img.width || 400;
        const h = img.naturalHeight || img.height || 160;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          cleanup();
          return resolve(null);
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        cleanup();

        let exportCanvas = canvas;
        try {
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;

          // Detect ink bounding box and transparentize white/off-white background
          let minX = w,
            minY = h,
            maxX = -1,
            maxY = -1;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const r = data[idx] ?? 0;
              const g = data[idx + 1] ?? 0;
              const b = data[idx + 2] ?? 0;
              const a = data[idx + 3] ?? 0;

              const isTransparent = a < 25;
              const isNearWhite = r > 240 && g > 240 && b > 240;

              if (!isTransparent && !isNearWhite) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              } else if (isNearWhite && !isTransparent) {
                // Convert white/light paper background to transparent
                data[idx + 3] = 0;
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);

          // If ink was found, crop tightly around it with 4px safety padding
          if (maxX >= minX && maxY >= minY) {
            const pad = 4;
            const cropX = Math.max(0, minX - pad);
            const cropY = Math.max(0, minY - pad);
            const cropW = Math.min(w - cropX, maxX - minX + 1 + pad * 2);
            const cropH = Math.min(h - cropY, maxY - minY + 1 + pad * 2);

            const croppedCanvas = document.createElement("canvas");
            croppedCanvas.width = cropW;
            croppedCanvas.height = cropH;
            const cropCtx = croppedCanvas.getContext("2d");
            if (cropCtx) {
              cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
              exportCanvas = croppedCanvas;
            }
          }
        } catch {
          // If getImageData has CORS restriction, fall back to uncropped canvas
          exportCanvas = canvas;
        }

        exportCanvas.toBlob(async (blob) => {
          if (!blob) return resolve(null);
          const buf = await blob.arrayBuffer();
          resolve(new Uint8Array(buf));
        }, "image/png");
      } catch (err) {
        cleanup();
        console.warn("Canvas conversion to PNG failed:", err);
        resolve(null);
      }
    };

    img.onerror = (e) => {
      clearTimeout(timeout);
      cleanup();
      console.warn("Image load failed for PNG conversion:", e);
      resolve(null);
    };

    img.src = cleanSrc;
  });
}

/**
 * Generates an official single-page A4 Certificate of Statistical Audit as a PDF Uint8Array
 * following the exact text outline while preserving the credential frame and logo.
 */
export async function generateCertificatePdfBytes(data: QaCertificateDTO): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // A4 Portrait dimensions: 595.28 x 841.89 points
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Standard Fonts (Sans-serif: Helvetica family, WinAnsi compatible)
  const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSansItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  // Calibrated Palette
  const navy = rgb(0.04, 0.12, 0.24); // #0A1F3D - authoritative deep academic navy
  const borderBlue = rgb(0.08, 0.22, 0.44); // #143870 - crisp academic blue inner border
  const black = rgb(0.08, 0.08, 0.08);
  const charcoal = rgb(0.18, 0.20, 0.24);
  const mutedGray = rgb(0.50, 0.54, 0.60);
  const borderLight = rgb(0.82, 0.85, 0.90);
  const dividerLine = rgb(0.20, 0.24, 0.30);

  // Helper text centering
  function drawCenteredText(
    text: string,
    y: number,
    size: number,
    font: PDFFont,
    color: typeof navy
  ) {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y,
      size,
      font,
      color,
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // 1. DUAL FRAME SECURITY BORDER & CORNER GEOMETRY (Preserved as requested)
  // ══════════════════════════════════════════════════════════════════════
  const mOuter = 26;
  const wOuter = width - mOuter * 2;
  const hOuter = height - mOuter * 2;

  // Outer solid navy frame (1.75pt)
  page.drawRectangle({
    x: mOuter,
    y: mOuter,
    width: wOuter,
    height: hOuter,
    borderWidth: 1.75,
    borderColor: navy,
    color: undefined,
  });

  // Inner hairline blue frame (0.75pt, inset by 4.5pt) - crisp blue, no orange
  const mInner = mOuter + 4.5;
  const wInner = width - mInner * 2;
  const hInner = height - mInner * 2;
  page.drawRectangle({
    x: mInner,
    y: mInner,
    width: wInner,
    height: hInner,
    borderWidth: 0.75,
    borderColor: borderBlue,
    color: undefined,
  });

  // Corner decorative squares (4 corners)
  const cornerSize = 7;
  const corners = [
    { x: mOuter - 0.5, y: mOuter - 0.5 },
    { x: mOuter + wOuter - cornerSize + 0.5, y: mOuter - 0.5 },
    { x: mOuter - 0.5, y: mOuter + hOuter - cornerSize + 0.5 },
    { x: mOuter + wOuter - cornerSize + 0.5, y: mOuter + hOuter - cornerSize + 0.5 },
  ];
  for (const c of corners) {
    page.drawRectangle({
      x: c.x,
      y: c.y,
      width: cornerSize,
      height: cornerSize,
      color: navy,
    });
  }

  // Content boundaries
  const contentLeft = 52;
  const contentRight = width - 52;
  const contentWidth = contentRight - contentLeft;

  let currentY = height - 52;

  // ══════════════════════════════════════════════════════════════════════
  // 2. HEADER: OFFICIAL LOGO & TITLES (Following text outline)
  // ══════════════════════════════════════════════════════════════════════
  const logoBytes = await getLogoBytes();
  if (logoBytes) {
    try {
      const logoImg = await pdfDoc.embedPng(logoBytes);
      const logoW = 32;
      const logoH = 32;
      const logoY = currentY - logoH;
      page.drawImage(logoImg, {
        x: (width - logoW) / 2,
        y: logoY,
        width: logoW,
        height: logoH,
      });
      // Ensure clear separation between logo bottom and the title text
      currentY = logoY - 16;
    } catch (err) {
      console.warn("Logo embed:", err);
    }
  }

  // JAXIS STATLAB (font size 19, ascent ~15pt, sans-serif)
  // Position baseline so top of capital letters is at currentY
  const jaxisTitleY = currentY - 15;
  drawCenteredText("JAXIS STATLAB", jaxisTitleY, 19, fontSansBold, black);
  currentY = jaxisTitleY - 21;

  // CERTIFICATE OF STATISTICAL AUDIT
  drawCenteredText("CERTIFICATE OF STATISTICAL AUDIT", currentY, 12.5, fontSansBold, charcoal);
  currentY -= 17;

  // Certificate ID:
  const certIdText = `Certificate ID: ${data.certificateId}`;
  drawCenteredText(certIdText, currentY, 9, courier, mutedGray);
  currentY -= 28;

  // ══════════════════════════════════════════════════════════════════════
  // 3. INTRODUCTORY STATEMENT (Exact text outline, sans-serif)
  // ══════════════════════════════════════════════════════════════════════
  const introText =
    "This is to certify that the quantitative data processing, statistical modeling, and analytical outputs for the research study detailed below have undergone formal methodological evaluation and computational audit by JAXIS STATLAB.";
  const introLines = wrapText(introText, contentWidth, 10, fontSans);
  for (const line of introLines) {
    page.drawText(line, {
      x: contentLeft,
      y: currentY,
      size: 10,
      font: fontSans,
      color: charcoal,
    });
    currentY -= 15.5;
  }
  currentY -= 20;

  // ══════════════════════════════════════════════════════════════════════
  // 4. SECTION 1: PROJECT & CLIENT METADATA (Exact text outline, sans-serif)
  // ══════════════════════════════════════════════════════════════════════
  page.drawText("PROJECT & CLIENT METADATA", {
    x: contentLeft,
    y: currentY,
    size: 10.5,
    font: fontSansBold,
    color: black,
  });
  currentY -= 6;
  page.drawLine({
    start: { x: contentLeft, y: currentY },
    end: { x: contentRight, y: currentY },
    thickness: 0.75,
    color: dividerLine,
  });
  currentY -= 18;

  const metadataRows = [
    {
      label: "Research Title :",
      value: data.researchTitle,
      italic: true,
    },
    {
      label: "Principal Investigator :",
      value: `${data.clientName}${data.clientEmail ? ` (${data.clientEmail})` : ""}`,
      italic: false,
    },
    {
      label: "Institution / Program :",
      value: `${data.institution} / ${data.program}`,
      italic: false,
    },
    {
      label: "Tier Executed :",
      value: data.tierExecuted,
      italic: false,
    },
    {
      label: "Audit Completion Date :",
      value: data.completionDate,
      italic: false,
    },
  ];

  const labelColWidth = 150;
  const valueColX = contentLeft + labelColWidth;
  const valueColWidth = contentWidth - labelColWidth;

  for (const row of metadataRows) {
    page.drawText(row.label, {
      x: contentLeft,
      y: currentY,
      size: 9.5,
      font: fontSansBold,
      color: black,
    });

    const fontToUse = row.italic ? fontSansItalic : fontSans;
    const valueLines = wrapText(row.value, valueColWidth, 9.5, fontToUse);
    for (let i = 0; i < valueLines.length; i++) {
      const lineText = valueLines[i];
      if (!lineText) continue;
      page.drawText(lineText, {
        x: valueColX,
        y: currentY - i * 14,
        size: 9.5,
        font: fontToUse,
        color: charcoal,
      });
    }
    currentY -= Math.max(19, valueLines.length * 14 + 5);
  }

  currentY -= 18;

  // ══════════════════════════════════════════════════════════════════════
  // 5. SECTION 2: METHODOLOGICAL AUDIT FRAMEWORK (Exact text outline)
  // ══════════════════════════════════════════════════════════════════════
  page.drawText("METHODOLOGICAL AUDIT FRAMEWORK", {
    x: contentLeft,
    y: currentY,
    size: 10.5,
    font: fontSansBold,
    color: black,
  });
  currentY -= 6;
  page.drawLine({
    start: { x: contentLeft, y: currentY },
    end: { x: contentRight, y: currentY },
    thickness: 0.75,
    color: dividerLine,
  });
  currentY -= 18;

  const frameworkText =
    "JAXIS STATLAB certifies that the analytical outputs have been independently evaluated across four institutional compliance standards: Data Hygiene & Scale Verification, Statistical Assumption Testing, Model Alignment with Research Intent, and Analytical Execution Integrity. All procedures were confirmed mathematically valid and compliant with academic research standards.";
  const frameworkLines = wrapText(frameworkText, contentWidth, 9.5, fontSans);
  for (const line of frameworkLines) {
    page.drawText(line, {
      x: contentLeft,
      y: currentY,
      size: 9.5,
      font: fontSans,
      color: charcoal,
    });
    currentY -= 15;
  }

  currentY -= 20;

  // ══════════════════════════════════════════════════════════════════════
  // 6. SECTION 3: AUDIT ATTESTATION & SIGNATURES (Exact text outline)
  // ══════════════════════════════════════════════════════════════════════
  page.drawText("AUDIT ATTESTATION & SIGNATURES", {
    x: contentLeft,
    y: currentY,
    size: 10.5,
    font: fontSansBold,
    color: black,
  });
  currentY -= 6;
  page.drawLine({
    start: { x: contentLeft, y: currentY },
    end: { x: contentRight, y: currentY },
    thickness: 0.75,
    color: dividerLine,
  });
  currentY -= 18;

  const attestationText =
    "It is hereby affirmed that the statistical procedures employed are mathematically valid, appropriate for the stated research questions, and rendered in full compliance with academic research standards.";
  const attestationLines = wrapText(attestationText, contentWidth, 9.5, fontSans);
  for (const line of attestationLines) {
    page.drawText(line, {
      x: contentLeft,
      y: currentY,
      size: 9.5,
      font: fontSans,
      color: charcoal,
    });
    currentY -= 15;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 7. DUAL-COLUMN FOOTER: AUDITED & APPROVED BY & AUTHORIZED & ISSUED BY
  // ══════════════════════════════════════════════════════════════════════
  const footerDividerY = 210;
  page.drawLine({
    start: { x: contentLeft, y: footerDividerY },
    end: { x: contentRight, y: footerDividerY },
    thickness: 0.5,
    color: borderLight,
  });

  // DUAL COLUMNS: Exact center anchors for Left Column and Right Column
  const colWidth = contentWidth / 2;
  const leftColCenter = contentLeft + colWidth / 2;
  const rightColCenter = contentRight - colWidth / 2;

  // LEFT COLUMN: AUDITED & APPROVED BY (QA Lead)
  const auditedLabel = "AUDITED & APPROVED BY:";
  const auditedW = fontSansBold.widthOfTextAtSize(auditedLabel, 8.5);
  page.drawText(auditedLabel, {
    x: leftColCenter - auditedW / 2,
    y: footerDividerY - 16,
    size: 8.5,
    font: fontSansBold,
    color: black,
  });

  const sigUnderlineY = 135;

  // Embed QA Signature image (realistic handwritten signature)
  let sigBytes: Uint8Array | null = null;
  if (data.qaSignatureUrl) {
    if (data.qaSignatureUrl === "/signatures/qa-lead-maria.png") {
      sigBytes = await getSignatureBytes();
    } else {
      sigBytes = await imageToPngBytes(data.qaSignatureUrl);
    }
  }
  if (!sigBytes) {
    sigBytes = await getSignatureBytes();
  }

  if (sigBytes) {
    try {
      const sigImage = await pdfDoc.embedPng(sigBytes);
      const maxWidth = 145;
      const maxHeight = 34; // Strict height limit to guarantee >20pt padding below AUDITED & APPROVED BY:
      const scale = Math.min(
        maxWidth / sigImage.width,
        maxHeight / sigImage.height,
        1
      );
      const sigW = sigImage.width * scale;
      const sigH = sigImage.height * scale;
      page.drawImage(sigImage, {
        x: leftColCenter - sigW / 2,
        y: sigUnderlineY + 2,
        width: sigW,
        height: sigH,
      });
    } catch (err) {
      console.warn("Could not embed signature in PDF:", err);
    }
  } else {
    const verifiedText = "Digital QA Record Verified";
    const vWidth = fontSansItalic.widthOfTextAtSize(verifiedText, 8.5);
    page.drawText(verifiedText, {
      x: leftColCenter - vWidth / 2,
      y: sigUnderlineY + 12,
      size: 8.5,
      font: fontSansItalic,
      color: mutedGray,
    });
  }

  // Signature Underline
  const sigLineWidth = 210;
  page.drawLine({
    start: { x: leftColCenter - sigLineWidth / 2, y: sigUnderlineY },
    end: { x: leftColCenter + sigLineWidth / 2, y: sigUnderlineY },
    thickness: 0.75,
    color: black,
  });

  // QA Lead Name & Titles
  const qaName = data.qaLeadName;
  const qaNameW = fontSansBold.widthOfTextAtSize(qaName, 10);
  page.drawText(qaName, {
    x: leftColCenter - qaNameW / 2,
    y: sigUnderlineY - 13,
    size: 10,
    font: fontSansBold,
    color: black,
  });

  const qaTitle = data.qaLeadTitle;
  const qaTitleW = fontSans.widthOfTextAtSize(qaTitle, 8.5);
  page.drawText(qaTitle, {
    x: leftColCenter - qaTitleW / 2,
    y: sigUnderlineY - 25,
    size: 8.5,
    font: fontSans,
    color: charcoal,
  });

  const qaOrg = "JAXIS STATLAB";
  const qaOrgW = fontSansBold.widthOfTextAtSize(qaOrg, 8);
  page.drawText(qaOrg, {
    x: leftColCenter - qaOrgW / 2,
    y: sigUnderlineY - 37,
    size: 8,
    font: fontSansBold,
    color: navy,
  });

  // RIGHT COLUMN: AUTHORIZED & ISSUED BY (Official Seal)
  const sealW = 185;
  const sealH = 71.5;
  const sealX = rightColCenter - sealW / 2;

  const authLabel = "AUTHORIZED & ISSUED BY:";
  const authW = fontSansBold.widthOfTextAtSize(authLabel, 8.5);
  page.drawText(authLabel, {
    x: rightColCenter - authW / 2,
    y: footerDividerY - 16,
    size: 8.5,
    font: fontSansBold,
    color: black,
  });

  try {
    const sealBytes = await getSealBytes();
    if (sealBytes) {
      const sealImage = await pdfDoc.embedPng(sealBytes);
      page.drawImage(sealImage, {
        x: sealX,
        y: footerDividerY - 101.5,
        width: sealW,
        height: sealH,
      });
    }
  } catch (err) {
    console.warn("Could not embed JAXIS seal in PDF:", err);
  }


  // ══════════════════════════════════════════════════════════════════════
  // 9. RETURN COMPILED PDF BYTES
  // ══════════════════════════════════════════════════════════════════════
  return await pdfDoc.save();
}

/**
 * Triggers a robust browser file download of the official Certificate of Statistical Audit.
 * Ensures strict .pdf extension naming and full compatibility with Chrome download managers.
 */
export async function downloadCertificatePdf(data: QaCertificateDTO): Promise<void> {
  const pdfBytes = await generateCertificatePdfBytes(data);
  const rawId = (data.certificateId || "JAXIS-AUDIT-CERTIFICATE").trim();
  const cleanId = rawId.replace(/[^\w.-]/g, "_");
  const fileName = cleanId.toLowerCase().endsWith(".pdf") ? cleanId : `${cleanId}.pdf`;

  // Standard resilient blob download
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  downloadLink.setAttribute("download", fileName);
  downloadLink.style.position = "fixed";
  downloadLink.style.left = "-9999px";
  downloadLink.style.opacity = "0";
  document.body.appendChild(downloadLink);

  const clickEvent = new MouseEvent("click", {
    view: window,
    bubbles: true,
    cancelable: true,
  });
  downloadLink.dispatchEvent(clickEvent);

  setTimeout(() => {
    try {
      if (document.body.contains(downloadLink)) {
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(downloadUrl);
    } catch {
      // Ignore cleanup error
    }
  }, 30000);
}
