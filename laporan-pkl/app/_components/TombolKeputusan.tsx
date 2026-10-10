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
    <div className="space-y-2 pt-1">
      {!formTolak ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => kirim("setuju")}
            disabled={sibuk}
            className="rounded-xl bg-hijau-tombol py-3.5 text-base font-bold text-white hover:bg-hijau-aksen disabled:opacity-50"
          >
            {sibuk ? "Memproses..." : "Setujui"}
          </button>
          <button
            type="button"
            onClick={() => setFormTolak(true)}
            disabled={sibuk}
            className="rounded-xl border-2 border-red-500 py-3.5 text-base font-bold text-red-600 disabled:opacity-50"
          >
            Tolak
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border-2 border-red-300 p-3">
          <label className="block text-sm font-semibold">
            Alasan penolakan
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Wajib diisi, minimal 5 karakter"
              className="mt-1 w-full rounded-lg border bg-surface p-2.5 text-base font-normal focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => kirim("tolak")}
              disabled={sibuk}
              className="rounded-xl bg-red-600 py-3.5 text-base font-bold text-white disabled:opacity-50"
            >
              {sibuk ? "Memproses..." : "Kirim penolakan"}
            </button>
            <button
              type="button"
              onClick={() => setFormTolak(false)}
              disabled={sibuk}
              className="rounded-xl border py-3.5 text-base font-semibold"
            >
              Batal
            </button>
          </div>
        </div>
      )}
      {pesan && (
        <p className="rounded-lg border border-red-400 bg-red-100 p-2.5 text-sm text-red-700">{pesan}</p>
      )}
    </div>
  );
}