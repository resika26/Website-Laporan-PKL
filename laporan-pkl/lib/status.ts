export const LABEL_STATUS: Record<string, { teks: string; kelas: string }> = {
  DRAF: { teks: "Draf", kelas: "bg-gray-100 text-gray-700" },
  MENUNGGU_SUPERVISOR: { teks: "Menunggu supervisor", kelas: "bg-yellow-100 text-yellow-800" },
  MENUNGGU_GURU: { teks: "Menunggu guru", kelas: "bg-yellow-100 text-yellow-800" },
  DITOLAK: { teks: "Perlu revisi", kelas: "bg-red-100 text-red-700" },
  DISETUJUI: { teks: "Disetujui", kelas: "bg-green-100 text-green-700" },
};

export const BATAS_HARI_TERLAMBAT = 3; // jurnal boleh diisi sampai 3 hari ke belakang
export const MAKS_FOTO_JURNAL = 5;

// Date (tengah malam UTC) -> "2026-10-08"
export const kunciTgl = (d: Date) => d.toISOString().slice(0, 10);