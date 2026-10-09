// Mengembalikan tanggal hari ini (WIB) sebagai tengah malam UTC,
// cocok dengan kolom tanggal di database.
export function hariIniWIB(): { tanggal: Date; teks: string } {
  const teks = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); // 2026-09-30
  return { tanggal: new Date(teks), teks };
}