import { prisma } from "@/lib/prisma";
import { supabaseAdmin, BUCKET_ABSEN } from "@/lib/supabase";
import { jarakMeter } from "@/lib/lokasi";
import TombolKeputusan from "./TombolKeputusan";
import PersetujuanMassal from "./PersetujuanMassal";

const jam = (tanggal: Date | null) =>
  tanggal
    ? tanggal.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      })
    : "-";

const tgl = (tanggal: Date) =>
  tanggal.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const waktu = (tanggal: Date | null) =>
  tanggal
    ? tanggal.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      })
    : "";

const LABEL_JENIS: Record<string, string> = {
  HADIR: "Hadir",
  IZIN: "Izin",
  SAKIT: "Sakit",
};

function LencanaJarak({ jarak, radius }: { jarak: number | null; radius: number }) {
  if (jarak == null) {
    return (
      <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
        Lokasi tidak tercatat
      </span>
    );
  }
  const dalam = jarak <= radius;
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
        dalam ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {jarak} m dari DU/DI · {dalam ? "dalam radius" : "di luar radius"}
    </span>
  );
}

export default async function AntreanVerifikasi({
  tahap,
  userId,
}: {
  tahap: "SUPERVISOR" | "GURU";
  userId: string;
}) {
  const statusTarget = tahap === "SUPERVISOR" ? "MENUNGGU_SUPERVISOR" : "MENUNGGU_GURU";
  const milik = tahap === "SUPERVISOR" ? { supervisorId: userId } : { guruId: userId };

  const [absen, jurnal] = await Promise.all([
    prisma.absensi.findMany({
      where: {
        status: statusTarget,
        penempatan: { is: milik },
        OR: [{ jenis: { not: "HADIR" } }, { jamPulang: { not: null } }],
      },
      include: {
        penempatan: { include: { siswa: true, tempatPkl: true } },
        disetujuiSupervisorOleh: true,
      },
      orderBy: { tanggal: "asc" },
    }),
    prisma.jurnal.findMany({
      where: { status: statusTarget, penempatan: { is: milik } },
      include: {
        penempatan: { include: { siswa: true } },
        keahlian: { include: { keahlian: true } },
        lampiran: true,
        disetujuiSupervisorOleh: true,
      },
      orderBy: { tanggal: "asc" },
    }),
  ]);

  const jalurFoto = [
    ...absen.flatMap((item) => [item.fotoMasuk, item.fotoPulang, item.fotoSurat]),
    ...jurnal.flatMap((item) => item.lampiran.map((lampiran) => lampiran.fileFoto)),
  ].filter((jalur): jalur is string => Boolean(jalur));

  const urlFoto = new Map<string, string>();
  if (jalurFoto.length > 0) {
    const { data } = await supabaseAdmin.storage
      .from(BUCKET_ABSEN)
      .createSignedUrls(jalurFoto, 600);
    data?.forEach((item) => {
      if (item.path && item.signedUrl) urlFoto.set(item.path, item.signedUrl);
    });
  }

  function Foto({ path, label }: { path: string | null; label: string }) {
    const url = path ? urlFoto.get(path) : null;
    if (!url) return null;
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="aspect-[4/3] w-full rounded-xl border object-cover" />
        <span className="mt-1 block text-xs text-muted">{label} · ketuk untuk memperbesar</span>
      </a>
    );
  }

  const kosong = absen.length === 0 && jurnal.length === 0;
  const itemMassal = tahap === "GURU"
    ? [
        ...absen.map((item) => ({
          tipe: "absensi" as const,
          id: item.id,
          siswa: item.penempatan.siswa.nama,
          tanggal: tgl(item.tanggal),
        })),
        ...jurnal.map((item) => ({
          tipe: "jurnal" as const,
          id: item.id,
          siswa: item.penempatan.siswa.nama,
          tanggal: tgl(item.tanggal),
        })),
      ]
    : [];

  const tautanPeta =
    "inline-block rounded-lg border px-3 py-1.5 text-xs font-semibold text-biru hover:border-biru";

  return (
    <div className="space-y-6">
      {tahap === "GURU" && <PersetujuanMassal items={itemMassal} />}
      {kosong && (
        <p className="rounded-2xl border bg-surface p-4 text-sm text-muted">Tidak ada yang menunggu.</p>
      )}

      {absen.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Absen menunggu ({absen.length})</h2>
          {absen.map((item) => {
            const tempat = item.penempatan.tempatPkl;
            const jarakMasuk =
              item.latMasuk != null && item.lngMasuk != null
                ? Math.round(jarakMeter(item.latMasuk, item.lngMasuk, tempat.latitude, tempat.longitude))
                : null;
            const jarakPulang =
              item.latPulang != null && item.lngPulang != null
                ? Math.round(jarakMeter(item.latPulang, item.lngPulang, tempat.latitude, tempat.longitude))
                : null;

            return (
              <article key={item.id} className="space-y-3 rounded-2xl border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-base font-bold">{item.penempatan.siswa.nama}</div>
                    <div className="text-sm text-muted">{tgl(item.tanggal)}</div>
                  </div>
                  <span className="rounded-full bg-biru/10 px-3 py-1 text-xs font-bold text-biru">
                    {LABEL_JENIS[item.jenis] ?? item.jenis}
                  </span>
                </div>
                <p className="text-sm text-muted">{tempat.nama}</p>

                {item.jenis === "HADIR" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <b>Masuk</b>
                        <span className="text-lg font-bold tabular-nums">{jam(item.jamMasuk)}</span>
                      </div>
                      <LencanaJarak jarak={jarakMasuk} radius={tempat.radiusMeter} />
                      {item.latMasuk != null && item.lngMasuk != null && (
                        <div>
                          <a
                            className={tautanPeta}
                            target="_blank"
                            rel="noreferrer"
                            href={`https://www.google.com/maps?q=${item.latMasuk},${item.lngMasuk}`}
                          >
                            Lihat peta masuk
                          </a>
                        </div>
                      )}
                      <Foto path={item.fotoMasuk} label="Foto masuk" />
                    </div>

                    <div className="space-y-2 rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <b>Pulang</b>
                        <span className="text-lg font-bold tabular-nums">{jam(item.jamPulang)}</span>
                      </div>
                      <LencanaJarak jarak={jarakPulang} radius={tempat.radiusMeter} />
                      {item.latPulang != null && item.lngPulang != null && (
                        <div>
                          <a
                            className={tautanPeta}
                            target="_blank"
                            rel="noreferrer"
                            href={`https://www.google.com/maps?q=${item.latPulang},${item.lngPulang}`}
                          >
                            Lihat peta pulang
                          </a>
                        </div>
                      )}
                      <Foto path={item.fotoPulang} label="Foto pulang" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-xl border p-3 text-sm">
                    <p className="whitespace-pre-wrap">
                      <b>Alasan:</b> {item.alasan}
                    </p>
                    <Foto path={item.fotoSurat} label="Foto surat" />
                  </div>
                )}

                {tahap === "GURU" && item.disetujuiSupervisorOleh && (
                  <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800">
                    Disetujui Pembimbing DU/DI {item.disetujuiSupervisorOleh.nama} ·{" "}
                    {waktu(item.disetujuiSupervisorPada)}
                  </p>
                )}
                <TombolKeputusan tipe="absensi" id={item.id} />
              </article>
            );
          })}
        </section>
      )}

      {jurnal.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Jurnal menunggu ({jurnal.length})</h2>
          {jurnal.map((item) => (
            <article key={item.id} className="space-y-3 rounded-2xl border bg-surface p-4 text-sm">
              <div>
                <div className="text-base font-bold">{item.penempatan.siswa.nama}</div>
                <div className="text-muted">{tgl(item.tanggal)}</div>
              </div>
              <div>
                <b>Kegiatan</b>
                <p className="mt-1 whitespace-pre-wrap">{item.kegiatan}</p>
              </div>
              {item.kendala && (
                <div>
                  <b>Kendala</b>
                  <p className="mt-1 whitespace-pre-wrap">{item.kendala}</p>
                </div>
              )}
              {item.pelajaran && (
                <div>
                  <b>Pelajaran</b>
                  <p className="mt-1 whitespace-pre-wrap">{item.pelajaran}</p>
                </div>
              )}
              <div>
                <b>Keahlian</b>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {item.keahlian.length === 0 && <span className="text-muted">-</span>}
                  {item.keahlian.map((tag) => (
                    <span
                      key={tag.keahlian.nama}
                      className="rounded-full bg-hijau-tombol px-3 py-1 text-xs font-semibold text-white"
                    >
                      {tag.keahlian.nama}
                    </span>
                  ))}
                </div>
              </div>
              {item.lampiran.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {item.lampiran.map((lampiran, index) => (
                    <Foto key={lampiran.id} path={lampiran.fileFoto} label={`Lampiran ${index + 1}`} />
                  ))}
                </div>
              )}
              {tahap === "GURU" && item.disetujuiSupervisorOleh && (
                <p className="rounded-lg bg-green-100 px-3 py-2 text-green-800">
                  Disetujui Pembimbing DU/DI {item.disetujuiSupervisorOleh.nama} ·{" "}
                  {waktu(item.disetujuiSupervisorPada)}
                </p>
              )}
              <TombolKeputusan tipe="jurnal" id={item.id} />
            </article>
          ))}
        </section>
      )}
    </div>
  );
}