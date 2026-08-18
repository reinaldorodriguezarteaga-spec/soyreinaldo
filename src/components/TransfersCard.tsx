import Image from "next/image";
import { getTeamRecentTransfers, type RecentTransfer } from "@/lib/sports/api-football";
import { FEATURED_TEAMS } from "@/lib/sports/competitions";

/** Etiqueta ES del tipo de movimiento. Los importes ("€ 60M") se muestran
 * tal cual — es el dato más comercial de la fila. */
function typeLabel(type: string | null): string {
  if (!type || type === "N/A" || type === "-") return "Traspaso";
  if (/^loan$/i.test(type)) return "Cesión";
  if (/^free$/i.test(type)) return "Libre";
  if (/^transfer$/i.test(type)) return "Traspaso";
  return type; // "€ 60M" y similares
}

/** Rail "Fichajes" de la portada (escritorio), estilo FotMob: últimos
 * movimientos de los equipos destacados (Barça, Madrid, Atleti, ManU,
 * City, Liverpool, PSG, Lyon), más recientes primero. */
export default async function TransfersCard() {
  const perTeam = await Promise.all(
    FEATURED_TEAMS.map((t) => getTeamRecentTransfers(t.id).catch(() => [])),
  );

  // Dedupe global (un fichaje entre dos destacados aparece en ambos clubes).
  const byKey = new Map<string, RecentTransfer>();
  for (const list of perTeam) {
    for (const tr of list) {
      const key = `${tr.player}|${tr.to?.name ?? ""}`;
      const prev = byKey.get(key);
      if (!prev || tr.date > prev.date) byKey.set(key, tr);
    }
  }
  const transfers = [...byKey.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  if (transfers.length === 0) return null;

  return (
    <div className="panel" style={{ overflow: "hidden" }}>
      <div style={{ padding: "14px 16px" }}>
        <b
          className="mono"
          style={{ fontSize: "0.64rem", letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Fichajes
        </b>
      </div>
      <div style={{ borderTop: "1px solid var(--line)" }}>
        {transfers.map((tr) => (
          <div key={`${tr.player}-${tr.date}-${tr.to?.name}`} className="transferitem">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="transferitem__player">{tr.player}</div>
              <div className="transferitem__clubs">
                {tr.from?.logo && (
                  <Image src={tr.from.logo} alt="" width={14} height={14} unoptimized />
                )}
                <span className="truncate">{tr.from?.name ?? "—"}</span>
                <span style={{ color: "var(--accent)" }}>→</span>
                {tr.to?.logo && (
                  <Image src={tr.to.logo} alt="" width={14} height={14} unoptimized />
                )}
                <span className="truncate">{tr.to?.name ?? "—"}</span>
              </div>
            </div>
            <span className="transferitem__type">{typeLabel(tr.type)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
