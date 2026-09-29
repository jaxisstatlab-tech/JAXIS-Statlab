import { NextResponse } from "next/server";

interface ContactPayload {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

// Canonical lab administration inbox for customer inquiries
const PRIMARY_INBOX = "jaxis.statlab@gmail.com";
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL || "JAXIS StatLab <notifications@jaxis-statlab.com>";

export async function POST(request: Request) {
  try {
    const body: ContactPayload = await request.json();
    const { name, email, subject, message } = body;

    const trimmedName = (name ?? "").trim();
    const trimmedEmail = (email ?? "").trim();
    const trimmedSubject = (subject ?? "General Inquiry").trim();
    const trimmedMessage = (message ?? "").trim();

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { success: false, error: "Please provide your full name." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!trimmedMessage || trimmedMessage.length < 5) {
      return NextResponse.json(
        { success: false, error: "Please write a message explaining your inquiry." },
        { status: 400 }
      );
    }

    const plainTextContent = `New Website Inquiry - JAXIS StatLab:

Name: ${trimmedName}
Email: ${trimmedEmail}
Subject: ${trimmedSubject}
Date: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })} (PHT)

Message:
${trimmedMessage}

---------------------------------------------------------
Reply directly to this email to respond to ${trimmedName}.
`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Website Contact Inquiry</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #010114; color: #FFFFFF; padding: 24px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #0A0A18; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; padding: 28px;">
    <div style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 16px; margin-bottom: 20px;">
      <span style="font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #CC6600; font-weight: bold;">
        WEBSITE CONTACT INQUIRY
      </span>
      <h2 style="font-size: 20px; font-weight: 600; color: #FFFFFF; margin: 6px 0 0 0;">
        ${escapeHtml(trimmedSubject)}
      </h2>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
      <tr>
        <td style="color: rgba(255, 255, 255, 0.5); padding: 6px 0; width: 80px; font-family: monospace;">From:</td>
        <td style="color: #FFFFFF; font-weight: 500; padding: 6px 0;">${escapeHtml(trimmedName)}</td>
      </tr>
      <tr>
        <td style="color: rgba(255, 255, 255, 0.5); padding: 6px 0; font-family: monospace;">Email:</td>
        <td style="padding: 6px 0;"><a href="mailto:${escapeHtml(trimmedEmail)}" style="color: #38BDF8; text-decoration: none;">${escapeHtml(trimmedEmail)}</a></td>
      </tr>
      <tr>
        <td style="color: rgba(255, 255, 255, 0.5); padding: 6px 0; font-family: monospace;">Subject:</td>
        <td style="color: #FFFFFF; padding: 6px 0;">${escapeHtml(trimmedSubject)}</td>
      </tr>
    </table>

    <div style="background-color: #010114; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 2px; padding: 16px; margin-bottom: 24px;">
      <div style="font-family: monospace; font-size: 10px; text-transform: uppercase; color: rgba(255, 255, 255, 0.4); margin-bottom: 8px;">
        MESSAGE CONTENT
      </div>
      <div style="color: rgba(255, 255, 255, 0.88); font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
${escapeHtml(trimmedMessage)}
      </div>
    </div>

    <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; font-size: 11px; color: rgba(255, 255, 255, 0.4); font-family: monospace;">
      Submitted via JAXIS StatLab Public Contact Desk · Reply directly to this email to contact ${escapeHtml(trimmedName)}.
    </div>
  </div>
</body>
</html>
`;

    // 1. Dispatch email to JAXIS Staff Inbox (jaxis.statlab@gmail.com)
    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [PRIMARY_INBOX],
        reply_to: trimmedEmail,
        subject: `[Website Inquiry] ${trimmedSubject} - ${trimmedName}`,
        text: plainTextContent,
        html: htmlContent,
      }),
    });

    const adminData = await adminRes.json().catch(() => ({}));
    if (!adminRes.ok) {
      console.error("[Contact API] Resend dispatch failed:", adminData);
      return NextResponse.json(
        {
          success: false,
          error: adminData.message || "Failed to deliver email. Please try again or email us directly.",
        },
        { status: 502 }
      );
    }

    console.log("[Contact API] Successfully delivered inquiry to", PRIMARY_INBOX, "ID:", adminData.id);

    // 2. Also send an automated confirmation receipt to the visitor (non-blocking)
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [trimmedEmail],
        subject: `We received your inquiry - JAXIS StatLab`,
        text: `Hi ${trimmedName},\n\nThank you for reaching out to JAXIS StatLab. We received your message regarding "${trimmedSubject}". A statistical analyst will review it and reply within 24 hours.\n\nBest regards,\nJAXIS StatLab Team`,
      }),
    }).catch((err) => {
      console.warn("[Contact API] Automated receipt dispatch note:", err?.message || err);
    });

    return NextResponse.json({
      success: true,
      id: adminData.id,
    });
  } catch (error) {
    console.error("[Contact API] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while sending your message. Please try again." },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
