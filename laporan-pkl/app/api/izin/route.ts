import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, BUCKET_ABSEN } from "@/lib/supabase";
import { cekHariIni } from "@/lib/cekHari";

const tolak = (pesan: string, status = 400) =>
  NextResponse.json({ ok: false, pesan }, { status });

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.peran !== "SISWA") return tolak("Tidak diizinkan", 403);

  const form = await req.formData();
  const jenis = String(form.get("jenis") ?? "");
  const alasan = String(form.get("alasan") ?? "").trim();
  const surat = form.get("surat");

  if (jenis !== "IZIN" && jenis !== "SAKIT") return tolak("Jenis tidak valid");
  if (alasan.length < 5) return tolak("Tulis alasan minimal 5 karakter.");
  if (alasan.length > 500) return tolak("Alasan terlalu panjang (maksimal 500 karakter).");

  const adaSurat = surat instanceof File && surat.size > 0;
  if (jenis === "SAKIT" && !adaSurat) return tolak("Foto surat wajib dilampirkan untuk sakit.");
  if (adaSurat && (surat.type !== "image/jpeg" || surat.size > 1_500_000))
    return tolak("Foto surat tidak valid atau terlalu besar.");

  const penempatan = await prisma.penempatan.findFirst({ where: { siswaId: session.user.id } });
  if (!penempatan) return tolak("Kamu belum punya penempatan PKL. Hubungi admin.");

  const { tanggal, teks, tolak: alasanTolak } = await cekHariIni(penempatan);
  if (alasanTolak) return tolak(alasanTolak);

  const sudahAda = await prisma.absensi.findUnique({
    where: { penempatanId_tanggal: { penempatanId: penempatan.id, tanggal } },
  });
  if (sudahAda) return tolak("Kamu sudah tercatat hari ini.");

  // Simpan foto surat (jika ada)
  let path: string | null = null;
  if (adaSurat) {
    path = `${penempatan.id}/${teks}-surat.jpg`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_ABSEN)
      .upload(path, Buffer.from(await surat.arrayBuffer()), {
        contentType: "image/jpeg",
        upsert: false,
      });
    if (error) return tolak("Gagal menyimpan foto surat. Coba lagi.", 500);
  }

  try {
    await prisma.absensi.create({
      data: { penempatanId: penempatan.id, tanggal, jenis, alasan, fotoSurat: path },
    });
  } catch {
    if (path) await supabaseAdmin.storage.from(BUCKET_ABSEN).remove([path]);
    return tolak("Gagal menyimpan. Mungkin kamu sudah tercatat hari ini.", 409);
  }

  return NextResponse.json({ ok: true, pesan: `${jenis === "SAKIT" ? "Sakit" : "Izin"} berhasil dicatat.` });
}
