"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Kecilkan foto surat agar ringan, tetap cukup jelas untuk dibaca
async function kecilkan(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const skala = Math.min(1, 1600 / bmp.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * skala);
  canvas.height = Math.round(bmp.height * skala);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
  if (!blob) throw new Error("Gagal memproses gambar.");
  return blob;
}

export default function IzinForm() {
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [jenis, setJenis] = useState<"IZIN" | "SAKIT">("SAKIT");
  const [alasan, setAlasan] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  async function kirim() {
    setSibuk(true);
    setPesan(null);
    try {
      const fd = new FormData();
      fd.append("jenis", jenis);
      fd.append("alasan", alasan);
      if (file) fd.append("surat", await kecilkan(file), "surat.jpg");

      const res = await fetch("/api/izin", { method: "POST", body: fd });
      const data = await res.json();
      setPesan({ ok: data.ok, teks: data.pesan });
      if (data.ok) router.refresh();
    } catch (e) {
      setPesan({ ok: false, teks: e instanceof Error ? e.message : "Terjadi kesalahan." });
    } finally {
      setSibuk(false);
    }
  }

  if (!terbuka) {
    return (
      <button onClick={() => setTerbuka(true)} className="border rounded px-4 py-2 text-sm">
        Tidak bisa hadir? Catat izin / sakit
      </button>
    );
  }

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold">Catat izin / sakit hari ini</h3>
      <select
        value={jenis}
        onChange={(e) => setJenis(e.target.value as "IZIN" | "SAKIT")}
        className="w-full border rounded p-2"
      >
        <option value="SAKIT">Sakit (wajib foto surat)</option>
        <option value="IZIN">Izin</option>
      </select>
      <textarea
        value={alasan}
        onChange={(e) => setAlasan(e.target.value)}
        placeholder="Alasan (minimal 5 karakter)"
        rows={3}
        className="w-full border rounded p-2"
      />
      <label className="block text-sm">
        Foto surat {jenis === "SAKIT" ? "(wajib)" : "(opsional)"}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block mt-1"
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={kirim}
          disabled={sibuk}
          className="bg-hijau-tombol hover:bg-hijau-aksen text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {sibuk ? "Mengirim..." : "Kirim"}
        </button>
        <button onClick={() => setTerbuka(false)} disabled={sibuk} className="border rounded px-4 py-2">
          Tutup
        </button>
      </div>
      {pesan && (
        <p className={`text-sm ${pesan.ok ? "text-green-700" : "text-red-600"}`}>{pesan.teks}</p>
      )}
    </div>
  );
}
