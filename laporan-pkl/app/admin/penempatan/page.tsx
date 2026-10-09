import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { wajibPeran } from "@/lib/akses";

async function buatPenempatan(formData: FormData) {
  "use server";
  await wajibPeran("ADMIN");

  const siswaId = String(formData.get("siswaId") ?? "");
  const guruId = String(formData.get("guruId") ?? "");
  const supervisorId = String(formData.get("supervisorId") ?? "");
  const tempatPklId = String(formData.get("tempatPklId") ?? "");
  const mulai = String(formData.get("mulai") ?? "");
  const selesai = String(formData.get("selesai") ?? "");

  if (!siswaId || !guruId || !supervisorId || !tempatPklId || !mulai || !selesai) {
    redirect("/admin/penempatan?pesan=Semua+isian+wajib+diisi");
  }
  if (mulai > selesai) {
    redirect("/admin/penempatan?pesan=Tanggal+mulai+tidak+boleh+setelah+tanggal+selesai");
  }

  // Aturan bisnis: satu siswa hanya punya satu penempatan
  const sudahAda = await prisma.penempatan.findFirst({ where: { siswaId } });
  if (sudahAda) {
    redirect("/admin/penempatan?pesan=Siswa+ini+sudah+punya+penempatan");
  }

  await prisma.penempatan.create({
    data: {
      siswaId, guruId, supervisorId, tempatPklId,
      tanggalMulai: new Date(mulai),
      tanggalSelesai: new Date(selesai),
    },
  });
  redirect("/admin/penempatan?pesan=Penempatan+berhasil+dibuat");
}

const tgl = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function PenempatanPage({
  searchParams,
}: {
  searchParams: Promise<{ pesan?: string }>;
}) {
  await wajibPeran("ADMIN");
  const { pesan } = await searchParams;

  const [siswaBelum, guru, supervisor, tempat, daftar] = await Promise.all([
    prisma.pengguna.findMany({
      where: { peran: "SISWA", aktif: true, penempatanSebagaiSiswa: { none: {} } },
      orderBy: { nama: "asc" },
    }),
    prisma.pengguna.findMany({ where: { peran: "GURU", aktif: true }, orderBy: { nama: "asc" } }),
    prisma.pengguna.findMany({ where: { peran: "SUPERVISOR", aktif: true }, orderBy: { nama: "asc" } }),
    prisma.tempatPkl.findMany({ orderBy: { nama: "asc" } }),
    prisma.penempatan.findMany({
      include: { siswa: true, guru: true, supervisor: true, tempatPkl: true },
      orderBy: { tanggalMulai: "desc" },
    }),
  ]);

  const kelas = "w-full border rounded p-2";

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <a href="/admin" className="text-sm text-biru">← Kembali</a>
      <h1 className="text-xl font-bold">Penempatan PKL</h1>
      {pesan && <p className="border rounded p-3 text-sm">{pesan}</p>}

      <form action={buatPenempatan} className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Tempatkan siswa</h2>
        <select name="siswaId" required className={kelas} defaultValue="">
          <option value="" disabled>Pilih siswa (yang belum punya penempatan)</option>
          {siswaBelum.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
        </select>
        <select name="tempatPklId" required className={kelas} defaultValue="">
          <option value="" disabled>Pilih DU/DI</option>
          {tempat.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
        </select>
        <select name="guruId" required className={kelas} defaultValue="">
          <option value="" disabled>Pilih Pembimbing sekolah</option>
          {guru.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
        </select>
        <select name="supervisorId" required className={kelas} defaultValue="">
          <option value="" disabled>Pilih Pembimbing DU/DI</option>
          {supervisor.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
        </select>
        <label className="block text-sm">Tanggal mulai
          <input name="mulai" type="date" required className={kelas} />
        </label>
        <label className="block text-sm">Tanggal selesai
          <input name="selesai" type="date" required className={kelas} />
        </label>
        <button type="submit" className="bg-hijau-tombol hover:bg-hijau-aksen text-white rounded px-4 py-2">Simpan penempatan</button>
      </form>

      <section className="space-y-2">
        <h2 className="font-semibold">Daftar penempatan ({daftar.length})</h2>
        {daftar.map((p) => (
          <div key={p.id} className="border rounded p-3 text-sm">
            <b>{p.siswa.nama}</b> → {p.tempatPkl.nama}
            <div className="text-gray-500">
              Pembimbing sekolah: {p.guru.nama} · Pembimbing DU/DI: {p.supervisor.nama}
              <br />
              {tgl(p.tanggalMulai)} s/d {tgl(p.tanggalSelesai)}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}