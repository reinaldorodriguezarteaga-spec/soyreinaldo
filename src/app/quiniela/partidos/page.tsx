import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  UI_PHASES,
  findPhaseBySlug,
  labelForKey,
  type PhaseKey,
} from "@/lib/quiniela/phases";
import MatchCard, { type MatchCardData } from "./match-card";
import LiveRefresher from "./live-refresher";

/**
 * Mismo cálculo que `prediction_scores` en migration 005.
 * 3 si exacto, 1 si solo el ganador (o el empate), 0 si fallo.
 */
function computePoints(
  scoreH: number,
  scoreA: number,
  predH: number,
  predA: number,
): number {
  if (scoreH === predH && scoreA === predA) return 3;
  const realSign = Math.sign(scoreH - scoreA);
  const predSign = Math.sign(predH - predA);
  if (realSign === predSign) return 1;
  return 0;
}

// --- Ordenación: en vivo primero, terminados al fondo ---
const LIVE_STATUSES = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];

type CardStatus = "live" | "upcoming" | "finished";

function cardStatus(c: MatchCardData): CardStatus {
  if (c.live.status && LIVE_STATUSES.includes(c.live.status)) return "live";
  if (c.live.finished) return "finished";
  return "upcoming";
}

const STATUS_ORDER: Record<CardStatus, number> = {
  live: 0,
  upcoming: 1,
  finished: 2,
};

/**
 * En vivo arriba, luego los próximos por hora ascendente (lo más cercano
 * primero) y los terminados al fondo (el más reciente primero). Así no hay que
 * bajar para encontrar el partido de hoy o el que se está jugando.
 */
function compareCards(a: MatchCardData, b: MatchCardData): number {
  const sa = cardStatus(a);
  const sb = cardStatus(b);
  if (STATUS_ORDER[sa] !== STATUS_ORDER[sb]) {
    return STATUS_ORDER[sa] - STATUS_ORDER[sb];
  }
  const ta = new Date(a.kickoffAt).getTime();
  const tb = new Date(b.kickoffAt).getTime();
  return sa === "finished" ? tb - ta : ta - tb;
}

export const metadata = {
  title: "Pronósticos | Quiniela | Soy Reinaldo",
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
  venue: string | null;
  team_home_placeholder: string | null;
  team_away_placeholder: string | null;
  score_home: number | null;
  score_away: number | null;
  finished: boolean;
  status: string | null;
  live_minute: number | null;
  home: TeamRow | null;
  away: TeamRow | null;
};

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string }>;
}) {
  const params = await searchParams;
  const phase = findPhaseBySlug(params.fase);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/quiniela/partidos");
  }

  // Cargar partidos de la fase seleccionada (puede englobar varias claves DB)
  const { data: matchesData } = await supabase
    .from("matches")
    .select(
      `
      id, phase, group_letter, kickoff_at, venue,
      team_home_placeholder, team_away_placeholder,
      score_home, score_away, finished, status, live_minute,
      home:team_home(id, name, flag_emoji, group_letter),
      away:team_away(id, name, flag_emoji, group_letter)
    `,
    )
    .in("phase", phase.keys)
    .order("kickoff_at", { ascending: true })
    .returns<MatchRow[]>();

  const matches = matchesData ?? [];

  // Cargar predicciones del usuario para esos partidos
  const matchIds = matches.map((m) => m.id);
  const { data: predictionsData } = await supabase
    .from("predictions")
    .select("match_id, score_home, score_away")
    .eq("user_id", user.id)
    .in("match_id", matchIds);

  const predictionByMatch = new Map<
    number,
    { home: number; away: number }
  >();
  for (const p of predictionsData ?? []) {
    predictionByMatch.set(p.match_id, { home: p.score_home, away: p.score_away });
  }

  // Progreso global (todas las fases)
  const { count: totalPredictions } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  const { count: totalMatches } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });

  const now = new Date();
  // Las predicciones se cierran 30 MINUTOS antes del kickoff (mismo límite que
  // la RLS de la BD, para que UI y backend coincidan).
  const LOCK_LEAD_MS = 30 * 60 * 1000;

  const cards: MatchCardData[] = matches.map((m) => {
    const kickoff = new Date(m.kickoff_at);
    const locked = kickoff.getTime() - LOCK_LEAD_MS <= now.getTime();
    const home: MatchCardData["home"] = m.home
      ? {
          code: m.home.id,
          name: m.home.name,
          flag: m.home.flag_emoji ?? "",
          groupLetter: m.home.group_letter,
        }
      : { placeholder: m.team_home_placeholder ?? "TBD" };
    const away: MatchCardData["away"] = m.away
      ? {
          code: m.away.id,
          name: m.away.name,
          flag: m.away.flag_emoji ?? "",
          groupLetter: m.away.group_letter,
        }
      : { placeholder: m.team_away_placeholder ?? "TBD" };
    const pred = predictionByMatch.get(m.id) ?? null;
    const hasScore = m.score_home != null && m.score_away != null;
    const points =
      m.finished && hasScore && pred
        ? computePoints(m.score_home!, m.score_away!, pred.home, pred.away)
        : null;
    return {
      id: m.id,
      groupLetter: m.group_letter,
      kickoffAt: m.kickoff_at,
      venue: m.venue,
      phaseLabel: labelForKey(m.phase),
      home,
      away,
      prediction: pred,
      locked,
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

  const hasLiveMatch = cards.some((c) => cardStatus(c) === "live");

  const isGroupStage = phase.keys.some((k) => k.startsWith("group_"));
  const isKnockout = !isGroupStage;

  // Eliminatorias: lista plana con en vivo/próximos arriba y terminados al fondo.
  const knockoutCards = isKnockout ? [...cards].sort(compareCards) : [];

  // Fase de grupos: agrupamos por letra (A..L). Dentro de cada grupo ordenamos
  // por estado (en vivo → próximos → terminados) y además flotamos arriba los
  // grupos con partido en vivo/hoy, hundiendo los que ya se jugaron.
  const cardsByGroup: Map<string, MatchCardData[]> = new Map();
  if (isGroupStage) {
    for (const c of cards) {
      const key = c.groupLetter ?? "?";
      if (!cardsByGroup.has(key)) cardsByGroup.set(key, []);
      cardsByGroup.get(key)!.push(c);
    }
  }
  const groupSections = Array.from(cardsByGroup.entries())
    .map(([letter, list]) => ({ letter, list: [...list].sort(compareCards) }))
    .sort(
      (g1, g2) =>
        compareCards(g1.list[0], g2.list[0]) ||
        g1.letter.localeCompare(g2.letter),
    );

  return (
    <main className="page">
      {hasLiveMatch && <LiveRefresher intervalMs={30000} />}
      <section className="phero" style={{ paddingBottom: 24 }}>
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Pronósticos · Mundial 2026</p>
              <h1 className="phero__title" style={{ fontSize: "clamp(2.4rem,6vw,4.5rem)" }}>
                {phase.label}
              </h1>
            </div>
            <div style={{ color: "var(--text-dim)" }}>
              <span
                className="display"
                style={{ fontSize: "1.6rem", color: "var(--accent)" }}
              >
                {totalPredictions ?? 0}
              </span>
              <span> / {totalMatches ?? 104} predichos</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <PhaseTabs activeSlug={phase.slug} />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href="/quiniela/puntos" className="chip-pill chip-pill--accent">
              📖 Cómo se puntúa <span>→</span>
            </Link>
            {isKnockout && (
              <Link
                href="/quiniela/bracket"
                className="chip-pill chip-pill--accent"
              >
                🏆 Ver bracket completo <span>→</span>
              </Link>
            )}
          </div>

          <p className="hint" style={{ marginTop: 16 }}>
            Se guarda automáticamente al completar el resultado. El pronóstico se
            cierra 30 minutos antes del inicio de cada partido — después no se
            puede editar.
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
              No hay partidos en esta fase.
            </div>
          ) : isGroupStage ? (
            <div className="mt-6 space-y-8">
              {groupSections.map(({ letter, list }) => (
                <section key={letter}>
                    <div className="shead" style={{ marginBottom: 14 }}>
                      <h2>Grupo {letter}</h2>
                      <span className="sh-note">
                        {list.length} partido{list.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {list.map((c) => (
                        <MatchCard key={c.id} match={c} />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {knockoutCards.map((c) => (
                <MatchCard key={c.id} match={c} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function PhaseTabs({ activeSlug }: { activeSlug: string }) {
  return (
    <nav
      aria-label="Fases del torneo"
      className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max gap-2 sm:flex-wrap" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {UI_PHASES.map((p) => {
          const active = p.slug === activeSlug;
          return (
            <li key={p.slug}>
              <Link
                href={`/quiniela/partidos?fase=${p.slug}`}
                className={`chip-pill${active ? " on" : ""}`}
              >
                {p.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
