import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GALERI_PUBLIK, urlGambarProject } from "@/lib/project";
import GaleriProject from "@/app/_components/GaleriProject";

export default async function GaleriPage() {
  const session = await auth();
  if (!GALERI_PUBLIK && !session) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { status: "TAMPIL", rahasiaPerusahaan: false },
    include: { siswa: true, gambar: true },
    orderBy: { dibuatPada: "desc" },
  });
  const urlGambar = await urlGambarProject(projects.flatMap((project) => project.gambar.map((item) => item.fileGambar)));

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-5">
      <h1 className="text-xl font-bold">Galeri Project PKL</h1>
      <GaleriProject
        projects={projects.map((project) => ({
          id: project.id,
          judul: project.judul,
          deskripsi: project.deskripsi,
          tautan: project.tautan,
          siswa: project.siswa.nama,
          gambar: project.gambar.map((gambar) => ({
            id: gambar.id,
            url: urlGambar.get(gambar.fileGambar) ?? null,
          })),
        }))}
      />
    </main>
  );
}