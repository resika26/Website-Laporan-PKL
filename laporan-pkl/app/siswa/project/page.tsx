import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { wajibPeran } from "@/lib/akses";
import { urlGambarProject } from "@/lib/project";
import FormProject from "@/app/_components/FormProject";

const statusProject: Record<string, { teks: string; kelas: string }> = {
  DRAF: { teks: "Draf", kelas: "bg-gray-100 text-gray-700" },
  MENUNGGU: { teks: "Menunggu persetujuan Pembimbing sekolah", kelas: "bg-amber-100 text-amber-800" },
  TAMPIL: { teks: "Disetujui dan tampil", kelas: "bg-green-100 text-green-800" },
  DITOLAK: { teks: "Perlu revisi", kelas: "bg-red-100 text-red-700" },
};

export default async function ProjectSiswaPage() {
  const session = await wajibPeran("SISWA");
  const projects = await prisma.project.findMany({
    where: { siswaId: session.user.id },
    include: { gambar: true },
    orderBy: { dibuatPada: "desc" },
  });
  const urlGambar = await urlGambarProject(projects.flatMap((project) => project.gambar.map((item) => item.fileGambar)));

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm text-biru">← Dashboard</Link>
        <Link href="/galeri" className="text-sm text-biru">Galeri publik</Link>
      </div>
      <header>
        <h1 className="text-xl font-bold">Project Saya</h1>
        <p className="text-sm text-gray-600">Project yang diajukan menunggu persetujuan Pembimbing sekolah sebelum tampil di galeri.</p>
      </header>

      <FormProject />

      <section className="space-y-4">
        <h2 className="font-semibold">Riwayat pengajuan ({projects.length})</h2>
        {projects.length === 0 && <p className="text-sm text-gray-500">Belum ada project yang dikirim.</p>}
        {projects.map((project) => {
          const status = statusProject[project.status];
          return (
            <article key={project.id} className="border-b pb-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{project.judul}</h3>
                <span className={`rounded px-2 py-0.5 text-xs ${status.kelas}`}>{status.teks}</span>
              </div>
              {project.deskripsi && <p className="text-sm whitespace-pre-wrap">{project.deskripsi}</p>}
              {project.rahasiaPerusahaan && (
                <p className="text-sm text-amber-800">Project rahasia: tidak akan ditampilkan di galeri publik.</p>
              )}
              {project.status === "DITOLAK" && project.catatan && (
                <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  Alasan revisi: {project.catatan}
                </p>
              )}
              {project.tautan && <a href={project.tautan} target="_blank" rel="noreferrer" className="text-sm text-biru underline">Buka tautan project</a>}
              <div className="flex flex-wrap gap-3">
                {project.gambar.map((gambar, index) => {
                  const url = urlGambar.get(gambar.fileGambar);
                  return url ? (
                    <a key={gambar.id} href={url} target="_blank" rel="noreferrer" className="text-xs text-gray-600">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`${project.judul}, gambar ${index + 1}`} className="h-28 w-auto rounded border object-cover" />
                      Gambar {index + 1}
                    </a>
                  ) : null;
                })}
              </div>
              {(project.status === "DRAF" || project.status === "DITOLAK") && (
                <FormProject
                  project={{
                    id: project.id,
                    judul: project.judul,
                    deskripsi: project.deskripsi ?? "",
                    tautan: project.tautan ?? "",
                    rahasiaPerusahaan: project.rahasiaPerusahaan,
                    gambar: project.gambar.map((gambar) => ({
                      id: gambar.id,
                      url: urlGambar.get(gambar.fileGambar) ?? null,
                    })),
                  }}
                />
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}