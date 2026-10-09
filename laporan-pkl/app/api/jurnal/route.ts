import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, BUCKET_ABSEN } from "@/lib/supabase";
import { hariIniWIB } from "@/lib/tanggal";
import { BATAS_HARI_TERLAMBAT, MAKS_FOTO_JURNAL } from "@/lib/status";

const tolak = (pesan: string, status = 400) =>
  NextResponse.json({ ok: false, pesan }, { status });

// "excel,  Laravel , excel" -> ["excel", "Laravel"]
function bacaTag(teks: string): string[] {
  const hasil: string[] = [];
  for (const t of teks.split(",")) {
    const bersih = t.trim().replace(/\s+/g, " ");
    if (bersih && !hasil.some((x) => x.toLowerCase() === bersih.toLowerCase())) hasil.push(bersih);
  }
  return hasil;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.peran !== "SISWA") return tolak("Tidak diizinkan", 403);

  const form = await req.formData();
  const teksTanggal = String(form.get("tanggal") ?? "");
  const aksi = String(form.get("aksi") ?? ""); // "simpan" atau "kirim"
  const kegiatan = String(form.get("kegiatan") ?? "").trim();
  const kendala = String(form.get("kendala") ?? "").trim();
  const pelajaran = String(form.get("pelajaran") ?? "").trim();
  const tag = bacaTag(String(form.get("keahlian") ?? ""));
  const foto = form.getAll("foto").filter((f): f is File => f instanceof File && f.size > 0);

  // --- Validasi isian ---
  if (!/^\d{4}-\d{2}-\d{2}$/.test(teksTanggal)) return tolak("Tanggal tidak valid");
  if (aksi !== "simpan" && aksi !== "kirim") return tolak("Aksi tidak valid");
  if (kegiatan.length < 20) return tolak("Kegiatan minimal 20 karakter. Ceritakan lebih rinci.");
  if (kegiatan.length > 3000 || kendala.length > 2000 || pelajaran.length > 2000)
    return tolak("Isian terlalu panjang.");
  if (tag.length > 5) return tolak("Maksimal 5 tag keahlian.");
  if (tag.some((t) => t.length > 30)) return tolak("Satu tag maksimal 30 karakter.");
  if (foto.some((f) => f.type !== "image/jpeg" || f.size > 1_500_000))
    return tolak("Ada foto yang tidak valid atau terlalu besar.");

  const tanggal = new Date(teksTanggal);
  if (Number.isNaN(tanggal.getTime())) return tolak("Tanggal tidak valid");

  // --- Penempatan dan batas tanggal ---
  const penempatan = await prisma.penempatan.findFirst({ where: { siswaId: session.user.id } });
  if (!penempatan) return tolak("Kamu belum punya penempatan PKL.");

  const hariIni = hariIniWIB().tanggal;
  const selisihHari = Math.round((hariIni.getTime() - tanggal.getTime()) / 86_400_000);
  if (selisihHari < 0) return tolak("Jurnal tidak bisa diisi untuk tanggal yang belum tiba.");
  if (selisihHari > BATAS_HARI_TERLAMBAT)
    return tolak(`Jurnal hanya bisa diisi sampai ${BATAS_HARI_TERLAMBAT} hari ke belakang.`);
  if (tanggal < penempatan.tanggalMulai || tanggal > penempatan.tanggalSelesai)
    return tolak("Tanggal di luar periode PKL.");

  // --- Harus ada absen HADIR di tanggal itu ---
  const absen = await prisma.absensi.findUnique({
    where: { penempatanId_tanggal: { penempatanId: penempatan.id, tanggal } },
  });
  if (!absen || absen.jenis !== "HADIR" || !absen.jamMasuk)
    return tolak("Absen masuk dulu di tanggal ini sebelum mengisi jurnal.");

  // --- Jurnal lama (kalau ada) harus masih boleh diedit ---
  const lama = await prisma.jurnal.findUnique({
    where: { penempatanId_tanggal: { penempatanId: penempatan.id, tanggal } },
    include: { lampiran: true },
  });
  if (lama && lama.status !== "DRAF" && lama.status !== "DITOLAK")
    return tolak("Jurnal ini sudah dikirim dan terkunci.");

  const sisaFoto = MAKS_FOTO_JURNAL - (lama?.lampiran.length ?? 0);
  if (foto.length > sisaFoto) return tolak(`Maksimal ${MAKS_FOTO_JURNAL} foto per jurnal.`);

  // --- Siapkan tag keahlian (cocokkan tanpa beda huruf besar/kecil) ---
  const idKeahlian: string[] = [];
  for (const nama of tag) {
    let k = await prisma.keahlian.findFirst({ where: { nama: { equals: nama, mode: "insensitive" } } });
    if (!k) {
      try {
        k = await prisma.keahlian.create({ data: { nama } });
      } catch {
        k = await prisma.keahlian.findFirst({ where: { nama: { equals: nama, mode: "insensitive" } } });
      }
    }
    if (k) idKeahlian.push(k.id);
  }

  // --- Unggah foto lampiran ---
  const jalur: string[] = [];
  for (const f of foto) {
    const path = `${penempatan.id}/jurnal/${teksTanggal}-${crypto.randomUUID()}.jpg`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_ABSEN)
      .upload(path, Buffer.from(await f.arrayBuffer()), { contentType: "image/jpeg", upsert: false });
    if (error) {
      if (jalur.length) await supabaseAdmin.storage.from(BUCKET_ABSEN).remove(jalur);
      return tolak("Gagal menyimpan foto. Coba lagi.", 500);
    }
    jalur.push(path);
  }

  // --- Simpan ke database (semua berhasil atau semua batal) ---
  const kirim = aksi === "kirim";
  try {
    await prisma.$transaction(async (tx) => {
      const data = {
        kegiatan,
        kendala: kendala || null,
        pelajaran: pelajaran || null,
        status: kirim ? ("MENUNGGU_SUPERVISOR" as const) : ("DRAF" as const),
        // kirim ulang = mulai lagi dari supervisor, persetujuan lama dihapus
        ...(kirim && {
          catatanRevisi: null,
          disetujuiSupervisorOlehId: null,
          disetujuiSupervisorPada: null,
          disetujuiGuruOlehId: null,
          disetujuiGuruPada: null,
        }),
      };

      const jurnal = lama
        ? await tx.jurnal.update({ where: { id: lama.id }, data })
        : await tx.jurnal.create({ data: { ...data, penempatanId: penempatan.id, tanggal } });

      await tx.jurnalKeahlian.deleteMany({ where: { jurnalId: jurnal.id } });
      if (idKeahlian.length)
        await tx.jurnalKeahlian.createMany({
          data: idKeahlian.map((keahlianId) => ({ jurnalId: jurnal.id, keahlianId })),
        });
      if (jalur.length)
        await tx.lampiranJurnal.createMany({
          data: jalur.map((fileFoto) => ({ jurnalId: jurnal.id, fileFoto })),
        });
    });
  } catch {
    if (jalur.length) await supabaseAdmin.storage.from(BUCKET_ABSEN).remove(jalur);
    return tolak("Gagal menyimpan jurnal. Coba lagi.", 500);
  }

  return NextResponse.json({
    ok: true,
    pesan: kirim ? "Jurnal terkirim ke Pembimbing DU/DI." : "Draf tersimpan.",
  });
}