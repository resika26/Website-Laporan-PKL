"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TombolReviewProject({ id }: { id: string }) {
  const router = useRouter();
  const [formTolak, setFormTolak] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function proses(keputusan: "setuju" | "tolak") {
    if (keputusan === "tolak" && catatan.trim().length < 5) {
      setPesan("Alasan penolakan wajib diisi (minimal 5 karakter).");
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const response = await fetch("/api/project/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, keputusan, catatan }),
      });
      const hasil = (await response.json()) as { ok?: boolean; pesan?: string };
      if (!response.ok || !hasil.ok) throw new Error(hasil.pesan ?? "Project gagal diproses.");
      router.refresh();
    } catch (error) {
      setPesan(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="space-y-2">
      {!formTolak ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => proses("setuju")}
            disabled={sibuk}
            className="bg-green-700 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {sibuk ? "Memproses..." : "Setujui"}
          </button>
          <button
            type="button"
            onClick={() => setFormTolak(true)}
            disabled={sibuk}
            className="border border-red-400 text-red-700 rounded px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Tolak
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={catatan}
            onChange={(event) => setCatatan(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Alasan penolakan (wajib, minimal 5 karakter)"
            className="w-full border rounded p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => proses("tolak")}
              disabled={sibuk}
              className="bg-red-700 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {sibuk ? "Memproses..." : "Kirim penolakan"}
            </button>
            <button
              type="button"
              onClick={() => setFormTolak(false)}
              disabled={sibuk}
              className="border rounded px-3 py-1.5 text-sm"
            >
              Batal
            </button>
          </div>
        </div>
      )}
      {pesan && <p role="status" className="text-sm text-red-700">{pesan}</p>}
    </div>
  );
}