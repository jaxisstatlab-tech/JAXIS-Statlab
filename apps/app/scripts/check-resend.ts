import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

(process.env as any).NODE_ENV = "production";
delete process.env.NEXT_PUBLIC_APP_URL;

import { renderEmailTemplate } from "../src/lib/email/renderer";

function testPasswordResetEmailUrl() {
  console.log("=== Testing Password Reset Email Button URL in Production Mode ===");
  const testToken = "test_token_abcdef1234567890";
  const { html, subject } = renderEmailTemplate("PasswordReset", {
    email: "client@jaxis.dev",
    resetToken: testToken,
  });

  // Find href in html
  const match = html.match(/href="([^"]+)"/);
  const buttonUrl = match ? match[1] : null;

  console.log("Subject:", subject);
  console.log("Button URL in email:", buttonUrl);

  if (buttonUrl && buttonUrl.startsWith("https://app.jaxis-statlab.com/reset-password?token=")) {
    console.log("✅ SUCCESS! The button in the email links directly to the deployed reset password page!");
  } else {
    console.error("❌ FAILED! Unexpected button URL:", buttonUrl);
  }
}

testPasswordResetEmailUrl();
