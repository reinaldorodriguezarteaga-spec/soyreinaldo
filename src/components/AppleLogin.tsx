"use client";

import { useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * «Continuar con Apple» dentro de la app de iPhone (1.1, 4-nov-2026). Usa el
 * plugin nativo de la app (@capacitor-community/apple-sign-in) a través de
 * `window.Capacitor`, sin añadir dependencias a la web: en el navegador y en
 * la app 1.0, que no lo traen, no aparece nada.
 *
 * Flujo: Apple devuelve un identityToken → Supabase abre la sesión con él
 * (`signInWithIdToken`); el código de autorización se manda al servidor para
 * poder revocar el acceso si la cuenta se borra (lib/apple/siwa.ts).
 */

type RespuestaApple = {
  response: {
    identityToken: string;
    authorizationCode: string;
    givenName: string | null;
    familyName: string | null;
  };
};
type PluginApple = {
  authorize(o: { clientId: string; redirectURI: string; scopes: string; state: string; nonce: string }): Promise<RespuestaApple>;
};
type CapacitorGlobal = {
  isPluginAvailable?: (nombre: string) => boolean;
  Plugins?: Record<string, unknown>;
};

function plugin(): PluginApple | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (!cap?.isPluginAvailable?.("SignInWithApple")) return null;
  return (cap.Plugins?.SignInWithApple as PluginApple | undefined) ?? null;
}

const sinSuscripcion = () => () => {};

async function sha256(texto: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function AppleLogin({ redirect }: { redirect: string }) {
  const disponible = useSyncExternalStore(sinSuscripcion, () => plugin() != null, () => false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!disponible) return null;

  const entrar = async () => {
    const apple = plugin();
    if (!apple) return;
    setCargando(true);
    setError(null);
    try {
      // Apple firma el nonce hasheado; Supabase recibe el original y lo comprueba.
      const nonce = crypto.randomUUID();
      const r = await apple.authorize({
        clientId: "com.soyreinaldo.app",
        redirectURI: "https://www.soyreinaldo.com",
        scopes: "email name",
        state: crypto.randomUUID(),
        nonce: await sha256(nonce),
      });
      const supabase = createClient();
      const { error: e } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: r.response.identityToken,
        nonce,
      });
      if (e) throw e;
      // Apple solo da el nombre la primera vez: se guarda entonces.
      const nombre = [r.response.givenName, r.response.familyName].filter(Boolean).join(" ").trim();
      if (nombre) await supabase.auth.updateUser({ data: { full_name: nombre } }).catch(() => undefined);
      await fetch("/api/auth/apple", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo: r.response.authorizationCode }),
      }).catch(() => undefined);
      window.location.assign(redirect);
    } catch (e) {
      // 1001 = el usuario cerró la hoja de Apple: no es un error.
      const msg = e instanceof Error ? e.message : String(e);
      if (!/1001|cancel/i.test(msg)) setError("No se pudo entrar con Apple. Inténtalo otra vez.");
      setCargando(false);
    }
  };

  return (
    <>
      <div className="oauth">
        <button type="button" className="btn-apple" onClick={entrar} disabled={cargando}>
          <svg viewBox="0 0 814 1000" aria-hidden width="17" height="20">
            <path
              fill="currentColor"
              d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
            />
          </svg>
          {cargando ? "Entrando…" : "Continuar con Apple"}
        </button>
        {error && (
          <p role="alert" style={{ color: "var(--mal)", fontSize: "0.85rem", margin: 0 }}>
            {error}
          </p>
        )}
      </div>
      <div className="divider">o con tu email</div>
    </>
  );
}
