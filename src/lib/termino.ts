/**
 * "Quiniela" → "Adivina el marcador" DENTRO DE LA APP. En la web se sigue
 * llamando quiniela.
 *
 * Historia: Apple rechazó la 1.0 por "simulated gambling" (16-oct): en España
 * "quiniela" es el nombre de la apuesta del Estado. Pasó a "liga de
 * pronósticos" y la 1.0 se aprobó, pero la 1.1 la rechazaron dos veces
 * (4 y 5-nov) por lo mismo: "pronósticos" también suena a apuestas
 * deportivas. Decisión del dueño (5-nov): el juego se llama "Adivina el
 * marcador" y los pronósticos pasan a ser "marcadores". El juego es gratis,
 * sin dinero, fichas ni premios: solo puntos.
 *
 * El orden importa: primero las frases hechas (para que cuadren artículos y
 * preposiciones), luego las palabras sueltas. "Adivina el marcador" es el
 * nombre del juego; donde la frase pide un sustantivo contable ("tu
 * quiniela", "las quinielas") queda "liga", que es femenino como quiniela.
 * ⚠️ No volver a enseñar "quiniela" ni "pronóstico" en la app (2.3.1).
 */
const JUEGO = "Adivina el marcador";

type Por = string | ((...g: string[]) => string);

const REGLAS: [RegExp, Por][] = [
  // --- Quiniela: frases ---
  [/ligas de pronósticos \(quinielas\)/g, `ligas de ${JUEGO}`],
  [/QUINIELAS/g, "LIGAS"],
  [/QUINIELA/g, JUEGO.toUpperCase()],
  [/Postquiniela/g, "Postliga"],
  [/[Qq]uiniela de los conos/g, "liga de los conos"],
  [/\. Pronostica el marcador y/g, ": pon tu marcador y"],
  [/Juega la quiniela/g, `Juega a ${JUEGO}`],
  [/Ver la quiniela/g, "Ver la clasificación"],
  [/\b(a|de|en|desde) la [Qq]uiniela/g, `$1 ${JUEGO}`],
  [/\bLa Quiniela\b/g, JUEGO],
  [/\b(una|tu|esta|su|la|mi|nuestra|Una|Tu|Esta|Su|La|Mi|Nuestra) quiniela/g, "$1 liga"],
  [/\b(las|tus|mis|Las|Tus|Mis) quinielas/g, "$1 ligas"],
  [/Quiniela privada/g, "Liga privada"],
  [/Quinielas/g, "Ligas"],
  [/quinielas/g, "ligas"],
  [/Quiniela/g, JUEGO],
  [/quiniela/g, JUEGO],
  // --- Pronósticos: frases ---
  [/Pronostica el marcador/g, JUEGO],
  [/pronostica el marcador/g, "adivina el marcador"],
  [/Lo que pronostica la comunidad/g, "El marcador de la comunidad"],
  [/(no )?(?:lo )?ha pronosticado(?: este partido)?/g, (_m, no) => `${no ?? ""}ha puesto su marcador`],
  [/has pronosticado/g, "has puesto marcador a"],
  [/pronosticaste/g, "pusiste marcador a"],
  [/pronosticó/g, "jugó"],
  [/pronosticando/g, "adivinando"],
  [/Pronosticas/g, "Adivinas"],
  [/Pronosticar/g, "Jugar"],
  [/pronosticar/g, "jugar"],
  [/Pronostica\b/g, "Adivina"],
  [/pronostica\b/g, "adivina"],
  [/ligas de pronósticos/g, `ligas de ${JUEGO}`],
  [/Pronósticos/g, "Marcadores"],
  [/pronósticos/g, "marcadores"],
  [/Pronóstico/g, "Marcador"],
  [/pronóstico/g, "marcador"],
];

export function sinQuiniela(texto: string): string {
  let t = texto;
  for (const [re, por] of REGLAS) t = typeof por === "string" ? t.replace(re, por) : t.replace(re, por);
  return t;
}

/**
 * Sin "quiniela" ni "pronóstico", EN TODAS PARTES (web y app) desde el
 * 23-nov-2026: en la llamada con App Review, Apple dijo que al traducir la
 * web «quiniela» sale como «pool» (bote de dinero). El dueño pidió que no
 * salga en ningún lado. `enApp` se mantiene para no tocar a quien lo llama.
 */
export function termino(texto: string, _enApp?: boolean): string {
  return sinQuiniela(texto);
}
