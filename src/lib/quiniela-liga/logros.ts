import "server-only";
import { unstable_cache } from "next/cache";
import { clienteServicio } from "./jornada-datos";
import { ANFITRION_ID } from "./anfitrion";
import { medallasDe, type FilaJornadaJugador, type Medalla } from "./medallas";

/**
 * Datos de las tarjetas de logros para compartir (17-oct, pedido del dueño):
 * una medalla o un duelo ganado. Con la service role: solo devuelven lo que
 * ya es público en la clasificación (nombre, puntos, resultado del duelo).
 */

const PUBLICA = "9f992fa0-5f45-4204-87a7-b4c5feda6ae1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Perfil = { id: string; display_name: string | null; username: string | null };
const nombreDe = (p: Perfil | null | undefined) => p?.display_name || p?.username || "Jugador";

async function perfil(usuario: string): Promise<Perfil | null> {
  const db = clienteServicio();
  if (!db) return null;
  const columna = UUID_RE.test(usuario) ? "id" : "username";
  const { data } = await db
    .from("profiles")
    .select("id, display_name, username")
    .eq(columna, columna === "username" ? usuario.toLowerCase() : usuario)
    .maybeSingle<Perfil>();
  return data;
}

/** Cómo se nombra a alguien en una URL: su usuario o, si no tiene, su id. */
export const usuarioUrl = (p: { id: string; username: string | null }) => p.username || p.id;

export type LogroMedalla = { nombre: string; medalla: Medalla };

export const logroMedalla = (usuario: string, clave: string) =>
  unstable_cache(
    async (): Promise<LogroMedalla | null> => {
      const db = clienteServicio();
      const p = await perfil(usuario);
      if (!db || !p) return null;
      const { data } = await db.rpc("lq_jornadas_jugador", { p_league_id: PUBLICA });
      const m = medallasDe((data ?? []) as FilaJornadaJugador[], p.id, ANFITRION_ID).find((x) => x.clave === clave);
      return m ? { nombre: nombreDe(p), medalla: m } : null;
    },
    ["logro-medalla", usuario.toLowerCase(), clave],
    { revalidate: 600 },
  )();

export type LogroDuelo = {
  ganador: string;
  perdedor: string;
  jornada: number;
  ptsGanador: number;
  ptsPerdedor: number;
};

/** Un duelo terminado con ganador (sin ganador, o sin terminar: null). */
export const logroDuelo = (id: string) =>
  unstable_cache(
    async (): Promise<LogroDuelo | null> => {
      const db = clienteServicio();
      if (!db || !UUID_RE.test(id)) return null;
      const { data: d } = await db
        .from("lq_duelos")
        .select("league_id, matchday, retador, rival, estado")
        .eq("id", id)
        .maybeSingle<{ league_id: string; matchday: number; retador: string; rival: string; estado: string }>();
      if (!d || d.estado !== "aceptado") return null;
      const { data: filas } = await db.rpc("lq_jornadas_jugador", { p_league_id: d.league_id });
      const deLaJornada = ((filas ?? []) as FilaJornadaJugador[]).filter((f) => f.matchday === d.matchday);
      if (!deLaJornada.length || !deLaJornada[0].terminada) return null;
      const pts = (u: string) => deLaJornada.find((f) => f.user_id === u)?.puntos ?? 0;
      const [a, b] = [pts(d.retador), pts(d.rival)];
      if (a === b) return null;
      const [gid, pid] = a > b ? [d.retador, d.rival] : [d.rival, d.retador];
      const { data: perfiles } = await db
        .from("profiles")
        .select("id, display_name, username")
        .in("id", [gid, pid])
        .returns<Perfil[]>();
      const de = (u: string) => (perfiles ?? []).find((x) => x.id === u);
      return {
        ganador: nombreDe(de(gid)),
        perdedor: nombreDe(de(pid)),
        jornada: d.matchday,
        ptsGanador: Math.max(a, b),
        ptsPerdedor: Math.min(a, b),
      };
    },
    ["logro-duelo", id],
    { revalidate: 600 },
  )();

export type Temporada = {
  nombre: string;
  puntos: number;
  puesto: number | null;
  jugadores: number;
  jornadas: number;
  exactos: number;
  aciertos: number;
  mejor: { jornada: number; puntos: number } | null;
  medallas: Medalla[];
  duelos: { ganados: number; perdidos: number; empatados: number };
  /** Contra quién ha ganado más duelos. */
  victima: { nombre: string; veces: number } | null;
  vsReinaldo: { ganadas: number; jugadas: number };
};

/** "Tu temporada" (17-oct): el resumen de un jugador en la liga pública. */
export const temporadaDe = (usuario: string) =>
  unstable_cache(
    async (): Promise<Temporada | null> => {
      const db = clienteServicio();
      const p = await perfil(usuario);
      if (!db || !p) return null;
      const [{ data: filasData }, { data: tabla }, { data: duelosData }] = await Promise.all([
        db.rpc("lq_jornadas_jugador", { p_league_id: PUBLICA }),
        db.rpc("lq_leaderboard", { p_league_id: PUBLICA }),
        db
          .from("lq_duelos")
          .select("matchday, retador, rival, estado")
          .eq("estado", "aceptado")
          .or(`retador.eq.${p.id},rival.eq.${p.id}`)
          .returns<{ matchday: number; retador: string; rival: string; estado: string }[]>(),
      ]);
      const filas = (filasData ?? []) as FilaJornadaJugador[];
      const suyas = filas.filter((f) => f.user_id === p.id);
      if (suyas.length === 0) return null;
      const clas = (tabla ?? []) as { user_id: string; total_points: number }[];
      const idx = clas.findIndex((r) => r.user_id === p.id);
      const mejorFila = [...suyas].sort((a, b) => b.puntos - a.puntos)[0];

      // Duelos: los de jornadas terminadas, con los puntos de cada uno.
      const pts = (u: string, j: number) => filas.find((f) => f.user_id === u && f.matchday === j);
      const duelos = { ganados: 0, perdidos: 0, empatados: 0 };
      const victimas = new Map<string, number>();
      for (const d of duelosData ?? []) {
        const yo = pts(p.id, d.matchday);
        const otroId = d.retador === p.id ? d.rival : d.retador;
        const otro = pts(otroId, d.matchday);
        if (!(yo?.terminada ?? otro?.terminada)) continue;
        const a = yo?.puntos ?? 0;
        const b = otro?.puntos ?? 0;
        if (a > b) {
          duelos.ganados++;
          victimas.set(otroId, (victimas.get(otroId) ?? 0) + 1);
        } else if (a < b) duelos.perdidos++;
        else duelos.empatados++;
      }
      let victima: Temporada["victima"] = null;
      const top = [...victimas.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top) {
        const { data: v } = await db.from("profiles").select("id, display_name, username").eq("id", top[0]).maybeSingle<Perfil>();
        victima = { nombre: nombreDe(v), veces: top[1] };
      }

      const rei = new Map(filas.filter((f) => f.user_id === ANFITRION_ID && f.terminada).map((f) => [f.matchday, f.puntos]));
      const comparables = suyas.filter((f) => f.terminada && rei.has(f.matchday));
      return {
        nombre: nombreDe(p),
        puntos: idx >= 0 ? clas[idx].total_points : suyas.reduce((n, f) => n + f.puntos, 0),
        puesto: idx >= 0 ? idx + 1 : null,
        jugadores: clas.length,
        jornadas: suyas.length,
        exactos: suyas.reduce((n, f) => n + f.exactos, 0),
        aciertos: suyas.reduce((n, f) => n + f.signos, 0),
        mejor: mejorFila ? { jornada: mejorFila.matchday, puntos: mejorFila.puntos } : null,
        medallas: medallasDe(filas, p.id, ANFITRION_ID),
        duelos,
        victima,
        vsReinaldo: {
          ganadas: p.id === ANFITRION_ID ? 0 : comparables.filter((f) => f.puntos > rei.get(f.matchday)!).length,
          jugadas: p.id === ANFITRION_ID ? 0 : comparables.length,
        },
      };
    },
    ["temporada", usuario.toLowerCase()],
    { revalidate: 600 },
  )();
