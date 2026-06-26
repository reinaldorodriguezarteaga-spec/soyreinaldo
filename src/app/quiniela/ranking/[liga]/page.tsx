import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CopyInviteIcon from "@/components/CopyInviteIcon";
import { leaveLeague } from "@/app/quiniela/actions";
import LiveRefresher from "@/app/quiniela/partidos/live-refresher";
import SeleccionesView, {
  type SeleccionMatch,
  type SeleccionMember,
} from "./selecciones";
import MisPrediccionesView, { type MiPrediccion } from "./mis-predicciones";
import type { PhaseKey } from "@/lib/quiniela/phases";

export const metadata = {
  title: "Ranking | Quiniela | Soy Reinaldo",
};

const LIVE_STATUSES = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];

type VistaSlug = "clasificacion" | "selecciones" | "mias";

type MatchPickRow = {
  id: number;
  phase: PhaseKey;
  group_letter: string | null;
  kickoff_at: string;
  score_home: number | null;
  score_away: number | null;
  finished: boolean;
  status: string | null;
  live_minute: number | null;
  team_home_placeholder: string | null;
  team_away_placeholder: string | null;
  home: { name: string; flag_emoji: string | null } | null;
  away: { name: string; flag_emoji: string | null } | null;
};

type LeagueRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
};

type LeaderboardRow = {
  user_id: string;
  display_name: string;
  prediction_points: number;
  picks_points: number;
  adjustment_points: number;
  total_points: number;
  exact_count: number;
  partial_count: number;
  predictions_made: number;
  picks_made: number;
};

const TOTAL_PICKS = 10; // campeón, subcampeón, 3º, equipo goleador, pichichi, balón oro, guante, revelación, asistidor, goleador final

export default async function RankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ liga: string }>;
  searchParams: Promise<{ bienvenida?: string; vista?: string }>;
}) {
  const { liga: leagueId } = await params;
  const { bienvenida, vista: vistaParam } = await searchParams;
  const justJoined = bienvenida === "1";
  const vista: VistaSlug =
    vistaParam === "selecciones"
      ? "selecciones"
      : vistaParam === "mias"
        ? "mias"
        : "clasificacion";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/quiniela/ranking/${leagueId}`);
  }

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, code, description")
    .eq("id", leagueId)
    .maybeSingle<LeagueRow>();

  if (!league) notFound();

  // Verifica que el usuario es miembro (o admin) — si no, fuera
  const { data: membership } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!membership && !profile?.is_admin) {
    redirect("/quiniela");
  }

  const { data: rows } = await supabase.rpc("league_leaderboard", {
    p_league_id: leagueId,
  });
  const leaderboard = (rows ?? []) as LeaderboardRow[];

  // --- Datos de la pestaña "Selecciones" (partidos en vivo / ya empezados) ---
  let seleccionMatches: SeleccionMatch[] = [];
  let hasLiveMatch = false;
  const members: SeleccionMember[] = leaderboard.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
  }));

  if (vista === "selecciones" && members.length > 0) {
    const nowIso = new Date().toISOString();
    // Solo partidos ya empezados: la RLS de predictions exige kickoff <= now
    // para ver los picks de otros. Live primero, luego los más recientes (cap 30).
    const { data: matchesData } = await supabase
      .from("matches")
      .select(
        `id, phase, group_letter, kickoff_at,
         score_home, score_away, finished, status, live_minute,
         team_home_placeholder, team_away_placeholder,
         home:team_home(name, flag_emoji), away:team_away(name, flag_emoji)`,
      )
      .lte("kickoff_at", nowIso)
      .order("kickoff_at", { ascending: false })
      .returns<MatchPickRow[]>();

    const allStarted = matchesData ?? [];
    const isLive = (s: string | null) => !!s && LIVE_STATUSES.includes(s);
    const live = allStarted.filter((m) => isLive(m.status));
    const rest = allStarted.filter((m) => !isLive(m.status)).slice(0, 30);
    // Live arriba (el que antes empezó primero); luego el resto, más reciente primero.
    const display = [
      ...live.sort(
        (a, b) =>
          new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
      ),
      ...rest,
    ];
    hasLiveMatch = live.length > 0;

    const matchIds = display.map((m) => m.id);
    const memberIds = members.map((m) => m.userId);
    const picksByMatch = new Map<
      number,
      Map<string, { home: number; away: number }>
    >();
    if (matchIds.length > 0) {
      const { data: preds } = await supabase
        .from("predictions")
        .select("match_id, user_id, score_home, score_away")
        .in("match_id", matchIds)
        .in("user_id", memberIds)
        .returns<
          {
            match_id: number;
            user_id: string;
            score_home: number;
            score_away: number;
          }[]
        >();
      for (const p of preds ?? []) {
        if (!picksByMatch.has(p.match_id))
          picksByMatch.set(p.match_id, new Map());
        picksByMatch
          .get(p.match_id)!
          .set(p.user_id, { home: p.score_home, away: p.score_away });
      }
    }

    seleccionMatches = display.map((m) => ({
      id: m.id,
      phase: m.phase,
      groupLetter: m.group_letter,
      kickoffAt: m.kickoff_at,
      homeName: m.home?.name ?? m.team_home_placeholder ?? "TBD",
      homeFlag: m.home?.flag_emoji ?? "",
      awayName: m.away?.name ?? m.team_away_placeholder ?? "TBD",
      awayFlag: m.away?.flag_emoji ?? "",
      scoreHome: m.score_home,
      scoreAway: m.score_away,
      finished: m.finished,
      live: isLive(m.status),
      minute: m.live_minute,
      picks: picksByMatch.get(m.id) ?? new Map(),
    }));
  }

  // --- Datos de la pestaña "Mis predicciones" (solo del usuario actual) ---
  let misPredicciones: MiPrediccion[] = [];
  let misTotalMatches = 0;
  if (vista === "mias") {
    const { count } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true });
    misTotalMatches = count ?? 0;

    const { data: misData } = await supabase
      .from("predictions")
      .select(
        `score_home, score_away,
         match:matches(id, phase, kickoff_at, score_home, score_away,
           finished, status, live_minute,
           team_home_placeholder, team_away_placeholder,
           home:team_home(name, flag_emoji), away:team_away(name, flag_emoji))`,
      )
      .eq("user_id", user.id)
      .returns<
        {
          score_home: number;
          score_away: number;
          match: MatchPickRow | null;
        }[]
      >();

    const isLive = (s: string | null) => !!s && LIVE_STATUSES.includes(s);
    const rank = (m: MatchPickRow) =>
      isLive(m.status) ? 0 : m.finished ? 2 : 1;

    const valid = (misData ?? []).filter((p) => p.match);
    // En vivo arriba; luego próximos (más cercano primero); terminados al
    // fondo (más reciente primero).
    valid.sort((a, b) => {
      const ra = rank(a.match!);
      const rb = rank(b.match!);
      if (ra !== rb) return ra - rb;
      const ta = new Date(a.match!.kickoff_at).getTime();
      const tb = new Date(b.match!.kickoff_at).getTime();
      return ra === 2 ? tb - ta : ta - tb;
    });

    misPredicciones = valid.map((p) => {
      const m = p.match!;
      return {
        matchId: m.id,
        phase: m.phase,
        kickoffAt: m.kickoff_at,
        homeName: m.home?.name ?? m.team_home_placeholder ?? "TBD",
        homeFlag: m.home?.flag_emoji ?? "",
        awayName: m.away?.name ?? m.team_away_placeholder ?? "TBD",
        awayFlag: m.away?.flag_emoji ?? "",
        predHome: p.score_home,
        predAway: p.score_away,
        scoreHome: m.score_home,
        scoreAway: m.score_away,
        finished: m.finished,
        live: isLive(m.status),
        minute: m.live_minute,
      };
    });
  }

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 24 }}>
        <div className="wrap">
          {justJoined && (
            <div
              className="notice notice--ok flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ marginBottom: 24 }}
            >
              <p style={{ margin: 0 }}>
                ✓ Acabas de entrar en{" "}
                <strong style={{ color: "var(--text)" }}>{league.name}</strong>.
              </p>
              <form action={leaveLeague} className="shrink-0">
                <input type="hidden" name="league_id" value={league.id} />
                <button
                  type="submit"
                  className="mono"
                  style={{
                    background: "transparent",
                    border: 0,
                    color: "var(--text-dim)",
                    cursor: "pointer",
                  }}
                  title="Salir de esta liga"
                >
                  ¿Te uniste sin querer? Salir →
                </button>
              </form>
            </div>
          )}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div style={{ minWidth: 0 }}>
              <p className="eyebrow">Ranking · Liga {league.name}</p>
              <h1
                className="phero__title"
                style={{ fontSize: "clamp(2.4rem,6vw,4.5rem)" }}
              >
                {league.name}
              </h1>
              {league.description && (
                <p className="phero__lede" style={{ marginTop: 12 }}>
                  {league.description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="codepill">{league.code}</span>
              {profile?.is_admin && <CopyInviteIcon code={league.code} />}
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          {((vista === "selecciones" && hasLiveMatch) ||
            (vista === "mias" && misPredicciones.some((r) => r.live))) && (
            <LiveRefresher intervalMs={30000} />
          )}

          <VistaTabs leagueId={league.id} active={vista} />

          <div style={{ marginTop: 24 }}>
            {vista === "selecciones" ? (
              <SeleccionesView
                matches={seleccionMatches}
                members={members}
                currentUserId={user.id}
              />
            ) : vista === "mias" ? (
              <MisPrediccionesView
                rows={misPredicciones}
                totalMatches={misTotalMatches}
              />
            ) : leaderboard.length === 0 ? (
              <EmptyState />
            ) : (
              <Leaderboard rows={leaderboard} currentUserId={user.id} />
            )}
          </div>

          <p
            className="hint"
            style={{ marginTop: 24, textAlign: "center" }}
          >
            ¿Dudas con la suma?{" "}
            <Link href="/quiniela/puntos" style={{ color: "var(--accent)" }}>
              Cómo se puntúa →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function VistaTabs({
  leagueId,
  active,
}: {
  leagueId: string;
  active: VistaSlug;
}) {
  const tabs: { slug: VistaSlug; label: string; href: string }[] = [
    {
      slug: "clasificacion",
      label: "🏆 Clasificación",
      href: `/quiniela/ranking/${leagueId}`,
    },
    {
      slug: "selecciones",
      label: "👀 Selecciones",
      href: `/quiniela/ranking/${leagueId}?vista=selecciones`,
    },
    {
      slug: "mias",
      label: "📋 Mis predicciones",
      href: `/quiniela/ranking/${leagueId}?vista=mias`,
    },
  ];
  return (
    <nav
      aria-label="Vistas de la liga"
      className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0"
    >
      <ul
        className="flex min-w-max gap-2"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        {tabs.map((t) => (
          <li key={t.slug}>
            <Link
              href={t.href}
              className={`chip-pill${t.slug === active ? " on" : ""}`}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function EmptyState() {
  return (
    <div
      className="panel"
      style={{
        padding: 32,
        textAlign: "center",
        borderStyle: "dashed",
        color: "var(--text-dim)",
      }}
    >
      <p style={{ margin: 0 }}>Aún no hay nadie en esta liga.</p>
      <p className="hint" style={{ marginTop: 8 }}>
        Comparte el código para que entren los demás.
      </p>
    </div>
  );
}

function Leaderboard({
  rows,
  currentUserId,
}: {
  rows: LeaderboardRow[];
  currentUserId: string;
}) {
  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <table className="board">
        <thead>
          <tr>
            <th>#</th>
            <th>Jugador</th>
            <th className="hidden text-right sm:table-cell">Predichos</th>
            <th className="hidden text-right sm:table-cell">Especiales</th>
            <th className="hidden text-right sm:table-cell">Exactos</th>
            <th className="hidden text-right sm:table-cell">Parciales</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isMe = r.user_id === currentUserId;
            const rank = i + 1;
            return (
              <tr key={r.user_id} className={isMe ? "me" : undefined}>
                <td className="pos">
                  <RankBadge rank={rank} />
                </td>
                <td className="who">
                  <Link
                    href={`/quiniela/jugador/${r.user_id}`}
                    style={{ color: "inherit" }}
                    title={`Ver los picks de ${r.display_name}`}
                  >
                    {r.display_name}
                  </Link>
                  {isMe && (
                    <span className="badge badge--accent" style={{ marginLeft: 8 }}>
                      Tú
                    </span>
                  )}
                </td>
                <td
                  className="hidden text-right tabular-nums sm:table-cell"
                  style={{ color: "var(--text-dim)" }}
                >
                  {r.predictions_made}
                </td>
                <td
                  className="hidden text-right tabular-nums sm:table-cell"
                  style={{
                    color:
                      r.picks_made >= TOTAL_PICKS
                        ? "#4ade80"
                        : r.picks_made > 0
                          ? "var(--text)"
                          : "var(--text-dim)",
                  }}
                  title="Picks especiales completados"
                >
                  {r.picks_made}/{TOTAL_PICKS}
                </td>
                <td
                  className="hidden text-right tabular-nums sm:table-cell"
                  style={{ color: "#4ade80" }}
                >
                  {r.exact_count}
                </td>
                <td className="hidden text-right tabular-nums sm:table-cell">
                  {r.partial_count}
                </td>
                <td className="pts">{r.total_points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span style={{ fontSize: "1.2rem" }} title="1º">
        🥇
      </span>
    );
  if (rank === 2)
    return (
      <span style={{ fontSize: "1.2rem" }} title="2º">
        🥈
      </span>
    );
  if (rank === 3)
    return (
      <span style={{ fontSize: "1.2rem" }} title="3º">
        🥉
      </span>
    );
  return <span className={rank <= 3 ? "top" : undefined}>{rank}</span>;
}
