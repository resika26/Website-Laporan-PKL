import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const tolak = (pesan: string, status = 400) =>
  NextResponse.json({ ok: false, pesan }, { status });

export async function POST(req: Request) {
  const session = await auth();
  const peran = session?.user.peran;
  if (!session || (peran !== "SUPERVISOR" && peran !== "GURU"))
    return tolak("Tidak diizinkan", 403);

  let isi: unknown;
  try {
    isi = await req.json();
  } catch {
    return tolak("Permintaan tidak valid");
  }
  if (!isi || typeof isi !== "object" || Array.isArray(isi))
    return tolak("Permintaan tidak valid");

  const body = isi as Record<string, unknown>;
  const keputusan = body.keputusan;
  const catatan = typeof body.catatan === "string" ? body.catatan.trim() : "";

  if (keputusan !== "setuju" && keputusan !== "tolak")
    return tolak("Keputusan tidak valid");
  if (keputusan === "tolak" && catatan.length < 5)
    return tolak("Alasan penolakan wajib diisi (minimal 5 karakter).");
  if (catatan.length > 500)
    return tolak("Catatan terlalu panjang (maksimal 500 karakter).");

  if (body.items !== undefined) {
    if (peran !== "GURU" || keputusan !== "setuju")
      return tolak("Persetujuan massal hanya tersedia untuk guru.", 403);
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100)
      return tolak("Pilih 1 sampai 100 item untuk disetujui.");

    const items: { tipe: "absensi" | "jurnal"; id: string }[] = [];
    const kunciItem = new Set<string>();
    for (const nilai of body.items) {
      if (!nilai || typeof nilai !== "object" || Array.isArray(nilai))
        return tolak("Daftar item tidak valid.");
      const item = nilai as Record<string, unknown>;
      const tipe = item.tipe;
      const id = typeof item.id === "string" ? item.id.trim() : "";
      if ((tipe !== "absensi" && tipe !== "jurnal") || !id)
        return tolak("Daftar item tidak valid.");
      const kunci = `${tipe}:${id}`;
      if (kunciItem.has(kunci)) return tolak("Item yang sama dipilih lebih dari sekali.");
      kunciItem.add(kunci);
      items.push({ tipe, id });
    }

    const idAbsen = items.filter((item) => item.tipe === "absensi").map((item) => item.id);
    const idJurnal = items.filter((item) => item.tipe === "jurnal").map((item) => item.id);
    const sekarang = new Date();

    try {
      const jumlah = await prisma.$transaction(async (tx) => {
        let terproses = 0;
        if (idAbsen.length > 0) {
          const hasil = await tx.absensi.updateMany({
            where: {
              id: { in: idAbsen },
              status: "MENUNGGU_GURU",
              penempatan: { is: { guruId: session.user.id } },
              OR: [{ jenis: { not: "HADIR" } }, { jamPulang: { not: null } }],
            },
            data: {
              status: "DISETUJUI",
              disetujuiGuruOlehId: session.user.id,
              disetujuiGuruPada: sekarang,
            },
          });
          terproses += hasil.count;
        }
        if (idJurnal.length > 0) {
          const hasil = await tx.jurnal.updateMany({
            where: {
              id: { in: idJurnal },
              status: "MENUNGGU_GURU",
              penempatan: { is: { guruId: session.user.id } },
            },
            data: {
              status: "DISETUJUI",
              disetujuiGuruOlehId: session.user.id,
              disetujuiGuruPada: sekarang,
            },
          });
          terproses += hasil.count;
        }
        if (terproses !== items.length) throw new Error("BULK_REVIEW_CONFLICT");
        return terproses;
      });

      return NextResponse.json({ ok: true, jumlah, pesan: `${jumlah} item disetujui dan dikunci.` });
    } catch (error) {
      if (error instanceof Error && error.message === "BULK_REVIEW_CONFLICT")
        return tolak("Sebagian item bukan milikmu, belum siap, atau sudah diproses. Tidak ada perubahan.", 409);
      return tolak("Gagal memproses persetujuan massal. Coba lagi.", 500);
    }
  }

  const tipe = body.tipe;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if ((tipe !== "absensi" && tipe !== "jurnal") || !id)
    return tolak("Permintaan tidak valid");

  const supervisor = peran === "SUPERVISOR";
  const setuju = keputusan === "setuju";
  const statusAwal = supervisor ? "MENUNGGU_SUPERVISOR" : "MENUNGGU_GURU";
  const statusBaru = !setuju ? "DITOLAK" : supervisor ? "MENUNGGU_GURU" : "DISETUJUI";
  const milik = supervisor
    ? { supervisorId: session.user.id }
    : { guruId: session.user.id };
  const sekarang = new Date();
  const persetujuan = !setuju
    ? {}
    : supervisor
      ? { disetujuiSupervisorOlehId: session.user.id, disetujuiSupervisorPada: sekarang }
      : { disetujuiGuruOlehId: session.user.id, disetujuiGuruPada: sekarang };

  try {
    let jumlah = 0;
    if (tipe === "absensi") {
      const hasil = await prisma.absensi.updateMany({
        where: {
          id,
          status: statusAwal,
          penempatan: { is: milik },
          OR: [{ jenis: { not: "HADIR" } }, { jamPulang: { not: null } }],
        },
        data: {
          status: statusBaru,
          ...(!setuju ? { catatan } : {}),
          ...persetujuan,
        },
      });
      jumlah = hasil.count;
    } else {
      const hasil = await prisma.jurnal.updateMany({
        where: { id, status: statusAwal, penempatan: { is: milik } },
        data: {
          status: statusBaru,
          ...(!setuju ? { catatanRevisi: catatan } : {}),
          ...persetujuan,
        },
      });
      jumlah = hasil.count;
    }

    if (jumlah === 0)
      return tolak("Item tidak ditemukan, bukan milikmu, atau sudah diproses orang lain.", 409);
  } catch {
    return tolak("Gagal memproses keputusan. Coba lagi.", 500);
  }

  return NextResponse.json({
    ok: true,
    pesan: setuju
      ? supervisor
        ? "Disetujui. Diteruskan ke guru."
        : "Disetujui dan dikunci."
      : "Ditolak. Siswa akan melihat alasanmu.",
  });
}