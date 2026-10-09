import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import PemilihTema from "@/app/_components/PemilihTema";

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
    <main className="relative min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <PemilihTema />
      </div>
      <form action={masuk} className="w-full max-w-sm space-y-4 rounded-xl border bg-surface p-6">
        <Image
          src="/brand/logo-smkn1pacitan.webp"
          alt="Logo SMK Negeri 1 Pacitan"
          width={96}
          height={96}
          className="mx-auto h-24 w-24 object-contain"
          priority
        />
        <h1 className="text-xl font-bold">Masuk Laporan PKL</h1>
        {error && <p className="text-red-600 text-sm">Email atau kata sandi salah.</p>}
        <input name="email" type="email" placeholder="Email" required className="w-full border rounded p-2" />
        <input name="password" type="password" placeholder="Kata sandi" required className="w-full border rounded p-2" />
        <button type="submit" className="w-full bg-hijau-tombol hover:bg-hijau-aksen text-white rounded p-2">Masuk</button>
      </form>
    </main>
  );
}