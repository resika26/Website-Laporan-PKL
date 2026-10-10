"use client";

import { useMemo, useState } from "react";

type ItemGaleri = {
  id: string;
  judul: string;
  deskripsi: string | null;
  tautan: string | null;
  siswa: string;
  paket: string | null;
  gambar: { id: string; url: string | null }[];
};

export default function GaleriProject({ projects }: { projects: ItemGaleri[] }) {
  const [cari, setCari] = useState("");
  const [paket, setPaket] = useState("semua");

  const daftarPaket = useMemo(
    () =>
      Array.from(
        new Set(projects.map((p) => p.paket).filter((x): x is string => Boolean(x))),
      ).sort((a, b) => a.localeCompare(b, "id-ID")),
    [projects],
  );

  const teksCari = cari.trim().toLocaleLowerCase("id-ID");
  const hasil = projects.filter(
    (project) =>
      (paket === "semua" || project.paket === paket) &&
      `${project.judul} ${project.deskripsi ?? ""} ${project.siswa} ${project.paket ?? ""}`
        .toLocaleLowerCase("id-ID")
        .includes(teksCari),
  );

  const chip = "rounded-full border px-3 py-1 text-xs font-semibold";
  const chipAktif = "border-hijau-tombol bg-hijau-tombol text-white";
  const chipBiasa = "hover:border-hijau-aksen";

  return (
    <section className="space-y-4">
      <div className="space-y-3 rounded-2xl border bg-surface p-4">
        <label className="block text-sm font-semibold">
          Cari project
          <input
            type="search"
            value={cari}
            onChange={(event) => setCari(event.target.value)}
            placeholder="Ketik judul, deskripsi, atau nama siswa"
            className="mt-1 w-full rounded-lg border bg-surface p-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-hijau-aksen"
          />
        </label>

        {daftarPaket.length > 0 && (
          <div>
            <p className="text-sm font-semibold">Paket Keahlian</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPaket("semua")}
                className={`${chip} ${paket === "semua" ? chipAktif : chipBiasa}`}
              >
                Semua
              </button>
              {daftarPaket.map((nama) => (
                <button
                  key={nama}
                  type="button"
                  onClick={() => setPaket(nama)}
                  className={`${chip} ${paket === nama ? chipAktif : chipBiasa}`}
                >
                  {nama}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted">
          {hasil.length} dari {projects.length} project
        </p>
      </div>

      {hasil.length === 0 ? (
        <p className="rounded-2xl border bg-surface p-4 text-sm text-muted">
          {projects.length === 0 ? "Belum ada project yang ditampilkan." : "Project tidak ditemukan."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hasil.map((project) => {
            const gambarAda = project.gambar.filter((g) => g.url);
            const sampul = gambarAda[0];
            const tambahan = gambarAda.slice(1, 5);

            return (
              <article key={project.id} className="flex flex-col overflow-hidden rounded-2xl border bg-surface">
                {sampul?.url ? (
                  <a
                    href={sampul.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Buka gambar untuk ${project.judul}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sampul.url}
                      alt={`${project.judul}, gambar 1`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </a>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-hijau-aksen/10 text-sm text-muted">
                    Tanpa gambar
                  </div>
                )}

                {tambahan.length > 0 && (
                  <div className="flex gap-1.5 px-4 pt-3">
                    {tambahan.map((gambar, index) => (
                      <a
                        key={gambar.id}
                        href={gambar.url ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Buka gambar ${index + 2} untuk ${project.judul}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={gambar.url ?? ""}
                          alt={`${project.judul}, gambar ${index + 2}`}
                          className="h-12 w-12 rounded-lg border object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex flex-1 flex-col gap-2 p-4">
                  {project.paket && (
                    <span className="w-fit rounded-full bg-biru/10 px-2.5 py-0.5 text-xs font-semibold text-biru">
                      {project.paket}
                    </span>
                  )}
                  <h2 className="font-bold">{project.judul}</h2>
                  <p className="text-xs text-muted">Oleh {project.siswa}</p>
                  {project.deskripsi && (
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm">{project.deskripsi}</p>
                  )}
                  {project.tautan && (
                    <a
                      href={project.tautan}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-auto w-fit rounded-lg border px-3 py-1.5 text-sm font-semibold text-biru hover:border-biru"
                    >
                      Lihat project
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}