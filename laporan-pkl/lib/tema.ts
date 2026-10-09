export const KUNCI_TEMA = "laporan-pkl-tema";

export type PilihanTema = "light" | "dark" | "system";

export function pilihanTemaValid(nilai: string | null): nilai is PilihanTema {
  return nilai === "light" || nilai === "dark" || nilai === "system";
}