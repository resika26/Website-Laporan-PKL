import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import KerangkaHalaman from "@/app/_components/KerangkaHalaman";
import type { PeranAplikasi } from "@/app/_components/navigasi";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <KerangkaHalaman peran={session.user.peran as PeranAplikasi} nama={session.user.name}>
      {children}
    </KerangkaHalaman>
  );
}