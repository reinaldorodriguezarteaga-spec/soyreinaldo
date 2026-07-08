import type { MinuteMap, TeamSeasonStats } from "@/lib/sports/api-football";

/** Orden canónico de los tramos de minutos de API-Football. */
const MINUTE_ORDER = [
  "0-15",
  "16-30",
  "31-45",
  "46-60",
  "61-75",
  "76-90",
  "91-105",
  "106-120",
];

/** Suma total de goles/tarjetas de un mapa de tramos (ignora nulos). */
function minuteTotal(map: MinuteMap | undefined): number {
  if (!map) return 0;
  return Object.values(map).reduce((acc, b) => acc + (b?.total ?? 0), 0);
}

/** Una métrica grande (número + etiqueta) en la rejilla del perfil. */
function Metric({
  value,
  label,
  accent,
}: {
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        borderRadius: "var(--radius)",
        padding: "14px 16px",
      }}
    >
      <div
        className="tabular-nums"
        style={{
          fontFamily: "var(--font-display-stack)",
          fontWeight: 900,
          fontSize: "1.7rem",
          lineHeight: 1,
          color: accent ? "var(--accent)" : "var(--text)",
        }}
      >
        {value}
      </div>
      <div
        className="mono"
        style={{
          marginTop: 6,
          fontSize: "0.6rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/** Distribución de goles por tramo de minutos, como barras horizontales. */
function MinuteBars({ map, color }: { map: MinuteMap; color: string }) {
  const buckets = MINUTE_ORDER.map((k) => ({ k, total: map[k]?.total ?? 0 })).filter(
    (b, i) => b.total > 0 || i < 6, // siempre los 6 tramos base; extras solo si hay
  );
  const max = Math.max(1, ...buckets.map((b) => b.total));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {buckets.map((b) => (
        <div key={b.k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            className="mono"
            style={{
              width: 56,
              flexShrink: 0,
              fontSize: "0.62rem",
              color: "var(--text-dim)",
            }}
          >
            {b.k}&apos;
          </span>
          <div
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: "var(--surface-2)",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${(b.total / max) * 100}%`,
                background: color,
              }}
            />
          </div>
          <span
            className="tabular-nums"
            style={{ width: 18, textAlign: "right", fontSize: "0.8rem", fontWeight: 700 }}
          >
            {b.total}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Forma reciente (p. ej. "WWDLW") como puntos de color V/E/D. */
function FormDots({ form }: { form: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    W: { bg: "var(--accent)", label: "V" },
    D: { bg: "var(--line-strong)", label: "E" },
    L: { bg: "#ff5b8a", label: "D" },
  };
  const chars = form.slice(-8).split("");
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {chars.map((c, i) => {
        const s = map[c] ?? { bg: "var(--line-strong)", label: c };
        return (
          <span
            key={i}
            title={c}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: s.bg,
              color: c === "D" || c === "W" ? "#fff" : "var(--text)",
              fontSize: "0.66rem",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Perfil de la selección en el Mundial: forma, balance, goles a favor/en contra
 * por tramos, vallas invictas, racha, formación y penaltis. Renderiza solo lo
 * que la API trae con datos (las selecciones juegan pocos partidos).
 */
export default function TeamStats({ stats }: { stats: TeamSeasonStats }) {
  const played = stats.fixtures?.played?.total ?? 0;
  if (played === 0) return null; // sin partidos en el torneo: nada que enseñar

  const w = stats.fixtures.wins.total;
  const d = stats.fixtures.draws.total;
  const l = stats.fixtures.loses.total;
  const gf = stats.goals?.for?.total?.total ?? 0;
  const ga = stats.goals?.against?.total?.total ?? 0;
  const cleanSheets = stats.clean_sheet?.total ?? 0;
  const failedToScore = stats.failed_to_score?.total ?? 0;
  const streak = stats.biggest?.streak?.wins ?? 0;
  const formation = stats.lineups?.[0]?.formation ?? null;
  const penScored = stats.penalty?.scored?.total ?? 0;
  const penTotal = stats.penalty?.total ?? 0;

  const forMinutes = minuteTotal(stats.goals?.for?.minute);
  const againstMinutes = minuteTotal(stats.goals?.against?.minute);

  return (
    <div className="panel" style={{ padding: "18px 20px" }}>
      <div className="shead" style={{ marginBottom: 16 }}>
        <h2>Perfil en el Mundial</h2>
        {stats.form && <FormDots form={stats.form} />}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
          gap: 12,
        }}
      >
        <Metric value={played} label="Jugados" />
        <Metric value={`${w}-${d}-${l}`} label="V · E · D" />
        <Metric value={gf} label="Goles a favor" accent />
        <Metric value={ga} label="Goles en contra" />
        <Metric value={cleanSheets} label="Vallas invictas" />
        <Metric value={failedToScore} label="Sin marcar" />
        {streak > 0 && <Metric value={streak} label="Racha victorias" />}
        {formation && <Metric value={formation} label="Formación top" />}
        {penTotal > 0 && (
          <Metric value={`${penScored}/${penTotal}`} label="Penaltis" />
        )}
      </div>

      {(forMinutes > 0 || againstMinutes > 0) && (
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 24,
          }}
        >
          {forMinutes > 0 && (
            <div>
              <p
                className="mono"
                style={{
                  fontSize: "0.62rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                  marginBottom: 12,
                }}
              >
                Goles a favor por minuto
              </p>
              <MinuteBars map={stats.goals.for.minute} color="var(--accent)" />
            </div>
          )}
          {againstMinutes > 0 && (
            <div>
              <p
                className="mono"
                style={{
                  fontSize: "0.62rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                  marginBottom: 12,
                }}
              >
                Goles en contra por minuto
              </p>
              <MinuteBars map={stats.goals.against.minute} color="#ff5b8a" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
