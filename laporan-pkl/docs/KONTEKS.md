# Konteks proyek: Laporan PKL Digital SMK Negeri 1 Pacitan
Aplikasi web untuk absen harian berfoto, jurnal kegiatan, verifikasi dua tingkat, dan galeri project siswa PKL.

## Teknologi
Next.js (App Router) + TypeScript, Tailwind CSS, Prisma 7 (adapter-pg) ke PostgreSQL Supabase, Supabase Storage (bucket privat: bukti-absen dan galeri-project), Auth.js v5 (Credentials, sesi JWT), deploy ke Vercel.

## Peran dan halaman
Nilai peran di kode: SISWA, GURU, SUPERVISOR, ADMIN. Halaman: /siswa, /guru, /supervisor, /admin, /galeri. Pengaman: wajibPeran() di lib/akses.ts dipanggil di tiap page.tsx dan route handler.

## Aturan bisnis yang TIDAK boleh diubah
- Absen dan jurnal disetujui dua tingkat: MENUNGGU_SUPERVISOR -> MENUNGGU_GURU -> DISETUJUI. Penolakan wajib beralasan. Yang disetujui terkunci.
- Absen memakai foto kamera langsung, jam dari server, lokasi dalam radius DU/DI, satu catatan per penempatan per tanggal.
- Semua validasi dan pemeriksaan hak akses tetap di server.
- Foto absen dan bukti bersifat privat, ditampilkan lewat signed URL.

## Struktur penting
app/_components (komponen bersama), lib/ (prisma, supabase, akses, status, rekap, tanggal, gambar, lokasi, urlGambar), app/api/* (route handler), prisma/schema.prisma.

## Istilah di antarmuka (ikuti buku panduan PKL sekolah)
Supervisor = Pembimbing DU/DI. Tempat PKL = DU/DI. Jurusan = Paket Keahlian. Guru pembimbing = Pembimbing sekolah. Nama di kode tidak diubah, hanya teks yang tampil.

## Gaya kerja
- Teks antarmuka bahasa Indonesia.
- Pemilik proyek pemula: jelaskan perubahan dengan bahasa sederhana.
- Jangan menambah library tanpa bertanya dulu.
- Jangan membuka atau menampilkan isi .env.
- Kerjakan langkah kecil, tunjukkan rencana dulu, dan jangan mengubah logika di luar permintaan.