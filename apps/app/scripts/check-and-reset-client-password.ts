import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "client@jaxis.dev";
  const defaultPassword = "JaxisClient2026!";
  const adminPassword = "JaxisAdmin2026!";
  const saltRounds = 12;

  console.log(`Checking user: ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    console.log(`❌ User ${email} does NOT exist in the database!`);
    return;
  }

  const roleNames = user.userRoles.map((ur) => ur.role.name).join(", ");
  console.log(`User found: ${user.fullName} (${user.email}), Roles: [${roleNames}], Status: ${user.status}`);

  if (user.passwordHash) {
    const isClientPassMatch = await bcrypt.compare(defaultPassword, user.passwordHash);
    const isAdminPassMatch = await bcrypt.compare(adminPassword, user.passwordHash);
    console.log(`Password comparison:`);
    console.log(`- Matches default "JaxisClient2026!": ${isClientPassMatch}`);
    console.log(`- Matches typed "JaxisAdmin2026!": ${isAdminPassMatch}`);
  } else {
    console.log(`User has NO passwordHash set!`);
  }

  console.log(`\nResetting password for ${email} to default "${defaultPassword}"...`);
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log(`✅ Successfully set password for ${updatedUser.email} (ID: ${updatedUser.id}) to "${defaultPassword}"`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
