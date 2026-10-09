import { prisma } from "@/lib/prisma";
import { wajibPeran } from "@/lib/akses";
import { hariIniWIB } from "@/lib/tanggal";
import { BATAS_HARI_TERLAMBAT, LABEL_STATUS, kunciTgl } from "@/lib/status";
import Link from "next/link";

const tgl = (d: Date) =>
  d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function JurnalListPage() {
  const session = await wajibPeran("SISWA");

  const penempatan = await prisma.penempatan.findFirst({ where: { siswaId: session.user.id } });
  if (!penempatan)
    return <main className="p-6">Kamu belum punya penempatan PKL. Hubungi admin.</main>;

  const { tanggal } = hariIniWIB();
  const batasAwal = new Date(tanggal.getTime() - BATAS_HARI_TERLAMBAT * 86_400_000);

  const [hadir, jurnal] = await Promise.all([
    prisma.absensi.findMany({
      where: {
        penempatanId: penempatan.id,
        jenis: "HADIR",
        jamMasuk: { not: null },
        tanggal: { gte: batasAwal, lte: tanggal },
      },
      orderBy: { tanggal: "desc" },
    }),
    prisma.jurnal.findMany({ where: { penempatanId: penempatan.id }, orderBy: { tanggal: "desc" } }),
  ]);

  const sudahAda = new Set(jurnal.map((j) => kunciTgl(j.tanggal)));
  const perluDiisi = hadir.filter((a) => !sudahAda.has(kunciTgl(a.tanggal)));

  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <Link href="/siswa" className="text-sm text-biru">← Kembali</Link>
      <h1 className="text-xl font-bold">Jurnal Harian</h1>

      <section className="space-y-2">
        <h2 className="font-semibold">Perlu diisi</h2>
        {perluDiisi.length === 0 && (
          <p className="text-sm text-gray-500">Tidak ada. Jurnal bisa diisi setelah kamu absen masuk.</p>
        )}
        {perluDiisi.map((a) => (
          <Link key={a.id} href={`/siswa/jurnal/${kunciTgl(a.tanggal)}`} className="block border rounded p-3 text-sm hover:bg-gray-50">
            <b>{tgl(a.tanggal)}</b>
            <div className="text-biru">Isi jurnal →</div>
          </Link>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Jurnal saya ({jurnal.length})</h2>
        {jurnal.map((j) => {
          const s = LABEL_STATUS[j.status];
          return (
            <Link key={j.id} href={`/siswa/jurnal/${kunciTgl(j.tanggal)}`} className="block border rounded p-3 text-sm hover:bg-gray-50">
              <div className="flex items-center justify-between gap-2">
                <b>{tgl(j.tanggal)}</b>
                <span className={`px-2 py-0.5 rounded-full text-xs ${s.kelas}`}>{s.teks}</span>
              </div>
              <p className="text-gray-500 line-clamp-2">{j.kegiatan}</p>
              {j.status === "DITOLAK" && j.catatanRevisi && (
                <p className="text-red-600 mt-1">Catatan: {j.catatanRevisi}</p>
              )}
            </Link>
          );
        })}
      </section>
    </main>
  );
}