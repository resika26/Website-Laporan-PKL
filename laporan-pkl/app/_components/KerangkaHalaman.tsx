import Link from "next/link";
import type { ReactNode } from "react";
import TombolKeluar from "./TombolKeluar";
import MenuNav from "./MenuNav";
import PemilihTema from "./PemilihTema";
import { MENU_PERAN, type PeranAplikasi } from "./navigasi";

export default function KerangkaHalaman({
  children,
  peran,
  nama,
}: {
  children: ReactNode;
  peran?: PeranAplikasi;
  nama?: string | null;
}) {
  const tujuanMerek = peran ? MENU_PERAN[peran][0].href : "/galeri";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-5">
          <Link href={tujuanMerek} className="shrink-0 text-base font-bold text-hijau-aksen">
            Laporan PKL Digital
          </Link>
          <div className="min-w-0 flex-1">
            <MenuNav peran={peran} />
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm">
            <PemilihTema />
            <span className="max-w-40 truncate text-muted">{nama || "Tamu"}</span>
            {peran && <TombolKeluar />}
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}