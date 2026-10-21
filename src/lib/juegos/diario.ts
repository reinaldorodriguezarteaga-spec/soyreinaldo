/**
 * Lo común a los retos diarios de /juegos: qué día es (en Madrid) y un
 * barajado fijo para que todos vean el mismo reto sin guardar nada.
 */

/** Día 1 de los retos diarios. */
const INICIO = Date.UTC(2026, 9, 22);

/** Número del reto del día según la fecha de Madrid (1 = 22-oct-2026). */
export function numeroDelDia(ahora = new Date()): number {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" })
    .format(ahora)
    .split("-")
    .map(Number);
  return Math.max(1, Math.floor((Date.UTC(y, m - 1, d) - INICIO) / 86_400_000) + 1);
}

/** Generador pseudoaleatorio con semilla (LCG de 32 bits): mismo número,
 * misma secuencia en cualquier navegador. */
export function aleatorio(semilla: number): () => number {
  let s = Math.imul(semilla + 1, 2654435761) >>> 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 4294967296;
  };
}

/** El elemento del día `numero` de `lista`: cada vuelta completa sale en
 * otro orden y nada se repite hasta haber salido todo. */
export function delDia<T>(lista: readonly T[], numero: number): T {
  const i = numero - 1;
  const azar = aleatorio(Math.floor(i / lista.length));
  const r = [...lista];
  for (let k = r.length - 1; k > 0; k--) {
    const m = Math.floor(azar() * (k + 1));
    [r[k], r[m]] = [r[m], r[k]];
  }
  return r[i % lista.length];
}

/** Quita tildes y mayúsculas para buscar nombres. */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
