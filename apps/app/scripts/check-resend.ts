import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { sendEmail } from "../src/lib/email";

async function verifyAppEmailSystem() {
  console.log("=== Testing JAXIS App sendEmail() with Resend ===");

  const result = await sendEmail({
    to: "delivered@resend.dev",
    recipientId: "", // non-db audit test
    template: "PasswordReset",
    data: {
      name: "Researcher",
      resetUrl: "https://app.jaxis-statlab.com/reset-password?token=test-token-12345",
      expiresIn: "1 hour",
    },
  });

  console.log("sendEmail Result:", result);

  if (result.success && !result.simulated) {
    console.log("✅ The JAXIS StatLab Resend email system is 100% OPERATIONAL and LIVE!");
  } else if (result.simulated) {
    console.log("ℹ️ sendEmail ran in DEV SIMULATION mode (RESEND_API_KEY was not read by the module).");
  } else {
    console.error("❌ sendEmail failed:", result.error);
  }
}

verifyAppEmailSystem();
