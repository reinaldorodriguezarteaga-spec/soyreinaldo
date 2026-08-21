import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";
import LqMatchCard, { type LqMatchCardData } from "../match-card";
import { getBaremoPublico } from "@/lib/quiniela-liga/baremo";
import { puntosPronostico } from "@/lib/quiniela-liga/scoring";

// La descripción no cita puntos a propósito: el baremo lo fija cada liga en
// la BD y aquí se quedaría desfasado (pasó con el 3/1 tras subir a 5/2).
export const metadata = {
  title: "Pronósticos · Quiniela LaLiga 2026-27 | Soy Reinaldo",
  description:
    "Pronostica los resultados de LaLiga 2026-27 jornada a jornada y compite en la clasificación pública. Gratis.",
};

const COMPETITION = "laliga";
const SEASON = 2026;
const TOTAL_JORNADAS = 38;
const LOCK_LEAD_MS = 30 * 60 * 1000;
const LIVE_STATES = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];

type TeamRow = { id: number; name: string; logo: string | null };
type MatchRow = {
  id: number;
  matchday: number | null;
  kickoff_at: string;
  score_home: number | null;
  score_away: number | null;
  finished: boolean;
  status: string | null;
  live_minute: number | null;
  home: TeamRow | null;
  away: TeamRow | null;
};

// Los puntos de las tarjetas salen de la librería compartida con el baremo
// real de la liga pública (la copia local que había aquí llevaba 3/1 a fuego
// y desmentía a la clasificación cuando el baremo pasó a 5/2).

async function currentJornada(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data: next } = await supabase
    .from("lq_matches")
    .select("matchday")
    .eq("competition", COMPETITION)
    .eq("season", SEASON)
    .gt("kickoff_at", nowIso)
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (next?.matchday) return next.matchday;
  const { data: last } = await supabase
    .from("lq_matches")
    .select("matchday")
    .eq("competition", COMPETITION)
    .eq("season", SEASON)
    .order("kickoff_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return last?.matchday ?? 1;
}

export default async function QuinielaLigaPartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ j?: string }>;
}) {
  const baremo = await getBaremoPublico();
  const { j } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/quiniela-liga/partidos");

  const parsed = Number(j);
  const jornada =
    Number.isInteger(parsed) && parsed >= 1 && parsed <= TOTAL_JORNADAS
      ? parsed
      : await currentJornada(supabase);

  const { data: matchesData } = await supabase
    .from("lq_matches")
    .select(
      `id, matchday, kickoff_at, score_home, score_away, finished, status, live_minute,
       home:team_home(id, name, logo), away:team_away(id, name, logo)`,
    )
    .eq("competition", COMPETITION)
    .eq("season", SEASON)
    .eq("matchday", jornada)
    .order("kickoff_at", { ascending: true })
    .returns<MatchRow[]>();
  const matches = matchesData ?? [];

  const matchIds = matches.map((m) => m.id);
  const { data: predsData } = await supabase
    .from("lq_predictions")
    .select("match_id, score_home, score_away")
    .eq("user_id", user.id)
    .in("match_id", matchIds);
  const predByMatch = new Map<number, { home: number; away: number }>();
  for (const p of predsData ?? []) {
    predByMatch.set(p.match_id, { home: p.score_home, away: p.score_away });
  }

  const { count: totalPredictions } = await supabase
    .from("lq_predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const compName = COMPETITIONS_BY_SLUG[COMPETITION]?.name ?? "LaLiga";
  const now = Date.now();

  const cards: LqMatchCardData[] = matches
    .filter((m) => m.home && m.away)
    .map((m) => {
      const kickoff = new Date(m.kickoff_at).getTime();
      const pred = predByMatch.get(m.id) ?? null;
      const hasScore = m.score_home != null && m.score_away != null;
      const points =
        m.finished && hasScore && pred
          ? puntosPronostico(
              pred,
              { home: m.score_home!, away: m.score_away! },
              baremo,
            )
          : null;
      return {
        id: m.id,
        kickoffAt: m.kickoff_at,
        compLabel: `${compName} · J${m.matchday ?? jornada}`,
        home: m.home!,
        away: m.away!,
        prediction: pred,
        locked: kickoff - LOCK_LEAD_MS <= now,
        live: {
          scoreHome: m.score_home,
          scoreAway: m.score_away,
          finished: m.finished,
          status: m.status,
          minute: m.live_minute,
        },
        points,
      };
    });

  const anyLive = cards.some(
    (c) => c.live.status != null && LIVE_STATES.includes(c.live.status),
  );

  return (
    <main className="page">
      <section className="phero" style={{ paddingTop: 8, paddingBottom: 24 }}>
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">
                {anyLive && <span className="livepulse" style={{ marginRight: 8 }} />}
                Quiniela · {compName} 2026-27
              </p>
              <h1 className="phero__title" style={{ fontSize: "clamp(2.2rem,6vw,4rem)" }}>
                Jornada {jornada}
              </h1>
            </div>
            <div style={{ color: "var(--text-dim)" }}>
              <span className="display" style={{ fontSize: "1.6rem", color: "var(--accent)" }}>
                {totalPredictions ?? 0}
              </span>
              <span> pronósticos</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <JornadaTabs active={jornada} />

          <p className="hint" style={{ marginTop: 16 }}>
            Se guarda solo al completar el marcador. Cada partido se cierra 30
            minutos antes del inicio. <b>Marcador exacto {baremo.exacto} pts</b>,
            acertar el ganador {baremo.acierto} pts. Entras automáticamente en
            la clasificación pública.
          </p>

          {cards.length === 0 ? (
            <div
              className="panel"
              style={{
                marginTop: 24,
                padding: 32,
                textAlign: "center",
                borderStyle: "dashed",
                color: "var(--text-dim)",
              }}
            >
              No hay partidos en esta jornada todavía.
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {cards.map((c) => (
                <LqMatchCard key={c.id} match={c} maxPuntos={baremo.exacto} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function JornadaTabs({ active }: { active: number }) {
  return (
    <nav
      aria-label="Jornadas"
      className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0"
    >
      <ul
        className="flex min-w-max gap-2"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        {Array.from({ length: TOTAL_JORNADAS }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            <Link
              href={`/quiniela-liga/partidos?j=${n}`}
              className={`chip-pill${n === active ? " on" : ""}`}
            >
              J{n}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
