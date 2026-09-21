import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "stat@jaxis.dev";
  const defaultPassword = "JaxisStat2026!";
  const saltRounds = 12;

  console.log(`Resetting password for ${email}...`);

  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log(`✅ Successfully reset password for ${updatedUser.email} (ID: ${updatedUser.id}) to default "${defaultPassword}"`);
}

main()
  .catch((e) => {
    console.error("❌ Error resetting password:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
