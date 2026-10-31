import { Star } from "lucide-react";
import Icono from "@/components/Icono";
import { createClient } from "@/lib/supabase/server";
import NotasAficion, { type EquipoNotas } from "./notas-aficion";

/**
 * «Pon nota a los jugadores» (migración 083): la media de la afición junto a
 * la nota de la API. Se vota la semana siguiente al partido; las medias se
 * quedan para siempre.
 */
export default async function MatchNotasAficion({
  fixtureId,
  equipos,
  abierto,
}: {
  fixtureId: number;
  equipos: EquipoNotas[];
  abierto: boolean;
}) {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: medias },
  ] = await Promise.all([supabase.auth.getUser(), supabase.rpc("notas_aficion_partido", { p_fixture: fixtureId })]);
  const resumen = (medias ?? []) as { player_id: number; media: number; votos: number }[];
  if (!abierto && resumen.length === 0) return null;

  const { data: mias } = user
    ? await supabase.from("notas_aficion").select("player_id, nota").eq("fixture_id", fixtureId).eq("user_id", user.id)
    : { data: [] as { player_id: number; nota: number }[] };

  return (
    <div style={{ marginTop: 28 }}>
      <div className="shead">
        <h2><Icono icono={Star} tono="oro" tam="sm" /> Nota de la afición</h2>
        <span className="sh-note">{abierto ? "puntúa del 1 al 10" : "votación cerrada"}</span>
      </div>
      <NotasAficion
        fixtureId={fixtureId}
        equipos={equipos}
        medias={Object.fromEntries(resumen.map((r) => [r.player_id, { media: Number(r.media), votos: r.votos }]))}
        mias={Object.fromEntries((mias ?? []).map((m) => [m.player_id, m.nota]))}
        abierto={abierto}
        conSesion={!!user}
      />
    </div>
  );
}
