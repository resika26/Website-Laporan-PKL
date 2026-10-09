import { wajibPeran } from "@/lib/akses";
import AntreanVerifikasi from "@/app/_components/AntreanVerifikasi";
import KerangkaHalaman from "@/app/_components/KerangkaHalaman";

export default async function SupervisorPage() {
  const session = await wajibPeran("SUPERVISOR");

  return (
    <KerangkaHalaman peran="SUPERVISOR" nama={session.user.name}>
      <main className="p-6 max-w-2xl mx-auto space-y-6">
          <h1 className="text-xl font-bold">Verifikasi Supervisor</h1>
        <AntreanVerifikasi tahap="SUPERVISOR" userId={session.user.id} />
      </main>
    </KerangkaHalaman>
  );
}