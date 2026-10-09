"use client";

import { useEffect, useSyncExternalStore, type ChangeEvent } from "react";
import { KUNCI_TEMA, pilihanTemaValid, type PilihanTema } from "@/lib/tema";

function terapkanTema(pilihan: PilihanTema) {
  document.documentElement.dataset.theme = pilihan;
}

function bacaPilihan(): PilihanTema {
  try {
    const tersimpan = localStorage.getItem(KUNCI_TEMA);
    return pilihanTemaValid(tersimpan) ? tersimpan : "system";
  } catch {
    return "system";
  }
}

function berlanggananTema(panggilUlang: () => void) {
  const saatPenyimpananBerubah = (event: StorageEvent) => {
    if (event.key === KUNCI_TEMA) panggilUlang();
  };
  const saatTemaBerubah = () => panggilUlang();
  window.addEventListener("storage", saatPenyimpananBerubah);
  window.addEventListener("tema-berubah", saatTemaBerubah);
  return () => {
    window.removeEventListener("storage", saatPenyimpananBerubah);
    window.removeEventListener("tema-berubah", saatTemaBerubah);
  };
}

export default function PemilihTema() {
  const pilihan = useSyncExternalStore(berlanggananTema, bacaPilihan, () => "system");

  useEffect(() => {
    window.dispatchEvent(new Event("tema-berubah"));
  }, []);

  function ubahTema(event: ChangeEvent<HTMLSelectElement>) {
    const berikutnya = event.target.value as PilihanTema;
    try {
      localStorage.setItem(KUNCI_TEMA, berikutnya);
    } catch {
      // Tema tetap diterapkan untuk tab ini jika penyimpanan browser tidak tersedia.
    }
    terapkanTema(berikutnya);
    window.dispatchEvent(new Event("tema-berubah"));
  }

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span>Tema</span>
      <select
        aria-label="Pilihan tema"
        value={pilihan}
        onChange={ubahTema}
        className="rounded border border-border bg-surface px-2 py-1 text-foreground"
      >
        <option value="light">Terang</option>
        <option value="dark">Gelap</option>
        <option value="system">Ikuti perangkat</option>
      </select>
    </label>
  );
}