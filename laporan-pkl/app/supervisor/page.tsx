import { wajibPeran } from "@/lib/akses";
import AntreanVerifikasi from "@/app/_components/AntreanVerifikasi";
import KerangkaHalaman from "@/app/_components/KerangkaHalaman";

export default async function SupervisorPage() {
  const session = await wajibPeran("SUPERVISOR");

  return (
    <KerangkaHalaman peran="SUPERVISOR" nama={session.user.name}>
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <div>
          <h1 className="text-xl font-bold">Verifikasi Pembimbing DU/DI</h1>
          <p className="mt-1 text-sm text-muted">
            Periksa absen dan jurnal siswa di tempatmu, lalu setujui atau tolak dengan alasan.
          </p>
        </div>
        <AntreanVerifikasi tahap="SUPERVISOR" userId={session.user.id} />
      </main>
    </KerangkaHalaman>
  );
}