import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { wajibPeran } from "@/lib/akses";

const PERAN = ["SISWA", "GURU", "SUPERVISOR", "ADMIN"] as const;
type PeranAkun = (typeof PERAN)[number];

async function buatAkun(formData: FormData) {
  "use server";
  await wajibPeran("ADMIN"); // server tetap memeriksa, jangan percaya form saja

  const nama = String(formData.get("nama") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const sandi = String(formData.get("sandi") ?? "");
  const peran = String(formData.get("peran") ?? "") as PeranAkun;

  if (!nama || !email || sandi.length < 8 || !PERAN.includes(peran)) {
    redirect("/admin/pengguna?pesan=Data+belum+lengkap+(sandi+minimal+8+karakter)");
  }

  const kataSandi = await bcrypt.hash(sandi, 10);

  try {
    if (peran === "SISWA") {
      const nis = String(formData.get("nis") ?? "").trim();
      const kelas = String(formData.get("kelas") ?? "").trim();
      const jurusan = String(formData.get("jurusan") ?? "").trim();
      const noHp = String(formData.get("noHp") ?? "").trim();

      if (!nis || !kelas || !jurusan) {
        redirect("/admin/pengguna?pesan=NIS,+kelas,+dan+jurusan+wajib+diisi+untuk+siswa");
      }

      await prisma.pengguna.create({
        data: {
          nama, email, kataSandi, peran,
          profilSiswa: { create: { nis, kelas, jurusan, noHp: noHp || null } },
        },
      });
    } else {
      await prisma.pengguna.create({ data: { nama, email, kataSandi, peran } });
    }
  } catch (e) {
    // redirect() sendiri bekerja dengan melempar error khusus, jangan ditelan
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    redirect("/admin/pengguna?pesan=Gagal+membuat+akun.+Email+atau+NIS+mungkin+sudah+dipakai");
  }

  revalidatePath("/admin/pengguna");
  redirect("/admin/pengguna?pesan=Akun+berhasil+dibuat");
}

export default async function KelolaPenggunaPage({
  searchParams,
}: {
  searchParams: Promise<{ pesan?: string }>;
}) {
  await wajibPeran("ADMIN");
  const { pesan } = await searchParams;

  const daftar = await prisma.pengguna.findMany({
    orderBy: { dibuatPada: "desc" },
    include: { profilSiswa: true },
  });

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <a href="/admin" className="text-sm text-blue-600">← Kembali</a>
      <h1 className="text-xl font-bold">Kelola Akun</h1>

      {pesan && <p className="border rounded p-3 text-sm">{pesan}</p>}

      <form action={buatAkun} className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Buat akun baru</h2>
        <input name="nama" placeholder="Nama lengkap" required className="w-full border rounded p-2" />
        <input name="email" type="email" placeholder="Email" required className="w-full border rounded p-2" />
        <input name="sandi" type="password" placeholder="Kata sandi awal (min. 8 karakter)" required className="w-full border rounded p-2" />
        <select name="peran" className="w-full border rounded p-2" defaultValue="SISWA">
          <option value="SISWA">Siswa</option>
          <option value="GURU">Guru pembimbing</option>
          <option value="SUPERVISOR">Supervisor instansi</option>
          <option value="ADMIN">Admin</option>
        </select>

        <fieldset className="border rounded p-3 space-y-2">
          <legend className="text-sm px-1">Khusus siswa (abaikan untuk peran lain)</legend>
          <input name="nis" placeholder="NIS" className="w-full border rounded p-2" />
          <input name="kelas" placeholder="Kelas, misalnya XII RPL 1" className="w-full border rounded p-2" />
          <input name="jurusan" placeholder="Jurusan" defaultValue="Rekayasa Perangkat Lunak" className="w-full border rounded p-2" />
          <input name="noHp" placeholder="No HP (opsional)" className="w-full border rounded p-2" />
        </fieldset>

        <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2">Buat akun</button>
      </form>

      <section className="space-y-2">
        <h2 className="font-semibold">Daftar akun ({daftar.length})</h2>
        {daftar.map((p) => (
          <div key={p.id} className="border rounded p-3 text-sm">
            <b>{p.nama}</b> · {p.peran}
            <div className="text-gray-500">
              {p.email}
              {p.profilSiswa && ` · NIS ${p.profilSiswa.nis} · ${p.profilSiswa.kelas}`}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}