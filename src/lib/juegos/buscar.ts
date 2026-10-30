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

export async function buscarJugadores(q: string, limite = 12): Promise<Sugerencia[]> {
  const t = (q ?? "").trim().slice(0, 40);
  if (t.length < 3) return [];
  const qn = normalizar(t);
  const palabras = qn.split(/\s+/).filter(Boolean);
  const apellido = [...palabras].sort((a, b) => b.length - a.length)[0];

  const curados: Sugerencia[] = JUGADORES.filter((j) => palabras.every((p) => normalizar(j.nombre).includes(p)))
    .map((j): Sugerencia | null => {
      const foto = caraDe(j.id);
      const id = idDeFoto(foto);
      return Number.isInteger(id) ? { id, nombre: j.nombre, foto, equipo: null } : null;
    })
    .filter((x): x is Sugerencia => !!x);

  // Al API, con la última palabra (lo normal es «nombre apellido»).
  const palabraApi = palabras[palabras.length - 1].length >= 4 ? palabras[palabras.length - 1] : apellido;
  // Plantillas y jugadores_api a la vez (30-oct): en serie sumaban sus esperas
  // justo en las búsquedas raras, que son las que llegan al API.
  const db = clientePublico();
  const [{ data }, { data: guardados }] = await Promise.all([
    db.rpc("comparador_buscar", { p_q: apellido, p_limite: 40 }),
    palabraApi.length >= 4
      ? db.from("jugadores_api").select("id, nombre, foto").ilike("nombre", `%${palabraApi}%`).limit(20)
      : Promise.resolve({ data: null }),
  ]);
  const filas = (data ?? []) as { id: number; nombre: string; foto: string | null; equipo: number | null }[];
  // Cada palabra de la búsqueda tiene que estar en el nombre o ser la
  // inicial de alguna parte abreviada («E.»).
  const encaja = (nombre: string) => {
    const n = normalizar(nombre);
    const iniciales = n.split(/\s+/).filter((x) => /^[a-z]\.$/.test(x)).map((x) => x[0]);
    return palabras.every((p) => n.includes(p) || iniciales.includes(p[0]));
  };
  const deSquads = filas.filter((f) => encaja(f.nombre)).map((f) => ({ id: f.id, nombre: f.nombre, foto: f.foto, equipo: f.equipo }));
  const vistos = new Set<number>();
  const locales = [...curados, ...deSquads].filter((x) => (vistos.has(x.id) ? false : (vistos.add(x.id), true)));
  if (locales.length >= 6 || palabraApi.length < 4) return locales.slice(0, limite);

  // Pocos: al API, con los ya buscados apuntados en jugadores_api.
  const deTabla = ((guardados ?? []) as { id: number; nombre: string; foto: string | null }[])
    .filter((g) => encaja(g.nombre))
    .map((g) => ({ id: g.id, nombre: g.nombre, foto: g.foto, equipo: null }));
  // Con la última palabra; si no aparece nadie, con las demás («arthur melo»:
  // el API lo llama «Arthur» y por «melo» no sale). Dos búsquedas como mucho.
  const candidatas = [palabraApi, ...palabras.filter((w) => w !== palabraApi && w.length >= 4)].slice(0, 2);
  const deApi: Sugerencia[] = [];
  const nuevos: { id: number; nombre: string; foto: string | null; nacimiento: string | null }[] = [];
  for (const palabra of candidatas) {
    if (deApi.length) break;
    const perfiles = await buscarPerfilesApi(palabra).catch(() => []);
    for (const { player: p } of perfiles) {
      // «M. Pjanić» → «Miralem Pjanić» con el primer nombre.
      const nombre = /^[A-Z]\. /.test(p.name) && p.firstname ? `${p.firstname.split(" ")[0]} ${p.name.slice(3)}` : p.name;
      const texto = `${p.firstname ?? ""} ${p.lastname ?? ""} ${p.name}`;
      if (!palabras.every((w) => normalizar(texto).includes(w))) continue;
      deApi.push({ id: p.id, nombre, foto: p.photo, equipo: null });
      nuevos.push({ id: p.id, nombre, foto: p.photo, nacimiento: p.birth?.date ?? null });
    }
  }
  if (nuevos.length) {
    const servicio = clienteServicio();
    if (servicio) await servicio.from("jugadores_api").upsert(nuevos, { onConflict: "id", ignoreDuplicates: true });
  }
  // Conjunto nuevo: `vistos` ya tiene a todos los locales y los tiraría
  // (27-oct: Cucurella salía en las plantillas y en el API, y no salía nada).
  const unicos = new Set<number>();
  return [...locales, ...deTabla, ...deApi].filter((x) => (unicos.has(x.id) ? false : (unicos.add(x.id), true))).slice(0, limite);
}
