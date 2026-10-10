// Hari kerja memakai angka seperti getUTCDay(): 0 = Minggu, 1 = Senin, ... 6 = Sabtu.
export const HARI_KERJA_AWAL = [1, 2, 3, 4, 5];
export const URUTAN_HARI = [1, 2, 3, 4, 5, 6, 0]; // urutan tampil: Senin dulu
export const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const SINGKAT_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Kalau kolom kosong atau belum ada, pakai Senin sampai Jumat. */
export function hariKerjaDariDb(daftar: number[] | null | undefined): number[] {
  return daftar && daftar.length > 0 ? daftar : HARI_KERJA_AWAL;
}

/** Contoh: [1,2,3,4,5] menjadi "Sen–Jum", [1,3,5] menjadi "Sen, Rab, Jum". */
export function ringkasHari(daftar: number[]): string {
  const idx = URUTAN_HARI.map((h, i) => (daftar.includes(h) ? i : -1)).filter((i) => i >= 0);
  if (idx.length === 0) return "-";
  const berurutan = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  const nama = idx.map((i) => SINGKAT_HARI[URUTAN_HARI[i]]);
  if (berurutan && idx.length >= 3) return `${nama[0]}–${nama[nama.length - 1]}`;
  return nama.join(", ");
}