#!/usr/bin/env node
/**
 * Datos del juego «Top 10» (/juegos/top-10): los 10 jugadores con más
 * minutos, goles o asistencias de un gran equipo europeo en una temporada.
 *
 * Se ejecuta A MANO, una vez (y al acabar cada temporada): saca los datos de
 * API-Football, los valida y escribe `src/lib/juegos/top10-datos.json`. El
 * juego lee ese archivo y no gasta cuota.
 *
 *   node scripts/juego-top10.mjs            # descarga lo que falte y genera
 *   node scripts/juego-top10.mjs --offline  # solo regenera desde la caché
 *
 * Decisiones del dueño (10-nov-2026):
 * - Desde la 2005-06 (la API no tiene jugadores antes). Las asistencias, solo
 *   desde la 2015-16: antes la API las trae vacías.
 * - LaLiga y Premier para los equipos españoles e ingleses; Champions para
 *   los 14. Cada competición por separado, sin sumar.
 *
 * Validación: la API tiene huecos (minutos vacíos, jugadores que faltan). Una
 * lista solo entra si cuadra con los totales del equipo en esa competición
 * (/teams/statistics): los goles de los jugadores tienen que sumar casi los
 * del equipo (las diferencias son los goles en propia puerta del rival) y los
 * minutos, casi 11 × 90 × partidos. Si no cuadra, esa lista se descarta.
 *
 * Caché de respuestas en node_modules/.cache/top10 (no se sube a git): volver
 * a ejecutar no repite llamadas.
 */
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
const API_KEY = env.match(/^API_FOOTBALL_KEY=(.+)$/m)?.[1].trim().replace(/^"|"$/g, "");
const OFFLINE = process.argv.includes("--offline");
if (!API_KEY && !OFFLINE) {
  console.error("✘ Falta API_FOOTBALL_KEY en .env.local");
  process.exit(1);
}

const CACHE = path.resolve("node_modules/.cache/top10");
const SALIDA = path.resolve("src/lib/juegos/top10-datos.json");
fs.mkdirSync(CACHE, { recursive: true });

const LALIGA = 140;
const PREMIER = 39;
const CHAMPIONS = 2;

// Ids comprobados contra /teams el 10-nov-2026.
const EQUIPOS = [
  { id: 529, ligas: [LALIGA, CHAMPIONS] }, // Barcelona
  { id: 541, ligas: [LALIGA, CHAMPIONS] }, // Real Madrid
  { id: 530, ligas: [LALIGA, CHAMPIONS] }, // Atlético
  { id: 33, ligas: [PREMIER, CHAMPIONS] }, // Manchester United
  { id: 50, ligas: [PREMIER, CHAMPIONS] }, // Manchester City
  { id: 40, ligas: [PREMIER, CHAMPIONS] }, // Liverpool
  { id: 49, ligas: [PREMIER, CHAMPIONS] }, // Chelsea
  { id: 42, ligas: [PREMIER, CHAMPIONS] }, // Arsenal
  { id: 157, ligas: [CHAMPIONS] }, // Bayern
  { id: 165, ligas: [CHAMPIONS] }, // Dortmund
  { id: 496, ligas: [CHAMPIONS] }, // Juventus
  { id: 489, ligas: [CHAMPIONS] }, // Milan
  { id: 505, ligas: [CHAMPIONS] }, // Inter
  { id: 85, ligas: [CHAMPIONS] }, // PSG
];

const PRIMERA = 2005;
const ULTIMA = 2024; // la 2025-26 está en juego: se añade al acabar
const ASISTENCIAS_DESDE = 2015;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let llamadas = 0;

async function api(ruta) {
  const archivo = path.join(CACHE, ruta.replace(/[^a-z0-9]+/gi, "_") + ".json");
  if (fs.existsSync(archivo)) return JSON.parse(fs.readFileSync(archivo, "utf8"));
  if (OFFLINE) return null;
  for (let intento = 0; intento < 4; intento++) {
    await dormir(170); // < 450 llamadas/min del plan Ultra
    const res = await fetch(`https://v3.football.api-sports.io${ruta}`, { headers: { "x-apisports-key": API_KEY } });
    llamadas++;
    if (res.ok) {
      const json = await res.json();
      const errores = json.errors && Object.keys(json.errors).length ? json.errors : null;
      if (errores?.rateLimit) {
        await dormir(5000);
        continue;
      }
      if (errores) throw new Error(`${ruta}: ${JSON.stringify(errores)}`);
      fs.writeFileSync(archivo, JSON.stringify(json));
      return json;
    }
    await dormir(2000 * (intento + 1));
  }
  throw new Error(`${ruta}: sin respuesta`);
}

/** Todos los jugadores del equipo en esa competición y temporada. */
async function jugadores(equipo, liga, temporada) {
  const todos = [];
  for (let pagina = 1; pagina <= 6; pagina++) {
    const json = await api(`/players?team=${equipo}&league=${liga}&season=${temporada}&page=${pagina}`);
    if (!json) return null;
    todos.push(...json.response);
    if (pagina >= (json.paging?.total ?? 1)) break;
  }
  return todos;
}

const n = (v) => (typeof v === "number" ? v : 0);

function cifrasDe(item, equipo, liga) {
  // En las temporadas antiguas la API deja vacío el id de la competición:
  // entonces vale el nombre.
  const nombres = { [LALIGA]: ["La Liga", "Primera Division"], [PREMIER]: ["Premier League"], [CHAMPIONS]: ["UEFA Champions League"] };
  const s = item.statistics.find(
    (x) => x.team?.id === equipo && (x.league?.id === liga || (x.league?.id == null && nombres[liga]?.includes(x.league?.name))),
  );
  if (!s) return null;
  return {
    partidos: n(s.games?.appearences),
    minutos: s.games?.minutes,
    goles: n(s.goals?.total),
    asistencias: s.goals?.assists,
  };
}

const jugadoresVistos = new Map();
const listas = [];
const descartes = [];

function top10(filas, clave) {
  const orden = filas
    .filter((f) => n(f.c[clave]) > 0)
    .sort((a, b) => n(b.c[clave]) - n(a.c[clave]) || n(b.c.minutos) - n(a.c.minutos));
  if (orden.length < 10) return null;
  return orden.slice(0, 10).map((f) => [f.id, n(f.c[clave])]);
}

for (const eq of EQUIPOS) {
  for (const liga of eq.ligas) {
    for (let t = PRIMERA; t <= ULTIMA; t++) {
      const etiqueta = `${eq.id}/${liga}/${t}`;
      const datos = await jugadores(eq.id, liga, t);
      if (!datos || datos.length === 0) continue; // no jugó esa Champions
      const stats = await api(`/teams/statistics?team=${eq.id}&league=${liga}&season=${t}`);
      const resp = stats?.response;
      let jugados = n(resp?.fixtures?.played?.total);
      let golesEquipo = n(resp?.goals?.for?.total?.total);
      // Antes de la 2010-11 la API no tiene totales, ni partidos, ni
      // clasificaciones: solo las cifras de los jugadores. En liga se sabe que
      // son 38 partidos, así que los minutos se pueden validar; los goles no
      // (no hay con qué compararlos) y esas listas no entran.
      if (!jugados && (liga === LALIGA || liga === PREMIER)) jugados = 38;
      if (!jugados) {
        descartes.push(`${etiqueta}: sin totales del equipo`);
        continue;
      }

      const filas = [];
      for (const item of datos) {
        const c = cifrasDe(item, eq.id, liga);
        if (!c || c.partidos === 0) continue;
        filas.push({ id: item.player.id, c });
        if (!jugadoresVistos.has(item.player.id)) {
          const p = item.player;
          jugadoresVistos.set(p.id, { n: p.name, f: p.firstname, l: p.lastname, p: p.nationality });
        }
      }

      const sumaGoles = filas.reduce((s, f) => s + n(f.c.goles), 0);
      const sumaMinutos = filas.reduce((s, f) => s + n(f.c.minutos), 0);
      const sinMinutos = filas.some((f) => f.c.minutos == null);
      const sumaAsist = filas.reduce((s, f) => s + n(f.c.asistencias), 0);

      // Goles: los de los jugadores, entre el 88 % y el 100 % de los del
      // equipo (la diferencia son los autogoles del rival).
      const golesOk = golesEquipo > 0 && sumaGoles <= golesEquipo && sumaGoles >= golesEquipo * 0.88;
      // Minutos: ~990 por partido (menos expulsiones y redondeos).
      const ratioMin = sumaMinutos / (jugados * 990);
      const minutosOk = !sinMinutos && ratioMin >= 0.93 && ratioMin <= 1.02;
      const asistOk = t >= ASISTENCIAS_DESDE && golesOk && sumaAsist >= golesEquipo * 0.5 && sumaAsist <= golesEquipo;

      const base = { eq: eq.id, liga, t };
      const add = (tipo, ok, motivo) => {
        if (!ok) return descartes.push(`${etiqueta} ${tipo}: ${motivo}`);
        const f = top10(filas, tipo);
        if (!f) return descartes.push(`${etiqueta} ${tipo}: menos de 10 con ${tipo}`);
        listas.push({ id: `${eq.id}-${liga}-${t}-${tipo}`, ...base, tipo, filas: f });
      };
      add("minutos", minutosOk, `minutos ${Math.round(ratioMin * 100)} %${sinMinutos ? " (con vacíos)" : ""}`);
      add("goles", golesOk, `goles ${sumaGoles}/${golesEquipo}`);
      if (t >= ASISTENCIAS_DESDE) add("asistencias", asistOk, `asistencias ${sumaAsist}/${golesEquipo}`);
    }
    console.log(`· ${eq.id}/${liga} hecho (${llamadas} llamadas hasta ahora)`);
  }
}

// Bandera: la nacionalidad viene como nombre de país («Spain»); /countries da
// el código de su bandera en la CDN de la API («es», «gb-eng»).
const paises = await api("/countries");
const codigo = new Map((paises?.response ?? []).map((c) => [c.name, c.code?.toLowerCase()]));
// Las que la API escribe distinto en jugadores y en /countries.
for (const [nombre, c] of Object.entries({
  "Bosnia and Herzegovina": "ba",
  "Côte d'Ivoire": "ci",
  "Costa Rica": "cr",
  "Dominican Republic": "do",
  "Türkiye": "tr",
  "Czech Republic": "cz",
  "Central African Republic": "cf",
  Mozambique: "mz",
  "Northern Ireland": "gb-nir",
  "Korea Republic": "kr",
})) if (!codigo.get(nombre)) codigo.set(nombre, c);
const sinBandera = new Set();

// Solo los jugadores que salen en alguna lista.
const usados = new Set(listas.flatMap((l) => l.filas.map(([id]) => id)));
const jugadoresOut = Object.fromEntries(
  [...jugadoresVistos]
    .filter(([id]) => usados.has(id))
    .map(([id, j]) => {
      const b = codigo.get(j.p);
      if (!b) sinBandera.add(j.p);
      return [id, { ...j, b: b ?? null }];
    }),
);
if (sinBandera.size) console.log(`⚠ Nacionalidades sin bandera: ${[...sinBandera].join(", ")}`);

fs.writeFileSync(SALIDA, JSON.stringify({ generado: new Date().toISOString().slice(0, 10), jugadores: jugadoresOut, listas }) + "\n");
fs.writeFileSync(path.join(CACHE, "descartes.txt"), descartes.join("\n") + "\n");
const porTipo = listas.reduce((m, l) => ((m[l.tipo] = (m[l.tipo] ?? 0) + 1), m), {});
console.log(`✓ ${listas.length} listas (${JSON.stringify(porTipo)}), ${usados.size} jugadores, ${descartes.length} descartadas, ${llamadas} llamadas`);
console.log(`  Descartes en ${path.join(CACHE, "descartes.txt")}`);
