import { prisma } from "@/lib/prisma";
import { hariIniWIB } from "@/lib/tanggal";

type Penempatan = {
  tempatPklId: string;
  tanggalMulai: Date;
  tanggalSelesai: Date;
};

// Mengembalikan tanggal hari ini, dan pesan penolakan (null jika hari ini valid)
export async function cekHariIni(p: Penempatan) {
  const { tanggal, teks } = hariIniWIB();

  if (tanggal < p.tanggalMulai || tanggal > p.tanggalSelesai)
    return { tanggal, teks, tolak: "Hari ini di luar periode PKL kamu." };

  const hari = tanggal.getUTCDay();
  if (hari === 0 || hari === 6) return { tanggal, teks, tolak: "Hari ini akhir pekan." };

  const libur = await prisma.hariLibur.findFirst({
    where: { tanggal, OR: [{ tempatPklId: null }, { tempatPklId: p.tempatPklId }] },
  });
  if (libur) return { tanggal, teks, tolak: `Hari ini libur: ${libur.keterangan}` };

  return { tanggal, teks, tolak: null };
}
