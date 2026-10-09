"use client";

import { useState } from "react";

type ItemGaleri = {
  id: string;
  judul: string;
  deskripsi: string | null;
  tautan: string | null;
  siswa: string;
  gambar: { id: string; url: string | null }[];
};

export default function GaleriProject({ projects }: { projects: ItemGaleri[] }) {
  const [cari, setCari] = useState("");
  const teksCari = cari.trim().toLocaleLowerCase("id-ID");
  const hasil = projects.filter((project) =>
    `${project.judul} ${project.deskripsi ?? ""} ${project.siswa}`
      .toLocaleLowerCase("id-ID")
      .includes(teksCari),
  );

  return (
    <section className="space-y-4">
      <label className="block text-sm font-medium">
        Cari project
        <input
          type="search"
          value={cari}
          onChange={(event) => setCari(event.target.value)}
          placeholder="Ketik judul, deskripsi, atau nama siswa"
          className="mt-1 w-full border rounded p-2 font-normal"
        />
      </label>
      {hasil.length === 0 ? (
        <p className="text-sm text-gray-500">
          {projects.length === 0 ? "Belum ada project yang ditampilkan." : "Project tidak ditemukan."}
        </p>
      ) : (
        <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {hasil.map((project) => (
            <article key={project.id} className="border-b pb-4 space-y-2">
              <h2 className="font-semibold">{project.judul}</h2>
              <p className="text-xs text-gray-500">Oleh {project.siswa}</p>
              {project.deskripsi && <p className="text-sm whitespace-pre-wrap">{project.deskripsi}</p>}
              <div className="flex flex-wrap gap-2">
                {project.gambar.map((gambar, index) => (
                  gambar.url ? (
                    <a
                      key={gambar.id}
                      href={gambar.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Buka gambar ${index + 1} untuk ${project.judul}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={gambar.url} alt={`${project.judul}, gambar ${index + 1}`} className="h-40 w-full rounded border object-cover" />
                    </a>
                  ) : null
                ))}
              </div>
              {project.tautan && <a href={project.tautan} target="_blank" rel="noreferrer" className="inline-block text-sm text-biru underline">Lihat project</a>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}