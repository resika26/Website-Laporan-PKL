import { prisma } from "@/lib/prisma";
import { hariIniWIB } from "@/lib/tanggal";
import { kunciTgl } from "@/lib/status";
import { klasifikasi } from "./IndikatorStatus";
import TabelSiswaGuru, { type BarisSiswa } from "./TabelSiswaGuru";

export default async function DasborGuru({ userId }: { userId: string }) {
  const { tanggal: sampai } = hariIniWIB();
  const mulai = new Date(sampai);
  mulai.setUTCDate(mulai.getUTCDate() - 6);

  const penempatan = await prisma.penempatan.findMany({
    where: {
      guruId: userId,
      tanggalMulai: { lte: sampai },
      tanggalSelesai: { gte: sampai },
    },
    include: { siswa: { include: { profilSiswa: true } }, tempatPkl: true },
    orderBy: { siswa: { nama: "asc" } },
  });
  const idPenempatan = penempatan.map((item) => item.id);

  const [absensi, jurnal] = await Promise.all([
    prisma.absensi.findMany({
      where: { penempatanId: { in: idPenempatan }, tanggal: { gte: mulai, lte: sampai } },
      select: { id: true, penempatanId: true, tanggal: true, jenis: true, status: true, jamPulang: true },
      orderBy: { tanggal: "desc" },
    }),
    prisma.jurnal.findMany({
      where: { penempatanId: { in: idPenempatan }, tanggal: { gte: mulai, lte: sampai } },
      select: { id: true, penempatanId: true, tanggal: true, status: true },
      orderBy: { tanggal: "desc" },
    }),
  ]);

  const aktivitas = new Map<
    string,
    { absensi?: (typeof absensi)[number]; jurnal?: (typeof jurnal)[number] }
  >();
  for (const item of absensi) {
    const kunci = `${item.penempatanId}:${kunciTgl(item.tanggal)}`;
    aktivitas.set(kunci, { ...aktivitas.get(kunci), absensi: item });
  }
  for (const item of jurnal) {
    const kunci = `${item.penempatanId}:${kunciTgl(item.tanggal)}`;
    aktivitas.set(kunci, { ...aktivitas.get(kunci), jurnal: item });
  }

  const ringkasan = [
    ...absensi.map((item) => ({
      status: item.status,
      belumPulang: item.jenis === "HADIR" && !item.jamPulang && item.status !== "DITOLAK",
    })),
    ...jurnal.map((item) => ({ status: item.status, belumPulang: false })),
  ].reduce(
    (hasil, item) => {
      const warna = klasifikasi(item.status, item.belumPulang);
      if (warna === "hijau") hasil.hijau += 1;
      if (warna === "kuning") hasil.kuning += 1;
      if (warna === "merah") hasil.merah += 1;
      return hasil;
    },
    { hijau: 0, kuning: 0, merah: 0 },
  );

  const baris: BarisSiswa[] = penempatan.map((item) => {
    const hari = [...aktivitas.keys()]
      .filter((kunci) => kunci.startsWith(`${item.id}:`))
      .map((kunci) => kunci.slice(item.id.length + 1))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 7);

    let ditolak = 0;
    let menunggu = 0;
    let disetujui = 0;

    const daftarHari = hari.map((teksTanggal) => {
      const data = aktivitas.get(`${item.id}:${teksTanggal}`);
      const belumPulang = Boolean(
        data?.absensi?.jenis === "HADIR" && !data.absensi.jamPulang && data.absensi.status !== "DITOLAK",
      );
      const warnaAbsen = data?.absensi ? klasifikasi(data.absensi.status, belumPulang) : "netral";
      const warnaJurnal = data?.jurnal ? klasifikasi(data.jurnal.status) : "netral";
      for (const w of [warnaAbsen, warnaJurnal]) {
        if (w === "merah") ditolak += 1;
        if (w === "kuning") menunggu += 1;
        if (w === "hijau") disetujui += 1;
      }
      return {
        tanggal: teksTanggal,
        absenStatus: data?.absensi?.status ?? null,
        belumPulang,
        jurnalStatus: data?.jurnal?.status ?? null,
      };
    });

    const lampu =
      ditolak > 0 ? "merah" : menunggu > 0 ? "kuning" : disetujui > 0 ? "hijau" : "netral";

    return {
      id: item.id,
      nama: item.siswa.nama,
      paket: item.siswa.profilSiswa?.jurusan ?? null,
      tempat: item.tempatPkl.nama,
      lampu,
      menunggu,
      ditolak,
      disetujui,
      hari: daftarHari,
    };
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-bold">Ringkasan siswa</h2>
        <p className="text-sm text-muted">Aktivitas tujuh hari terakhir dari siswa yang sedang dibimbing.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl border border-l-4 border-l-green-600 bg-surface px-3 py-2">
          <b className="text-lg">{ringkasan.hijau}</b>
          <div className="text-muted">Disetujui</div>
        </div>
        <div className="rounded-xl border border-l-4 border-l-amber-500 bg-surface px-3 py-2">
          <b className="text-lg">{ringkasan.kuning}</b>
          <div className="text-muted">Menunggu</div>
        </div>
        <div className="rounded-xl border border-l-4 border-l-red-600 bg-surface px-3 py-2">
          <b className="text-lg">{ringkasan.merah}</b>
          <div className="text-muted">Ditolak</div>
        </div>
      </div>

      <TabelSiswaGuru baris={baris} />
    </section>
  );
}