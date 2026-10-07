/**
 * Recordatorio diario de la quiniela (cron `recordatorio-quiniela`, 10:00 de
 * España): a quien juega de verdad y no se ha dado de baja, UN aviso con los
 * partidos de las próximas 24 h que aún no ha pronosticado. Cada partido se
 * cierra a su hora de inicio, así que el que llega tarde pierde esos puntos.
 */

export type PartidoProximo = {
  id: number;
  kickoffAt: string;
  local: string;
  visitante: string;
};

/** Para cada usuario, los partidos de `partidos` que NO ha pronosticado. */
export function pendientesPorUsuario(
  partidos: PartidoProximo[],
  pronosticados: { userId: string; matchId: number }[],
  usuarios: string[],
): Map<string, PartidoProximo[]> {
  const hechos = new Set(pronosticados.map((p) => `${p.userId}:${p.matchId}`));
  const out = new Map<string, PartidoProximo[]>();
  for (const u of usuarios) {
    const faltan = partidos.filter((m) => !hechos.has(`${u}:${m.id}`));
    if (faltan.length > 0) out.set(u, faltan);
  }
  return out;
}

const hora = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function emailRecordatorio(opts: {
  nombre: string;
  partidos: PartidoProximo[];
  urlPronosticar: string;
  urlBaja: string;
}): { subject: string; html: string } {
  const n = opts.partidos.length;
  const subject =
    n === 1
      ? `⚽ Te falta 1 pronóstico: ${opts.partidos[0].local} - ${opts.partidos[0].visitante}`
      : `⚽ Te faltan ${n} pronósticos de la quiniela`;
  const filas = opts.partidos
    .map(
      (m) =>
        `<tr><td style="padding:6px 0;color:#9aa4d6;font-size:13px;white-space:nowrap">${esc(hora(m.kickoffAt))}</td>` +
        `<td style="padding:6px 10px">${esc(m.local)} – ${esc(m.visitante)}</td></tr>`,
    )
    .join("");
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;background:#0a1030;color:#e8ecff;padding:28px;border-radius:16px;max-width:460px;margin:auto">
  <h2 style="margin:0 0 8px;font-size:20px">Hola, ${esc(opts.nombre)}</h2>
  <p style="margin:0 0 14px;color:#c5cbef">Hoy se juegan partidos de la quiniela que aún no has pronosticado. Cada uno se cierra a su hora de inicio:</p>
  <table style="border-collapse:collapse;margin:0 0 18px">${filas}</table>
  <a href="${opts.urlPronosticar}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">Hacer mis pronósticos</a>
  <p style="margin:22px 0 0;color:#7c84b8;font-size:12px">Recibes esto porque juegas a la quiniela de soyreinaldo.com. <a href="${opts.urlBaja}" style="color:#9aa4d6">No quiero más recordatorios</a>.</p>
</div>`;
  return { subject, html };
}

/** Email del resumen de jornada (cron `resumen-jornada`). */
export function emailResumenJornada(opts: {
  nombre: string;
  jornada: number;
  liga: string;
  puntos: number;
  exactos: number;
  aciertos: number;
  jugados: number;
  puestoAhora: number | null;
  puestoAntes: number | null;
  totalJugadores: number;
  urlTarjeta: string;
  urlClasificacion: string;
  urlBaja: string;
}): { subject: string; html: string } {
  const mov =
    opts.puestoAhora != null && opts.puestoAntes != null ? opts.puestoAntes - opts.puestoAhora : 0;
  const movTexto =
    mov > 0 ? `subes ${mov} ${mov === 1 ? "puesto" : "puestos"} ⬆️` : mov < 0 ? `bajas ${-mov} ${mov === -1 ? "puesto" : "puestos"} ⬇️` : "mantienes el puesto";
  const subject = `🏆 Jornada ${opts.jornada}: ${opts.puntos} puntos${opts.puestoAhora ? ` · vas ${opts.puestoAhora}º` : ""}`;
  const puestoHtml = opts.puestoAhora
    ? `<p style="margin:0 0 6px;font-size:16px">Vas <strong>${opts.puestoAhora}º de ${opts.totalJugadores}</strong> en ${esc(opts.liga)} — ${movTexto}.</p>`
    : "";
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;background:#0a1030;color:#e8ecff;padding:28px;border-radius:16px;max-width:460px;margin:auto">
  <h2 style="margin:0 0 8px;font-size:20px">Jornada ${opts.jornada}, ${esc(opts.nombre)}</h2>
  <p style="margin:0 0 6px;font-size:28px;font-weight:800">${opts.puntos} puntos</p>
  <p style="margin:0 0 14px;color:#c5cbef">${opts.exactos} ${opts.exactos === 1 ? "resultado exacto" : "resultados exactos"} · ${opts.aciertos} ${opts.aciertos === 1 ? "acierto" : "aciertos"} · ${opts.jugados} ${opts.jugados === 1 ? "pronóstico" : "pronósticos"}</p>
  ${puestoHtml}
  <p style="margin:18px 0 0">
    <a href="${opts.urlTarjeta}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;margin:0 8px 8px 0">Compartir mi jornada</a>
    <a href="${opts.urlClasificacion}" style="display:inline-block;color:#9aa4d6;padding:12px 4px">Ver la clasificación</a>
  </p>
  <p style="margin:22px 0 0;color:#7c84b8;font-size:12px">Recibes esto porque juegas a la quiniela de soyreinaldo.com. <a href="${opts.urlBaja}" style="color:#9aa4d6">No quiero más correos</a>.</p>
</div>`;
  return { subject, html };
}
