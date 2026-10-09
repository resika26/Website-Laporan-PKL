import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const kataSandi = await bcrypt.hash("GantiIni123", 10);
  await prisma.pengguna.upsert({
    where: { email: "admin@sekolah.test" },
    update: {},
    create: {
      nama: "Admin Sekolah",
      email: "admin@sekolah.test",
      kataSandi,
      peran: "ADMIN",
    },
  });
  console.log("Admin siap.");
}

main().finally(() => prisma.$disconnect());