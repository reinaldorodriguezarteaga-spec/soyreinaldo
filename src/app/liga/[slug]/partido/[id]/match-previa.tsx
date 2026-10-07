import { createClient } from "@/lib/supabase/server";
import { ANFITRION_ID, ANFITRION_NOMBRE } from "@/lib/quiniela-liga/anfitrion";
import { ultimoCaraACara } from "@/lib/quiniela-liga/cara-a-cara";
import { cargarForma } from "@/lib/quiniela-liga/forma-datos";
import { textoPrevia } from "@/lib/quiniela-liga/previa";

/** Por debajo de esto, el reparto de la comunidad no dice nada. */
const MIN_PARA_COMUNIDAD = 3;

/**
 * Previa automática de los partidos de la quiniela (antes del pitido): unas
 * frases con la forma de los dos equipos, el último cara a cara, lo que
 * pronostica la comunidad y si Reinaldo ya ha pronosticado. Todo sale de
 * nuestra BD y de cachés: no gasta cuota en cada visita. Ver
 * lib/quiniela-liga/previa.ts.
 */
export default async function MatchPrevia({
  fixtureId,
  home,
  away,
}: {
  fixtureId: number;
  home: { id: number; name: string };
  away: { id: number; name: string };
}) {
  const supabase = await createClient();
  const { data: partido } = await supabase
    .from("lq_matches")
    .select("competition, season")
    .eq("id", fixtureId)
    .maybeSingle<{ competition: string; season: number }>();
  if (!partido) return null;

  const [forma, caraACara, { data: comunidad }, { data: anf }, { data: auth }] = await Promise.all([
    cargarForma(supabase, partido.competition, partido.season),
    ultimoCaraACara(home.id, away.id),
    supabase
      .rpc("lq_pronostico_comunidad", { p_match_id: fixtureId })
      .maybeSingle<{ total: number; local: number; empate: number; visitante: number }>(),
    supabase.rpc("lq_pronosticos_anfitrion", { p_match_ids: [fixtureId] }),
    supabase.auth.getUser(),
  ]);
  const anfitrion = ((anf ?? []) as { hecho: boolean }[])[0];

  const frases = textoPrevia({
    local: home.name,
    visitante: away.name,
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
        <p style={{ margin: 0, lineHeight: 1.6 }}>{frases.join(" ")}</p>
      </div>
    </div>
  );
}
