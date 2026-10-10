import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pastikan file font untuk cap foto ikut terbawa saat deploy ke Vercel
  outputFileTracingIncludes: {
    "/api/absen": ["./lib/fonts/**/*"],
  },
};

export default nextConfig;