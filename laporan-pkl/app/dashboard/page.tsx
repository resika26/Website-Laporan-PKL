import { auth, signOut } from "@/auth";
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
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">Halo, {session.user.name}</h1>
          <p className="text-sm text-gray-500">Peran: {session.user.peran}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="border text-sm rounded px-3 py-1.5 hover:bg-gray-50">
            Keluar
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">Menu Siswa</h2>
        <div className="grid gap-3">
          <Link
            href="/siswa/jurnal"
            className="block p-4 border rounded-xl hover:border-blue-500 hover:shadow-sm transition bg-white"
          >
            <div className="font-bold text-blue-600">Jurnal Harian</div>
            <p className="text-xs text-gray-500 mt-1">
              Isi dan lihat jurnal kegiatan PKL harian.
            </p>
          </Link>

          <Link
            href="/siswa/project"
            className="block p-4 border rounded-xl hover:border-blue-500 hover:shadow-sm transition bg-white"
          >
            <div className="font-bold text-blue-600">Project Saya</div>
            <p className="text-xs text-gray-500 mt-1">
              Kirim project PKL untuk diperiksa sebelum tampil di galeri.
            </p>
          </Link>

          <Link
            href="/dashboard/absen"
            className="block p-4 border rounded-xl hover:border-blue-500 hover:shadow-sm transition bg-white"
          >
            <div className="font-bold text-blue-600">Absen Masuk & Pulang</div>
            <p className="text-xs text-gray-500 mt-1">
              Ambil foto langsung kamera dan verifikasi lokasi GPS tempat PKL.
            </p>
          </Link>

          <Link
            href="/dashboard/izin"
            className="block p-4 border rounded-xl hover:border-amber-500 hover:shadow-sm transition bg-white"
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