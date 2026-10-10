// Hitungan progres PKL untuk beranda siswa.
// Hari kerja sementara dianggap Senin sampai Jumat, dikurangi hari libur.

const MS_HARI = 24 * 60 * 60 * 1000;

/** Tanggal hari ini menurut WIB, dalam bentuk tengah malam UTC (cocok dengan kolom tanggal di database). */
export function hariIniUtc(): Date {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
}

/** Tanggal menjadi teks "2026-10-10", dipakai sebagai kunci pencocokan. */
export function kunciTanggal(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function adalahAkhirPekan(d: Date): boolean {
  const hari = d.getUTCDay();
  return hari === 0 || hari === 6;
}

/** Jumlah hari kerja dari tanggal mulai sampai selesai (keduanya ikut dihitung). */
export function hitungHariKerja(mulai: Date, selesai: Date, libur: Set<string>): number {
  let jumlah = 0;
  for (let t = mulai.getTime(); t <= selesai.getTime(); t += MS_HARI) {
    const d = new Date(t);
    if (!adalahAkhirPekan(d) && !libur.has(kunciTanggal(d))) jumlah++;
  }
  return jumlah;
}

export type RingkasanProgress = {
  totalHariKerja: number;
  hariBerjalan: number;
  sisaHari: number;
  persenProgress: number;
  persenKehadiran: number;
};

export function hitungProgress(args: {
  mulai: Date;
  selesai: Date;
  hariIni: Date;
  libur: Set<string>;
  jumlahHadir: number;
}): RingkasanProgress {
  const { mulai, selesai, hariIni, libur, jumlahHadir } = args;

  const totalHariKerja = hitungHariKerja(mulai, selesai, libur);

  let hariBerjalan = 0;
  if (hariIni.getTime() >= mulai.getTime()) {
    const batas = hariIni.getTime() < selesai.getTime() ? hariIni : selesai;
    hariBerjalan = hitungHariKerja(mulai, batas, libur);
  }

  const sisaHari = Math.max(totalHariKerja - hariBerjalan, 0);
  const persenProgress =
    totalHariKerja > 0 ? Math.min(100, Math.round((hariBerjalan / totalHariKerja) * 100)) : 0;
  const persenKehadiran =
    hariBerjalan > 0 ? Math.min(100, Math.round((jumlahHadir / hariBerjalan) * 100)) : 0;

  return { totalHariKerja, hariBerjalan, sisaHari, persenProgress, persenKehadiran };
}