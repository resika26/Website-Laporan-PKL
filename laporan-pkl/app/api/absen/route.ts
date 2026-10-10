import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, BUCKET_ABSEN } from "@/lib/supabase";
import { jarakMeter } from "@/lib/lokasi";
import { hariIniWIB } from "@/lib/tanggal";
import { hariKerjaDariDb } from "@/lib/hariKerja";

const tolak = (pesan: string, status = 400) =>
  NextResponse.json({ ok: false, pesan }, { status });

export async function POST(req: Request) {
  // 1. Harus login sebagai siswa
  const session = await auth();
  if (!session || session.user.peran !== "SISWA") return tolak("Tidak diizinkan", 403);

  // 2. Baca data kiriman
  const form = await req.formData();
  const jenis = String(form.get("jenis") ?? ""); // "masuk" atau "pulang"
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  const foto = form.get("foto");

  if (jenis !== "masuk" && jenis !== "pulang") return tolak("Jenis absen tidak valid");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return tolak("Lokasi tidak terbaca. Aktifkan GPS.");
  if (!(foto instanceof File) || foto.type !== "image/jpeg") return tolak("Foto tidak valid");
  if (foto.size > 1_500_000) return tolak("Ukuran foto terlalu besar");

  // 3. Cari penempatan siswa
  const penempatan = await prisma.penempatan.findFirst({
    where: { siswaId: session.user.id },
    include: { tempatPkl: true },
  });
  if (!penempatan) return tolak("Kamu belum punya penempatan PKL. Hubungi admin.");

  // 4. Cek hari
  const { tanggal, teks } = hariIniWIB();
  if (tanggal < penempatan.tanggalMulai || tanggal > penempatan.tanggalSelesai)
    return tolak("Hari ini di luar periode PKL kamu.");

     const hari = tanggal.getUTCDay(); // 0 = Minggu, 6 = Sabtu
     const hariKerja = hariKerjaDariDb(penempatan.tempatPkl.hariKerja);
     if (!hariKerja.includes(hari)) return tolak("Hari ini bukan hari kerja di DU/DI kamu.");

  const libur = await prisma.hariLibur.findFirst({
    where: {
      tanggal,
      OR: [{ tempatPklId: null }, { tempatPklId: penempatan.tempatPklId }],
    },
  });
  if (libur) return tolak(`Hari ini libur: ${libur.keterangan}`);

  // 5. Cek jarak
  const jarak = jarakMeter(lat, lng, penempatan.tempatPkl.latitude, penempatan.tempatPkl.longitude);
  if (jarak > penempatan.tempatPkl.radiusMeter)
    return tolak(
      `Kamu berada ${Math.round(jarak)} m dari lokasi PKL (batas ${penempatan.tempatPkl.radiusMeter} m).`
    );

  // 6. Cek urutan masuk/pulang
  const kunci = { penempatanId_tanggal: { penempatanId: penempatan.id, tanggal } };
  const ada = await prisma.absensi.findUnique({ where: kunci });

  if (jenis === "masuk" && ada) return tolak("Kamu sudah tercatat hari ini.");
  if (jenis === "pulang") {
    if (!ada || ada.jenis !== "HADIR" || !ada.jamMasuk) return tolak("Absen masuk dulu.");
    if (ada.jamPulang) return tolak("Kamu sudah absen pulang.");
    if (ada.status !== "MENUNGGU_SUPERVISOR")
      return tolak("Absen kamu sudah diperiksa dan tidak bisa diubah lagi.");
  }

  // 7. Simpan foto ke storage (privat)
  const path = `${penempatan.id}/${teks}-${jenis}.jpg`;
  const { error: errUpload } = await supabaseAdmin.storage
    .from(BUCKET_ABSEN)
    .upload(path, Buffer.from(await foto.arrayBuffer()), {
      contentType: "image/jpeg",
      upsert: false,
    });
  if (errUpload) return tolak("Gagal menyimpan foto. Coba lagi.", 500);

  // 8. Simpan ke database (jam dari server)
  const sekarang = new Date();
  try {
    if (jenis === "masuk") {
      await prisma.absensi.create({
        data: {
          penempatanId: penempatan.id,
          tanggal,
          jenis: "HADIR",
          jamMasuk: sekarang,
          fotoMasuk: path,
          latMasuk: lat,
          lngMasuk: lng,
        },
      });
    } else {
      await prisma.absensi.update({
        where: kunci,
        data: { jamPulang: sekarang, fotoPulang: path, latPulang: lat, lngPulang: lng },
      });
    }
  } catch {
    // Database gagal: hapus foto yang terlanjur diunggah
    await supabaseAdmin.storage.from(BUCKET_ABSEN).remove([path]);
    return tolak("Absen gagal disimpan. Mungkin kamu sudah absen.", 409);
  }

  return NextResponse.json({ ok: true, pesan: `Absen ${jenis} berhasil.` });
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.peran !== "SISWA") return tolak("Tidak diizinkan", 403);

  const penempatan = await prisma.penempatan.findFirst({
    where: { siswaId: session.user.id },
    include: { tempatPkl: true },
  });
  if (!penempatan) {
    return NextResponse.json({
      ok: false,
      pesan: "Kamu belum punya penempatan PKL. Hubungi admin.",
      penempatan: null,
      absensi: null,
    });
  }

  const { tanggal, teks } = hariIniWIB();
  const diLuarPeriode = tanggal < penempatan.tanggalMulai || tanggal > penempatan.tanggalSelesai;
   const hari = tanggal.getUTCDay();
   const akhirPekan = !hariKerjaDariDb(penempatan.tempatPkl.hariKerja).includes(hari);

  const libur = await prisma.hariLibur.findFirst({
    where: {
      tanggal,
      OR: [{ tempatPklId: null }, { tempatPklId: penempatan.tempatPklId }],
    },
  });

  const absensi = await prisma.absensi.findUnique({
    where: {
      penempatanId_tanggal: { penempatanId: penempatan.id, tanggal },
    },
  });

  return NextResponse.json({
    ok: true,
    tanggal: teks,
    penempatan: {
      tempat: penempatan.tempatPkl.nama,
      lat: penempatan.tempatPkl.latitude,
      lng: penempatan.tempatPkl.longitude,
      radiusMeter: penempatan.tempatPkl.radiusMeter,
    },
    diLuarPeriode,
    akhirPekan,
    libur: libur ? libur.keterangan : null,
    absensi: absensi
      ? {
          jenis: absensi.jenis,
          status: absensi.status,
          jamMasuk: absensi.jamMasuk,
          jamPulang: absensi.jamPulang,
          catatan: absensi.catatan,
        }
      : null,
  });
}