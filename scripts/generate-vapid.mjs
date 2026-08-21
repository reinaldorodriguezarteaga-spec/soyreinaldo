#!/usr/bin/env node
/**
 * Genera el par de claves VAPID que firma las notificaciones push y lo guarda
 * en el Vault de Supabase.
 *
 * La clave PRIVADA no se imprime nunca ni pasa por el portapapeles: se genera
 * aquí y va directa al Vault, que es donde ya viven los otros secretos del
 * proyecto (`ingest_cron_secret`). La PÚBLICA sí se muestra — está pensada
 * para viajar al navegador de cada visitante.
 *
 * Idempotente: si ya existen, no hace nada. Para rotarlas hay que borrarlas
 * antes en el Vault, y eso invalida TODAS las suscripciones existentes (los
 * navegadores tendrán que volver a aceptar).
 *
 *   node scripts/generate-vapid.mjs
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import webpush from "web-push";

const ENV = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(ENV)) {
  console.error(`✘ No encuentro ${ENV}`);
  process.exit(1);
}
const env = fs.readFileSync(ENV, "utf8");
const DATABASE_URL = env.match(/^DATABASE_URL=(.+)$/m)?.[1].trim();
if (!DATABASE_URL) {
  console.error("✘ Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

(async () => {
  await client.connect();
  try {
    const { rows } = await client.query(
      "select name from vault.secrets where name in ('vapid_public_key','vapid_private_key')",
    );
    if (rows.length === 2) {
      const { rows: pub } = await client.query(
        "select decrypted_secret from vault.decrypted_secrets where name='vapid_public_key'",
      );
      console.log("✓ Las claves ya existían. No se toca nada.");
      console.log("  Clave pública:", pub[0].decrypted_secret);
      return;
    }
    if (rows.length === 1) {
      console.error(
        "✘ Hay UNA sola de las dos claves en el Vault. Borra la que quede y vuelve a ejecutar.",
      );
      process.exitCode = 1;
      return;
    }

    const keys = webpush.generateVAPIDKeys();
    await client.query("select vault.create_secret($1, $2, $3)", [
      keys.publicKey,
      "vapid_public_key",
      "Clave pública VAPID (avisos de gol). Viaja al navegador, no es secreta.",
    ]);
    await client.query("select vault.create_secret($1, $2, $3)", [
      keys.privateKey,
      "vapid_private_key",
      "Clave PRIVADA VAPID (avisos de gol). Solo la usa el servidor al enviar.",
    ]);

    console.log("✓ Claves generadas y guardadas en el Vault de Supabase.");
    console.log("  Clave pública:", keys.publicKey);
    console.log("  La privada no se muestra: vive solo en el Vault.");
  } finally {
    await client.end();
  }
})();
