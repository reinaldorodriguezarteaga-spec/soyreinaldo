#!/usr/bin/env node
/**
 * Guarda la cuenta de servicio de Firebase (avisos a Android por FCM) en el
 * Vault de Supabase, de donde la lee el servidor (lib/push/fcm.ts,
 * migración 109). Igual que la de Apple: la clave privada no pasa por
 * paneles ni por el portapapeles. Si ya había una, se sustituye.
 *
 *   node scripts/fcm-a-vault.mjs ~/Downloads/soyreinaldoweb-firebase-adminsdk-XXXX.json
 *
 * Lee DATABASE_URL de .env.local, como scripts/db.mjs.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const ruta = process.argv[2];
if (!ruta) {
  console.error("Uso: node scripts/fcm-a-vault.mjs <cuenta-de-servicio.json>");
  process.exit(1);
}
const cuenta = JSON.parse(readFileSync(ruta, "utf8"));
if (cuenta.type !== "service_account" || !cuenta.private_key?.includes("BEGIN PRIVATE KEY")) {
  console.error("Ese archivo no parece una cuenta de servicio de Firebase.");
  process.exit(1);
}
const valor = JSON.stringify({
  project_id: cuenta.project_id,
  client_email: cuenta.client_email,
  private_key: cuenta.private_key,
});

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const db = new pg.Client({ connectionString: env.match(/^DATABASE_URL=["']?([^"'\n]+)/m)?.[1] });
await db.connect();
try {
  await db.query("delete from vault.secrets where name = 'fcm_cuenta'");
  await db.query("select vault.create_secret($1, 'fcm_cuenta')", [valor]);
  const { rows } = await db.query(
    "select (cuenta::jsonb)->>'project_id' as proyecto, (cuenta::jsonb)->>'client_email' as email from public.push_fcm_cuenta() as cuenta",
  );
  console.log("✓ Cuenta de Firebase guardada en el Vault:", rows[0]);
} finally {
  await db.end();
}
