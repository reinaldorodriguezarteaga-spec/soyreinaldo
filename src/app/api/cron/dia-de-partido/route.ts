import { NextResponse } from "next/server";
import { notificarUsuario } from "@/lib/push/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { allFixturesCacheKey, type Fixture } from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";
import { conTildes } from "@/lib/sports/nombres";
import { readCache } from "@/lib/sports/sports-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * "Hoy juega tu equipo" (17-oct, pedido del dueño): aviso push el día que
 * juega el equipo principal ("Mi equipo") de cada persona. Si el partido
 * entra en la quiniela y aún no lo ha pronosticado, se lo recuerda.
 * pg_cron `dia-de-partido` (migración 076), 09:30 UTC. Solo push: el correo
 * diario ya lo manda `recordatorio-quiniela`.
 *
 * Partidos de la caché del cron (temporada completa de cada competición):
 * no llama a API-Football. `?simular=1` devuelve lo que enviaría.
 */
const hoyMadrid = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);
const hora = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = clienteServicio();
  if (!db) return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  const simular = new URL(request.url).searchParams.get("simular") === "1";

  const { data: perfiles } = await db
    .from("profiles")
    .select("id, mi_equipo_id, mi_equipo_liga, wants_reminders")
    .not("mi_equipo_id", "is", null)
    .returns<{ id: string; mi_equipo_id: number; mi_equipo_liga: string | null; wants_reminders: boolean | null }[]>();
  const avisables = (perfiles ?? []).filter((p) => p.wants_reminders !== false);
  if (avisables.length === 0) return NextResponse.json({ ok: true, avisos: 0 });

  // Partidos de hoy (hora de Madrid) de esos equipos.
  const hoy = hoyMadrid(new Date());
  const equipos = new Set(avisables.map((p) => p.mi_equipo_id));
  const deHoy = new Map<number, { f: Fixture; slug: string }>();
  const temporadas = await Promise.all(
    COMPETITIONS.map((c) => readCache<Fixture[]>(allFixturesCacheKey(c), Number.POSITIVE_INFINITY).catch(() => null)),
  );
  COMPETITIONS.forEach((c, i) => {
    for (const f of temporadas[i] ?? []) {
      if (hoyMadrid(new Date(f.fixture.date)) !== hoy) continue;
      for (const id of [f.teams.home.id, f.teams.away.id]) {
        if (equipos.has(id) && !deHoy.has(id)) deHoy.set(id, { f, slug: c.slug });
      }
    }
  });

  // ¿Entra en la quiniela y le falta el pronóstico?
  const idsPartido = [...new Set([...deHoy.values()].map((x) => x.f.fixture.id))];
  const [{ data: enQuiniela }, { data: hechos }] = idsPartido.length
    ? await Promise.all([
        db.from("lq_matches").select("id").in("id", idsPartido).eq("counts_for_scoring", true).returns<{ id: number }[]>(),
        db.from("lq_predictions").select("user_id, match_id").in("match_id", idsPartido).returns<{ user_id: string; match_id: number }[]>(),
      ])
    : [{ data: [] }, { data: [] }];
  const quiniela = new Set((enQuiniela ?? []).map((m) => m.id));
  const pronosticado = new Set((hechos ?? []).map((h) => `${h.user_id}:${h.match_id}`));

  const avisos = avisables
    .map((p) => {
      const x = deHoy.get(p.mi_equipo_id);
      if (!x) return null;
      const { f, slug } = x;
      const mio = f.teams.home.id === p.mi_equipo_id ? f.teams.home.name : f.teams.away.name;
      const falta = quiniela.has(f.fixture.id) && !pronosticado.has(`${p.id}:${f.fixture.id}`);
      return {
        userId: p.id,
        payload: {
          title: `⭐ Hoy juega el ${conTildes(mio)}`,
          body: `${conTildes(f.teams.home.name)} – ${conTildes(f.teams.away.name)} a las ${hora(f.fixture.date)}. ${
            falta ? "¡Haz tu pronóstico antes de que empiece!" : "Síguelo en directo."
          }`,
          url: falta ? "/quiniela-liga/partidos" : `/liga/${slug}/partido/${f.fixture.id}`,
          tag: `dia-de-partido-${hoy}`,
        },
      };
    })
    .filter((a): a is NonNullable<typeof a> => a != null);

  if (simular) return NextResponse.json({ simulacion: true, hoy, conEquipo: avisables.length, avisos });

  let enviados = 0;
  for (const a of avisos) {
    enviados += await notificarUsuario(a.userId, a.payload).catch(() => 0);
  }
  return NextResponse.json({ ok: true, hoy, avisos: avisos.length, enviados });
}
