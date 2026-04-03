import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "owner@butterflyassets.local";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const hash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        password: hash,
        role: Role.OWNER,
        name: "Owner"
      }
    });
    console.log(`Created OWNER user: ${email}`);
  } else {
    console.log(`OWNER user already exists: ${email}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
