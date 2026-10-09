import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

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
    <main className="min-h-screen flex items-center justify-center p-4">
      <form action={masuk} className="w-full max-w-sm space-y-4 border rounded-xl p-6">
        <h1 className="text-xl font-bold">Masuk Laporan PKL</h1>
        {error && <p className="text-red-600 text-sm">Email atau kata sandi salah.</p>}
        <input name="email" type="email" placeholder="Email" required className="w-full border rounded p-2" />
        <input name="password" type="password" placeholder="Kata sandi" required className="w-full border rounded p-2" />
        <button type="submit" className="w-full bg-blue-600 text-white rounded p-2">Masuk</button>
      </form>
    </main>
  );
}