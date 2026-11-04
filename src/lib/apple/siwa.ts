import "server-only";
import { createPrivateKey, createSign } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { b64url, leerClave, type Clave } from "@/lib/push/apns";

/**
 * Sign in with Apple, lado servidor (app 1.1, 4-nov-2026). El inicio de
 * sesión en sí lo hace Supabase con el identityToken; esto solo guarda y
 * revoca el acceso, como pide Apple al borrar una cuenta (norma 5.1.1(v)).
 * Firma con la misma clave .p8 que los avisos (tiene los dos servicios).
 */

const CLIENT_ID = "com.soyreinaldo.app";
const APPLE = "https://appleid.apple.com";

/** El «client secret» de Apple: un JWT ES256 de vida corta. */
function secreto(c: Clave): string {
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = b64url(JSON.stringify({ alg: "ES256", kid: c.keyId }));
  const cuerpo = b64url(
    JSON.stringify({ iss: c.teamId, iat: ahora, exp: ahora + 300, aud: APPLE, sub: CLIENT_ID }),
  );
  const firma = createSign("SHA256")
    .update(`${cabecera}.${cuerpo}`)
    .sign({ key: createPrivateKey(c.p8), dsaEncoding: "ieee-p1363" });
  return `${cabecera}.${cuerpo}.${b64url(firma)}`;
}

/** Canjea el código de autorización del primer inicio de sesión por el
 * refresh token (el que luego se revoca). null si Apple dice que no. */
export async function canjearCodigo(supabase: SupabaseClient, codigo: string): Promise<string | null> {
  const c = await leerClave(supabase);
  if (!c) return null;
  const r = await fetch(`${APPLE}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: secreto(c),
      code: codigo,
      grant_type: "authorization_code",
    }),
  }).catch(() => null);
  if (!r?.ok) return null;
  const d = (await r.json().catch(() => null)) as { refresh_token?: string } | null;
  return d?.refresh_token ?? null;
}

/** Revoca el acceso de la app a la cuenta de Apple del usuario. */
export async function revocar(supabase: SupabaseClient, refreshToken: string): Promise<boolean> {
  const c = await leerClave(supabase);
  if (!c) return false;
  const r = await fetch(`${APPLE}/auth/revoke`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: secreto(c),
      token: refreshToken,
      token_type_hint: "refresh_token",
    }),
  }).catch(() => null);
  return r?.ok ?? false;
}
