import { createClient } from "@/lib/supabase/server";

/**
 * Ligas de la quiniela de CLUBES (LaLiga 2026-27).
 *
 * Los pronósticos son globales por usuario (`lq_predictions` no tiene liga):
 * una liga solo agrupa a gente para clasificar entre ella. Por eso alguien
 * puede estar en la liga pública y en una privada a la vez, y sus mismos
 * pronósticos puntúan en ambas.
 */
export type ClubLeague = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isPublic: boolean;
  /** Rol del usuario actual dentro de esa liga. */
  role: "member" | "admin";
};

type MembershipRow = {
  role: "member" | "admin";
  leagues: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    is_public: boolean;
  } | null;
};

/** Ligas de clubes a las que pertenece el usuario, la pública primero. */
export async function getMyClubLeagues(userId: string): Promise<ClubLeague[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_members")
    .select(
      "role, leagues!inner(id, name, code, description, is_public, kind)",
    )
    .eq("user_id", userId)
    .eq("leagues.kind", "clubs")
    .returns<MembershipRow[]>();

  return (data ?? [])
    .flatMap((row) =>
      row.leagues
        ? [
            {
              id: row.leagues.id,
              name: row.leagues.name,
              code: row.leagues.code,
              description: row.leagues.description,
              isPublic: row.leagues.is_public,
              role: row.role,
            },
          ]
        : [],
    )
    .sort((a, b) => {
      if (a.isPublic !== b.isPublic) return a.isPublic ? -1 : 1;
      return a.name.localeCompare(b.name, "es");
    });
}

/**
 * Liga activa a partir del `?liga=` de la URL (acepta código o id). Si no
 * viene o no cuadra, la primera: la pública para el público general, la suya
 * para quien solo está en una privada.
 */
export function pickLeague(
  leagues: ClubLeague[],
  wanted?: string,
): ClubLeague | null {
  if (leagues.length === 0) return null;
  const key = wanted?.trim().toLowerCase();
  if (key) {
    const match = leagues.find(
      (l) => l.code.toLowerCase() === key || l.id.toLowerCase() === key,
    );
    if (match) return match;
  }
  return leagues[0];
}

/**
 * Añade `?liga=` solo cuando hace falta (la pública es el destino por
 * defecto). Viaja el **id**, no el código: el código es la llave para entrar
 * a una liga privada y no tiene por qué acabar en la barra de direcciones de
 * cada miembro. `pickLeague` acepta los dos, así que los enlaces viejos con
 * código siguen funcionando.
 */
export function leagueHref(path: string, league: ClubLeague | null): string {
  if (!league || league.isPublic) return path;
  return `${path}?liga=${encodeURIComponent(league.id)}`;
}
