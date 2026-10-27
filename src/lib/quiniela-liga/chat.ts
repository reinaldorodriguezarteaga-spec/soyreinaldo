/**
 * Chat de cada quiniela (27-oct, migración 092): reglas del texto y mensajes
 * automáticos del sistema. Lo que se escribe pasa siempre por el servidor.
 */

export const MAX_TEXTO = 500;
/** Ritmo: como mucho estos mensajes en esta ventana por persona. */
export const RITMO = { mensajes: 6, segundos: 30 };
export const EMOJIS = ["👍", "😂", "🔥", "😮", "😢", "⚽"] as const;
export type Emoji = (typeof EMOJIS)[number];
/** Con tantos reportes de personas distintas, el mensaje se oculta solo. */
export const REPORTES_PARA_OCULTAR = 3;

// Insultos graves y odio: se tapan con asteriscos (el filtro que piden
// Apple y Google para contenido de usuarios). Las palabrotas de fútbol
// normales se dejan: es una quiniela entre amigos, no un colegio.
const PROHIBIDAS = [
  "maric[oó]n(es)?",
  "sudaca(s)?",
  "negrat[ao]s?",
  "panchit[ao]s?",
  "subnormal(es)?",
  "retrasad[ao]s? mental(es)?",
  "moro de mierda",
];
const RE_PROHIBIDAS = new RegExp(`\\b(${PROHIBIDAS.join("|")})\\b`, "giu");
// Enlaces: solo a la propia web (fuera spam y estafas).
const RE_ENLACE = /\b(?:https?:\/\/|www\.)\S+/gi;

/** Limpia y filtra un mensaje. null si queda vacío. */
export function filtrarTexto(bruto: string): string | null {
  const texto = bruto
    // Sin caracteres de control ni saltos de línea en ráfaga.
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXTO)
    .replace(RE_PROHIBIDAS, (m) => m[0] + "*".repeat(Math.max(2, m.length - 1)))
    .replace(RE_ENLACE, (url) => (/soyreinaldo\.com/i.test(url) ? url : "[enlace quitado]"));
  return texto.length > 0 ? texto : null;
}

/** «🎯 Exacto en Barça 1-2 Madrid: Ana, Luis y 3 más». */
export function textoExactos(local: string, visitante: string, gl: number, gv: number, nombres: string[]): string {
  const lista =
    nombres.length <= 3
      ? nombres.join(nombres.length === 2 ? " y " : ", ")
      : `${nombres.slice(0, 3).join(", ")} y ${nombres.length - 3} más`;
  return `🎯 ${nombres.length === 1 ? "Exacto" : "Exactos"} en ${local} ${gl}-${gv} ${visitante}: ${lista}. ¡Máquina${nombres.length === 1 ? "" : "s"}!`;
}
