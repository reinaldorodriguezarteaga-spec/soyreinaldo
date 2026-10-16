/**
 * "Quiniela" → "liga de pronósticos" DENTRO DE LA APP (16-oct). Apple
 * rechazó la 1.0 por "simulated gambling": en España "quiniela" es el nombre
 * de la apuesta del Estado y el revisor lo leyó como apuestas. El juego es
 * gratis, sin dinero, fichas ni premios: solo puntos. En la web se sigue
 * llamando quiniela.
 *
 * "liga de pronósticos" es femenino singular como "quiniela": las frases
 * ("Juega la quiniela", "Elige tu quiniela") siguen cuadrando al cambiarlo.
 * ⚠️ Una vez aprobada, NO se vuelve a enseñar "quiniela" en la app (2.3.1).
 */
export function sinQuiniela(texto: string): string {
  return texto
    .replace(/QUINIELAS/g, "LIGAS DE PRONÓSTICOS")
    .replace(/QUINIELA/g, "LIGA DE PRONÓSTICOS")
    .replace(/Quinielas/g, "Ligas de pronósticos")
    .replace(/quinielas/g, "ligas de pronósticos")
    .replace(/Quiniela/g, "Liga de pronósticos")
    .replace(/quiniela/g, "liga de pronósticos");
}

/** El texto tal cual en la web; sin "quiniela" en la app. */
export function termino(texto: string, enApp: boolean): string {
  return enApp ? sinQuiniela(texto) : texto;
}
