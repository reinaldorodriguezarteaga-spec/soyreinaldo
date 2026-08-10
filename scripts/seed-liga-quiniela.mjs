#!/usr/bin/env node
/**
 * Seed de la QUINIELA DE CLUBES: vuelca los fixtures de una competición
 * (por defecto LaLiga 2026-27) desde API-Football a las tablas `lq_teams` y
 * `lq_matches` de Supabase.
 *
 * Sin dependencias npm: usa `fetch` global (Node 18+) contra API-Football y
 * contra la REST de Supabase (PostgREST) con la SERVICE ROLE key (salta RLS;
 * lq_teams/lq_matches no tienen policy de escritura). Idempotente: upsert por
 * PK (`Prefer: resolution=merge-duplicates`).
 *
 * Uso:
 *   node scripts/seed-liga-quiniela.mjs                 # LaLiga (140) 2026, slug 'laliga'
 *   node scripts/seed-liga-quiniela.mjs 140 2026 laliga
 *   node scripts/seed-liga-quiniela.mjs 2 2026 champions
 */
import fs from "node:fs";
import path from "node:path";

const [, , leagueArg, seasonArg, slugArg] = process.argv;
const LEAGUE_ID = Number(leagueArg ?? 140);
const SEASON = Number(seasonArg ?? 2026);
const SLUG = slugArg ?? "laliga";

// --- .env.local ---
const ENV_PATH = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(ENV_PATH)) {
  console.error(`✘ ${ENV_PATH} no encontrado`);
  process.exit(1);
}
const envText = fs.readFileSync(ENV_PATH, "utf8");
const readEnv = (k) => {
  const m = envText.match(new RegExp(`^${k}=(.+)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
};
const API_KEY = readEnv("API_FOOTBALL_KEY");
const SB_URL = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const SB_SERVICE = readEnv("SUPABASE_SERVICE_ROLE_KEY");
for (const [name, v] of [
  ["API_FOOTBALL_KEY", API_KEY],
  ["NEXT_PUBLIC_SUPABASE_URL", SB_URL],
  ["SUPABASE_SERVICE_ROLE_KEY", SB_SERVICE],
]) {
  if (!v) {
    console.error(`✘ Falta ${name} en .env.local`);
    process.exit(1);
  }
}

const FINAL = new Set(["FT", "AET", "PEN"]);

/** "Regular Season - 12" -> 12 ; "Group Stage - 3" -> 3 ; sin número -> null */
function matchdayFromRound(round) {
  const m = String(round ?? "").match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

async function apiFootball(pathQ) {
  const res = await fetch(`https://v3.football.api-sports.io${pathQ}`, {
    headers: { "x-apisports-key": API_KEY },
  });
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(json.errors)}`);
  }
  return json.response ?? [];
}

async function sbUpsert(table, rows) {
  if (rows.length === 0) return;
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SB_SERVICE,
      Authorization: `Bearer ${SB_SERVICE}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    throw new Error(`Supabase ${table} ${res.status}: ${await res.text()}`);
  }
}

(async () => {
  console.log(`▸ Fixtures liga=${LEAGUE_ID} season=${SEASON} (${SLUG})…`);
  const fixtures = await apiFootball(
    `/fixtures?league=${LEAGUE_ID}&season=${SEASON}`,
  );
  console.log(`  ${fixtures.length} fixtures`);

  // Equipos (dedupe por id) desde local/visitante de cada fixture.
  const teamsById = new Map();
  for (const f of fixtures) {
    for (const side of ["home", "away"]) {
      const t = f.teams?.[side];
      if (t?.id && !teamsById.has(t.id)) {
        teamsById.set(t.id, { id: t.id, name: t.name, logo: t.logo ?? null });
      }
    }
  }
  const teams = [...teamsById.values()];

  const matches = fixtures.map((f) => {
    const short = f.fixture?.status?.short ?? null;
    return {
      id: f.fixture.id,
      competition: SLUG,
      season: SEASON,
      matchday: matchdayFromRound(f.league?.round),
      round: f.league?.round ?? null,
      team_home: f.teams.home.id,
      team_away: f.teams.away.id,
      kickoff_at: f.fixture.date,
      score_home: f.goals?.home ?? null,
      score_away: f.goals?.away ?? null,
      status: short,
      live_minute: f.fixture?.status?.elapsed ?? null,
      finished: short ? FINAL.has(short) : false,
    };
  });

  console.log(`▸ Upsert ${teams.length} equipos…`);
  await sbUpsert("lq_teams", teams);
  console.log(`▸ Upsert ${matches.length} partidos…`);
  // En lotes de 200 para no mandar un body gigantesco.
  for (let i = 0; i < matches.length; i += 200) {
    await sbUpsert("lq_matches", matches.slice(i, i + 200));
  }

  console.log("✓ Seed completado");
})().catch((err) => {
  console.error(`✘ ${err.message}`);
  process.exit(1);
});
