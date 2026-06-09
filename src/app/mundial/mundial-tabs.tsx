"use client";

import Image from "next/image";
import { useState } from "react";
import {
  isFinal,
  isLive,
  type Fixture,
  type WcGroup,
  type PlayerStatLeader,
  type StandingRow,
} from "@/lib/sports/api-football";
import type { MundialData, XgLeader } from "./page";

type Tab = "partidos" | "grupos" | "stats";

const MADRID_TZ = "Europe/Madrid";

function formatKickoff(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .toUpperCase();
}

export default function MundialTabs({ data }: { data: MundialData }) {
  const [tab, setTab] = useState<Tab>("partidos");

  return (
    <section className="section" style={{ paddingTop: 28 }}>
      <div className="wrap">
        <div className="tabs" style={{ marginBottom: 28, maxWidth: 460 }}>
          <button
            type="button"
            className={tab === "partidos" ? "on" : ""}
            onClick={() => setTab("partidos")}
          >
            Próximos partidos
          </button>
          <button
            type="button"
            className={tab === "grupos" ? "on" : ""}
            onClick={() => setTab("grupos")}
          >
            Grupos
          </button>
          <button
            type="button"
            className={tab === "stats" ? "on" : ""}
            onClick={() => setTab("stats")}
          >
            Estadísticas
          </button>
        </div>

        {tab === "partidos" && <PartidosView fixtures={data.fixtures} />}
        {tab === "grupos" && <GruposView groups={data.groups} />}
        {tab === "stats" && <StatsView data={data} />}
      </div>
    </section>
  );
}

/* ---------- Próximos partidos ---------- */

function PartidosView({ fixtures }: { fixtures: Fixture[] }) {
  if (fixtures.length === 0) {
    return (
      <Empty>No hay partidos próximos en el calendario ahora mismo.</Empty>
    );
  }
  return (
    <div className="grid2">
      {fixtures.map((fx) => {
        const showScore = isLive(fx) || isFinal(fx);
        const live = isLive(fx);
        return (
          <div className="match" key={fx.fixture.id}>
            <div className="match__meta">
              <span className="match__grp">{fx.league.round}</span>
              {live ? (
                <span className="badge badge--danger">
                  <span className="livepulse" />
                  {fx.fixture.status.elapsed != null
                    ? `${fx.fixture.status.elapsed}'`
                    : "EN VIVO"}
                </span>
              ) : (
                <span className="match__when">
                  {formatKickoff(fx.fixture.date)}
                </span>
              )}
            </div>
            <div className="team">
              <span className="flag">
                <Image
                  src={fx.teams.home.logo}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                />
              </span>
              <span className="tn">{fx.teams.home.name}</span>
            </div>
            <div className="score">
              {showScore ? (
                <>
                  <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.3rem" }}>
                    {fx.goals.home ?? 0}
                  </b>
                  <span className="vs">–</span>
                  <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.3rem" }}>
                    {fx.goals.away ?? 0}
                  </b>
                </>
              ) : (
                <span className="vs">VS</span>
              )}
            </div>
            <div className="team right">
              <span className="tn">{fx.teams.away.name}</span>
              <span className="flag">
                <Image
                  src={fx.teams.away.logo}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Grupos ---------- */

function GruposView({ groups }: { groups: WcGroup[] }) {
  if (groups.length === 0) {
    return <Empty>Los grupos aparecerán en cuanto se confirmen.</Empty>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => (
        <GroupTable key={g.group} group={g} />
      ))}
    </div>
  );
}

function GroupTable({ group }: { group: WcGroup }) {
  return (
    <section className="panel" style={{ overflow: "hidden" }}>
      <header
        className="mono"
        style={{
          borderBottom: "1px solid var(--line)",
          padding: "12px 16px",
          color: "var(--accent)",
          fontWeight: 700,
        }}
      >
        {group.group.replace("Group", "Grupo")}
      </header>
      <table className="standings">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th>PJ</th>
            <th>DG</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((r) => (
            <tr key={r.team.id}>
              <td>
                <RankPill rank={r.rank} />
              </td>
              <td>
                <span className="club">
                  <Image
                    className="crest"
                    src={r.team.logo}
                    alt=""
                    width={24}
                    height={24}
                    unoptimized
                  />
                  <b>{r.team.name}</b>
                </span>
              </td>
              <td className="tabular-nums" style={{ color: "var(--text-dim)" }}>
                {r.all.played}
              </td>
              <td
                className="tabular-nums"
                style={{
                  color:
                    r.goalsDiff > 0
                      ? "#4ade80"
                      : r.goalsDiff < 0
                        ? "#ff8a8a"
                        : "var(--text-dim)",
                }}
              >
                {r.goalsDiff > 0 ? "+" : ""}
                {r.goalsDiff}
              </td>
              <td className="ptsc">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RankPill({ rank }: { rank: number }) {
  const style =
    rank <= 2
      ? { background: "rgba(74,222,128,0.15)", color: "#4ade80" }
      : { background: "var(--surface-2)", color: "var(--text-dim)" };
  return (
    <span
      className="tabular-nums"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 5,
        fontSize: "0.7rem",
        fontWeight: 700,
        ...style,
      }}
    >
      {rank}
    </span>
  );
}

/* ---------- Estadísticas ---------- */

function StatsView({ data }: { data: MundialData }) {
  const { scorers, assists, teamLeaders, xg, active } = data;
  const noPlayerData = scorers.length === 0 && assists.length === 0;

  return (
    <div className="space-y-8">
      {noPlayerData && (
        <Empty>
          {active
            ? "Aún no hay estadísticas registradas — aparecerán según se jueguen los partidos."
            : "Las estadísticas empiezan a contar cuando arranque el Mundial el 11 de junio. Vuelve durante el torneo."}
        </Empty>
      )}

      {(teamLeaders.mostScoring || teamLeaders.mostConceded || xg) && (
        <div className="grid3">
          {teamLeaders.mostScoring && (
            <TeamStatCard
              tag="Equipo más goleador"
              row={teamLeaders.mostScoring}
              value={teamLeaders.mostScoring.all.goals.for}
              unit="goles a favor"
            />
          )}
          {teamLeaders.mostConceded && (
            <TeamStatCard
              tag="Equipo más goleado"
              row={teamLeaders.mostConceded}
              value={teamLeaders.mostConceded.all.goals.against}
              unit="goles en contra"
              danger
            />
          )}
          {xg && <XgCard xg={xg} />}
        </div>
      )}

      {scorers.length > 0 && (
        <div>
          <div className="shead">
            <h2>Máximo goleador</h2>
          </div>
          <PlayerTable players={scorers} metric="goals" />
        </div>
      )}

      {assists.length > 0 && (
        <div>
          <div className="shead">
            <h2>Máximo asistidor</h2>
          </div>
          <PlayerTable players={assists} metric="assists" />
        </div>
      )}
    </div>
  );
}

function PlayerTable({
  players,
  metric,
}: {
  players: PlayerStatLeader[];
  metric: "goals" | "assists";
}) {
  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <table className="board">
        <thead>
          <tr>
            <th>#</th>
            <th>Jugador</th>
            <th>Selección</th>
            <th className="text-right">{metric === "goals" ? "Goles" : "Asist."}</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => {
            const st = p.statistics[0];
            const value =
              metric === "goals" ? st?.goals.total : st?.goals.assists;
            return (
              <tr key={p.player.id}>
                <td className="pos">{i + 1}</td>
                <td className="who">
                  <span className="flex items-center gap-2">
                    {p.player.photo && (
                      <Image
                        src={p.player.photo}
                        alt=""
                        width={26}
                        height={26}
                        unoptimized
                        style={{ borderRadius: "50%", objectFit: "cover" }}
                      />
                    )}
                    {p.player.name}
                  </span>
                </td>
                <td>
                  <span className="flex items-center gap-2" style={{ color: "var(--text-dim)" }}>
                    {st?.team.logo && (
                      <Image src={st.team.logo} alt="" width={18} height={18} unoptimized />
                    )}
                    {st?.team.name}
                  </span>
                </td>
                <td className="pts">{value ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamStatCard({
  tag,
  row,
  value,
  unit,
  danger,
}: {
  tag: string;
  row: StandingRow;
  value: number;
  unit: string;
  danger?: boolean;
}) {
  return (
    <div className="infocard">
      <span className="infocard__tag">{tag}</span>
      <div className="flex items-center gap-3" style={{ marginTop: 14 }}>
        <Image src={row.team.logo} alt="" width={36} height={36} unoptimized />
        <span className="display" style={{ fontSize: "1.5rem" }}>
          {row.team.name}
        </span>
      </div>
      <div
        className="bignum"
        style={{
          fontSize: "2.6rem",
          marginTop: 12,
          color: danger ? "#ff8a8a" : "var(--accent)",
        }}
      >
        {value}
      </div>
      <p style={{ color: "var(--text-dim)", fontSize: "0.84rem", margin: "2px 0 0" }}>
        {unit}
      </p>
    </div>
  );
}

function XgCard({ xg }: { xg: XgLeader }) {
  return (
    <div className="infocard">
      <span className="infocard__tag">Equipo con más xG</span>
      <div className="flex items-center gap-3" style={{ marginTop: 14 }}>
        <Image src={xg.team.logo} alt="" width={36} height={36} unoptimized />
        <span className="display" style={{ fontSize: "1.5rem" }}>
          {xg.team.name}
        </span>
      </div>
      <div className="bignum" style={{ fontSize: "2.6rem", marginTop: 12, color: "var(--accent)" }}>
        {xg.xg.toFixed(1)}
      </div>
      <p style={{ color: "var(--text-dim)", fontSize: "0.84rem", margin: "2px 0 0" }}>
        xG acumulado
      </p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="panel"
      style={{
        padding: 32,
        textAlign: "center",
        borderStyle: "dashed",
        color: "var(--text-dim)",
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
