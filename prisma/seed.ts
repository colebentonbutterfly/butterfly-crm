import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Seed users
  const users = [
    { username: "Cole", name: "Cole", password: "Grapefruit4135!!" },
    { username: "Natalie", name: "Natalie", password: "Discountdog2!" },
  ];

  for (const u of users) {
    const hashedPassword = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { hashedPassword },
      create: { username: u.username, name: u.name, hashedPassword },
    });
    console.log(`User ${u.username} seeded`);
  }

  // Seed default tags
  const defaultTags = [
    { name: "Fragile", color: "#ef4444" },
    { name: "High Value", color: "#f59e0b" },
    { name: "Sell", color: "#10b981" },
    { name: "Keep", color: "#3b82f6" },
    { name: "Donate", color: "#8b5cf6" },
    { name: "Trash", color: "#6b7280" },
  ];

  for (const t of defaultTags) {
    await prisma.tag.upsert({
      where: { name: t.name },
      update: { color: t.color },
      create: { name: t.name, color: t.color },
    });
  }
  console.log("Default tags seeded");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
