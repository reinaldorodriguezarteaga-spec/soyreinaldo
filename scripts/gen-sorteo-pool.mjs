// Genera src/app/admin/sorteo/equipos-pool.json: el pool de equipos del
// buscador de /admin/sorteo (directo del sorteo de Champions).
//
// ¿Por qué un JSON estático y no llamadas en runtime? El día del sorteo la
// página tiene que funcionar SÍ o SÍ en directo, y pedir ~19 listas de golpe
// dispara el límite por minuto de API-Football (verificado 27-ago-2026:
// 200 + errors.rateLimit → listas vacías). Este script llama despacio
// (secuencial + pausa + reintento) y deja el resultado en el repo.
//
// Uso:  node scripts/gen-sorteo-pool.mjs
// Lee API_FOOTBALL_KEY de .env.local. Rerun para regenerar (p. ej. otra
// temporada: cambia SEASON abajo).

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SEASON = 2026;

// Champions (con las rondas previas: 52 equipos hoy) + ligas domésticas de
// todos los países que pueden aportar clasificados directos a la fase de
// liga. IDs verificados contra la API real el 27-ago-2026.
const LEAGUES = [
  [2, "Champions League"],
  [140, "LaLiga"],
  [39, "Premier League"],
  [135, "Serie A"],
  [78, "Bundesliga"],
  [61, "Ligue 1"],
  [88, "Eredivisie"],
  [94, "Primeira Liga"],
  [144, "Pro League (Bélgica)"],
  [203, "Süper Lig (Turquía)"],
  [179, "Premiership (Escocia)"],
  [197, "Super League (Grecia)"],
  [345, "Chance Liga (Chequia)"],
  [218, "Bundesliga austríaca"],
  [207, "Super League (Suiza)"],
  [103, "Eliteserien (Noruega)"],
  [119, "Superliga (Dinamarca)"],
  [210, "HNL (Croacia)"],
  [333, "Premier League (Ucrania)"],
];

const OUT = resolve(import.meta.dirname, "../src/app/admin/sorteo/equipos-pool.json");

const env = readFileSync(resolve(import.meta.dirname, "../.env.local"), "utf8");
const key = env.match(/^API_FOOTBALL_KEY=(.+)$/m)?.[1]?.trim();
if (!key) {
  console.error("API_FOOTBALL_KEY no encontrada en .env.local");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchLeague(leagueId, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(
      `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${SEASON}`,
      { headers: { "x-apisports-key": key } },
    );
    const json = await res.json();
    const errs = json.errors;
    const hasErr = Array.isArray(errs)
      ? errs.length > 0
      : !!errs && Object.keys(errs).length > 0;
    if (!hasErr && Array.isArray(json.response) && json.response.length > 0) {
      console.log(`  ${label}: ${json.response.length} equipos`);
      return json.response.map((r) => ({
        id: r.team.id,
        name: r.team.name,
        logo: r.team.logo,
      }));
    }
    console.warn(
      `  ${label}: intento ${attempt} falló (${JSON.stringify(errs)}) — espero 65s…`,
    );
    await sleep(65_000);
  }
  throw new Error(`Liga ${leagueId} (${label}) falló 3 veces — pool incompleto, aborto.`);
}

const byId = new Map();
for (const [id, label] of LEAGUES) {
  for (const t of await fetchLeague(id, label))
    if (!byId.has(t.id)) byId.set(t.id, t);
  await sleep(4000); // ritmo tranquilo: nunca rozar el límite por minuto
}

const pool = [...byId.values()].sort((a, b) =>
  a.name.localeCompare(b.name, "es"),
);
writeFileSync(OUT, JSON.stringify(pool, null, 1) + "\n");
console.log(`\n${pool.length} equipos → ${OUT}`);
