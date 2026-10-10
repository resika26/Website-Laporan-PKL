import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { wajibPeran } from "@/lib/akses";

const UKURAN_HALAMAN = 15;

async function tambahLibur(formData: FormData) {
  "use server";
  await wajibPeran("ADMIN");

  const tanggalTeks = String(formData.get("tanggal") ?? "");
  const keterangan = String(formData.get("keterangan") ?? "").trim();
  const tempatPklId = String(formData.get("tempatPklId") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalTeks) || Number.isNaN(new Date(tanggalTeks).getTime())) {
    redirect("/admin/hari-libur?pesan=Tanggal+tidak+valid");
  }
  if (keterangan.length < 3 || keterangan.length > 100) {
    redirect("/admin/hari-libur?pesan=Keterangan+wajib+diisi+(3+sampai+100+karakter)");
  }

  // Kosong = berlaku untuk semua DU/DI
  let tempatId: string | null = null;
  if (tempatPklId) {
    const ada = await prisma.tempatPkl.findUnique({ where: { id: tempatPklId }, select: { id: true } });
    if (!ada) redirect("/admin/hari-libur?pesan=DU/DI+tidak+ditemukan");
    tempatId = tempatPklId;
  }

  const tanggal = new Date(`${tanggalTeks}T00:00:00.000Z`);
  const sudahAda = await prisma.hariLibur.findFirst({ where: { tanggal, tempatPklId: tempatId } });
  if (sudahAda) {
    redirect("/admin/hari-libur?pesan=Hari+libur+di+tanggal+itu+sudah+ada+untuk+pilihan+yang+sama");
  }

  await prisma.hariLibur.create({ data: { tanggal, keterangan, tempatPklId: tempatId } });
  redirect("/admin/hari-libur?pesan=Hari+libur+berhasil+ditambahkan");
}

async function hapusLibur(formData: FormData) {
  "use server";
  await wajibPeran("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (id) await prisma.hariLibur.deleteMany({ where: { id } });
  redirect("/admin/hari-libur?pesan=Hari+libur+berhasil+dihapus");
}

const tgl = (d: Date) =>
  d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

type Param = { pesan?: string; q?: string; tempat?: string; hal?: string };

export default async function HariLiburPage({
  searchParams,
}: {
  searchParams: Promise<Param>;
}) {
  await wajibPeran("ADMIN");
  const sp = await searchParams;

  const pesan = sp.pesan;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const tempatFilter = (sp.tempat ?? "").trim();

  const where = {
    ...(q ? { keterangan: { contains: q, mode: "insensitive" as const } } : {}),
    ...(tempatFilter === "umum"
      ? { tempatPklId: null }
      : tempatFilter
        ? { tempatPklId: tempatFilter }
        : {}),
  };

  const [total, semua, tempat] = await Promise.all([
    prisma.hariLibur.count({ where }),
    prisma.hariLibur.count(),
    prisma.tempatPkl.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const hal = Math.min(Math.max(parseInt(sp.hal ?? "1", 10) || 1, 1), totalHalaman);

  const daftar = await prisma.hariLibur.findMany({
    where,
    include: { tempatPkl: true },
    orderBy: { tanggal: "desc" },
    skip: (hal - 1) * UKURAN_HALAMAN,
    take: UKURAN_HALAMAN,
  });

  function tautan(h: number) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (tempatFilter) p.set("tempat", tempatFilter);
    if (h > 1) p.set("hal", String(h));
    const s = p.toString();
    return s ? `/admin/hari-libur?${s}` : "/admin/hari-libur";
  }

  const adaFilter = Boolean(q || tempatFilter);
  const pesanBerhasil = pesan?.toLowerCase().includes("berhasil");
  const kotak =
    "w-full rounded-lg border bg-surface p-2.5 focus:outline-none focus:ring-2 focus:ring-hijau-aksen";
  const tombolHal = "rounded-lg border px-3 py-1.5 text-sm font-semibold hover:border-hijau-aksen";
  const tombolHalMati = "rounded-lg border px-3 py-1.5 text-sm font-semibold opacity-40";

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <Link href="/admin" className="text-sm font-semibold text-biru hover:underline">
        ← Dashboard admin
      </Link>
      <h1 className="text-xl font-bold">Hari Libur</h1>
      <p className="text-sm text-muted">
        Pada hari libur, siswa tidak perlu absen dan tidak dihitung alpa. Akhir pekan diatur lewat hari kerja di
        halaman DU/DI.
      </p>

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
        <summary className="cursor-pointer font-bold">Tambah hari libur</summary>
        <form action={tambahLibur} className="mt-3 space-y-3">
          <label className="block text-sm font-semibold">
            Tanggal
            <input name="tanggal" type="date" required className={`${kotak} mt-1 font-normal`} />
          </label>
          <label className="block text-sm font-semibold">
            Keterangan
            <input
              name="keterangan"
              placeholder="Contoh: Hari Kemerdekaan RI"
              required
              maxLength={100}
              className={`${kotak} mt-1 font-normal`}
            />
          </label>
          <label className="block text-sm font-semibold">
            Berlaku untuk
            <select name="tempatPklId" defaultValue="" className={`${kotak} mt-1 font-normal`}>
              <option value="">Semua DU/DI</option>
              {tempat.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-hijau-tombol px-5 py-2.5 font-bold text-white hover:bg-hijau-aksen"
          >
            Simpan
          </button>
        </form>
      </details>

      <section className="space-y-3">
        <form method="get" className="space-y-3 rounded-2xl border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Cari keterangan
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Nama hari libur"
                className={`${kotak} mt-1 font-normal`}
              />
            </label>
            <label className="text-sm font-semibold">
              Berlaku untuk
              <select name="tempat" defaultValue={tempatFilter} className={`${kotak} mt-1 font-normal`}>
                <option value="">Semua</option>
                <option value="umum">Libur untuk semua DU/DI</option>
                {tempat.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama}
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
              <Link href="/admin/hari-libur" className="text-sm font-semibold text-biru hover:underline">
                Hapus filter
              </Link>
            )}
            <span className="text-xs text-muted">
              {total} hari libur cocok dari {semua}
            </span>
          </div>
        </form>

        {daftar.length === 0 ? (
          <p className="rounded-2xl border bg-surface p-4 text-sm text-muted">
            {semua === 0 ? "Belum ada hari libur yang dicatat." : "Tidak ada hari libur yang cocok."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs text-muted">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Tanggal</th>
                  <th className="px-3 py-2.5 font-semibold">Keterangan</th>
                  <th className="px-3 py-2.5 font-semibold">Berlaku untuk</th>
                  <th className="px-3 py-2.5 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {daftar.map((l) => (
                  <tr key={l.id} className="border-t first:border-t-0">
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold">{tgl(l.tanggal)}</td>
                    <td className="px-3 py-2.5">{l.keterangan}</td>
                    <td className="px-3 py-2.5">{l.tempatPkl ? l.tempatPkl.nama : "Semua DU/DI"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <details className="inline-block text-left">
                        <summary className="cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-semibold hover:border-red-500">
                          Hapus
                        </summary>
                        <form action={hapusLibur} className="mt-2 space-y-2 rounded-xl border p-2">
                          <input type="hidden" name="id" value={l.id} />
                          <p className="text-xs">Yakin hapus hari libur ini?</p>
                          <button
                            type="submit"
                            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white"
                          >
                            Ya, hapus
                          </button>
                        </form>
                      </details>
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