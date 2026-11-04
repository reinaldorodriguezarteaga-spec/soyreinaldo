import "server-only";
import { createSign } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushPayload } from "./server";

/**
 * Avisos NATIVOS a Android por Firebase Cloud Messaging (app Android 1.1,
 * 4-nov-2026). Sin librerías, como apns.ts: un JWT RS256 de la cuenta de
 * servicio se canjea por un token de acceso de Google y con él se llama a
 * la API HTTP v1 de FCM, una petición por dispositivo.
 *
 * Mientras la cuenta no esté en el Vault (migración 109), no hace nada.
 */

type Cuenta = { project_id: string; client_email: string; private_key: string };

let cuenta: Cuenta | null | undefined;
async function leerCuenta(supabase: SupabaseClient): Promise<Cuenta | null> {
  if (cuenta !== undefined) return cuenta;
  const { data } = await supabase.rpc("push_fcm_cuenta");
  try {
    cuenta = data ? (JSON.parse(data as string) as Cuenta) : null;
  } catch {
    cuenta = null;
  }
  return cuenta;
}

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

/** Google da tokens de una hora; se renueva a los 50 minutos. */
let acceso: { valor: string; t: number } | null = null;
async function tokenAcceso(c: Cuenta): Promise<string | null> {
  if (acceso && Date.now() - acceso.t < 50 * 60_000) return acceso.valor;
  const ahora = Math.floor(Date.now() / 1000);
  const cab = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cuerpo = b64url(
    JSON.stringify({
      iss: c.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: ahora,
      exp: ahora + 3600,
    }),
  );
  const firma = createSign("RSA-SHA256").update(`${cab}.${cuerpo}`).sign(c.private_key);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${cab}.${cuerpo}.${b64url(firma)}`,
    }),
  }).catch(() => null);
  const d = r?.ok ? ((await r.json()) as { access_token?: string }) : null;
  if (!d?.access_token) return null;
  acceso = { valor: d.access_token, t: Date.now() };
  return acceso.valor;
}

/** Envía el aviso a una lista de móviles Android. Borra los tokens muertos
 * (app desinstalada). Devuelve cuántos salieron. */
export async function enviarFcm(
  supabase: SupabaseClient,
  tokens: string[],
  payload: PushPayload,
  ttl: number,
): Promise<number> {
  if (tokens.length === 0) return 0;
  const c = await leerCuenta(supabase);
  if (!c) return 0;
  const bearer = await tokenAcceso(c).catch(() => null);
  if (!bearer) return 0;

  let enviados = 0;
  const muertos: string[] = [];
  await Promise.all(
    tokens.map(async (token) => {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${c.project_id}/messages:send`, {
        method: "POST",
        headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            // La app abre esta ruta al tocar el aviso (PuenteAvisosApp).
            data: { url: payload.url },
            android: {
              priority: "high",
              ttl: `${ttl}s`,
              ...(payload.tag ? { collapse_key: payload.tag.slice(0, 64) } : {}),
              notification: { ...(payload.tag ? { tag: payload.tag } : {}), default_sound: true },
            },
          },
        }),
      }).catch(() => null);
      if (r?.ok) {
        enviados++;
        return;
      }
      const err = r ? ((await r.json().catch(() => null)) as { error?: { status?: string } } | null) : null;
      if (r?.status === 404 || err?.error?.status === "UNREGISTERED" || err?.error?.status === "INVALID_ARGUMENT") {
        muertos.push(token);
      }
    }),
  );
  if (muertos.length > 0) await supabase.from("push_dispositivos").delete().in("token", muertos);
  return enviados;
}
