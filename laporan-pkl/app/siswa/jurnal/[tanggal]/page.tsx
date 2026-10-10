import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { wajibPeran } from "@/lib/akses";
import { LABEL_STATUS, MAKS_FOTO_JURNAL } from "@/lib/status";
import Link from "next/link";
import JurnalForm from "../JurnalForm";

export default async function JurnalFormPage({ params }: { params: Promise<{ tanggal: string }> }) {
  const session = await wajibPeran("SISWA");
  const { tanggal: teks } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(teks)) notFound();
  const tanggal = new Date(teks);
  if (Number.isNaN(tanggal.getTime())) notFound();

  const penempatan = await prisma.penempatan.findFirst({ where: { siswaId: session.user.id } });
  if (!penempatan) redirect("/siswa");

  const kunci = { penempatanId_tanggal: { penempatanId: penempatan.id, tanggal } };
  const [jurnal, absen, semuaKeahlian] = await Promise.all([
    prisma.jurnal.findUnique({
      where: kunci,
      include: { keahlian: { include: { keahlian: true } }, lampiran: true },
    }),
    prisma.absensi.findUnique({ where: kunci }),
    prisma.keahlian.findMany({ orderBy: { nama: "asc" }, take: 30 }),
  ]);

  const judul = tanggal.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });

  const bukanHadir = !jurnal && (!absen || absen.jenis !== "HADIR");
  const bisaEdit = !jurnal || jurnal.status === "DRAF" || jurnal.status === "DITOLAK";

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link href="/siswa/jurnal" className="text-sm font-semibold text-biru hover:underline">
        ← Kembali
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Jurnal {judul}</h1>
        {jurnal && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${LABEL_STATUS[jurnal.status].kelas}`}>
            {LABEL_STATUS[jurnal.status].teks}
          </span>
        )}
      </div>

      {bukanHadir ? (
        <p className="rounded-2xl border bg-surface p-4 text-sm">
          Absen masuk dulu di tanggal ini sebelum mengisi jurnal.
        </p>
      ) : !bisaEdit && jurnal ? (
        <div className="space-y-4 rounded-2xl border bg-surface p-4 text-sm">
          <p className="text-muted">Jurnal ini terkunci dan tidak bisa diubah.</p>
          <div>
            <b>Kegiatan</b>
            <p className="mt-1 whitespace-pre-wrap">{jurnal.kegiatan}</p>
          </div>
          {jurnal.kendala && (
            <div>
              <b>Kendala</b>
              <p className="mt-1 whitespace-pre-wrap">{jurnal.kendala}</p>
            </div>
          )}
          {jurnal.pelajaran && (
            <div>
              <b>Pelajaran</b>
              <p className="mt-1 whitespace-pre-wrap">{jurnal.pelajaran}</p>
            </div>
          )}
          <div>
            <b>Keahlian</b>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {jurnal.keahlian.length === 0 && <span className="text-muted">-</span>}
              {jurnal.keahlian.map((k) => (
                <span
                  key={k.keahlian.nama}
                  className="rounded-full bg-hijau-tombol px-3 py-1 text-xs font-semibold text-white"
                >
                  {k.keahlian.nama}
                </span>
              ))}
            </div>
          </div>
          <p>
            <b>Foto lampiran:</b> {jurnal.lampiran.length}
          </p>
        </div>
      ) : (
        <>
          {jurnal?.status === "DITOLAK" && jurnal.catatanRevisi && (
            <div className="rounded-2xl border-2 border-red-400 bg-red-100 p-4 text-sm text-red-700">
              <p className="font-bold">Perlu revisi dari pembimbing</p>
              <p className="mt-1 whitespace-pre-wrap">{jurnal.catatanRevisi}</p>
              <p className="mt-2 text-xs">Perbaiki jurnal di bawah, lalu kirim ulang.</p>
            </div>
          )}
          <JurnalForm
            tanggal={teks}
            awal={{
              kegiatan: jurnal?.kegiatan ?? "",
              kendala: jurnal?.kendala ?? "",
              pelajaran: jurnal?.pelajaran ?? "",
              keahlian: jurnal?.keahlian.map((k) => k.keahlian.nama).join(", ") ?? "",
            }}
            saranTag={semuaKeahlian.map((k) => k.nama)}
            sisaFoto={MAKS_FOTO_JURNAL - (jurnal?.lampiran.length ?? 0)}
            jumlahFotoSebelumnya={jurnal?.lampiran.length ?? 0}
          />
        </>
      )}
    </main>
  );
}