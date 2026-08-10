import Image from "next/image";
import Link from "next/link";
import { isFinal, isLive, type Fixture } from "@/lib/sports/api-football";

const MADRID_TZ = "Europe/Madrid";

function resultFor(f: Fixture, teamId: number): "V" | "E" | "D" | null {
  const isHome = f.teams.home.id === teamId;
  const gf = isHome ? f.goals.home : f.goals.away;
  const ga = isHome ? f.goals.away : f.goals.home;
  if (gf == null || ga == null) return null;
  if (gf > ga) return "V";
  if (gf < ga) return "D";
  return "E";
}

const RESULT_COLOR: Record<"V" | "E" | "D", string> = {
  V: "#22c55e",
  E: "#8a90a6",
  D: "#ff4d57",
};

function opponentOf(f: Fixture, teamId: number) {
  return f.teams.home.id === teamId ? f.teams.away : f.teams.home;
}

function kickoff(iso: string) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(d)
    .replace(/\./g, "");
  const time = new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return { day: day.charAt(0).toUpperCase() + day.slice(1), time };
}

/**
 * Bloque "Resumen" de la ficha de equipo (estilo FotMob): forma reciente
 * (últimos 5 resultados) y próximo partido. Datos derivados de `fixtures`
 * (ya cronológico ascendente).
 */
export default function TeamOverview({
  fixtures,
  teamId,
  slug,
}: {
  fixtures: Fixture[];
  teamId: number;
  slug: string;
}) {
  const finished = fixtures.filter(isFinal);
  const last5 = finished.slice(-5);
  const next =
    fixtures.find((f) => isLive(f)) ??
    fixtures.find(
      (f) => !isFinal(f) && new Date(f.fixture.date).getTime() > Date.now(),
    ) ??
    null;

  if (last5.length === 0 && !next) return null;

  return (
    <div className="grid2" style={{ alignItems: "stretch" }}>
      {/* FORMA */}
      {last5.length > 0 && (
        <div className="panel" style={{ padding: 18 }}>
          <p className="eyebrow" style={{ marginBottom: 14 }}>
            Últimos partidos
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {last5.map((f) => {
              const r = resultFor(f, teamId);
              const opp = opponentOf(f, teamId);
              const isHome = f.teams.home.id === teamId;
              const gf = isHome ? f.goals.home : f.goals.away;
              const ga = isHome ? f.goals.away : f.goals.home;
              return (
                <Link
                  key={f.fixture.id}
                  href={`/liga/${slug}/partido/${f.fixture.id}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: r ? RESULT_COLOR[r] : "var(--surface-2)",
                      color: "#0a1030",
                      fontWeight: 800,
                      fontSize: "0.8rem",
                    }}
                  >
                    {r ?? "—"}
                  </span>
                  <Image src={opp.logo} alt="" width={18} height={18} unoptimized />
                  <span className="mono" style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>
                    {gf ?? 0}-{ga ?? 0}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* PRÓXIMO PARTIDO */}
      {next && (
        <Link
          href={`/liga/${slug}/partido/${next.fixture.id}`}
          className="panel"
          style={{ padding: 18, textDecoration: "none", color: "inherit", display: "block" }}
        >
          <p className="eyebrow" style={{ marginBottom: 14 }}>
            {isLive(next) ? "En juego" : "Próximo partido"}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}>
              <Image src={next.teams.home.logo} alt="" width={40} height={40} unoptimized />
              <span className="truncate" style={{ fontSize: "0.8rem", fontWeight: 600, maxWidth: "100%" }}>
                {next.teams.home.name}
              </span>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display-stack)", fontWeight: 800, fontSize: "1.1rem" }}>
                {kickoff(next.fixture.date).time}
              </div>
              <div className="mono" style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>
                {kickoff(next.fixture.date).day}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}>
              <Image src={next.teams.away.logo} alt="" width={40} height={40} unoptimized />
              <span className="truncate" style={{ fontSize: "0.8rem", fontWeight: 600, maxWidth: "100%" }}>
                {next.teams.away.name}
              </span>
            </div>
          </div>
          {next.league?.name && (
            <p className="mono" style={{ textAlign: "center", marginTop: 12, fontSize: "0.62rem", color: "var(--accent)" }}>
              {next.league.name}
            </p>
          )}
        </Link>
      )}
    </div>
  );
}
