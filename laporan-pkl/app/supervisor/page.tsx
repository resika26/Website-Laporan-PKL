import { wajibPeran } from "@/lib/akses";
import AntreanVerifikasi from "@/app/_components/AntreanVerifikasi";
import TombolKeluar from "@/app/_components/TombolKeluar";

export default async function SupervisorPage() {
  const session = await wajibPeran("SUPERVISOR");

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Verifikasi Supervisor</h1>
          <p className="text-sm text-gray-500">Halo, {session.user.name}</p>
        </div>
        <TombolKeluar />
      </div>
      <AntreanVerifikasi tahap="SUPERVISOR" userId={session.user.id} />
    </main>
  );
}