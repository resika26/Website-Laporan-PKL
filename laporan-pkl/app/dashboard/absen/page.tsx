import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AbsenPanel from "./AbsenPanel";

export default async function HalamanAbsenSiswa() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as { id?: string; email?: string | null };
  const pengguna = user.id
    ? await prisma.pengguna.findUnique({ where: { id: user.id } })
    : await prisma.pengguna.findUnique({ where: { email: user.email ?? "" } });
  if (!pengguna) redirect("/login");

  return <AbsenPanel nama={pengguna.nama} />;
}