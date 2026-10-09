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
      <a href={url} target="_blank" rel="noreferrer" className="block text-xs text-gray-500">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="h-32 w-auto rounded border object-cover" />
        {label}
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

  return (
    <div className="space-y-6">
      {tahap === "GURU" && <PersetujuanMassal items={itemMassal} />}
      {kosong && <p className="border rounded p-4 text-sm text-gray-500">Tidak ada yang menunggu.</p>}

      {absen.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Absen menunggu ({absen.length})</h2>
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
              <article key={item.id} className="border rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <b>{item.penempatan.siswa.nama}</b>
                  <span className="text-gray-500">{tgl(item.tanggal)}</span>
                </div>
                <p>{tempat.nama} · <b>{item.jenis}</b></p>

                {item.jenis === "HADIR" ? (
                  <>
                    <p>
                      Masuk {jam(item.jamMasuk)}
                      {jarakMasuk != null && ` · ${jarakMasuk} m dari lokasi`}
                      {item.latMasuk != null && item.lngMasuk != null && (
                        <> · <a className="text-biru" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${item.latMasuk},${item.lngMasuk}`}>Peta masuk</a></>
                      )}
                    </p>
                    <p>
                      Pulang {jam(item.jamPulang)}
                      {jarakPulang != null && ` · ${jarakPulang} m dari lokasi`}
                      {item.latPulang != null && item.lngPulang != null && (
                        <> · <a className="text-biru" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${item.latPulang},${item.lngPulang}`}>Peta pulang</a></>
                      )}
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      <Foto path={item.fotoMasuk} label="Foto masuk" />
                      <Foto path={item.fotoPulang} label="Foto pulang" />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">Alasan: {item.alasan}</p>
                    <Foto path={item.fotoSurat} label="Foto surat" />
                  </>
                )}

                {tahap === "GURU" && item.disetujuiSupervisorOleh && (
                  <p className="text-green-700">
                    Disetujui supervisor {item.disetujuiSupervisorOleh.nama} · {waktu(item.disetujuiSupervisorPada)}
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
          <h2 className="font-semibold">Jurnal menunggu ({jurnal.length})</h2>
          {jurnal.map((item) => (
            <article key={item.id} className="border rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <b>{item.penempatan.siswa.nama}</b>
                <span className="text-gray-500">{tgl(item.tanggal)}</span>
              </div>
              <div><b>Kegiatan</b><p className="whitespace-pre-wrap">{item.kegiatan}</p></div>
              {item.kendala && <div><b>Kendala</b><p className="whitespace-pre-wrap">{item.kendala}</p></div>}
              {item.pelajaran && <div><b>Pelajaran</b><p className="whitespace-pre-wrap">{item.pelajaran}</p></div>}
              <p>Keahlian: {item.keahlian.map((tag) => tag.keahlian.nama).join(", ") || "-"}</p>
              <div className="flex gap-3 flex-wrap">
                {item.lampiran.map((lampiran, index) => (
                  <Foto key={lampiran.id} path={lampiran.fileFoto} label={`Lampiran ${index + 1}`} />
                ))}
              </div>
              {tahap === "GURU" && item.disetujuiSupervisorOleh && (
                <p className="text-green-700">
                  Disetujui supervisor {item.disetujuiSupervisorOleh.nama} · {waktu(item.disetujuiSupervisorPada)}
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