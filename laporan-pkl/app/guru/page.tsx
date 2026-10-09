import { wajibPeran } from "@/lib/akses";
import DasborGuru from "@/app/_components/DasborGuru";
import AntreanVerifikasi from "@/app/_components/AntreanVerifikasi";
import AntreanProjectGuru from "@/app/_components/AntreanProjectGuru";
import TombolKeluar from "@/app/_components/TombolKeluar";

export default async function GuruPage() {
  const session = await wajibPeran("GURU");

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Verifikasi Guru</h1>
          <p className="text-sm text-gray-500">Halo, {session.user.name}</p>
        </div>
        <TombolKeluar />
      </div>
      <DasborGuru userId={session.user.id} />
      <AntreanProjectGuru userId={session.user.id} />
      <AntreanVerifikasi tahap="GURU" userId={session.user.id} />
    </main>
  );
}