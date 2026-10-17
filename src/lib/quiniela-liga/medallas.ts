/**
 * Medallas de los pronósticos (17-oct, pedido del dueño), a partir del
 * resumen por jugador y jornada de `lq_jornadas_jugador()`. Puras: se
 * calculan al pintar, sin guardar nada.
 */

export type FilaJornadaJugador = {
  user_id: string;
  matchday: number;
  puntos: number;
  exactos: number;
  signos: number;
  jugados: number;
  partidos: number;
  terminada: boolean;
};

export type Medalla = {
  clave: "mejor" | "francotirador" | "pleno" | "constancia" | "reinaldo";
  emoji: string;
  nombre: string;
  descripcion: string;
  veces: number;
};

const DEF: Omit<Medalla, "veces">[] = [
  { clave: "mejor", emoji: "🏅", nombre: "Mejor de la jornada", descripcion: "Más puntos que nadie en una jornada" },
  { clave: "francotirador", emoji: "🎯", nombre: "Francotirador", descripcion: "3 o más resultados exactos en una jornada" },
  { clave: "pleno", emoji: "💯", nombre: "Pleno", descripcion: "Acertar el ganador de todos los partidos de una jornada" },
  { clave: "constancia", emoji: "🔥", nombre: "Constancia", descripcion: "5 jornadas seguidas jugando" },
  { clave: "reinaldo", emoji: "🎙️", nombre: "Le ganaste a Reinaldo", descripcion: "Más puntos que Reinaldo en una jornada" },
];

/** Una jornada da pleno solo si está terminada y tiene partidos de verdad. */
const PLENO_MIN_PARTIDOS = 5;
const CONSTANCIA = 5;

export function medallasDe(
  filas: FilaJornadaJugador[],
  userId: string,
  anfitrionId: string,
): Medalla[] {
  const terminadas = filas.filter((f) => f.terminada);
  const maxPorJornada = new Map<number, number>();
  for (const f of terminadas) {
    maxPorJornada.set(f.matchday, Math.max(maxPorJornada.get(f.matchday) ?? 0, f.puntos));
  }
  const suyas = filas.filter((f) => f.user_id === userId);
  const suyasTerm = suyas.filter((f) => f.terminada);
  const anfitrion = new Map(
    terminadas.filter((f) => f.user_id === anfitrionId).map((f) => [f.matchday, f.puntos]),
  );

  // Racha más larga de jornadas consecutivas (de las que tienen partidos) jugando.
  const jornadas = [...new Set(filas.map((f) => f.matchday))].sort((a, b) => a - b);
  const jugadas = new Set(suyas.map((f) => f.matchday));
  let racha = 0;
  let mejorRacha = 0;
  for (const j of jornadas) {
    racha = jugadas.has(j) ? racha + 1 : 0;
    mejorRacha = Math.max(mejorRacha, racha);
  }

  const veces: Record<Medalla["clave"], number> = {
    mejor: suyasTerm.filter((f) => f.puntos > 0 && f.puntos === maxPorJornada.get(f.matchday)).length,
    francotirador: suyasTerm.filter((f) => f.exactos >= 3).length,
    pleno: suyasTerm.filter(
      (f) => f.partidos >= PLENO_MIN_PARTIDOS && f.jugados === f.partidos && f.signos === f.partidos,
    ).length,
    constancia: Math.floor(mejorRacha / CONSTANCIA),
    reinaldo:
      userId === anfitrionId
        ? 0
        : suyasTerm.filter((f) => anfitrion.has(f.matchday) && f.puntos > anfitrion.get(f.matchday)!).length,
  };
  return DEF.map((d) => ({ ...d, veces: veces[d.clave] })).filter((m) => m.veces > 0);
}
