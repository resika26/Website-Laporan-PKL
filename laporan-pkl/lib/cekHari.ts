import { prisma } from "@/lib/prisma";
import { hariIniWIB } from "@/lib/tanggal";
import { hariKerjaDariDb } from "@/lib/hariKerja";

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

  // Hari kerja ditentukan oleh DU/DI tempat siswa PKL
  const tempat = await prisma.tempatPkl.findUnique({
    where: { id: p.tempatPklId },
    select: { hariKerja: true },
  });
  const hariKerja = hariKerjaDariDb(tempat?.hariKerja);
  if (!hariKerja.includes(tanggal.getUTCDay()))
    return { tanggal, teks, tolak: "Hari ini bukan hari kerja di DU/DI kamu." };

  const libur = await prisma.hariLibur.findFirst({
    where: { tanggal, OR: [{ tempatPklId: null }, { tempatPklId: p.tempatPklId }] },
  });
  if (libur) return { tanggal, teks, tolak: `Hari ini libur: ${libur.keterangan}` };

  return { tanggal, teks, tolak: null };
}