#!/usr/bin/env node
/**
 * Rellena marcadores de partidos de la quiniela de clubes que la ingesta ya
 * no puede recuperar.
 *
 * La ingesta en vivo (`/api/sports/ingest`) solo mira la ventana de −4h a
 * +5min alrededor del kickoff (RPC `lq_matches_pending_ingest`): si estuvo
 * caída mientras se jugaba una jornada, esos partidos se quedan sin marcador
 * para siempre. Esto los recupera pidiéndolos por id a API-Football.
 *
 * Uso:
 *   node scripts/backfill-lq-results.mjs --matchday 1
 *   node scripts/backfill-lq-results.mjs --all-past       # todos los pasados sin marcador
 *   node scripts/backfill-lq-results.mjs --matchday 1 --dry-run
 *
 * OJO: marcar un partido como terminado hace que puntúe en `lq_leaderboard`.
 * Si esa jornada no debe contar, ponle `counts_for_scoring = false` (ver
 * migración 039) ANTES de rellenarla.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ENV_PATH = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(ENV_PATH)) {
  console.error(`✘ ${ENV_PATH} no encontrado`);
  process.exit(1);
}
const env = fs.readFileSync(ENV_PATH, "utf8");
const read = (key) => env.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1].trim();

const DATABASE_URL = read("DATABASE_URL");
const API_KEY = read("API_FOOTBALL_KEY");
if (!DATABASE_URL || !API_KEY) {
  console.error("✘ Faltan DATABASE_URL o API_FOOTBALL_KEY en .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const allPast = args.includes("--all-past");
const mdIndex = args.indexOf("--matchday");
const matchday = mdIndex >= 0 ? Number.parseInt(args[mdIndex + 1], 10) : null;

if (!allPast && !Number.isInteger(matchday)) {
  console.error("Uso: --matchday <n> | --all-past  [--dry-run]");
  process.exit(1);
}

const FINAL = new Set(["FT", "AET", "PEN"]);
const client = new pg.Client({ connectionString: DATABASE_URL });

/** API-Football acepta hasta 20 ids por llamada, separados por guiones. */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

(async () => {
  await client.connect();
  try {
    const { rows: pending } = await client.query(
      `select m.id, m.matchday, h.name as home, a.name as away, m.counts_for_scoring
         from lq_matches m
         join lq_teams h on h.id = m.team_home
         join lq_teams a on a.id = m.team_away
        where m.finished = false
          and m.kickoff_at < now() - interval '3 hours'
          ${allPast ? "" : "and m.matchday = $1"}
        order by m.kickoff_at`,
      allPast ? [] : [matchday],
    );

    if (pending.length === 0) {
      console.log("✓ No hay partidos pasados sin marcador. Nada que hacer.");
      return;
    }
    console.log(`▸ ${pending.length} partido(s) sin marcador:`);
    for (const m of pending) {
      console.log(
        `   J${m.matchday} ${m.home} - ${m.away}` +
          (m.counts_for_scoring ? "" : "  (no puntúa)"),
      );
    }

    let updated = 0;
    let sinDatos = 0;
    for (const lote of chunk(pending.map((m) => m.id), 20)) {
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?ids=${lote.join("-")}`,
        { headers: { "x-apisports-key": API_KEY } },
      );
      const body = await res.json();
      const errors = body.errors;
      if (errors && (Array.isArray(errors) ? errors.length : Object.keys(errors).length)) {
        console.error("✘ API-Football devolvió errores:", errors);
        process.exitCode = 1;
        return;
      }

      for (const f of body.response ?? []) {
        const status = f.fixture.status.short;
        const { home, away } = f.goals;
        if (!FINAL.has(status) || home === null || away === null) {
          sinDatos++;
          console.log(`   · ${f.fixture.id}: todavía sin resultado (${status})`);
          continue;
        }
        console.log(`   ✓ ${f.fixture.id}: ${home}-${away} (${status})`);
        if (dryRun) continue;
        await client.query(
          `update lq_matches
              set score_home = $2, score_away = $3, status = $4,
                  live_minute = null, finished = true, last_polled_at = now()
            where id = $1`,
          [f.fixture.id, home, away, status],
        );
        updated++;
      }
    }

    console.log(
      dryRun
        ? `\n(dry-run) ${pending.length - sinDatos} se habrían actualizado.`
        : `\n✓ ${updated} partido(s) actualizados` +
            (sinDatos ? `, ${sinDatos} todavía sin resultado.` : "."),
    );
  } finally {
    await client.end();
  }
})();
