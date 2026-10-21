import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LqMatchCard, { type LqMatchCardData } from "../quiniela-liga/match-card";
import { getBaremoPublico } from "@/lib/quiniela-liga/baremo";
import { puntosPronostico } from "@/lib/quiniela-liga/scoring";
import { ANFITRION_ID, type PronosticoAnfitrion } from "@/lib/quiniela-liga/anfitrion";
import { COMPETICION_CHAMPIONS, JORNADAS_CHAMPIONS, TEMPORADA_CHAMPIONS } from "@/lib/quiniela-liga/champions";

export const metadata: Metadata = {
  title: "Quiniela de la Champions 2026-27 | Soy Reinaldo",
  description:
    "Pronostica los partidos de la Champions League jornada a jornada, de la fase liga a la final, y compite en la clasificación. Gratis.",
  alternates: { canonical: "/quiniela-champions" },
};

/**
 * Quiniela de la Champions (21-oct, migración 084). Mismos pronósticos y
 * tarjetas que la de LaLiga, pero con clasificación propia y general: todo
 * el que pronostica entra.
 */

const LOCK_LEAD_MS = 30 * 60 * 1000;
const LIVE_STATES = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];

type TeamRow = { id: number; name: string; logo: string | null };
type MatchRow = {
  id: number;
  matchday: number;
  kickoff_at: string;
  score_home: number | null;
  score_away: number | null;
  finished: boolean;
  status: string | null;
  live_minute: number | null;
  home: TeamRow | null;
  away: TeamRow | null;
};
type FilaRanking = { user_id: string; nombre: string; puntos: number; exactos: number; aciertos: number; jugados: number };

export default async function QuinielaChampionsPage({
  searchParams,
}: {
  searchParams: Promise<{ j?: string; vista?: string }>;
}) {
  const { j, vista } = await searchParams;
  const baremo = await getBaremoPublico();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Jornadas con partidos y la actual (la del próximo partido, o la última).
  const { data: todas } = await supabase
    .from("lq_matches")
    .select("matchday, kickoff_at")
    .eq("competition", COMPETICION_CHAMPIONS)
    .eq("season", TEMPORADA_CHAMPIONS)
    .order("kickoff_at", { ascending: true })
    .returns<{ matchday: number; kickoff_at: string }[]>();
  const conPartidos = new Set((todas ?? []).map((m) => m.matchday));
  // Server Component: una lectura de la hora por petición (decide cierres).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const proxima = (todas ?? []).find((m) => new Date(m.kickoff_at).getTime() > now)?.matchday;
  const actual = proxima ?? (todas ?? []).at(-1)?.matchday ?? 1;
  const pedida = Number(j);
  const jornada = conPartidos.has(pedida) ? pedida : actual;
  const etiqueta = JORNADAS_CHAMPIONS.find((x) => x.n === jornada)?.largo ?? `Jornada ${jornada}`;
  const enRanking = vista === "clasificacion";

  return (
    <main className="page">
      <section className="phero" style={{ paddingTop: 8, paddingBottom: 24 }}>
        <div className="wrap">
          <p className="eyebrow">Quiniela · Champions League 2026-27</p>
          <h1 className="phero__title" style={{ fontSize: "clamp(2.2rem,6vw,4rem)" }}>
            {enRanking ? "Clasificación" : etiqueta}
          </h1>
          <nav className="qc-vistas" aria-label="Secciones">
            <Link href="/quiniela-champions" className={`chip-pill${enRanking ? "" : " on"}`}>
              Partidos
            </Link>
            <Link href="/quiniela-champions?vista=clasificacion" className={`chip-pill${enRanking ? " on" : ""}`}>
              Clasificación
            </Link>
            <Link href="/quiniela-liga" className="chip-pill">
              Quiniela de LaLiga →
            </Link>
          </nav>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap">
          {enRanking ? (
            <Ranking yo={user?.id ?? null} exacto={baremo.exacto} acierto={baremo.acierto} />
          ) : (
            <>
              <nav aria-label="Jornadas" className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
                <ul className="flex min-w-max gap-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {JORNADAS_CHAMPIONS.filter((x) => conPartidos.has(x.n)).map((x) => (
                    <li key={x.n}>
                      <Link href={`/quiniela-champions?j=${x.n}`} className={`chip-pill${x.n === jornada ? " on" : ""}`}>
                        {x.corto}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <p className="hint" style={{ marginTop: 16 }}>
                Se guarda solo al completar el marcador y cada partido se cierra 30 minutos antes.{" "}
                <b>Marcador exacto {baremo.exacto} pts</b>, acertar el ganador {baremo.acierto} pts. En las
                eliminatorias cuenta el resultado del partido con prórroga, sin penaltis.
                {!user && (
                  <>
                    {" "}
                    <Link href="/login?redirect=/quiniela-champions">Entra</Link> para pronosticar.
                  </>
                )}
              </p>
              <Partidos jornada={jornada} userId={user?.id ?? null} now={now} exacto={baremo.exacto} acierto={baremo.acierto} />
            </>
          )}
        </div>
      </section>
    </main>
  );
}

async function Partidos({
  jornada,
  userId,
  now,
  exacto,
  acierto,
}: {
  jornada: number;
  userId: string | null;
  now: number;
  exacto: number;
  acierto: number;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lq_matches")
    .select(
      `id, matchday, kickoff_at, score_home, score_away, finished, status, live_minute,
       home:team_home(id, name, logo), away:team_away(id, name, logo)`,
    )
    .eq("competition", COMPETICION_CHAMPIONS)
    .eq("season", TEMPORADA_CHAMPIONS)
    .eq("matchday", jornada)
    .order("kickoff_at", { ascending: true })
    .returns<MatchRow[]>();
  const matches = (data ?? []).filter((m) => m.home && m.away);
  const ids = matches.map((m) => m.id);

  const pred = new Map<number, { home: number; away: number }>();
  if (userId && ids.length) {
    const { data: p } = await supabase
      .from("lq_predictions")
      .select("match_id, score_home, score_away")
      .eq("user_id", userId)
      .in("match_id", ids);
    for (const x of p ?? []) pred.set(x.match_id, { home: x.score_home, away: x.score_away });
  }
  const anfitrion = new Map<number, PronosticoAnfitrion>();
  if (userId !== ANFITRION_ID && ids.length) {
    const { data: anf } = await supabase.rpc("lq_pronosticos_anfitrion", { p_match_ids: ids });
    for (const a of (anf ?? []) as { match_id: number; hecho: boolean; score_home: number | null; score_away: number | null }[]) {
      anfitrion.set(a.match_id, { hecho: a.hecho, home: a.score_home, away: a.score_away });
    }
  }

  const etiqueta = JORNADAS_CHAMPIONS.find((x) => x.n === jornada)?.corto ?? `J${jornada}`;
  const cards: LqMatchCardData[] = matches.map((m) => {
    const p = pred.get(m.id) ?? null;
    const conMarcador = m.score_home != null && m.score_away != null;
    return {
      id: m.id,
      kickoffAt: m.kickoff_at,
      compLabel: `Champions · ${etiqueta}`,
      home: m.home!,
      away: m.away!,
      prediction: p,
      locked: !userId || new Date(m.kickoff_at).getTime() - LOCK_LEAD_MS <= now,
      live: { scoreHome: m.score_home, scoreAway: m.score_away, finished: m.finished, status: m.status, minute: m.live_minute },
      points: m.finished && conMarcador && p ? puntosPronostico(p, { home: m.score_home!, away: m.score_away! }, { exacto, acierto }) : null,
      anfitrion: anfitrion.get(m.id) ?? null,
    };
  });

  if (cards.length === 0) {
    return (
      <div className="panel" style={{ marginTop: 24, padding: 32, textAlign: "center", borderStyle: "dashed", color: "var(--text-dim)" }}>
        Aún no hay partidos en esta ronda.
      </div>
    );
  }
  const enVivo = cards.some((c) => c.live.status != null && LIVE_STATES.includes(c.live.status));
  return (
    <>
      {enVivo && (
        <p className="eyebrow" style={{ marginTop: 16 }}>
          <span className="livepulse" style={{ marginRight: 8 }} /> Hay partidos en juego
        </p>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <LqMatchCard key={c.id} match={c} maxPuntos={exacto} />
        ))}
      </div>
    </>
  );
}

async function Ranking({ yo, exacto, acierto }: { yo: string | null; exacto: number; acierto: number }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("lq_ranking_competicion", {
    p_comp: COMPETICION_CHAMPIONS,
    p_season: TEMPORADA_CHAMPIONS,
    p_exacto: exacto,
    p_acierto: acierto,
  });
  const filas = (data ?? []) as FilaRanking[];
  if (filas.length === 0) {
    return (
      <div className="panel" style={{ padding: 32, textAlign: "center", borderStyle: "dashed", color: "var(--text-dim)" }}>
        La clasificación arranca con el primer partido terminado. ¡Pronostica la próxima jornada!
      </div>
    );
  }
  const mia = yo ? filas.findIndex((f) => f.user_id === yo) : -1;
  const visibles = filas.slice(0, 100);
  return (
    <div className="panel" style={{ padding: 8 }}>
      {mia >= 100 && (
        <p className="hint" style={{ padding: "8px 10px" }}>
          Vas <b>{mia + 1}º</b> con {filas[mia].puntos} puntos.
        </p>
      )}
      <ol className="ao-clasif">
        {visibles.map((f, i) => (
          <li key={f.user_id} className={f.user_id === yo ? "is-yo" : ""}>
            <span className="ao-clasif__pos">{i + 1}</span>
            <span className="ao-clasif__n">{f.nombre}</span>
            <span className="ao-clasif__p">
              {f.exactos} exactos · {f.jugados} PJ · <b>{f.puntos}</b>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
