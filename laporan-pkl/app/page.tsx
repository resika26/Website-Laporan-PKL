import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HALAMAN_PERAN } from "@/lib/akses";

export default async function Home() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  redirect(HALAMAN_PERAN[session.user.peran] ?? "/dashboard");
}
