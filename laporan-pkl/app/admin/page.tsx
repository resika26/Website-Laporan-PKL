import { signOut } from "@/auth";
import { wajibPeran } from "@/lib/akses";

export default async function AdminPage() {
  const session = await wajibPeran("ADMIN");

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Halaman Admin</h1>
      <p>Halo, {session.user.name}</p>

      {/* Tambahkan bagian ini di bawah tulisan Halo */}
      <div className="flex gap-2 flex-wrap">
        <a href="/admin/pengguna" className="inline-block border rounded px-3 py-1">
          Kelola akun
        </a>
        <a href="/admin/tempat-pkl" className="inline-block border rounded px-3 py-1">
          Tempat PKL
        </a>
        <a href="/admin/penempatan" className="inline-block border rounded px-3 py-1">
          Penempatan
        </a>
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button className="border rounded px-3 py-1">Keluar</button>
      </form>
    </main>
  );
}