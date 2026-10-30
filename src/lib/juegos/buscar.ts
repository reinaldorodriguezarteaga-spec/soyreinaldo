import { unstable_cache } from "next/cache";
import { clientePublico } from "@/lib/supabase/publico";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { buscarPerfilesApi } from "@/lib/sports/api-football";
import { JUGADORES } from "./carreras";
import { caraDe } from "./caras";
import { normalizar } from "./diario";

/**
 * Buscador de jugadores para el comparador y el tiki-taka-toe (23-oct): los
 * de la lista curada por nombre completo y los de todas las plantillas
 * guardadas (~10.000, sin gastar cuota). En las plantillas el nombre viene
 * abreviado («E. Fernández»): se busca por el apellido y se comprueba la
 * inicial («enzo fernandez» → E. Fernández).
 *
 * Si con eso salen pocos (retirados, ligas que no seguimos: Zambrotta,
 * Thuram), se busca en todo el API (/players/profiles, caché 30 días) y los
 * encontrados se apuntan en jugadores_api para poder validarlos después.
 */
export type Sugerencia = { id: number; nombre: string; foto: string | null; equipo: number | null };

const idDeFoto = (foto: string | null) => Number(foto?.match(/players\/(\d+)\.png/)?.[1]);

/** Para comparar: sin tildes y con la b y la v iguales («vommel» → Van Bommel). */
const plano = (s: string) => normalizar(s).replace(/v/g, "b");
/** En los LIKE de la base, la b y la v valen cualquier letra (luego `encaja` afina). */
const comodin = (w: string) => w.replace(/[bv]/g, "_");
/** La misma palabra con la b y la v cambiadas, para el API («vommel» → «bommel»). */
const cambiarBV = (w: string) => w.replace(/[bv]/g, (c) => (c === "b" ? "v" : "b"));

/**
 * Clubes cuyos jugadores suelen ser conocidos: +1 por jugar la Champions y +1
 * por estar en una de las grandes ligas que guardamos. Sale de las
 * clasificaciones ya cacheadas por el cron (cero cuota), una vez al día.
 */
const pesoClubes = unstable_cache(
  async (): Promise<Record<number, number>> => {
    try {
      const db = clienteServicio();
      if (!db) return {};
      const { data } = await db
        .from("sports_cache")
        .select("cache_key, data")
        .in("cache_key", ["standings:champions", "standings:laliga", "standings:premier", "standings:serie-a", "standings:ligue-1"]);
      const peso: Record<number, number> = {};
      for (const fila of (data ?? []) as { cache_key: string; data: unknown }[]) {
        const ids = new Set<number>();
        const recorrer = (v: unknown): void => {
          if (Array.isArray(v)) return v.forEach(recorrer);
          if (v && typeof v === "object") {
            const o = v as Record<string, unknown>;
            const id = (o.team as { id?: unknown } | undefined)?.id;
            if (typeof id === "number") ids.add(id);
            Object.values(o).forEach(recorrer);
          }
        };
        recorrer(fila.data);
        for (const id of ids) peso[id] = (peso[id] ?? 0) + 1;
      }
      return peso;
    } catch {
      return {};
    }
  },
  ["buscador-peso-clubes"],
  { revalidate: 86400 },
);

export async function buscarJugadores(q: string, limite = 12): Promise<Sugerencia[]> {
  // Sin comodines del usuario: `%` y `_` irían tal cual al LIKE.
  const t = (q ?? "").replace(/[%_]/g, "").trim().slice(0, 40);
  if (t.length < 3) return [];
  const qn = normalizar(t);
  const palabras = qn.split(/\s+/).filter(Boolean);
  const planas = palabras.map(plano);
  const apellido = [...palabras].sort((a, b) => b.length - a.length)[0];

  const curados: Sugerencia[] = JUGADORES.filter((j) => planas.every((p) => plano(j.nombre).includes(p)))
    .map((j): Sugerencia | null => {
      const foto = caraDe(j.id);
      const id = idDeFoto(foto);
      return Number.isInteger(id) ? { id, nombre: j.nombre, foto, equipo: null } : null;
    })
    .filter((x): x is Sugerencia => !!x);

  // Al API, con la última palabra (lo normal es «nombre apellido»).
  const palabraApi = palabras[palabras.length - 1].length >= 4 ? palabras[palabras.length - 1] : apellido;
  // Plantillas y jugadores_api (los ya buscados en el API: retirados, ligas
  // que no seguimos) a la vez: en serie sumaban sus esperas.
  const db = clientePublico();
  const [{ data }, { data: guardados }] = await Promise.all([
    db.rpc("comparador_buscar", { p_q: comodin(apellido), p_limite: 80 }),
    palabraApi.length >= 4
      ? db.from("jugadores_api").select("id, nombre, foto").ilike("nombre", `%${comodin(palabraApi)}%`).limit(20)
      : Promise.resolve({ data: null }),
  ]);
  const filas = (data ?? []) as {
    id: number;
    nombre: string;
    foto: string | null;
    equipo: number | null;
    equipos: number[] | null;
  }[];
  // Todos los equipos de cada jugador (club y selección), para la relevancia.
  const equiposDe = new Map(filas.map((f) => [f.id, (f.equipos ?? []).filter((e) => e != null)]));
  // Cada palabra de la búsqueda tiene que estar en el nombre o ser la
  // inicial de alguna parte abreviada («E.»).
  const encaja = (nombre: string) => {
    const n = plano(nombre);
    const iniciales = n.split(/\s+/).filter((x) => /^[a-z]\.$/.test(x)).map((x) => x[0]);
    return planas.every((p) => n.includes(p) || iniciales.includes(p[0]));
  };
  const deSquads = filas.filter((f) => encaja(f.nombre)).map((f) => ({ id: f.id, nombre: f.nombre, foto: f.foto, equipo: f.equipo }));
  const deTabla = ((guardados ?? []) as { id: number; nombre: string; foto: string | null }[])
    .filter((g) => encaja(g.nombre))
    .map((g) => ({ id: g.id, nombre: g.nombre, foto: g.foto, equipo: null }));
  const vistos = new Set<number>();
  const locales = [...curados, ...deSquads, ...deTabla].filter((x) => (vistos.has(x.id) ? false : (vistos.add(x.id), true)));

  // Pocos: al API. Con la última palabra; si no aparece nadie, con las demás
  // («arthur melo»: el API lo llama «Arthur» y por «melo» no sale) o con la b
  // y la v cambiadas. Dos búsquedas como mucho.
  const deApi: Sugerencia[] = [];
  if (locales.length < 6 && palabraApi.length >= 4) {
    const candidatas = [
      ...new Set([palabraApi, ...palabras.filter((w) => w !== palabraApi && w.length >= 4), cambiarBV(palabraApi)]),
    ].slice(0, 2);
    const nuevos: { id: number; nombre: string; foto: string | null; nacimiento: string | null }[] = [];
    for (const palabra of candidatas) {
      if (deApi.length) break;
      const perfiles = await buscarPerfilesApi(palabra).catch(() => []);
      for (const { player: p } of perfiles) {
        // «M. Pjanić» → «Miralem Pjanić» con el primer nombre.
        const nombre = /^[A-Z]\. /.test(p.name) && p.firstname ? `${p.firstname.split(" ")[0]} ${p.name.slice(3)}` : p.name;
        const texto = plano(`${p.firstname ?? ""} ${p.lastname ?? ""} ${p.name}`);
        if (!planas.every((w) => texto.includes(w))) continue;
        deApi.push({ id: p.id, nombre, foto: p.photo, equipo: null });
        nuevos.push({ id: p.id, nombre, foto: p.photo, nacimiento: p.birth?.date ?? null });
      }
    }
    if (nuevos.length) {
      const servicio = clienteServicio();
      if (servicio) await servicio.from("jugadores_api").upsert(nuevos, { onConflict: "id", ignoreDuplicates: true });
    }
  }

  // Un conjunto nuevo: `vistos` ya tiene a todos los locales y los tiraría
  // (27-oct: Cucurella salía en las plantillas y en el API, y no salía nada).
  const unicos = new Set<number>();
  const todos = [...locales, ...deApi].filter((x) => (unicos.has(x.id) ? false : (unicos.add(x.id), true)));

  // Por relevancia (30-oct, «más conocidos arriba»).
  const [{ data: usosFilas }, clubes] = await Promise.all([
    todos.length ? db.from("jugadores_uso").select("id, usos").in("id", todos.map((x) => x.id)) : Promise.resolve({ data: null }),
    pesoClubes(),
  ]);
  const usos = new Map(((usosFilas ?? []) as { id: number; usos: number }[]).map((u) => [u.id, u.usos]));
  const deLista = new Set(curados.map((c) => c.id));
  // Los que no están en ninguna plantilla y alguien fue a buscar al API
  // (retirados, sobre todo) suelen ser nombres conocidos: Mark van Bommel
  // antes que un juvenil del PSV.
  const buscadosAntes = new Set([...deTabla, ...deApi].map((x) => x.id).filter((id) => !equiposDe.has(id)));
  const puntos = (x: Sugerencia) => {
    const partes = plano(x.nombre).split(/[\s.'-]+/).filter(Boolean);
    let p = 0;
    // Palabra entera (Van Bommel) antes que trozo de otra (Bommeleijn).
    for (const w of planas) p += partes.includes(w) ? 3 : partes.some((y) => y.startsWith(w)) ? 1 : 0;
    // Los de la lista curada son los conocidos; los que más se aciertan en el
    // tiki-taka-toe, también.
    if (deLista.has(x.id)) p += 6;
    if (buscadosAntes.has(x.id)) p += 1;
    p += 2 * Math.log2(1 + (usos.get(x.id) ?? 0));
    // Los que juegan en un grande (Champions, grandes ligas).
    p += Math.max(0, ...(equiposDe.get(x.id) ?? []).map((e) => clubes[e] ?? 0));
    // A igualdad, el nombre completo («Mark van Bommel») antes que el abreviado
    // de una plantilla actual («R. van Bommel»).
    if (!/^[A-Z]\. /.test(x.nombre)) p += 0.5;
    return p;
  };
  const puntuados = todos.map((x) => ({ x, p: puntos(x) }));
  puntuados.sort((a, b) => b.p - a.p);
  return puntuados.slice(0, limite).map(({ x }) => x);
}
