import { redirect } from "next/navigation";
import { wajibPeran } from "@/lib/akses";

export default async function SiswaPage() {
  await wajibPeran("SISWA");
  redirect("/dashboard");
}