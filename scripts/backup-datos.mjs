#!/usr/bin/env node
/**
 * Copia de seguridad de los datos.
 *
 * Supabase está en plan gratuito, que NO incluye copias de seguridad: si algo
 * se rompe —una migración mal hecha, un borrado accidental, un problema con la
 * cuenta— no hay a dónde volver. Y lo que hay dentro no se puede regenerar:
 * cuentas, pronósticos, ligas y clasificaciones de gente real.
 *
 * El ESQUEMA no hace falta copiarlo: vive en `supabase/migrations/*.sql`, que
 * está en git. Esto guarda solo los DATOS, que es lo irreemplazable. Juntos
 * permiten reconstruir el proyecto entero.
 *
 * Escribe un JSON por ejecución, con fecha en el nombre:
 *   node scripts/backup-datos.mjs
 *   node scripts/backup-datos.mjs --destino ~/Documents/copias-soyreinaldo
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import pg from "pg";

/** Lo que hay que salvar, en orden de dependencias (útil al restaurar). */
const TABLAS = [
  // Identidad: de auth.users solo lo mínimo para reconstruir cuentas.
  { nombre: "auth.users", consulta: "select id, email, created_at, raw_user_meta_data from auth.users" },
  { nombre: "profiles" },
  // Quiniela: ligas, miembros y todo lo que la gente ha pronosticado.
  { nombre: "leagues" },
  { nombre: "league_members" },
  { nombre: "point_adjustments" },
  { nombre: "lq_predictions" },
  { nombre: "lq_season_picks" },
  { nombre: "lq_midseason_picks" },
  { nombre: "lq_season_results" },
  // Mundial: retirado de la web, pero los datos de la gente se conservan.
  { nombre: "predictions" },
  { nombre: "user_picks" },
  { nombre: "tournament_results" },
  // Negocio.
  { nombre: "donations" },
  { nombre: "user_favorites" },
  { nombre: "push_subscriptions" },
];

/** Estas se regeneran solas desde API-Football: no vale la pena copiarlas. */
const NO_SE_COPIAN = ["lq_matches", "lq_teams", "matches", "teams", "sports_cache"];

const args = process.argv.slice(2);
const iDest = args.indexOf("--destino");
const destino =
  iDest >= 0 && args[iDest + 1]
    ? args[iDest + 1].replace(/^~/, os.homedir())
    : path.join(os.homedir(), "Documents", "copias-soyreinaldo");

const ENV = path.resolve(process.cwd(), ".env.local");
const DATABASE_URL = fs.existsSync(ENV)
  ? fs.readFileSync(ENV, "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1].trim()
  : null;
if (!DATABASE_URL) {
  console.error("✘ Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

(async () => {
  await client.connect();
  const salida = { generado: new Date().toISOString(), tablas: {} };
  let total = 0;

  try {
    for (const t of TABLAS) {
      const sql = t.consulta ?? `select * from public."${t.nombre}"`;
      try {
        const { rows } = await client.query(sql);
        salida.tablas[t.nombre] = rows;
        total += rows.length;
        console.log(`  ${String(rows.length).padStart(6)}  ${t.nombre}`);
      } catch (e) {
        // Una tabla que ya no exista no debe tumbar la copia entera.
        console.log(`       —  ${t.nombre} (${e.message.split("\n")[0]})`);
      }
    }
  } finally {
    await client.end();
  }

  fs.mkdirSync(destino, { recursive: true });
  const sello = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const fichero = path.join(destino, `soyreinaldo-${sello}.json`);
  fs.writeFileSync(fichero, JSON.stringify(salida, null, 2));

  const kb = Math.round(fs.statSync(fichero).size / 1024);
  console.log(`\n✓ ${total} filas guardadas en ${fichero} (${kb} KB)`);
  console.log(`  No se copian (se regeneran solas): ${NO_SE_COPIAN.join(", ")}`);
})();
