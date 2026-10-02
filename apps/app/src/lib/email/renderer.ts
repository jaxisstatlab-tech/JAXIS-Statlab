import { EmailTemplateName, EmailRenderResult, EMAIL_SUBJECTS } from "./types";

/**
 * One email design for everything the app sends (see policy.ts for which emails go out).
 * Light on purpose: Gmail and Outlook partly invert dark emails in dark mode, which breaks them; a light email
 * looks the same everywhere. Brand: the logo, one orange button, plain words. Tables and inline styles only,
 * because email apps ignore most CSS.
 */

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const TZ = "Asia/Manila";
const ORANGE = "#CC6600";
const INK = "#0B0B14";
const BODY = "#3F3F46";
const MUTED = "#71717A";
const LINE = "#E4E4E7";
const SITE_URL = "https://jaxis-statlab.com";

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

function firstName(rawName?: string, email?: string): string {
  const name = rawName?.trim();
  if (name && !name.includes("@") && name.toLowerCase() !== "client") {
    const parts = name.split(/\s+/);
    if (parts[0]?.toLowerCase() === "dr." && parts[1]) return `Dr. ${parts[1]}`;
    if (parts[0]) return parts[0];
  }
  const local = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim().split(/\s+/)[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "there";
}

type Layout = {
  /** Shown in the inbox under the subject (hidden in the email itself). */
  preview: string;
  /** Small label above the title, e.g. "Action needed". */
  eyebrow?: string;
  title: string;
  greeting: string;
  paragraphs: string[];
  /** Orange-edged note, e.g. the reason or a rush warning. */
  highlight?: string;
  facts?: Array<{ label: string; value: string }>;
  ctaText?: string;
  ctaUrl?: string;
  /** Show the button's link as text too (for password reset). */
  showLink?: boolean;
  /** Small print under the button. */
  note?: string;
  /** Why they got this email. */
  footer: string;
};

function renderLayout(l: Layout, appUrl: string): string {
  const facts = l.facts?.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px 0 0 0; border: 1px solid ${LINE}; border-radius: 6px; border-collapse: separate;">
        ${l.facts
          .map(
            (f, i) => `<tr>
          <td style="padding: 11px 16px; font-family: ${FONT}; font-size: 13px; color: ${MUTED}; width: 40%;${i ? ` border-top: 1px solid ${LINE};` : ""}">${f.label}</td>
          <td style="padding: 11px 16px; font-family: ${FONT}; font-size: 14px; color: ${INK}; font-weight: 600;${i ? ` border-top: 1px solid ${LINE};` : ""}">${f.value}</td>
        </tr>`
          )
          .join("")}
      </table>`
    : "";
  const highlight = l.highlight
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 20px 0 0 0;"><tr>
        <td style="padding: 14px 16px; background-color: #FFF7ED; border-left: 3px solid ${ORANGE}; border-radius: 4px; font-family: ${FONT}; font-size: 14px; line-height: 1.55; color: #7C2D12;">${l.highlight}</td>
      </tr></table>`
    : "";
  const button =
    l.ctaText && l.ctaUrl
      ? `<table cellpadding="0" cellspacing="0" role="presentation" style="margin: 28px 0 0 0;"><tr>
          <td style="border-radius: 6px; background-color: ${ORANGE};">
            <a href="${l.ctaUrl}" target="_blank" style="display: inline-block; padding: 13px 26px; font-family: ${FONT}; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 6px;">${l.ctaText}</a>
          </td>
        </tr></table>`
      : "";
  const link =
    l.showLink && l.ctaUrl
      ? `<p style="margin: 16px 0 0 0; font-family: ${FONT}; font-size: 12px; line-height: 1.5; color: ${MUTED};">Button not working? Copy this link into your browser:<br><a href="${l.ctaUrl}" style="color: ${ORANGE}; word-break: break-all;">${l.ctaUrl}</a></p>`
      : "";
  const note = l.note
    ? `<p style="margin: 16px 0 0 0; font-family: ${FONT}; font-size: 13px; line-height: 1.55; color: ${MUTED};">${l.note}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${l.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">${l.preview}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #F4F4F5; padding: 32px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 560px; background-color: #FFFFFF; border: 1px solid ${LINE}; border-radius: 10px;">
        <tr><td style="padding: 28px 36px 0 36px;">
          <table cellpadding="0" cellspacing="0" role="presentation"><tr>
            <td style="vertical-align: middle;"><img src="${appUrl}/jaxislogo.png" width="28" height="28" alt="" style="display: block; border: 0;"></td>
            <td style="vertical-align: middle; padding-left: 10px; font-family: ${FONT}; font-size: 15px; font-weight: 700; color: ${INK}; letter-spacing: -0.2px;">JAXIS <span style="font-weight: 500; color: ${MUTED};">StatLab</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding: 28px 36px 36px 36px;">
          ${l.eyebrow ? `<p style="margin: 0 0 8px 0; font-family: ${FONT}; font-size: 12px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: ${ORANGE};">${l.eyebrow}</p>` : ""}
          <h1 style="margin: 0 0 20px 0; font-family: ${FONT}; font-size: 24px; line-height: 1.25; font-weight: 700; color: ${INK}; letter-spacing: -0.3px;">${l.title}</h1>
          <p style="margin: 0 0 12px 0; font-family: ${FONT}; font-size: 15px; line-height: 1.6; color: ${BODY};">${l.greeting}</p>
          ${l.paragraphs.map((p) => `<p style="margin: 0 0 12px 0; font-family: ${FONT}; font-size: 15px; line-height: 1.6; color: ${BODY};">${p}</p>`).join("")}
          ${highlight}
          ${facts}
          ${button}
          ${link}
          ${note}
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 560px;">
        <tr><td style="padding: 20px 12px 0 12px; text-align: center; font-family: ${FONT}; font-size: 12px; line-height: 1.6; color: #A1A1AA;">
          ${l.footer}<br>
          <a href="${SITE_URL}" style="color: #A1A1AA; text-decoration: underline;">JAXIS StatLab</a> &middot; Statistical analysis for student research
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const strong = (s: string) => `<strong style="color: ${INK}; font-weight: 600;">${s}</strong>`;

export function renderEmailTemplate(template: EmailTemplateName, data: Record<string, unknown>): EmailRenderResult {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  const appUrl = rawUrl && !rawUrl.includes("localhost") ? rawUrl.replace(/\/$/, "") : "https://app.jaxis-statlab.com";

  const subject = EMAIL_SUBJECTS[template]?.(data) ?? "JAXIS StatLab";
  const intakeId = esc(data.intakeId || "your study");
  const title = esc(data.researchTitle || "your study");
  const clientName = esc(data.clientName || "A client");
  const first = esc(firstName(String(data.clientName || data.userName || data.name || ""), String(data.clientEmail || data.email || "")));
  const study = data.projectId ? `${appUrl}/dashboard/client/projects/${encodeURIComponent(String(data.projectId))}` : `${appUrl}/dashboard/client`;
  const clientFooter = "You're getting this because you have a JAXIS StatLab account. Questions? Reply to your team in Messages.";
  const teamFooter = "Sent to the JAXIS team inbox. The same alert is in the app.";
  const studyFact = { label: "Study ID", value: `<span style="font-family: ${MONO}; font-size: 13px;">${intakeId}</span>` };

  let layout: Layout;
  switch (template) {
    case "PasswordReset":
      layout = {
        preview: "Use this link within 60 minutes to choose a new password.",
        eyebrow: "Your account",
        title: "Reset your password",
        greeting: `Hi ${first},`,
        paragraphs: ["Someone asked to reset the password for your JAXIS StatLab account. If it was you, choose a new password below."],
        ctaText: "Choose a New Password",
        ctaUrl: String(data.resetUrl || `${appUrl}/reset-password?token=${data.resetToken}`),
        showLink: true,
        note: "This link works once and expires in 60 minutes. If you didn't ask for it, ignore this email; your password stays the same.",
        footer: "You're getting this because a password reset was requested for your account.",
      };
      break;

    // ── Team inbox ──────────────────────────────────────────────────────────────
    case "NewIntake":
      layout = {
        preview: `${clientName} sent "${title}". Check it and send a price.`,
        eyebrow: "New study",
        title: "New study request",
        greeting: "Hi team,",
        paragraphs: [`${clientName} sent a new study: ${strong(title)}.`, "Check it and send a price, or ask for anything missing."],
        facts: [
          studyFact,
          { label: "Client", value: `${clientName}${data.clientEmail ? `<br><span style="font-weight: 400; color: ${MUTED};">${esc(data.clientEmail)}</span>` : ""}` },
          { label: "Needed by", value: esc(day(data.deadlineRequested)) || "Not given" },
          ...(data.analysisGoals ? [{ label: "Analysis", value: esc(data.analysisGoals) }] : []),
        ],
        ctaText: "Open New Study Requests",
        ctaUrl: `${appUrl}/dashboard/admin/intake`,
        footer: teamFooter,
      };
      break;
    case "QuoteAccepted": {
      const fast = Boolean(data.speedCode && data.speedCode !== "STANDARD");
      // "Rush (3 days)" → "Rush", so the title fits Express and Emergency too.
      const speedName = esc(String(data.speedLabel || "").split(" (")[0] || "Fast");
      layout = {
        preview: `${clientName} accepted the price${fast ? ` with ${esc(data.speedLabel)}` : ""}. Prepare the agreement next.`,
        eyebrow: fast ? "Fast delivery" : "Price accepted",
        title: fast ? `${speedName} order: price accepted` : "Price accepted",
        greeting: "Hi team,",
        paragraphs: [`${clientName} accepted the price for ${strong(title)}.`, "Next: prepare the agreement so they can sign and pay the deposit."],
        highlight: fast ? `<strong>${esc(data.speedLabel)}.</strong> ${esc(data.speedDetail)} Plan the work now.` : undefined,
        facts: [
          studyFact,
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
        preview: `${clientName} filed a claim: ${esc(data.groundsLabel || "see details")}.`,
        eyebrow: "Needs review",
        title: "A client filed a claim",
        greeting: "Hi team,",
        paragraphs: [`${clientName} filed a claim about ${strong(title)}.`, "Please review it and reply to the client."],
        facts: [studyFact, { label: "Reason", value: esc(data.groundsLabel || "Not given") }],
        ctaText: "Open Study Claims",
        ctaUrl: `${appUrl}/dashboard/admin/disputes`,
        footer: teamFooter,
      };
      break;

    // ── Clients ─────────────────────────────────────────────────────────────────
    case "QuoteReady":
      layout = {
        preview: `Your price for "${title}" is ${peso(data.totalAmount)}. Nothing to pay until you accept and sign.`,
        eyebrow: "Your price",
        title: "Your price is ready",
        greeting: `Hi ${first},`,
        paragraphs: [`We checked your study ${strong(title)} and your price is ready.`, "You won't pay anything until you accept it and sign your agreement."],
        facts: [
          studyFact,
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
        preview: "We need a little more from you before we can price your study.",
        eyebrow: "Action needed",
        title: "We need a bit more information",
        greeting: `Hi ${first},`,
        paragraphs: [`Before we can price ${strong(title)}, we need a little more from you.`],
        highlight: `<strong>Our note:</strong> ${esc(data.missingInfoReason || "Please check your study in your account.")}`,
        facts: [studyFact],
        ctaText: "Add What's Missing",
        ctaUrl: study,
        footer: clientFooter,
      };
      break;
    case "SOWReady":
      layout = {
        preview: "Read and sign your agreement, then pay the deposit to start your analysis.",
        eyebrow: "Action needed",
        title: "Your agreement is ready to sign",
        greeting: `Hi ${first},`,
        paragraphs: [`Your agreement for ${strong(title)} is ready.`, "Read it and sign by typing your name. Then pay the deposit and we'll start your analysis."],
        facts: [studyFact],
        ctaText: "Read and Sign",
        ctaUrl: `${study}/sow`,
        footer: clientFooter,
      };
      break;
    case "PaymentRejected":
      layout = {
        preview: "We couldn't match your receipt to a payment. Please send it again.",
        eyebrow: "Action needed",
        title: "We couldn't accept your receipt",
        greeting: `Hi ${first},`,
        paragraphs: [`We checked the receipt you sent for ${strong(title)}, but we couldn't match it to a payment.`],
        highlight: `<strong>Why:</strong> ${esc(data.rejectionReason || "The amount or reference number didn't match.")}`,
        facts: [studyFact],
        ctaText: "Send It Again",
        ctaUrl: `${study}/payment`,
        footer: clientFooter,
      };
      break;
    case "ProjectDelivered":
      layout = {
        preview: "Your results are finished and checked by a second statistical analyst.",
        eyebrow: "Ready",
        title: "Your files are ready",
        greeting: `Hi ${first},`,
        paragraphs: [
          `Your results for ${strong(title)} are finished and were checked by a second statistical analyst.`,
          "Open your study to download them. If there's a balance left, pay it first and your downloads open as soon as we confirm it.",
        ],
        facts: [studyFact],
        ctaText: "Get Your Files",
        ctaUrl: `${study}/deliverables`,
        note: "Need something fixed? You can ask for free changes within 3 working days.",
        footer: clientFooter,
      };
      break;

    // ── Not sent (kept so old log rows still render) ────────────────────────────
    default:
      layout = {
        preview: "There's an update on your study.",
        title: esc(subject),
        greeting: `Hi ${first},`,
        paragraphs: ["There's an update on your study. Open your account to see it."],
        facts: [studyFact],
        ctaText: "Open Your Account",
        ctaUrl: study,
        footer: clientFooter,
      };
  }

  const html = renderLayout(layout, appUrl);
  const strip = (s: string) =>
    s
      .replace(/<br>/g, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  const text = [
    strip(layout.title),
    "",
    strip(layout.greeting),
    "",
    ...layout.paragraphs.map(strip),
    ...(layout.highlight ? ["", strip(layout.highlight)] : []),
    ...(layout.facts?.length ? ["", ...layout.facts.map((f) => `${f.label}: ${strip(f.value)}`)] : []),
    ...(layout.ctaUrl ? ["", `${layout.ctaText}: ${layout.ctaUrl}`] : []),
    ...(layout.note ? ["", strip(layout.note)] : []),
    "",
    strip(layout.footer),
    "JAXIS StatLab · Statistical analysis for student research",
  ].join("\n");

  return { subject, html, text };
}
