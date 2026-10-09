"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { kecilkanGambar } from "@/lib/gambar";

type ProjectFormData = {
  id: string;
  judul: string;
  deskripsi: string;
  tautan: string;
  rahasiaPerusahaan: boolean;
  gambar: { id: string; url: string | null }[];
};

export default function FormProject({ project }: { project?: ProjectFormData }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [terbuka, setTerbuka] = useState(false);
  const [gambarBaru, setGambarBaru] = useState<File[]>([]);
  const [gambarDihapus, setGambarDihapus] = useState<Set<string>>(new Set());
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  const gambarTersisa = (project?.gambar.length ?? 0) - gambarDihapus.size;
  const jumlahAkhir = gambarTersisa + gambarBaru.length;

  function pilihGambar(fileList: FileList | null) {
    const dipilih = Array.from(fileList ?? []);
    if (gambarTersisa + dipilih.length > 5) {
      setPesan({ ok: false, teks: "Maksimal 5 gambar untuk satu project." });
      setGambarBaru([]);
      return;
    }
    setPesan(null);
    setGambarBaru(dipilih);
  }

  function ubahHapus(id: string, checked: boolean) {
    setGambarDihapus((sebelumnya) => {
      const berikutnya = new Set(sebelumnya);
      if (checked) berikutnya.add(id);
      else berikutnya.delete(id);
      return berikutnya;
    });
    setPesan(null);
  }

  async function kirim(aksi: "draf" | "ajukan") {
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;
    if (aksi === "ajukan" && jumlahAkhir < 1) {
      setPesan({ ok: false, teks: "Lampirkan minimal satu gambar sebelum mengajukan project." });
      return;
    }

    setSibuk(true);
    setPesan(null);
    try {
      const dataForm = new FormData(form);
      const dataKirim = new FormData();
      if (project) dataKirim.append("id", project.id);
      dataKirim.append("aksi", aksi);
      dataKirim.append("judul", String(dataForm.get("judul") ?? ""));
      dataKirim.append("deskripsi", String(dataForm.get("deskripsi") ?? ""));
      dataKirim.append("tautan", String(dataForm.get("tautan") ?? ""));
      dataKirim.append("rahasiaPerusahaan", dataForm.has("rahasiaPerusahaan") ? "true" : "false");
      for (const id of gambarDihapus) dataKirim.append("hapusGambar", id);

      for (const file of gambarBaru) {
        const hasil = await kecilkanGambar(file);
        if (hasil.size > 1_500_000) {
          throw new Error("Salah satu gambar masih lebih dari 1,5 MB setelah dikompres.");
        }
        dataKirim.append("gambar", hasil, "project.jpg");
      }

      const response = await fetch("/api/project", { method: "POST", body: dataKirim });
      const hasil = (await response.json()) as { ok?: boolean; pesan?: string };
      if (!response.ok || !hasil.ok) throw new Error(hasil.pesan ?? "Project gagal disimpan.");

      setPesan({ ok: true, teks: hasil.pesan ?? "Project tersimpan." });
      form.reset();
      setGambarBaru([]);
      setGambarDihapus(new Set());
      setTerbuka(false);
      router.refresh();
    } catch (error) {
      setPesan({
        ok: false,
        teks: error instanceof Error ? error.message : "Terjadi kesalahan. Coba lagi.",
      });
    } finally {
      setSibuk(false);
    }
  }

  const kotak = "w-full border rounded p-2";

  if (!terbuka) {
    return (
      <div className="space-y-2">
        <button type="button" onClick={() => setTerbuka(true)} className="border rounded px-3 py-1.5 text-sm">
          {project ? "Edit project" : "+ Project baru"}
        </button>
        {pesan && <p role="status" className={`text-sm ${pesan.ok ? "text-green-700" : "text-red-600"}`}>{pesan.teks}</p>}
      </div>
    );
  }

  return (
    <form ref={formRef} className="space-y-3 border rounded p-4">
      <h2 className="font-semibold">{project ? "Edit project" : "Project baru"}</h2>
      <label className="block text-sm font-medium">
        Judul project
        <input name="judul" required minLength={3} maxLength={120} defaultValue={project?.judul} className={`${kotak} mt-1 font-normal`} />
      </label>
      <label className="block text-sm font-medium">
        Deskripsi (opsional)
        <textarea name="deskripsi" rows={4} maxLength={3000} defaultValue={project?.deskripsi} className={`${kotak} mt-1 font-normal`} />
      </label>
      <label className="block text-sm font-medium">
        Tautan (opsional, harus diawali https://)
        <input name="tautan" type="url" maxLength={500} placeholder="https://..." defaultValue={project?.tautan} className={`${kotak} mt-1 font-normal`} />
      </label>
      {project && project.gambar.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Gambar tersimpan</legend>
          <div className="flex flex-wrap gap-3">
            {project.gambar.map((gambar, index) => (
              <label key={gambar.id} className="flex items-center gap-2 text-xs">
                {gambar.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={gambar.url} alt={`Gambar ${index + 1}`} className="h-16 w-16 rounded border object-cover" />
                )}
                <span className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={gambarDihapus.has(gambar.id)}
                    onChange={(event) => ubahHapus(gambar.id, event.target.checked)}
                  />
                  Hapus
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="block text-sm font-medium">
        Tambah gambar (JPEG/JPG/PNG/WebP, maksimal 5 gambar total)
        <input
          name="gambar"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => pilihGambar(event.target.files)}
          className="block mt-1 font-normal"
        />
      </label>
      <p className="text-xs text-gray-500">Jumlah gambar setelah disimpan: {jumlahAkhir} dari 5</p>
      <label className="flex items-start gap-2 text-sm">
        <input name="rahasiaPerusahaan" type="checkbox" defaultChecked={project?.rahasiaPerusahaan} className="mt-1" />
        <span>Project bersifat rahasia perusahaan dan tidak akan tampil di galeri publik.</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => kirim("draf")} disabled={sibuk} className="border rounded px-3 py-1.5 text-sm disabled:opacity-50">
          {sibuk ? "Menyimpan..." : "Simpan draf"}
        </button>
        <button type="button" onClick={() => kirim("ajukan")} disabled={sibuk} className="bg-hijau-tombol hover:bg-hijau-aksen text-white rounded px-3 py-1.5 text-sm disabled:opacity-50">
          {sibuk ? "Mengirim..." : "Ajukan ke guru"}
        </button>
        <button type="button" onClick={() => setTerbuka(false)} disabled={sibuk} className="border rounded px-3 py-1.5 text-sm">
          Batal
        </button>
      </div>
      {pesan && <p role="status" className={`text-sm ${pesan.ok ? "text-green-700" : "text-red-600"}`}>{pesan.teks}</p>}
    </form>
  );
}