import { createClient } from "@supabase/supabase-js";
import type { Fixture, FixtureEvent } from "./api-football";

/**
 * Lectura del directo en tiempo real (`partidos_directo`, migración 061).
 *
 * El cron `directo` (cada 15 s, una llamada `/fixtures?live=all`) guarda el
 * estado de cada partido en juego; aquí el servidor lo superpone a lo que
 * venga de la API (que tiene caché de 20 s): marcador, minuto, estado y
 * eventos salen de la tabla, que va al segundo. Así, cuando Realtime avisa
 * a un navegador de que algo cambió y este recarga, ya ve el gol.
 *
 * Solo se usa si el latido del cron es reciente: si el cron se para, todo
 * vuelve solo al camino de siempre (la API).
 */

/** El cron late cada 15 s; con 60 s sin latido, no se usa la tabla. */
const LATIDO_MAX_MS = 60_000;
/** Memoria por instancia: varias lecturas de una misma carga, una consulta. */
const MEMO_MS = 1_500;

type FilaDirecto = Fixture & { events?: FixtureEvent[]; score?: unknown };

type Lectura = { ok: boolean; filas: Map<number, FilaDirecto> };
let memo: { t: number; lectura: Lectura } | null = null;
let enCurso: Promise<Lectura> | null = null;

function cliente() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(3_000) }),
    },
  });
}

async function leer(): Promise<Lectura> {
  const vacio: Lectura = { ok: false, filas: new Map() };
  const db = cliente();
  if (!db) return vacio;
  try {
    const [{ data: lat }, { data: filas }] = await Promise.all([
      db.from("directo_latido").select("latido").eq("id", 1).maybeSingle<{ latido: string }>(),
      db.from("partidos_directo").select("fixture_id, data"),
    ]);
    if (!lat || Date.now() - Date.parse(lat.latido) > LATIDO_MAX_MS) return vacio;
    return {
      ok: true,
      filas: new Map(
        ((filas ?? []) as { fixture_id: number; data: FilaDirecto }[]).map((f) => [f.fixture_id, f.data]),
      ),
    };
  } catch {
    return vacio;
  }
}

async function lectura(): Promise<Lectura> {
  if (memo && Date.now() - memo.t < MEMO_MS) return memo.lectura;
  if (!enCurso) {
    enCurso = leer().then((l) => {
      memo = { t: Date.now(), lectura: l };
      enCurso = null;
      return l;
    });
  }
  return enCurso;
}

/** Partidos del directo (vacío si el cron no está latiendo). Nunca lanza. */
export async function filasDirecto(): Promise<Map<number, FilaDirecto>> {
  return (await lectura()).filas;
}

/**
 * ¿Hay algún partido en juego ahora? Del directo (una consulta, con memoria),
 * o `null` si el cron no está latiendo y no se puede saber así (17-oct: lo
 * usa la cabecera en TODAS las páginas, antes con 10 consultas).
 */
// Los mismos que `isLive` de api-football (LIVE_STATES).
const ESTADOS_EN_JUEGO = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
export async function hayPartidoEnJuego(): Promise<boolean | null> {
  const l = await lectura();
  if (!l.ok) return null;
  for (const f of l.filas.values()) {
    if (ESTADOS_EN_JUEGO.has(f.fixture?.status?.short ?? "")) return true;
  }
  return false;
}

/** Pone encima de `f` lo que dice el directo (si lo hay). */
export function superponer<T extends Fixture>(f: T, d: FilaDirecto | undefined): T {
  if (!d) return f;
  return {
    ...f,
    fixture: { ...f.fixture, status: d.fixture.status },
    goals: d.goals,
  };
}

/** Eventos del partido según el directo, o null si no está en la tabla. */
export async function eventosDirecto(fixtureId: number): Promise<FixtureEvent[] | null> {
  const d = (await filasDirecto()).get(fixtureId);
  return d?.events ?? null;
}
