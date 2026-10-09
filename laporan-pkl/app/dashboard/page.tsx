import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Jika admin, arahkan langsung ke halaman admin
  if (session.user.peran === "ADMIN") {
    redirect("/admin");
  }
  if (session.user.peran === "SUPERVISOR") redirect("/supervisor");
  if (session.user.peran === "GURU") redirect("/guru");

  return (
    <main className="p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">Dashboard Siswa</h1>
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">Menu Siswa</h2>
        <div className="grid gap-3">
          <Link
            href="/siswa/jurnal"
            className="block p-4 border rounded-xl hover:border-hijau-aksen hover:shadow-sm transition bg-surface"
          >
            <div className="font-bold text-hijau-aksen">Jurnal Harian</div>
            <p className="text-xs text-gray-500 mt-1">
              Isi dan lihat jurnal kegiatan PKL harian.
            </p>
          </Link>

          <Link
            href="/siswa/project"
            className="block p-4 border rounded-xl hover:border-hijau-aksen hover:shadow-sm transition bg-surface"
          >
            <div className="font-bold text-hijau-aksen">Project Saya</div>
            <p className="text-xs text-gray-500 mt-1">
              Kirim project PKL untuk diperiksa sebelum tampil di galeri.
            </p>
          </Link>

          <Link
            href="/dashboard/absen"
            className="block p-4 border rounded-xl hover:border-hijau-aksen hover:shadow-sm transition bg-surface"
          >
            <div className="font-bold text-hijau-aksen">Absen Masuk & Pulang</div>
            <p className="text-xs text-gray-500 mt-1">
              Ambil foto langsung kamera dan verifikasi lokasi GPS tempat PKL.
            </p>
          </Link>

          <Link
            href="/dashboard/izin"
            className="block p-4 border rounded-xl hover:border-amber-500 hover:shadow-sm transition bg-surface"
          >
            <div className="font-bold text-amber-600">Catat Izin & Sakit</div>
            <p className="text-xs text-gray-500 mt-1">
              Ajukan izin atau surat keterangan sakit disertai lampiran foto bukti.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}