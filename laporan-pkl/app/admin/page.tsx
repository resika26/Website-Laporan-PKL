import Link from "next/link";
import { wajibPeran } from "@/lib/akses";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  await wajibPeran("ADMIN");

  const [siswa, guru, supervisor, tempat, penempatan] = await Promise.all([
    prisma.pengguna.count({ where: { peran: "SISWA" } }),
    prisma.pengguna.count({ where: { peran: "GURU" } }),
    prisma.pengguna.count({ where: { peran: "SUPERVISOR" } }),
    prisma.tempatPkl.count(),
    prisma.penempatan.count(),
  ]);

  const ringkasan = [
    { angka: siswa, label: "Siswa" },
    { angka: guru, label: "Pembimbing sekolah" },
    { angka: supervisor, label: "Pembimbing DU/DI" },
    { angka: tempat, label: "DU/DI" },
    { angka: penempatan, label: "Penempatan" },
  ];

  const menu = [
    { href: "/admin/pengguna", judul: "Kelola akun", isi: "Buat dan cari akun siswa, pembimbing, dan admin." },
    { href: "/admin/tempat-pkl", judul: "DU/DI", isi: "Atur tempat PKL, lokasi, dan radius absen." },
    { href: "/admin/penempatan", judul: "Penempatan", isi: "Hubungkan siswa dengan DU/DI dan pembimbingnya." },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4">
      <div>
        <h1 className="text-xl font-bold">Dashboard Admin</h1>
        <p className="mt-1 text-sm text-muted">Ringkasan data dan pintasan ke halaman pengelolaan.</p>
      </div>

      <section className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
        {ringkasan.map((r) => (
          <div key={r.label} className="rounded-xl border bg-surface p-3">
            <div className="text-2xl font-bold text-hijau-aksen">{r.angka}</div>
            <div className="text-xs text-muted">{r.label}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {menu.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-2xl border bg-surface p-4 hover:border-hijau-aksen"
          >
            <div className="font-bold text-hijau-aksen">{m.judul}</div>
            <p className="mt-1 text-sm text-muted">{m.isi}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}