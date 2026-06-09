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
    <main className="page">
      <section className="phero" style={{ paddingBottom: 24 }}>
        <div className="wrap" style={{ maxWidth: 1200 }}>
          <p className="eyebrow">Bracket · Mundial 2026</p>
          <h1 className="phero__title" style={{ fontSize: "clamp(2.4rem,6vw,4.5rem)" }}>
            Eliminatorias<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Vista general de las eliminatorias. Ves el resultado oficial si ya
            está, o tu pronóstico si aún no se ha jugado. Click en cualquier
            partido para editar.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap" style={{ maxWidth: 1200 }}>
          <div className="-mx-6 overflow-x-auto px-6">
            <div className="min-w-[900px]">
              {/* Cabecera de columnas */}
              <div
                className="mono mb-3 grid text-center"
                style={{
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  columnGap: `${COL_GAP}px`,
                  color: "var(--accent)",
                  fontSize: "0.6rem",
                }}
              >
                <span>{COLUMN_LABELS[1]}</span>
                <span>{COLUMN_LABELS[2]}</span>
                <span>{COLUMN_LABELS[3]}</span>
                <span>{COLUMN_LABELS[4]}</span>
                <span>{COLUMN_LABELS[5]}</span>
              </div>

              {/* Bracket grid: 16 filas fijas × 5 columnas */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  gridTemplateRows: `repeat(16, ${ROW_HEIGHT}px)`,
                  columnGap: `${COL_GAP}px`,
                  rowGap: `${ROW_GAP}px`,
                }}
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
              <div className="shead" style={{ marginBottom: 14 }}>
                <h2>Tercer puesto</h2>
              </div>
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

          <p className="hint" style={{ marginTop: 32 }}>
            ¿Quieres editar tus pronósticos?{" "}
            <Link
              href="/quiniela/partidos?fase=dieciseisavos"
              style={{ color: "var(--accent)" }}
            >
              Volver a pronósticos →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

// Geometría del bracket — tienen que coincidir entre la rejilla y los conectores
const ROW_HEIGHT = 48; // px por fila
const ROW_GAP = 8;
const COL_GAP = 16;
const CARD_HEIGHT = 56; // alto fijo del rectángulo interior

const CONNECTOR_COLOR = "var(--line-strong)";

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

function pairPosition(
  gridRow: number,
  rowSpan: number,
): "top" | "bottom" | "single" {
  if (rowSpan === 16) return "single";
  const cycle = rowSpan * 2;
  const offset = (gridRow - 1) % cycle;
  if (offset === 0) return "top";
  if (offset === rowSpan) return "bottom";
  return "single";
}

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

  const phaseSlug = match
    ? PHASE_SLUG[match.phase] ?? "dieciseisavos"
    : "dieciseisavos";
  const editHref = `/quiniela/partidos?fase=${phaseSlug}#match-${matchId}`;

  // Cuánto mide la celda contenedor (incluyendo gaps internos por filas)
  const cellHeight = ROW_HEIGHT * rowSpan + ROW_GAP * (rowSpan - 1);
  // Distancia desde el centro de la celda al "punto de unión" entre dos
  // hermanos = la mitad de la celda + medio gap
  const connectorH = cellHeight / 2 + ROW_GAP / 2;
  const connectorW = COL_GAP / 2;

  const pair = pairPosition(gridRow, rowSpan);
  const hasParents = column > 1;
  const hasOutgoing = column < 5;

  const wrapperStyle: React.CSSProperties = inline
    ? {}
    : {
        gridColumn: column,
        gridRow: `${gridRow} / span ${rowSpan}`,
      };

  const cardBorder = officialResult
    ? "rgba(74, 222, 128, 0.4)"
    : hasAnyScore
      ? "color-mix(in oklch, var(--accent) 35%, transparent)"
      : "var(--line)";
  const scoreColor = officialResult
    ? "#4ade80"
    : hasAnyScore
      ? "var(--accent)"
      : "var(--text-dim)";

  return (
    <div style={wrapperStyle} className="relative flex items-center">
      {/* Línea entrante (izquierda) */}
      {!inline && hasParents && (
        <span
          aria-hidden
          className="absolute"
          style={{
            right: "100%",
            top: "50%",
            width: connectorW,
            borderTopWidth: 1,
            borderColor: CONNECTOR_COLOR,
          }}
        />
      )}

      {/* Línea saliente (derecha) — desde el centro hasta el punto de unión */}
      {!inline && hasOutgoing && pair === "top" && (
        <span
          aria-hidden
          className="absolute"
          style={{
            left: "100%",
            top: "50%",
            width: connectorW,
            height: connectorH,
            borderTopWidth: 1,
            borderRightWidth: 1,
            borderColor: CONNECTOR_COLOR,
          }}
        />
      )}
      {!inline && hasOutgoing && pair === "bottom" && (
        <span
          aria-hidden
          className="absolute"
          style={{
            left: "100%",
            bottom: "50%",
            width: connectorW,
            height: connectorH,
            borderBottomWidth: 1,
            borderRightWidth: 1,
            borderColor: CONNECTOR_COLOR,
          }}
        />
      )}

      <Link
        href={editHref}
        className="relative flex w-full flex-col justify-center px-2.5 py-1.5"
        style={{
          height: `${CARD_HEIGHT}px`,
          background: "var(--surface)",
          border: `1px solid ${cardBorder}`,
          borderRadius: "var(--radius)",
          fontSize: "11px",
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>{homeFlag}</span>
            <span
              className="truncate font-medium"
              style={{ color: home ? "var(--text)" : "var(--text-dim)" }}
              title={homeLabel}
            >
              {homeLabel}
            </span>
          </span>
          <span
            className="mono shrink-0 tabular-nums"
            style={{ color: scoreColor }}
          >
            {homeScore ?? "—"}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>{awayFlag}</span>
            <span
              className="truncate font-medium"
              style={{ color: away ? "var(--text)" : "var(--text-dim)" }}
              title={awayLabel}
            >
              {awayLabel}
            </span>
          </span>
          <span
            className="mono shrink-0 tabular-nums"
            style={{ color: scoreColor }}
          >
            {awayScore ?? "—"}
          </span>
        </div>
      </Link>
    </div>
  );
}
