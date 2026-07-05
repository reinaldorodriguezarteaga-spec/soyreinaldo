import { createClient } from "@supabase/supabase-js";
import { labelForKey, type PhaseKey } from "@/lib/quiniela/phases";

/**
 * Fallback de datos del Mundial leídos de NUESTRA base de datos (Supabase),
 * para cuando API-Football no responde (p. ej. quota agotada). Muestra el
 * calendario, los resultados y la clasificación de grupos con lo último que
 * ingerimos — sin escudos ni estadísticas en vivo, pero sin dejar la web vacía.
 *
 * Usa service-role (solo servidor) para no depender de la RLS y funcionar
 * también con usuarios sin sesión.
 */

export type FbMatch = {
  id: number;
  round: string;
  kickoff: string;
  homeName: string;
  homeFlag: string;
  awayName: string;
  awayFlag: string;
  homeGoals: number | null;
  awayGoals: number | null;
  finished: boolean;
};

export type FbGroupRow = {
  code: string;
  name: string;
  flag: string;
  pj: number;
  dg: number;
  pts: number;
};

export type FbGroup = { letter: string; rows: FbGroupRow[] };

export type WcFallback = {
  upcoming: FbMatch[];
  finished: FbMatch[];
  groups: FbGroup[];
};

type TeamRow = {
  id: string;
  name: string;
  flag_emoji: string | null;
  group_letter: string | null;
};

type MatchRow = {
  id: number;
  phase: PhaseKey;
  group_letter: string | null;
  kickoff_at: string;
  score_home: number | null;
  score_away: number | null;
  finished: boolean;
  team_home: string | null;
  team_away: string | null;
  home: { name: string; flag_emoji: string | null } | null;
  away: { name: string; flag_emoji: string | null } | null;
};

const GROUP_PHASES = ["group_md1", "group_md2", "group_md3"];

export async function getWcFallbackData(): Promise<WcFallback | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);

  const [{ data: teamsData }, { data: matchesData }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, flag_emoji, group_letter")
      .returns<TeamRow[]>(),
    supabase
      .from("matches")
      .select(
        `id, phase, group_letter, kickoff_at, score_home, score_away, finished,
         team_home, team_away,
         home:team_home(name, flag_emoji), away:team_away(name, flag_emoji)`,
      )
      .order("kickoff_at", { ascending: true })
      .returns<MatchRow[]>(),
  ]);

  const teams = teamsData ?? [];
  const matches = matchesData ?? [];
  if (matches.length === 0) return null;

  const now = Date.now();

  const toFb = (m: MatchRow): FbMatch => ({
    id: m.id,
    round: labelForKey(m.phase),
    kickoff: m.kickoff_at,
    homeName: m.home?.name ?? "Por definir",
    homeFlag: m.home?.flag_emoji ?? "🏳️",
    awayName: m.away?.name ?? "Por definir",
    awayFlag: m.away?.flag_emoji ?? "🏳️",
    homeGoals: m.score_home,
    awayGoals: m.score_away,
    finished: m.finished,
  });

  const upcoming = matches
    .filter((m) => !m.finished && new Date(m.kickoff_at).getTime() > now)
    .slice(0, 16)
    .map(toFb);

  const finished = matches
    .filter((m) => m.finished)
    .sort(
      (a, b) =>
        new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime(),
    )
    .map(toFb);

  const groups = buildGroups(teams, matches);

  return { upcoming, finished, groups };
}

function buildGroups(teams: TeamRow[], matches: MatchRow[]): FbGroup[] {
  const byGroup = new Map<
    string,
    Map<string, { row: FbGroupRow; gf: number; gc: number }>
  >();

  for (const t of teams) {
    if (!t.group_letter) continue;
    if (!byGroup.has(t.group_letter)) byGroup.set(t.group_letter, new Map());
    byGroup.get(t.group_letter)!.set(t.id, {
      row: {
        code: t.id,
        name: t.name,
        flag: t.flag_emoji ?? "🏳️",
        pj: 0,
        dg: 0,
        pts: 0,
      },
      gf: 0,
      gc: 0,
    });
  }

  for (const m of matches) {
    if (!GROUP_PHASES.includes(m.phase)) continue;
    if (!m.finished || m.score_home == null || m.score_away == null) continue;
    if (!m.group_letter || !m.team_home || !m.team_away) continue;
    const g = byGroup.get(m.group_letter);
    if (!g) continue;
    const h = g.get(m.team_home);
    const a = g.get(m.team_away);
    if (!h || !a) continue;

    h.gf += m.score_home;
    h.gc += m.score_away;
    a.gf += m.score_away;
    a.gc += m.score_home;
    h.row.pj += 1;
    a.row.pj += 1;

    if (m.score_home > m.score_away) h.row.pts += 3;
    else if (m.score_home < m.score_away) a.row.pts += 3;
    else {
      h.row.pts += 1;
      a.row.pts += 1;
    }
  }

  const groups: FbGroup[] = [];
  for (const [letter, teamMap] of byGroup) {
    const rows = [...teamMap.values()]
      .map((e) => ({ ...e.row, dg: e.gf - e.gc, _gf: e.gf }))
      .sort((x, y) => y.pts - x.pts || y.dg - x.dg || y._gf - x._gf)
      .map(({ _gf, ...r }) => r);
    groups.push({ letter, rows });
  }
  return groups.sort((a, b) => a.letter.localeCompare(b.letter));
}
