export type WarnaStatus = "hijau" | "kuning" | "merah" | "netral";

export function klasifikasi(status?: string, menungguPulang = false): WarnaStatus {
  if (status === "DITOLAK") return "merah";
  if (status === "DISETUJUI" && !menungguPulang) return "hijau";
  if (status?.startsWith("MENUNGGU_") || menungguPulang) return "kuning";
  return "netral";
}

export function Indikator({
  status,
  kosong,
  menungguPulang = false,
}: {
  status?: string;
  kosong?: string;
  menungguPulang?: boolean;
}) {
  const warna = klasifikasi(status, menungguPulang);
  const label = menungguPulang
    ? "Menunggu absen pulang"
    : status === "DISETUJUI"
      ? "Disetujui"
      : status === "DITOLAK"
        ? "Ditolak"
        : status === "MENUNGGU_SUPERVISOR"
          ? "Menunggu Pembimbing DU/DI"
          : status === "MENUNGGU_GURU"
            ? "Menunggu Pembimbing sekolah"
            : status === "DRAF"
              ? "Draf"
              : kosong ?? "Belum ada";
  const kelas = {
    hijau: "bg-green-100 text-green-800",
    kuning: "bg-amber-100 text-amber-800",
    merah: "bg-red-100 text-red-800",
    netral: "bg-gray-100 text-gray-700",
  }[warna];

  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${kelas}`}>{label}</span>;
}