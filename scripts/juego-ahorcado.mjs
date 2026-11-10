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
        nac: p.birth?.date ?? null,
        dorsal: s.games?.number ?? null,
      });
    }
    if (pagina >= (json.paging?.total ?? 1)) break;
  }
  console.log(`· ${equipo}: ${jugadores.size - antes} jugadores`);
}

// Bandera de la nacionalidad (para «Futbolista misterioso»): /countries da
// el código de la CDN; las que se escriben distinto, a mano.
const paises = await api("/countries");
const codigo = new Map((paises?.response ?? []).map((c) => [c.name, c.code?.toLowerCase()]));
for (const [nombre, c] of Object.entries({
  "Bosnia and Herzegovina": "ba", "Côte d'Ivoire": "ci", "Costa Rica": "cr", "Dominican Republic": "do", "Türkiye": "tr",
  "Czech Republic": "cz", "Central African Republic": "cf", Mozambique: "mz", "Northern Ireland": "gb-nir", "Korea Republic": "kr",
  "Cape Verde Islands": "cv", "Congo DR": "cd", "Guinea-Bissau": "gw", "Equatorial Guinea": "gq",
  "Republic of Ireland": "ie", Czechia: "cz", "Burkina Faso": "bf",
})) if (!codigo.get(nombre)) codigo.set(nombre, c);

// ¿Foto real? La CDN devuelve una silueta genérica a quien no tiene foto
// (para «Foto oculta»). Se detecta porque la silueta es idéntica para todos:
// la huella que más se repite es la de la silueta.
const crypto = await import("node:crypto");
const huellas = new Map();
for (const j of jugadores.values()) {
  const archivo = path.join(CACHE, `foto_${j.id}.txt`);
  let h = fs.existsSync(archivo) ? fs.readFileSync(archivo, "utf8") : null;
  if (!h && !OFFLINE) {
    const res = await fetch(`https://media.api-sports.io/football/players/${j.id}.png`);
    h = res.ok ? crypto.createHash("md5").update(Buffer.from(await res.arrayBuffer())).digest("hex") : "sin-foto";
    fs.writeFileSync(archivo, h);
    await dormir(60);
  }
  huellas.set(j.id, h);
}
const veces = new Map();
for (const h of huellas.values()) veces.set(h, (veces.get(h) ?? 0) + 1);
const silueta = [...veces].sort((a, b) => b[1] - a[1])[0];
for (const j of jugadores.values()) {
  j.b = codigo.get(j.p) ?? null;
  const h = huellas.get(j.id);
  j.foto = !!h && h !== "sin-foto" && !(silueta && silueta[1] > 3 && h === silueta[0]);
}
console.log(`  Fotos reales: ${[...jugadores.values()].filter((j) => j.foto).length}/${jugadores.size} (silueta repetida ${silueta?.[1]} veces)`);
const sinBandera = [...new Set([...jugadores.values()].filter((j) => !j.b).map((j) => j.p))];
if (sinBandera.length) console.log(`⚠ Sin bandera: ${sinBandera.join(", ")}`);

fs.writeFileSync(
  SALIDA,
  JSON.stringify({ generado: new Date().toISOString().slice(0, 10), temporada: TEMPORADA, jugadores: [...jugadores.values()] }) + "\n",
);
console.log(`✓ ${jugadores.size} jugadores, ${llamadas} llamadas`);
