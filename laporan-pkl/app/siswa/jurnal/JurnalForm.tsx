"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
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
  const [pratinjau, setPratinjau] = useState<string[]>([]);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  const urlRef = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      urlRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const daftarTag = keahlian
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const sudahDipilih = new Set(daftarTag.map((t) => t.toLowerCase()));
  const tagTersedia = saranTag.filter((t) => !sudahDipilih.has(t.toLowerCase()));

  function tambahTag(nama: string) {
    const ada = keahlian.split(",").map((t) => t.trim().toLowerCase());
    if (ada.includes(nama.toLowerCase())) return;
    setKeahlian(keahlian.trim() ? `${keahlian.trim().replace(/,$/, "")}, ${nama}` : nama);
  }

  function hapusTag(nama: string) {
    setKeahlian(daftarTag.filter((t) => t !== nama).join(", "));
  }

  function pilihFoto(e: ChangeEvent<HTMLInputElement>) {
    const dipilih = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (dipilih.length > sisaFoto) {
      setPesan({ ok: false, teks: `Maksimal ${sisaFoto} foto lagi untuk jurnal ini.` });
      return;
    }
    setPesan(null);
    urlRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlRef.current = dipilih.map((f) => URL.createObjectURL(f));
    setPratinjau(urlRef.current);
    setFiles(dipilih);
  }

  function hapusFoto(index: number) {
    URL.revokeObjectURL(urlRef.current[index]);
    urlRef.current = urlRef.current.filter((_, i) => i !== index);
    setPratinjau(urlRef.current);
    setFiles(files.filter((_, i) => i !== index));
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

  const kotak =
    "mt-1 w-full rounded-lg border bg-surface p-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-hijau-aksen";
  const jumlahKarakter = kegiatan.trim().length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-surface p-4">
        <label className="block text-sm font-semibold">
          Kegiatan hari ini <span className="font-normal text-muted">(wajib, minimal 20 karakter)</span>
          <textarea value={kegiatan} onChange={(e) => setKegiatan(e.target.value)} rows={5} className={kotak} />
        </label>
        <p className={`mt-1 text-xs ${jumlahKarakter >= 20 ? "text-green-700" : "text-muted"}`}>
          {jumlahKarakter} karakter
        </p>

        <label className="mt-3 block text-sm font-semibold">
          Kendala <span className="font-normal text-muted">(opsional)</span>
          <textarea value={kendala} onChange={(e) => setKendala(e.target.value)} rows={3} className={kotak} />
        </label>

        <label className="mt-3 block text-sm font-semibold">
          Pelajaran yang didapat <span className="font-normal text-muted">(opsional)</span>
          <textarea value={pelajaran} onChange={(e) => setPelajaran(e.target.value)} rows={3} className={kotak} />
        </label>
      </section>

      <section className="rounded-2xl border bg-surface p-4 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">Keahlian yang dipakai</h2>
          <span className="text-xs text-muted">{daftarTag.length}/5</span>
        </div>

        {daftarTag.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {daftarTag.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-hijau-tombol px-3 py-1 text-xs font-semibold text-white"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => hapusTag(tag)}
                  aria-label={`Hapus ${tag}`}
                  className="ml-0.5 text-sm leading-none hover:opacity-70"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          value={keahlian}
          onChange={(e) => setKeahlian(e.target.value)}
          placeholder="Ketik, pisahkan dengan koma. Contoh: Excel, Laravel"
          className={kotak}
        />

        {tagTersedia.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted">Saran, klik untuk menambah:</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {tagTersedia.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => tambahTag(tag)}
                  className="rounded-full border px-3 py-1 text-xs font-medium hover:border-hijau-aksen"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-surface p-4 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">Foto lampiran</h2>
          <span className="text-xs text-muted">
            {jumlahFotoSebelumnya > 0 ? `Sudah ada ${jumlahFotoSebelumnya} foto · ` : ""}sisa {sisaFoto}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {pratinjau.map((url, i) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Pratinjau foto ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => hapusFoto(i)}
                aria-label={`Hapus foto ${i + 1}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm text-white hover:bg-black"
              >
                ×
              </button>
            </div>
          ))}

          <label
            className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center text-xs font-semibold text-muted hover:border-hijau-aksen ${
              sisaFoto === 0 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <span className="text-2xl leading-none">+</span>
            Tambah foto
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={sisaFoto === 0}
              onChange={pilihFoto}
              className="hidden"
            />
          </label>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => kirim("simpan")}
          disabled={sibuk}
          className="rounded-xl border py-3 font-semibold hover:border-hijau-aksen disabled:opacity-50"
        >
          Simpan draf
        </button>
        <button
          onClick={() => kirim("kirim")}
          disabled={sibuk}
          className="rounded-xl bg-hijau-tombol py-3 font-bold text-white hover:bg-hijau-aksen disabled:opacity-50"
        >
          {sibuk ? "Memproses..." : "Kirim ke Pembimbing DU/DI"}
        </button>
      </div>

      {pesan && (
        <p
          className={`rounded-xl border p-3 text-sm ${
            pesan.ok
              ? "border-green-400 bg-green-100 text-green-700"
              : "border-red-400 bg-red-100 text-red-700"
          }`}
        >
          {pesan.teks}
        </p>
      )}
    </div>
  );
}