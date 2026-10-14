#!/usr/bin/env node
/**
 * Guarda la clave de avisos de Apple (APNs) en el Vault de Supabase, de donde
 * la lee el servidor (lib/push/apns.ts, migración 065). Igual que las VAPID:
 * la privada no pasa por paneles ni por el portapapeles.
 *
 *   node scripts/apns-a-vault.mjs ~/Downloads/AuthKey_ABC123DEFG.p8
 *
 * El Key ID se saca del nombre del archivo (AuthKey_<KEYID>.p8); si lo has
 * renombrado, pásalo como segundo argumento. El Team ID es el de la cuenta
 * de desarrollador (3NC77GQ583). Si ya había una clave, se sustituye.
 * Lee DATABASE_URL de .env.local, como scripts/db.mjs.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import pg from "pg";

const TEAM_ID = "3NC77GQ583";

const ruta = process.argv[2];
if (!ruta) {
  console.error("Uso: node scripts/apns-a-vault.mjs <ruta al AuthKey_XXXX.p8> [KEY_ID]");
  process.exit(1);
}
const p8 = readFileSync(ruta, "utf8").trim();
if (!p8.includes("BEGIN PRIVATE KEY")) {
  console.error("Ese archivo no parece una clave .p8 de Apple.");
  process.exit(1);
}
const keyId = process.argv[3] ?? basename(ruta).match(/AuthKey_([A-Z0-9]{10})\.p8$/i)?.[1];
if (!keyId) {
  console.error("No saco el Key ID del nombre del archivo: pásalo como segundo argumento.");
  process.exit(1);
}

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = env.match(/^DATABASE_URL=["']?([^"'\n]+)/m)?.[1];
if (!url) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const db = new pg.Client({ connectionString: url });
await db.connect();
try {
  for (const [nombre, valor] of [
    ["apns_key_id", keyId],
    ["apns_team_id", TEAM_ID],
    ["apns_p8", p8],
  ]) {
    await db.query("delete from vault.secrets where name = $1", [nombre]);
    await db.query("select vault.create_secret($1, $2)", [valor, nombre]);
  }
  const { rows } = await db.query(
    "select key_id, team_id, length(p8) > 100 as p8_ok from public.push_apns_key()",
  );
  console.log("✓ Clave guardada en el Vault:", rows[0]);
} finally {
  await db.end();
}
