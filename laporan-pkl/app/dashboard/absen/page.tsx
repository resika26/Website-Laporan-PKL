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

export default function HalamanAbsenSiswa() {
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "gagal"; teks: string } | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [lokasi, setLokasi] = useState<{ lat: number; lng: number } | null>(null);
  const [errLokasi, setErrLokasi] = useState<string | null>(null);
  const [statusHariIni, setStatusHariIni] = useState<StatusHariIni | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
        setErrLokasi("Geolokasi tidak didukung oleh browser Anda.");
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLokasi({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const teks =
          err.code === 1
            ? "Izin lokasi ditolak. Silakan izinkan akses lokasi."
            : "Gagal mengambil lokasi GPS. Pastikan GPS aktif.";
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
            teks: "Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan.",
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
      setPesan({ tipe: "gagal", teks: "Tunggu hingga kamera siap." });
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
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
    }, "image/jpeg", 0.85);
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

  return (
    <main className="max-w-md mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Dashboard
        </Link>
        <span className="text-xs text-gray-500">
          {statusHariIni?.tanggal ?? "Hari ini"}
        </span>
      </div>

      <h1 className="text-xl font-bold text-center">Absensi Masuk & Pulang</h1>

      {/* Info status hari ini */}
      {statusHariIni?.penempatan && (
        <div className="bg-gray-50 border rounded-lg p-3 text-xs space-y-1">
          <div>
            <b>Tempat PKL:</b> {statusHariIni.penempatan.tempat}
          </div>
          <div>
            <b>Batas Radius:</b> {statusHariIni.penempatan.radiusMeter} meter
          </div>
          {statusHariIni.libur && (
            <div className="text-amber-700 font-semibold">
              Hari ini libur: {statusHariIni.libur}
            </div>
          )}
          {statusHariIni.akhirPekan && (
            <div className="text-amber-700 font-semibold">
              Hari ini akhir pekan (bukan hari kerja).
            </div>
          )}
          {statusHariIni.diLuarPeriode && (
            <div className="text-red-600 font-semibold">
              Hari ini di luar rentang tanggal periode PKL Anda.
            </div>
          )}
          {statusHariIni.absensi && (
            <div className="pt-1 border-t space-y-1">
              <div>
                <b>Absen Masuk:</b>{" "}
                {statusHariIni.absensi.jamMasuk
                  ? new Date(statusHariIni.absensi.jamMasuk).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Belum"}
              </div>
              <div>
                <b>Absen Pulang:</b>{" "}
                {statusHariIni.absensi.jamPulang
                  ? new Date(statusHariIni.absensi.jamPulang).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Belum"}
              </div>
              <div>
                <b>Status Persetujuan:</b>{" "}
                <span className="font-semibold text-blue-700">
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
        </div>
      )}

      {pesan && (
        <div
          className={`p-3 rounded border text-sm ${
            pesan.tipe === "sukses"
              ? "bg-green-100 border-green-400 text-green-700"
              : "bg-red-100 border-red-400 text-red-700"
          }`}
        >
          {pesan.teks}
        </div>
      )}

      {/* Video & Pratinjau Foto */}
      <div className="border rounded-lg overflow-hidden bg-black aspect-video relative flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${pratinjau ? "hidden" : "block"}`}
        />
        {pratinjau && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pratinjau} alt="Hasil foto kamera" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="flex justify-center gap-2">
        {pratinjau ? (
          <button
            onClick={ulangiFoto}
            className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200 text-sm font-medium"
          >
            Foto Ulang
          </button>
        ) : (
          <button
            onClick={ambilFoto}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold"
          >
            Ambil Foto
          </button>
        )}
      </div>

      <div className="text-xs text-center text-gray-500">
        {lokasi
          ? `Lokasi GPS: ${lokasi.lat.toFixed(5)}, ${lokasi.lng.toFixed(5)}`
          : errLokasi || "Mencari lokasi GPS..."}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={() => kirimAbsen("masuk")}
          disabled={loading || !foto || !lokasi || sudahMasuk || tidakBisaAbsen}
          className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Proses..." : sudahMasuk ? "Sudah Masuk" : "Absen Masuk"}
        </button>
        <button
          onClick={() => kirimAbsen("pulang")}
          disabled={loading || !foto || !lokasi || !sudahMasuk || sudahPulang || tidakBisaAbsen}
          className="py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Proses..." : sudahPulang ? "Sudah Pulang" : "Absen Pulang"}
        </button>
      </div>

      <div className="text-center pt-2">
        <Link href="/dashboard/izin" className="text-xs text-amber-700 hover:underline font-medium">
          Berhalangan hadir? Ajukan Izin atau Sakit di sini →
        </Link>
      </div>
    </main>
  );
}