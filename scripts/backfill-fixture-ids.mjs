#!/usr/bin/env node
/**
 * Backfill `matches.api_football_fixture_id` para los 104 partidos del
 * Mundial 2026 cruzando con la lista de fixtures de API-Football
 * (league=1, season=2026).
 *
 * Estrategia de matching:
 *   - Por kickoff (mismo timestamp ±5min) → suele ser único.
 *   - Si hay ambigüedad, también miramos los nombres de los equipos.
 *
 * Modo de uso:
 *   API_FOOTBALL_KEY=... node scripts/backfill-fixture-ids.mjs
 *   Por defecto lee de .env.local.
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ENV_PATH = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(ENV_PATH)) {
  const txt = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
}

const apiKey = process.env.API_FOOTBALL_KEY;
const dbUrl = process.env.DATABASE_URL;
if (!apiKey) {
  console.error("✘ API_FOOTBALL_KEY missing");
  process.exit(1);
}
if (!dbUrl) {
  console.error("✘ DATABASE_URL missing");
  process.exit(1);
}

async function fetchAllFixtures() {
  const url =
    "https://v3.football.api-sports.io/fixtures?league=1&season=2026";
  const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  return json.response;
}

function nameKey(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Mapeo entre nuestros códigos FIFA (3 letras) y el nombre canónico que usa
// API-Football. Solo necesitamos las claves que NO matchean por similaridad.
const TEAM_FIFA_TO_API_NAME = {
  ALG: "Algeria",
  AUT: "Austria",
  BEL: "Belgium",
  BIH: "Bosnia & Herzegovina",
  BRA: "Brazil",
  CAN: "Canada",
  CIV: "Ivory Coast",
  COD: "Congo DR",
  CPV: "Cape Verde Islands",
  CRO: "Croatia",
  CUW: "Curaçao",
  CZE: "Czech Republic",
  EGY: "Egypt",
  ENG: "England",
  ESP: "Spain",
  FRA: "France",
  GER: "Germany",
  HAI: "Haiti",
  IRN: "Iran",
  IRQ: "Iraq",
  JOR: "Jordan",
  JPN: "Japan",
  KOR: "South Korea",
  KSA: "Saudi Arabia",
  MAR: "Morocco",
  MEX: "Mexico",
  NED: "Netherlands",
  NOR: "Norway",
  NZL: "New Zealand",
  PAN: "Panama",
  POR: "Portugal",
  QAT: "Qatar",
  RSA: "South Africa",
  SCO: "Scotland",
  SUI: "Switzerland",
  SWE: "Sweden",
  TUN: "Tunisia",
  TUR: "Türkiye",
  USA: "USA",
  UZB: "Uzbekistan",
};

async function main() {
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  console.log("▸ Trayendo 104 fixtures del Mundial 2026 desde API-Football...");
  const fixtures = await fetchAllFixtures();
  console.log(`  ✓ ${fixtures.length} fixtures`);

  console.log("▸ Cargando partidos del DB...");
  const { rows: matches } = await client.query(`
    select
      m.id,
      m.kickoff_at,
      m.api_football_fixture_id,
      m.team_home as home_fifa,
      m.team_away as away_fifa,
      coalesce(t1.name, m.team_home_placeholder) as home_name,
      coalesce(t2.name, m.team_away_placeholder) as away_name
    from public.matches m
    left join public.teams t1 on t1.id = m.team_home
    left join public.teams t2 on t2.id = m.team_away
    order by m.id
  `);
  console.log(`  ✓ ${matches.length} partidos`);

  let matched = 0;
  let updated = 0;
  let unresolved = [];

  for (const m of matches) {
    const ourTs = new Date(m.kickoff_at).getTime();
    let candidates = fixtures.filter((f) => {
      const apiTs = new Date(f.fixture.date).getTime();
      return Math.abs(apiTs - ourTs) <= 5 * 60 * 1000;
    });
    // Si nada en ±5min, ampliar a ±3h y exigir match de nombre del local
    if (candidates.length === 0 && m.home_fifa) {
      const wantedHomeName =
        TEAM_FIFA_TO_API_NAME[m.home_fifa] ?? m.home_name ?? "";
      const wantedKey = nameKey(wantedHomeName);
      candidates = fixtures.filter((f) => {
        const apiTs = new Date(f.fixture.date).getTime();
        return (
          Math.abs(apiTs - ourTs) <= 3 * 60 * 60 * 1000 &&
          nameKey(f.teams.home.name) === wantedKey
        );
      });
    }

    let pick = null;
    if (candidates.length === 1) {
      pick = candidates[0];
    } else if (candidates.length > 1) {
      // Para los slots con múltiples partidos, distinguimos por nombre EN del
      // equipo local (preferimos el mapeo FIFA→nombre canónico API si lo hay).
      const wantedHomeName =
        TEAM_FIFA_TO_API_NAME[m.home_fifa] ?? m.home_name ?? "";
      const wantedKey = nameKey(wantedHomeName);
      pick =
        candidates.find(
          (c) => nameKey(c.teams.home.name) === wantedKey,
        ) ?? null;
      if (!pick) {
        pick =
          candidates.find((c) =>
            nameKey(c.teams.home.name).startsWith(wantedKey.slice(0, 4)),
          ) ?? null;
      }
    }

    if (!pick) {
      unresolved.push({
        id: m.id,
        kickoff: m.kickoff_at,
        home: m.home_name,
        away: m.away_name,
        candidates: candidates.length,
      });
      continue;
    }

    matched += 1;
    // Si la kickoff de API difiere >5min de la nuestra, también la
    // sincronizamos (asumimos que la API es la fuente canónica).
    const apiTs = new Date(pick.fixture.date).getTime();
    const driftMin = Math.round(Math.abs(apiTs - ourTs) / 60000);
    const updates = ["api_football_fixture_id = $1"];
    const params = [pick.fixture.id];
    if (driftMin >= 5) {
      updates.push(`kickoff_at = $${params.length + 1}`);
      params.push(new Date(apiTs).toISOString());
    }
    if (m.api_football_fixture_id !== pick.fixture.id || driftMin >= 5) {
      params.push(m.id);
      await client.query(
        `update public.matches set ${updates.join(", ")} where id = $${params.length}`,
        params,
      );
      updated += 1;
      if (driftMin >= 5) {
        console.log(
          `  ⏱  match ${m.id} (${m.home_name} vs ${m.away_name}): kickoff ${m.kickoff_at} → ${new Date(apiTs).toISOString()} (${driftMin}min)`,
        );
      }
    }
  }

  console.log("");
  console.log(`✓ Matched: ${matched}/${matches.length}`);
  console.log(`✓ Updated: ${updated}`);
  if (unresolved.length > 0) {
    console.log(`⚠ Sin resolver (${unresolved.length}):`);
    for (const u of unresolved.slice(0, 10)) {
      console.log(
        `  match ${u.id}  ${u.kickoff}  ${u.home} vs ${u.away}  (candidatos: ${u.candidates})`,
      );
    }
    if (unresolved.length > 10) console.log(`  ... y ${unresolved.length - 10} más`);
  }

  await client.end();
}

main().catch((e) => {
  console.error("✘", e.message);
  process.exit(1);
});
