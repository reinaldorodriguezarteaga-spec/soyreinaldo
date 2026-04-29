import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  BRACKET,
  COLUMN_LABELS,
  THIRD_PLACE_MATCH_ID,
} from "@/lib/quiniela/bracket-layout";

export const metadata = {
  title: "Bracket | Quiniela | Soy Reinaldo",
};

type TeamRow = {
  id: string;
  name: string;
  flag_emoji: string | null;
};

type MatchRow = {
  id: number;
  phase: string;
  kickoff_at: string;
  team_home_placeholder: string | null;
  team_away_placeholder: string | null;
  score_home: number | null;
  score_away: number | null;
  finished: boolean;
  home: TeamRow | null;
  away: TeamRow | null;
};

type PredictionRow = {
  match_id: number;
  score_home: number;
  score_away: number;
};

export default async function BracketPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/quiniela/bracket");
  }

  // Cargar todos los partidos KO (incluyendo M103, el del tercer puesto)
  const { data: matchesData } = await supabase
    .from("matches")
    .select(
      `
      id, phase, kickoff_at,
      team_home_placeholder, team_away_placeholder,
      score_home, score_away, finished,
      home:team_home(id, name, flag_emoji),
      away:team_away(id, name, flag_emoji)
    `,
    )
    .gte("id", 73)
    .lte("id", 104)
    .returns<MatchRow[]>();
  const matches = matchesData ?? [];
  const matchById = new Map(matches.map((m) => [m.id, m]));

  // Cargar predicciones del usuario para esos partidos
  const { data: predData } = await supabase
    .from("predictions")
    .select("match_id, score_home, score_away")
    .eq("user_id", user.id)
    .gte("match_id", 73)
    .lte("match_id", 104);
  const predByMatch = new Map<number, PredictionRow>();
  for (const p of predData ?? []) predByMatch.set(p.match_id, p);

  const cells = BRACKET.map((slot) => ({
    slot,
    match: matchById.get(slot.matchId),
    prediction: predByMatch.get(slot.matchId) ?? null,
  }));

  const thirdPlaceMatch = matchById.get(THIRD_PLACE_MATCH_ID);
  const thirdPlacePrediction =
    predByMatch.get(THIRD_PLACE_MATCH_ID) ?? null;

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/quiniela/partidos"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver a pronósticos
        </Link>

        <header className="mt-6 mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Bracket · Mundial 2026
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Eliminatorias
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Vista general de las eliminatorias. Ves el resultado oficial si
            ya está, o tu pronóstico si aún no se ha jugado. Click en
            cualquier partido para editar.
          </p>
        </header>

        <div className="-mx-6 overflow-x-auto px-6">
          <div className="min-w-[900px]">
            {/* Cabecera de columnas */}
            <div className="mb-3 grid grid-cols-5 gap-3 text-center text-[10px] uppercase tracking-widest text-indigo-300">
              <span>{COLUMN_LABELS[1]}</span>
              <span>{COLUMN_LABELS[2]}</span>
              <span>{COLUMN_LABELS[3]}</span>
              <span>{COLUMN_LABELS[4]}</span>
              <span>{COLUMN_LABELS[5]}</span>
            </div>

            {/* Bracket grid: 16 filas × 5 columnas */}
            <div
              className="grid grid-cols-5 gap-3"
              style={{ gridTemplateRows: "repeat(16, minmax(58px, auto))" }}
            >
              {cells.map(({ slot, match, prediction }) => (
                <BracketCell
                  key={slot.matchId}
                  matchId={slot.matchId}
                  column={slot.column}
                  gridRow={slot.gridRow}
                  rowSpan={slot.rowSpan}
                  match={match}
                  prediction={prediction}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Tercer puesto, separado */}
        {thirdPlaceMatch && (
          <section className="mt-10">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">
              Tercer puesto
            </h2>
            <div className="max-w-xs">
              <BracketCell
                matchId={THIRD_PLACE_MATCH_ID}
                column={1}
                gridRow={1}
                rowSpan={1}
                match={thirdPlaceMatch}
                prediction={thirdPlacePrediction}
                inline
              />
            </div>
          </section>
        )}

        <p className="mt-10 text-xs text-zinc-500">
          ¿Quieres editar tus pronósticos?{" "}
          <Link
            href="/quiniela/partidos?fase=dieciseisavos"
            className="text-indigo-300 hover:text-indigo-200"
          >
            Volver a pronósticos →
          </Link>
        </p>
      </div>
    </main>
  );
}

type CellProps = {
  matchId: number;
  column: 1 | 2 | 3 | 4 | 5;
  gridRow: number;
  rowSpan: 1 | 2 | 4 | 8 | 16;
  match: MatchRow | undefined;
  prediction: PredictionRow | null;
  inline?: boolean;
};

const PHASE_SLUG: Record<string, string> = {
  r32: "dieciseisavos",
  r16: "octavos",
  qf: "cuartos",
  sf: "semis",
  third_place: "final",
  final: "final",
};

function BracketCell({
  matchId,
  column,
  gridRow,
  rowSpan,
  match,
  prediction,
  inline,
}: CellProps) {
  const home = match?.home;
  const away = match?.away;
  const homeLabel = home?.name ?? match?.team_home_placeholder ?? "TBD";
  const awayLabel = away?.name ?? match?.team_away_placeholder ?? "TBD";
  const homeFlag = home?.flag_emoji ?? "🏟️";
  const awayFlag = away?.flag_emoji ?? "🏟️";

  const officialResult =
    match?.finished &&
    match.score_home !== null &&
    match.score_away !== null;
  const homeScore = officialResult
    ? match!.score_home
    : prediction?.score_home;
  const awayScore = officialResult
    ? match!.score_away
    : prediction?.score_away;
  const hasAnyScore = homeScore !== null && homeScore !== undefined;

  const phaseSlug = match ? PHASE_SLUG[match.phase] ?? "dieciseisavos" : "dieciseisavos";
  const editHref = `/quiniela/partidos?fase=${phaseSlug}#match-${matchId}`;

  const style = inline
    ? undefined
    : ({
        gridColumn: column,
        gridRow: `${gridRow} / span ${rowSpan}`,
      } as React.CSSProperties);

  return (
    <Link
      href={editHref}
      style={style}
      className={`group flex flex-col justify-center rounded-lg border bg-zinc-950 px-2.5 py-2 text-[11px] transition hover:border-indigo-300 ${
        officialResult
          ? "border-emerald-900/50"
          : hasAnyScore
            ? "border-indigo-400/30"
            : "border-zinc-800"
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-sm leading-none">{homeFlag}</span>
          <span
            className={`truncate font-medium ${
              home ? "text-white" : "text-zinc-500"
            }`}
            title={homeLabel}
          >
            {homeLabel}
          </span>
        </span>
        <span
          className={`shrink-0 font-mono tabular-nums ${
            officialResult
              ? "text-emerald-400"
              : hasAnyScore
                ? "text-indigo-300"
                : "text-zinc-700"
          }`}
        >
          {homeScore ?? "—"}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-sm leading-none">{awayFlag}</span>
          <span
            className={`truncate font-medium ${
              away ? "text-white" : "text-zinc-500"
            }`}
            title={awayLabel}
          >
            {awayLabel}
          </span>
        </span>
        <span
          className={`shrink-0 font-mono tabular-nums ${
            officialResult
              ? "text-emerald-400"
              : hasAnyScore
                ? "text-indigo-300"
                : "text-zinc-700"
          }`}
        >
          {awayScore ?? "—"}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[9px] uppercase tracking-widest text-zinc-600">
        <span>#{matchId}</span>
        {officialResult && <span className="text-emerald-500">✓ Oficial</span>}
        {!officialResult && hasAnyScore && (
          <span className="text-indigo-400">Tu pick</span>
        )}
      </div>
    </Link>
  );
}
