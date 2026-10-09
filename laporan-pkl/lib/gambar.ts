export async function kecilkanGambar(file: File, lebarMax = 1280, kualitas = 0.75): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const skala = Math.min(1, lebarMax / bmp.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * skala);
  canvas.height = Math.round(bmp.height * skala);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", kualitas));
  if (!blob) throw new Error("Gagal memproses gambar.");
  return blob;
}