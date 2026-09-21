import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Simulate production environment where RESEND_FROM_EMAIL might not be defined or was set to onboarding@resend.dev
delete process.env.RESEND_FROM_EMAIL;

import { sendEmail } from "../src/lib/email";

async function testFallbackSend() {
  console.log("=== Testing sendEmail() with no RESEND_FROM_EMAIL set ===");
  console.log("Sending to: sercenabarth@gmail.com");

  const result = await sendEmail({
    to: "sercenabarth@gmail.com",
    recipientId: "",
    template: "PasswordReset",
    data: {
      name: "Barth",
      resetUrl: "https://app.jaxis-statlab.com/reset-password?token=test-token-live",
      expiresIn: "60 minutes",
    },
  });

  console.log("Result:", result);

  if (result.success) {
    console.log("🎉 SUCCESS! The email sent to sercenabarth@gmail.com without any sandbox restriction error!");
  } else {
    console.error("❌ FAILED:", result.error);
  }
}

testFallbackSend();
