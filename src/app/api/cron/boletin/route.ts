import { NextResponse } from "next/server";
import { Resend } from "resend";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { ANFITRION_ID } from "@/lib/quiniela-liga/anfitrion";
import {
  boletinConContenido,
  emailBoletin,
  type EquipoBoletin,
  type PartidoBoletin,
} from "@/lib/boletin/boletin";
import { equipoBoletin } from "@/lib/boletin/equipos";
import {
  getTeamFixtures,
  teamFixturesLastCacheKey,
  teamFixturesNextCacheKey,
  type Fixture,
} from "@/lib/sports/api-football";
import { COMPETITIONS, FEATURED_TEAMS } from "@/lib/sports/competitions";
import { conTildes } from "@/lib/sports/nombres";
import { readCache } from "@/lib/sports/sports-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Boletín semanal (lib/boletin/boletin.ts).
 *
 *  - `?simular=1`  → calcula el contenido y los destinatarios y devuelve el
 *    HTML de muestra, sin enviar nada.
 *  - `?prueba=1`   → lo envía SOLO al dueño (cuenta del anfitrión).
 *  - sin parámetros (el cron) → a todas las cuentas que aceptan avisos, como
 *    mucho `BOLETIN_MAX` por vuelta (límite diario de Resend), apuntando cada
 *    envío en `boletin_envios` para no repetir dentro de la misma semana.
 *
 * ⚠️ El cron se programa SOLO cuando el dueño aprueba la prueba.
 */
const PUBLICA = "9f992fa0-5f45-4204-87a7-b4c5feda6ae1";
const MAX_POR_VUELTA = Number(process.env.BOLETIN_MAX ?? 80);
const DIAS_PARTIDOS = 4;
/** "Tus equipos": como mucho estos por persona y estos distintos por vuelta
 * (los que no precalcula el cron cuestan 2 llamadas con caché de 30 min). */
const EQUIPOS_POR_PERSONA = 4;
const EQUIPOS_MAX = 60;

function edicion(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((t.getTime() - inicio.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(semana).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = clienteServicio();
  if (!db) return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.soyreinaldo.com";
  const q = new URL(request.url).searchParams;
  const simular = q.get("simular") === "1";
  const prueba = q.get("prueba") === "1";
  const ed = edicion();

  // 1. Contenido común.
  const desde = new Date(Date.now() - 8 * 86_400_000).toISOString();
  const { data: arts } = await db
    .from("articles")
    .select("slug, title, excerpt, published_at")
    .not("published_at", "is", null)
    .gte("published_at", desde)
    .order("published_at", { ascending: false })
    .limit(2)
    .returns<{ slug: string; title: string; excerpt: string | null }[]>();
  const analisis = (arts ?? []).map((a) => ({
    titulo: a.title,
    entradilla: a.excerpt,
    url: `${site}/analisis/${a.slug}`,
  }));

  const ahora = Date.now();
  const hasta = ahora + DIAS_PARTIDOS * 86_400_000;
  const vistos = new Set<number>();
  const partidos: (PartidoBoletin & { t: number })[] = [];
  for (const team of FEATURED_TEAMS) {
    const prox = (await readCache<Fixture[]>(teamFixturesNextCacheKey(team.id, 4), 7 * 86_400)) ?? [];
    for (const f of prox) {
      const t = Date.parse(f.fixture.date);
      if (t < ahora || t > hasta || vistos.has(f.fixture.id)) continue;
      vistos.add(f.fixture.id);
      const slug =
        COMPETITIONS.find((c) => c.leagueId === f.league.id)?.slug ?? team.homeCompetitionSlug;
      if (!slug) continue;
      partidos.push({
        t,
        fecha: f.fixture.date,
        local: conTildes(f.teams.home.name),
        visitante: conTildes(f.teams.away.name),
        url: `${site}/liga/${slug}/partido/${f.fixture.id}`,
      });
    }
  }
  partidos.sort((a, b) => a.t - b.t);

  const { data: prox } = await db
    .from("lq_matches")
    .select("matchday, kickoff_at")
    .eq("counts_for_scoring", true)
    .gt("kickoff_at", new Date().toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .returns<{ matchday: number; kickoff_at: string }[]>();
  const { data: tabla } = await db.rpc("lq_leaderboard", { p_league_id: PUBLICA });
  const filas = (tabla ?? []) as { user_id: string; display_name: string | null; total_points: number }[];
  const quinielaBase = prox?.[0]
    ? {
        jornada: prox[0].matchday,
        primerPartido: prox[0].kickoff_at,
        top3: filas.slice(0, 3).map((f) => ({ nombre: f.display_name ?? "—", puntos: f.total_points })),
      }
    : null;

  const contenido = { analisis, partidos: partidos.slice(0, 6), quiniela: quinielaBase && { ...quinielaBase, miPuesto: null } };
  if (!boletinConContenido(contenido)) {
    return NextResponse.json({ ok: true, enviados: 0, motivo: "sin contenido esta semana" });
  }

  // 2. Destinatarios.
  const { data: perfiles } = await db
    .from("profiles")
    .select("id, display_name, username, wants_reminders, unsubscribe_token, mi_equipo_id")
    .returns<
      {
        id: string;
        display_name: string | null;
        username: string | null;
        wants_reminders: boolean | null;
        unsubscribe_token: string | null;
        mi_equipo_id: number | null;
      }[]
    >();
  const { data: yaEnviados } = await db.from("boletin_envios").select("user_id").eq("edicion", ed);
  const hechos = new Set((yaEnviados ?? []).map((r: { user_id: string }) => r.user_id));
  // La prueba va al dueño aunque él tenga los avisos desactivados.
  const candidatos = (perfiles ?? []).filter((p) =>
    prueba
      ? p.id === ANFITRION_ID && p.unsubscribe_token
      : p.wants_reminders !== false && p.unsubscribe_token && !hechos.has(p.id),
  );

  // "Tus equipos" (16-oct): los favoritos de cada uno, "Mi equipo" primero.
  const { data: favs } = await db
    .from("user_favorites")
    .select("user_id, ref_id, label, link_path, created_at")
    .eq("kind", "team")
    .order("created_at")
    .returns<{ user_id: string; ref_id: string; label: string | null; link_path: string | null }[]>();
  const susEquipos = new Map<string, { id: number; nombre: string; liga: string | null }[]>();
  for (const f of favs ?? []) {
    const id = Number(f.ref_id);
    if (!Number.isInteger(id) || id <= 0) continue;
    const liga = f.link_path?.match(/^\/liga\/([^/]+)\//)?.[1] ?? null;
    susEquipos.set(f.user_id, [
      ...(susEquipos.get(f.user_id) ?? []),
      { id, nombre: conTildes(f.label ?? ""), liga },
    ]);
  }
  const partidosDe = new Map<number, { recientes: Fixture[]; proximos: Fixture[] }>();
  const distintos = [...new Set([...susEquipos.values()].flat().map((e) => e.id))].slice(0, EQUIPOS_MAX);
  for (const id of distintos) {
    try {
      const [rec, prox] = await Promise.all([
        readCache<Fixture[]>(teamFixturesLastCacheKey(id, 20), 2 * 86_400),
        readCache<Fixture[]>(teamFixturesNextCacheKey(id, 4), 2 * 86_400),
      ]);
      if (rec && prox) {
        partidosDe.set(id, { recientes: rec, proximos: prox });
      } else {
        const t = await getTeamFixtures(id, { last: 20, next: 4 });
        partidosDe.set(id, { recientes: t.recent, proximos: t.upcoming });
      }
    } catch {
      // Sin datos de ese equipo: no sale, el resto del boletín sí.
    }
  }
  const misEquiposDe = (p: (typeof candidatos)[number]): EquipoBoletin[] =>
    (susEquipos.get(p.id) ?? [])
      .map((e) => ({ ...e, principal: e.id === p.mi_equipo_id }))
      .sort((a, b) => Number(b.principal) - Number(a.principal))
      .slice(0, EQUIPOS_POR_PERSONA)
      .map((e) => {
        const d = partidosDe.get(e.id);
        return d ? equipoBoletin(e, d.recientes, d.proximos, site, ahora) : null;
      })
      .filter((e): e is EquipoBoletin => e != null);

  const datosPara = (p: (typeof candidatos)[number]) => {
    const idx = filas.findIndex((f) => f.user_id === p.id);
    return {
      nombre: p.display_name || p.username || "crack",
      misEquipos: misEquiposDe(p),
      ...contenido,
      quiniela: quinielaBase && {
        ...quinielaBase,
        miPuesto: idx >= 0 ? { puesto: idx + 1, de: filas.length, puntos: filas[idx].total_points } : null,
      },
      urlQuiniela: `${site}/quiniela-liga/partidos`,
      urlWeb: site,
      urlBaja: `${site}/baja-recordatorios?token=${p.unsubscribe_token}`,
    };
  };

  if (simular) {
    // Muestra: alguien con equipos favoritos, si lo hay.
    const quien = candidatos.find((p) => susEquipos.has(p.id)) ?? candidatos[0];
    const muestra = quien ? emailBoletin(datosPara(quien)) : null;
    return NextResponse.json({
      simulacion: true,
      edicion: ed,
      destinatarios: candidatos.length,
      analisis: analisis.map((a) => a.titulo),
      partidos: contenido.partidos.map((p) => `${p.local}-${p.visitante} ${p.fecha}`),
      quiniela: quinielaBase,
      conEquipos: candidatos.filter((p) => susEquipos.has(p.id)).length,
      equiposMuestra: quien ? misEquiposDe(quien) : [],
      asunto: muestra?.subject,
      html: muestra?.html,
    });
  }

  // 3. Envío.
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Sin RESEND_API_KEY" }, { status: 500 });
  const resend = new Resend(process.env.RESEND_API_KEY);
  let enviados = 0;
  let fallos = 0;
  for (const p of candidatos.slice(0, prueba ? 1 : MAX_POR_VUELTA)) {
    const { data: u } = await db.auth.admin.getUserById(p.id);
    const email = u?.user?.email;
    if (!email) continue;
    const { subject, html } = emailBoletin(datosPara(p));
    const { error } = await resend.emails.send({
      from: "Reinaldo <hola@soyreinaldo.com>",
      to: [email],
      subject: prueba ? `[PRUEBA] ${subject}` : subject,
      html,
    });
    if (error) {
      fallos++;
      // Límite diario de Resend: se para y la siguiente vuelta sigue.
      if (/quota|limit/i.test(error.message)) break;
      continue;
    }
    enviados++;
    if (!prueba) await db.from("boletin_envios").insert({ edicion: ed, user_id: p.id });
  }
  return NextResponse.json({ ok: true, edicion: ed, prueba, enviados, fallos, pendientes: candidatos.length - enviados });
}
