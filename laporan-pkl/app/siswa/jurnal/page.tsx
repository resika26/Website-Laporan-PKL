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
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="rounded-2xl border bg-surface p-4 text-sm">
          Kamu belum punya penempatan PKL. Hubungi admin.
        </div>
      </main>
    );

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
    <main className="mx-auto max-w-2xl space-y-5 p-4">
      <Link href="/dashboard" className="text-sm font-semibold text-biru hover:underline">
        ← Dashboard
      </Link>
      <h1 className="text-xl font-bold">Jurnal Harian</h1>

      <section className="space-y-2">
        <h2 className="font-bold">Perlu diisi</h2>
        {perluDiisi.length === 0 && (
          <p className="rounded-2xl border bg-surface p-4 text-sm text-muted">
            Tidak ada. Jurnal bisa diisi setelah kamu absen masuk.
          </p>
        )}
        {perluDiisi.map((a) => (
          <Link
            key={a.id}
            href={`/siswa/jurnal/${kunciTgl(a.tanggal)}`}
            className="flex items-center justify-between gap-2 rounded-2xl border border-amber-400 bg-amber-100 p-4 text-sm text-amber-800"
          >
            <b>{tgl(a.tanggal)}</b>
            <span className="font-semibold">Isi jurnal →</span>
          </Link>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">Jurnal saya ({jurnal.length})</h2>
        {jurnal.length === 0 && (
          <p className="rounded-2xl border bg-surface p-4 text-sm text-muted">Belum ada jurnal.</p>
        )}
        {jurnal.map((j) => {
          const s = LABEL_STATUS[j.status];
          return (
            <Link
              key={j.id}
              href={`/siswa/jurnal/${kunciTgl(j.tanggal)}`}
              className="block rounded-2xl border bg-surface p-4 text-sm hover:border-hijau-aksen"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>{tgl(j.tanggal)}</b>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.kelas}`}>{s.teks}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-muted">{j.kegiatan}</p>
              {j.status === "DITOLAK" && j.catatanRevisi && (
                <p className="mt-2 rounded-lg bg-red-100 p-2 text-red-700">
                  <b>Catatan revisi:</b> {j.catatanRevisi}
                </p>
              )}
            </Link>
          );
        })}
      </section>
    </main>
  );
}