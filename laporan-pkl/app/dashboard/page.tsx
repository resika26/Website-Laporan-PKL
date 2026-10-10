import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { adalahAkhirPekan, hariIniUtc, hitungProgress, kunciTanggal } from "@/lib/rekap";

const fmtTanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});
const fmtTanggalPendek = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const fmtTanggalDb = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const fmtJam = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

const LABEL_STATUS: Record<string, { teks: string; kelas: string }> = {
  MENUNGGU_SUPERVISOR: { teks: "Menunggu Pembimbing DU/DI", kelas: "bg-amber-100 text-amber-800" },
  MENUNGGU_GURU: { teks: "Menunggu Pembimbing sekolah", kelas: "bg-amber-100 text-amber-800" },
  DISETUJUI: { teks: "Disetujui", kelas: "bg-green-100 text-green-800" },
  DITOLAK: { teks: "Ditolak", kelas: "bg-red-100 text-red-700" },
  DRAF: { teks: "Draf", kelas: "bg-gray-100 text-gray-700" },
};

const LABEL_JENIS: Record<string, string> = {
  HADIR: "Hadir",
  IZIN: "Izin",
  SAKIT: "Sakit",
};

function Lencana({ status }: { status: string }) {
  const info = LABEL_STATUS[status] ?? { teks: status, kelas: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${info.kelas}`}>
      {info.teks}
    </span>
  );
}

function sapaanWaktu(): string {
  const jam =
    Number(
      new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(
        new Date()
      )
    ) % 24;
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 18) return "Selamat sore";
  return "Selamat malam";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user.peran === "ADMIN") redirect("/admin");
  if (session.user.peran === "SUPERVISOR") redirect("/supervisor");
  if (session.user.peran === "GURU") redirect("/guru");

  // Cari data siswa yang sedang login
  const user = session.user as { id?: string; email?: string | null };
  const pengguna = user.id
    ? await prisma.pengguna.findUnique({ where: { id: user.id } })
    : await prisma.pengguna.findUnique({ where: { email: user.email ?? "" } });
  if (!pengguna) redirect("/login");

  const namaDepan = pengguna.nama.split(" ")[0];
  const tanggalPanjang = fmtTanggalPanjang.format(new Date());

  const penempatan = await prisma.penempatan.findFirst({
    where: { siswaId: pengguna.id },
    include: {
      tempatPkl: true,
      guru: { select: { nama: true } },
      supervisor: { select: { nama: true } },
    },
  });

  // Siswa yang belum ditempatkan
  if (!penempatan) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <section>
          <p className="text-sm text-muted">{tanggalPanjang}</p>
          <h1 className="text-xl font-bold">
            {sapaanWaktu()}, {namaDepan}
          </h1>
        </section>
        <div className="rounded-2xl border bg-surface p-4">
          <p className="font-semibold">Kamu belum ditempatkan di DU/DI.</p>
          <p className="mt-1 text-sm text-muted">
            Hubungi admin atau Pembimbing sekolah untuk mengatur penempatan PKL.
          </p>
        </div>
      </main>
    );
  }

  const hariIni = hariIniUtc();
  const kunciHariIni = kunciTanggal(hariIni);

  const [libur, absensi, jurnal] = await Promise.all([
    prisma.hariLibur.findMany({
      where: {
        tanggal: { gte: penempatan.tanggalMulai, lte: penempatan.tanggalSelesai },
        OR: [{ tempatPklId: null }, { tempatPklId: penempatan.tempatPklId }],
      },
      select: { tanggal: true },
    }),
    prisma.absensi.findMany({
      where: { penempatanId: penempatan.id },
      orderBy: { tanggal: "desc" },
      select: { tanggal: true, jenis: true, status: true, jamMasuk: true, jamPulang: true },
    }),
    prisma.jurnal.findMany({
      where: { penempatanId: penempatan.id },
      orderBy: { tanggal: "desc" },
      select: { tanggal: true, status: true },
    }),
  ]);

  const liburSet = new Set(libur.map((l) => kunciTanggal(l.tanggal)));
  const jumlahHadir = absensi.filter((a) => a.jenis === "HADIR" && a.status !== "DITOLAK").length;
  const jurnalTerkirim = jurnal.filter((j) => j.status !== "DRAF").length;

  const progres = hitungProgress({
    mulai: penempatan.tanggalMulai,
    selesai: penempatan.tanggalSelesai,
    hariIni,
    libur: liburSet,
    jumlahHadir,
  });

  const dalamPeriode =
    hariIni.getTime() >= penempatan.tanggalMulai.getTime() &&
    hariIni.getTime() <= penempatan.tanggalSelesai.getTime();
  const belumMulai = hariIni.getTime() < penempatan.tanggalMulai.getTime();
  const hariLibur = adalahAkhirPekan(hariIni) || liburSet.has(kunciHariIni);

  const absenHariIni = absensi.find((a) => kunciTanggal(a.tanggal) === kunciHariIni);
  const jurnalHariIni = jurnal.find((j) => kunciTanggal(j.tanggal) === kunciHariIni);
  const jurnalPerluRevisi = jurnal.filter((j) => j.status === "DITOLAK").length;

  // Daftar tugas
  const tugas: { teks: string; href: string }[] = [];
  if (dalamPeriode && !hariLibur && !absenHariIni) {
    tugas.push({ teks: "Kamu belum absen masuk hari ini", href: "/dashboard/absen" });
  }
  if (absenHariIni && absenHariIni.jenis === "HADIR" && absenHariIni.jamMasuk && !absenHariIni.jamPulang) {
    tugas.push({ teks: "Jangan lupa absen pulang", href: "/dashboard/absen" });
  }
  if (absenHariIni && absenHariIni.jenis === "HADIR" && (!jurnalHariIni || jurnalHariIni.status === "DRAF")) {
    tugas.push({ teks: "Jurnal hari ini belum diisi", href: "/siswa/jurnal" });
  }
  if (jurnalPerluRevisi > 0) {
    tugas.push({ teks: `${jurnalPerluRevisi} jurnal perlu direvisi`, href: "/siswa/jurnal" });
  }

  const statusJurnalPerTanggal = new Map(jurnal.map((j) => [kunciTanggal(j.tanggal), j.status]));
  const tigaHariTerakhir = absensi.slice(0, 3);

  const tombolUtama =
    "mt-3 block w-full rounded-xl bg-hijau-tombol py-3.5 text-center text-base font-bold text-white hover:bg-hijau-aksen";

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      {/* 1. Sapaan dan tanggal */}
      <section>
        <p className="text-sm text-muted">{tanggalPanjang}</p>
        <h1 className="text-xl font-bold">
          {sapaanWaktu()}, {namaDepan}
        </h1>
        <p className="mt-1 text-sm text-muted">
          DU/DI: <span className="font-semibold text-foreground">{penempatan.tempatPkl.nama}</span>
          {" · "}Pembimbing DU/DI: {penempatan.supervisor.nama}
          {" · "}Pembimbing sekolah: {penempatan.guru.nama}
        </p>
      </section>

      {/* 2. Progres PKL */}
      <section className="rounded-2xl border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-bold">Progres PKL</h2>
          <span className="text-sm text-muted">
            {belumMulai
              ? `Mulai ${fmtTanggalDb.format(penempatan.tanggalMulai)}`
              : `Hari kerja ke-${progres.hariBerjalan} dari ${progres.totalHariKerja}`}
          </span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-foreground/15">
          <div
            className="h-full rounded-full bg-hijau-aksen"
            style={{ width: `${progres.persenProgress}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold text-hijau-aksen">{progres.sisaHari}</div>
            <div className="text-xs text-muted">Sisa hari kerja</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-biru">{progres.persenKehadiran}%</div>
            <div className="text-xs text-muted">Kehadiran</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-hijau-aksen">
              {jurnalTerkirim}
              <span className="text-base font-semibold text-muted">/{jumlahHadir}</span>
            </div>
            <div className="text-xs text-muted">Jurnal terkirim</div>
          </div>
        </div>
      </section>

      {/* 3. Kartu absen hari ini */}
      <section className="rounded-2xl border bg-surface p-4">
        <h2 className="font-bold">Absen hari ini</h2>

        {!dalamPeriode ? (
          <p className="mt-2 text-sm text-muted">
            {belumMulai ? "Masa PKL belum dimulai." : "Masa PKL sudah selesai."}
          </p>
        ) : hariLibur ? (
          <p className="mt-2 text-sm text-muted">Hari ini libur, tidak perlu absen.</p>
        ) : !absenHariIni ? (
          <>
            <p className="mt-2 text-sm text-muted">Kamu belum absen masuk.</p>
            <Link href="/dashboard/absen" className={tombolUtama}>
              Absen masuk sekarang
            </Link>
            <Link
              href="/dashboard/izin"
              className="mt-2 block text-center text-sm font-semibold text-biru hover:underline"
            >
              Tidak bisa hadir? Ajukan izin atau sakit
            </Link>
          </>
        ) : absenHariIni.jenis !== "HADIR" ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm">Hari ini: {LABEL_JENIS[absenHariIni.jenis] ?? absenHariIni.jenis}</span>
            <Lencana status={absenHariIni.status} />
          </div>
        ) : !absenHariIni.jamPulang ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm">
                Masuk pukul {absenHariIni.jamMasuk ? fmtJam.format(absenHariIni.jamMasuk) : "-"}
              </span>
              <Lencana status={absenHariIni.status} />
            </div>
            <Link href="/dashboard/absen" className={tombolUtama}>
              Absen pulang
            </Link>
          </>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm">
              Masuk {absenHariIni.jamMasuk ? fmtJam.format(absenHariIni.jamMasuk) : "-"} · Pulang{" "}
              {fmtJam.format(absenHariIni.jamPulang)}
            </span>
            <Lencana status={absenHariIni.status} />
          </div>
        )}
      </section>

      {/* 4. Daftar tugas */}
      {tugas.length > 0 && (
        <section className="rounded-2xl border bg-surface p-4">
          <h2 className="font-bold">Tugas kamu</h2>
          <ul className="mt-2 space-y-2">
            {tugas.map((t) => (
              <li key={t.teks}>
                <Link
                  href={t.href}
                  className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm hover:border-hijau-aksen"
                >
                  <span>{t.teks}</span>
                  <span className="font-semibold text-hijau-aksen">Buka</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 5. Tiga hari terakhir */}
      <section className="rounded-2xl border bg-surface p-4">
        <h2 className="font-bold">Tiga hari terakhir</h2>
        {tigaHariTerakhir.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Belum ada catatan absen.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {tigaHariTerakhir.map((a) => {
              const statusJurnal = statusJurnalPerTanggal.get(kunciTanggal(a.tanggal));
              return (
                <li key={kunciTanggal(a.tanggal)} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <div className="text-sm font-semibold">{fmtTanggalPendek.format(a.tanggal)}</div>
                    <div className="text-xs text-muted">
                      {LABEL_JENIS[a.jenis] ?? a.jenis}
                      {statusJurnal ? ` · Jurnal: ${LABEL_STATUS[statusJurnal]?.teks ?? statusJurnal}` : ""}
                    </div>
                  </div>
                  <Lencana status={a.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Menu cepat */}
      <section className="grid grid-cols-3 gap-2 text-center text-sm font-semibold">
        <Link href="/siswa/jurnal" className="rounded-xl border bg-surface p-3 text-hijau-aksen hover:border-hijau-aksen">
          Jurnal
        </Link>
        <Link href="/siswa/project" className="rounded-xl border bg-surface p-3 text-hijau-aksen hover:border-hijau-aksen">
          Project
        </Link>
        <Link href="/dashboard/izin" className="rounded-xl border bg-surface p-3 text-hijau-aksen hover:border-hijau-aksen">
          Izin &amp; Sakit
        </Link>
      </section>
    </main>
  );
}