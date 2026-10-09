import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, BUCKET_PROJECT } from "@/lib/supabase";
import { pastikanBucketProject } from "@/lib/project";

const tolak = (pesan: string, status = 400) =>
  NextResponse.json({ ok: false, pesan }, { status });

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.peran !== "SISWA") return tolak("Tidak diizinkan", 403);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return tolak("Form pengajuan tidak valid.");
  }

  const id = String(form.get("id") ?? "").trim();
  const aksi = String(form.get("aksi") ?? "");
  const judul = String(form.get("judul") ?? "").trim();
  const deskripsi = String(form.get("deskripsi") ?? "").trim();
  const tautan = String(form.get("tautan") ?? "").trim();
  const rahasia = String(form.get("rahasiaPerusahaan") ?? "false");
  const dataGambar = form.getAll("gambar");
  const dataHapus = form.getAll("hapusGambar");
  if (dataGambar.some((gambar) => !(gambar instanceof File)))
    return tolak("Lampiran gambar tidak valid.");
  if (dataHapus.some((gambarId) => typeof gambarId !== "string"))
    return tolak("Pilihan gambar yang dihapus tidak valid.");
  const gambar = dataGambar.filter((item): item is File => item instanceof File && item.size > 0);
  const hapusGambar = dataHapus as string[];

  if (aksi !== "draf" && aksi !== "ajukan") return tolak("Aksi project tidak valid.");
  if (judul.length < 3 || judul.length > 120)
    return tolak("Judul project harus 3 sampai 120 karakter.");
  if (deskripsi.length > 3000) return tolak("Deskripsi maksimal 3000 karakter.");
  if (tautan.length > 500) return tolak("Tautan maksimal 500 karakter.");
  if (tautan) {
    try {
      const url = new URL(tautan);
      if (url.protocol !== "https:") return tolak("Tautan harus menggunakan HTTPS.");
    } catch {
      return tolak("Tautan harus diawali https://.");
    }
  }
  if (rahasia !== "true" && rahasia !== "false")
    return tolak("Pilihan kerahasiaan tidak valid.");
  if (gambar.length > 5 || hapusGambar.length > 5)
    return tolak("Maksimal 5 gambar project.");
  if (gambar.some((file) => file.type !== "image/jpeg" || file.size > 1_500_000))
    return tolak("Gambar harus JPEG dan maksimal 1,5 MB per file.");

  const signatureValid = await Promise.all(gambar.map(async (file) => {
    const signature = new Uint8Array(await file.slice(0, 3).arrayBuffer());
    return signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  }));
  if (signatureValid.some((valid) => !valid)) return tolak("File yang diunggah bukan gambar JPEG yang valid.");

  const projectLama = id
    ? await prisma.project.findFirst({
        where: { id, siswaId: session.user.id },
        include: { gambar: true },
      })
    : null;
  if (id && !projectLama) return tolak("Project tidak ditemukan.", 404);
  if (projectLama && projectLama.status !== "DRAF" && projectLama.status !== "DITOLAK")
    return tolak("Project sudah diajukan dan terkunci.", 409);
  if (!projectLama && hapusGambar.length > 0) return tolak("Project untuk gambar yang dihapus tidak ditemukan.");

  const idGambarLama = new Set(projectLama?.gambar.map((item) => item.id) ?? []);
  if (new Set(hapusGambar).size !== hapusGambar.length || hapusGambar.some((gambarId) => !idGambarLama.has(gambarId)))
    return tolak("Gambar yang dipilih bukan milik project ini.");

  const jumlahGambarAkhir = (projectLama?.gambar.length ?? 0) - hapusGambar.length + gambar.length;
  if (jumlahGambarAkhir > 5) return tolak("Maksimal 5 gambar per project.");
  if (aksi === "ajukan" && jumlahGambarAkhir < 1)
    return tolak("Lampirkan minimal satu gambar sebelum mengajukan project.");

  try {
    await pastikanBucketProject();
  } catch {
    return tolak("Bucket galeri project belum dapat disiapkan. Periksa konfigurasi Supabase.", 500);
  }

  const jalur: string[] = [];
  for (const file of gambar) {
    const path = `project/${session.user.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_PROJECT)
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: "image/jpeg",
        upsert: false,
      });
    if (error) {
      if (jalur.length > 0) await supabaseAdmin.storage.from(BUCKET_PROJECT).remove(jalur);
      return tolak("Gagal mengunggah gambar project.", 500);
    }
    jalur.push(path);
  }

  const status = aksi === "ajukan" ? ("MENUNGGU" as const) : ("DRAF" as const);
  try {
    await prisma.$transaction(async (tx) => {
      let projectId = projectLama?.id;
      const dataProject = {
        judul,
        deskripsi: deskripsi || null,
        tautan: tautan || null,
        rahasiaPerusahaan: rahasia === "true",
        status,
        disetujuiOlehId: null,
        ...(aksi === "ajukan" ? { catatan: null } : {}),
      };

      if (projectLama) {
        const hasil = await tx.project.updateMany({
          where: { id: projectLama.id, siswaId: session.user.id, status: { in: ["DRAF", "DITOLAK"] } },
          data: dataProject,
        });
        if (hasil.count !== 1) throw new Error("PROJECT_SUDAH_TERKUNCI");
        if (hapusGambar.length > 0) {
          await tx.gambarProject.deleteMany({
            where: { projectId: projectLama.id, id: { in: hapusGambar } },
          });
        }
      } else {
        const project = await tx.project.create({
          data: { ...dataProject, siswaId: session.user.id },
        });
        projectId = project.id;
      }

      if (jalur.length > 0 && projectId) {
        await tx.gambarProject.createMany({
          data: jalur.map((fileGambar) => ({ projectId, fileGambar })),
        });
      }
    });
  } catch (error) {
    if (jalur.length > 0) await supabaseAdmin.storage.from(BUCKET_PROJECT).remove(jalur);
    if (error instanceof Error && error.message === "PROJECT_SUDAH_TERKUNCI")
      return tolak("Project sudah diajukan dan terkunci.", 409);
    return tolak("Gagal menyimpan project. Coba lagi.", 500);
  }

  const jalurDihapus = projectLama?.gambar
    .filter((item) => hapusGambar.includes(item.id))
    .map((item) => item.fileGambar) ?? [];
  if (jalurDihapus.length > 0) await supabaseAdmin.storage.from(BUCKET_PROJECT).remove(jalurDihapus);

  return NextResponse.json({
    ok: true,
    pesan: aksi === "ajukan" ? "Project diajukan kepada Pembimbing sekolah." : "Draf project tersimpan.",
  });
}