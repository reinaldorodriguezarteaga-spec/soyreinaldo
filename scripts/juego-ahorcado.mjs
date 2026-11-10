#!/usr/bin/env node
/**
 * Datos del «Ahorcado» (/juegos/ahorcado): futbolistas actuales de los
 * grandes de LaLiga, la Premier y los habituales de la Champions.
 *
 * Se ejecuta A MANO (una vez, y de vez en cuando para recoger fichajes):
 * saca las plantillas de esta temporada de API-Football y escribe
 * `src/lib/juegos/ahorcado-datos.json`. El juego no gasta cuota.
 *
 *   node scripts/juego-ahorcado.mjs            # descarga lo que falte y genera
 *   node scripts/juego-ahorcado.mjs --offline  # solo regenera desde la caché
 *
 * Para que no salgan desconocidos (pedido del dueño, 10-nov-2026), solo
 * entran los que juegan: un mínimo de minutos en liga esta temporada.
 * Caché en node_modules/.cache/ahorcado (borrarla para refrescar).
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

const CACHE = path.resolve("node_modules/.cache/ahorcado");
const SALIDA = path.resolve("src/lib/juegos/ahorcado-datos.json");
fs.mkdirSync(CACHE, { recursive: true });

const TEMPORADA = 2026; // 2026-27
const MIN_MINUTOS = 300; // ~4 partidos enteros: fuera los que casi no juegan

// Ids comprobados contra /teams el 10-nov-2026. [equipo, liga]
const EQUIPOS = [
  // LaLiga
  [529, 140], [541, 140], [530, 140], [531, 140], [548, 140], [533, 140], [543, 140], [536, 140],
  // Premier
  [33, 39], [50, 39], [40, 39], [49, 39], [42, 39], [47, 39], [34, 39], [66, 39],
  // Habituales de la Champions
  [157, 78], [165, 78], [168, 78], // Bayern, Dortmund, Leverkusen
  [85, 61], // PSG
  [505, 135], [489, 135], [496, 135], [492, 135], // Inter, Milan, Juventus, Napoli
  [211, 94], [212, 94], // Benfica, Oporto
];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let llamadas = 0;

async function api(ruta) {
  const archivo = path.join(CACHE, ruta.replace(/[^a-z0-9]+/gi, "_") + ".json");
  if (fs.existsSync(archivo)) return JSON.parse(fs.readFileSync(archivo, "utf8"));
  if (OFFLINE) return null;
  for (let intento = 0; intento < 5; intento++) {
    await dormir(400);
    const res = await fetch(`https://v3.football.api-sports.io${ruta}`, { headers: { "x-apisports-key": API_KEY } });
    llamadas++;
    if (!res.ok) {
      await dormir(2000 * (intento + 1));
      continue;
    }
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
  throw new Error(`${ruta}: sin respuesta`);
}

const jugadores = new Map();
for (const [equipo, liga] of EQUIPOS) {
  let antes = jugadores.size;
  for (let pagina = 1; pagina <= 6; pagina++) {
    const json = await api(`/players?team=${equipo}&league=${liga}&season=${TEMPORADA}&page=${pagina}`);
    if (!json) break;
    for (const item of json.response) {
      const s = item.statistics.find((x) => x.team?.id === equipo && x.league?.id === liga);
      if (!s || (s.games?.minutes ?? 0) < MIN_MINUTOS) continue;
      const p = item.player;
      jugadores.set(p.id, {
        id: p.id,
        n: p.name,
        f: p.firstname,
        l: p.lastname,
        p: p.nationality,
        eq: equipo,
        liga,
        pos: s.games?.position ?? null,
      });
    }
    if (pagina >= (json.paging?.total ?? 1)) break;
  }
  console.log(`· ${equipo}: ${jugadores.size - antes} jugadores`);
}

fs.writeFileSync(
  SALIDA,
  JSON.stringify({ generado: new Date().toISOString().slice(0, 10), temporada: TEMPORADA, jugadores: [...jugadores.values()] }) + "\n",
);
console.log(`✓ ${jugadores.size} jugadores, ${llamadas} llamadas`);
