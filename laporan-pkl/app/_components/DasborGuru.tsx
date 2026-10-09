import { prisma } from "@/lib/prisma";
import { hariIniWIB } from "@/lib/tanggal";
import { kunciTgl } from "@/lib/status";

type WarnaStatus = "hijau" | "kuning" | "merah" | "netral";

function klasifikasi(status?: string, menungguPulang = false): WarnaStatus {
  if (status === "DITOLAK") return "merah";
  if (status === "DISETUJUI" && !menungguPulang) return "hijau";
  if (status?.startsWith("MENUNGGU_") || menungguPulang) return "kuning";
  return "netral";
}

function Indikator({
  status,
  kosong,
  menungguPulang = false,
}: {
  status?: string;
  kosong?: string;
  menungguPulang?: boolean;
}) {
  const warna = klasifikasi(status, menungguPulang);
  const label = menungguPulang
    ? "Menunggu absen pulang"
    : status === "DISETUJUI"
      ? "Disetujui"
      : status === "DITOLAK"
        ? "Ditolak"
        : status === "MENUNGGU_SUPERVISOR"
          ? "Menunggu supervisor"
          : status === "MENUNGGU_GURU"
            ? "Menunggu guru"
            : status === "DRAF"
              ? "Draf"
              : kosong ?? "Belum ada";
  const kelas = {
    hijau: "bg-green-100 text-green-800",
    kuning: "bg-amber-100 text-amber-800",
    merah: "bg-red-100 text-red-800",
    netral: "bg-gray-100 text-gray-700",
  }[warna];

  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${kelas}`}>{label}</span>;
}

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
    include: { siswa: true },
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

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold">Ringkasan siswa</h2>
        <p className="text-sm text-gray-500">Aktivitas tujuh hari terakhir dari siswa yang sedang dibimbing.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="border-l-4 border-green-600 px-3 py-2"><b>{ringkasan.hijau}</b><div>Disetujui</div></div>
        <div className="border-l-4 border-amber-500 px-3 py-2"><b>{ringkasan.kuning}</b><div>Menunggu</div></div>
        <div className="border-l-4 border-red-600 px-3 py-2"><b>{ringkasan.merah}</b><div>Ditolak</div></div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600" aria-label="Keterangan indikator status">
        <span><b className="text-green-700">Hijau:</b> disetujui</span>
        <span><b className="text-amber-700">Kuning:</b> menunggu atau absen belum lengkap</span>
        <span><b className="text-red-700">Merah:</b> ditolak</span>
        <span><b>Abu-abu:</b> belum ada atau masih draf</span>
      </div>

      {penempatan.length === 0 ? (
        <p className="border rounded p-4 text-sm text-gray-500">Belum ada siswa aktif yang ditempatkan kepada Anda.</p>
      ) : (
        <div className="space-y-4">
          {penempatan.map((item) => {
            const hari = [...aktivitas.keys()]
              .filter((kunci) => kunci.startsWith(`${item.id}:`))
              .map((kunci) => kunci.slice(item.id.length + 1))
              .sort((a, b) => b.localeCompare(a))
              .slice(0, 7);

            return (
              <div key={item.id} className="border-b pb-4">
                <h3 className="font-medium">{item.siswa.nama}</h3>
                {hari.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">Belum ada aktivitas dalam tujuh hari terakhir.</p>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs text-gray-500">
                        <tr>
                          <th className="py-2 pr-3 font-medium">Tanggal</th>
                          <th className="py-2 pr-3 font-medium">Absen</th>
                          <th className="py-2 font-medium">Jurnal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hari.map((teksTanggal) => {
                          const data = aktivitas.get(`${item.id}:${teksTanggal}`);
                          const tanggal = new Date(`${teksTanggal}T00:00:00.000Z`);
                          const belumPulang = Boolean(
                            data?.absensi?.jenis === "HADIR" &&
                            !data.absensi.jamPulang &&
                            data.absensi.status !== "DITOLAK",
                          );

                          return (
                            <tr key={teksTanggal} className="border-t">
                              <td className="py-2 pr-3 whitespace-nowrap">
                                {tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })}
                              </td>
                              <td className="py-2 pr-3">
                                <Indikator status={data?.absensi?.status} kosong="Belum ada" menungguPulang={belumPulang} />
                              </td>
                              <td className="py-2">
                                <Indikator status={data?.jurnal?.status} kosong="Belum ada" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}