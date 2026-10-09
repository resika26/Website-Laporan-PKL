"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { kecilkanGambar } from "@/lib/gambar";

type Props = {
  tanggal: string;
  awal: { kegiatan: string; kendala: string; pelajaran: string; keahlian: string };
  saranTag: string[];
  sisaFoto: number;
  jumlahFotoSebelumnya: number;
};

export default function JurnalForm({ tanggal, awal, saranTag, sisaFoto, jumlahFotoSebelumnya }: Props) {
  const router = useRouter();
  const [kegiatan, setKegiatan] = useState(awal.kegiatan);
  const [kendala, setKendala] = useState(awal.kendala);
  const [pelajaran, setPelajaran] = useState(awal.pelajaran);
  const [keahlian, setKeahlian] = useState(awal.keahlian);
  const [files, setFiles] = useState<File[]>([]);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  function tambahTag(nama: string) {
    const ada = keahlian.split(",").map((t) => t.trim().toLowerCase());
    if (ada.includes(nama.toLowerCase())) return;
    setKeahlian(keahlian.trim() ? `${keahlian.trim().replace(/,$/, "")}, ${nama}` : nama);
  }

  function pilihFoto(e: ChangeEvent<HTMLInputElement>) {
    const dipilih = Array.from(e.target.files ?? []);
    if (dipilih.length > sisaFoto) {
      setPesan({ ok: false, teks: `Maksimal ${sisaFoto} foto lagi untuk jurnal ini.` });
      e.target.value = "";
      return;
    }
    setPesan(null);
    setFiles(dipilih);
  }

  async function kirim(aksi: "simpan" | "kirim") {
    if (aksi === "kirim" && !window.confirm("Setelah dikirim, jurnal terkunci sampai diperiksa. Kirim sekarang?"))
      return;
    setSibuk(true);
    setPesan(null);
    try {
      const fd = new FormData();
      fd.append("tanggal", tanggal);
      fd.append("aksi", aksi);
      fd.append("kegiatan", kegiatan);
      fd.append("kendala", kendala);
      fd.append("pelajaran", pelajaran);
      fd.append("keahlian", keahlian);
      for (const file of files) fd.append("foto", await kecilkanGambar(file), "foto.jpg");

      const res = await fetch("/api/jurnal", { method: "POST", body: fd });
      const data = await res.json();
      setPesan({ ok: data.ok, teks: data.pesan });
      if (data.ok) {
        router.push("/siswa/jurnal");
        router.refresh();
      }
    } catch (error) {
      setPesan({ ok: false, teks: error instanceof Error ? error.message : "Terjadi kesalahan." });
    } finally {
      setSibuk(false);
    }
  }

  const kotak = "w-full border rounded p-2";

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        Kegiatan hari ini (wajib, minimal 20 karakter)
        <textarea value={kegiatan} onChange={(e) => setKegiatan(e.target.value)} rows={5} className={`${kotak} mt-1 font-normal`} />
      </label>
      <label className="block text-sm font-medium">
        Kendala (opsional)
        <textarea value={kendala} onChange={(e) => setKendala(e.target.value)} rows={3} className={`${kotak} mt-1 font-normal`} />
      </label>
      <label className="block text-sm font-medium">
        Pelajaran yang didapat (opsional)
        <textarea value={pelajaran} onChange={(e) => setPelajaran(e.target.value)} rows={3} className={`${kotak} mt-1 font-normal`} />
      </label>

      <div className="text-sm">
        <label className="font-medium">
          Keahlian yang dipakai (pisahkan dengan koma, maksimal 5)
          <input value={keahlian} onChange={(e) => setKeahlian(e.target.value)} placeholder="Contoh: Excel, Laravel" className={`${kotak} mt-1 font-normal`} />
        </label>
        {saranTag.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {saranTag.map((tag) => (
              <button key={tag} type="button" onClick={() => tambahTag(tag)} className="border rounded-full px-3 py-0.5 text-xs">
                + {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="block text-sm font-medium">
        Foto lampiran (opsional){jumlahFotoSebelumnya > 0 && ` · sudah ada ${jumlahFotoSebelumnya} foto`} · sisa {sisaFoto}
        <input type="file" accept="image/*" multiple disabled={sisaFoto === 0} onChange={pilihFoto} className="block mt-1 font-normal" />
      </label>
      {files.length > 0 && <p className="text-xs text-gray-500">{files.length} foto dipilih</p>}

      <div className="flex gap-2">
        <button onClick={() => kirim("simpan")} disabled={sibuk} className="border rounded px-4 py-2 disabled:opacity-50">
          Simpan draf
        </button>
        <button onClick={() => kirim("kirim")} disabled={sibuk} className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50">
          {sibuk ? "Memproses..." : "Kirim ke supervisor"}
        </button>
      </div>

      {pesan && <p className={`text-sm ${pesan.ok ? "text-green-700" : "text-red-600"}`}>{pesan.teks}</p>}
    </div>
  );
}