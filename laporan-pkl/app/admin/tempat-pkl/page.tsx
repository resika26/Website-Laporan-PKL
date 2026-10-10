import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { wajibPeran } from "@/lib/akses";

const UKURAN_HALAMAN = 15;

async function buatTempat(formData: FormData) {
  "use server";
  await wajibPeran("ADMIN");

  const nama = String(formData.get("nama") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim();
  const koordinat = String(formData.get("koordinat") ?? "");
  const radius = Number(formData.get("radius") ?? 200);

  // "-6.9667, 110.4167" -> dua angka
  const [lat, lng] = koordinat.split(",").map((x) => Number(x.trim()));

  const valid =
    nama && alamat &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
    Number.isInteger(radius) && radius >= 20 && radius <= 5000;

  if (!valid) {
    redirect("/admin/tempat-pkl?pesan=Data+tidak+valid.+Cek+koordinat+(format:+lat,+lng)+dan+radius");
  }

  await prisma.tempatPkl.create({
    data: { nama, alamat, latitude: lat, longitude: lng, radiusMeter: radius },
  });
  redirect("/admin/tempat-pkl?pesan=Tempat+PKL+berhasil+ditambahkan");
}

type Param = { pesan?: string; q?: string; hal?: string };

export default async function TempatPklPage({
  searchParams,
}: {
  searchParams: Promise<Param>;
}) {
  await wajibPeran("ADMIN");
  const sp = await searchParams;

  const pesan = sp.pesan;
  const q = (sp.q ?? "").trim().slice(0, 100);

  const where = q
    ? {
        OR: [
          { nama: { contains: q, mode: "insensitive" as const } },
          { alamat: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, semua] = await Promise.all([
    prisma.tempatPkl.count({ where }),
    prisma.tempatPkl.count(),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const hal = Math.min(Math.max(parseInt(sp.hal ?? "1", 10) || 1, 1), totalHalaman);

  const daftar = await prisma.tempatPkl.findMany({
    where,
    orderBy: { nama: "asc" },
    include: { _count: { select: { penempatan: true } } },
    skip: (hal - 1) * UKURAN_HALAMAN,
    take: UKURAN_HALAMAN,
  });

  function tautan(h: number) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (h > 1) p.set("hal", String(h));
    const s = p.toString();
    return s ? `/admin/tempat-pkl?${s}` : "/admin/tempat-pkl";
  }

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
      <h1 className="text-xl font-bold">DU/DI</h1>

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
        <summary className="cursor-pointer font-bold">Tambah DU/DI</summary>
        <form action={buatTempat} className="mt-3 space-y-3">
          <input name="nama" placeholder="Nama perusahaan/instansi" required className={kotak} />
          <input name="alamat" placeholder="Alamat" required className={kotak} />
          <input
            name="koordinat"
            placeholder="Koordinat dari Google Maps, contoh: -6.9667, 110.4167"
            required
            className={kotak}
          />
          <input name="radius" type="number" defaultValue={200} min={20} max={5000} required className={kotak} />
          <p className="text-xs text-muted">
            Radius (meter) = jarak maksimal dari titik ini agar absen dianggap sah.
          </p>
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
          <label className="block text-sm font-semibold">
            Cari DU/DI
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Nama atau alamat"
              className={`${kotak} mt-1 font-normal`}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-hijau-tombol px-5 py-2 text-sm font-bold text-white hover:bg-hijau-aksen"
            >
              Cari
            </button>
            {q && (
              <Link href="/admin/tempat-pkl" className="text-sm font-semibold text-biru hover:underline">
                Hapus pencarian
              </Link>
            )}
            <span className="text-xs text-muted">
              {total} DU/DI cocok dari {semua}
            </span>
          </div>
        </form>

        {daftar.length === 0 ? (
          <p className="rounded-2xl border bg-surface p-4 text-sm text-muted">
            Tidak ada DU/DI yang cocok dengan pencarian.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs text-muted">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Nama</th>
                  <th className="px-3 py-2.5 font-semibold">Alamat</th>
                  <th className="px-3 py-2.5 font-semibold">Koordinat</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Radius</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Siswa</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((t) => (
                  <tr key={t.id} className="border-t first:border-t-0">
                    <td className="px-3 py-2.5 font-semibold">{t.nama}</td>
                    <td className="px-3 py-2.5">{t.alamat}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {t.latitude}, {t.longitude}
                      <div>
                        <a
                          href={`https://www.google.com/maps?q=${t.latitude},${t.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-biru hover:underline"
                        >
                          Lihat peta
                        </a>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center">{t.radiusMeter} m</td>
                    <td className="px-3 py-2.5 text-center font-semibold">{t._count.penempatan}</td>
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