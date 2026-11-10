/**
 * Lo del «Ahorcado» que necesita también el navegador: la partida y cómo se
 * comparan letras. Los datos se quedan en el servidor (`ahorcado.ts`).
 */

export const MAX_FALLOS = 5;

/** Ligas de los jugadores: la pista que se ve desde el principio. */
export const LIGAS_AHORCADO: Record<number, string> = {
  140: "LaLiga",
  39: "Premier League",
  78: "Bundesliga",
  61: "Ligue 1",
  135: "Serie A",
  94: "Liga Portugal",
};

/** Partes del muñeco, en el orden del dueño: cabeza, piernas y brazos. */
export const PARTES = ["cabeza", "pierna izquierda", "pierna derecha", "brazo izquierdo", "brazo derecho"] as const;

export type PartidaAhorcado = {
  id: number;
  /** Nombre completo, el que se enseña al final («Lamine Yamal»). */
  nombre: string;
  /** Lo que se adivina: solo el apellido («Yamal»), que es más fácil
   * (pedido del dueño, 10-nov). Los de un solo nombre, tal cual («Pedri»). */
  palabra: string;
  liga: { id: number; nombre: string };
  equipo: { id: number; nombre: string };
  pais: string | null;
  posicion: string | null;
};

/** Letra del teclado para una del nombre: sin tildes, salvo la Ñ. Lo que no
 * es letra (espacios, guiones, apóstrofos) devuelve null y se ve desde el
 * principio. */
export function letraBase(c: string): string | null {
  const m = c.toUpperCase();
  if (m === "Ñ") return "Ñ";
  const base = m.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  // Letras sin descomposición (Ø, Ł, ß…): a su letra más parecida.
  const raras: Record<string, string> = { Ø: "O", Ł: "L", Đ: "D", ß: "S", Æ: "A", Œ: "O" };
  const l = raras[base] ?? base;
  return /^[A-Z]$/.test(l) ? l : null;
}

/** Letras distintas que hay que acertar. */
export const letrasDe = (nombre: string) => new Set([...nombre].map(letraBase).filter((x): x is string => !!x));

export const TECLADO = ["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"];
