export type PeranAplikasi = "SISWA" | "GURU" | "SUPERVISOR" | "ADMIN";

export type ItemMenu = {
  label: string;
  href: string;
};

export const MENU_PERAN: Record<PeranAplikasi, ItemMenu[]> = {
  SISWA: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Absen", href: "/dashboard/absen" },
    { label: "Izin & Sakit", href: "/dashboard/izin" },
    { label: "Jurnal", href: "/siswa/jurnal" },
    { label: "Project Saya", href: "/siswa/project" },
    { label: "Galeri", href: "/galeri" },
  ],
  GURU: [
    { label: "Dashboard Guru", href: "/guru" },
    { label: "Galeri", href: "/galeri" },
  ],
  SUPERVISOR: [
    { label: "Dashboard Supervisor", href: "/supervisor" },
    { label: "Galeri", href: "/galeri" },
  ],
  ADMIN: [
    { label: "Dashboard Admin", href: "/admin" },
    { label: "Kelola akun", href: "/admin/pengguna" },
    { label: "Tempat PKL", href: "/admin/tempat-pkl" },
    { label: "Penempatan", href: "/admin/penempatan" },
    { label: "Galeri", href: "/galeri" },
  ],
};

export const MENU_TAMU: ItemMenu[] = [{ label: "Galeri", href: "/galeri" }];