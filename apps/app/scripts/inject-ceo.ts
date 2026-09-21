import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { db } from "../src/lib/db";

async function main() {
  const email = "s.gallego.jerome@gmail.com".toLowerCase().trim();
  const fullName = "Jerome S. Gallego";
  // Generated secure password adhering to all JAXIS StatLab complexity requirements
  const generatedPassword = "JaxisCeo2026!Jerome";
  const saltRounds = 12;

  console.log(`\n=== Injecting CEO Account for ${email} ===`);

  try {
    // 1. Find the CEO Role
    let ceoRole = await db.role.findUnique({
      where: { name: "CEO" },
    });

    if (!ceoRole) {
      console.log("CEO role not found, upserting role 'CEO'...");
      ceoRole = await db.role.upsert({
        where: { name: "CEO" },
        update: { label: "CEO / Owner" },
        create: {
          id: 6,
          name: "CEO",
          label: "CEO / Owner",
        },
      });
    }

    console.log(`CEO Role ID: ${ceoRole.id} (${ceoRole.name})`);

    // 2. Hash the generated password
    const passwordHash = await bcrypt.hash(generatedPassword, saltRounds);

    // 3. Upsert the user
    const existingUser = await db.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });

    let user;
    if (existingUser) {
      console.log(`Existing user found with ID: ${existingUser.id}. Updating to ACTIVE with CEO credentials...`);
      user = await db.user.update({
        where: { email },
        data: {
          fullName: existingUser.fullName && existingUser.fullName !== "Client User" ? existingUser.fullName : fullName,
          passwordHash,
          status: "ACTIVE",
        },
      });
    } else {
      console.log(`Creating new user account for ${email}...`);
      user = await db.user.create({
        data: {
          email,
          fullName,
          passwordHash,
          status: "ACTIVE",
        },
      });
    }

    console.log(`User record: ${user.id} (${user.email}) - ${user.fullName}`);

    // 4. Ensure UserRole connects to CEO
    await db.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: ceoRole.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: ceoRole.id,
      },
    });

    // Also remove any conflicting non-CEO roles if needed, or check existing roles
    const userRoles = await db.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    console.log("User active roles:", userRoles.map((ur) => ur.role.name));

    // Verify password check
    const verifyMatch = await bcrypt.compare(generatedPassword, user.passwordHash);
    console.log("\nPassword verification test:", verifyMatch ? "✅ SUCCESS" : "❌ FAILED");

    console.log("\n==========================================");
    console.log("🎉 CEO ACCOUNT READY FOR LOGIN:");
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${generatedPassword}`);
    console.log(`  Role:     CEO`);
    console.log(`  Status:   ACTIVE`);
    console.log("==========================================\n");
  } catch (error) {
    console.error("Error injecting CEO user:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
