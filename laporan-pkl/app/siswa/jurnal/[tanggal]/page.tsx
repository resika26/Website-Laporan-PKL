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
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <Link href="/siswa/jurnal" className="text-sm text-blue-600">← Kembali</Link>
      <h1 className="text-xl font-bold">Jurnal {judul}</h1>

      {bukanHadir ? (
        <p className="border rounded p-4">Absen masuk dulu di tanggal ini sebelum mengisi jurnal.</p>
      ) : !bisaEdit && jurnal ? (
        <div className="border rounded-xl p-4 space-y-3 text-sm">
          <p>
            Status: <b>{LABEL_STATUS[jurnal.status].teks}</b> (terkunci, tidak bisa diubah)
          </p>
          <div><b>Kegiatan</b><p className="whitespace-pre-wrap">{jurnal.kegiatan}</p></div>
          {jurnal.kendala && <div><b>Kendala</b><p className="whitespace-pre-wrap">{jurnal.kendala}</p></div>}
          {jurnal.pelajaran && <div><b>Pelajaran</b><p className="whitespace-pre-wrap">{jurnal.pelajaran}</p></div>}
          <p>Keahlian: {jurnal.keahlian.map((k) => k.keahlian.nama).join(", ") || "-"}</p>
          <p>Foto lampiran: {jurnal.lampiran.length}</p>
        </div>
      ) : (
        <>
          {jurnal?.status === "DITOLAK" && jurnal.catatanRevisi && (
            <p className="border border-red-300 bg-red-50 text-red-700 rounded p-3 text-sm">
              Perlu revisi: {jurnal.catatanRevisi}
            </p>
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