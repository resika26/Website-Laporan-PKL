import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GALERI_PUBLIK, urlGambarProject } from "@/lib/project";
import GaleriProject from "@/app/_components/GaleriProject";
import KerangkaHalaman from "@/app/_components/KerangkaHalaman";
import type { PeranAplikasi } from "@/app/_components/navigasi";

export default async function GaleriPage() {
  const session = await auth();
  if (!GALERI_PUBLIK && !session) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { status: "TAMPIL", rahasiaPerusahaan: false },
    include: { siswa: { include: { profilSiswa: true } }, gambar: true },
    orderBy: { dibuatPada: "desc" },
  });
  const urlGambar = await urlGambarProject(projects.flatMap((project) => project.gambar.map((item) => item.fileGambar)));

  return (
    <KerangkaHalaman
      peran={session?.user.peran as PeranAplikasi | undefined}
      nama={session?.user.name}
    >
      <main className="mx-auto max-w-6xl space-y-4 p-4">
        <div>
          <h1 className="text-xl font-bold">Galeri Project PKL</h1>
          <p className="mt-1 text-sm text-muted">Hasil karya siswa SMK Negeri 1 Pacitan selama PKL.</p>
        </div>
        <GaleriProject
          projects={projects.map((project) => ({
            id: project.id,
            judul: project.judul,
            deskripsi: project.deskripsi,
            tautan: project.tautan,
            siswa: project.siswa.nama,
            paket: project.siswa.profilSiswa?.jurusan ?? null,
            gambar: project.gambar.map((gambar) => ({
              id: gambar.id,
              url: urlGambar.get(gambar.fileGambar) ?? null,
            })),
          }))}
        />
      </main>
    </KerangkaHalaman>
  );
}