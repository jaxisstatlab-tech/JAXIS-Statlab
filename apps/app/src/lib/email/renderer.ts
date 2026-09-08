import { EmailTemplateName, EmailRenderResult, EMAIL_SUBJECTS } from "./types";

function renderBaseEmailLayout(params: {
  title: string;
  badgeText?: string;
  badgeColor?: string;
  recipientName?: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  metaRows?: Array<{ label: string; value: string }>;
}): string {
  const {
    title,
    badgeText,
    badgeColor = "#38BDF8",
    recipientName = "Client",
    bodyContent,
    ctaText,
    ctaUrl,
    metaRows = [],
  } = params;

  const metaHtml =
    metaRows.length > 0
      ? `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #001428; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px;">
      ${metaRows
        .map(
          (r) => `
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
          <td style="padding: 10px 14px; font-family: 'Courier New', monospace; font-size: 11px; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; width: 35%;">${r.label}</td>
          <td style="padding: 10px 14px; font-family: Arial, sans-serif; font-size: 13px; color: #FFFFFF; font-weight: 600;">${r.value}</td>
        </tr>
      `
        )
        .join("")}
    </table>
  `
      : "";

  const ctaHtml =
    ctaText && ctaUrl
      ? `
    <div style="margin: 28px 0 16px 0; text-align: center;">
      <a href="${ctaUrl}" style="display: inline-block; background-color: #CC6600; color: #FFFFFF; text-decoration: none; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; padding: 12px 28px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.5px;">
        ${ctaText} &rarr;
      </a>
    </div>
  `
      : "";

  const badgeHtml = badgeText
    ? `<span style="display: inline-block; font-family: 'Courier New', monospace; font-size: 10px; font-weight: bold; color: ${badgeColor}; border: 1px solid ${badgeColor}; padding: 3px 8px; border-radius: 2px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">${badgeText}</span>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #010114; font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #E2E8F0; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #010114; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #01162E; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 6px; overflow: hidden;">
          
          <!-- Top Header Bar -->
          <tr>
            <td style="padding: 24px 32px; background-color: #000E1F; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family: 'Courier New', monospace; font-weight: 800; font-size: 17px; color: #FFFFFF; letter-spacing: 1.5px;">
                      JAXIS <span style="color: #CC6600;">STATLAB</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-family: 'Courier New', monospace; font-size: 10px; color: rgba(255, 255, 255, 0.4); text-transform: uppercase;">
                      SECURE RESEARCH DESK
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              ${badgeHtml}
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">
                ${title}
              </h1>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: rgba(255, 255, 255, 0.85);">
                Hello <strong>${recipientName}</strong>,
              </p>

              <div style="font-size: 14px; line-height: 1.6; color: rgba(255, 255, 255, 0.8);">
                ${bodyContent}
              </div>

              ${metaHtml}

              ${ctaHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #000B18; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: rgba(255, 255, 255, 0.4); line-height: 1.5;">
                This is an automated operational notification from JAXIS StatLab.<br>
                Please do not reply directly to this email.
              </p>
              <p style="margin: 0; font-size: 11px; color: rgba(255, 255, 255, 0.3);">
                &copy; 2026 JAXIS StatLab. All rights reserved. &bull; <a href="https://jaxis.dev/support" style="color: #38BDF8; text-decoration: none;">Support Desk</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export function renderEmailTemplate(
  template: EmailTemplateName,
  data: Record<string, any>
): EmailRenderResult {
  const subjectFn = EMAIL_SUBJECTS[template];
  const subject = subjectFn ? subjectFn(data) : "JAXIS StatLab Notification";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const name = data.clientName || data.userName || "Client";
  const intakeId = data.intakeId || "JAXIS Study";
  const title = data.researchTitle || "Statistical Consultation";

  let bodyHtml = "";
  let badgeText = "UPDATE";
  let badgeColor = "#38BDF8";
  let ctaText: string | undefined;
  let ctaUrl: string | undefined;
  let metaRows: Array<{ label: string; value: string }> = [];

  switch (template) {
    case "PasswordReset":
      badgeText = "SECURITY RECOVERY";
      badgeColor = "#CC6600";
      bodyHtml = `
        <p>We received a request to reset the password for your JAXIS StatLab account (<strong>${data.email || name}</strong>).</p>
        <p>Click the button below to choose a new password. For your security, this recovery link will expire in <strong>60 minutes</strong>.</p>
        <p style="margin-top: 18px; font-size: 12px; color: rgba(255, 255, 255, 0.5);">If you did not make this request, you can safely ignore this email. Your password will remain unchanged.</p>
      `;
      metaRows = [
        { label: "Account", value: data.email || name },
        { label: "Valid For", value: "60 Minutes" },
        { label: "Security", value: "Single-Use Recovery Link" },
      ];
      ctaText = "Reset Password";
      ctaUrl = `${appUrl}/reset-password?token=${data.resetToken}`;
      break;

    case "NewIntake":
      badgeText = "NEW STUDY INTAKE";
      badgeColor = "#38BDF8";
      bodyHtml = `
        <p>A new research study specifications intake has been submitted and queued for triage review.</p>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Client:</strong> ${name} (${data.clientEmail || "N/A"})</p>
      `;
      metaRows = [
        { label: "Study ID", value: intakeId },
        { label: "Client", value: name },
        { label: "Requested Deadline", value: data.deadlineRequested ? new Date(data.deadlineRequested).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Standard Turnaround" },
        { label: "Triage Status", value: "New Request / Pending Review" },
      ];
      ctaText = "Open Intake Review Desk";
      ctaUrl = `${appUrl}/dashboard/admin/intake`;
      break;

    case "SOWReady":
      badgeText = "ACTION REQUIRED";
      badgeColor = "#F59E0B";
      bodyHtml = `
        <p>Your Scope of Work (SOW) document has been compiled and is now ready for your digital signature.</p>
        <p>Please review the proposed statistical methodologies, delivery milestones, and package terms in your client portal.</p>
      `;
      metaRows = [
        { label: "Study ID", value: intakeId },
        { label: "Research Title", value: title },
        { label: "Package", value: data.packageName || "Standard Statistical Consultation" },
      ];
      ctaText = "Review & Sign SOW";
      ctaUrl = `${appUrl}/dashboard/client/quotations`;
      break;

    case "SOWSigned":
      badgeText = "CONTRACT ACTIVE";
      badgeColor = "#10B981";
      bodyHtml = `
        <p>Thank you for signing the Scope of Work for your research study.</p>
        <p>Your legal contract is now locked in Escrow. Please proceed with your downpayment deposit to activate specialist assignment and analytical workflows.</p>
      `;
      metaRows = [
        { label: "Study ID", value: intakeId },
        { label: "Contract Ref", value: data.sowRef || "SOW-EXECUTED" },
        { label: "Signatory", value: data.signatoryName || name },
      ];
      ctaText = "Make Downpayment Deposit";
      ctaUrl = `${appUrl}/dashboard/client/quotations`;
      break;

    case "ProofReceived":
      badgeText = "PAYMENT PROCESSING";
      badgeColor = "#38BDF8";
      bodyHtml = `
        <p>We have successfully received your payment proof upload.</p>
        <p>Our finance officers are currently verifying the reference number with the bank or e-wallet channel. You will be notified once clearance is confirmed.</p>
      `;
      metaRows = [
        { label: "Study ID", value: intakeId },
        { label: "Channel", value: data.paymentChannel || "GCash / Maya / Bank" },
        { label: "Reference", value: data.referenceNumber || "PENDING" },
      ];
      ctaText = "View Payment Status";
      ctaUrl = `${appUrl}/dashboard/client/projects`;
      break;

    case "PaymentVerified":
      badgeText = "PAYMENT VERIFIED";
      badgeColor = "#10B981";
      bodyHtml = `
        <p>Your payment deposit has been verified and cleared by Finance.</p>
        <p>Your study is now fully active! An expert statistician and Senior QA lead will be assigned to begin processing your data.</p>
      `;
      metaRows = [
        { label: "Study ID", value: intakeId },
        { label: "Amount Verified", value: `PHP ${Number(data.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
        { label: "Status", value: "ACTIVE IN WORKBENCH" },
      ];
      ctaText = "Open Study Workspace";
      ctaUrl = `${appUrl}/dashboard/client/projects`;
      break;

    case "PaymentRejected":
      badgeText = "ACTION NEEDED";
      badgeColor = "#EF4444";
      bodyHtml = `
        <p>Our finance team was unable to verify your submitted payment proof.</p>
        <p style="color: #F87171;"><strong>Reason:</strong> ${data.rejectionReason || "Reference number or deposit receipt did not match our records."}</p>
        <p>Please re-upload a clear receipt screenshot or re-check the reference number in your portal.</p>
      `;
      metaRows = [
        { label: "Study ID", value: intakeId },
        { label: "Action Required", value: "Re-upload valid proof" },
      ];
      ctaText = "Update Payment Proof";
      ctaUrl = `${appUrl}/dashboard/client/projects`;
      break;

    case "ExpertAssigned":
      badgeText = "TEAM ASSIGNED";
      badgeColor = "#38BDF8";
      bodyHtml = `
        <p>A specialized Lead Statistician and Senior QA Lead have been assigned to your research study.</p>
        <p>Data cleaning, coding, and hypothesis testing have officially commenced per your signed SOW specifications.</p>
      `;
      metaRows = [
        { label: "Study ID", value: intakeId },
        { label: "Lead Statistician", value: data.statisticianName || "Assigned Specialist" },
        { label: "Estimated Delivery", value: data.deliveryDueDate || "Per SLA Schedule" },
      ];
      ctaText = "View Workspace & Messages";
      ctaUrl = `${appUrl}/dashboard/client/messages`;
      break;

    case "NewMessage":
      badgeText = "NEW MESSAGE";
      badgeColor = "#38BDF8";
      bodyHtml = `
        <p>You have received a new message from your assigned research team regarding <strong>${intakeId}</strong>.</p>
        <blockquote style="margin: 16px 0; padding: 12px 16px; background-color: #000E1F; border-left: 3px solid #CC6600; font-size: 13px; color: rgba(255, 255, 255, 0.9);">
          "${data.messagePreview || "New communication update..."}"
        </blockquote>
      `;
      metaRows = [
        { label: "Study ID", value: intakeId },
        { label: "Sender", value: data.senderName || "Specialist Team" },
      ];
      ctaText = "Reply in Secure Thread";
      ctaUrl = `${appUrl}/dashboard/client/messages`;
      break;

    case "InfoRequested":
      badgeText = "ACTION REQUIRED";
      badgeColor = "#F59E0B";
      bodyHtml = `
        <p>Our operations team reviewed your study intake submission and needs a few additional details before pricing can be completed.</p>
        <p style="color: #FCD34D;"><strong>Notes from Admin:</strong> ${data.missingInfoReason || "Please clarify your research objectives or provide chapter guidelines."}</p>
      `;
      metaRows = [
        { label: "Study ID", value: intakeId },
        { label: "Submission", value: title },
      ];
      ctaText = "Update Study Details";
      ctaUrl = `${appUrl}/dashboard/client/projects`;
      break;

    case "ProjectDelivered":
      badgeText = "STUDY DELIVERED";
      badgeColor = "#10B981";
      bodyHtml = `
        <p>Great news! Your final statistical deliverables and APA-compliant analysis tables have been audited by Senior QA and released.</p>
        <p>Your <strong>7-Day Post-Delivery Review Window</strong> is now officially open. Please download and inspect your final files.</p>
      `;
      metaRows = [
        { label: "Study ID", value: intakeId },
        { label: "Deliverables", value: "Tables, Codebook, Methodology Writeup" },
        { label: "Review Window", value: "7 Calendar Days" },
      ];
      ctaText = "Download Deliverables";
      ctaUrl = `${appUrl}/dashboard/client/projects`;
      break;

    case "RefundProcessed":
      badgeText = "REFUND COMPLETED";
      badgeColor = "#10B981";
      bodyHtml = `
        <p>Following executive review, a refund has been issued for your study <strong>${intakeId}</strong>.</p>
        <p>The funds have been returned via your registered payment channel.</p>
      `;
      metaRows = [
        { label: "Study ID", value: intakeId },
        { label: "Refund Amount", value: `PHP ${Number(data.refundAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
        { label: "Decision Notes", value: data.resolutionNotes || "Dispute claim resolved." },
      ];
      ctaText = "View Dispute Ruling";
      ctaUrl = `${appUrl}/dashboard/client/disputes`;
      break;

    case "DisputeOpened":
      badgeText = "CLAIM REGISTERED";
      badgeColor = "#F59E0B";
      bodyHtml = `
        <p>We have received your technical claim for study <strong>${intakeId}</strong>.</p>
        <p>Your statement and attached evidence have been forwarded to our lead reviewer and CEO for arbitration. You will receive a ruling update shortly.</p>
      `;
      metaRows = [
        { label: "Study ID", value: intakeId },
        { label: "Reason Filed", value: data.groundsLabel || "Technical Methodology Claim" },
        { label: "Filing Status", value: "Under Investigation" },
      ];
      ctaText = "Track Claim Status";
      ctaUrl = `${appUrl}/dashboard/client/disputes`;
      break;
  }

  const html = renderBaseEmailLayout({
    title: subject,
    badgeText,
    badgeColor,
    recipientName: name,
    bodyContent: bodyHtml,
    ctaText,
    ctaUrl,
    metaRows,
  });

  const text = `
JAXIS STATLAB — ${subject}
Hello ${name},

${bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}

${metaRows.map((r) => `${r.label}: ${r.value}`).join("\n")}

${ctaUrl ? `View in Portal: ${ctaUrl}` : ""}
  `.trim();

  return { subject, html, text };
}
