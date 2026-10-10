import bcrypt from "bcryptjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { wajibPeran } from "@/lib/akses";

const PERAN = ["SISWA", "GURU", "SUPERVISOR", "ADMIN"] as const;
type PeranAkun = (typeof PERAN)[number];

const LABEL_PERAN: Record<PeranAkun, string> = {
  SISWA: "Siswa",
  GURU: "Pembimbing sekolah",
  SUPERVISOR: "Pembimbing DU/DI",
  ADMIN: "Admin",
};

const UKURAN_HALAMAN = 15;

async function buatAkun(formData: FormData) {
  "use server";
  await wajibPeran("ADMIN"); // server tetap memeriksa, jangan percaya form saja

  const nama = String(formData.get("nama") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const sandi = String(formData.get("sandi") ?? "");
  const peran = String(formData.get("peran") ?? "") as PeranAkun;

  if (!nama || !email || sandi.length < 8 || !PERAN.includes(peran)) {
    redirect("/admin/pengguna?pesan=Data+belum+lengkap+(sandi+minimal+8+karakter)");
  }

  const kataSandi = await bcrypt.hash(sandi, 10);

  try {
    if (peran === "SISWA") {
      const nis = String(formData.get("nis") ?? "").trim();
      const kelas = String(formData.get("kelas") ?? "").trim();
      const jurusan = String(formData.get("jurusan") ?? "").trim();
      const noHp = String(formData.get("noHp") ?? "").trim();

      if (!nis || !kelas || !jurusan) {
        redirect("/admin/pengguna?pesan=NIS,+kelas,+dan+Paket+Keahlian+wajib+diisi+untuk+siswa");
      }

      await prisma.pengguna.create({
        data: {
          nama, email, kataSandi, peran,
          profilSiswa: { create: { nis, kelas, jurusan, noHp: noHp || null } },
        },
      });
    } else {
      await prisma.pengguna.create({ data: { nama, email, kataSandi, peran } });
    }
  } catch (e) {
    // redirect() sendiri bekerja dengan melempar error khusus, jangan ditelan
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    redirect("/admin/pengguna?pesan=Gagal+membuat+akun.+Email+atau+NIS+mungkin+sudah+dipakai");
  }

  revalidatePath("/admin/pengguna");
  redirect("/admin/pengguna?pesan=Akun+berhasil+dibuat");
}

type Param = {
  pesan?: string;
  q?: string;
  peran?: string;
  kelas?: string;
  paket?: string;
  hal?: string;
};

export default async function KelolaPenggunaPage({
  searchParams,
}: {
  searchParams: Promise<Param>;
}) {
  await wajibPeran("ADMIN");
  const sp = await searchParams;

  const pesan = sp.pesan;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const peranFilter = PERAN.find((p) => p === sp.peran);
  const kelas = (sp.kelas ?? "").trim();
  const paket = (sp.paket ?? "").trim();

  const profilFilter = {
    ...(kelas ? { kelas } : {}),
    ...(paket ? { jurusan: paket } : {}),
  };

  const where = {
    ...(q
      ? {
          OR: [
            { nama: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { profilSiswa: { is: { nis: { contains: q } } } },
          ],
        }
      : {}),
    ...(peranFilter ? { peran: peranFilter } : {}),
    ...(kelas || paket ? { profilSiswa: { is: profilFilter } } : {}),
  };

  const total = await prisma.pengguna.count({ where });
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const hal = Math.min(Math.max(parseInt(sp.hal ?? "1", 10) || 1, 1), totalHalaman);

  const [daftar, kelasOpsi, paketOpsi, semuaAkun] = await Promise.all([
    prisma.pengguna.findMany({
      where,
      orderBy: { dibuatPada: "desc" },
      include: { profilSiswa: true },
      skip: (hal - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
    prisma.profilSiswa.findMany({
      select: { kelas: true },
      distinct: ["kelas"],
      orderBy: { kelas: "asc" },
    }),
    prisma.profilSiswa.findMany({
      select: { jurusan: true },
      distinct: ["jurusan"],
      orderBy: { jurusan: "asc" },
    }),
    prisma.pengguna.count(),
  ]);

  function tautan(h: number) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (peranFilter) p.set("peran", peranFilter);
    if (kelas) p.set("kelas", kelas);
    if (paket) p.set("paket", paket);
    if (h > 1) p.set("hal", String(h));
    const s = p.toString();
    return s ? `/admin/pengguna?${s}` : "/admin/pengguna";
  }

  const adaFilter = Boolean(q || peranFilter || kelas || paket);
  const pesanBerhasil = pesan?.toLowerCase().includes("berhasil");

  const kotak =
    "w-full rounded-lg border bg-surface p-2.5 focus:outline-none focus:ring-2 focus:ring-hijau-aksen";
  const tombolHal =
    "rounded-lg border px-3 py-1.5 text-sm font-semibold hover:border-hijau-aksen";
  const tombolHalMati = "rounded-lg border px-3 py-1.5 text-sm font-semibold opacity-40";

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <Link href="/admin" className="text-sm font-semibold text-biru hover:underline">
        ← Dashboard admin
      </Link>
      <h1 className="text-xl font-bold">Kelola Akun</h1>

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

      <details
        className="rounded-2xl border bg-surface p-4"
        open={Boolean(pesan && !pesanBerhasil)}
      >
        <summary className="cursor-pointer font-bold">Buat akun baru</summary>
        <form action={buatAkun} className="mt-3 space-y-3">
          <input name="nama" placeholder="Nama lengkap" required className={kotak} />
          <input name="email" type="email" placeholder="Email" required className={kotak} />
          <input
            name="sandi"
            type="password"
            placeholder="Kata sandi awal (min. 8 karakter)"
            required
            className={kotak}
          />
          <select name="peran" className={kotak} defaultValue="SISWA">
            <option value="SISWA">Siswa</option>
            <option value="GURU">Pembimbing sekolah</option>
            <option value="SUPERVISOR">Pembimbing DU/DI</option>
            <option value="ADMIN">Admin</option>
          </select>

          <fieldset className="space-y-2 rounded-xl border p-3">
            <legend className="px-1 text-sm font-semibold">Khusus siswa (abaikan untuk peran lain)</legend>
            <input name="nis" placeholder="NIS" className={kotak} />
            <input name="kelas" placeholder="Kelas, misalnya XII RPL 1" className={kotak} />
            <input
              name="jurusan"
              placeholder="Paket Keahlian"
              defaultValue="Rekayasa Perangkat Lunak"
              className={kotak}
            />
            <input name="noHp" placeholder="No HP (opsional)" className={kotak} />
          </fieldset>

          <button
            type="submit"
            className="rounded-xl bg-hijau-tombol px-5 py-2.5 font-bold text-white hover:bg-hijau-aksen"
          >
            Buat akun
          </button>
        </form>
      </details>

      <section className="space-y-3">
        <form method="get" className="space-y-3 rounded-2xl border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold sm:col-span-2 lg:col-span-4">
              Cari akun
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Nama, email, atau NIS"
                className={`${kotak} mt-1 font-normal`}
              />
            </label>

            <label className="text-sm font-semibold">
              Peran
              <select name="peran" defaultValue={peranFilter ?? ""} className={`${kotak} mt-1 font-normal`}>
                <option value="">Semua</option>
                {PERAN.map((p) => (
                  <option key={p} value={p}>
                    {LABEL_PERAN[p]}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold">
              Kelas
              <select name="kelas" defaultValue={kelas} className={`${kotak} mt-1 font-normal`}>
                <option value="">Semua</option>
                {kelasOpsi.map((k) => (
                  <option key={k.kelas} value={k.kelas}>
                    {k.kelas}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold sm:col-span-2">
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
              <Link href="/admin/pengguna" className="text-sm font-semibold text-biru hover:underline">
                Hapus filter
              </Link>
            )}
            <span className="text-xs text-muted">
              {total} akun cocok dari {semuaAkun} akun
            </span>
          </div>
        </form>

        {daftar.length === 0 ? (
          <p className="rounded-2xl border bg-surface p-4 text-sm text-muted">
            Tidak ada akun yang cocok dengan pencarian atau filter.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs text-muted">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Nama</th>
                  <th className="px-3 py-2.5 font-semibold">Email</th>
                  <th className="px-3 py-2.5 font-semibold">Peran</th>
                  <th className="px-3 py-2.5 font-semibold">NIS</th>
                  <th className="px-3 py-2.5 font-semibold">Kelas</th>
                  <th className="px-3 py-2.5 font-semibold">Paket Keahlian</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((p) => (
                  <tr key={p.id} className="border-t first:border-t-0">
                    <td className="px-3 py-2.5 font-semibold">
                      {p.nama}
                      {!p.aktif && (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{p.email}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{LABEL_PERAN[p.peran as PeranAkun]}</td>
                    <td className="px-3 py-2.5">{p.profilSiswa?.nis ?? "-"}</td>
                    <td className="px-3 py-2.5">{p.profilSiswa?.kelas ?? "-"}</td>
                    <td className="px-3 py-2.5">{p.profilSiswa?.jurusan ?? "-"}</td>
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