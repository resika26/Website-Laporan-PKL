"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import imageCompression from "browser-image-compression";
import Link from "next/link";
import { LABEL_STATUS } from "@/lib/status";

interface StatusHariIni {
  tanggal: string;
  penempatan: { tempat: string; lat: number; lng: number; radiusMeter: number } | null;
  diLuarPeriode: boolean;
  akhirPekan: boolean;
  libur: string | null;
  absensi: {
    jenis: string;
    status: string;
    jamMasuk: string | null;
    jamPulang: string | null;
    catatan: string | null;
  } | null;
}

// Hanya untuk tampilan di layar. Penilaian resmi radius tetap dilakukan server.
function jarakMeter(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function AbsenPanel({ nama }: { nama: string }) {
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "gagal"; teks: string } | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [lokasi, setLokasi] = useState<{ lat: number; lng: number } | null>(null);
  const [errLokasi, setErrLokasi] = useState<string | null>(null);
  const [statusHariIni, setStatusHariIni] = useState<StatusHariIni | null>(null);
  const [sekarang, setSekarang] = useState<Date | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Jam di layar (hanya tampilan)
  useEffect(() => {
    const tik = () => setSekarang(new Date());
    queueMicrotask(tik);
    const id = setInterval(tik, 1000);
    return () => clearInterval(id);
  }, []);

  // Ambil status absen hari ini dari server
  const muatStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/absen");
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusHariIni(data);
      }
    } catch {
      // Abaikan jika gagal memuat status
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch("/api/absen")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data?.ok) {
          setStatusHariIni(data);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  // 1. Ambil Lokasi GPS
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      queueMicrotask(() => {
        setErrLokasi("Browser ini tidak mendukung lokasi. Coba pakai browser lain.");
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLokasi({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const teks =
          err.code === 1
            ? "Izin lokasi ditolak. Izinkan akses lokasi di pengaturan browser, lalu muat ulang halaman."
            : "Lokasi belum terdeteksi. Pastikan GPS aktif, lalu muat ulang halaman.";
        setErrLokasi(teks);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // 2. Jalankan Kamera
  useEffect(() => {
    let batal = false;
    async function jalankanKamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Kamera tidak didukung oleh browser ini.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (batal) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (!batal) {
          setPesan({
            tipe: "gagal",
            teks: "Kamera belum bisa dipakai. Izinkan akses kamera di pengaturan browser, lalu muat ulang halaman.",
          });
        }
      }
    }

    jalankanKamera();

    return () => {
      batal = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // 3. Ambil Foto & Kompresi
  const ambilFoto = async () => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) {
      setPesan({ tipe: "gagal", teks: "Tunggu sebentar sampai kamera siap." });
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], "foto-absen.jpg", { type: "image/jpeg" });

        const opsi = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: false };
        try {
          const fotoTerkompresi = await imageCompression(file, opsi);
          setFoto(fotoTerkompresi);
          setPratinjau(URL.createObjectURL(fotoTerkompresi));
        } catch {
          setFoto(file);
          setPratinjau(URL.createObjectURL(file));
        }
      },
      "image/jpeg",
      0.85
    );
  };

  const ulangiFoto = () => {
    if (pratinjau) {
      URL.revokeObjectURL(pratinjau);
    }
    setPratinjau(null);
    setFoto(null);
  };

  // 4. Kirim Absen ke Server
  const kirimAbsen = async (jenis: "masuk" | "pulang") => {
    if (!foto) return setPesan({ tipe: "gagal", teks: "Ambil foto terlebih dahulu." });
    if (!lokasi) return setPesan({ tipe: "gagal", teks: errLokasi || "Lokasi GPS belum terdeteksi." });

    setLoading(true);
    setPesan(null);

    const formData = new FormData();
    formData.append("jenis", jenis);
    formData.append("lat", String(lokasi.lat));
    formData.append("lng", String(lokasi.lng));
    formData.append("foto", foto);

    try {
      const res = await fetch("/api/absen", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.pesan || "Terjadi kesalahan saat mengirim absen.");
      setPesan({ tipe: "sukses", teks: data.pesan });
      ulangiFoto();
      await muatStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim absen.";
      setPesan({ tipe: "gagal", teks: msg });
    } finally {
      setLoading(false);
    }
  };

  const sudahMasuk = Boolean(statusHariIni?.absensi?.jamMasuk);
  const sudahPulang = Boolean(statusHariIni?.absensi?.jamPulang);
  const tidakBisaAbsen =
    statusHariIni?.libur !== null && statusHariIni?.libur !== undefined
      ? Boolean(statusHariIni.libur)
      : Boolean(statusHariIni?.akhirPekan || statusHariIni?.diLuarPeriode);

  // ---- Bahan tampilan di atas kamera (hanya visual) ----
  const penempatan = statusHariIni?.penempatan ?? null;
  const jarak =
    lokasi && penempatan
      ? jarakMeter(lokasi.lat, lokasi.lng, penempatan.lat, penempatan.lng)
      : null;
  const dalamRadius = jarak !== null && penempatan ? jarak <= penempatan.radiusMeter : null;

  const teksRadius =
    jarak !== null && penempatan
      ? dalamRadius
        ? `Dalam radius · ${Math.round(jarak)} m dari DU/DI`
        : `Di luar radius · ${Math.round(jarak)} m (batas ${penempatan.radiusMeter} m)`
      : errLokasi
      ? "Lokasi belum tersedia"
      : "Mencari lokasi GPS...";
  const kelasRadius =
    dalamRadius === true
      ? "bg-green-600 text-white"
      : dalamRadius === false
      ? "bg-red-600 text-white"
      : "bg-gray-600 text-white";

  const tanggalTeks = sekarang
    ? sekarang.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      })
    : "";
  const jamTeks = sekarang
    ? sekarang.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Jakarta",
      })
    : "--.--.--";

  const tombolAbsen =
    "rounded-xl bg-hijau-tombol py-4 text-base font-bold text-white hover:bg-hijau-aksen disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm font-semibold text-biru hover:underline">
          ← Dashboard
        </Link>
        <span className="text-xs text-muted">{statusHariIni?.tanggal ?? "Hari ini"}</span>
      </div>

      <h1 className="text-center text-xl font-bold">Absensi Masuk &amp; Pulang</h1>

      {/* Info status hari ini */}
      {penempatan && (
        <section className="space-y-1 rounded-2xl border bg-surface p-4 text-sm">
          <div>
            <b>DU/DI:</b> {penempatan.tempat}
          </div>
          <div>
            <b>Batas radius:</b> {penempatan.radiusMeter} meter
          </div>
          {statusHariIni?.libur && (
            <div className="font-semibold text-amber-700">Hari ini libur: {statusHariIni.libur}</div>
          )}
          {statusHariIni?.akhirPekan && (
            <div className="font-semibold text-amber-700">Hari ini bukan hari kerja di DU/DI kamu.</div>
          )}
          {statusHariIni?.diLuarPeriode && (
            <div className="font-semibold text-red-600">
              Hari ini di luar rentang tanggal periode PKL kamu.
            </div>
          )}
          {statusHariIni?.absensi && (
            <div className="space-y-1 border-t pt-2">
              <div>
                <b>Absen masuk:</b>{" "}
                {statusHariIni.absensi.jamMasuk
                  ? new Date(statusHariIni.absensi.jamMasuk).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Belum"}
              </div>
              <div>
                <b>Absen pulang:</b>{" "}
                {statusHariIni.absensi.jamPulang
                  ? new Date(statusHariIni.absensi.jamPulang).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Belum"}
              </div>
              <div>
                <b>Status persetujuan:</b>{" "}
                <span className="font-semibold text-biru">
                  {LABEL_STATUS[statusHariIni.absensi.status]?.teks ?? statusHariIni.absensi.status}
                </span>
              </div>
              {statusHariIni.absensi.status === "DITOLAK" && statusHariIni.absensi.catatan && (
                <p className="text-red-600">
                  <b>Alasan penolakan:</b> {statusHariIni.absensi.catatan}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {pesan && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            pesan.tipe === "sukses"
              ? "border-green-400 bg-green-100 text-green-700"
              : "border-red-400 bg-red-100 text-red-700"
          }`}
        >
          {pesan.teks}
        </div>
      )}

      {/* Kamera / pratinjau, dengan teks di bagian bawah gambar */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border bg-black sm:aspect-[4/3]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${pratinjau ? "hidden" : "block"}`}
        />
        {pratinjau && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pratinjau} alt="Hasil foto kamera" className="h-full w-full object-cover" />
        )}

        <div
          className="absolute inset-x-0 bottom-0 p-3 pt-12 text-white"
          style={{ backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))" }}
        >
          <div className="text-sm font-bold">{nama}</div>
          <div className="text-xs opacity-90">{tanggalTeks}</div>
          <div className="text-xl font-bold leading-tight tabular-nums">{jamTeks}</div>
          <span
            className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${kelasRadius}`}
          >
            {teksRadius}
          </span>
        </div>
      </div>
      <p className="text-center text-xs text-muted">
        Teks di atas hanya tampilan, belum tercetak di foto. Jam resmi absen memakai jam server.
      </p>

      {pratinjau ? (
        <button
          onClick={ulangiFoto}
          className="w-full rounded-xl border py-3 text-sm font-semibold hover:border-hijau-aksen"
        >
          Foto ulang
        </button>
      ) : (
        <button
          onClick={ambilFoto}
          className="w-full rounded-xl bg-hijau-tombol py-4 text-base font-bold text-white hover:bg-hijau-aksen"
        >
          Ambil foto
        </button>
      )}

      <div className="text-center text-xs text-muted">
        {lokasi
          ? `Lokasi GPS: ${lokasi.lat.toFixed(5)}, ${lokasi.lng.toFixed(5)}`
          : errLokasi || "Mencari lokasi GPS..."}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => kirimAbsen("masuk")}
          disabled={loading || !foto || !lokasi || sudahMasuk || tidakBisaAbsen}
          className={tombolAbsen}
        >
          {loading ? "Proses..." : sudahMasuk ? "Sudah masuk" : "Absen masuk"}
        </button>
        <button
          onClick={() => kirimAbsen("pulang")}
          disabled={loading || !foto || !lokasi || !sudahMasuk || sudahPulang || tidakBisaAbsen}
          className={tombolAbsen}
        >
          {loading ? "Proses..." : sudahPulang ? "Sudah pulang" : "Absen pulang"}
        </button>
      </div>

      <div className="pt-1 text-center">
        <Link href="/dashboard/izin" className="text-sm font-semibold text-amber-700 hover:underline">
          Berhalangan hadir? Ajukan izin atau sakit di sini →
        </Link>
      </div>
    </main>
  );
}