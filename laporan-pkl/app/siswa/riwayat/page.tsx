import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hariIniUtc, kunciTanggal } from "@/lib/rekap";
import { hariKerjaDariDb } from "@/lib/hariKerja";

const fmtBulan = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const NAMA_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function kunciBulan(tahun: number, bulan: number): string {
  return new Date(Date.UTC(tahun, bulan, 1)).toISOString().slice(0, 7);
}

export default async function RiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.peran !== "SISWA") redirect("/dashboard");

  const user = session.user as { id?: string; email?: string | null };
  const pengguna = user.id
    ? await prisma.pengguna.findUnique({ where: { id: user.id } })
    : await prisma.pengguna.findUnique({ where: { email: user.email ?? "" } });
  if (!pengguna) redirect("/login");

  const penempatan = await prisma.penempatan.findFirst({
       where: { siswaId: pengguna.id },
       include: { tempatPkl: true },
     });

  if (!penempatan) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <h1 className="text-xl font-bold">Riwayat Absen</h1>
        <div className="rounded-2xl border bg-surface p-4 text-sm text-muted">
          Kamu belum ditempatkan di DU/DI, jadi belum ada riwayat.
        </div>
      </main>
    );
  }

  const { bulan: bulanParam } = await searchParams;
  const hariIni = hariIniUtc();

  // Bulan yang ditampilkan: dari alamat, kalau tidak ada pakai bulan ini
  let tahun = hariIni.getUTCFullYear();
  let bln = hariIni.getUTCMonth();
  const cocok = /^(\d{4})-(\d{2})$/.exec(bulanParam ?? "");
  if (cocok) {
    const b = Number(cocok[2]) - 1;
    if (b >= 0 && b <= 11) {
      tahun = Number(cocok[1]);
      bln = b;
    }
  }

  // Batasi hanya pada bulan-bulan masa PKL
  const awalPeriode = Date.UTC(
    penempatan.tanggalMulai.getUTCFullYear(),
    penempatan.tanggalMulai.getUTCMonth(),
    1
  );
  const akhirPeriode = Date.UTC(
    penempatan.tanggalSelesai.getUTCFullYear(),
    penempatan.tanggalSelesai.getUTCMonth(),
    1
  );
  let sekarang = Date.UTC(tahun, bln, 1);
  if (sekarang < awalPeriode) sekarang = awalPeriode;
  if (sekarang > akhirPeriode) sekarang = akhirPeriode;
  const tgl = new Date(sekarang);
  tahun = tgl.getUTCFullYear();
  bln = tgl.getUTCMonth();

  const bisaMundur = sekarang > awalPeriode;
  const bisaMaju = sekarang < akhirPeriode;

  const awalBulan = new Date(Date.UTC(tahun, bln, 1));
  const akhirBulan = new Date(Date.UTC(tahun, bln + 1, 0));
  const jumlahHari = akhirBulan.getUTCDate();
  const geser = (awalBulan.getUTCDay() + 6) % 7; // Senin = 0

  const [absensi, libur] = await Promise.all([
    prisma.absensi.findMany({
      where: {
        penempatanId: penempatan.id,
        tanggal: { gte: awalBulan, lte: akhirBulan },
      },
      select: { tanggal: true, jenis: true, status: true },
    }),
    prisma.hariLibur.findMany({
      where: {
        tanggal: { gte: awalBulan, lte: akhirBulan },
        OR: [{ tempatPklId: null }, { tempatPklId: penempatan.tempatPklId }],
      },
      select: { tanggal: true },
    }),
  ]);

  const rekam = new Map(absensi.map((a) => [kunciTanggal(a.tanggal), a]));
  const liburSet = new Set(libur.map((l) => kunciTanggal(l.tanggal)));
       const kunciHariIni = kunciTanggal(hariIni);
     const hariKerja = hariKerjaDariDb(penempatan.tempatPkl.hariKerja);

  let jumlahHadir = 0;
  let jumlahIzin = 0;
  let jumlahSakit = 0;
  let jumlahAlpa = 0;
  let jumlahDitolak = 0;

  type Sel = { n: number; kelas: string; huruf: string; menunggu: boolean; hariIni: boolean };
  const sel: (Sel | null)[] = Array.from({ length: geser }, () => null);

  for (let n = 1; n <= jumlahHari; n++) {
    const d = new Date(Date.UTC(tahun, bln, n));
    const kunci = kunciTanggal(d);
    const dalamPeriode =
      d.getTime() >= penempatan.tanggalMulai.getTime() &&
      d.getTime() <= penempatan.tanggalSelesai.getTime();
    const a = rekam.get(kunci);
    const hariLibur = !hariKerja.includes(d.getUTCDay()) || liburSet.has(kunci);

    let kelas = "border bg-surface";
    let huruf = "";
    let menunggu = false;

    if (!dalamPeriode) {
      kelas = "text-muted opacity-40";
    } else if (a) {
      menunggu = a.status === "MENUNGGU_SUPERVISOR" || a.status === "MENUNGGU_GURU";
      if (a.status === "DITOLAK") {
        kelas = "bg-red-100 text-red-700";
        huruf = "X";
        jumlahDitolak++;
      } else if (a.jenis === "HADIR") {
        kelas = "bg-green-100 text-green-800";
        huruf = "H";
        jumlahHadir++;
      } else if (a.jenis === "IZIN") {
        kelas = "bg-amber-100 text-amber-800";
        huruf = "I";
        jumlahIzin++;
      } else {
        kelas = "bg-amber-100 text-amber-800";
        huruf = "S";
        jumlahSakit++;
      }
    } else if (hariLibur) {
      kelas = "bg-gray-100 text-gray-700";
    } else if (d.getTime() < hariIni.getTime()) {
      kelas = "bg-red-100 text-red-700";
      huruf = "A";
      jumlahAlpa++;
    }

    sel.push({ n, kelas, huruf, menunggu, hariIni: kunci === kunciHariIni });
  }

  const tautanMundur = `/siswa/riwayat?bulan=${kunciBulan(tahun, bln - 1)}`;
  const tautanMaju = `/siswa/riwayat?bulan=${kunciBulan(tahun, bln + 1)}`;
  const tombolBulan =
    "rounded-lg border px-3 py-1.5 text-sm font-semibold hover:border-hijau-aksen";
  const tombolMati = "rounded-lg border px-3 py-1.5 text-sm font-semibold opacity-40";

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-bold">Riwayat Absen</h1>

      <section className="rounded-2xl border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          {bisaMundur ? (
            <Link href={tautanMundur} className={tombolBulan}>
              ‹ Sebelumnya
            </Link>
          ) : (
            <span className={tombolMati}>‹ Sebelumnya</span>
          )}
          <h2 className="text-center font-bold capitalize">{fmtBulan.format(awalBulan)}</h2>
          {bisaMaju ? (
            <Link href={tautanMaju} className={tombolBulan}>
              Berikutnya ›
            </Link>
          ) : (
            <span className={tombolMati}>Berikutnya ›</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted">
          {NAMA_HARI.map((h) => (
            <div key={h}>{h}</div>
          ))}
        </div>

        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {sel.map((s, i) =>
            s === null ? (
              <div key={`kosong-${i}`} />
            ) : (
              <div
                key={s.n}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm ${s.kelas} ${
                  s.hariIni ? "ring-2 ring-hijau-aksen" : ""
                }`}
              >
                <span className="font-semibold">{s.n}</span>
                {s.huruf && <span className="text-[10px] font-bold leading-none">{s.huruf}</span>}
                {s.menunggu && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                )}
              </div>
            )
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-green-100 ring-1 ring-green-800/30" /> H = Hadir
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-800/30" /> I = Izin, S = Sakit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-red-100 ring-1 ring-red-700/30" /> A = Alpa, X = Ditolak
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-gray-100 ring-1 ring-gray-700/30" /> Libur
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Menunggu persetujuan
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
        <div className="rounded-xl border bg-surface p-3">
          <div className="text-xl font-bold text-hijau-aksen">{jumlahHadir}</div>
          <div className="text-xs text-muted">Hadir</div>
        </div>
        <div className="rounded-xl border bg-surface p-3">
          <div className="text-xl font-bold">{jumlahIzin}</div>
          <div className="text-xs text-muted">Izin</div>
        </div>
        <div className="rounded-xl border bg-surface p-3">
          <div className="text-xl font-bold">{jumlahSakit}</div>
          <div className="text-xs text-muted">Sakit</div>
        </div>
        <div className="rounded-xl border bg-surface p-3">
          <div className="text-xl font-bold">{jumlahAlpa}</div>
          <div className="text-xs text-muted">Alpa</div>
        </div>
        <div className="col-span-2 rounded-xl border bg-surface p-3 sm:col-span-1">
          <div className="text-xl font-bold">{jumlahDitolak}</div>
          <div className="text-xs text-muted">Ditolak</div>
        </div>
      </section>
    </main>
  );
}