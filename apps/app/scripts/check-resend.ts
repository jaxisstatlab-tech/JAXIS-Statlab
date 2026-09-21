import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { renderEmailTemplate } from "../src/lib/email/renderer";

async function previewAndSendNewResetDesign() {
  console.log("=== Testing Redesigned Password Reset Email Template ===");

  const rendered = renderEmailTemplate("PasswordReset", {
    name: "Barth",
    email: "sercenabarth@gmail.com",
    resetToken: "test_token_live_12345",
  });

  console.log("Subject:", rendered.subject);
  console.log("Plaintext Preview:\n", rendered.text);

  // Save HTML preview file
  const previewPath = path.resolve(process.cwd(), "scripts/test-email-preview.html");
  fs.writeFileSync(previewPath, rendered.html, "utf-8");
  console.log(`\n✅ Saved HTML preview to: ${previewPath}`);

  // Send real test email via Resend to sercenabarth@gmail.com
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("No RESEND_API_KEY found, skipping live send.");
    return;
  }

  console.log("\nDispatching live email to sercenabarth@gmail.com...");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "JAXIS StatLab <notifications@jaxis-statlab.com>",
      to: "sercenabarth@gmail.com",
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log("🎉 SUCCESS! Live email sent to sercenabarth@gmail.com with the NEW design!");
    console.log("Message ID:", data.id);
  } else {
    console.error("❌ Send failed:", data);
  }
}

previewAndSendNewResetDesign();
