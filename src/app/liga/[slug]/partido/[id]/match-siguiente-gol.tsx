import { Zap } from "lucide-react";
import Icono from "@/components/Icono";
import { createClient } from "@/lib/supabase/server";
import { MINUTO_CIERRE, minutoDePronostico, resolver, type Eleccion, type GolDirecto } from "@/lib/partido/siguiente-gol";
import SiguienteGol, { type Pronostico } from "./siguiente-gol";

/**
 * «¿Quién marca el siguiente gol?» (migración 091): se juega en directo y,
 * terminado el partido, solo se ve si jugaste. Los goles llegan ya
 * reconciliados desde la página (sin llamadas nuevas a la API).
 */
export default async function MatchSiguienteGol({
  fixtureId,
  local,
  visitante,
  estado,
  transcurrido,
  enJuego,
  terminado,
  goles,
}: {
  fixtureId: number;
  local: string;
  visitante: string;
  estado: string;
  transcurrido: number | null;
  enJuego: boolean;
  terminado: boolean;
  goles: GolDirecto[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: mias } = user
    ? await supabase
        .from("siguiente_gol")
        .select("minuto, eleccion")
        .eq("fixture_id", fixtureId)
        .eq("user_id", user.id)
        .order("minuto")
        .returns<{ minuto: number; eleccion: Eleccion }[]>()
    : { data: [] as { minuto: number; eleccion: Eleccion }[] };
  const pronosticos: Pronostico[] = (mias ?? []).map((p) => ({ ...p, resultado: resolver(p.minuto, goles, terminado) }));
  if (!enJuego && pronosticos.length === 0) return null;

  // Reparto de la afición en la ronda actual: desde el último gol.
  const ultimoGol = Math.max(0, ...goles.map((g) => g.minuto));
  const { data: reparto } = enJuego
    ? await supabase.rpc("siguiente_gol_reparto", { p_fixture: fixtureId, p_desde: ultimoGol })
    : { data: [] };
  const minuto = minutoDePronostico(estado, transcurrido);
  const abierto = enJuego && minuto != null && (estado === "HT" || minuto < MINUTO_CIERRE);

  return (
    <div style={{ marginTop: 28 }}>
      <div className="shead">
        <h2><Icono icono={Zap} tono="naranja" tam="sm" /> ¿Quién marca el siguiente gol?</h2>
        <span className="sh-note">{enJuego ? "en directo" : "terminado"}</span>
      </div>
      <SiguienteGol
        fixtureId={fixtureId}
        local={local}
        visitante={visitante}
        abierto={abierto}
        conSesion={!!user}
        pronosticos={pronosticos}
        reparto={Object.fromEntries(((reparto ?? []) as { eleccion: Eleccion; votos: number }[]).map((r) => [r.eleccion, r.votos]))}
      />
    </div>
  );
}
