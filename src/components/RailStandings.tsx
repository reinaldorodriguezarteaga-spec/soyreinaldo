import Image from "next/image";
import Link from "next/link";
import type { StandingRow } from "@/lib/sports/api-football";

/**
 * Tabla de clasificación COMPACTA para los rails laterales de la portada
 * (estilo FotMob: # · equipo · PJ · DG · PTS). La `StandingsTableView`
 * completa (8 columnas) desbordaba los ~300px del rail y se montaba encima
 * del feed central — esta cabe siempre. Cada fila enlaza a la ficha del
 * equipo; la cabecera, a la tabla completa.
 */
export default function RailStandings({
  slug,
  standings,
  rows = 10,
}: {
  slug: string;
  standings: StandingRow[];
  rows?: number;
}) {
  return (
    <div className="panel" style={{ overflow: "hidden" }}>
      <table className="railtable">
        <thead>
          <tr>
            <th>#</th>
            <th style={{ textAlign: "left" }}>Equipo</th>
            <th>PJ</th>
            <th>DG</th>
            <th>PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.slice(0, rows).map((r) => (
            <tr key={r.team.id}>
              <td className="railtable__pos">{r.rank}</td>
              <td>
                <Link
                  href={`/liga/${slug}/equipo/${r.team.id}`}
                  className="railtable__club"
                >
                  <Image src={r.team.logo} alt="" width={16} height={16} unoptimized />
                  <span className="truncate">{r.team.name}</span>
                </Link>
              </td>
              <td className="railtable__num">{r.all.played}</td>
              <td className="railtable__num">
                {r.goalsDiff > 0 ? `+${r.goalsDiff}` : r.goalsDiff}
              </td>
              <td className="railtable__pts">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
