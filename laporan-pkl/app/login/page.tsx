import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import PemilihTema from "@/app/_components/PemilihTema";
import PitaBatik from "@/app/_components/PitaBatik";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function masuk(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/dashboard",
      });
    } catch (e) {
      if (e instanceof AuthError) redirect("/login?error=1");
      throw e;
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 pb-16">
      {/* Foto gedung sebagai latar, dibuat samar */}
     <Image
  src="/brand/gedung-sekolah.png"
  alt=""
  fill
  sizes="100vw"
  priority
  className="object-cover"
/>
      /
      <div className="absolute inset-0 bg-background/70" aria-hidden="true" />

      <div className="absolute right-4 top-4 z-10">
        <PemilihTema />
      </div>

      <form
        action={masuk}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border bg-surface shadow-lg"
      >
        <PitaBatik tinggi={18} />

        <div className="space-y-4 p-6">
          <div className="text-center">
            <Image
              src="/brand/logo-smkn1pacitan.webp"
              alt="Logo SMK Negeri 1 Pacitan"
              width={80}
              height={80}
              className="mx-auto h-16 w-16 object-contain"
              priority
            />
            <div className="mx-auto mt-3 w-fit rounded-xl bg-white px-2 py-1">
              <Image
                src="/brand/wordmark-smkn1pacitan.png"
                alt="SMKN 1 Pacitan"
                width={300}
                height={85}
                className="h-auto w-[260px]"
              />
            </div>
            <h1 className="mt-3 text-xl font-bold">Laporan PKL Digital</h1>
            <p className="mt-1 text-sm opacity-70">Masuk untuk melanjutkan</p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-100 p-2 text-sm text-red-700">
              Email atau kata sandi salah.
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              required
              className="w-full rounded-lg border bg-surface p-2.5 focus:outline-none focus:ring-2 focus:ring-hijau-aksen"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Kata sandi
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Kata sandi"
              required
              className="w-full rounded-lg border bg-surface p-2.5 focus:outline-none focus:ring-2 focus:ring-hijau-aksen"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-hijau-tombol p-2.5 font-semibold text-white hover:bg-hijau-aksen"
          >
            Masuk
          </button>
        </div>
      </form>

      {/* Pita batik biru dan hijau di bagian bawah halaman */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <PitaBatik tinggi={44} />
      </div>
    </main>
  );
}