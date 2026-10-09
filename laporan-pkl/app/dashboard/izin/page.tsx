import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hariIniWIB } from "@/lib/tanggal";
import Link from "next/link";
import IzinForm from "./IzinForm";

export default async function HalamanIzinSakit() {
  const session = await auth();
  if (!session || session.user.peran !== "SISWA") redirect("/login");

  const penempatan = await prisma.penempatan.findFirst({
    where: { siswaId: session.user.id },
  });

  if (!penempatan) {
    return (
      <main className="p-6 max-w-md mx-auto space-y-4">
        <Link href="/dashboard" className="text-sm text-biru hover:underline">
          ← Dashboard
        </Link>
        <p className="text-red-600 text-sm border border-red-200 bg-red-50 rounded-xl p-3">
          Kamu belum punya penempatan PKL. Hubungi admin.
        </p>
      </main>
    );
  }

  const { tanggal } = hariIniWIB();

  // Baca catatan absen hari ini (null = belum ada)
  const hariIni = await prisma.absensi.findUnique({
    where: { penempatanId_tanggal: { penempatanId: penempatan.id, tanggal } },
    select: { jenis: true, alasan: true, status: true, catatan: true },
  });

  const jenisBerikutnya =
    hariIni?.jenis === "HADIR" && !hariIni
      ? null
      : hariIni?.jenis === "HADIR"
      ? "pulang"
      : null;

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <Link href="/dashboard" className="text-sm text-biru hover:underline">
          ← Dashboard
        </Link>
        <span className="text-sm font-semibold text-gray-700">Izin &amp; Sakit</span>
      </div>

      <h1 className="text-xl font-bold">Catat Izin / Sakit</h1>

      {/* Status hari ini */}
      {hariIni && !jenisBerikutnya && (
        <div className="border rounded-xl p-3 bg-gray-50 text-sm">
          <p className="font-semibold text-gray-700">
            {hariIni.jenis === "HADIR"
              ? "Absen hari ini sudah lengkap."
              : `Hari ini tercatat: ${hariIni.jenis}.`}
          </p>
          {hariIni.alasan && (
            <p className="text-gray-500 mt-1">Alasan: {hariIni.alasan}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Status:{" "}
            <span className="font-semibold">
              {hariIni.status.replace(/_/g, " ")}
            </span>
          </p>
          {hariIni.catatan && (
            <p className="text-red-700 text-xs mt-1">
              Catatan Pembimbing DU/DI/Pembimbing sekolah: {hariIni.catatan}
            </p>
          )}
        </div>
      )}

      {/* Form hanya muncul kalau hari ini belum ada catatan sama sekali */}
      {!hariIni && <IzinForm />}
    </main>
  );
}
