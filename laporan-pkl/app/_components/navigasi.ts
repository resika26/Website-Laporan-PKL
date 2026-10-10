export type PeranAplikasi = "SISWA" | "GURU" | "SUPERVISOR" | "ADMIN";

export type ItemMenu = {
  label: string;
  href: string;
};

export const MENU_PERAN: Record<PeranAplikasi, ItemMenu[]> = {
  SISWA: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Absen", href: "/dashboard/absen" },
    { label: "Riwayat", href: "/siswa/riwayat" },
    { label: "Izin & Sakit", href: "/dashboard/izin" },
    { label: "Jurnal", href: "/siswa/jurnal" },
    { label: "Project Saya", href: "/siswa/project" },
    { label: "Galeri", href: "/galeri" },
  ],
  GURU: [
    { label: "Verifikasi", href: "/guru" },
    { label: "Galeri", href: "/galeri" },
  ],
  SUPERVISOR: [
    { label: "Verifikasi", href: "/supervisor" },
    { label: "Galeri", href: "/galeri" },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin" },
    { label: "Kelola akun", href: "/admin/pengguna" },
    { label: "DU/DI", href: "/admin/tempat-pkl" },
    { label: "Penempatan", href: "/admin/penempatan" },
    { label: "Hari libur", href: "/admin/hari-libur" },
    { label: "Galeri", href: "/galeri" },
  ],
};

export const MENU_TAMU: ItemMenu[] = [{ label: "Galeri", href: "/galeri" }];