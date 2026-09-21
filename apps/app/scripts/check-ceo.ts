import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { db } from "../src/lib/db";

async function checkCeoUser() {
  console.log("=== Checking ceo@jaxis.dev in DB ===");
  try {
    const user = await db.user.findUnique({
      where: { email: "ceo@jaxis.dev" },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      console.error("❌ User ceo@jaxis.dev DOES NOT EXIST in the database!");
      return;
    }

    console.log("Found user:");
    console.log("  ID:", user.id);
    console.log("  Email:", user.email);
    console.log("  FullName:", user.fullName);
    console.log("  Status:", user.status);
    console.log("  PasswordHash:", user.passwordHash ? `${user.passwordHash.slice(0, 15)}...` : "NONE");
    console.log("  Roles:", user.userRoles.map((ur) => ur.role.name));

    // Test bcrypt against JaxisCeo2026!
    const matchesCeo = await bcrypt.compare("JaxisCeo2026!", user.passwordHash);
    console.log("\nPassword comparison for 'JaxisCeo2026!':", matchesCeo ? "✅ MATCHES" : "❌ DOES NOT MATCH");

    // Also check other presets
    const presets = [
      { email: "admin@jaxis.dev", pass: "JaxisAdmin2026!" },
      { email: "client@jaxis.dev", pass: "JaxisClient2026!" },
      { email: "stat@jaxis.dev", pass: "JaxisStat2026!" },
      { email: "qa@jaxis.dev", pass: "JaxisQA2026!" },
      { email: "finance@jaxis.dev", pass: "JaxisFin2026!" },
      { email: "ceo@jaxis.dev", pass: "JaxisCeo2026!" },
    ];

    console.log("\n=== Checking all preset users in DB ===");
    for (const p of presets) {
      const u = await db.user.findUnique({
        where: { email: p.email },
        select: { id: true, email: true, passwordHash: true, status: true },
      });
      if (!u) {
        console.log(`❌ ${p.email}: NOT IN DB`);
      } else {
        const ok = await bcrypt.compare(p.pass, u.passwordHash);
        console.log(`${ok ? "✅" : "❌"} ${p.email} (Status: ${u.status}): password ${ok ? "VALID" : "INVALID"}`);
      }
    }
  } catch (err) {
    console.error("Database error:", err);
  } finally {
    await db.$disconnect();
  }
}

checkCeoUser();
