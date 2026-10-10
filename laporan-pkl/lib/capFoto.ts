import sharp from "sharp";
import path from "node:path";

// Font disertakan di dalam proyek supaya tulisan tidak jadi kotak kosong di server (misalnya Vercel).
const FONT_TEBAL = path.join(process.cwd(), "lib", "fonts", "Lato-Bold.ttf");
const FONT_BIASA = path.join(process.cwd(), "lib", "fonts", "Lato-Regular.ttf");

const escapeMarkup = (teks: string) =>
  teks.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function formatWaktu(waktu: Date): string {
  const tanggal = waktu.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const jam = waktu
    .toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    })
    .replace(/\./g, ":");
  return `${tanggal} · ${jam} WIB`;
}

async function barisTeks(teks: string, tebal: boolean, ukuran: number, lebarMaks: number) {
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="white">${escapeMarkup(teks)}</span>`,
      font: `Lato ${tebal ? "Bold" : "Regular"} ${ukuran}`,
      fontfile: tebal ? FONT_TEBAL : FONT_BIASA,
      width: lebarMaks,
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, tinggi: info.height };
}

/** Mencetak nama, waktu server (WIB), dan keterangan jarak di pojok bawah foto. */
export async function beriCap(
  jpeg: Buffer,
  data: { nama: string; waktu: Date; keterangan: string }
): Promise<Buffer> {
  const gambar = sharp(jpeg).rotate();
  const { width = 1280, height = 960 } = await gambar.metadata();

  const pad = Math.round(width * 0.025);
  const ukuran = Math.max(14, Math.round(width * 0.03));
  const lebarTeks = width - pad * 2;
  const jarakBaris = Math.round(ukuran * 0.25);

  const [nama, waktu, ket] = await Promise.all([
    barisTeks(data.nama, true, Math.round(ukuran * 1.15), lebarTeks),
    barisTeks(formatWaktu(data.waktu), false, ukuran, lebarTeks),
    barisTeks(data.keterangan, false, ukuran, lebarTeks),
  ]);

  const tinggiBar = pad * 2 + nama.tinggi + waktu.tinggi + ket.tinggi + jarakBaris * 2;
  const atasBar = Math.max(0, height - tinggiBar);

  const latar = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${tinggiBar}">` +
      `<rect width="100%" height="100%" fill="black" fill-opacity="0.6"/></svg>`
  );

  let y = atasBar + pad;
  const lapis: sharp.OverlayOptions[] = [{ input: latar, left: 0, top: atasBar }];
  for (const baris of [nama, waktu, ket]) {
    lapis.push({ input: baris.input, left: pad, top: y });
    y += baris.tinggi + jarakBaris;
  }

  return gambar.composite(lapis).jpeg({ quality: 85 }).toBuffer();
}