import type React from "react";

/** Un evento bajo el marcador (gol, expulsión, penalti fallado, gol anulado). */
export type Ev = {
  icon: string;
  minute: number | null;
  player: string;
  tag: string;
  assist: string | null;
  /** true para eventos que NO cuentan (pen. fallado, gol anulado) → atenuados. */
  muted?: boolean;
  playerId?: number | null;
};

/* ------------------------------------------------------------------------
 * Cronología bajo el marcador (15-oct, pedido del dueño con capturas de
 * referencia): tres columnas — local a la derecha, icono en medio, visitante
 * a la izquierda —, un jugador por línea con todos sus minutos ("Malen 51',
 * 57'"), "(pen)" tras el minuto de penalti, sin asistentes. Filas aparte
 * para penaltis fallados y expulsiones. Los goles anulados no salen.
 * ---------------------------------------------------------------------- */

type LineaCrono = { player: string; minutos: string };

/** Nombre "conocido" y corto de un jugador: el de la plantilla si se tiene
 * su id, recortado ("K. Mbappé" → "Mbappé"). También para la crónica. */
export function nombreConocido(
  nombre: string,
  playerId: number | null | undefined,
  nombres: Map<number, string>,
): string {
  return nombreCorto((playerId != null ? nombres.get(playerId) : undefined) ?? nombre);
}

const PARTICULAS = new Set(["de", "da", "do", "dos", "das", "del", "di", "van", "von", "der", "den", "la", "le", "ter", "ten"]);
const SUFIJOS = new Set(["júnior", "junior", "jr", "jr.", "neto", "filho", "sobrinho"]);

/** Jugadores que se conocen por un nombre que no sale de la regla general
 * (clave: nombre de la plantilla o del evento, en minúsculas y sin tildes).
 * Ampliable: si alguno sale raro en una ficha, se añade aquí. */
const ALIAS: Record<string, string> = {
  "vinicius junior": "Vini Jr.",
  "vinicius jr.": "Vini Jr.",
  "gabriel jesus": "Gabriel Jesus",
  "lamine yamal": "Lamine Yamal",
  "endrick felipe moreira de sousa": "Endrick",
};

const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Nombre corto como en los marcadores de los móviles: primero el alias; si
 * no, el apellido ("Dani Olmo" → "Olmo", "K. Mbappé" → "Mbappé", "Marten de
 * Roon" → "de Roon"); los de una palabra ("Endrick", "Pedri"), tal cual. */
export function nombreCorto(nombre: string): string {
  const alias = ALIAS[sinTildes(nombre.trim())];
  if (alias) return alias;
  const partes = nombre.trim().split(/\s+/);
  if (partes.length <= 1) return nombre;
  const ult = partes[partes.length - 1];
  if (SUFIJOS.has(ult.toLowerCase())) return partes.slice(-2).join(" ");
  let i = partes.length - 1;
  while (i > 0 && PARTICULAS.has(partes[i - 1].toLowerCase())) i--;
  return partes.slice(i).join(" ");
}

/** Agrupa por jugador en el orden en que aparece cada uno. */
function agruparPorJugador(
  evs: Ev[],
  etiqueta: (e: Ev) => string,
  nombres: Map<number, string>,
): LineaCrono[] {
  const orden: string[] = [];
  const por = new Map<string, { player: string; mins: string[] }>();
  for (const e of evs) {
    const clave = e.playerId != null ? `id:${e.playerId}` : `n:${e.player}`;
    if (!por.has(clave)) {
      const conocido = e.playerId != null ? nombres.get(e.playerId) : undefined;
      por.set(clave, { player: conocido ?? e.player, mins: [] });
      orden.push(clave);
    }
    const tag = etiqueta(e);
    por.get(clave)!.mins.push(`${e.minute ?? "?"}'${tag ? ` ${tag}` : ""}`);
  }
  return orden.map((k) => ({ player: por.get(k)!.player, minutos: por.get(k)!.mins.join(", ") }));
}

function seccionesCrono(lines: Ev[], nombres: Map<number, string>) {
  return {
    goles: agruparPorJugador(
      lines.filter((e) => e.icon === "⚽"),
      (e) => (e.tag === "(pen.)" ? "(pen)" : e.tag === "(p.p.)" ? "(p.p.)" : ""),
      nombres,
    ),
    fallados: agruparPorJugador(
      lines.filter((e) => e.tag === "(pen. fallado)"),
      () => "",
      nombres,
    ),
    rojas: agruparPorJugador(
      lines.filter((e) => e.icon === "🟥"),
      (e) => (e.tag ? "(2ª am.)" : ""),
      nombres,
    ),
  };
}

/** Portería pequeña con una X roja: penalti fallado. */
function IconoPenaltiFallado() {
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" aria-label="Penalti fallado" role="img">
      <path d="M2 15V3h16v12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 7h16M2 11h16M7 3v12M13 3v12" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
      <path d="M6 5l8 8M14 5l-8 8" stroke="#ff4d5e" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Cronologia({
  home,
  away,
  nombres,
  compacta = false,
}: {
  home: Ev[];
  away: Ev[];
  /** id de jugador → nombre en la plantilla (el "conocido"). */
  nombres: Map<number, string>;
  /** Ficha para vídeos: letra algo menor y menos aire. */
  compacta?: boolean;
}) {
  const h = seccionesCrono(home, nombres);
  const a = seccionesCrono(away, nombres);
  const filas: { key: string; icono: React.ReactNode; h: LineaCrono[]; a: LineaCrono[] }[] = [
    { key: "goles", icono: <span aria-label="Goles">⚽</span>, h: h.goles, a: a.goles },
    { key: "fallados", icono: <IconoPenaltiFallado />, h: h.fallados, a: a.fallados },
    { key: "rojas", icono: <span aria-label="Expulsiones">🟥</span>, h: h.rojas, a: a.rojas },
  ].filter((f) => f.h.length > 0 || f.a.length > 0);
  if (filas.length === 0) return null;
  const linea = (l: LineaCrono, i: number) => (
    <div key={i}>
      <span title={l.player}>{nombreCorto(l.player)}</span>{" "}
      <span style={{ color: "var(--text-dim)" }}>{l.minutos}</span>
    </div>
  );
  return (
    <div style={{ marginTop: compacta ? 10 : 18, display: "grid", gap: compacta ? 8 : 12 }}>
      {filas.map((f) => (
        <div
          key={f.key}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 28px 1fr",
            gap: 12,
            alignItems: "start",
            fontSize: compacta ? "0.8rem" : "0.86rem",
            lineHeight: 1.45,
          }}
        >
          <div style={{ textAlign: "right" }}>{f.h.map(linea)}</div>
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 1, color: "var(--text-dim)" }}>
            {f.icono}
          </div>
          <div style={{ textAlign: "left" }}>{f.a.map(linea)}</div>
        </div>
      ))}
    </div>
  );
}
