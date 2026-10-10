"use client";

import { Fragment, useMemo, useState } from "react";
import { Indikator } from "./IndikatorStatus";

type Lampu = "hijau" | "kuning" | "merah" | "netral";

export type BarisSiswa = {
  id: string;
  nama: string;
  paket: string | null;
  tempat: string;
  lampu: Lampu;
  menunggu: number;
  ditolak: number;
  disetujui: number;
  hari: {
    tanggal: string;
    absenStatus: string | null;
    belumPulang: boolean;
    jurnalStatus: string | null;
  }[];
};

const INFO_LAMPU: Record<Lampu, { teks: string; titik: string }> = {
  merah: { teks: "Ada yang ditolak", titik: "bg-red-600" },
  kuning: { teks: "Menunggu", titik: "bg-amber-500" },
  hijau: { teks: "Beres", titik: "bg-green-600" },
  netral: { teks: "Belum ada aktivitas", titik: "bg-gray-400" },
};

function Lamp({ lampu }: { lampu: Lampu }) {
  const info = INFO_LAMPU[lampu];
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${info.titik}`} />
      {info.teks}
    </span>
  );
}

function Rincian({ hari }: { hari: BarisSiswa["hari"] }) {
  if (hari.length === 0) {
    return <p className="text-sm text-muted">Belum ada aktivitas dalam tujuh hari terakhir.</p>;
  }
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-muted">
        <tr>
          <th className="py-1.5 pr-3 font-semibold">Tanggal</th>
          <th className="py-1.5 pr-3 font-semibold">Absen</th>
          <th className="py-1.5 font-semibold">Jurnal</th>
        </tr>
      </thead>
      <tbody>
        {hari.map((h) => (
          <tr key={h.tanggal} className="border-t">
            <td className="whitespace-nowrap py-2 pr-3">
              {new Date(`${h.tanggal}T00:00:00.000Z`).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              })}
            </td>
            <td className="py-2 pr-3">
              <Indikator status={h.absenStatus ?? undefined} kosong="Belum ada" menungguPulang={h.belumPulang} />
            </td>
            <td className="py-2">
              <Indikator status={h.jurnalStatus ?? undefined} kosong="Belum ada" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function TabelSiswaGuru({ baris }: { baris: BarisSiswa[] }) {
  const [tampilan, setTampilan] = useState<"tabel" | "kartu">("tabel");
  const [cari, setCari] = useState("");
  const [paket, setPaket] = useState("semua");
  const [lampu, setLampu] = useState<"semua" | Lampu>("semua");
  const [buka, setBuka] = useState<string | null>(null);

  const daftarPaket = useMemo(
    () =>
      Array.from(new Set(baris.map((b) => b.paket).filter((x): x is string => Boolean(x)))).sort((a, b) =>
        a.localeCompare(b, "id-ID"),
      ),
    [baris],
  );

  const hitung = (l: Lampu) => baris.filter((b) => b.lampu === l).length;

  const teks = cari.trim().toLocaleLowerCase("id-ID");
  const hasil = baris.filter(
    (b) =>
      (paket === "semua" || b.paket === paket) &&
      (lampu === "semua" || b.lampu === lampu) &&
      b.nama.toLocaleLowerCase("id-ID").includes(teks),
  );

  const chip = "rounded-full border px-3 py-1 text-xs font-semibold";
  const chipAktif = "border-hijau-tombol bg-hijau-tombol text-white";
  const chipBiasa = "hover:border-hijau-aksen";
  const tombolDetail = "rounded-lg border px-2.5 py-1 text-xs font-semibold hover:border-hijau-aksen";

  const pilihanLampu: { nilai: "semua" | Lampu; label: string }[] = [
    { nilai: "semua", label: `Semua (${baris.length})` },
    { nilai: "merah", label: `Ditolak (${hitung("merah")})` },
    { nilai: "kuning", label: `Menunggu (${hitung("kuning")})` },
    { nilai: "hijau", label: `Beres (${hitung("hijau")})` },
    { nilai: "netral", label: `Belum ada (${hitung("netral")})` },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-2xl border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-sm font-semibold">
            Cari siswa
            <input
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Ketik nama siswa"
              className="mt-1 w-full rounded-lg border bg-surface p-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-hijau-aksen"
            />
          </label>

          {daftarPaket.length > 0 && (
            <label className="text-sm font-semibold">
              Paket Keahlian
              <select
                value={paket}
                onChange={(e) => setPaket(e.target.value)}
                className="mt-1 block w-full rounded-lg border bg-surface p-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-hijau-aksen"
              >
                <option value="semua">Semua</option>
                {daftarPaket.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex overflow-hidden rounded-lg border text-sm font-semibold">
            <button
              type="button"
              onClick={() => setTampilan("tabel")}
              className={`px-3 py-2.5 ${tampilan === "tabel" ? "bg-hijau-tombol text-white" : ""}`}
            >
              Tabel
            </button>
            <button
              type="button"
              onClick={() => setTampilan("kartu")}
              className={`px-3 py-2.5 ${tampilan === "kartu" ? "bg-hijau-tombol text-white" : ""}`}
            >
              Kartu
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {pilihanLampu.map((p) => (
            <button
              key={p.nilai}
              type="button"
              onClick={() => setLampu(p.nilai)}
              className={`${chip} ${lampu === p.nilai ? chipAktif : chipBiasa}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted">
          Menampilkan {hasil.length} dari {baris.length} siswa
        </p>
      </div>

      {hasil.length === 0 ? (
        <p className="rounded-2xl border bg-surface p-4 text-sm text-muted">
          {baris.length === 0
            ? "Belum ada siswa aktif yang ditempatkan kepada Anda."
            : "Tidak ada siswa yang cocok dengan pencarian atau filter."}
        </p>
      ) : tampilan === "tabel" ? (
        <div className="overflow-x-auto rounded-2xl border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs text-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Nama</th>
                <th className="px-3 py-2.5 font-semibold">Paket Keahlian</th>
                <th className="px-3 py-2.5 font-semibold">DU/DI</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 text-center font-semibold">Menunggu</th>
                <th className="px-3 py-2.5 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {hasil.map((b) => (
                <Fragment key={b.id}>
                  <tr className="border-t first:border-t-0">
                    <td className="px-3 py-2.5 font-semibold">{b.nama}</td>
                    <td className="px-3 py-2.5">{b.paket ?? "-"}</td>
                    <td className="px-3 py-2.5">{b.tempat}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Lamp lampu={b.lampu} />
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold">{b.menunggu}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button type="button" onClick={() => setBuka(buka === b.id ? null : b.id)} className={tombolDetail}>
                        {buka === b.id ? "Tutup" : "Detail"}
                      </button>
                    </td>
                  </tr>
                  {buka === b.id && (
                    <tr className="border-t bg-foreground/5">
                      <td colSpan={6} className="px-3 py-3">
                        <Rincian hari={b.hari} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hasil.map((b) => (
            <article key={b.id} className="space-y-2 rounded-2xl border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold">{b.nama}</h3>
                <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-semibold">
                  {b.menunggu} menunggu
                </span>
              </div>
              <p className="text-xs text-muted">
                {b.paket ?? "-"} · {b.tempat}
              </p>
              <Lamp lampu={b.lampu} />
              <div>
                <button type="button" onClick={() => setBuka(buka === b.id ? null : b.id)} className={tombolDetail}>
                  {buka === b.id ? "Tutup" : "Detail"}
                </button>
              </div>
              {buka === b.id && (
                <div className="border-t pt-2">
                  <Rincian hari={b.hari} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}