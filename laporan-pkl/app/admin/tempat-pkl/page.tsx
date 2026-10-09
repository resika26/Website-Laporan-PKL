import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { wajibPeran } from "@/lib/akses";

async function buatTempat(formData: FormData) {
  "use server";
  await wajibPeran("ADMIN");

  const nama = String(formData.get("nama") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim();
  const koordinat = String(formData.get("koordinat") ?? "");
  const radius = Number(formData.get("radius") ?? 200);

  // "-6.9667, 110.4167" -> dua angka
  const [lat, lng] = koordinat.split(",").map((x) => Number(x.trim()));

  const valid =
    nama && alamat &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
    Number.isInteger(radius) && radius >= 20 && radius <= 5000;

  if (!valid) {
    redirect("/admin/tempat-pkl?pesan=Data+tidak+valid.+Cek+koordinat+(format:+lat,+lng)+dan+radius");
  }

  await prisma.tempatPkl.create({
    data: { nama, alamat, latitude: lat, longitude: lng, radiusMeter: radius },
  });
  redirect("/admin/tempat-pkl?pesan=Tempat+PKL+berhasil+ditambahkan");
}

export default async function TempatPklPage({
  searchParams,
}: {
  searchParams: Promise<{ pesan?: string }>;
}) {
  await wajibPeran("ADMIN");
  const { pesan } = await searchParams;
  const daftar = await prisma.tempatPkl.findMany({ orderBy: { nama: "asc" } });

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <a href="/admin" className="text-sm text-biru">← Kembali</a>
      <h1 className="text-xl font-bold">DU/DI</h1>
      {pesan && <p className="border rounded p-3 text-sm">{pesan}</p>}

      <form action={buatTempat} className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Tambah DU/DI</h2>
        <input name="nama" placeholder="Nama perusahaan/instansi" required className="w-full border rounded p-2" />
        <input name="alamat" placeholder="Alamat" required className="w-full border rounded p-2" />
        <input name="koordinat" placeholder="Koordinat dari Google Maps, contoh: -6.9667, 110.4167" required className="w-full border rounded p-2" />
        <input name="radius" type="number" defaultValue={200} min={20} max={5000} required className="w-full border rounded p-2" />
        <p className="text-xs text-gray-500">Radius (meter) = jarak maksimal dari titik ini agar absen dianggap sah.</p>
        <button type="submit" className="bg-hijau-tombol hover:bg-hijau-aksen text-white rounded px-4 py-2">Simpan</button>
      </form>

      <section className="space-y-2">
        <h2 className="font-semibold">Daftar DU/DI ({daftar.length})</h2>
        {daftar.map((t) => (
          <div key={t.id} className="border rounded p-3 text-sm">
            <b>{t.nama}</b>
            <div className="text-gray-500">
              {t.alamat} · {t.latitude}, {t.longitude} · radius {t.radiusMeter} m
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}