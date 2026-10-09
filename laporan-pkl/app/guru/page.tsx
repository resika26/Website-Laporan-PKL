import { wajibPeran } from "@/lib/akses";
import DasborGuru from "@/app/_components/DasborGuru";
import AntreanVerifikasi from "@/app/_components/AntreanVerifikasi";
import AntreanProjectGuru from "@/app/_components/AntreanProjectGuru";
import KerangkaHalaman from "@/app/_components/KerangkaHalaman";

export default async function GuruPage() {
  const session = await wajibPeran("GURU");

  return (
    <KerangkaHalaman peran="GURU" nama={session.user.name}>
      <main className="p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-bold">Verifikasi Pembimbing sekolah</h1>
        <DasborGuru userId={session.user.id} />
        <AntreanProjectGuru userId={session.user.id} />
        <AntreanVerifikasi tahap="GURU" userId={session.user.id} />
      </main>
    </KerangkaHalaman>
  );
}