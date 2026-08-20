import { createClient } from "@/lib/supabase/server";
import type { ClubLeague } from "./league-utils";

export type { ClubLeague } from "./league-utils";
export { pickLeague, leagueHref } from "./league-utils";

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

