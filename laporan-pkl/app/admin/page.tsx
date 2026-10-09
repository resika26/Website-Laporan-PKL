import { wajibPeran } from "@/lib/akses";

export default async function AdminPage() {
  await wajibPeran("ADMIN");

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Halaman Admin</h1>
    </main>
  );
}