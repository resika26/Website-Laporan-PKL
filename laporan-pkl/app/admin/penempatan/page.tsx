import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { wajibPeran } from "@/lib/akses";

const UKURAN_HALAMAN = 15;

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

type Param = { pesan?: string; q?: string; tempat?: string; paket?: string; hal?: string };

export default async function PenempatanPage({
  searchParams,
}: {
  searchParams: Promise<Param>;
}) {
  await wajibPeran("ADMIN");
  const sp = await searchParams;

  const pesan = sp.pesan;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const tempatFilter = (sp.tempat ?? "").trim();
  const paket = (sp.paket ?? "").trim();

  const where = {
    ...(q
      ? {
          OR: [
            { siswa: { nama: { contains: q, mode: "insensitive" as const } } },
            { tempatPkl: { nama: { contains: q, mode: "insensitive" as const } } },
            { guru: { nama: { contains: q, mode: "insensitive" as const } } },
            { supervisor: { nama: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(tempatFilter ? { tempatPklId: tempatFilter } : {}),
    ...(paket ? { siswa: { profilSiswa: { is: { jurusan: paket } } } } : {}),
  };

  const [total, semua] = await Promise.all([
    prisma.penempatan.count({ where }),
    prisma.penempatan.count(),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const hal = Math.min(Math.max(parseInt(sp.hal ?? "1", 10) || 1, 1), totalHalaman);

  const [siswaBelum, guru, supervisor, tempat, paketOpsi, daftar] = await Promise.all([
    prisma.pengguna.findMany({
      where: { peran: "SISWA", aktif: true, penempatanSebagaiSiswa: { none: {} } },
      orderBy: { nama: "asc" },
    }),
    prisma.pengguna.findMany({ where: { peran: "GURU", aktif: true }, orderBy: { nama: "asc" } }),
    prisma.pengguna.findMany({ where: { peran: "SUPERVISOR", aktif: true }, orderBy: { nama: "asc" } }),
    prisma.tempatPkl.findMany({ orderBy: { nama: "asc" } }),
    prisma.profilSiswa.findMany({
      select: { jurusan: true },
      distinct: ["jurusan"],
      orderBy: { jurusan: "asc" },
    }),
    prisma.penempatan.findMany({
      where,
      include: { siswa: { include: { profilSiswa: true } }, guru: true, supervisor: true, tempatPkl: true },
      orderBy: { tanggalMulai: "desc" },
      skip: (hal - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
  ]);

  function tautan(h: number) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (tempatFilter) p.set("tempat", tempatFilter);
    if (paket) p.set("paket", paket);
    if (h > 1) p.set("hal", String(h));
    const s = p.toString();
    return s ? `/admin/penempatan?${s}` : "/admin/penempatan";
  }

  const adaFilter = Boolean(q || tempatFilter || paket);
  const pesanBerhasil = pesan?.toLowerCase().includes("berhasil");
  const kotak =
    "w-full rounded-lg border bg-surface p-2.5 focus:outline-none focus:ring-2 focus:ring-hijau-aksen";
  const tombolHal = "rounded-lg border px-3 py-1.5 text-sm font-semibold hover:border-hijau-aksen";
  const tombolHalMati = "rounded-lg border px-3 py-1.5 text-sm font-semibold opacity-40";

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4">
      <Link href="/admin" className="text-sm font-semibold text-biru hover:underline">
        ← Dashboard admin
      </Link>
      <h1 className="text-xl font-bold">Penempatan PKL</h1>

      {pesan && (
        <p
          className={`rounded-xl border p-3 text-sm ${
            pesanBerhasil
              ? "border-green-400 bg-green-100 text-green-700"
              : "border-red-400 bg-red-100 text-red-700"
          }`}
        >
          {pesan}
        </p>
      )}

      <details className="rounded-2xl border bg-surface p-4" open={Boolean(pesan && !pesanBerhasil)}>
        <summary className="cursor-pointer font-bold">Tempatkan siswa</summary>
        <form action={buatPenempatan} className="mt-3 space-y-3">
          <select name="siswaId" required className={kotak} defaultValue="">
            <option value="" disabled>Pilih siswa (yang belum punya penempatan)</option>
            {siswaBelum.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          <select name="tempatPklId" required className={kotak} defaultValue="">
            <option value="" disabled>Pilih DU/DI</option>
            {tempat.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
          </select>
          <select name="guruId" required className={kotak} defaultValue="">
            <option value="" disabled>Pilih Pembimbing sekolah</option>
            {guru.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
          </select>
          <select name="supervisorId" required className={kotak} defaultValue="">
            <option value="" disabled>Pilih Pembimbing DU/DI</option>
            {supervisor.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          <label className="block text-sm font-semibold">
            Tanggal mulai
            <input name="mulai" type="date" required className={`${kotak} mt-1 font-normal`} />
          </label>
          <label className="block text-sm font-semibold">
            Tanggal selesai
            <input name="selesai" type="date" required className={`${kotak} mt-1 font-normal`} />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-hijau-tombol px-5 py-2.5 font-bold text-white hover:bg-hijau-aksen"
          >
            Simpan penempatan
          </button>
        </form>
      </details>

      <section className="space-y-3">
        <form method="get" className="space-y-3 rounded-2xl border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold sm:col-span-2">
              Cari penempatan
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Nama siswa, DU/DI, atau pembimbing"
                className={`${kotak} mt-1 font-normal`}
              />
            </label>
            <label className="text-sm font-semibold">
              DU/DI
              <select name="tempat" defaultValue={tempatFilter} className={`${kotak} mt-1 font-normal`}>
                <option value="">Semua</option>
                {tempat.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Paket Keahlian
              <select name="paket" defaultValue={paket} className={`${kotak} mt-1 font-normal`}>
                <option value="">Semua</option>
                {paketOpsi.map((p) => (
                  <option key={p.jurusan} value={p.jurusan}>
                    {p.jurusan}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-hijau-tombol px-5 py-2 text-sm font-bold text-white hover:bg-hijau-aksen"
            >
              Terapkan
            </button>
            {adaFilter && (
              <Link href="/admin/penempatan" className="text-sm font-semibold text-biru hover:underline">
                Hapus filter
              </Link>
            )}
            <span className="text-xs text-muted">
              {total} penempatan cocok dari {semua}
            </span>
          </div>
        </form>

        {daftar.length === 0 ? (
          <p className="rounded-2xl border bg-surface p-4 text-sm text-muted">
            Tidak ada penempatan yang cocok dengan pencarian atau filter.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs text-muted">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Siswa</th>
                  <th className="px-3 py-2.5 font-semibold">Paket Keahlian</th>
                  <th className="px-3 py-2.5 font-semibold">DU/DI</th>
                  <th className="px-3 py-2.5 font-semibold">Pembimbing sekolah</th>
                  <th className="px-3 py-2.5 font-semibold">Pembimbing DU/DI</th>
                  <th className="px-3 py-2.5 font-semibold">Periode</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((p) => (
                  <tr key={p.id} className="border-t first:border-t-0">
                    <td className="px-3 py-2.5 font-semibold">{p.siswa.nama}</td>
                    <td className="px-3 py-2.5">{p.siswa.profilSiswa?.jurusan ?? "-"}</td>
                    <td className="px-3 py-2.5">{p.tempatPkl.nama}</td>
                    <td className="px-3 py-2.5">{p.guru.nama}</td>
                    <td className="px-3 py-2.5">{p.supervisor.nama}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {tgl(p.tanggalMulai)} s/d {tgl(p.tanggalSelesai)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalHalaman > 1 && (
          <div className="flex items-center justify-between gap-2">
            {hal > 1 ? (
              <Link href={tautan(hal - 1)} className={tombolHal}>
                ‹ Sebelumnya
              </Link>
            ) : (
              <span className={tombolHalMati}>‹ Sebelumnya</span>
            )}
            <span className="text-sm text-muted">
              Halaman {hal} dari {totalHalaman}
            </span>
            {hal < totalHalaman ? (
              <Link href={tautan(hal + 1)} className={tombolHal}>
                Berikutnya ›
              </Link>
            ) : (
              <span className={tombolHalMati}>Berikutnya ›</span>
            )}
          </div>
        )}
      </section>
    </main>
  );
}