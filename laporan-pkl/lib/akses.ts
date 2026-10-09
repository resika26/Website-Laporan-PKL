import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const HALAMAN_PERAN: Record<string, string> = {
  ADMIN: "/admin",
  GURU: "/guru",
  SUPERVISOR: "/supervisor",
  SISWA: "/dashboard",
};

// Dipanggil di awal setiap halaman yang dibatasi
export async function wajibPeran(peran: "ADMIN" | "GURU" | "SUPERVISOR" | "SISWA") {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.peran !== peran) {
    redirect(HALAMAN_PERAN[session.user.peran] ?? "/login");
  }
  return session;
}