import { prisma } from "@/lib/prisma";
import { urlGambarProject } from "@/lib/project";
import TombolReviewProject from "./TombolReviewProject";

export default async function AntreanProjectGuru({ userId }: { userId: string }) {
  const projects = await prisma.project.findMany({
    where: {
      status: "MENUNGGU",
      siswa: {
        is: { penempatanSebagaiSiswa: { some: { guruId: userId } } },
      },
    },
    include: { siswa: true, gambar: true },
    orderBy: { dibuatPada: "asc" },
  });
  const urlGambar = await urlGambarProject(projects.flatMap((project) => project.gambar.map((gambar) => gambar.fileGambar)));

  return (
    <section className="space-y-4">
      <header>
        <h2 className="font-semibold">Project menunggu persetujuan ({projects.length})</h2>
        <p className="text-sm text-gray-500">Hanya project siswa bimbingan Anda yang diajukan untuk diperiksa.</p>
      </header>
      {projects.length === 0 && <p className="border rounded p-4 text-sm text-gray-500">Tidak ada project yang menunggu.</p>}
      {projects.map((project) => (
        <article key={project.id} className="border-b pb-4 space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{project.judul}</h3>
            <span className="text-gray-500">{project.siswa.nama}</span>
          </div>
          {project.rahasiaPerusahaan && (
            <p className="border border-orange-300 bg-orange-50 p-3 text-orange-900">
              Project ditandai rahasia perusahaan. Jangan tampilkan di galeri publik.
            </p>
          )}
          {project.deskripsi && <p className="whitespace-pre-wrap">{project.deskripsi}</p>}
          {project.tautan && <a href={project.tautan} target="_blank" rel="noreferrer" className="text-biru underline">Buka tautan project</a>}
          <div className="flex flex-wrap gap-3">
            {project.gambar.map((gambar, index) => {
              const url = urlGambar.get(gambar.fileGambar);
              return url ? (
                <a key={gambar.id} href={url} target="_blank" rel="noreferrer" className="text-xs text-gray-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${project.judul}, gambar ${index + 1}`} className="h-32 w-auto rounded border object-cover" />
                  Gambar {index + 1}
                </a>
              ) : null;
            })}
          </div>
          <TombolReviewProject id={project.id} />
        </article>
      ))}
    </section>
  );
}