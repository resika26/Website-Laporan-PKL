import { supabaseAdmin, BUCKET_PROJECT } from "@/lib/supabase";

export const GALERI_PUBLIK = false;

let bucketSiap: Promise<void> | null = null;

export function pastikanBucketProject() {
  if (!bucketSiap) {
    bucketSiap = (async () => {
      const { data, error } = await supabaseAdmin.storage.listBuckets();
      if (error) throw error;

      const bucket = data.find((item) => item.id === BUCKET_PROJECT || item.name === BUCKET_PROJECT);
      if (!bucket) {
        const hasil = await supabaseAdmin.storage.createBucket(BUCKET_PROJECT, {
          public: false,
          fileSizeLimit: "1500000",
          allowedMimeTypes: ["image/jpeg"],
        });
        if (hasil.error) throw hasil.error;
        return;
      }

      if (bucket.public || Number(bucket.file_size_limit) !== 1_500_000) {
        const hasil = await supabaseAdmin.storage.updateBucket(BUCKET_PROJECT, {
          public: false,
          fileSizeLimit: "1500000",
          allowedMimeTypes: ["image/jpeg"],
        });
        if (hasil.error) throw hasil.error;
      }
    })().catch((error: unknown) => {
      bucketSiap = null;
      throw error;
    });
  }
  return bucketSiap;
}

export async function urlGambarProject(jalur: string[]) {
  const hasil = new Map<string, string>();
  if (jalur.length === 0) return hasil;

  const { data } = await supabaseAdmin.storage
    .from(BUCKET_PROJECT)
    .createSignedUrls(jalur, 600);
  data?.forEach((item) => {
    if (item.path && item.signedUrl) hasil.set(item.path, item.signedUrl);
  });
  return hasil;
}