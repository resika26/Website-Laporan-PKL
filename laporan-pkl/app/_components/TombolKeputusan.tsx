"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TombolKeputusan({
  tipe,
  id,
}: {
  tipe: "absensi" | "jurnal";
  id: string;
}) {
  const router = useRouter();
  const [formTolak, setFormTolak] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function kirim(keputusan: "setuju" | "tolak") {
    setSibuk(true);
    setPesan(null);
    try {
      const res = await fetch("/api/verifikasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipe, id, keputusan, catatan }),
      });
      const data = (await res.json()) as { ok?: boolean; pesan?: string };
      if (res.ok && data.ok) {
        router.refresh();
      } else {
        setPesan(data.pesan ?? "Keputusan gagal diproses.");
      }
    } catch {
      setPesan("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="space-y-2 pt-2">
      {!formTolak ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => kirim("setuju")}
            disabled={sibuk}
            className="bg-hijau-tombol hover:bg-hijau-aksen text-white rounded px-4 py-1.5 text-sm disabled:opacity-50"
          >
            {sibuk ? "Memproses..." : "Setujui"}
          </button>
          <button
            type="button"
            onClick={() => setFormTolak(true)}
            disabled={sibuk}
            className="border border-red-400 text-red-600 rounded px-4 py-1.5 text-sm"
          >
            Tolak
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Alasan penolakan (wajib, minimal 5 karakter)"
            className="w-full border rounded p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => kirim("tolak")}
              disabled={sibuk}
              className="bg-red-600 text-white rounded px-4 py-1.5 text-sm disabled:opacity-50"
            >
              {sibuk ? "Memproses..." : "Kirim penolakan"}
            </button>
            <button
              type="button"
              onClick={() => setFormTolak(false)}
              disabled={sibuk}
              className="border rounded px-4 py-1.5 text-sm"
            >
              Batal
            </button>
          </div>
        </div>
      )}
      {pesan && <p className="text-sm text-red-600">{pesan}</p>}
    </div>
  );
}