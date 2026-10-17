import { isFinal, type Fixture, type TeamSeasonStats } from "./api-football";

/**
 * El "Perfil de la temporada" al día (18-oct, aviso del dueño): el
 * `/teams/statistics` de API-Football tarda horas en sumar el último
 * partido (la mañana después del Betis 2–5 Barça seguía en 8 jugados). Si
 * los resultados que ya tenemos de esa liga van por delante, el balance
 * (jugados, V-E-D, goles, vallas invictas, sin marcar, forma y racha) se
 * recalcula con ellos. Lo que no se puede sacar de un resultado (goles por
 * minuto, formación, penaltis) se queda como lo da la API, y `minutosHasta`
 * dice hasta qué partido llegan esos datos.
 */
const PARON_MS = 45 * 86_400_000;

export function perfilAlDia(
  stats: TeamSeasonStats,
  partidos: Fixture[],
  teamId: number,
): { stats: TeamSeasonStats; minutosHasta: number | null } {
  const deLaLiga = partidos
    .filter(
      (f) =>
        f.league.id === stats.league.id &&
        (f.teams.home.id === teamId || f.teams.away.id === teamId) &&
        isFinal(f) &&
        f.goals.home != null &&
        f.goals.away != null,
    )
    .sort((a, b) => Date.parse(a.fixture.date) - Date.parse(b.fixture.date));
  // Los partidos no dicen de qué temporada son: la actual empieza tras el
  // último parón de más de 45 días (verano, o invierno en las ligas de año
  // natural). Dentro de una temporada nunca hay un hueco así.
  let inicio = 0;
  for (let i = 1; i < deLaLiga.length; i++) {
    const hueco = Date.parse(deLaLiga[i].fixture.date) - Date.parse(deLaLiga[i - 1].fixture.date);
    if (hueco > PARON_MS) inicio = i;
  }
  const jugados = deLaLiga.slice(inicio);

  // Si tenemos la temporada entera (los mismos partidos que la API, o uno o
  // dos más por su retraso), el balance sale de aquí. También al día: la
  // "racha de victorias" de la API venía mal (Atlético, V-E-V-D-V-V-V-V →
  // decía 1). Si no cuadra (lista recortada), manda la API.
  const enApi = stats.fixtures?.played?.total ?? 0;
  const delante = jugados.length - enApi;
  if (delante < 0 || delante > 2 || jugados.length === 0) return { stats, minutosHasta: null };

  const cuenta = () => ({ home: 0, away: 0, total: 0 });
  const played = cuenta();
  const wins = cuenta();
  const draws = cuenta();
  const loses = cuenta();
  const gf = cuenta();
  const ga = cuenta();
  const clean = cuenta();
  const failed = cuenta();
  const suma = (c: { home: number; away: number; total: number }, lado: "home" | "away", n = 1) => {
    c[lado] += n;
    c.total += n;
  };
  let forma = "";
  let racha = 0;
  let mejorRacha = 0;

  for (const f of jugados) {
    const lado = f.teams.home.id === teamId ? "home" : "away";
    const mios = lado === "home" ? f.goals.home! : f.goals.away!;
    const suyos = lado === "home" ? f.goals.away! : f.goals.home!;
    suma(played, lado);
    suma(gf, lado, mios);
    suma(ga, lado, suyos);
    if (suyos === 0) suma(clean, lado);
    if (mios === 0) suma(failed, lado);
    if (mios > suyos) {
      suma(wins, lado);
      forma += "W";
      racha += 1;
      mejorRacha = Math.max(mejorRacha, racha);
    } else {
      suma(mios === suyos ? draws : loses, lado);
      forma += mios === suyos ? "D" : "L";
      racha = 0;
    }
  }

  return {
    minutosHasta: delante > 0 ? enApi : null,
    stats: {
      ...stats,
      form: forma,
      fixtures: { played, wins, draws, loses },
      goals: {
        for: { ...stats.goals.for, total: gf },
        against: { ...stats.goals.against, total: ga },
      },
      biggest: {
        ...stats.biggest,
        streak: { ...stats.biggest?.streak, wins: mejorRacha },
      },
      clean_sheet: clean,
      failed_to_score: failed,
    },
  };
}
