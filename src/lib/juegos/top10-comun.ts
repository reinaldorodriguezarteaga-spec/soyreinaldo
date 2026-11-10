import { normalizar } from "./diario";

/**
 * Lo del «Top 10» que necesita también el navegador: tipos de la partida y
 * cómo se comprueba un nombre escrito. Los datos se quedan en el servidor
 * (`top10.ts`).
 */

export type TipoTop10 = "minutos" | "goles" | "asistencias";

export type FilaTop10 = { pos: number; valor: number; bandera: string | null; pais: string | null; nombre: string; alias: string[] };
export type PartidaTop10 = {
  id: string;
  titulo: string;
  subtitulo: string;
  equipoId: number;
  tipo: TipoTop10;
  filas: FilaTop10[];
};

/** Minúsculas, sin tildes ni signos, espacios simples. */
export const plano = (s: string) =>
  normalizar(s)
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Un jugador tal como lo guarda `top10-datos.json`: nombre de la API,
 * nombre, apellidos, nacionalidad y código de bandera. */
export type JugadorTop10 = { n: string; f: string | null; l: string | null; p: string | null; b: string | null };

/** Palabras que no sirven solas para acertar a un jugador. */
const VACIAS = new Set(["de", "da", "do", "dos", "das", "del", "la", "le", "el", "van", "von", "der", "den", "di", "jr", "junior", "filho", "neto"]);

/** Todo lo que vale como respuesta para un jugador, ya normalizado. */
export function aliasDe(j: JugadorTop10, extra: { nombre?: string; alias?: string[] } = {}): string[] {
  // «L. Messi» también vale como «Lionel Messi».
  const pila = j.f?.split(" ")[0];
  const conPila = pila ? j.n.replace(/^\p{L}\.\s*/u, `${pila} `) : null;
  const nombres = [extra.nombre, j.n, conPila, j.l, j.f && j.l ? `${j.f} ${j.l}` : null, ...(extra.alias ?? [])].filter(
    (x): x is string => !!x,
  );
  const todos = new Set<string>();
  for (const nombre of nombres) {
    // «L. Messi» → «messi»: las iniciales no cuentan.
    const limpio = plano(nombre.replace(/\b\p{L}\.\s*/gu, ""));
    if (limpio.length >= 3) todos.add(limpio);
    for (const parte of limpio.split(" ")) if (parte.length >= 4 && !VACIAS.has(parte)) todos.add(parte);
  }
  return [...todos];
}

/** ¿El texto escrito es este jugador? (`alias` ya viene normalizado). */
export function acierta(escrito: string, alias: string[]): boolean {
  const e = plano(escrito);
  if (e.length < 3) return false;
  return alias.includes(e) || alias.includes(e.replace(/ /g, ""));
}

/** «2.952» */
export const miles = (n: number) => n.toLocaleString("es-ES");
