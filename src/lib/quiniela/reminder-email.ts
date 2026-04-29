/**
 * HTML del email recordatorio diario / semanal.
 */
import { venueShortName, venueTimezone } from "./venues";

export type PendingMatch = {
  id: number;
  kickoff_at: string;
  venue: string | null;
  group_letter: string | null;
  phase: string;
  home_name: string;
  home_flag: string;
  away_name: string;
  away_flag: string;
};

const PHASE_LABEL: Record<string, string> = {
  group_md1: "Fecha 1",
  group_md2: "Fecha 2",
  group_md3: "Fecha 3",
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semis",
  third_place: "Tercer puesto",
  final: "Final",
};

const MADRID_DAY = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Madrid",
});

const MADRID_TIME = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

function timeIn(iso: string, tz: string) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(new Date(iso));
}

function matchRow(m: PendingMatch): string {
  const d = new Date(m.kickoff_at);
  const day = MADRID_DAY.format(d)
    .replace(",", "")
    .replace(/^./, (c) => c.toUpperCase());
  const madridTime = MADRID_TIME.format(d);
  const tz = venueTimezone(m.venue);
  const venueLine = tz
    ? `${venueShortName(m.venue)} · ${timeIn(m.kickoff_at, tz)}`
    : "";

  return `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #27272a;">
        <div style="font-size: 14px; color: #fafafa;">
          <span style="font-size: 18px; vertical-align: middle;">${m.home_flag}</span>
          <strong>${m.home_name}</strong>
          <span style="color: #71717a;"> vs </span>
          <strong>${m.away_name}</strong>
          <span style="font-size: 18px; vertical-align: middle;">${m.away_flag}</span>
        </div>
        <div style="margin-top: 4px; font-size: 12px; color: #a1a1aa;">
          ${day} · <strong style="color: #c7d2fe;">${madridTime}</strong> Madrid
          ${venueLine ? `<span style="color: #52525b;"> · ${venueLine} local</span>` : ""}
        </div>
      </td>
    </tr>
  `;
}

export function buildReminderEmail({
  displayName,
  matches,
  unsubscribeUrl,
  predictUrl,
  isWeekly,
}: {
  displayName: string;
  matches: PendingMatch[];
  unsubscribeUrl: string;
  predictUrl: string;
  isWeekly: boolean;
}): { subject: string; html: string } {
  const count = matches.length;
  const subject = isWeekly
    ? `${count} partido${count === 1 ? "" : "s"} esta semana sin predecir`
    : `${count} partido${count === 1 ? "" : "s"} mañana sin predecir`;

  const intro = isWeekly
    ? `Estos son los partidos del Mundial 2026 de los próximos 7 días que aún no has pronosticado.`
    : `Estos son los partidos del Mundial 2026 que se juegan en las próximas horas y aún no has pronosticado.`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #09090b; color: #fafafa;">
  <h2 style="margin: 0 0 8px; font-size: 22px; color: #fafafa;">
    Hola ${displayName} 👋
  </h2>
  <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.55; color: #a1a1aa;">
    ${intro}
  </p>

  <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #27272a;">
    ${matches.map(matchRow).join("")}
  </table>

  <p style="margin: 32px 0 0; text-align: center;">
    <a href="${predictUrl}"
       style="display: inline-block; background: #a5b4fc; color: #09090b; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Predecir ahora
    </a>
  </p>

  <p style="margin: 24px 0 0; font-size: 12px; line-height: 1.5; color: #71717a;">
    No puedes editar un pronóstico una vez empieza el partido. Si decides no
    rellenar, cuentas como 0 puntos en ese encuentro.
  </p>

  <hr style="margin: 32px 0; border: none; border-top: 1px solid #27272a;" />

  <p style="margin: 0; font-size: 12px; color: #52525b;">
    — Reinaldo · <a href="https://soyreinaldo.com" style="color: #6366f1;">soyreinaldo.com</a>
  </p>
  <p style="margin: 12px 0 0; font-size: 11px; color: #52525b;">
    ¿No quieres más recordatorios?
    <a href="${unsubscribeUrl}" style="color: #71717a;">Darte de baja</a>
  </p>
</div>
  `.trim();

  return { subject, html };
}
