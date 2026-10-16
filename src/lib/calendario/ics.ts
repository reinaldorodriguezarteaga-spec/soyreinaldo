/**
 * Calendario iCalendar (RFC 5545) de los partidos de tus equipos, para
 * suscribirse desde Google Calendar o el iPhone (/api/calendario/[token]).
 */

export type EventoPartido = {
  id: number;
  inicio: string;
  local: string;
  visitante: string;
  competicion: string;
  url: string;
  /** "1–4" si ya se jugó. */
  resultado: string | null;
};

const DURACION_MS = 2 * 3_600_000;

/** Fecha en formato UTC de iCalendar: 20261017T163000Z. */
const fechaIcs = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escapar = (t: string) =>
  t.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Líneas de más de 75 octetos se parten con un espacio al inicio (RFC 5545 §3.1). */
function plegar(linea: string): string {
  const bytes = new TextEncoder().encode(linea);
  if (bytes.length <= 75) return linea;
  const partes: string[] = [];
  let actual = "";
  let tam = 0;
  for (const ch of linea) {
    const n = new TextEncoder().encode(ch).length;
    const max = partes.length === 0 ? 75 : 74;
    if (tam + n > max) {
      partes.push(actual);
      actual = "";
      tam = 0;
    }
    actual += ch;
    tam += n;
  }
  partes.push(actual);
  return partes.join("\r\n ");
}

export function calendarioIcs(eventos: EventoPartido[], ahora: number, nombre: string): string {
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Soy Reinaldo//Mis equipos//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(nombre)}`,
    "X-WR-TIMEZONE:Europe/Madrid",
    // Cada cuánto vuelven a mirar las apps (horarios que cambian, resultados).
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const e of eventos) {
    const t = Date.parse(e.inicio);
    if (!Number.isFinite(t)) continue;
    const titulo = e.resultado
      ? `${e.local} ${e.resultado} ${e.visitante}`
      : `⚽ ${e.local} – ${e.visitante}`;
    lineas.push(
      "BEGIN:VEVENT",
      `UID:partido-${e.id}@soyreinaldo.com`,
      `DTSTAMP:${fechaIcs(ahora)}`,
      `DTSTART:${fechaIcs(t)}`,
      `DTEND:${fechaIcs(t + DURACION_MS)}`,
      `SUMMARY:${escapar(titulo)}`,
      `DESCRIPTION:${escapar(`${e.competicion}\nEn directo: ${e.url}`)}`,
      `URL:${e.url}`,
      "END:VEVENT",
    );
  }
  lineas.push("END:VCALENDAR");
  return lineas.map(plegar).join("\r\n") + "\r\n";
}
