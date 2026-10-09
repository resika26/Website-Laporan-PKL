import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const tolak = (pesan: string, status = 400) =>
  NextResponse.json({ ok: false, pesan }, { status });

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.peran !== "GURU") return tolak("Tidak diizinkan", 403);

  let isi: unknown;
  try {
    isi = await req.json();
  } catch {
    return tolak("Permintaan tidak valid.");
  }
  if (!isi || typeof isi !== "object" || Array.isArray(isi))
    return tolak("Permintaan tidak valid.");

  const body = isi as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const keputusan = body.keputusan;
  const catatan = typeof body.catatan === "string" ? body.catatan.trim() : "";
  if (!id || (keputusan !== "setuju" && keputusan !== "tolak"))
    return tolak("Project atau keputusan tidak valid.");
  if (keputusan === "tolak" && catatan.length < 5)
    return tolak("Alasan penolakan wajib diisi (minimal 5 karakter).");
  if (catatan.length > 500) return tolak("Catatan maksimal 500 karakter.");

  const setuju = keputusan === "setuju";
  const hasil = await prisma.project.updateMany({
    where: {
      id,
      status: "MENUNGGU",
      siswa: {
        is: { penempatanSebagaiSiswa: { some: { guruId: session.user.id } } },
      },
    },
    data: {
      status: setuju ? "TAMPIL" : "DITOLAK",
      catatan: setuju ? null : catatan,
      disetujuiOlehId: setuju ? session.user.id : null,
    },
  });

  if (hasil.count === 0)
    return tolak("Project bukan milik siswa bimbinganmu atau sudah diproses.", 409);

  return NextResponse.json({
    ok: true,
    pesan: setuju ? "Project disetujui." : "Project ditolak. Siswa dapat merevisi pengajuan.",
  });
}