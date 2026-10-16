import { createClient } from "@/lib/supabase/server";
import { ANFITRION_ID, ANFITRION_NOMBRE } from "@/lib/quiniela-liga/anfitrion";
import { ultimoCaraACara } from "@/lib/quiniela-liga/cara-a-cara";
import { cargarForma } from "@/lib/quiniela-liga/forma-datos";
import type { FormaEquipo, ResultadoCorto } from "@/lib/quiniela-liga/forma";
import type { StandingRow } from "@/lib/sports/api-football";
import { textoPrevia } from "@/lib/quiniela-liga/previa";
import { conTildes } from "@/lib/sports/nombres";
import { T } from "@/components/EnApp";

/** Por debajo de esto, el reparto de la comunidad no dice nada. */
const MIN_PARA_COMUNIDAD = 3;

/**
 * Previa automática de cualquier partido (antes del pitido; desde el 13-oct
 * en todas las competiciones, antes solo en la quiniela): unas frases con la
 * forma de los dos equipos y el último cara a cara; en la quiniela, además,
 * lo que pronostica la comunidad y si Reinaldo ya ha pronosticado. Todo sale de
 * nuestra BD y de cachés: no gasta cuota en cada visita. Ver
 * lib/quiniela-liga/previa.ts.
 */
export default async function MatchPrevia({
  fixtureId,
  home,
  away,
  standings,
}: {
  fixtureId: number;
  home: { id: number; name: string };
  away: { id: number; name: string };
  /** Clasificación de la competición (de la caché, ya la tiene la página). */
  standings: StandingRow[];
}) {
  const supabase = await createClient();
  const { data: partido } = await supabase
    .from("lq_matches")
    .select("competition, season")
    .eq("id", fixtureId)
    .maybeSingle<{ competition: string; season: number }>();

  // Partido de la quiniela: forma de nuestros resultados, lo que pronostica
  // la comunidad y si Reinaldo ya pronosticó. Cualquier otro: forma de la
  // clasificación guardada (puesto, DG y racha del API), sin llamar.
  const [forma, caraACara, { data: comunidad }, { data: anf }, { data: auth }] = await Promise.all([
    partido
      ? cargarForma(supabase, partido.competition, partido.season)
      : Promise.resolve(formaDeClasificacion(standings)),
    ultimoCaraACara(home.id, away.id),
    partido
      ? supabase
          .rpc("lq_pronostico_comunidad", { p_match_id: fixtureId })
          .maybeSingle<{ total: number; local: number; empate: number; visitante: number }>()
      : Promise.resolve({ data: null }),
    partido
      ? supabase.rpc("lq_pronosticos_anfitrion", { p_match_ids: [fixtureId] })
      : Promise.resolve({ data: null }),
    supabase.auth.getUser(),
  ]);
  const anfitrion = ((anf ?? []) as { hecho: boolean }[])[0];

  const frases = textoPrevia({
    local: conTildes(home.name),
    visitante: conTildes(away.name),
    formaLocal: forma.get(home.id) ?? null,
    formaVisitante: forma.get(away.id) ?? null,
    caraACara,
    comunidad: comunidad && comunidad.total >= MIN_PARA_COMUNIDAD ? comunidad : null,
    anfitrionHecho: auth.user?.id === ANFITRION_ID ? null : (anfitrion?.hecho ?? null),
    anfitrionNombre: ANFITRION_NOMBRE,
  });
  if (frases.length === 0) return null;

  return (
    <div style={{ marginTop: 28 }}>
      <div className="shead">
        <h2>📋 La previa</h2>
        <span className="sh-note">en datos</span>
      </div>
      <div className="panel" style={{ padding: 20 }}>
        <p style={{ margin: 0, lineHeight: 1.6 }}><T>{frases.join(" ")}</T></p>
      </div>
    </div>
  );
}

/** Puesto, DG y racha (del más antiguo al más reciente) de cada equipo,
 * desde la clasificación del API. Su `form` viene al revés: el primero es el
 * último partido. */
function formaDeClasificacion(filas: StandingRow[]): Map<number, FormaEquipo> {
  const letra: Record<string, ResultadoCorto> = { W: "V", D: "E", L: "D" };
  const out = new Map<number, FormaEquipo>();
  for (const f of filas) {
    if (out.has(f.team.id)) continue; // con varias tablas, la primera (la en curso)
    const racha = [...(f.form ?? "")]
      .map((c) => letra[c])
      .filter((r): r is ResultadoCorto => !!r)
      .slice(0, 5)
      .reverse();
    out.set(f.team.id, { puesto: f.rank, dg: f.goalsDiff, racha });
  }
  return out;
}
