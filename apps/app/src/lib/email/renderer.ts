import { EmailTemplateName, EmailRenderResult, EMAIL_SUBJECTS } from "./types";

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const TZ = "Asia/Manila";

/** Names, titles and notes come from people; escape them before they go into the email's HTML. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const peso = (n: unknown) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const day = (d: unknown) =>
  d ? new Date(String(d)).toLocaleDateString("en-PH", { timeZone: TZ, month: "long", day: "numeric", year: "numeric" }) : "";

/** One plain layout for every email: logo line, title, greeting, text, an optional highlight, facts and one button. */
function renderLayout(params: {
  title: string;
  greeting: string;
  paragraphs: string[];
  highlight?: string;
  facts?: Array<{ label: string; value: string }>;
  ctaText?: string;
  ctaUrl?: string;
  footer: string;
}): string {
  const { title, greeting, paragraphs, highlight, facts = [], ctaText, ctaUrl, footer } = params;
  const factsHtml = facts.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 22px 0 0 0; border: 1px solid rgba(255,255,255,0.1); border-radius: 2px;">
        ${facts
          .map(
            (f, i) => `<tr>
          <td style="padding: 10px 14px; font-family: ${FONT}; font-size: 12px; color: rgba(255,255,255,0.5); width: 38%;${i ? " border-top: 1px solid rgba(255,255,255,0.06);" : ""}">${f.label}</td>
          <td style="padding: 10px 14px; font-family: ${FONT}; font-size: 13px; color: #FFFFFF; font-weight: 600;${i ? " border-top: 1px solid rgba(255,255,255,0.06);" : ""}">${f.value}</td>
        </tr>`
          )
          .join("")}
      </table>`
    : "";
  const highlightHtml = highlight
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 4px 0 0 0;"><tr>
        <td style="padding: 12px 16px; background-color: rgba(204,102,0,0.10); border: 1px solid rgba(204,102,0,0.35); border-radius: 2px; font-family: ${FONT}; font-size: 14px; line-height: 1.55; color: #FFB066;">${highlight}</td>
      </tr></table>`
    : "";
  const ctaHtml =
    ctaText && ctaUrl
      ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 26px;"><tr><td align="center">
          <a href="${ctaUrl}" target="_blank" style="display: block; background-color: #CC6600; color: #FFFFFF; text-decoration: none; text-align: center; font-family: ${FONT}; font-size: 14px; font-weight: 700; padding: 14px 24px; border-radius: 2px;">${ctaText} &rarr;</a>
        </td></tr></table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin: 0; padding: 0; background-color: #010114; font-family: ${FONT}; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #010114; padding: 40px 16px 48px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 520px; background-color: #0A0A18; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; overflow: hidden;">
        <tr><td style="padding: 36px 36px 40px 36px;">
          <div style="font-family: ${FONT}; font-size: 12px; font-weight: 800; letter-spacing: 2.5px; color: #FFFFFF; text-transform: uppercase; margin: 0 0 18px 0;">JAXIS <span style="color: #CC6600;">STATLAB</span></div>
          <h1 style="margin: 0 0 20px 0; font-family: ${FONT}; font-size: 21px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">${title}</h1>
          <p style="margin: 0 0 14px 0; font-family: ${FONT}; font-size: 14px; font-weight: 700; color: #FFFFFF;">${greeting}</p>
          ${paragraphs.map((p) => `<p style="margin: 0 0 14px 0; font-family: ${FONT}; font-size: 14px; line-height: 1.65; color: rgba(255,255,255,0.78);">${p}</p>`).join("")}
          ${highlightHtml}
          ${factsHtml}
          ${ctaHtml}
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 520px; margin: 20px auto 0 auto; text-align: center;">
        <tr><td style="font-family: ${FONT}; font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.6;">
          <p style="margin: 0 0 4px 0;">${footer}</p>
          <p style="margin: 0;">&copy; 2026 JAXIS StatLab</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function extractFirstName(rawName?: string, email?: string): string {
  if (rawName && rawName.trim() && !rawName.includes("@") && rawName.trim().toLowerCase() !== "client") {
    const parts = rawName.trim().split(/\s+/);
    if (parts[0] && parts[0].toLowerCase() === "dr." && parts.length > 1 && parts[1]) {
      return `Dr. ${parts[1]}`;
    }
    if (parts[0]) {
      return parts[0];
    }
  }
  if (email && email.includes("@")) {
    const local = email.split("@")[0];
    if (local) {
      const clean = local.replace(/[._-]+/g, " ").trim();
      if (clean) {
        const first = clean.split(/\s+/)[0];
        if (first) {
          return first.charAt(0).toUpperCase() + first.slice(1);
        }
      }
    }
  }
  return "there";
}

function renderPasswordResetEmail(params: {
  recipientName: string;
  ctaUrl: string;
}): EmailRenderResult {
  const { recipientName, ctaUrl } = params;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #010114; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #010114; padding: 48px 16px 56px 16px; margin: 0; width: 100%;">
    <tr>
      <td align="center">
        <!-- Floating Dark Precision Card (JAXIS StatLab Studio Theme) -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 480px; background-color: #0A0A18; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.5); overflow: hidden; margin: 0 auto;">
          <tr>
            <td style="padding: 40px 40px 44px 40px;">
              
              <!-- Centered Brand Header -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="text-align: center; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <!-- Official JAXIS Brand Logo -->
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td align="center">
                          <img src="https://app.jaxis-statlab.com/jaxislogo.png" alt="JAXIS Logo" width="52" height="52" style="display: block; width: 52px; height: 52px; border: 0; outline: none; text-decoration: none;" />
                        </td>
                      </tr>
                    </table>

                    <!-- Brand Name -->
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 800; letter-spacing: 2.5px; color: #FFFFFF; text-transform: uppercase; margin: 0 0 8px 0;">
                      JAXIS <span style="color: #CC6600;">STATLAB</span>
                    </div>

                    <!-- Title -->
                    <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.2px;">
                      Reset your password
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Hairline Divider -->
              <div style="height: 1px; background-color: rgba(255, 255, 255, 0.08); margin: 0 0 26px 0; width: 100%;"></div>

              <!-- Message Body -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: left;">
                <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 700; color: #FFFFFF;">
                  Hey ${recipientName},
                </p>
                <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.65; color: rgba(255, 255, 255, 0.75);">
                  Need to reset your password? No problem! Just click the button below and you'll be on your way. If you did not make this request, please ignore this email.
                </p>

                <!-- Full-Width JAXIS Action Button -->
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="center">
                      <a href="${ctaUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; background-color: #CC6600; color: #FFFFFF; text-decoration: none; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; padding: 14px 24px; border-radius: 2px; letter-spacing: 0.2px;">
                        Reset your password &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Security Advisory Callout -->
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 24px;">
                  <tr>
                    <td style="padding: 12px 16px; background-color: rgba(204, 102, 0, 0.08); border: 1px solid rgba(204, 102, 0, 0.25); border-radius: 2px;">
                      <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #FFA040; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                        <strong>Security Notice:</strong> This single-use recovery link will expire in <strong>60 minutes</strong>.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>
        </table>

        <!-- Subtle Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 480px; margin: 24px auto 0 auto; text-align: center;">
          <tr>
            <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: rgba(255, 255, 255, 0.4); line-height: 1.6;">
              <p style="margin: 0 0 4px 0;">This recovery link will expire in 60 minutes.</p>
              <p style="margin: 0;">&copy; 2026 JAXIS StatLab Inc. &bull; All rights reserved.</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `Hey ${recipientName},

Need to reset your password? No problem! Just click the link below to choose a new password:
${ctaUrl}

If you did not make this request, please ignore this email.
This link will expire in 60 minutes.

JAXIS StatLab Inc.`;

  return {
    subject: "Reset your password",
    html,
    text,
  };
}

export function renderEmailTemplate(template: EmailTemplateName, data: Record<string, unknown>): EmailRenderResult {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  const appUrl = rawUrl && !rawUrl.includes("localhost") ? rawUrl.replace(/\/$/, "") : "https://app.jaxis-statlab.com";

  if (template === "PasswordReset") {
    const ctaUrl = String(data.resetUrl || `${appUrl}/reset-password?token=${data.resetToken}`);
    const recipientName = extractFirstName(String(data.userName || data.clientName || data.name || ""), String(data.email || ""));
    return renderPasswordResetEmail({ recipientName, ctaUrl });
  }

  const subject = EMAIL_SUBJECTS[template]?.(data) ?? "JAXIS StatLab";
  const intakeId = esc(data.intakeId || "your study");
  const title = esc(data.researchTitle || "your study");
  const clientName = esc(data.clientName || "The client");
  const first = esc(extractFirstName(String(data.clientName || data.userName || ""), String(data.clientEmail || data.email || "")));
  const study = data.projectId ? `${appUrl}/dashboard/client/projects/${encodeURIComponent(String(data.projectId))}` : `${appUrl}/dashboard/client`;
  const clientFooter = "Questions? Reply to your team in Messages in your account.";
  const teamFooter = "Sent to the JAXIS team inbox. The same alert is in the app.";

  let layout: Parameters<typeof renderLayout>[0];
  switch (template) {
    // ── Team inbox ──────────────────────────────────────────────────────────────
    case "NewIntake":
      layout = {
        title: "New study request",
        greeting: "Hi team,",
        paragraphs: [`${clientName} sent a new study: <strong style="color:#FFFFFF;">${title}</strong>.`, "Check it and send a price, or ask for anything missing."],
        facts: [
          { label: "Study ID", value: intakeId },
          { label: "Client", value: `${clientName}${data.clientEmail ? ` (${esc(data.clientEmail)})` : ""}` },
          { label: "Needed by", value: esc(day(data.deadlineRequested)) || "Not given" },
          ...(data.analysisGoals ? [{ label: "Analysis", value: esc(data.analysisGoals) }] : []),
        ],
        ctaText: "Open New Study Requests",
        ctaUrl: `${appUrl}/dashboard/admin/intake`,
        footer: teamFooter,
      };
      break;
    case "QuoteAccepted": {
      const fast = data.speedCode && data.speedCode !== "STANDARD";
      layout = {
        title: fast ? `${esc(data.speedLabel)} order: price accepted` : "Price accepted",
        greeting: "Hi team,",
        paragraphs: [`${clientName} accepted the price for <strong style="color:#FFFFFF;">${title}</strong>.`, "Next: prepare the agreement so they can sign and pay the deposit."],
        highlight: fast ? `<strong>${esc(data.speedLabel)}:</strong> ${esc(data.speedDetail)} Plan the work now.` : undefined,
        facts: [
          { label: "Study ID", value: intakeId },
          { label: "Total", value: peso(data.totalAmount) },
          { label: "Delivery", value: esc(data.speedLabel || "Standard") },
          { label: "Client needs it by", value: esc(day(data.deadlineRequested)) || "Not given" },
        ],
        ctaText: "Open the Study",
        ctaUrl: data.projectId ? `${appUrl}/dashboard/admin/projects/${encodeURIComponent(String(data.projectId))}` : `${appUrl}/dashboard/admin`,
        footer: teamFooter,
      };
      break;
    }
    case "ClaimFiled":
      layout = {
        title: "A client filed a claim",
        greeting: "Hi team,",
        paragraphs: [`${clientName} filed a claim about <strong style="color:#FFFFFF;">${title}</strong>.`, "Please review it and reply to the client."],
        facts: [
          { label: "Study ID", value: intakeId },
          { label: "Reason", value: esc(data.groundsLabel || "Not given") },
        ],
        ctaText: "Open Study Claims",
        ctaUrl: `${appUrl}/dashboard/admin/disputes`,
        footer: teamFooter,
      };
      break;

    // ── Clients ─────────────────────────────────────────────────────────────────
    case "QuoteReady":
      layout = {
        title: "Your price is ready",
        greeting: `Hi ${first},`,
        paragraphs: [`We checked your study <strong style="color:#FFFFFF;">${title}</strong> and your price is ready.`, "You won't pay anything until you accept it and sign your agreement."],
        facts: [
          { label: "Study ID", value: intakeId },
          { label: "Price", value: peso(data.totalAmount) },
          ...(data.expiresAt ? [{ label: "Good until", value: esc(day(data.expiresAt)) }] : []),
        ],
        ctaText: "See Your Price",
        ctaUrl: `${study}/quote`,
        footer: clientFooter,
      };
      break;
    case "InfoRequested":
      layout = {
        title: "We need a bit more information",
        greeting: `Hi ${first},`,
        paragraphs: [`Before we can price <strong style="color:#FFFFFF;">${title}</strong>, we need a little more from you.`],
        highlight: `<strong>Our note:</strong> ${esc(data.missingInfoReason || "Please check your study in your account.")}`,
        facts: [{ label: "Study ID", value: intakeId }],
        ctaText: "Add What's Missing",
        ctaUrl: study,
        footer: clientFooter,
      };
      break;
    case "SOWReady":
      layout = {
        title: "Your agreement is ready to sign",
        greeting: `Hi ${first},`,
        paragraphs: [`Your agreement for <strong style="color:#FFFFFF;">${title}</strong> is ready.`, "Read it, sign it by typing your name, then pay the deposit to start your analysis."],
        facts: [{ label: "Study ID", value: intakeId }],
        ctaText: "Read and Sign",
        ctaUrl: `${study}/sow`,
        footer: clientFooter,
      };
      break;
    case "PaymentRejected":
      layout = {
        title: "We couldn't accept your receipt",
        greeting: `Hi ${first},`,
        paragraphs: [`We checked the receipt you sent for <strong style="color:#FFFFFF;">${title}</strong>, but we couldn't match it to a payment.`],
        highlight: `<strong>Why:</strong> ${esc(data.rejectionReason || "The amount or reference number didn't match.")}`,
        facts: [{ label: "Study ID", value: intakeId }],
        ctaText: "Send It Again",
        ctaUrl: `${study}/payment`,
        footer: clientFooter,
      };
      break;
    case "ProjectDelivered":
      layout = {
        title: "Your files are ready",
        greeting: `Hi ${first},`,
        paragraphs: [
          `Your results for <strong style="color:#FFFFFF;">${title}</strong> are finished and were checked by a second statistical analyst.`,
          "Open your study to download them. If there's a balance left, pay it first and your downloads open as soon as we confirm it.",
          "Need something fixed? You can ask for free changes within 3 working days.",
        ],
        facts: [{ label: "Study ID", value: intakeId }],
        ctaText: "Get Your Files",
        ctaUrl: `${study}/deliverables`,
        footer: clientFooter,
      };
      break;

    // ── Not sent (kept so old log rows still render) ────────────────────────────
    default:
      layout = {
        title: esc(subject),
        greeting: `Hi ${first},`,
        paragraphs: ["There's an update on your study. Open your account to see it."],
        facts: [{ label: "Study ID", value: intakeId }],
        ctaText: "Open Your Account",
        ctaUrl: study,
        footer: clientFooter,
      };
  }

  const html = renderLayout(layout);
  const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const text = [
    strip(layout.title),
    "",
    strip(layout.greeting),
    "",
    ...layout.paragraphs.map(strip),
    ...(layout.highlight ? ["", strip(layout.highlight)] : []),
    "",
    ...(layout.facts ?? []).map((f) => `${f.label}: ${strip(f.value)}`),
    ...(layout.ctaUrl ? ["", `${layout.ctaText}: ${layout.ctaUrl}`] : []),
    "",
    strip(layout.footer),
  ].join("\n");

  return { subject, html, text };
}
