"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU_PERAN, MENU_TAMU, type PeranAplikasi } from "./navigasi";
import { ui } from "./ui";

export default function MenuNav({ peran }: { peran?: PeranAplikasi }) {
  const pathname = usePathname();
  const menu = peran ? MENU_PERAN[peran] : MENU_TAMU;
  const aktif = menu
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Menu utama" className="flex min-w-0 gap-1 overflow-x-auto">
      {menu.map((item) => {
        const dipilih = item.href === aktif;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={dipilih ? "page" : undefined}
            className={`${ui.menuItem} ${dipilih ? "bg-gray-100 font-semibold text-gray-950" : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}