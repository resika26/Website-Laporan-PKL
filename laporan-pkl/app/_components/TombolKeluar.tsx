import { signOut } from "@/auth";

export default function TombolKeluar() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button className="border rounded px-3 py-1 text-sm">Keluar</button>
    </form>
  );
}