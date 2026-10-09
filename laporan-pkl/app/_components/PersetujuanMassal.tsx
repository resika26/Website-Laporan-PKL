"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  tipe: "absensi" | "jurnal";
  id: string;
  siswa: string;
  tanggal: string;
};

const kunciItem = (item: Item) => `${item.tipe}:${item.id}`;

export default function PersetujuanMassal({ items }: { items: Item[] }) {
  const router = useRouter();
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set());
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const ditampilkan = items.slice(0, 100);
  const pilihan = ditampilkan.filter((item) => terpilih.has(kunciItem(item)));

  function pilih(item: Item, checked: boolean) {
    setTerpilih((sebelumnya) => {
      const berikutnya = new Set(sebelumnya);
      if (checked) berikutnya.add(kunciItem(item));
      else berikutnya.delete(kunciItem(item));
      return berikutnya;
    });
    setPesan(null);
  }

  function pilihSemua() {
    const semuaTerpilih = ditampilkan.every((item) => terpilih.has(kunciItem(item)));
    setTerpilih(semuaTerpilih ? new Set() : new Set(ditampilkan.map(kunciItem)));
    setPesan(null);
  }

  async function setujuiPilihan() {
    if (pilihan.length === 0 || sibuk) return;
    if (!window.confirm(`Setujui dan kunci ${pilihan.length} item terpilih?`)) return;

    setSibuk(true);
    setPesan(null);
    try {
      const res = await fetch("/api/verifikasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keputusan: "setuju", items: pilihan.map(({ tipe, id }) => ({ tipe, id })) }),
      });
      const data = (await res.json()) as { ok?: boolean; pesan?: string };
      setPesan(data.pesan ?? "Persetujuan massal gagal diproses.");
      if (res.ok && data.ok) {
        setTerpilih(new Set());
        router.refresh();
      }
    } catch {
      setPesan("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSibuk(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <fieldset className="border rounded p-3 space-y-2">
      <legend className="px-1 text-sm font-semibold">Persetujuan massal</legend>
      <p className="text-xs text-gray-600">
        Pilih item tahap guru yang akan disetujui. Maksimal 100 item per proses.
      </p>
      {items.length > ditampilkan.length && (
        <p className="text-xs text-amber-800">Daftar pilihan menampilkan 100 item pertama; sisanya dapat diproses pada batch berikutnya.</p>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={ditampilkan.every((item) => terpilih.has(kunciItem(item)))}
          onChange={pilihSemua}
          disabled={sibuk}
        />
        Pilih semua yang ditampilkan
      </label>
      <div className="max-h-56 overflow-y-auto divide-y">
        {ditampilkan.map((item) => (
          <label key={kunciItem(item)} className="flex items-center gap-2 py-2 text-sm">
            <input
              type="checkbox"
              checked={terpilih.has(kunciItem(item))}
              onChange={(e) => pilih(item, e.target.checked)}
              disabled={sibuk}
            />
            <span className="min-w-0 flex-1 truncate">{item.siswa}</span>
            <span className="text-gray-500">{item.tipe === "absensi" ? "Absen" : "Jurnal"} · {item.tanggal}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={setujuiPilihan}
          disabled={sibuk || pilihan.length === 0}
          className="bg-hijau-tombol hover:bg-hijau-aksen text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {sibuk ? "Memproses..." : `Setujui pilihan (${pilihan.length})`}
        </button>
        {pesan && <p role="status" className="text-sm text-gray-700">{pesan}</p>}
      </div>
    </fieldset>
  );
}