import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import KerangkaHalaman from "@/app/_components/KerangkaHalaman";

export default async function SiswaLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <KerangkaHalaman peran="SISWA" nama={session.user.name}>
      {children}
    </KerangkaHalaman>
  );
}