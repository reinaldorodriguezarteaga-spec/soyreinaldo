import "server-only";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

/**
 * Envío de avisos de gol.
 *
 * Las claves VAPID viven en el Vault de Supabase (migración 046), no en
 * variables de entorno: así la privada nunca pasa por un panel ni por el
 * portapapeles de nadie.
 */

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  /** Mismo tag = el aviso se sustituye en vez de apilarse. */
  tag?: string;
};

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

let configurado = false;
async function configurar(): Promise<boolean> {
  if (configurado) return true;
  const supabase = admin();
  if (!supabase) return false;
  const { data } = await supabase.rpc("push_vapid_keys");
  const claves = (data as { public_key: string; private_key: string }[] | null)?.[0];
  if (!claves?.public_key || !claves?.private_key) return false;
  webpush.setVapidDetails(
    "mailto:hola@soyreinaldo.com",
    claves.public_key,
    claves.private_key,
  );
  configurado = true;
  return true;
}

type Destino = { endpoint: string; p256dh: string; auth: string };

/** Envía a una lista de suscripciones; borra las muertas (404/410: el
 * navegador se desinstaló o el usuario revocó el permiso). */
async function enviar(
  supabase: NonNullable<ReturnType<typeof admin>>,
  destinos: Destino[],
  payload: PushPayload,
  ttl: number,
): Promise<number> {
  if (destinos.length === 0) return 0;
  const cuerpo = JSON.stringify(payload);
  let enviados = 0;
  const muertas: string[] = [];

  await Promise.all(
    destinos.map(async (d) => {
      try {
        await webpush.sendNotification(
          { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          cuerpo,
          { TTL: ttl },
        );
        enviados++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) muertas.push(d.endpoint);
      }
    }),
  );

  if (muertas.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", muertas);
  }
  return enviados;
}

/**
 * Avisa a quien tenga ese equipo en favoritos. Devuelve cuántos avisos
 * salieron.
 */
export async function notificarEquipo(
  teamIds: number | number[],
  payload: PushPayload,
): Promise<number> {
  const supabase = admin();
  if (!supabase || !(await configurar())) return 0;
  // Varios equipos (los dos de un partido): cada dispositivo una sola vez,
  // aunque tenga a los dos en favoritos.
  const porEndpoint = new Map<string, Destino>();
  for (const id of Array.isArray(teamIds) ? teamIds : [teamIds]) {
    const { data } = await supabase.rpc("push_targets_for_team", {
      p_team_id: String(id),
    });
    for (const d of (data ?? []) as Destino[]) porEndpoint.set(d.endpoint, d);
  }
  // 15 min: un gol de hace media hora ya no es noticia.
  return enviar(supabase, [...porEndpoint.values()], payload, 900);
}

/** Avisa a TODOS los dispositivos de un usuario (recordatorio de la quiniela). */
export async function notificarUsuario(
  userId: string,
  payload: PushPayload,
  ttl = 6 * 3600,
): Promise<number> {
  const supabase = admin();
  if (!supabase || !(await configurar())) return 0;
  const { data } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  return enviar(supabase, (data ?? []) as Destino[], payload, ttl);
}
