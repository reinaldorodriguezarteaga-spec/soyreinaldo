/**
 * Boletín semanal (cron `boletin`, viernes por la mañana): el último análisis
 * de Reinaldo, los partidazos del fin de semana y la quiniela (cuándo empieza
 * la jornada, el top 3 y el puesto de quien lo recibe). Pensado para traer de
 * vuelta a las cuentas registradas que no juegan cada semana (13-oct-2026:
 * 183 cuentas, 31 en la quiniela).
 */

export type AnalisisBoletin = { titulo: string; entradilla: string | null; url: string };
export type PartidoBoletin = { fecha: string; local: string; visitante: string; url: string };
export type QuinielaBoletin = {
  jornada: number;
  primerPartido: string;
  top3: { nombre: string; puntos: number }[];
  /** Puesto de quien lo recibe en la liga pública, si juega. */
  miPuesto: { puesto: number; de: number; puntos: number } | null;
};

export type DatosBoletin = {
  nombre: string;
  analisis: AnalisisBoletin[];
  partidos: PartidoBoletin[];
  quiniela: QuinielaBoletin | null;
  urlQuiniela: string;
  urlWeb: string;
  urlBaja: string;
};

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cuando = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/** ¿Hay algo que contar? Sin análisis, sin partidos y sin quiniela, no se envía. */
export function boletinConContenido(d: Pick<DatosBoletin, "analisis" | "partidos" | "quiniela">): boolean {
  return d.analisis.length > 0 || d.partidos.length > 0 || d.quiniela != null;
}

export function emailBoletin(d: DatosBoletin): { subject: string; html: string } {
  const subject = d.analisis[0]
    ? `⚽ Esta semana en Soy Reinaldo: ${d.analisis[0].titulo}`
    : "⚽ Esta semana en Soy Reinaldo: partidazos y quiniela";

  const bloque = (titulo: string, cuerpo: string) =>
    `<h3 style="margin:22px 0 8px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#9aa4d6">${titulo}</h3>${cuerpo}`;

  const analisis = d.analisis.length
    ? bloque(
        "✍️ El análisis",
        d.analisis
          .map(
            (a) =>
              `<p style="margin:0 0 12px"><a href="${a.url}" style="color:#e8ecff;font-size:17px;font-weight:700;text-decoration:none">${esc(a.titulo)}</a>` +
              (a.entradilla ? `<br><span style="color:#c5cbef;font-size:14px">${esc(a.entradilla)}</span>` : "") +
              `<br><a href="${a.url}" style="color:#3b82f6;font-size:13px">Leer →</a></p>`,
          )
          .join(""),
      )
    : "";

  const partidos = d.partidos.length
    ? bloque(
        "📅 Los partidazos",
        `<table style="border-collapse:collapse">${d.partidos
          .map(
            (p) =>
              `<tr><td style="padding:5px 12px 5px 0;color:#9aa4d6;font-size:13px;white-space:nowrap">${esc(cuando(p.fecha))}</td>` +
              `<td style="padding:5px 0"><a href="${p.url}" style="color:#e8ecff;text-decoration:none">${esc(p.local)} – ${esc(p.visitante)}</a></td></tr>`,
          )
          .join("")}</table>`,
      )
    : "";

  const q = d.quiniela;
  const quiniela = q
    ? bloque(
        "🏆 La quiniela",
        `<p style="margin:0 0 8px;color:#c5cbef">La jornada ${q.jornada} empieza el ${esc(cuando(q.primerPartido))}. Cada partido se cierra 30 minutos antes de empezar.</p>` +
          (q.top3.length
            ? `<p style="margin:0 0 8px;color:#c5cbef">Arriba: ${q.top3
                .map((t, i) => `${["🥇", "🥈", "🥉"][i]} ${esc(t.nombre)} (${t.puntos})`)
                .join(" · ")}</p>`
            : "") +
          (q.miPuesto
            ? `<p style="margin:0 0 8px">Tú vas <strong>${q.miPuesto.puesto}º de ${q.miPuesto.de}</strong> con ${q.miPuesto.puntos} puntos.</p>`
            : `<p style="margin:0 0 8px">¿Aún no juegas? Es gratis y se juega con tu gente.</p>`) +
          `<a href="${d.urlQuiniela}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:11px 16px;border-radius:10px;font-weight:600;margin-top:4px">${q.miPuesto ? "Hacer mis pronósticos" : "Jugar a la quiniela"}</a>`,
      )
    : "";

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;background:#0a1030;color:#e8ecff;padding:28px;border-radius:16px;max-width:520px;margin:auto">
  <h2 style="margin:0 0 6px;font-size:20px">Hola, ${esc(d.nombre)}</h2>
  <p style="margin:0;color:#c5cbef">Lo que no te puedes perder esta semana en <a href="${d.urlWeb}" style="color:#9aa4d6">soyreinaldo.com</a>.</p>
  ${analisis}${partidos}${quiniela}
  <p style="margin:26px 0 0;color:#7c84b8;font-size:12px">Recibes esto porque tienes cuenta en soyreinaldo.com. <a href="${d.urlBaja}" style="color:#9aa4d6">No quiero más correos</a>.</p>
</div>`;
  return { subject, html };
}
