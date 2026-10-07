import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  puntosDeLaJornada,
  resumenPorJugador,
  type ResumenJugador,
} from "./jornada";

/**
 * Datos de una jornada desde la base de datos, con la service role (los
 * pronósticos ajenos están ocultos por RLS; aquí solo se devuelven puntos y
 * puestos, que ya son públicos en la clasificación de la liga pública).
 * Siempre contra la LIGA PÚBLICA de clubes: todos los jugadores están en ella
 * y su baremo es el que se anuncia.
 */

export function clienteServicio(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type LigaPublica = { id: string; nombre: string; exacto: number; acierto: number };

export async function ligaPublica(db: SupabaseClient): Promise<LigaPublica | null> {
  const { data } = await db
    .from("leagues")
    .select("id, name, lq_points_exact, lq_points_result")
    .eq("is_public", true)
    .eq("kind", "clubs")
    .order("created_at")
    .limit(1)
    .maybeSingle<{ id: string; name: string; lq_points_exact: number; lq_points_result: number }>();
  if (!data) return null;
  return { id: data.id, nombre: data.name, exacto: data.lq_points_exact, acierto: data.lq_points_result };
}

export type DatosJornada = {
  competition: string;
  season: number;
  matchday: number;
  liga: LigaPublica;
  /** Partidos de la jornada ya terminados (los que puntúan). */
  terminados: number;
  /** ¿Es la última jornada con partidos jugados? Solo entonces el "puesto
   * antes" es fiable (la clasificación incluye las jornadas posteriores). */
  esUltima: boolean;
  porJugador: Map<string, ResumenJugador>;
};

export async function datosJornada(
  db: SupabaseClient,
  competition: string,
  season: number,
  matchday: number,
): Promise<DatosJornada | null> {
  const liga = await ligaPublica(db);
  if (!liga) return null;

  const { data: partidos } = await db
    .from("lq_matches")
    .select("id, score_home, score_away")
    .eq("competition", competition)
    .eq("season", season)
    .eq("matchday", matchday)
    .eq("finished", true)
    .eq("counts_for_scoring", true)
    .returns<{ id: number; score_home: number | null; score_away: number | null }[]>();
  const jugados = (partidos ?? []).filter((p) => p.score_home != null && p.score_away != null);
  if (jugados.length === 0) return null;

  const [{ count: posteriores }, { data: pronosticos }, { data: tabla }] = await Promise.all([
    db
      .from("lq_matches")
      .select("id", { count: "exact", head: true })
      .eq("competition", competition)
      .eq("season", season)
      .gt("matchday", matchday)
      .eq("finished", true),
    db
      .from("lq_predictions")
      .select("user_id, match_id, score_home, score_away")
      .in("match_id", jugados.map((p) => p.id))
      .returns<{ user_id: string; match_id: number; score_home: number; score_away: number }[]>(),
    db.rpc("lq_leaderboard", { p_league_id: liga.id }),
  ]);

  const jornada = puntosDeLaJornada(
    jugados.map((p) => ({ id: p.id, home: p.score_home!, away: p.score_away! })),
    (pronosticos ?? []).map((p) => ({
      userId: p.user_id,
      matchId: p.match_id,
      home: p.score_home,
      away: p.score_away,
    })),
    { exacto: liga.exacto, acierto: liga.acierto },
  );
  const porJugador = resumenPorJugador(
    jornada,
    ((tabla ?? []) as { user_id: string; total_points: number }[]).map((t) => ({
      userId: t.user_id,
      total: t.total_points,
    })),
  );
  return {
    competition,
    season,
    matchday,
    liga,
    terminados: jugados.length,
    esUltima: (posteriores ?? 0) === 0,
    porJugador,
  };
}

export type Tarjeta = {
  nombre: string;
  jornada: number;
  liga: string;
  puntos: number;
  exactos: number;
  aciertos: number;
  jugados: number;
  puestoAhora: number | null;
  /** Solo si es la última jornada jugada (si no, no es fiable). */
  puestoAntes: number | null;
  totalJugadores: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Datos de la tarjeta "mi jornada" de un jugador (por nombre de usuario o,
 * si no tiene, por su id). Cacheado 10 min: la tarjeta la piden la página y
 * la imagen que generan WhatsApp/Instagram al compartir.
 */
export const tarjetaJornada = (usuario: string, jornada: number) =>
  unstable_cache(
    async (): Promise<Tarjeta | null> => {
      const db = clienteServicio();
      if (!db || !Number.isInteger(jornada) || jornada < 1 || jornada > 60) return null;
      const columna = UUID_RE.test(usuario) ? "id" : "username";
      const { data: perfil } = await db
        .from("profiles")
        .select("id, display_name, username")
        .eq(columna, columna === "username" ? usuario.toLowerCase() : usuario)
        .maybeSingle<{ id: string; display_name: string | null; username: string | null }>();
      if (!perfil) return null;
      const { data: temporada } = await db
        .from("lq_matches")
        .select("competition, season")
        .eq("matchday", jornada)
        .order("season", { ascending: false })
        .limit(1)
        .maybeSingle<{ competition: string; season: number }>();
      if (!temporada) return null;
      const datos = await datosJornada(db, temporada.competition, temporada.season, jornada);
      const r = datos?.porJugador.get(perfil.id);
      if (!datos || !r) return null;
      return {
        nombre: perfil.display_name || perfil.username || "Jugador",
        jornada,
        liga: datos.liga.nombre,
        puntos: r.puntos,
        exactos: r.exactos,
        aciertos: r.aciertos,
        jugados: r.jugados,
        puestoAhora: r.puestoAhora,
        puestoAntes: datos.esUltima ? r.puestoAntes : null,
        totalJugadores: r.totalJugadores,
      };
    },
    ["tarjeta-jornada", usuario.toLowerCase(), String(jornada)],
    { revalidate: 600 },
  )();
